import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { getUserClientId } from "../services/roles.js";
import { randomUUID } from "crypto";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  const clientId = await getUserClientId(user.id);
  if (!clientId) return res.status(403).json({ error: "No client" });

  if (req.method === "GET") {
    const { rows } = await db.execute({
      sql: "SELECT * FROM test_folders WHERE client_id = ? ORDER BY name",
      args: [clientId],
    });
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const id = randomUUID();
    await db.execute({
      sql: "INSERT INTO test_folders (id, client_id, name) VALUES (?,?,?)",
      args: [id, clientId, name],
    });
    const { rows } = await db.execute({ sql: "SELECT * FROM test_folders WHERE id = ?", args: [id] });
    return res.status(201).json(rows[0]);
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });
    await db.execute({ sql: "DELETE FROM test_folders WHERE id = ? AND client_id = ?", args: [id as string, clientId] });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
