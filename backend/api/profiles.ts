import type { Request, Response } from "express";
import { getDb } from "./_lib/db.js";
import { requireUser } from "./_lib/auth.js";
import { hasRole } from "./_lib/roles.js";
import { randomUUID } from "crypto";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  // ── GET /api/profiles ───────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { id, ids, client_id } = req.query;

    if (id) {
      const { rows } = await db.execute({ sql: "SELECT * FROM profiles WHERE id = ?", args: [id as string] });
      return res.status(200).json(rows[0] ?? null);
    }

    if (ids) {
      const idList = (ids as string).split(",").filter(Boolean);
      const placeholders = idList.map(() => "?").join(",");
      const { rows } = await db.execute({
        sql: `SELECT id, name, email, created_at FROM profiles WHERE id IN (${placeholders})`,
        args: idList,
      });
      return res.status(200).json(rows);
    }

    if (client_id) {
      const { rows } = await db.execute({
        sql: "SELECT id, name, email, client_id, created_at FROM profiles WHERE client_id = ?",
        args: [client_id as string],
      });
      return res.status(200).json(rows);
    }

    return res.status(400).json({ error: "id, ids, or client_id required" });
  }

  // ── POST /api/profiles (upsert — used by guest student registration) ─────────
  if (req.method === "POST") {
    const { id, name, email, client_id } = req.body;
    const profileId = id || randomUUID();

    await db.execute({
      sql: `INSERT INTO profiles (id, name, email, client_id)
            VALUES (?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              email = excluded.email,
              client_id = excluded.client_id,
              updated_at = datetime('now')`,
      args: [profileId, name, email, client_id ?? null],
    });

    const { rows } = await db.execute({ sql: "SELECT * FROM profiles WHERE id = ?", args: [profileId] });
    return res.status(200).json(rows[0]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
