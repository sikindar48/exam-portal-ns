import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import "dotenv/config";
import { getDb } from "./api/_lib/db.js";
import { getUser } from "./api/_lib/auth.js";
import { randomUUID } from "crypto";

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// Auth Middleware
// ─────────────────────────────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

app.use(async (req: Request, res: Response, next: NextFunction) => {
  const user = await getUser(req as any);
  if (user) req.user = user;
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Attempts Routes
// ─────────────────────────────────────────────────────────────────────────────

app.get("/api/attempts", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const { test_id, student_id, status, id, count_only, with_test_name } = req.query;

  try {
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
      return res.status(200).json({
        ...row,
        tests: {
          test_name: row.test_name,
          timer: row.timer,
          allow_review: row.allow_review === 1,
          negative_marking: row.negative_marking === 1,
          negative_marks: row.negative_marks,
        },
      });
    }

    // Count completed attempts
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
    const resolvedStudentId = (student_id as string) || req.user.id;
    let sql = `SELECT a.*, t.test_name, t.timer, t.allow_review
               FROM attempts a JOIN tests t ON t.id = a.test_id
               WHERE a.student_id = ?`;
    const args: any[] = [resolvedStudentId];

    if (status) {
      sql += " AND a.status = ?";
      args.push(status);
    }
    if (test_id) {
      sql += " AND a.test_id = ?";
      args.push(test_id);
    }

    sql += " ORDER BY a.submitted_at DESC";

    const { rows } = await db.execute({ sql, args });
    return res.status(200).json(
      rows.map((r: any) => ({
        ...r,
        tests: { test_name: r.test_name, timer: r.timer, allow_review: r.allow_review === 1 },
      }))
    );
  } catch (error) {
    console.error("Error fetching attempts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/attempts", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const db = getDb();
  const { student_id, test_id, status = "in_progress" } = req.body;
  const resolvedStudentId = student_id || req.user.id;

  try {
    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO attempts (id, student_id, test_id, status, submitted_at)
            VALUES (?,?,?,?,datetime('now'))`,
      args: [id, resolvedStudentId, test_id, status],
    });
    const { rows } = await db.execute({ sql: "SELECT * FROM attempts WHERE id = ?", args: [id] });
    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating attempt:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
