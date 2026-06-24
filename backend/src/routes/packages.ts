import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole, getUserClientId } from "../services/roles.js";
import { randomUUID } from "crypto";
import { getAvailablePackages, getClientPurchases } from "../services/billing.js";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  const isSuper = await hasRole(user.id, "superadmin");
  const isClientAdmin = await hasRole(user.id, "clientadmin");

  if (!isSuper && !isClientAdmin) {
    return res.status(403).json({ error: "Permission denied" });
  }

  // ── GET /api/packages (List packages) ──────────────────────────────────────
  if (req.method === "GET") {
    // If client admin, get their purchases or active packages
    const { type } = req.query;
    
    if (type === "purchases") {
      const targetClientId = isSuper && req.query.client_id
        ? String(req.query.client_id)
        : await getUserClientId(user.id);
        
      if (!targetClientId) return res.status(400).json({ error: "Client ID required" });
      const purchases = await getClientPurchases(targetClientId);
      return res.status(200).json(purchases);
    }

    // Default: get all available packages
    const pkgs = await getAvailablePackages();
    return res.status(200).json(pkgs);
  }

  // ── POST /api/packages/purchase (Provision package for client or request by clientadmin) ──
  if (req.method === "POST") {
    let targetClientId = req.body.client_id;
    let initialStatus = "available";

    if (!isSuper) {
      if (!isClientAdmin) {
        return res.status(403).json({ error: "Permission denied" });
      }
      const myClientId = await getUserClientId(user.id);
      if (!myClientId) {
        return res.status(400).json({ error: "No client organization associated with user" });
      }
      targetClientId = myClientId;
      initialStatus = "requested";
    }

    const { package_id, custom_max_candidates = null, custom_max_questions = null } = req.body;
    if (!targetClientId || !package_id) {
      return res.status(400).json({ error: "package_id is required" });
    }

    // Verify package exists
    const { rows: pkgRows } = await db.execute({
      sql: "SELECT * FROM test_packages WHERE id = ? LIMIT 1",
      args: [package_id],
    });
    if (!pkgRows.length) return res.status(404).json({ error: "Package not found" });

    const purchaseId = randomUUID();
    await db.execute({
      sql: `INSERT INTO client_test_purchases (id, client_id, package_id, status, custom_max_candidates, custom_max_questions)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [purchaseId, targetClientId, package_id, initialStatus, custom_max_candidates, custom_max_questions],
    });

    return res.status(201).json({ id: purchaseId, success: true, status: initialStatus });
  }

  // ── PATCH /api/packages (Edit master package or purchase override settings - Superadmin only) ──
  if (req.method === "PATCH") {
    if (!isSuper) return res.status(403).json({ error: "Permission denied: Superadmin only" });

    if (req.path.endsWith("/purchase")) {
      const { purchase_id, custom_max_candidates = null, custom_max_questions = null, status = null } = req.body;
      if (!purchase_id) {
        return res.status(400).json({ error: "purchase_id is required" });
      }

      // Check status
      const { rows: checkRows } = await db.execute({
        sql: "SELECT status FROM client_test_purchases WHERE id = ? LIMIT 1",
        args: [purchase_id],
      });
      if (!checkRows.length) return res.status(404).json({ error: "Purchase record not found" });
      if (checkRows[0].status !== "available" && checkRows[0].status !== "requested") {
        return res.status(400).json({ error: "Cannot modify an assigned/used package credit" });
      }

      const candsVal = custom_max_candidates === "default" || custom_max_candidates === null ? null : parseInt(custom_max_candidates);
      const qVal = custom_max_questions === "default" || custom_max_questions === null ? null : parseInt(custom_max_questions);
      const newStatus = status ? status : checkRows[0].status;

      await db.execute({
        sql: `UPDATE client_test_purchases 
              SET custom_max_candidates = ?, custom_max_questions = ?, status = ?
              WHERE id = ?`,
        args: [candsVal, qVal, newStatus, purchase_id],
      });

      return res.status(200).json({ success: true });
    } else {
      // Edit master package
      const {
        id,
        name,
        price,
        max_questions,
        max_candidates,
        csv_import = 0,
        xlsx_export = 0,
        analytics = 1,
        custom_branding = 0,
        basic_proctoring = 0,
        camera_proctoring = 0,
        priority_support = 0,
        active = 1
      } = req.body;

      if (!id) return res.status(400).json({ error: "id is required" });

      await db.execute({
        sql: `UPDATE test_packages 
              SET name = ?, price = ?, max_questions = ?, max_candidates = ?, 
                  csv_import = ?, xlsx_export = ?, analytics = ?, custom_branding = ?, 
                  basic_proctoring = ?, camera_proctoring = ?, priority_support = ?, active = ?
              WHERE id = ?`,
        args: [
          name,
          Number(price),
          Number(max_questions),
          Number(max_candidates),
          csv_import ? 1 : 0,
          xlsx_export ? 1 : 0,
          analytics ? 1 : 0,
          custom_branding ? 1 : 0,
          basic_proctoring ? 1 : 0,
          camera_proctoring ? 1 : 0,
          priority_support ? 1 : 0,
          active ? 1 : 0,
          id
        ]
      });

      return res.status(200).json({ success: true });
    }
  }

  // ── DELETE /api/packages/purchase (Delete/Refund available package - Superadmin only) ──
  if (req.method === "DELETE") {
    if (!isSuper) return res.status(403).json({ error: "Permission denied: Superadmin only" });

    const { purchase_id } = req.body;
    if (!purchase_id) {
      return res.status(400).json({ error: "purchase_id is required" });
    }

    // Check status is available
    const { rows: checkRows } = await db.execute({
      sql: "SELECT status FROM client_test_purchases WHERE id = ? LIMIT 1",
      args: [purchase_id],
    });
    if (!checkRows.length) return res.status(404).json({ error: "Purchase record not found" });
    if (checkRows[0].status !== "available" && checkRows[0].status !== "requested") {
      return res.status(400).json({ error: "Cannot delete an assigned/used package credit" });
    }

    await db.execute({
      sql: "DELETE FROM client_test_purchases WHERE id = ?",
      args: [purchase_id],
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}


