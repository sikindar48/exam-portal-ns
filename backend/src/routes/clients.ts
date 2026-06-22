import type { Request, Response } from "express";
import { getDb, rowBools } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole, getUserClientId } from "../services/roles.js";
import { createAuditLog } from "../services/audit.js";
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
      
      const { rows: features } = await db.execute({
        sql: "SELECT feature_name FROM client_features WHERE client_id = ? AND enabled = 1",
        args: [id as string],
      });
      const featureList = features.map((f: any) => f.feature_name);

      const { rows: limits } = await db.execute({
        sql: "SELECT max_exams_per_month, max_students_per_exam, max_questions_per_exam FROM client_limits WHERE client_id = ?",
        args: [id as string],
      });
      const clientLimits = limits.length > 0 ? limits[0] : {
        max_exams_per_month: -1,
        max_students_per_exam: -1,
        max_questions_per_exam: -1,
      };

      return res.status(200).json({
        ...rowBools(rows[0] as any, BOOL_FIELDS),
        features: featureList,
        limits: clientLimits,
      });
    }

    if (isSuperAdmin) {
      const { rows: clientRows } = await db.execute(
        "SELECT * FROM clients ORDER BY created_at DESC"
      );
      
      if (!clientRows.length) {
        return res.status(200).json([]);
      }

      // Bulk fetch features
      const { rows: featureRows } = await db.execute(
        "SELECT client_id, feature_name FROM client_features WHERE enabled = 1"
      );
      const featuresMap: Record<string, string[]> = {};
      for (const f of featureRows) {
        const cid = (f as any).client_id;
        const name = (f as any).feature_name;
        if (!featuresMap[cid]) featuresMap[cid] = [];
        featuresMap[cid].push(name);
      }

      // Bulk fetch limits
      const { rows: limitRows } = await db.execute(
        "SELECT client_id, max_exams_per_month, max_students_per_exam, max_questions_per_exam FROM client_limits"
      );
      const limitsMap: Record<string, any> = {};
      for (const l of limitRows) {
        const cid = (l as any).client_id;
        limitsMap[cid] = {
          max_exams_per_month: (l as any).max_exams_per_month,
          max_students_per_exam: (l as any).max_students_per_exam,
          max_questions_per_exam: (l as any).max_questions_per_exam,
        };
      }

      // Bulk fetch student counts
      const { rows: studentCounts } = await db.execute(
        "SELECT client_id, COUNT(*) as count FROM user_roles WHERE role = 'student' GROUP BY client_id"
      );
      const studentCountMap: Record<string, number> = {};
      for (const s of studentCounts) {
        studentCountMap[(s as any).client_id] = (s as any).count || 0;
      }

      // Bulk fetch attempt counts
      const { rows: attemptCounts } = await db.execute(
        "SELECT tests.client_id, COUNT(*) as count FROM attempts JOIN tests ON attempts.test_id = tests.id GROUP BY tests.client_id"
      );
      const attemptCountMap: Record<string, number> = {};
      for (const a of attemptCounts) {
        attemptCountMap[(a as any).client_id] = (a as any).count || 0;
      }

      // Bulk fetch proctoring events
      const { rows: proctoringCounts } = await db.execute(
        "SELECT tests.client_id, COUNT(*) as count FROM proctoring_events JOIN tests ON proctoring_events.test_id = tests.id WHERE proctoring_events.has_evidence = 1 GROUP BY tests.client_id"
      );
      const proctoringCountMap: Record<string, number> = {};
      for (const p of proctoringCounts) {
        proctoringCountMap[(p as any).client_id] = (p as any).count || 0;
      }

      const clientsWithMeta = clientRows.map((clientRow: any) => {
        const clientId = clientRow.id;
        const featureList = featuresMap[clientId] || [];
        const clientLimits = limitsMap[clientId] || {
          max_exams_per_month: -1,
          max_students_per_exam: -1,
          max_questions_per_exam: -1,
        };
        const totalStudents = studentCountMap[clientId] || 0;
        const totalAttempts = attemptCountMap[clientId] || 0;
        const storageMB = parseFloat(((Number(proctoringCountMap[clientId] || 0) * 150) / 1024).toFixed(2));

        return {
          ...rowBools(clientRow, BOOL_FIELDS),
          features: featureList,
          limits: clientLimits,
          totalStudents,
          totalAttempts,
          storageUsedMb: storageMB,
        };
      });

      return res.status(200).json(clientsWithMeta);
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

    const { name, address, logo_url, active_status = true, limits, features } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO clients (id, name, address, logo_url, active_status)
            VALUES (?,?,?,?,?)`,
      args: [id, name, address ?? null, logo_url ?? null, active_status ? 1 : 0],
    });

    // Seed default or customized client limits
    await db.execute({
      sql: `INSERT INTO client_limits (client_id, max_exams_per_month, max_students_per_exam, max_questions_per_exam)
            VALUES (?, ?, ?, ?)`,
      args: [
        id,
        limits?.max_exams_per_month ?? -1,
        limits?.max_students_per_exam ?? -1,
        limits?.max_questions_per_exam ?? -1
      ],
    });

    // Seed features
    if (features && Array.isArray(features)) {
      for (const feat of features) {
        const featId = randomUUID();
        await db.execute({
          sql: "INSERT INTO client_features (id, client_id, feature_name, enabled) VALUES (?, ?, ?, 1)",
          args: [featId, id, feat],
        });
      }
    }

    // Create Audit Record
    await createAuditLog({
      userId: user.id,
      action: "Created Client Organization",
      entityType: "clients",
      entityId: id,
      metadata: { name, limits, features },
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

    const { name, address, logo_url, active_status, limits, features } = req.body;

    // Super Admin updates Limits and Features
    if (isSuperAdmin) {
      if (limits) {
        const { max_exams_per_month, max_students_per_exam, max_questions_per_exam } = limits;
        await db.execute({
          sql: `INSERT INTO client_limits (client_id, max_exams_per_month, max_students_per_exam, max_questions_per_exam)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(client_id) DO UPDATE SET
                  max_exams_per_month = ?,
                  max_students_per_exam = ?,
                  max_questions_per_exam = ?,
                  updated_at = CURRENT_TIMESTAMP`,
          args: [
            idStr, 
            max_exams_per_month ?? -1, 
            max_students_per_exam ?? -1, 
            max_questions_per_exam ?? -1,
            max_exams_per_month ?? -1, 
            max_students_per_exam ?? -1, 
            max_questions_per_exam ?? -1
          ],
        });
      }

      if (features && Array.isArray(features)) {
        await db.execute({
          sql: "DELETE FROM client_features WHERE client_id = ?",
          args: [idStr],
        });
        for (const feat of features) {
          const featId = randomUUID();
          await db.execute({
            sql: "INSERT INTO client_features (id, client_id, feature_name, enabled) VALUES (?, ?, ?, 1)",
            args: [featId, idStr, feat],
          });
        }
      }
    }

    const fields: string[] = [];
    const args: any[] = [];

    if (name !== undefined) { fields.push("name = ?"); args.push(name); }
    if (address !== undefined) { fields.push("address = ?"); args.push(address); }
    if (logo_url !== undefined) { fields.push("logo_url = ?"); args.push(logo_url); }
    if (active_status !== undefined) { fields.push("active_status = ?"); args.push(active_status ? 1 : 0); }
    fields.push("updated_at = datetime('now')");

    args.push(idStr);
    await db.execute({ sql: `UPDATE clients SET ${fields.join(", ")} WHERE id = ?`, args });

    // Create Audit Record
    await createAuditLog({
      userId: user.id,
      action: active_status === false ? "Suspended Client Organization" : "Updated Client Organization Details",
      entityType: "clients",
      entityId: idStr,
      metadata: { name, active_status, limits, features },
    });

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
    const idStr = String(id);

    await db.execute({ sql: "DELETE FROM clients WHERE id = ?", args: [idStr] });

    // Create Audit Record
    await createAuditLog({
      userId: user.id,
      action: "Deleted Client Organization",
      entityType: "clients",
      entityId: idStr,
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
