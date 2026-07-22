import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { randomUUID } from "crypto";
import { hasRole, getUserClientId } from "../services/roles.js";
import { mapQuestionRow } from "./questions.js";
import { validateQuestionLimit } from "../services/billing.js";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  const { test_id } = req.query;

  // ── GET: questions for a test (with full question data, no correct_answer for students)
  if (req.method === "GET") {
    if (!test_id) return res.status(400).json({ error: "test_id required" });

    let withAnswers = req.query.with_answers === "true";
    
    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");

    if (!isSuper) {
      // Fetch test to check its client_id
      const { rows: testRows } = await db.execute({
        sql: "SELECT client_id FROM tests WHERE id = ?",
        args: [test_id as string],
      });
      if (testRows.length === 0) {
        return res.status(404).json({ error: "Test not found" });
      }
      const testClientId = (testRows[0] as any).client_id;

      if (isClientAdmin) {
        const callerClientId = await getUserClientId(user.id);
        if (callerClientId !== testClientId) {
          return res.status(403).json({ error: "Access denied. Client mismatch." });
        }
      } else {
        // Verify the student/guest has either an active (in_progress) or completed (submitted) attempt for this test
        const { rows: attemptRows } = await db.execute({
          sql: "SELECT id FROM attempts WHERE student_id = ? AND test_id = ? AND status = 'in_progress'",
          args: [user.id, test_id as string],
        });

        if (attemptRows.length === 0) {
          // Fallback: check if they have a submitted attempt to allow review/history pages to load questions
          const { rows: submittedRows } = await db.execute({
            sql: "SELECT id FROM attempts WHERE student_id = ? AND test_id = ? AND status = 'submitted'",
            args: [user.id, test_id as string],
          });
          if (submittedRows.length === 0) {
            return res.status(403).json({ error: "Access denied. Active attempt required." });
          }
        }
      }
    }

    if (withAnswers) {
      if (!isSuper && !isClientAdmin) {
        // Student requested correct answers. Verify if they submitted the test and review is enabled.
        const { rows: testRows } = await db.execute({
          sql: "SELECT allow_review FROM tests WHERE id = ?",
          args: [test_id as string],
        });
        
        if (!testRows.length) return res.status(404).json({ error: "Test not found" });
        const test = testRows[0] as any;
        
        const { rows: attemptRows } = await db.execute({
          sql: "SELECT id FROM attempts WHERE student_id = ? AND test_id = ? AND status = 'submitted'",
          args: [user.id, test_id as string],
        });
        
        const allowReview = test.allow_review === 1;
        const hasSubmitted = attemptRows.length > 0;
        
        if (!allowReview || !hasSubmitted) {
          return res.status(403).json({ error: "Access to answer key forbidden" });
        }
      }
    }

    const selectCols = withAnswers
      ? "q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.marks, q.difficulty, q.question_type, q.options, q.correct_answers, q.negative_marks, q.explanation, q.image_url, tq.section_id, tq.position, tq.id as tq_id, tq.question_id"
      : "q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.marks, q.difficulty, q.question_type, q.options, q.correct_answers, q.negative_marks, q.explanation, q.image_url, tq.section_id, tq.position, tq.id as tq_id, tq.question_id";

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

    const result = rows.map((r: any) => {
      // Turso libsql returns `undefined` (not `null`) for ALTER TABLE-added columns
      // whose value is NULL — so we must explicitly coerce to null for JSON serialization
      const imageUrl: string | null = (r.image_url !== undefined && r.image_url !== null)
        ? String(r.image_url)
        : null;

      const mappedQ = mapQuestionRow({
        id: r.id,
        question_text: r.question_text,
        option_a: r.option_a,
        option_b: r.option_b,
        option_c: r.option_c,
        option_d: r.option_d,
        correct_answer: r.correct_answer,
        marks: r.marks,
        difficulty: r.difficulty,
        question_type: r.question_type,
        options: r.options,
        correct_answers: r.correct_answers,
        negative_marks: r.negative_marks,
        explanation: r.explanation,
        image_url: imageUrl,
      });

      const questionObj: any = {
        id: mappedQ.id,
        question_text: mappedQ.question_text,
        option_a: mappedQ.option_a,
        option_b: mappedQ.option_b,
        option_c: mappedQ.option_c,
        option_d: mappedQ.option_d,
        marks: mappedQ.marks,
        difficulty: mappedQ.difficulty,
        question_type: mappedQ.question_type,
        options: mappedQ.options,
        correct_answers: mappedQ.correct_answers,
        negative_marks: mappedQ.negative_marks,
        explanation: mappedQ.explanation,
        image_url: imageUrl,
      };
      if (withAnswers) {
        questionObj.correct_answer = mappedQ.correct_answer;
      }
      return {
        ...r,
        image_url: imageUrl,       // ← always explicit, never dropped by JSON.stringify
        option_c: mappedQ.option_c, // ← "" for true_false (not "N/A" from raw DB)
        option_d: mappedQ.option_d, // ← "" for true_false (not "N/A" from raw DB)
        section_name: r.section_id ? (sectionMap.get(r.section_id) ?? "General Section") : "General Section",
        questions: questionObj,
      };
    });

    return res.status(200).json(result);
  }

  // ── POST: link questions to a test (upsert)
  if (req.method === "POST") {
    if (!test_id) return res.status(400).json({ error: "test_id required" });

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { rows: testRows } = await db.execute({
      sql: "SELECT client_id, read_only FROM tests WHERE id = ?",
      args: [test_id as string],
    });
    if (!testRows.length) return res.status(404).json({ error: "Test not found" });
    const test = testRows[0] as any;
    const testClientId = test.client_id;
    if (test.read_only === 1) {
      return res.status(403).json({ error: "Block: Structural updates are prohibited on read-only assessments." });
    }

    if (isClientAdmin && !isSuper) {
      const callerClientId = await getUserClientId(user.id);
      if (callerClientId !== testClientId) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    // Verify client active status
    const { rows: clientStatus } = await db.execute({
      sql: "SELECT active_status FROM clients WHERE id = ?",
      args: [testClientId],
    });
    if (clientStatus.length > 0 && clientStatus[0].active_status === 0) {
      return res.status(403).json({ error: "Access Denied: Your organization has been suspended." });
    }

    const body = Array.isArray(req.body) ? req.body : [req.body];

    // Enforce max_questions_per_exam limit
    const { rows: currentQCountRows } = await db.execute({
      sql: "SELECT COUNT(*) as count FROM test_questions WHERE test_id = ?",
      args: [test_id as string],
    });
    const currentCount = Number((currentQCountRows[0] as any).count || 0);
    const isAllowed = await validateQuestionLimit(test_id as string, currentCount + body.length);
    if (!isAllowed) {
      return res.status(403).json({ error: "Quota Exceeded: The maximum limit of questions for this exam has been reached." });
    }

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

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { rows: testRows } = await db.execute({
      sql: "SELECT client_id, read_only FROM tests WHERE id = ?",
      args: [test_id as string],
    });
    if (!testRows.length) return res.status(404).json({ error: "Test not found" });
    const test = testRows[0] as any;
    const testClientId = test.client_id;
    if (test.read_only === 1) {
      return res.status(403).json({ error: "Block: Structural updates are prohibited on read-only assessments." });
    }

    if (isClientAdmin && !isSuper) {
      const callerClientId = await getUserClientId(user.id);
      if (testRows[0].client_id !== callerClientId) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    // Verify client active status
    const { rows: clientStatus } = await db.execute({
      sql: "SELECT active_status FROM clients WHERE id = ?",
      args: [testClientId],
    });
    if (clientStatus.length > 0 && clientStatus[0].active_status === 0) {
      return res.status(403).json({ error: "Access Denied: Your organization has been suspended." });
    }

    const questions: any[] = req.body;

    // Enforce max_questions_per_exam limit
    const isAllowed = await validateQuestionLimit(test_id as string, questions.length);
    if (!isAllowed) {
      return res.status(403).json({ error: "Quota Exceeded: The maximum limit of questions for this exam has been reached." });
    }

    // Step 1: upsert each question into the questions table
    const upsertStmts = questions
      .filter((q) => !q.id.startsWith("temp_"))
      .map((q) => {
        const hasImageUrl = !!(q.image_url);
        return {
          sql: `INSERT INTO questions
                (id, client_id, question_text, option_a, option_b, option_c, option_d,
                 correct_answer, marks, question_type, explanation, image_url, difficulty, updated_at)
                VALUES (?,
                  (SELECT client_id FROM tests WHERE id = ?),
                  ?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
                ON CONFLICT(id) DO UPDATE SET
                  question_text = excluded.question_text,
                  option_a = excluded.option_a,
                  option_b = excluded.option_b,
                  option_c = excluded.option_c,
                  option_d = excluded.option_d,
                  correct_answer = excluded.correct_answer,
                  marks = excluded.marks,
                  question_type = excluded.question_type,
                  explanation = excluded.explanation,
                  ${hasImageUrl ? "image_url = excluded.image_url," : ""}
                  difficulty = excluded.difficulty,
                  updated_at = datetime('now')`,
          args: [q.id, test_id, q.question_text, q.option_a ?? null, q.option_b ?? null,
                 q.question_type === "true_false" ? "" : (q.option_c ?? null),
                 q.question_type === "true_false" ? "" : (q.option_d ?? null),
                 q.correct_answer ?? null, q.marks ?? 1,
                 q.question_type ?? "mcq", q.explanation ?? "", q.image_url || null, q.difficulty ?? "medium"],
        };
      });

    // New questions (temp_ ids): insert into questions first
    const newQuestions = questions.filter((q) => q.id.startsWith("temp_"));
    const idMap: Record<string, string> = {};
    const newInserts = newQuestions.map((q) => {
      const newId = randomUUID();
      idMap[q.id] = newId;
      return {
        sql: `INSERT INTO questions
              (id, client_id, question_text, option_a, option_b, option_c, option_d,
               correct_answer, marks, question_type, explanation, image_url, difficulty)
              VALUES (?,
                (SELECT client_id FROM tests WHERE id = ?),
                ?,?,?,?,?,?,?,?,?,?,?)`,
        args: [newId, test_id, q.question_text, q.option_a ?? null, q.option_b ?? null,
               q.question_type === "true_false" ? "" : (q.option_c ?? null),
               q.question_type === "true_false" ? "" : (q.option_d ?? null),
               q.correct_answer ?? null, q.marks ?? 1,
               q.question_type ?? "mcq", q.explanation ?? "", q.image_url ?? null, q.difficulty ?? "medium"],
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

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { rows: testRows } = await db.execute({
      sql: "SELECT client_id, read_only FROM tests WHERE id = ?",
      args: [test_id as string],
    });
    if (!testRows.length) return res.status(404).json({ error: "Test not found" });
    const test = testRows[0] as any;
    const testClientId = test.client_id;
    if (test.read_only === 1) {
      return res.status(403).json({ error: "Block: Structural updates are prohibited on read-only assessments." });
    }

    if (isClientAdmin && !isSuper) {
      const callerClientId = await getUserClientId(user.id);
      if (testRows[0].client_id !== callerClientId) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    // Verify client active status
    const { rows: clientStatus } = await db.execute({
      sql: "SELECT active_status FROM clients WHERE id = ?",
      args: [testClientId],
    });
    if (clientStatus.length > 0 && clientStatus[0].active_status === 0) {
      return res.status(403).json({ error: "Access Denied: Your organization has been suspended." });
    }

    await db.execute({
      sql: "DELETE FROM test_questions WHERE test_id = ? AND question_id = ?",
      args: [test_id as string, question_id as string],
    });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
