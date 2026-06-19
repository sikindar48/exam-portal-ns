import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole, isGuestStudent } from "../services/roles.js";
import XLSX from "xlsx";

export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const { attemptId } = req.params;
  const token = req.query.token as string;

  if (!attemptId) {
    return res.status(400).json({ error: "Attempt ID required" });
  }

  const db = getDb();

  // 1. Fetch attempt and test configuration details
  const { rows: attemptRows } = await db.execute({
    sql: `SELECT a.*, t.test_name, t.negative_marking, t.negative_marks,
                 t.show_results_after_submission, t.allow_report_download, t.result_status,
                 t.client_id as test_client_id
          FROM attempts a JOIN tests t ON t.id = a.test_id
          WHERE a.id = ?`,
    args: [attemptId],
  });

  if (!attemptRows.length) {
    return res.status(404).json({ error: "Attempt not found" });
  }
  const attempt = attemptRows[0] as any;

  // 2. Validate Authorization
  const isSuper = await hasRole(user.id, "superadmin");
  const isClientAdmin = await hasRole(user.id, "clientadmin");
  const isAdmin = isSuper || isClientAdmin;

  let isOwner = false;
  if (attempt.student_id === user.id) {
    isOwner = true;
  } else if (token && attempt.attempt_token === token) {
    isOwner = true;
  }

  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: "Access denied" });
  }

  // 3. Validate Report Visibility settings for Student/Guest
  if (!isAdmin) {
    const resultsVisible = attempt.show_results_after_submission === 1 && attempt.result_status === "published";
    const reportDownloadEnabled = attempt.allow_report_download === 1;
    if (!resultsVisible || !reportDownloadEnabled) {
      return res.status(403).json({ error: "Report download is not enabled for this test." });
    }
  }

  // 4. Fetch Candidate Profile details
  const { rows: profileRows } = await db.execute({
    sql: "SELECT name, email FROM profiles WHERE id = ?",
    args: [attempt.student_id],
  });
  const profile = profileRows[0] as any;

  // 5. Fetch all questions in the test
  const { rows: questionRows } = await db.execute({
    sql: `SELECT q.*
          FROM questions q
          JOIN test_questions tq ON tq.question_id = q.id
          WHERE tq.test_id = ?`,
    args: [attempt.test_id],
  });

  // 6. Fetch answers
  const { rows: answerRows } = await db.execute({
    sql: "SELECT question_id, selected_option FROM attempt_answers WHERE attempt_id = ?",
    args: [attemptId],
  });

  const answerMap = new Map(answerRows.map((r: any) => [r.question_id, r.selected_option]));

  // 7. Calculate detailed performance stats
  const totalQuestions = questionRows.length;
  let attempted = 0;
  let correct = 0;
  let wrong = 0;

  const negativeMarkingEnabled = attempt.negative_marking === 1;
  const negativeMarksPerWrong = attempt.negative_marks ?? 0;

  const detailedRows: any[] = [];

  questionRows.forEach((q: any, index: number) => {
    const selected = answerMap.get(q.id);
    const isAttempted = selected !== undefined && selected !== null && selected !== "";

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

    let status = "Skipped";
    let marksAwarded = 0;

    if (isAttempted) {
      attempted++;
      if (corrects.includes(selected)) {
        correct++;
        status = "Correct";
        marksAwarded = q.marks ?? 1;
      } else {
        wrong++;
        status = "Wrong";
        marksAwarded = negativeMarkingEnabled ? -negativeMarksPerWrong : 0;
      }
    }

    let opts: string[] = [];
    if (q.options) {
      try {
        opts = typeof q.options === "string" ? JSON.parse(q.options) : q.options;
      } catch (e) {
        opts = [];
      }
    }
    if (opts.length === 0) {
      opts = [q.option_a || "", q.option_b || "", q.option_c || "", q.option_d || ""];
    }

    detailedRows.push([
      index + 1,
      q.question_text,
      opts[0] || "",
      opts[1] || "",
      opts[2] || "",
      opts[3] || "",
      selected || "",
      corrects.join(", "),
      status,
      marksAwarded >= 0 ? `+${marksAwarded}` : `${marksAwarded}`,
      negativeMarkingEnabled ? negativeMarksPerWrong : 0,
      q.explanation || "",
    ]);
  });

  const skipped = totalQuestions - attempted;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const percentage = attempt.total_marks > 0 ? Math.round((attempt.score / attempt.total_marks) * 100) : 0;

  // 8. Create Sheets
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary Data
  const summaryData = [
    ["Field", "Value"],
    ["Candidate Name", profile?.name || "Guest"],
    ["Email", profile?.email || "N/A"],
    ["Attempt ID", attempt.id],
    ["Test Name", attempt.test_name],
    ["Submission Time", attempt.submitted_at],
    ["Generated Time", new Date().toISOString().replace("T", " ").substring(0, 19)],
    ["Total Questions", totalQuestions],
    ["Attempted", attempted],
    ["Skipped", skipped],
    ["Correct", correct],
    ["Wrong", wrong],
    ["Score", `${attempt.score} / ${attempt.total_marks}`],
    ["Percentage", `${percentage}%`],
    ["Accuracy %", `${accuracy}%`],
    ["Time Taken", `${Math.round((attempt.time_taken || 0) / 60)} Minutes`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // Sheet 2: Detailed Questions
  const detailedHeader = [
    "Q No", "Question", "Option A", "Option B", "Option C", "Option D",
    "Chosen Answer", "Correct Answer", "Status", "Marks Awarded", "Negative Marks", "Explanation"
  ];
  const wsDetailed = XLSX.utils.aoa_to_sheet([detailedHeader, ...detailedRows]);
  XLSX.utils.book_append_sheet(wb, wsDetailed, "Detailed Questions");

  // Sheet 3: Analytics Data
  const analyticsData = [
    ["Metric", "Value"],
    ["Total Questions", totalQuestions],
    ["Attempted", attempted],
    ["Skipped", skipped],
    ["Correct", correct],
    ["Wrong", wrong],
    ["Accuracy %", `${accuracy}%`],
    ["Score", attempt.score],
    ["Percentage", `${percentage}%`],
    ["Time Taken", `${Math.round((attempt.time_taken || 0) / 60)} Minutes`],
    ["Average Time Per Question", attempted > 0 ? `${Math.round(attempt.time_taken / attempted)} Seconds` : "0 Seconds"],
  ];
  const wsAnalytics = XLSX.utils.aoa_to_sheet(analyticsData);
  XLSX.utils.book_append_sheet(wb, wsAnalytics, "Analytics");

  // 9. Generate and write the output buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Disposition", `attachment; filename="Performance_Report_${attemptId}.xlsx"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  return res.send(buf);
}
