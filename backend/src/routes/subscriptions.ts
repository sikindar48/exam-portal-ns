import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole } from "../services/roles.js";
import { randomUUID } from "crypto";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  // Super Admin security block
  const isSuper = await hasRole(user.id, "superadmin");
  if (!isSuper) {
    return res.status(403).json({ error: "Permission denied. Super Admin access only." });
  }

  // 1. Automatic Subscription Expiry Check (Updates status to 'expired' if today > expiry_date)
  try {
    const today = new Date().toISOString().slice(0, 10);
    await db.execute({
      sql: `UPDATE client_subscriptions 
            SET status = 'expired' 
            WHERE expiry_date < ? AND status IN ('active', 'trial') AND plan_id != 'free'`,
      args: [today]
    });
  } catch (err) {
    console.error("Failed to run subscription auto-expiry checker:", err);
  }

  // ── GET /api/superadmin/subscriptions ──────────────────────────────────────
  if (req.method === "GET") {
    try {
      // Query subscription list (LEFT JOIN to ensure clients without explicit subscription entries also show up)
      const { rows: subs } = await db.execute(`
        SELECT 
          c.id as client_id,
          c.name as client_name,
          COALESCE(cs.plan_id, 'free') as plan_id,
          COALESCE(sp.name, 'Free Plan') as plan_name,
          COALESCE(cs.start_date, date('now')) as start_date,
          COALESCE(cs.expiry_date, date('now', '+30 days')) as expiry_date,
          COALESCE(cs.status, 'active') as status,
          COALESCE(cs.renewal_status, 'manual') as renewal_status
        FROM clients c
        LEFT JOIN client_subscriptions cs ON cs.client_id = c.id
        LEFT JOIN subscription_plans sp ON sp.id = COALESCE(cs.plan_id, 'free')
        ORDER BY COALESCE(cs.updated_at, c.created_at) DESC
      `);

      // Query analytics metrics
      const today = new Date().toISOString().slice(0, 10);
      const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Clients per plan (LEFT JOIN to default any client without subscription to 'free')
      const { rows: planCounts } = await db.execute(`
        SELECT COALESCE(cs.plan_id, 'free') as plan_id, COUNT(*) as count 
        FROM clients c
        LEFT JOIN client_subscriptions cs ON cs.client_id = c.id
        GROUP BY COALESCE(cs.plan_id, 'free')
      `);

      // Expiring soon count
      const { rows: expiringSoon } = await db.execute({
        sql: `SELECT COUNT(*) as count 
              FROM client_subscriptions 
              WHERE status IN ('active', 'trial') AND expiry_date BETWEEN ? AND ?`,
        args: [today, inSevenDays]
      });

      // Suspended count
      const { rows: suspended } = await db.execute(`
        SELECT COUNT(*) as count 
        FROM client_subscriptions 
        WHERE status = 'suspended'
      `);

      // Transform planCounts to key-value maps
      const plansMap: Record<string, number> = { free: 0, starter: 0, growth: 0, enterprise: 0 };
      planCounts.forEach((r: any) => {
        if (r.plan_id in plansMap) {
          plansMap[r.plan_id] = Number(r.count);
        }
      });

      return res.status(200).json({
        subscriptions: subs,
        analytics: {
          freeCount: plansMap.free,
          starterCount: plansMap.starter,
          growthCount: plansMap.growth,
          enterpriseCount: plansMap.enterprise,
          expiringSoonCount: Number((expiringSoon[0] as any)?.count || 0),
          suspendedCount: Number((suspended[0] as any)?.count || 0),
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to retrieve subscriptions" });
    }
  }

  // ── PUT /api/superadmin/subscriptions/:client_id ───────────────────────────
  if (req.method === "PUT") {
    const { client_id } = req.params;
    const { plan_id, expiry_date, status, renewal_status } = req.body;

    if (!plan_id || !expiry_date || !status || !renewal_status) {
      return res.status(400).json({ error: "Missing required fields (plan_id, expiry_date, status, renewal_status)" });
    }

    try {
      // 1. Get current plan details for history mapping
      const { rows: currentSub } = await db.execute({
        sql: "SELECT plan_id, expiry_date, status, renewal_status FROM client_subscriptions WHERE client_id = ?",
        args: [client_id]
      });

      const oldSub = currentSub[0] as any;
      const oldPlanId = oldSub?.plan_id || null;
      const oldExpiry = oldSub?.expiry_date || "";
      const oldStatus = oldSub?.status || "";
      const oldRenewal = oldSub?.renewal_status || "";

      // 2. Perform database update
      await db.execute({
        sql: `INSERT INTO client_subscriptions (client_id, plan_id, start_date, expiry_date, status, renewal_status, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(client_id) DO UPDATE SET
                plan_id = ?,
                expiry_date = ?,
                status = ?,
                renewal_status = ?,
                updated_at = CURRENT_TIMESTAMP`,
        args: [
          client_id, plan_id, oldSub?.start_date || new Date().toISOString().slice(0, 10), expiry_date, status, renewal_status,
          plan_id, expiry_date, status, renewal_status
        ]
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

      // 5. Synchronize features by updating client_features table
      const { rows: planFeatures } = await db.execute({
        sql: "SELECT feature_name FROM subscription_plan_features WHERE plan_id = ?",
        args: [plan_id]
      });

      // Clear existing manual features
      await db.execute({
        sql: "DELETE FROM client_features WHERE client_id = ?",
        args: [client_id]
      });

      // Seed current plan features
      for (const row of planFeatures) {
        const feature = (row as any).feature_name;
        await db.execute({
          sql: "INSERT OR IGNORE INTO client_features (id, client_id, feature_name, enabled) VALUES (?, ?, ?, 1)",
          args: [randomUUID(), client_id, feature]
        });
      }

      // 6. Write to Audit Logs
      const auditDetails: string[] = [];
      if (oldPlanId !== plan_id) auditDetails.push(`plan changed from ${oldPlanId || "none"} to ${plan_id}`);
      if (oldExpiry !== expiry_date) auditDetails.push(`expiry extended from ${oldExpiry} to ${expiry_date}`);
      if (oldStatus !== status) auditDetails.push(`status changed from ${oldStatus} to ${status}`);
      if (oldRenewal !== renewal_status) auditDetails.push(`renewal mode changed from ${oldRenewal} to ${renewal_status}`);

      const auditMsg = auditDetails.length > 0 ? `Subscription updated: ${auditDetails.join(", ")}` : "Subscription modified";

      await db.execute({
        sql: `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [randomUUID(), user.id, auditMsg, "client_subscription", client_id, JSON.stringify({ oldSub, newSub: { plan_id, expiry_date, status, renewal_status } })]
      });

      return res.status(200).json({ success: true, message: "Subscription plan updated successfully." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to update subscription" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
