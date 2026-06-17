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

  // ── Platform stats (superadmin) ─────────────────────────────────────────────
  if (scope === "platform") {
    const [clients, profiles, questions, tests, attempts] = await Promise.all([
      db.execute("SELECT id, name FROM clients"),
      db.execute("SELECT id, client_id FROM profiles"),
      db.execute("SELECT COUNT(*) as count FROM questions"),
      db.execute("SELECT id, client_id FROM tests"),
      db.execute("SELECT id FROM attempts"),
    ]);

    // Students per client
    const clientMap = new Map((clients.rows as any[]).map((c) => [c.id, c.name]));
    const studentCountMap = new Map<string, number>();
    (profiles.rows as any[]).forEach((p) => {
      if (p.client_id) studentCountMap.set(p.client_id, (studentCountMap.get(p.client_id) || 0) + 1);
    });
    const clientData = Array.from(studentCountMap.entries()).map(([id, count]) => ({
      name: clientMap.get(id) || "Unknown",
      students: count,
    }));

    // Tests per client
    const testCountMap = new Map<string, number>();
    (tests.rows as any[]).forEach((t) => {
      if (t.client_id) testCountMap.set(t.client_id, (testCountMap.get(t.client_id) || 0) + 1);
    });
    const attemptsByClient = Array.from(testCountMap.entries()).map(([id, count]) => ({
      name: clientMap.get(id) || "Unknown",
      value: count,
    }));

    return res.status(200).json({
      totalClients: clients.rows.length,
      totalStudents: profiles.rows.length,
      totalQuestions: (questions.rows[0] as any).count,
      totalTests: tests.rows.length,
      totalAttempts: attempts.rows.length,
      clientData,
      attemptsByClient,
    });
  }

  // ── Client stats (clientadmin) ───────────────────────────────────────────────
  if (scope === "client") {
    const clientId = await getUserClientId(user.id);
    if (!clientId) return res.status(403).json({ error: "No client" });

    const [students, questions, tests, attempts] = await Promise.all([
      db.execute({ sql: "SELECT COUNT(*) as count FROM user_roles WHERE client_id = ? AND role = 'student'", args: [clientId] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM questions WHERE client_id = ?", args: [clientId] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM tests WHERE client_id = ?", args: [clientId] }),
      db.execute({
        sql: `SELECT a.id, a.student_id, a.score, a.total_marks, a.test_id,
                     t.test_name, p.name as student_name
              FROM attempts a
              JOIN tests t ON t.id = a.test_id
              LEFT JOIN profiles p ON p.id = a.student_id
              WHERE t.client_id = ? AND a.status = 'submitted'`,
        args: [clientId],
      }),
    ]);

    const clientAttempts = attempts.rows as any[];
    let totalScore = 0, totalMaxScore = 0, passCount = 0;
    clientAttempts.forEach((a) => {
      totalScore += Number(a.score) || 0;
      totalMaxScore += Number(a.total_marks) || 0;
      if (a.total_marks && a.score && Number(a.score) / Number(a.total_marks) >= 0.4) passCount++;
    });

    const avgScore = clientAttempts.length > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    const passRate = clientAttempts.length > 0 ? (passCount / clientAttempts.length) * 100 : 0;

    // Top performers
    const studentScores = new Map<string, { name: string; highestScore: number }>();
    clientAttempts.forEach((a) => {
      const existing = studentScores.get(a.student_id) || { name: a.student_name || "Unknown", highestScore: 0 };
      const pct = a.total_marks ? (Number(a.score || 0) / Number(a.total_marks)) * 100 : 0;
      if (pct > existing.highestScore) existing.highestScore = pct;
      studentScores.set(a.student_id, existing);
    });
    const topPerformers = Array.from(studentScores.values())
      .map((s) => ({ name: s.name, avg: Math.round(s.highestScore) }))
      .sort((a, b) => b.avg - a.avg).slice(0, 5);

    // Test performance
    const testScores = new Map<string, { name: string; totalPct: number; count: number }>();
    clientAttempts.forEach((a) => {
      const existing = testScores.get(a.test_id) || { name: a.test_name || "Test", totalPct: 0, count: 0 };
      existing.totalPct += a.total_marks ? (Number(a.score || 0) / Number(a.total_marks)) * 100 : 0;
      existing.count++;
      testScores.set(a.test_id, existing);
    });
    const testPerformance = Array.from(testScores.values()).map((t) => ({
      name: t.name.length > 15 ? t.name.slice(0, 15) + "…" : t.name,
      avgScore: Math.round(t.totalPct / t.count),
    }));

    return res.status(200).json({
      totalStudents: (students.rows[0] as any).count,
      totalQuestions: (questions.rows[0] as any).count,
      totalTests: (tests.rows[0] as any).count,
      totalAttempts: clientAttempts.length,
      avgScore: Math.round(avgScore),
      passRate: Math.round(passRate),
      topPerformers,
      testPerformance,
    });
  }

  return res.status(400).json({ error: "scope required: platform | client" });
}
