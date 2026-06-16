import type { Request, Response } from "express";
import { getDb } from "./_lib/db.js";
import { requireUser } from "./_lib/auth.js";
import { randomUUID } from "crypto";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  const { test_id } = req.query;

  // ── GET: questions for a test (with full question data, no correct_answer for students)
  if (req.method === "GET") {
    if (!test_id) return res.status(400).json({ error: "test_id required" });

    const withAnswers = req.query.with_answers === "true";
    const selectCols = withAnswers
      ? "q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.marks, q.difficulty, tq.section_id, tq.position, tq.id as tq_id"
      : "q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.marks, q.difficulty, tq.section_id, tq.position, tq.id as tq_id";

    const { rows } = await db.execute({
      sql: `SELECT ${selectCols}
            FROM test_questions tq
            JOIN questions q ON q.id = tq.question_id
            WHERE tq.test_id = ?
            ORDER BY tq.position ASC`,
      args: [test_id as string],
    });

    // Include section name
    const { rows: sections } = await db.execute({
      sql: "SELECT id, name, position FROM test_sections WHERE test_id = ? ORDER BY position",
      args: [test_id as string],
    });
    const sectionMap = new Map(sections.map((s: any) => [s.id, s.name]));

    const result = rows.map((r: any) => ({
      ...r,
      section_name: r.section_id ? (sectionMap.get(r.section_id) ?? "General Section") : "General Section",
    }));

    return res.status(200).json(result);
  }

  // ── POST: link questions to a test (upsert)
  if (req.method === "POST") {
    if (!test_id) return res.status(400).json({ error: "test_id required" });

    const body = Array.isArray(req.body) ? req.body : [req.body];

    const stmts = body.map((row: any) => ({
      sql: `INSERT OR IGNORE INTO test_questions (id, test_id, question_id, section_id, position)
            VALUES (?,?,?,?,?)`,
      args: [randomUUID(), test_id, row.question_id, row.section_id ?? null, row.position ?? null],
    }));

    await db.batch(stmts, "write");
    return res.status(201).json({ success: true });
  }

  // ── PUT: full replace — delete all then re-insert (used by Builder save)
  if (req.method === "PUT") {
    if (!test_id) return res.status(400).json({ error: "test_id required" });

    const questions: any[] = req.body;

    // Step 1: upsert each question into the questions table
    const upsertStmts = questions
      .filter((q) => !q.id.startsWith("temp_"))
      .map((q) => ({
        sql: `INSERT OR REPLACE INTO questions
              (id, client_id, question_text, option_a, option_b, option_c, option_d,
               correct_answer, marks, section_id, updated_at)
              VALUES (?,
                (SELECT client_id FROM tests WHERE id = ?),
                ?,?,?,?,?,?,?,?,datetime('now'))`,
        args: [q.id, test_id, q.question_text, q.option_a, q.option_b, q.option_c,
               q.option_d, q.correct_answer, q.marks ?? 1, q.section_id ?? null],
      }));

    // New questions (temp_ ids): insert into questions first
    const newQuestions = questions.filter((q) => q.id.startsWith("temp_"));
    const idMap: Record<string, string> = {};
    const newInserts = newQuestions.map((q) => {
      const newId = randomUUID();
      idMap[q.id] = newId;
      return {
        sql: `INSERT INTO questions
              (id, client_id, question_text, option_a, option_b, option_c, option_d,
               correct_answer, marks)
              VALUES (?,
                (SELECT client_id FROM tests WHERE id = ?),
                ?,?,?,?,?,?,?)`,
        args: [newId, test_id, q.question_text, q.option_a, q.option_b,
               q.option_c, q.option_d, q.correct_answer, q.marks ?? 1],
      };
    });

    // Step 2: delete existing test_questions, re-insert with positions
    const allStmts = [
      ...upsertStmts,
      ...newInserts,
      { sql: "DELETE FROM test_questions WHERE test_id = ?", args: [test_id] },
      ...questions.map((q, idx) => {
        const resolvedId = q.id.startsWith("temp_") ? idMap[q.id] : q.id;
        return {
          sql: `INSERT INTO test_questions (id, test_id, question_id, section_id, position)
                VALUES (?,?,?,?,?)`,
          args: [randomUUID(), test_id, resolvedId, q.section_id ?? null, idx],
        };
      }),
    ];

    await db.batch(allStmts, "write");
    return res.status(200).json({ success: true });
  }

  // ── DELETE: remove a question from a test
  if (req.method === "DELETE") {
    const { question_id } = req.query;
    if (!test_id || !question_id)
      return res.status(400).json({ error: "test_id and question_id required" });

    await db.execute({
      sql: "DELETE FROM test_questions WHERE test_id = ? AND question_id = ?",
      args: [test_id as string, question_id as string],
    });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
