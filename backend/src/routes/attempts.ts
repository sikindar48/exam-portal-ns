import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { getUserClientId, hasRole, isGuestStudent } from "../services/roles.js";
import { randomUUID } from "crypto";
import { attemptCreateSchema } from "../validation/schemas.js";
import { validateCandidateCapacity } from "../services/billing.js";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  const isSuper = await hasRole(user.id, "superadmin");
  const isClientAdmin = await hasRole(user.id, "clientadmin");
  const isAdmin = isSuper || isClientAdmin;

  // ── GET /api/attempts ───────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { test_id, student_id, status, id, count_only, with_test_name, page, limit } = req.query;

    // Fetch single attempt by id
    if (id) {
      const { rows } = await db.execute({
        sql: `SELECT a.*, t.test_name, t.timer, t.allow_review, t.negative_marking, t.negative_marks,
                     t.show_results_after_submission, t.allow_report_download, t.result_status,
                     t.client_id as test_client_id
              FROM attempts a JOIN tests t ON t.id = a.test_id
              WHERE a.id = ?`,
        args: [id as string],
      });
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      const row = rows[0] as any;

      const isClientAdmin = await hasRole(user.id, "clientadmin");
      const isAdmin = isSuper || isClientAdmin;

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
            return res.status(403).json({ error: "Permission denied" });
          }
          const isGuest = await isGuestStudent(row.student_id);
          if (isGuest) {
            const headerToken = req.headers["x-attempt-token"] || req.query.attempt_token;
            if (!headerToken || row.attempt_token !== headerToken) {
              return res.status(403).json({ error: "Permission denied: Invalid attempt token" });
            }
          }
        }
      }

      // Hide results if not published
      const resultsVisible = row.show_results_after_submission === 1 || row.result_status === "published";
      if (!isAdmin && !resultsVisible) {
        row.score = null;
        row.total_marks = null;
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

    // Admin: list all recent attempts for their client organization
    if (isAdmin && !test_id && !student_id) {
      const callerClientId = await getUserClientId(user.id);
      const isPaginationRequested = page !== undefined && limit !== undefined;
      
      let countSql = `SELECT COUNT(*) as total 
                      FROM attempts a 
                      JOIN tests t ON t.id = a.test_id 
                      WHERE 1=1`;
      const countArgs: any[] = [];
      
      if (!isSuper) {
        countSql += " AND t.client_id = ?";
        countArgs.push(callerClientId);
      }
      
      const { rows: countRows } = await db.execute({ sql: countSql, args: countArgs });
      const total = (countRows[0] as any).total;

      let dataSql = `SELECT a.*, t.test_name, t.client_id as test_client_id
                     FROM attempts a
                     JOIN tests t ON t.id = a.test_id
                     WHERE 1=1`;
      const args: any[] = [];
      
      if (!isSuper) {
        dataSql += " AND t.client_id = ?";
        args.push(callerClientId);
      }
      
      dataSql += " ORDER BY a.started_at DESC";
      
      if (isPaginationRequested) {
        const pNum = Math.max(1, parseInt(page as string, 10));
        const lNum = Math.max(1, parseInt(limit as string, 10));
        const offset = (pNum - 1) * lNum;
        dataSql += " LIMIT ? OFFSET ?";
        args.push(lNum, offset);
      }
      
      const { rows } = await db.execute({ sql: dataSql, args });
      
      let result: any[] = [];
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
          tests: { test_name: r.test_name },
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
      const isGuest = await isGuestStudent(resolvedStudentId);
      if (!isGuest) {
        return res.status(403).json({ error: "Permission denied" });
      }
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

    let sql = `SELECT a.*, t.test_name, t.timer, t.allow_review,
                      t.show_results_after_submission, t.allow_report_download, t.result_status
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
    const formattedData = rows.map((r: any) => {
      const resultsVisible = r.show_results_after_submission === 1 || r.result_status === "published";
      return {
        ...r,
        score: (isAdmin || resultsVisible) ? r.score : null,
        total_marks: (isAdmin || resultsVisible) ? r.total_marks : null,
        tests: { test_name: r.test_name, timer: r.timer, allow_review: r.allow_review === 1 },
      };
    });

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
    // 1. Check Maintenance Mode
    const { rows: maintRows } = await db.execute("SELECT value FROM global_settings WHERE key = 'maintenance_mode'");
    const maintenanceMode = maintRows.length > 0 && maintRows[0].value === "true";
    if (maintenanceMode) {
      return res.status(503).json({ error: "Platform is under maintenance. Please try again later." });
    }

    const validation = attemptCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }
    const { student_id, test_id, status = "in_progress" } = validation.data;
    const resolvedStudentId = student_id || user.id;

    const isGuest = await isGuestStudent(resolvedStudentId);

    if (!isSuper && !isClientAdmin && resolvedStudentId !== user.id && !isGuest) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const ipAddress = req.ip || "";

    // Fetch test details
    const { rows: testDetails } = await db.execute({
      sql: "SELECT client_id, active, status, allow_guests, public_link_enabled, scheduled_start, scheduled_end, attempts_allowed FROM tests WHERE id = ?",
      args: [test_id],
    });
    if (testDetails.length === 0) {
      return res.status(404).json({ error: "Test not found" });
    }
    const test = testDetails[0] as any;
    const testClientId = test.client_id;

    // Validate active/published state for student/guest creation
    if (!isSuper && !isClientAdmin) {
      if (test.active !== 1 || test.status !== "published") {
        return res.status(403).json({ error: "This test is currently not available." });
      }

      // Validate Guest / Public Link constraints
      if (isGuest) {
        if (test.allow_guests !== 1 || test.public_link_enabled !== 1) {
          return res.status(403).json({ error: "Guest attempts are not allowed for this test." });
        }
      }

      // Validate Scheduled Windows
      const now = new Date();
      if (test.scheduled_start) {
        const start = new Date(test.scheduled_start);
        if (now < start) {
          return res.status(403).json({ error: "Exam window has not started yet." });
        }
      }
      if (test.scheduled_end) {
        const end = new Date(test.scheduled_end);
        if (now > end) {
          return res.status(403).json({ error: "Exam window has expired." });
        }
      }
    }

    // 2. Verify client active status
    const { rows: clientStatus } = await db.execute({
      sql: "SELECT active_status FROM clients WHERE id = ?",
      args: [testClientId],
    });
    if (clientStatus.length > 0 && clientStatus[0].active_status === 0) {
      return res.status(403).json({ error: "Access Denied: The hosting organization has been suspended." });
    }

    // Verify subscription status
    const { rows: subStatus } = await db.execute({
      sql: "SELECT status FROM client_subscriptions WHERE client_id = ?",
      args: [testClientId],
    });
    if (subStatus.length > 0) {
      const status = subStatus[0].status;
      if (status === "suspended") {
        return res.status(403).json({ error: "Access Denied: The hosting organization subscription has been suspended." });
      }
    }

    // Guest resumption is managed securely via student_id checks.
    // IP address matching is removed to prevent concurrent VUs/users on the same public network from sharing attempts.

    // Prevent duplicate in_progress attempts: check if one already exists
    const { rows: existing } = await db.execute({
      sql: "SELECT * FROM attempts WHERE student_id = ? AND test_id = ? AND status = 'in_progress'",
      args: [resolvedStudentId, test_id],
    });

    if (existing.length > 0) {
      // Return existing attempt to resume seamlessly
      return res.status(200).json(existing[0]);
    }

    // Validate attempts limits
    if (!isSuper && !isClientAdmin && test.attempts_allowed > 0) {
      const { rows: countRows } = await db.execute({
        sql: "SELECT COUNT(*) as count FROM attempts WHERE student_id = ? AND test_id = ?",
        args: [resolvedStudentId, test_id]
      });
      const userAttempts = Number((countRows[0] as any).count || 0);
      if (userAttempts >= test.attempts_allowed) {
        return res.status(403).json({ error: "Maximum attempts allowed for this test has been reached." });
      }
    }

    // Check candidate capacity / Pay Per Test limits
    const isAllowed = await validateCandidateCapacity(test_id);
    if (!isAllowed) {
      return res.status(403).json({ error: "Capacity Reached: The candidate capacity for this test has been reached or the test is marked completed." });
    }


    const id = randomUUID();
    const attempt_token = randomUUID();
    await db.execute({
      sql: `INSERT INTO attempts (id, student_id, test_id, status, started_at, submitted_at, ip_address, attempt_token)
            VALUES (?,?,?,?,datetime('now'),NULL,?,?)`,
      args: [id, resolvedStudentId, test_id, status, ipAddress, attempt_token],
    });

    // 4. Increment attempts usage
    const { incrementClientUsage } = await import("../services/limits.js");
    await incrementClientUsage(testClientId, "attempts_created");

    const { rows } = await db.execute({ sql: "SELECT * FROM attempts WHERE id = ?", args: [id] });
    return res.status(201).json(rows[0]);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
