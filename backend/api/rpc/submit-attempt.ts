import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/db";
import { requireUser } from "../_lib/auth";

/**
 * POST /api/rpc/submit-attempt
 * Body: { attempt_id: string, time_taken: number }
 *
 * Replaces the Supabase RPC `submit_test_attempt`:
 * - Loads all attempt_answers for the attempt
 * - Loads correct answers from questions
 * - Applies negative marking if enabled
 * - Updates attempt: status=submitted, score, total_marks, time_taken
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireUser(req, res);
  if (!user) return;

  const { attempt_id, time_taken } = req.body;
  if (!attempt_id) return res.status(400).json({ error: "attempt_id required" });

  const db = getDb();

  // 1. Load the attempt + test config
  const { rows: attemptRows } = await db.execute({
    sql: `SELECT a.*, t.negative_marking, t.negative_marks
          FROM attempts a JOIN tests t ON t.id = a.test_id
          WHERE a.id = ?`,
    args: [attempt_id],
  });
  if (!attemptRows.length) return res.status(404).json({ error: "Attempt not found" });
  const attempt = attemptRows[0] as any;

  // 2. Load student's answers
  const { rows: answerRows } = await db.execute({
    sql: "SELECT question_id, selected_option FROM attempt_answers WHERE attempt_id = ?",
    args: [attempt_id],
  });

  // 3. Load correct answers + marks for all questions in the test
  const { rows: questionRows } = await db.execute({
    sql: `SELECT q.id, q.correct_answer, q.marks
          FROM questions q
          JOIN test_questions tq ON tq.question_id = q.id
          WHERE tq.test_id = ?`,
    args: [attempt.test_id],
  });

  // 4. Calculate score
  const answerMap = new Map(answerRows.map((r: any) => [r.question_id, r.selected_option]));
  const negativeMarkingEnabled = attempt.negative_marking === 1;
  const negativeMarksPerWrong = attempt.negative_marks ?? 0;

  let score = 0;
  let totalMarks = 0;

  for (const q of questionRows as any[]) {
    totalMarks += q.marks ?? 1;
    const selected = answerMap.get(q.id);
    if (selected && selected === q.correct_answer) {
      score += q.marks ?? 1;
    } else if (selected && negativeMarkingEnabled) {
      score -= negativeMarksPerWrong;
    }
  }

  score = Math.max(0, score);

  // 5. Update attempt
  await db.execute({
    sql: `UPDATE attempts
          SET status = 'submitted', score = ?, total_marks = ?,
              time_taken = ?, submitted_at = datetime('now')
          WHERE id = ?`,
    args: [score, totalMarks, time_taken ?? 0, attempt_id],
  });

  return res.status(200).json({ score, total_marks: totalMarks, time_taken });
}
