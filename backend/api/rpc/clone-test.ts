import type { Request, Response } from "express";
import { getDb } from "../_lib/db.js";
import { requireUser } from "../_lib/auth.js";
import { randomUUID } from "crypto";

/**
 * POST /api/rpc/clone-test
 * Body: { source_test_id: string }
 * Replaces Supabase RPC `clone_test`
 */
export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireUser(req, res);
  if (!user) return;

  const { source_test_id } = req.body;
  if (!source_test_id) return res.status(400).json({ error: "source_test_id required" });

  const db = getDb();

  // 1. Load source test
  const { rows: testRows } = await db.execute({
    sql: "SELECT * FROM tests WHERE id = ?",
    args: [source_test_id],
  });
  if (!testRows.length) return res.status(404).json({ error: "Source test not found" });
  const src = testRows[0] as any;

  // 2. Create new test with a fresh share_code
  const newTestId = randomUUID();
  const newShareCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  await db.execute({
    sql: `INSERT INTO tests
          (id, client_id, folder_id, test_name, timer, shuffle, allow_review,
           negative_marking, negative_marks, restrict_navigation, attempts_allowed,
           status, active, allow_guests, scheduled_start, scheduled_end,
           share_code, public_link_enabled)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      newTestId, src.client_id, src.folder_id,
      `${src.test_name} (Copy)`,
      src.timer, src.shuffle, src.allow_review,
      src.negative_marking, src.negative_marks,
      src.restrict_navigation, src.attempts_allowed,
      "draft", src.active, src.allow_guests,
      null, null, // clear schedule on clone
      newShareCode, 0,
    ],
  });

  // 3. Clone test_questions
  const { rows: tqRows } = await db.execute({
    sql: "SELECT * FROM test_questions WHERE test_id = ?",
    args: [source_test_id],
  });

  if (tqRows.length > 0) {
    const stmts = tqRows.map((tq: any) => ({
      sql: `INSERT INTO test_questions (id, test_id, question_id, section_id, position)
            VALUES (?,?,?,?,?)`,
      args: [randomUUID(), newTestId, tq.question_id, tq.section_id ?? null, tq.position ?? null],
    }));
    await db.batch(stmts, "write");
  }

  return res.status(200).json({ new_test_id: newTestId });
}
