import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole, getUserClientId } from "../services/roles.js";
import { randomUUID } from "crypto";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  const isSuper = await hasRole(user.id, "superadmin");
  const isClientAdmin = await hasRole(user.id, "clientadmin");

  if (!isSuper && !isClientAdmin) {
    return res.status(403).json({ error: "Permission denied" });
  }

  // ── GET /api/subscription-requests (List pending requests - Superadmin only) ──
  if (req.method === "GET") {
    if (!isSuper) return res.status(403).json({ error: "Permission denied: Superadmin only" });

    try {
      const { rows } = await db.execute(`
        SELECT sr.*, c.name as client_name, sp.name as plan_name
        FROM client_subscription_requests sr
        JOIN clients c ON sr.client_id = c.id
        JOIN subscription_plans sp ON sr.plan_id = sp.id
        ORDER BY sr.requested_at DESC
      `);
      return res.status(200).json(rows);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST /api/subscription-requests (Clientadmin request subscription plan upgrade) ──
  if (req.method === "POST") {
    if (!isClientAdmin) return res.status(403).json({ error: "Permission denied: Client Admin only" });

    const client_id = await getUserClientId(user.id);
    if (!client_id) return res.status(400).json({ error: "No organization associated with user" });

    const { plan_id } = req.body;
    if (!plan_id) return res.status(400).json({ error: "plan_id is required" });

    try {
      // Verify plan exists
      const { rows: planRows } = await db.execute({
        sql: "SELECT * FROM subscription_plans WHERE id = ? LIMIT 1",
        args: [plan_id]
      });
      if (!planRows.length) return res.status(404).json({ error: "Subscription plan tier not found" });

      const requestId = randomUUID();
      await db.execute({
        sql: `INSERT INTO client_subscription_requests (id, client_id, plan_id, status)
              VALUES (?, ?, ?, 'requested')`,
        args: [requestId, client_id, plan_id]
      });

      return res.status(201).json({ id: requestId, success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PATCH /api/subscription-requests (Superadmin Approve/Reject request) ──
  if (req.method === "PATCH") {
    if (!isSuper) return res.status(403).json({ error: "Permission denied: Superadmin only" });

    const { request_id, action } = req.body; // action: 'approve' or 'reject'
    if (!request_id || !action) {
      return res.status(400).json({ error: "request_id and action are required" });
    }

    try {
      const { rows: reqRows } = await db.execute({
        sql: "SELECT * FROM client_subscription_requests WHERE id = ? LIMIT 1",
        args: [request_id]
      });
      if (!reqRows.length) return res.status(404).json({ error: "Request not found" });

      const subReq = reqRows[0] as any;
      if (subReq.status !== "requested") {
        return res.status(400).json({ error: "Request has already been actioned" });
      }

      if (action === "reject") {
        await db.execute({
          sql: "UPDATE client_subscription_requests SET status = 'rejected', actioned_at = CURRENT_TIMESTAMP WHERE id = ?",
          args: [request_id]
        });
        return res.status(200).json({ success: true, message: "Request rejected" });
      }

      if (action === "approve") {
        const client_id = subReq.client_id;
        const plan_id = subReq.plan_id;

        // Perform upgrade:
        // 1. Get current plan details
        const { rows: currentSub } = await db.execute({
          sql: "SELECT plan_id, expiry_date, status, renewal_status FROM client_subscriptions WHERE client_id = ?",
          args: [client_id]
        });
        const oldSub = currentSub[0] as any;
        const oldPlanId = oldSub?.plan_id || null;

        // Calculate start & expiry dates (default 30 days from now)
        const todayStr = new Date().toISOString().slice(0, 10);
        const expiryStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        // 2. Perform database update
        await db.execute({
          sql: `INSERT INTO client_subscriptions (client_id, plan_id, start_date, expiry_date, status, renewal_status, updated_at)
                VALUES (?, ?, ?, ?, 'active', 'manual', CURRENT_TIMESTAMP)
                ON CONFLICT(client_id) DO UPDATE SET
                  plan_id = ?,
                  expiry_date = ?,
                  status = 'active',
                  renewal_status = 'manual',
                  updated_at = CURRENT_TIMESTAMP`,
          args: [client_id, plan_id, todayStr, expiryStr, plan_id, expiryStr]
        });

        // 3. Write subscription transition history
        if (oldPlanId !== plan_id) {
          await db.execute({
            sql: `INSERT INTO subscription_history (id, client_id, old_plan_id, new_plan_id, changed_by)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [randomUUID(), client_id, oldPlanId, plan_id, user.id]
          });
        }

        // 4. Synchronize Client limits automatically based on selected plan template limits
        const { rows: planLimits } = await db.execute({
          sql: "SELECT max_exams_per_month, max_students_per_exam, max_questions_per_exam FROM subscription_plans WHERE id = ?",
          args: [plan_id]
        });
        if (planLimits.length > 0) {
          const pl = planLimits[0] as any;
          await db.execute({
            sql: `INSERT INTO client_limits (client_id, max_exams_per_month, max_students_per_exam, max_questions_per_exam, updated_at)
                  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                  ON CONFLICT(client_id) DO UPDATE SET
                    max_exams_per_month = ?,
                    max_students_per_exam = ?,
                    max_questions_per_exam = ?,
                    updated_at = CURRENT_TIMESTAMP`,
            args: [
              client_id, pl.max_exams_per_month, pl.max_students_per_exam, pl.max_questions_per_exam,
              pl.max_exams_per_month, pl.max_students_per_exam, pl.max_questions_per_exam
            ]
          });
        }

        // 5. Synchronize features
        const { rows: planFeatures } = await db.execute({
          sql: "SELECT feature_name FROM subscription_plan_features WHERE plan_id = ?",
          args: [plan_id]
        });
        await db.execute({
          sql: "DELETE FROM client_features WHERE client_id = ?",
          args: [client_id]
        });
        for (const row of planFeatures) {
          const feature = (row as any).feature_name;
          await db.execute({
            sql: "INSERT OR IGNORE INTO client_features (id, client_id, feature_name, enabled) VALUES (?, ?, ?, 1)",
            args: [randomUUID(), client_id, feature]
          });
        }

        // 6. Update request status to approved
        await db.execute({
          sql: "UPDATE client_subscription_requests SET status = 'approved', actioned_at = CURRENT_TIMESTAMP WHERE id = ?",
          args: [request_id]
        });

        // 7. Write to Audit Logs
        await db.execute({
          sql: `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [randomUUID(), user.id, `Subscription request approved: upgraded to plan ${plan_id}`, "client_subscription", client_id, JSON.stringify({ request_id })]
        });

        return res.status(200).json({ success: true, message: "Request approved and plan assigned successfully." });
      }
    } catch (err: any) {
      return res.status(550).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
