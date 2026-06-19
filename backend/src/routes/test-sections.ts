import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { getUserClientId, hasRole } from "../services/roles.js";
import { randomUUID } from "crypto";

export default async function handler(req: Request, res: Response) {
  const db = getDb();

  // ── GET /api/test-sections ──────────────────────────────────────────────────
  if (req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return;

    const { test_id } = req.query;
    if (!test_id) {
      return res.status(400).json({ error: "test_id required" });
    }

    // Tenant isolation verification
    const { rows: testRows } = await db.execute({
      sql: "SELECT client_id FROM tests WHERE id = ?",
      args: [test_id as string],
    });
    if (!testRows.length) {
      return res.status(404).json({ error: "Test not found" });
    }
    const test = testRows[0] as any;

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper) {
      const callerClientId = await getUserClientId(user.id);
      // Client Admins can only view their own test sections; students can only view if it's their tenant or open
      if (isClientAdmin && test.client_id !== callerClientId) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const { rows } = await db.execute({
      sql: "SELECT * FROM test_sections WHERE test_id = ? ORDER BY position ASC",
      args: [test_id as string],
    });

    return res.status(200).json(rows);
  }

  // ── POST /api/test-sections ─────────────────────────────────────────────────
  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const {
      test_id,
      name,
      position,
      duration_minutes = null,
      negative_marks = 0,
      shuffle_questions = 0,
      shuffle_options = 0,
      navigation_locked = 0
    } = req.body;

    if (!test_id || !name) {
      return res.status(400).json({ error: "test_id and name are required" });
    }

    // Verify test exists and matches caller client ID
    const { rows: testRows } = await db.execute({
      sql: "SELECT client_id FROM tests WHERE id = ?",
      args: [test_id],
    });
    if (!testRows.length) {
      return res.status(404).json({ error: "Test not found" });
    }
    if (!isSuper && isClientAdmin) {
      const callerClientId = await getUserClientId(user.id);
      if (testRows[0].client_id !== callerClientId) {
        return res.status(403).json({ error: "Cannot manage sections for another organization's test" });
      }
    }

    // Determine position if not provided
    let finalPosition = position;
    if (finalPosition === undefined || finalPosition === null) {
      const { rows: countRows } = await db.execute({
        sql: "SELECT COUNT(*) as count FROM test_sections WHERE test_id = ?",
        args: [test_id],
      });
      finalPosition = (countRows[0] as any).count;
    }

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO test_sections (
              id, test_id, name, position, duration_minutes,
              negative_marks, shuffle_questions, shuffle_options, navigation_locked
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, test_id, name, finalPosition, duration_minutes,
        negative_marks, shuffle_questions, shuffle_options, navigation_locked
      ],
    });

    const { rows } = await db.execute({
      sql: "SELECT * FROM test_sections WHERE id = ?",
      args: [id],
    });

    return res.status(201).json(rows[0]);
  }

  // ── PATCH /api/test-sections ────────────────────────────────────────────────
  if (req.method === "PATCH") {
    const user = await requireUser(req, res);
    if (!user) return;

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "id required" });
    }

    const { rows: sectionRows } = await db.execute({
      sql: "SELECT s.*, t.client_id FROM test_sections s JOIN tests t ON t.id = s.test_id WHERE s.id = ?",
      args: [id as string],
    });
    if (!sectionRows.length) {
      return res.status(404).json({ error: "Section not found" });
    }
    const section = sectionRows[0] as any;

    if (!isSuper && isClientAdmin) {
      const callerClientId = await getUserClientId(user.id);
      if (section.client_id !== callerClientId) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    // Build update parameters dynamically
    const fields = [
      "name", "position", "duration_minutes", "negative_marks",
      "shuffle_questions", "shuffle_options", "navigation_locked"
    ];
    const updates: string[] = [];
    const args: any[] = [];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        args.push(req.body[field]);
      }
    });

    if (updates.length > 0) {
      args.push(id as string);
      await db.execute({
        sql: `UPDATE test_sections SET ${updates.join(", ")} WHERE id = ?`,
        args,
      });
    }

    const { rows } = await db.execute({
      sql: "SELECT * FROM test_sections WHERE id = ?",
      args: [id as string],
    });

    return res.status(200).json(rows[0]);
  }

  // ── DELETE /api/test-sections ───────────────────────────────────────────────
  if (req.method === "DELETE") {
    const user = await requireUser(req, res);
    if (!user) return;

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "id required" });
    }

    const { rows: sectionRows } = await db.execute({
      sql: "SELECT s.*, t.client_id FROM test_sections s JOIN tests t ON t.id = s.test_id WHERE s.id = ?",
      args: [id as string],
    });
    if (!sectionRows.length) {
      return res.status(404).json({ error: "Section not found" });
    }
    const section = sectionRows[0] as any;

    if (!isSuper && isClientAdmin) {
      const callerClientId = await getUserClientId(user.id);
      if (section.client_id !== callerClientId) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    // Transactionally update test_questions referencing this section to set section_id = null
    await db.execute({
      sql: "UPDATE test_questions SET section_id = NULL WHERE section_id = ?",
      args: [id as string],
    });

    // Delete section
    await db.execute({
      sql: "DELETE FROM test_sections WHERE id = ?",
      args: [id as string],
    });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
