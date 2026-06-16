import type { Request, Response } from "express";
import { getDb } from "./_lib/db";
import { requireUser } from "./_lib/auth";
import { hasRole } from "./_lib/roles";
import { randomUUID } from "crypto";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const { user_id, client_id, role } = req.query;

    let sql = "SELECT * FROM user_roles WHERE 1=1";
    const args: any[] = [];

    if (user_id) { sql += " AND user_id = ?"; args.push(user_id); }
    if (client_id) { sql += " AND client_id = ?"; args.push(client_id); }
    if (role) { sql += " AND role = ?"; args.push(role); }

    const { rows } = await db.execute({ sql, args });
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { user_id, role, client_id } = req.body;
    if (!user_id || !role) return res.status(400).json({ error: "user_id and role required" });

    const id = randomUUID();
    await db.execute({
      sql: `INSERT OR IGNORE INTO user_roles (id, user_id, role, client_id)
            VALUES (?,?,?,?)`,
      args: [id, user_id, role, client_id ?? null],
    });
    return res.status(201).json({ id, user_id, role, client_id });
  }

  if (req.method === "DELETE") {
    const { user_id, role } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    let sql = "DELETE FROM user_roles WHERE user_id = ?";
    const args: any[] = [user_id as string];
    if (role) { sql += " AND role = ?"; args.push(role); }

    await db.execute({ sql, args });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
