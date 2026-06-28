import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole, isGuestStudent } from "../services/roles.js";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  // ── POST /api/attempts/feedback (submit feedback) ──────────────────────────
  if (req.method === "POST") {
    const {
      attempt_id,
      fast_smooth,
      easy_to_use,
      strong_security,
      faced_errors,
      good_design,
      feedback_text,
    } = req.body;

    if (!attempt_id) {
      return res.status(400).json({ error: "attempt_id is required" });
    }

    // Validate ratings
    const ratings = [fast_smooth, easy_to_use, strong_security, faced_errors, good_design];
    for (const rating of ratings) {
      if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return res.status(400).json({ error: "Ratings must be integers between 1 and 5" });
      }
    }

    try {
      // 1. Fetch attempt
      const { rows } = await db.execute({
        sql: "SELECT * FROM attempts WHERE id = ?",
        args: [attempt_id],
      });

      if (!rows.length) {
        return res.status(404).json({ error: "Attempt not found" });
      }

      const attempt = rows[0] as any;

      // 2. Authorization Check (matching attempt owner)
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

      // 3. Update feedback columns
      await db.execute({
        sql: `UPDATE attempts
              SET feedback_fast_smooth = ?,
                  feedback_easy_to_use = ?,
                  feedback_strong_security = ?,
                  feedback_faced_errors = ?,
                  feedback_good_design = ?,
                  feedback_text = ?
              WHERE id = ?`,
        args: [
          fast_smooth,
          easy_to_use,
          strong_security,
          faced_errors,
          good_design,
          feedback_text || null,
          attempt_id,
        ],
      });

      return res.status(200).json({ success: true, message: "Feedback submitted successfully." });
    } catch (err: any) {
      console.error("Error submitting feedback:", err);
      return res.status(500).json({ error: err.message || "Failed to submit feedback" });
    }
  }

  // ── GET /api/attempts/feedback (list feedbacks for Super Admin) ──────────────
  if (req.method === "GET") {
    try {
      const isSuper = await hasRole(user.id, "superadmin");
      if (!isSuper) {
        return res.status(403).json({ error: "Permission denied. Super Admin access only." });
      }

      const { page, limit, candidate_type, search_query } = req.query;
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit as string, 10) || 20);
      const offset = (pageNum - 1) * limitNum;

      // Base query fetching attempts with feedback
      let sql = `
        SELECT a.id as attempt_id, a.submitted_at,
               a.feedback_fast_smooth, a.feedback_easy_to_use, a.feedback_strong_security,
               a.feedback_faced_errors, a.feedback_good_design, a.feedback_text,
               t.test_name, c.name as client_name, p.name as candidate_name, p.email as candidate_email
        FROM attempts a
        JOIN tests t ON t.id = a.test_id
        JOIN clients c ON c.id = t.client_id
        JOIN profiles p ON p.id = a.student_id
        WHERE a.feedback_fast_smooth IS NOT NULL
      `;

      const conditions: string[] = [];
      const args: any[] = [];

      // Filter by candidate_type (guest vs student)
      if (candidate_type === "guest") {
        conditions.push("p.email LIKE 'guest_%@temp.exam'");
      } else if (candidate_type === "student") {
        conditions.push("p.email NOT LIKE 'guest_%@temp.exam'");
      }

      // Search filters (name, email, test name, client name)
      if (search_query) {
        conditions.push(
          "(p.name LIKE ? OR p.email LIKE ? OR t.test_name LIKE ? OR c.name LIKE ?)"
        );
        const likeQuery = `%${search_query}%`;
        args.push(likeQuery, likeQuery, likeQuery, likeQuery);
      }

      if (conditions.length > 0) {
        sql += " AND " + conditions.join(" AND ");
      }

      // Count total feedbacks and calculate averages
      let statsSql = `
        SELECT 
          AVG(a.feedback_fast_smooth) as avg_fast_smooth,
          AVG(a.feedback_easy_to_use) as avg_easy_to_use,
          AVG(a.feedback_strong_security) as avg_strong_security,
          AVG(a.feedback_faced_errors) as avg_faced_errors,
          AVG(a.feedback_good_design) as avg_good_design,
          COUNT(*) as total
        FROM attempts a
        JOIN tests t ON t.id = a.test_id
        JOIN clients c ON c.id = t.client_id
        JOIN profiles p ON p.id = a.student_id
        WHERE a.feedback_fast_smooth IS NOT NULL
      `;
      
      const statsConditions: string[] = [];
      const statsArgs: any[] = [];
      
      if (candidate_type === "guest") {
        statsConditions.push("p.email LIKE 'guest_%@temp.exam'");
      } else if (candidate_type === "student") {
        statsConditions.push("p.email NOT LIKE 'guest_%@temp.exam'");
      }

      if (search_query) {
        statsConditions.push(
          "(p.name LIKE ? OR p.email LIKE ? OR t.test_name LIKE ? OR c.name LIKE ?)"
        );
        const likeQuery = `%${search_query}%`;
        statsArgs.push(likeQuery, likeQuery, likeQuery, likeQuery);
      }

      if (statsConditions.length > 0) {
        statsSql += " AND " + statsConditions.join(" AND ");
      }

      const { rows: statsRows } = await db.execute({ sql: statsSql, args: statsArgs });
      const stats = statsRows[0] as any;
      const total = Number(stats?.total || 0);

      // Fetch paginated results
      sql += " ORDER BY a.submitted_at DESC LIMIT ? OFFSET ?";
      const queryArgs = [...args, limitNum, offset];
      const { rows: feedbacks } = await db.execute({ sql, args: queryArgs });

      // Add helper candidate_type attribute
      const formattedFeedbacks = feedbacks.map((f: any) => {
        const isGuest = f.candidate_email?.startsWith("guest_") && f.candidate_email?.endsWith("@temp.exam");
        return {
          ...f,
          candidate_type: isGuest ? "guest" : "student",
          candidate_email: isGuest ? null : f.candidate_email,
        };
      });

      return res.status(200).json({
        feedbacks: formattedFeedbacks,
        stats: {
          avg_fast_smooth: Number(stats?.avg_fast_smooth || 0).toFixed(1),
          avg_easy_to_use: Number(stats?.avg_easy_to_use || 0).toFixed(1),
          avg_strong_security: Number(stats?.avg_strong_security || 0).toFixed(1),
          avg_faced_errors: Number(stats?.avg_faced_errors || 0).toFixed(1),
          avg_good_design: Number(stats?.avg_good_design || 0).toFixed(1),
          total
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
        },
      });
    } catch (err: any) {
      console.error("Error listing feedbacks:", err);
      return res.status(500).json({ error: err.message || "Failed to retrieve feedbacks" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
