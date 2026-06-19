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
      sql: "SELECT student_id, status, test_id, started_at FROM attempts WHERE id = ?",
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

    // Fetch test sections
    const { rows: secRows } = await db.execute({
      sql: "SELECT id, duration_minutes, navigation_locked, position FROM test_sections WHERE test_id = ? ORDER BY position ASC",
      args: [attempt.test_id]
    });

    const lockedSectionIds = new Set<string>();
    if (secRows.length > 0) {
      // 1. Check timer expiration
      if (attempt.started_at) {
        const startStr = attempt.started_at.replace(" ", "T") + "Z";
        const startMs = new Date(startStr).getTime();
        let elapsedSecs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        
        for (const sec of secRows as any[]) {
          if (sec.duration_minutes !== null) {
            const durationSecs = sec.duration_minutes * 60;
            if (elapsedSecs >= durationSecs) {
              lockedSectionIds.add(sec.id);
              elapsedSecs -= durationSecs;
            } else {
              break;
            }
          } else {
            break;
          }
        }
      }

      // 2. Check navigation lock progression
      // Fetch the highest section position already answered by the student
      const { rows: progressionRows } = await db.execute({
        sql: `SELECT ts.position 
              FROM attempt_answers aa 
              JOIN test_questions tq ON tq.question_id = aa.question_id 
              JOIN test_sections ts ON ts.id = tq.section_id 
              WHERE aa.attempt_id = ? AND tq.test_id = ?
              ORDER BY ts.position DESC LIMIT 1`,
        args: [targetAttemptId, attempt.test_id]
      });

      if (progressionRows.length > 0) {
        const maxPosition = (progressionRows[0] as any).position;
        // Lock any prior sections that have navigation_locked enabled
        for (const sec of secRows as any[]) {
          if (sec.position < maxPosition && sec.navigation_locked === 1) {
            lockedSectionIds.add(sec.id);
          }
        }
      }
    }

    if (lockedSectionIds.size > 0) {
      // Fetch section_id for the questions being updated
      const questionIds = body.map((row: any) => row.question_id);
      const placeholders = questionIds.map(() => "?").join(",");
      const { rows: tqRows } = await db.execute({
        sql: `SELECT question_id, section_id FROM test_questions WHERE test_id = ? AND question_id IN (${placeholders})`,
        args: [attempt.test_id, ...questionIds]
      });
      const questionSectionMap = new Map(tqRows.map((r: any) => [r.question_id, r.section_id]));

      for (const row of body) {
        const qSectionId = questionSectionMap.get(row.question_id);
        if (qSectionId && lockedSectionIds.has(qSectionId)) {
          return res.status(403).json({ error: "Access denied. Target section is locked or expired." });
        }
      }
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
