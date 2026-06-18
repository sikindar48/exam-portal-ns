import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { getUserClientId, hasRole } from "../services/roles.js";
import { randomUUID } from "crypto";
import { attemptCreateSchema } from "../validation/schemas.js";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  const isSuper = await hasRole(user.id, "superadmin");
  const isClientAdmin = await hasRole(user.id, "clientadmin");

  // ── GET /api/attempts ───────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { test_id, student_id, status, id, count_only, with_test_name, page, limit } = req.query;

    // Fetch single attempt by id
    if (id) {
      const { rows } = await db.execute({
        sql: `SELECT a.*, t.test_name, t.timer, t.allow_review, t.negative_marking, t.negative_marks, t.client_id as test_client_id
              FROM attempts a JOIN tests t ON t.id = a.test_id
              WHERE a.id = ?`,
        args: [id as string],
      });
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const row = rows[0] as any;

      // Authorization Check
      if (!isSuper) {
        if (isClientAdmin) {
          const callerClientId = await getUserClientId(user.id);
          if (row.test_client_id !== callerClientId) {
            return res.status(403).json({ error: "Permission denied" });
          }
        } else {
          // Student / Guest
          if (row.student_id !== user.id) {
            // Check if it's a guest session (guestId session matches sessionStorage)
            const isGuestProfile = row.student_id.startsWith("guest_") || (row.email && row.email.endsWith("@temp.exam"));
            // For security, if they are authenticated as the anonymous user, they are allowed if they created it
            // Let's compare target profile ID to see if the session is allowed.
            // A simple and secure check: the student_id of the attempt must match the user's ID
            if (row.student_id !== user.id) {
              return res.status(403).json({ error: "Permission denied" });
            }
          }
        }
      }

      return res.status(200).json({ ...row, tests: { test_name: row.test_name, timer: row.timer, allow_review: row.allow_review === 1, negative_marking: row.negative_marking === 1, negative_marks: row.negative_marks } });
    }

    // Count completed attempts (for attempt number display)
    if (count_only === "true" && test_id && student_id) {
      // Security check: student can only check their own attempts
      if (!isSuper && !isClientAdmin && student_id !== user.id) {
        return res.status(403).json({ error: "Permission denied" });
      }
      const { rows } = await db.execute({
        sql: "SELECT COUNT(*) as count FROM attempts WHERE test_id = ? AND student_id = ? AND status = 'submitted'",
        args: [test_id as string, student_id as string],
      });
      return res.status(200).json({ count: (rows[0] as any).count });
    }

    // Admin: results for a test
    if (test_id && !student_id) {
      if (!isSuper && !isClientAdmin) {
        return res.status(403).json({ error: "Permission denied" });
      }
      
      const { rows: testRows } = await db.execute({
        sql: "SELECT client_id FROM tests WHERE id = ?",
        args: [test_id as string],
      });
      if (!testRows.length) return res.status(404).json({ error: "Test not found" });
      
      if (isClientAdmin && !isSuper) {
        const callerClientId = await getUserClientId(user.id);
        if (testRows[0].client_id !== callerClientId) {
          return res.status(403).json({ error: "Permission denied" });
        }
      }

      const isPaginationRequested = page !== undefined && limit !== undefined;
      const countSql = "SELECT COUNT(*) as total FROM attempts WHERE test_id = ? AND status = 'submitted'";
      const { rows: countRows } = await db.execute({ sql: countSql, args: [test_id as string] });
      const total = (countRows[0] as any).total;

      let dataSql = `SELECT a.*,
                (SELECT COUNT(*) FROM attempt_answers aa WHERE aa.attempt_id = a.id) as answer_count
              FROM attempts a
              WHERE a.test_id = ? AND a.status = 'submitted'
              ORDER BY a.submitted_at DESC`;
      const args: any[] = [test_id as string];

      if (isPaginationRequested) {
        const pNum = Math.max(1, parseInt(page as string, 10));
        const lNum = Math.max(1, parseInt(limit as string, 10));
        const offset = (pNum - 1) * lNum;
        dataSql += " LIMIT ? OFFSET ?";
        args.push(lNum, offset);
      }

      const { rows } = await db.execute({ sql: dataSql, args });

      let result: any[] = [];
      // Fetch profile data for all student_ids
      if (rows.length > 0) {
        const studentIds = [...new Set(rows.map((r: any) => r.student_id))];
        const placeholders = studentIds.map(() => "?").join(",");
        const { rows: profiles } = await db.execute({
          sql: `SELECT id, name, email FROM profiles WHERE id IN (${placeholders})`,
          args: studentIds,
        });
        const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
        result = rows.map((r: any) => ({
          ...r,
          attempt_answers: [{ count: r.answer_count }],
          profiles: profileMap.get(r.student_id) ?? null,
        }));
      }

      if (isPaginationRequested) {
        return res.status(200).json({
          data: result,
          pagination: {
            page: Math.max(1, parseInt(page as string, 10)),
            limit: Math.max(1, parseInt(limit as string, 10)),
            total,
          },
        });
      }
      return res.status(200).json(result);
    }

    // Student: own history
    const resolvedStudentId = (student_id as string) || user.id;
    if (!isSuper && !isClientAdmin && resolvedStudentId !== user.id) {
      return res.status(403).json({ error: "Permission denied" });
    }
    if (isClientAdmin && !isSuper) {
      const callerClientId = await getUserClientId(user.id);
      const targetClientId = await getUserClientId(resolvedStudentId);
      if (callerClientId !== targetClientId) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    const isPaginationRequested = page !== undefined && limit !== undefined;
    let countSql = `SELECT COUNT(*) as total FROM attempts a WHERE a.student_id = ?`;
    const countArgs: any[] = [resolvedStudentId];
    if (status) { countSql += " AND a.status = ?"; countArgs.push(status); }
    if (test_id) { countSql += " AND a.test_id = ?"; countArgs.push(test_id); }

    const { rows: countRows } = await db.execute({ sql: countSql, args: countArgs });
    const total = (countRows[0] as any).total;

    let sql = `SELECT a.*, t.test_name, t.timer, t.allow_review
               FROM attempts a JOIN tests t ON t.id = a.test_id
               WHERE a.student_id = ?`;
    const args: any[] = [resolvedStudentId];

    if (status) { sql += " AND a.status = ?"; args.push(status); }
    if (test_id) { sql += " AND a.test_id = ?"; args.push(test_id); }

    sql += " ORDER BY a.submitted_at DESC";

    if (isPaginationRequested) {
      const pNum = Math.max(1, parseInt(page as string, 10));
      const lNum = Math.max(1, parseInt(limit as string, 10));
      const offset = (pNum - 1) * lNum;
      sql += " LIMIT ? OFFSET ?";
      args.push(lNum, offset);
    }

    const { rows } = await db.execute({ sql, args });
    const formattedData = rows.map((r: any) => ({
      ...r,
      tests: { test_name: r.test_name, timer: r.timer, allow_review: r.allow_review === 1 },
    }));

    if (isPaginationRequested) {
      return res.status(200).json({
        data: formattedData,
        pagination: {
          page: Math.max(1, parseInt(page as string, 10)),
          limit: Math.max(1, parseInt(limit as string, 10)),
          total,
        },
      });
    }
    return res.status(200).json(formattedData);
  }

  // ── POST /api/attempts (create or resume attempt) ───────────────────────────
  if (req.method === "POST") {
    const validation = attemptCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }
    const { student_id, test_id, status = "in_progress" } = validation.data;
    const resolvedStudentId = student_id || user.id;

    if (!isSuper && !isClientAdmin && resolvedStudentId !== user.id) {
      return res.status(403).json({ error: "Permission denied" });
    }

    // Prevent duplicate in_progress attempts: check if one already exists
    const { rows: existing } = await db.execute({
      sql: "SELECT * FROM attempts WHERE student_id = ? AND test_id = ? AND status = 'in_progress'",
      args: [resolvedStudentId, test_id],
    });

    if (existing.length > 0) {
      // Return existing attempt to resume seamlessly
      return res.status(200).json(existing[0]);
    }

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
