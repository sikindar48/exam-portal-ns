import type { Request, Response } from "express";
import { getDb } from "./_lib/db";
import { requireUser } from "./_lib/auth";
import { hasRole, getUserClientId } from "./_lib/roles";
import { randomUUID } from "crypto";

export default async function handler(req: Request, res: Response) {
  const db = getDb();

  // ── GET /api/questions ──────────────────────────────────────────────────────
  if (req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return;

    const { client_id, folder_id, ids, search, difficulty } = req.query;

    // ids= comma-separated list (Builder loads questions by id)
    if (ids) {
      const idList = (ids as string).split(",").map((s) => s.trim()).filter(Boolean);
      if (!idList.length) return res.status(200).json([]);
      const placeholders = idList.map(() => "?").join(",");
      const { rows } = await db.execute({
        sql: `SELECT * FROM questions WHERE id IN (${placeholders})`,
        args: idList,
      });
      return res.status(200).json(rows);
    }

    const resolvedClientId =
      (client_id as string) || (await getUserClientId(user.id));
    if (!resolvedClientId)
      return res.status(400).json({ error: "client_id required" });

    let sql = "SELECT * FROM questions WHERE client_id = ?";
    const args: any[] = [resolvedClientId];

    if (folder_id === "null" || folder_id === "") {
      sql += " AND folder_id IS NULL";
    } else if (folder_id) {
      sql += " AND folder_id = ?";
      args.push(folder_id);
    }

    if (difficulty && difficulty !== "all") {
      sql += " AND difficulty = ?";
      args.push(difficulty);
    }

    if (search) {
      sql += " AND question_text LIKE ?";
      args.push(`%${search}%`);
    }

    sql += " ORDER BY created_at DESC";
    const { rows } = await db.execute({ sql, args });
    return res.status(200).json(rows);
  }

  // ── POST /api/questions ─────────────────────────────────────────────────────
  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;

    const clientId = await getUserClientId(user.id);
    if (!clientId) return res.status(403).json({ error: "No client" });

    const body = Array.isArray(req.body) ? req.body : [req.body];
    const inserted: any[] = [];

    for (const q of body) {
      const id = q.id && !q.id.startsWith("temp_") ? q.id : randomUUID();
      await db.execute({
        sql: `INSERT OR IGNORE INTO questions
              (id, client_id, folder_id, question_text, option_a, option_b, option_c, option_d,
               correct_answer, difficulty, marks)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          id, q.client_id || clientId, q.folder_id ?? null,
          q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
          q.correct_answer, q.difficulty ?? null, q.marks ?? 1,
        ],
      });
      inserted.push({ ...q, id });
    }

    return res.status(201).json(inserted.length === 1 ? inserted[0] : inserted);
  }

  // ── PATCH /api/questions ────────────────────────────────────────────────────
  if (req.method === "PATCH") {
    const user = await requireUser(req, res);
    if (!user) return;

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });

    // Support bulk update: ids= comma-separated
    const { ids, folder_id } = req.body;
    if (ids && Array.isArray(ids)) {
      const placeholders = ids.map(() => "?").join(",");
      await db.execute({
        sql: `UPDATE questions SET folder_id = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`,
        args: [folder_id ?? null, ...ids],
      });
      return res.status(200).json({ success: true });
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

    const { id, ids } = req.query;

    if (ids) {
      const idList = (ids as string).split(",").filter(Boolean);
      const placeholders = idList.map(() => "?").join(",");
      await db.execute({ sql: `DELETE FROM questions WHERE id IN (${placeholders})`, args: idList });
      return res.status(200).json({ success: true });
    }

    if (id) {
      await db.execute({ sql: "DELETE FROM questions WHERE id = ?", args: [id as string] });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "id or ids required" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
