import type { Request, Response } from "express";
import { getDb, rowBools } from "./_lib/db";
import { requireUser } from "./_lib/auth";
import { hasRole, getUserClientId } from "./_lib/roles";
import { randomUUID } from "crypto";

const BOOL_FIELDS = ["active_status"];

export default async function handler(req: Request, res: Response) {
  const db = getDb();

  // ── GET /api/clients ────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { id, active_only } = req.query;

    // Public: list active clients (for sign-up page org dropdown)
    if (active_only === "true" && !id) {
      const { rows } = await db.execute(
        "SELECT id, name, logo_url FROM clients WHERE active_status = 1 ORDER BY name"
      );
      return res.status(200).json(rows);
    }

    const user = await requireUser(req, res);
    if (!user) return;

    const isSuperAdmin = await hasRole(user.id, "superadmin");

    if (id) {
      // Single client fetch (settings page, sidebar branding)
      const { rows } = await db.execute({
        sql: "SELECT * FROM clients WHERE id = ?",
        args: [id as string],
      });
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(rowBools(rows[0] as any, BOOL_FIELDS));
    }

    if (isSuperAdmin) {
      const { rows } = await db.execute(
        "SELECT * FROM clients ORDER BY created_at DESC"
      );
      return res.status(200).json(rows.map((r) => rowBools(r as any, BOOL_FIELDS)));
    }

    // clientadmin / student — return their own client
    const clientId = await getUserClientId(user.id);
    if (!clientId) return res.status(200).json([]);
    const { rows } = await db.execute({
      sql: "SELECT * FROM clients WHERE id = ?",
      args: [clientId],
    });
    return res.status(200).json(rows.map((r) => rowBools(r as any, BOOL_FIELDS)));
  }

  // ── POST /api/clients ───────────────────────────────────────────────────────
  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!(await hasRole(user.id, "superadmin")))
      return res.status(403).json({ error: "Forbidden" });

    const { name, address, logo_url, active_status = true } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO clients (id, name, address, logo_url, active_status)
            VALUES (?,?,?,?,?)`,
      args: [id, name, address ?? null, logo_url ?? null, active_status ? 1 : 0],
    });
    const { rows } = await db.execute({ sql: "SELECT * FROM clients WHERE id = ?", args: [id] });
    return res.status(201).json(rowBools(rows[0] as any, BOOL_FIELDS));
  }

  // ── PATCH /api/clients ──────────────────────────────────────────────────────
  if (req.method === "PATCH") {
    const user = await requireUser(req, res);
    if (!user) return;

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id is required" });
    const idStr = String(id);

    const isSuperAdmin = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");

    if (!isSuperAdmin && !isClientAdmin)
      return res.status(403).json({ error: "Forbidden" });

    // clientadmin can only update their own client
    if (!isSuperAdmin) {
      const clientId = await getUserClientId(user.id);
      if (clientId !== idStr) return res.status(403).json({ error: "Forbidden" });
    }

    const { name, address, logo_url, active_status } = req.body;
    const fields: string[] = [];
    const args: any[] = [];

    if (name !== undefined) { fields.push("name = ?"); args.push(name); }
    if (address !== undefined) { fields.push("address = ?"); args.push(address); }
    if (logo_url !== undefined) { fields.push("logo_url = ?"); args.push(logo_url); }
    if (active_status !== undefined) { fields.push("active_status = ?"); args.push(active_status ? 1 : 0); }
    fields.push("updated_at = datetime('now')");

    if (fields.length === 1) return res.status(400).json({ error: "Nothing to update" });

    args.push(idStr);
    await db.execute({ sql: `UPDATE clients SET ${fields.join(", ")} WHERE id = ?`, args });
    const { rows } = await db.execute({ sql: "SELECT * FROM clients WHERE id = ?", args: [idStr] });
    return res.status(200).json(rowBools(rows[0] as any, BOOL_FIELDS));
  }

  // ── DELETE /api/clients ─────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const user = await requireUser(req, res);
    if (!user) return;
    if (!(await hasRole(user.id, "superadmin")))
      return res.status(403).json({ error: "Forbidden" });

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id is required" });

    await db.execute({ sql: "DELETE FROM clients WHERE id = ?", args: [String(id)] });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
