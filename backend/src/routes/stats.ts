import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole, getUserClientId } from "../services/roles.js";

/**
 * GET /api/stats?scope=platform  → SuperAdmin dashboard
 * GET /api/stats?scope=client    → ClientAdmin dashboard
 */
export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const user = await requireUser(req, res);
  if (!user) return;

  const db = getDb();
  const { scope } = req.query;

  // ── Platform stats (superadmin only) ────────────────────────────────────────
  if (scope === "platform") {
    const isSuper = await hasRole(user.id, "superadmin");
    if (!isSuper) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [clientsCount, studentsCount, questionsCount, testsCount, attemptsCount, clientDataRows, testsByClientRows] = await Promise.all([
      db.execute("SELECT COUNT(*) as count FROM clients"),
      db.execute("SELECT COUNT(*) as count FROM profiles"),
      db.execute("SELECT COUNT(*) as count FROM questions"),
      db.execute("SELECT COUNT(*) as count FROM tests"),
      db.execute("SELECT COUNT(*) as count FROM attempts"),
      // Students per client (only clients with > 0 students)
      db.execute(`
        SELECT c.name, COUNT(p.id) as students
        FROM profiles p
        JOIN clients c ON p.client_id = c.id
        GROUP BY p.client_id, c.name
      `),
      // Tests per client
      db.execute(`
        SELECT c.name, COUNT(t.id) as value
        FROM tests t
        JOIN clients c ON t.client_id = c.id
        GROUP BY t.client_id, c.name
      `),
    ]);

    const clientData = clientDataRows.rows.map((r: any) => ({
      name: r.name,
      students: r.students,
    }));

    const attemptsByClient = testsByClientRows.rows.map((r: any) => ({
      name: r.name,
      value: r.value,
    }));

    return res.status(200).json({
      totalClients: (clientsCount.rows[0] as any).count,
      totalStudents: (studentsCount.rows[0] as any).count,
      totalQuestions: (questionsCount.rows[0] as any).count,
      totalTests: (testsCount.rows[0] as any).count,
      totalAttempts: (attemptsCount.rows[0] as any).count,
      clientData,
      attemptsByClient,
    });
  }

  // ── Client stats (clientadmin) ───────────────────────────────────────────────
  if (scope === "client") {
    const clientId = await getUserClientId(user.id);
    if (!clientId) return res.status(403).json({ error: "No client" });

    const [students, questions, tests, attemptsMetrics, topRows, testPerfRows] = await Promise.all([
      db.execute({ sql: "SELECT COUNT(*) as count FROM user_roles WHERE client_id = ? AND role = 'student'", args: [clientId] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM questions WHERE client_id = ?", args: [clientId] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM tests WHERE client_id = ?", args: [clientId] }),
      // Overall Metrics
      db.execute({
        sql: `SELECT 
                SUM(COALESCE(a.score, 0)) as total_score,
                SUM(COALESCE(a.total_marks, 0)) as total_max,
                COUNT(*) as count,
                SUM(CASE WHEN a.total_marks > 0 AND (a.score / a.total_marks) >= 0.4 THEN 1 ELSE 0 END) as pass_count
              FROM attempts a
              JOIN tests t ON t.id = a.test_id
              WHERE t.client_id = ? AND a.status = 'submitted'`,
        args: [clientId],
      }),
      // Top 5 Performers
      db.execute({
        sql: `SELECT p.name, MAX(CASE WHEN a.total_marks > 0 THEN (a.score / a.total_marks) * 100 ELSE 0 END) as highest_pct
              FROM attempts a
              JOIN tests t ON t.id = a.test_id
              JOIN profiles p ON p.id = a.student_id
              WHERE t.client_id = ? AND a.status = 'submitted'
              GROUP BY a.student_id, p.name
              ORDER BY highest_pct DESC
              LIMIT 5`,
        args: [clientId],
      }),
      // Test Performance
      db.execute({
        sql: `SELECT t.test_name, AVG(CASE WHEN a.total_marks > 0 THEN (a.score / a.total_marks) * 100 ELSE 0 END) as avg_pct
              FROM attempts a
              JOIN tests t ON t.id = a.test_id
              WHERE t.client_id = ? AND a.status = 'submitted'
              GROUP BY t.id, t.test_name`,
        args: [clientId],
      }),
    ]);

    const metrics = attemptsMetrics.rows[0] as any;
    const totalScore = Number(metrics.total_score) || 0;
    const totalMaxScore = Number(metrics.total_max) || 0;
    const totalAttemptsCount = Number(metrics.count) || 0;
    const passCount = Number(metrics.pass_count) || 0;

    const avgScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    const passRate = totalAttemptsCount > 0 ? (passCount / totalAttemptsCount) * 100 : 0;

    const topPerformers = topRows.rows.map((s: any) => ({
      name: s.name || "Unknown",
      avg: Math.round(s.highest_pct),
    }));

    const testPerformance = testPerfRows.rows.map((t: any) => ({
      name: t.test_name.length > 15 ? t.test_name.slice(0, 15) + "…" : t.test_name,
      avgScore: Math.round(t.avg_pct),
    }));

    return res.status(200).json({
      totalStudents: (students.rows[0] as any).count,
      totalQuestions: (questions.rows[0] as any).count,
      totalTests: (tests.rows[0] as any).count,
      totalAttempts: totalAttemptsCount,
      avgScore: Math.round(avgScore),
      passRate: Math.round(passRate),
      topPerformers,
      testPerformance,
    });
  }

  return res.status(400).json({ error: "scope required: platform | client" });
}
