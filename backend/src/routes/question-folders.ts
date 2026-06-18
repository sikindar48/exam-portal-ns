import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { getUserClientId, hasRole } from "../services/roles.js";
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

  const clientId = await getUserClientId(user.id);
  if (!isSuper && !clientId) return res.status(403).json({ error: "No client" });

  if (req.method === "GET") {
    const targetClientId = clientId || req.query.client_id;
    if (!targetClientId) return res.status(400).json({ error: "client_id required" });
    const { rows } = await db.execute({
      sql: "SELECT * FROM question_folders WHERE client_id = ? ORDER BY name",
      args: [targetClientId as string],
    });
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { name, parent_id, client_id } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const targetClientId = client_id || clientId;
    if (!targetClientId) return res.status(400).json({ error: "client_id required" });

    if (isClientAdmin && !isSuper && targetClientId !== clientId) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const id = randomUUID();
    await db.execute({
      sql: "INSERT INTO question_folders (id, client_id, name, parent_id) VALUES (?,?,?,?)",
      args: [id, targetClientId, name, parent_id ?? null],
    });
    const { rows } = await db.execute({ sql: "SELECT * FROM question_folders WHERE id = ?", args: [id] });
    return res.status(201).json(rows[0]);
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });

    if (isClientAdmin && !isSuper) {
      const { rows } = await db.execute({
        sql: "SELECT client_id FROM question_folders WHERE id = ?",
        args: [id as string],
      });
      if (!rows.length) return res.status(404).json({ error: "Folder not found" });
      if (rows[0].client_id !== clientId) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    // Since SQLite CASCADE handles the rest, we delete directly
    await db.execute({ sql: "DELETE FROM question_folders WHERE id = ?", args: [id as string] });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
