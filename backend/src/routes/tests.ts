import type { Request, Response } from "express";
import { getDb, rowBools } from "../db/db.js";
import { requireUser, getUser } from "../auth/auth.js";
import { hasRole, getUserClientId } from "../services/roles.js";
import { randomUUID } from "crypto";
import { testCreateSchema, testUpdateSchema } from "../validation/schemas.js";
import { isFeatureEnabled } from "../services/features.js";
import { getClientLimits, getClientUsageMonthly, incrementClientUsage } from "../services/limits.js";
import { getEffectivePlan, assignPackageToTest, validatePackageFeatures } from "../services/billing.js";

const BOOL_FIELDS = ["shuffle","allow_review","negative_marking","restrict_navigation","active","allow_guests","public_link_enabled","camera_required"];

function generateShareCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default async function handler(req: Request, res: Response) {
  const db = getDb();

  // ── GET /api/tests ──────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { id, client_id, share_code, with_question_count, page, limit } = req.query;

    // Public share_code lookup (Join page)
    if (share_code) {
      const normalizedCode = String(share_code).trim().toUpperCase();
      const { rows } = await db.execute({
        sql: `SELECT t.*, c.name as client_name, c.logo_url as client_logo_url
              FROM tests t LEFT JOIN clients c ON c.id = t.client_id
              WHERE t.share_code = ? AND t.active = 1 AND t.status = 'published'`,
        args: [normalizedCode],
      });
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const row = rows[0] as any;

      // Fetch enabled features for this client
      const { rows: featureRows } = await db.execute({
        sql: `SELECT feature_name FROM subscription_plan_features spf 
              JOIN client_subscriptions cs ON cs.plan_id = spf.plan_id
              WHERE cs.client_id = ? AND cs.status IN ('active', 'trial')
              UNION
              SELECT feature_name FROM client_features
              WHERE client_id = ? AND enabled = 1`,
        args: [row.client_id, row.client_id],
      });
      const clientFeatures = featureRows.map((f: any) => f.feature_name);

      return res.status(200).json({
        ...rowBools(row, BOOL_FIELDS),
        clients: { name: row.client_name, logo_url: row.client_logo_url, features: clientFeatures },
      });
    }

    const user = await requireUser(req, res);
    if (!user) return;

    const callerClientId = await getUserClientId(user.id);
    const isSuper = await hasRole(user.id, "superadmin");

    if (id) {
      const { rows } = await db.execute({
        sql: `SELECT t.*, c.name as client_name, c.logo_url as client_logo_url
              FROM tests t LEFT JOIN clients c ON c.id = t.client_id
              WHERE t.id = ?`,
        args: [id as string],
      });
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const row = rows[0] as any;

      // Tenant isolation check
      if (!isSuper && row.client_id !== callerClientId) {
        const isPublicTest = row.active === 1 && row.status === "published" && row.public_link_enabled === 1;
        if (!isPublicTest) {
          const { rows: attemptRows } = await db.execute({
            sql: "SELECT id FROM attempts WHERE student_id = ? AND test_id = ?",
            args: [user.id, row.id],
          });
          if (attemptRows.length === 0) {
            return res.status(403).json({ error: "Access denied" });
          }
        }
      }

      // Fetch enabled features for this client
      const { rows: featureRows } = await db.execute({
        sql: `SELECT feature_name FROM subscription_plan_features spf 
              JOIN client_subscriptions cs ON cs.plan_id = spf.plan_id
              WHERE cs.client_id = ? AND cs.status IN ('active', 'trial')
              UNION
              SELECT feature_name FROM client_features
              WHERE client_id = ? AND enabled = 1`,
        args: [row.client_id, row.client_id],
      });
      const clientFeatures = featureRows.map((f: any) => f.feature_name);

      return res.status(200).json({
        ...rowBools(row, BOOL_FIELDS),
        clients: { name: row.client_name, logo_url: row.client_logo_url, features: clientFeatures },
      });
    }

    // Tenant isolation check for collection list
    if (client_id && !isSuper && client_id !== callerClientId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const resolvedClientId = isSuper ? (client_id as string) : callerClientId;
    if (!resolvedClientId)
      return res.status(403).json({ error: "Access denied" });

    // Verify client active status
    const { rows: clientStatus } = await db.execute({
      sql: "SELECT active_status FROM clients WHERE id = ?",
      args: [resolvedClientId],
    });
    if (clientStatus.length > 0 && clientStatus[0].active_status === 0) {
      return res.status(403).json({ error: "Access Denied: Your organization has been suspended." });
    }

    // Ensure pagination parameters are processed
    const isPaginationRequested = page !== undefined && limit !== undefined;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    let dataSql = "SELECT * FROM tests WHERE client_id = ? ORDER BY created_at DESC";
    let countSql = "SELECT COUNT(*) as count FROM tests WHERE client_id = ?";
    const args: any[] = [resolvedClientId];

    let total = 0;
    if (isPaginationRequested) {
      const { rows: countRows } = await db.execute({ sql: countSql, args });
      total = Number((countRows[0] as any).count || 0);

      dataSql += " LIMIT ? OFFSET ?";
      const lNum = limitNum;
      args.push(lNum, offset);
    }

    const { rows } = await db.execute({ sql: dataSql, args });
    const formattedData = rows.map((r) => rowBools(r as any, BOOL_FIELDS));

    if (isPaginationRequested) {
      return res.status(200).json({
        data: formattedData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
        },
      });
    }

    return res.status(200).json(formattedData);
  }

  // ── POST /api/tests ─────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;

    const validation = testCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const clientId = await getUserClientId(user.id);
    if (!clientId) return res.status(403).json({ error: "No client" });

    // Verify client active status
    const { rows: clientStatus } = await db.execute({
      sql: "SELECT active_status FROM clients WHERE id = ?",
      args: [clientId],
    });
    if (clientStatus.length > 0 && clientStatus[0].active_status === 0) {
      return res.status(403).json({ error: "Access Denied: Your organization has been suspended." });
    }

    const b = validation.data;

    const id = randomUUID();
    const shareCode = b.share_code || generateShareCode();

    // Derive active from status to ensure consistency
    const resolvedStatus = b.status ?? "draft";
    const resolvedActive = resolvedStatus === "published" ? 1 : 0;

    const effectivePlan = await getEffectivePlan(clientId);

    if (!b.purchase_id) {
      // Enforce Camera Proctoring check for non-package tests
      if (b.camera_required && !effectivePlan.features.includes("camera_proctoring")) {
        return res.status(403).json({ error: "Access Denied: Camera Proctoring feature is not enabled for your organization plan." });
      }

      // Enforce Monthly Exams Quota Limit (ignoring PPT exams)
      if (effectivePlan.max_exams_per_month !== -1) {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const countRes = await db.execute({
          sql: `SELECT COUNT(*) as count FROM tests 
                WHERE client_id = ? 
                AND strftime('%Y-%m', created_at) = ?
                AND id NOT IN (SELECT test_id FROM test_billing)`,
          args: [clientId, currentMonth]
        });
        const examsCreatedThisMonth = Number((countRes.rows[0] as any).count || 0);
        if (examsCreatedThisMonth >= effectivePlan.max_exams_per_month) {
          return res.status(403).json({ error: `Quota Exceeded: Your organization monthly limit of ${effectivePlan.max_exams_per_month} exam papers has been reached.` });
        }
      }
    }

    await db.execute({
      sql: `INSERT INTO tests
            (id, client_id, folder_id, test_name, timer, shuffle, allow_review,
             negative_marking, negative_marks, restrict_navigation, attempts_allowed,
             status, active, allow_guests, scheduled_start, scheduled_end,
             share_code, public_link_enabled, camera_required)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        id, clientId, b.folder_id ?? null, b.test_name, b.timer ?? 60,
        b.shuffle ? 1 : 0, b.allow_review !== false ? 1 : 0,
        b.negative_marking ? 1 : 0, b.negative_marks ?? 0,
        b.restrict_navigation ? 1 : 0, b.attempts_allowed ?? 1,
        resolvedStatus, resolvedActive,
        b.allow_guests ? 1 : 0,
        b.scheduled_start ?? null, b.scheduled_end ?? null,
        shareCode, b.public_link_enabled ? 1 : 0,
        b.camera_required ? 1 : 0,
      ],
    });

    if (b.purchase_id) {
      const assigned = await assignPackageToTest(clientId, b.purchase_id, id);
      if (!assigned) {
        await db.execute({ sql: "DELETE FROM tests WHERE id = ?", args: [id] });
        return res.status(400).json({ error: "Invalid or already used assessment package selected." });
      }
    } else {
      await incrementClientUsage(clientId, "exams_created");
    }

    const { rows } = await db.execute({ sql: "SELECT * FROM tests WHERE id = ?", args: [id] });
    return res.status(201).json(rowBools(rows[0] as any, BOOL_FIELDS));
  }

  // ── PATCH /api/tests ────────────────────────────────────────────────────────
  if (req.method === "PATCH") {
    const user = await requireUser(req, res);
    if (!user) return;

    const validation = testUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });

    const callerClientId = await getUserClientId(user.id);
    if (!callerClientId) return res.status(403).json({ error: "No client associated" });

    // Verify client active status
    const { rows: clientStatus } = await db.execute({
      sql: "SELECT active_status FROM clients WHERE id = ?",
      args: [callerClientId],
    });
    if (clientStatus.length > 0 && clientStatus[0].active_status === 0) {
      return res.status(403).json({ error: "Access Denied: Your organization has been suspended." });
    }

    const testCheck = await db.execute({
      sql: "SELECT client_id, read_only FROM tests WHERE id = ? LIMIT 1",
      args: [String(id)]
    });
    if (testCheck.rows.length === 0) return res.status(404).json({ error: "Test not found" });
    const currentTest = testCheck.rows[0] as any;

    if (Number(currentTest.read_only) === 1) {
      const harmlessFields = ["test_name", "allow_review", "status", "active", "public_link_enabled", "allow_guests", "folder_id", "show_results_after_submission", "allow_report_download", "result_status"];
      const requestedKeys = Object.keys(req.body);
      const invalidKeys = requestedKeys.filter(k => !harmlessFields.includes(k));
      if (invalidKeys.length > 0) {
        return res.status(403).json({ error: `Block: Modifying structural settings (${invalidKeys.join(", ")}) is prohibited on read-only assessments.` });
      }
    }

    if (isClientAdmin && !isSuper) {
      if (currentTest.client_id !== callerClientId) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    // Enforce Camera Proctoring License check on update toggling
    if (req.body.camera_required) {
      const proctoringAllowed = await validatePackageFeatures(String(id), "camera_proctoring");
      if (!proctoringAllowed) {
        return res.status(403).json({ error: "Access Denied: Camera Proctoring feature is not enabled for your organization plan or package." });
      }
    }

    const allowed = ["test_name","timer","shuffle","allow_review","negative_marking",
      "negative_marks","restrict_navigation","attempts_allowed","status","active",
      "allow_guests","scheduled_start","scheduled_end","public_link_enabled","folder_id","camera_required"];

    const fields: string[] = [];
    const args: any[] = [];
    const boolFields = new Set(BOOL_FIELDS);

    for (const key of allowed) {
      if (key in req.body) {
        fields.push(`${key} = ?`);
        args.push(boolFields.has(key) ? (req.body[key] ? 1 : 0) : req.body[key]);
      }
    }

    // Auto-sync active ↔ status to prevent UI mismatch
    if ("status" in req.body && !("active" in req.body)) {
      fields.push("active = ?");
      args.push(req.body.status === "published" ? 1 : 0);
    } else if ("active" in req.body && !("status" in req.body)) {
      fields.push("status = ?");
      args.push(req.body.active ? "published" : "draft");
    }

    if (!fields.length) return res.status(400).json({ error: "Nothing to update" });
    fields.push("updated_at = datetime('now')");
    args.push(String(id));

    await db.execute({ sql: `UPDATE tests SET ${fields.join(", ")} WHERE id = ?`, args });
    const { rows } = await db.execute({ sql: "SELECT * FROM tests WHERE id = ?", args: [String(id)] });
    return res.status(200).json(rowBools(rows[0] as any, BOOL_FIELDS));
  }

  // ── DELETE /api/tests ───────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const user = await requireUser(req, res);
    if (!user) return;

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });

    // Client Admin Isolation Check
    if (isClientAdmin && !isSuper) {
      const callerClientId = await getUserClientId(user.id);
      const { rows: testRows } = await db.execute({
        sql: "SELECT client_id FROM tests WHERE id = ?",
        args: [String(id)],
      });
      if (!testRows.length) return res.status(404).json({ error: "Test not found" });
      if (testRows[0].client_id !== callerClientId) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    await db.execute({ sql: "DELETE FROM tests WHERE id = ?", args: [id as string] });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
