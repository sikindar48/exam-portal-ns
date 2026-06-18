import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole, getUserClientId } from "../services/roles.js";
import { randomUUID } from "crypto";
import { questionCreateSchema, questionUpdateSchema } from "../validation/schemas.js";

export default async function handler(req: Request, res: Response) {
  const db = getDb();

  // ── GET /api/questions ──────────────────────────────────────────────────────
  if (req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return;

    const { client_id, folder_id, ids, search, difficulty, page, limit } = req.query;

    const callerClientId = await getUserClientId(user.id);
    const isSuper = await hasRole(user.id, "superadmin");

    // ids= comma-separated list (Builder loads questions by id)
    if (ids) {
      const idList = (ids as string).split(",").map((s) => s.trim()).filter(Boolean);
      if (!idList.length) return res.status(200).json([]);
      const placeholders = idList.map(() => "?").join(",");
      const { rows } = await db.execute({
        sql: `SELECT * FROM questions WHERE id IN (${placeholders})`,
        args: idList,
      });

      // Tenant isolation check
      if (!isSuper) {
        for (const row of rows as any[]) {
          if (row.client_id !== callerClientId) {
            return res.status(403).json({ error: "Access denied" });
          }
        }
      }

      return res.status(200).json(rows);
    }

    // Tenant isolation check for collection list
    if (client_id && !isSuper && client_id !== callerClientId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const resolvedClientId = isSuper ? (client_id as string) : callerClientId;
    if (!resolvedClientId)
      return res.status(400).json({ error: "client_id required" });

    let countSql = "SELECT COUNT(*) as total FROM questions WHERE client_id = ?";
    let dataSql = "SELECT * FROM questions WHERE client_id = ?";
    let args: any[] = [resolvedClientId];

    let filterSql = "";
    if (folder_id === "null" || folder_id === "") {
      filterSql += " AND folder_id IS NULL";
    } else if (folder_id) {
      filterSql += " AND folder_id = ?";
      args.push(folder_id);
    }

    if (difficulty && difficulty !== "all") {
      filterSql += " AND difficulty = ?";
      args.push(difficulty);
    }

    if (search) {
      filterSql += " AND question_text LIKE ?";
      args.push(`%${search}%`);
    }

    countSql += filterSql;
    dataSql += filterSql + " ORDER BY created_at DESC";

    const isPaginationRequested = page !== undefined && limit !== undefined;
    const { rows: countRows } = await db.execute({ sql: countSql, args: args.slice(0, args.length) });
    const total = (countRows[0] as any).total;

    if (isPaginationRequested) {
      const pNum = Math.max(1, parseInt(page as string, 10));
      const lNum = Math.max(1, parseInt(limit as string, 10));
      const offset = (pNum - 1) * lNum;
      dataSql += " LIMIT ? OFFSET ?";
      args.push(lNum, offset);
    }

    const { rows } = await db.execute({ sql: dataSql, args });

    if (isPaginationRequested) {
      return res.status(200).json({
        data: rows,
        pagination: {
          page: Math.max(1, parseInt(page as string, 10)),
          limit: Math.max(1, parseInt(limit as string, 10)),
          total,
        },
      });
    }

    return res.status(200).json(rows);
  }

  // ── POST /api/questions ─────────────────────────────────────────────────────
  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;

    const body = Array.isArray(req.body) ? req.body : [req.body];
    for (const q of body) {
      const validation = questionCreateSchema.safeParse(q);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }
    }

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const clientId = await getUserClientId(user.id);
    if (!clientId) return res.status(403).json({ error: "No client" });

    const inserted: any[] = [];

    for (const q of body) {
      // Ensure clientadmin cannot insert questions for other clients
      const targetClientId: string = q.client_id || clientId;
      if (isClientAdmin && !isSuper && targetClientId !== clientId) {
        return res.status(403).json({ error: "Cannot create questions for another organization" });
      }

      const id = q.id && !q.id.startsWith("temp_") ? q.id : randomUUID();
      await db.execute({
        sql: `INSERT OR IGNORE INTO questions
              (id, client_id, folder_id, question_text, option_a, option_b, option_c, option_d,
               correct_answer, difficulty, marks)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          id, targetClientId, q.folder_id ?? null,
          q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
          q.correct_answer, q.difficulty ?? null, q.marks ?? 1,
        ],
      });
      inserted.push({ ...q, id, client_id: targetClientId });
    }

    return res.status(201).json(inserted.length === 1 ? inserted[0] : inserted);
  }

  // ── PATCH /api/questions ────────────────────────────────────────────────────
  if (req.method === "PATCH") {
    const user = await requireUser(req, res);
    if (!user) return;

    const validation = questionUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { id } = req.query;
    if (!id && !req.body.ids) return res.status(400).json({ error: "id or ids required" });

    const callerClientId = await getUserClientId(user.id);

    // Support bulk update: ids= comma-separated
    const { ids, folder_id } = req.body;
    if (ids && Array.isArray(ids)) {
      if (isClientAdmin && !isSuper) {
        const placeholders = ids.map(() => "?").join(",");
        const { rows } = await db.execute({
          sql: `SELECT COUNT(*) as count FROM questions WHERE id IN (${placeholders}) AND client_id != ?`,
          args: [...ids, callerClientId],
        });
        if ((rows[0] as any).count > 0) {
          return res.status(403).json({ error: "Cannot modify questions belonging to another organization" });
        }
      }

      const placeholders = ids.map(() => "?").join(",");
      await db.execute({
        sql: `UPDATE questions SET folder_id = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`,
        args: [folder_id ?? null, ...ids],
      });
      return res.status(200).json({ success: true });
    }

    if (isClientAdmin && !isSuper) {
      const { rows } = await db.execute({
        sql: "SELECT client_id FROM questions WHERE id = ?",
        args: [String(id)],
      });
      if (!rows.length) return res.status(404).json({ error: "Question not found" });
      if (rows[0].client_id !== callerClientId) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    const fields: string[] = [];
    const args: any[] = [];
    const allowed = ["question_text","option_a","option_b","option_c","option_d","correct_answer","difficulty","marks","folder_id"];
    for (const key of allowed) {
      if (key in req.body) { fields.push(`${key} = ?`); args.push(req.body[key]); }
    }
    if (!fields.length) return res.status(400).json({ error: "Nothing to update" });
    fields.push("updated_at = datetime('now')");
    args.push(String(id));
    await db.execute({ sql: `UPDATE questions SET ${fields.join(", ")} WHERE id = ?`, args });
    const { rows } = await db.execute({ sql: "SELECT * FROM questions WHERE id = ?", args: [String(id)] });
    return res.status(200).json(rows[0]);
  }

  // ── DELETE /api/questions ───────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const user = await requireUser(req, res);
    if (!user) return;

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { id, ids } = req.query;
    const callerClientId = await getUserClientId(user.id);

    if (ids) {
      const idList = (ids as string).split(",").filter(Boolean);
      if (isClientAdmin && !isSuper) {
        const placeholders = idList.map(() => "?").join(",");
        const { rows } = await db.execute({
          sql: `SELECT COUNT(*) as count FROM questions WHERE id IN (${placeholders}) AND client_id != ?`,
          args: [...idList, callerClientId],
        });
        if ((rows[0] as any).count > 0) {
          return res.status(403).json({ error: "Cannot delete questions belonging to another organization" });
        }
      }

      const placeholders = idList.map(() => "?").join(",");
      await db.execute({ sql: `DELETE FROM questions WHERE id IN (${placeholders})`, args: idList });
      return res.status(200).json({ success: true });
    }

    if (id) {
      if (isClientAdmin && !isSuper) {
        const { rows } = await db.execute({
          sql: "SELECT client_id FROM questions WHERE id = ?",
          args: [id as string],
        });
        if (!rows.length) return res.status(404).json({ error: "Question not found" });
        if (rows[0].client_id !== callerClientId) {
          return res.status(403).json({ error: "Permission denied" });
        }
      }

      await db.execute({ sql: "DELETE FROM questions WHERE id = ?", args: [id as string] });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "id or ids required" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
