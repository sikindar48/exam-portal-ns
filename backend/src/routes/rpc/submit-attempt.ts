import type { Request, Response } from "express";
import { getDb } from "../../db/db.js";
import { requireUser } from "../../auth/auth.js";
import { hasRole, isGuestStudent } from "../../services/roles.js";

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
export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireUser(req, res);
  if (!user) return;

  const { attempt_id, time_taken } = req.body;
  if (!attempt_id) return res.status(400).json({ error: "attempt_id required" });

  const db = getDb();

  // 1. Load the attempt + test config
  const { rows: attemptRows } = await db.execute({
    sql: `SELECT a.*, t.negative_marking, t.negative_marks,
                 t.show_results_after_submission, t.allow_report_download, t.result_status
          FROM attempts a JOIN tests t ON t.id = a.test_id
          WHERE a.id = ?`,
    args: [attempt_id],
  });
  if (!attemptRows.length) return res.status(404).json({ error: "Attempt not found" });
  const attempt = attemptRows[0] as any;

  // Authorization Check
  const isSuper = await hasRole(user.id, "superadmin");
  const isGuest = await isGuestStudent(attempt.student_id);
  if (!isSuper && attempt.student_id !== user.id && !isGuest) {
    return res.status(403).json({ error: "Permission denied" });
  }

  if (isGuest && !isSuper) {
    const headerToken = req.headers["x-attempt-token"] || req.query.attempt_token;
    if (!headerToken || attempt.attempt_token !== headerToken) {
      return res.status(403).json({ error: "Permission denied: Invalid attempt token" });
    }
  }

  // Prevent duplicate submission
  if (attempt.status === "submitted") {
    return res.status(400).json({ error: "Attempt has already been submitted" });
  }

  // 2. Load student's answers
  const { rows: answerRows } = await db.execute({
    sql: "SELECT question_id, selected_option FROM attempt_answers WHERE attempt_id = ?",
    args: [attempt_id],
  });

  // 3. Load correct answers + marks + section mapping for all questions in the test
  const { rows: questionRows } = await db.execute({
    sql: `SELECT q.id, q.correct_answers, q.correct_answer, q.marks, tq.section_id
          FROM questions q
          JOIN test_questions tq ON tq.question_id = q.id
          WHERE tq.test_id = ?`,
    args: [attempt.test_id],
  });

  // Load sections for this test to fetch section-specific negative marks
  const { rows: sectionRows } = await db.execute({
    sql: "SELECT id, negative_marks FROM test_sections WHERE test_id = ?",
    args: [attempt.test_id],
  });
  const sectionPenaltyMap = new Map(sectionRows.map((s: any) => [s.id, s.negative_marks]));

  // 4. Calculate score
  const answerMap = new Map(answerRows.map((r: any) => [r.question_id, r.selected_option]));
  const negativeMarkingEnabled = attempt.negative_marking === 1;
  const negativeMarksPerWrong = attempt.negative_marks ?? 0;

  let score = 0;
  let totalMarks = 0;
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  for (const q of questionRows as any[]) {
    const marks = q.marks ?? 1;
    totalMarks += marks;
    const selected = answerMap.get(q.id);

    if (selected === undefined || selected === null || selected === "") {
      unanswered++;
    } else {
      // Map legacy correct_answer if correct_answers is missing or empty
      let corrects: string[] = [];
      if (q.correct_answers) {
        try {
          corrects = typeof q.correct_answers === "string" ? JSON.parse(q.correct_answers) : q.correct_answers;
        } catch (e) {
          corrects = [];
        }
      }
      if (corrects.length === 0 && q.correct_answer) {
        corrects = [q.correct_answer];
      }

      // Check if chosen answer is correct
      if (corrects.includes(selected)) {
        correct++;
        score += marks;
      } else {
        wrong++;
        if (negativeMarkingEnabled) {
          let penalty = negativeMarksPerWrong;
          if (q.section_id && sectionPenaltyMap.has(q.section_id)) {
            penalty = sectionPenaltyMap.get(q.section_id) ?? negativeMarksPerWrong;
          }
          score -= penalty;
        }
      }
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

  const resultsVisible = attempt.show_results_after_submission === 1 || attempt.result_status === "published";
  const reportDownloadEnabled = attempt.allow_report_download === 1;

  if (!resultsVisible) {
    return res.status(200).json({
      success: true,
      results_visible: false,
      report_download_enabled: false,
      result_status: attempt.result_status || "draft",
    });
  }

  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  return res.status(200).json({
    success: true,
    results_visible: true,
    report_download_enabled: reportDownloadEnabled,
    result_status: "published",
    score,
    total_marks: totalMarks,
    percentage,
    correct,
    wrong,
    skipped: unanswered,
  });
}
