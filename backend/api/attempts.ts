import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_lib/db";
import { requireUser } from "./_lib/auth";
import { getUserClientId, hasRole } from "./_lib/roles";
import { randomUUID } from "crypto";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  // ── GET /api/attempts ───────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { test_id, student_id, status, id, count_only, with_test_name } = req.query;

    // Fetch single attempt by id
    if (id) {
      const { rows } = await db.execute({
        sql: `SELECT a.*, t.test_name, t.timer, t.allow_review, t.negative_marking, t.negative_marks
              FROM attempts a JOIN tests t ON t.id = a.test_id
              WHERE a.id = ?`,
        args: [id as string],
      });
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const row = rows[0] as any;
      return res.status(200).json({ ...row, tests: { test_name: row.test_name, timer: row.timer, allow_review: row.allow_review === 1, negative_marking: row.negative_marking === 1, negative_marks: row.negative_marks } });
    }

    // Count completed attempts (for attempt number display)
    if (count_only === "true" && test_id && student_id) {
      const { rows } = await db.execute({
        sql: "SELECT COUNT(*) as count FROM attempts WHERE test_id = ? AND student_id = ? AND status = 'submitted'",
        args: [test_id as string, student_id as string],
      });
      return res.status(200).json({ count: (rows[0] as any).count });
    }

    // Admin: results for a test
    if (test_id && !student_id) {
      const { rows } = await db.execute({
        sql: `SELECT a.*,
                (SELECT COUNT(*) FROM attempt_answers aa WHERE aa.attempt_id = a.id) as answer_count
              FROM attempts a
              WHERE a.test_id = ? AND a.status = 'submitted'
              ORDER BY a.submitted_at DESC`,
        args: [test_id as string],
      });

      // Fetch profile data for all student_ids
      if (rows.length > 0) {
        const studentIds = [...new Set(rows.map((r: any) => r.student_id))];
        const placeholders = studentIds.map(() => "?").join(",");
        const { rows: profiles } = await db.execute({
          sql: `SELECT id, name, email FROM profiles WHERE id IN (${placeholders})`,
          args: studentIds,
        });
        const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
        const result = rows.map((r: any) => ({
          ...r,
          attempt_answers: [{ count: r.answer_count }],
          profiles: profileMap.get(r.student_id) ?? null,
        }));
        return res.status(200).json(result);
      }
      return res.status(200).json([]);
    }

    // Student: own history
    const resolvedStudentId = (student_id as string) || user.id;
    let sql = `SELECT a.*, t.test_name, t.timer, t.allow_review
               FROM attempts a JOIN tests t ON t.id = a.test_id
               WHERE a.student_id = ?`;
    const args: any[] = [resolvedStudentId];

    if (status) { sql += " AND a.status = ?"; args.push(status); }
    if (test_id) { sql += " AND a.test_id = ?"; args.push(test_id); }

    sql += " ORDER BY a.submitted_at DESC";

    const { rows } = await db.execute({ sql, args });
    return res.status(200).json(rows.map((r: any) => ({
      ...r,
      tests: { test_name: r.test_name, timer: r.timer, allow_review: r.allow_review === 1 },
    })));
  }

  // ── POST /api/attempts (create new attempt) ─────────────────────────────────
  if (req.method === "POST") {
    const { student_id, test_id, status = "in_progress" } = req.body;
    const resolvedStudentId = student_id || user.id;

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO attempts (id, student_id, test_id, status, submitted_at)
            VALUES (?,?,?,?,datetime('now'))`,
      args: [id, resolvedStudentId, test_id, status],
    });
    const { rows } = await db.execute({ sql: "SELECT * FROM attempts WHERE id = ?", args: [id] });
    return res.status(201).json(rows[0]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
