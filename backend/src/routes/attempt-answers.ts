import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { randomUUID } from "crypto";
import { hasRole, getUserClientId, isGuestStudent } from "../services/roles.js";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  const isSuper = await hasRole(user.id, "superadmin");
  const isClientAdmin = await hasRole(user.id, "clientadmin");

  // ── GET /api/attempt-answers?attempt_id= ───────────────────────────────────
  if (req.method === "GET") {
    const { attempt_id } = req.query;
    if (!attempt_id) return res.status(400).json({ error: "attempt_id required" });

    // Verify ownership of the attempt
    const { rows: attemptRows } = await db.execute({
      sql: `SELECT a.student_id, t.client_id
            FROM attempts a JOIN tests t ON t.id = a.test_id
            WHERE a.id = ?`,
      args: [attempt_id as string],
    });

    if (!attemptRows.length) return res.status(404).json({ error: "Attempt not found" });
    const attempt = attemptRows[0] as any;

    if (!isSuper) {
      if (isClientAdmin) {
        const callerClientId = await getUserClientId(user.id);
        if (attempt.client_id !== callerClientId) {
          return res.status(403).json({ error: "Permission denied" });
        }
      } else {
        if (attempt.student_id !== user.id) {
          const isGuest = await isGuestStudent(attempt.student_id);
          if (!isGuest) {
            return res.status(403).json({ error: "Permission denied" });
          }
        }
      }
    }

    const { rows } = await db.execute({
      sql: "SELECT * FROM attempt_answers WHERE attempt_id = ?",
      args: [attempt_id as string],
    });
    return res.status(200).json(rows.map((r: any) => ({
      ...r,
      marked_for_review: r.marked_for_review === 1,
    })));
  }

  // ── POST /api/attempt-answers (upsert batch) ────────────────────────────────
  if (req.method === "POST") {
    const body = Array.isArray(req.body) ? req.body : [req.body];
    if (body.length === 0) return res.status(200).json({ success: true });

    // Validate that the target attempt belongs to the user and is in_progress
    const targetAttemptId = body[0].attempt_id;
    const { rows: attemptRows } = await db.execute({
      sql: "SELECT student_id, status FROM attempts WHERE id = ?",
      args: [targetAttemptId],
    });

    if (!attemptRows.length) return res.status(404).json({ error: "Attempt not found" });
    const attempt = attemptRows[0] as any;

    const isGuest = await isGuestStudent(attempt.student_id);
    if (!isSuper && attempt.student_id !== user.id && !isGuest) {
      return res.status(403).json({ error: "Permission denied" });
    }

    if (attempt.status !== "in_progress") {
      return res.status(403).json({ error: "Cannot modify answers of a submitted attempt" });
    }

    const stmts = body.map((row: any) => ({
      sql: `INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option, marked_for_review)
            VALUES (?,?,?,?,?)
            ON CONFLICT(attempt_id, question_id) DO UPDATE SET
              selected_option = excluded.selected_option,
              marked_for_review = excluded.marked_for_review`,
      args: [
        randomUUID(),
        row.attempt_id,
        row.question_id,
        row.selected_option ?? null,
        row.marked_for_review ? 1 : 0,
      ],
    }));

    await db.batch(stmts, "write");
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
