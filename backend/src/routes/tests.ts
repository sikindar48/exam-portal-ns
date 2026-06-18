import type { Request, Response } from "express";
import { getDb, rowBools } from "../db/db.js";
import { requireUser, getUser } from "../auth/auth.js";
import { hasRole, getUserClientId } from "../services/roles.js";
import { randomUUID } from "crypto";
import { testCreateSchema, testUpdateSchema } from "../validation/schemas.js";

const BOOL_FIELDS = ["shuffle","allow_review","negative_marking","restrict_navigation","active","allow_guests","public_link_enabled"];

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
      const { rows } = await db.execute({
        sql: `SELECT t.*, c.name as client_name, c.logo_url as client_logo_url
              FROM tests t LEFT JOIN clients c ON c.id = t.client_id
              WHERE t.share_code = ? COLLATE NOCASE`,
        args: [share_code as string],
      });
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const row = rows[0] as any;
      return res.status(200).json({
        ...rowBools(row, BOOL_FIELDS),
        clients: { name: row.client_name, logo_url: row.client_logo_url },
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
        return res.status(403).json({ error: "Access denied" });
      }

      return res.status(200).json({
        ...rowBools(row, BOOL_FIELDS),
        clients: { name: row.client_name, logo_url: row.client_logo_url },
      });
    }

    // Tenant isolation check for collection list
    if (client_id && !isSuper && client_id !== callerClientId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const resolvedClientId = isSuper ? (client_id as string) : callerClientId;
    if (!resolvedClientId)
      return res.status(400).json({ error: "client_id required" });

    const isStudent = await hasRole(user.id, "student");
    const isPaginationRequested = page !== undefined && limit !== undefined;

    let countSql = "SELECT COUNT(*) as total FROM tests WHERE client_id = ?";
    let dataSql = "";
    let args: any[] = [resolvedClientId];

    if (isStudent) {
      countSql += " AND active = 1";
    }

    const { rows: countRows } = await db.execute({ sql: countSql, args });
    const total = (countRows[0] as any).total;

    if (with_question_count === "true") {
      dataSql = `SELECT t.*,
                  (SELECT COUNT(*) FROM test_questions tq WHERE tq.test_id = t.id) as question_count
                FROM tests t
                WHERE t.client_id = ?`;
      if (isStudent) dataSql += " AND t.active = 1";
      dataSql += " ORDER BY t.created_at DESC";
    } else {
      dataSql = "SELECT * FROM tests WHERE client_id = ?";
      if (isStudent) dataSql += " AND active = 1";
      dataSql += " ORDER BY created_at DESC";
    }

    if (isPaginationRequested) {
      const pNum = Math.max(1, parseInt(page as string, 10));
      const lNum = Math.max(1, parseInt(limit as string, 10));
      const offset = (pNum - 1) * lNum;
      dataSql += " LIMIT ? OFFSET ?";
      args.push(lNum, offset);
    }

    const { rows } = await db.execute({ sql: dataSql, args });
    const formattedData = rows.map((r) => rowBools(r as any, BOOL_FIELDS));

    if (isPaginationRequested) {
      return res.status(200).json({
        data: formattedData,
        pagination: {
          page: Math.max(1, parseInt(page as string, 10)),
          limit: Math.max(1, parseInt(limit as string, 10)),
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

    const b = validation.data;
    const id = randomUUID();
    const shareCode = b.share_code || generateShareCode();

    await db.execute({
      sql: `INSERT INTO tests
            (id, client_id, folder_id, test_name, timer, shuffle, allow_review,
             negative_marking, negative_marks, restrict_navigation, attempts_allowed,
             status, active, allow_guests, scheduled_start, scheduled_end,
             share_code, public_link_enabled)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        id, clientId, b.folder_id ?? null, b.test_name, b.timer ?? 60,
        b.shuffle ? 1 : 0, b.allow_review !== false ? 1 : 0,
        b.negative_marking ? 1 : 0, b.negative_marks ?? 0,
        b.restrict_navigation ? 1 : 0, b.attempts_allowed ?? 1,
        b.status ?? "draft", b.active !== false ? 1 : 0,
        b.allow_guests ? 1 : 0,
        b.scheduled_start ?? null, b.scheduled_end ?? null,
        shareCode, b.public_link_enabled ? 1 : 0,
      ],
    });

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

    const allowed = ["test_name","timer","shuffle","allow_review","negative_marking",
      "negative_marks","restrict_navigation","attempts_allowed","status","active",
      "allow_guests","scheduled_start","scheduled_end","public_link_enabled","folder_id"];

    const fields: string[] = [];
    const args: any[] = [];
    const boolFields = new Set(BOOL_FIELDS);

    for (const key of allowed) {
      if (key in req.body) {
        fields.push(`${key} = ?`);
        args.push(boolFields.has(key) ? (req.body[key] ? 1 : 0) : req.body[key]);
      }
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
