import type { Request, Response } from "express";
import { getDb } from "./_lib/db.js";
import { requireUser } from "./_lib/auth.js";
import { randomUUID } from "crypto";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  // ── GET /api/attempt-answers?attempt_id= ───────────────────────────────────
  if (req.method === "GET") {
    const { attempt_id } = req.query;
    if (!attempt_id) return res.status(400).json({ error: "attempt_id required" });

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
