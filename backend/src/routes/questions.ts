import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole, getUserClientId } from "../services/roles.js";
import { randomUUID } from "crypto";
import { isFeatureEnabled } from "../services/features.js";
import { questionCreateSchema, questionUpdateSchema } from "../validation/schemas.js";

// Helper to map database rows (with legacy fallback support)
export function mapQuestionRow(row: any) {
  if (!row) return row;
  const mapped = { ...row };

  // Turso libsql returns `undefined` (not `null`) for ALTER TABLE-added columns
  // whose value is NULL — coerce explicitly so image_url always appears in responses
  if (mapped.image_url === undefined) {
    mapped.image_url = null;
  }

  if (typeof mapped.options === "string") {
    try {
      mapped.options = JSON.parse(mapped.options || "[]");
    } catch (e) {
      mapped.options = [];
    }
  }
  if (typeof mapped.correct_answers === "string") {
    try {
      mapped.correct_answers = JSON.parse(mapped.correct_answers || "[]");
    } catch (e) {
      mapped.correct_answers = [];
    }
  }

  // Dynamic mapping of legacy options if new array is empty
  if ((!mapped.options || mapped.options.length === 0) && mapped.option_a) {
    mapped.options = [
      mapped.option_a,
      mapped.option_b,
      mapped.option_c,
      mapped.option_d
    ].filter((opt) => opt !== null && opt !== undefined && opt !== "");
  }

  if (mapped.question_type === "true_false") {
    mapped.option_c = "";
    mapped.option_d = "";
    // Strip N/A and empty values from the options array
    if (Array.isArray(mapped.options)) {
      mapped.options = mapped.options.filter(
        (o: string) => o && o.trim() !== "" && o.trim().toLowerCase() !== "n/a"
      );
    }
  }

  // Dynamic mapping of legacy correct answer if new array is empty
  if ((!mapped.correct_answers || mapped.correct_answers.length === 0) && mapped.correct_answer) {
    mapped.correct_answers = [mapped.correct_answer];
  }

  return mapped;
}


export default async function handler(req: Request, res: Response) {
  const db = getDb();

  // ── GET /api/questions ──────────────────────────────────────────────────────
  if (req.method === "GET") {
    const user = await requireUser(req, res);
    if (!user) return;

    const { client_id, folder_id, ids, search, difficulty, page, limit } = req.query;

    const callerClientId = await getUserClientId(user.id);
    const isSuper = await hasRole(user.id, "superadmin");

    // ids = comma-separated list
    if (ids) {
      const idList = (ids as string).split(",").map((s) => s.trim()).filter(Boolean);
      if (!idList.length) return res.status(200).json([]);
      const placeholders = idList.map(() => "?").join(",");
      const { rows } = await db.execute({
        sql: `SELECT * FROM questions WHERE id IN (${placeholders})`,
        args: idList,
      });

      // Tenant isolation check
      if (!isSuper) {
        for (const row of rows as any[]) {
          if (row.client_id !== callerClientId) {
            return res.status(403).json({ error: "Access denied" });
          }
        }
      }

      return res.status(200).json(rows.map(mapQuestionRow));
    }

    // Tenant isolation check for collection list
    if (client_id && !isSuper && client_id !== callerClientId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const resolvedClientId = isSuper ? (client_id as string) : callerClientId;
    if (!resolvedClientId)
      return res.status(400).json({ error: "client_id required" });

    let countSql = "SELECT COUNT(*) as total FROM questions WHERE client_id = ?";
    let dataSql = "SELECT * FROM questions WHERE client_id = ?";
    let args: any[] = [resolvedClientId];

    let filterSql = "";
    if (folder_id === "null" || folder_id === "") {
      filterSql += " AND folder_id IS NULL";
    } else if (folder_id) {
      filterSql += " AND folder_id = ?";
      args.push(folder_id);
    }

    if (difficulty && difficulty !== "all") {
      filterSql += " AND difficulty = ?";
      args.push(difficulty);
    }

    if (search) {
      filterSql += " AND question_text LIKE ?";
      args.push(`%${search}%`);
    }

    countSql += filterSql;
    dataSql += filterSql + " ORDER BY created_at DESC";

    const isPaginationRequested = page !== undefined && limit !== undefined;
    const { rows: countRows } = await db.execute({ sql: countSql, args: args.slice(0, args.length) });
    const total = (countRows[0] as any).total;

    if (isPaginationRequested) {
      const pNum = Math.max(1, parseInt(page as string, 10));
      const lNum = Math.max(1, parseInt(limit as string, 10));
      const offset = (pNum - 1) * lNum;
      dataSql += " LIMIT ? OFFSET ?";
      args.push(lNum, offset);
    }

    const { rows } = await db.execute({ sql: dataSql, args });
    const formatted = rows.map(mapQuestionRow);

    if (isPaginationRequested) {
      return res.status(200).json({
        data: formatted,
        pagination: {
          page: Math.max(1, parseInt(page as string, 10)),
          limit: Math.max(1, parseInt(limit as string, 10)),
          total,
        },
      });
    }

    return res.status(200).json(formatted);
  }

  // ── POST /api/questions ─────────────────────────────────────────────────────
  if (req.method === "POST") {
    const user = await requireUser(req, res);
    if (!user) return;

    const body = Array.isArray(req.body) ? req.body : [req.body];
    for (const q of body) {
      const validation = questionCreateSchema.safeParse(q);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }
    }

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const clientId = await getUserClientId(user.id);
    if (!clientId) return res.status(403).json({ error: "No client" });

    // Enforce CSV Import Feature Flag
    const isImport = body.some((q) => q.import_batch_id);
    if (isImport) {
      const csvImportAllowed = await isFeatureEnabled(clientId, "csv_import");
      if (!csvImportAllowed) {
        return res.status(403).json({ error: "Access Denied: CSV Student/Question Import feature is not enabled for your organization plan." });
      }
    }

    const inserted: any[] = [];
    let importedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    for (const q of body) {
      const targetClientId: string = q.client_id || clientId;
      if (isClientAdmin && !isSuper && targetClientId !== clientId) {
        return res.status(403).json({ error: "Cannot create questions for another organization" });
      }

      const id = q.id && !q.id.startsWith("temp_") ? q.id : randomUUID();

      // Backward compatibility mapping for options and answers
      const question_type = q.question_type || "mcq";
      let options = q.options || [];
      if (options.length === 0 && q.option_a) {
        options = [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
      }
      let correct_answers = q.correct_answers || [];
      if (correct_answers.length === 0 && q.correct_answer) {
        correct_answers = [q.correct_answer];
      }

      // Ensure option_a..d and correct_answer are populated to satisfy legacy NOT NULL and CHECK constraints in SQLite schema
      const optA = q.option_a || options[0] || (question_type === "true_false" ? "True" : "N/A");
      const optB = q.option_b || options[1] || (question_type === "true_false" ? "False" : "N/A");
      const optC = question_type === "true_false" ? "" : (q.option_c || options[2] || "N/A");
      const optD = question_type === "true_false" ? "" : (q.option_d || options[3] || "N/A");

      let correctAns = "A";
      if (q.correct_answer && ["A", "B", "C", "D"].includes(q.correct_answer.toUpperCase())) {
        correctAns = q.correct_answer.toUpperCase();
      } else if (correct_answers.length > 0) {
        const idx = options.findIndex((opt: string) => opt.toLowerCase().trim() === correct_answers[0].toLowerCase().trim());
        if (idx >= 0 && idx < 4) {
          correctAns = ["A", "B", "C", "D"][idx];
        } else {
          const possibleLetter = correct_answers[0].toUpperCase();
          if (["A", "B", "C", "D"].includes(possibleLetter)) {
            correctAns = possibleLetter;
          }
        }
      }

      try {
        const result = await db.execute({
          sql: `INSERT INTO questions
                (id, client_id, folder_id, question_text, option_a, option_b, option_c, option_d,
                 correct_answer, difficulty, marks, question_type, options, correct_answers,
                 negative_marks, explanation, image_url, is_case_sensitive, import_batch_id, version, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
                ON CONFLICT(id) DO UPDATE SET
                  image_url = excluded.image_url,
                  question_text = excluded.question_text,
                  option_a = excluded.option_a,
                  option_b = excluded.option_b,
                  option_c = excluded.option_c,
                  option_d = excluded.option_d,
                  correct_answer = excluded.correct_answer,
                  marks = excluded.marks,
                  explanation = excluded.explanation,
                  updated_at = datetime('now')`,
          args: [
            id, targetClientId, q.folder_id ?? null,
            q.question_text,
            optA, optB, optC, optD,
            correctAns, q.difficulty ?? "medium", q.marks ?? 1,
            question_type,
            JSON.stringify(options),
            JSON.stringify(correct_answers),
            q.negative_marks ?? 0,
            q.explanation ?? "",
            q.image_url ?? null,
            q.is_case_sensitive ?? 0,
            q.import_batch_id ?? null,
            q.version ?? 1,
          ],
        });

        importedCount++;
        inserted.push(mapQuestionRow({ ...q, id, client_id: targetClientId, question_type, options, correct_answers, image_url: q.image_url }));
      } catch (err) {
        console.error("Failed to insert question:", err);
        failedCount++;
      }
    }

    // Audit Log creation if it belongs to an import batch
    const firstQ = body[0];
    if (firstQ && firstQ.import_batch_id) {
      await db.execute({
        sql: `INSERT INTO question_import_logs
              (id, uploaded_by, uploaded_at, import_batch_id, total_questions, imported_count, duplicate_count, failed_count)
              VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?)`,
        args: [
          randomUUID(),
          user.email || "unknown_user",
          firstQ.import_batch_id,
          body.length,
          importedCount,
          duplicateCount,
          failedCount,
        ],
      });
    }

    return res.status(201).json(inserted.length === 1 ? inserted[0] : inserted);
  }

  // ── PATCH /api/questions ────────────────────────────────────────────────────
  if (req.method === "PATCH") {
    const user = await requireUser(req, res);
    if (!user) return;

    const validation = questionUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { id } = req.query;
    if (!id && !req.body.ids) return res.status(400).json({ error: "id or ids required" });

    const callerClientId = await getUserClientId(user.id);

    // Support bulk folder movement
    const { ids, folder_id, bulk_image_urls } = req.body;

    // Support bulk image_url update: [{ id, image_url }]
    if (bulk_image_urls && Array.isArray(bulk_image_urls) && bulk_image_urls.length > 0) {
      const updateStmts = bulk_image_urls
        .filter((u: any) => u.id && u.image_url)
        .map((u: any) => ({
          sql: "UPDATE questions SET image_url = ?, updated_at = datetime('now') WHERE id = ?",
          args: [u.image_url, u.id],
        }));
      if (updateStmts.length > 0) {
        await db.batch(updateStmts);
      }
      return res.status(200).json({ success: true, updated: updateStmts.length });
    }

    if (ids && Array.isArray(ids)) {
      if (isClientAdmin && !isSuper) {
        const placeholders = ids.map(() => "?").join(",");
        const { rows } = await db.execute({
          sql: `SELECT COUNT(*) as count FROM questions WHERE id IN (${placeholders}) AND client_id != ?`,
          args: [...ids, callerClientId],
        });
        if ((rows[0] as any).count > 0) {
          return res.status(403).json({ error: "Cannot modify questions belonging to another organization" });
        }
      }

      const placeholders = ids.map(() => "?").join(",");
      await db.execute({
        sql: `UPDATE questions SET folder_id = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`,
        args: [folder_id ?? null, ...ids],
      });
      return res.status(200).json({ success: true });
    }

    if (isClientAdmin && !isSuper) {
      const { rows } = await db.execute({
        sql: "SELECT client_id FROM questions WHERE id = ?",
        args: [String(id)],
      });
      if (!rows.length) return res.status(404).json({ error: "Question not found" });
      if (rows[0].client_id !== callerClientId) {
        return res.status(403).json({ error: "Permission denied" });
      }
    }

    // In-place Update: Modify the current question record in place.
    const { rows: currentRows } = await db.execute({
      sql: "SELECT * FROM questions WHERE id = ?",
      args: [String(id)],
    });
    if (!currentRows.length) return res.status(404).json({ error: "Question not found" });
    const current = mapQuestionRow(currentRows[0]);

    // Merge old and new values
    const mergedOptions = req.body.options || current.options || [];
    const mergedCorrectAnswers = req.body.correct_answers || current.correct_answers || [];

    await db.execute({
      sql: `UPDATE questions
            SET folder_id = ?, question_text = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?,
                correct_answer = ?, difficulty = ?, marks = ?, question_type = ?, options = ?, correct_answers = ?,
                negative_marks = ?, explanation = ?, image_url = ?, is_case_sensitive = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [
        req.body.folder_id !== undefined ? req.body.folder_id : current.folder_id,
        req.body.question_text || current.question_text,
        req.body.option_a !== undefined ? req.body.option_a : current.option_a,
        req.body.option_b !== undefined ? req.body.option_b : current.option_b,
        req.body.option_c !== undefined ? req.body.option_c : current.option_c,
        req.body.option_d !== undefined ? req.body.option_d : current.option_d,
        req.body.correct_answer !== undefined ? req.body.correct_answer : current.correct_answer,
        req.body.difficulty || current.difficulty,
        req.body.marks !== undefined ? req.body.marks : current.marks,
        req.body.question_type || current.question_type,
        JSON.stringify(mergedOptions),
        JSON.stringify(mergedCorrectAnswers),
        req.body.negative_marks !== undefined ? req.body.negative_marks : current.negative_marks,
        req.body.explanation !== undefined ? req.body.explanation : current.explanation,
        req.body.image_url !== undefined ? req.body.image_url : current.image_url,
        req.body.is_case_sensitive !== undefined ? req.body.is_case_sensitive : current.is_case_sensitive,
        String(id),
      ],
    });

    const { rows: responseRows } = await db.execute({
      sql: "SELECT * FROM questions WHERE id = ?",
      args: [String(id)],
    });
    return res.status(200).json(mapQuestionRow(responseRows[0]));
  }

  // ── DELETE /api/questions ───────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const user = await requireUser(req, res);
    if (!user) return;

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { id, ids, import_batch_id } = req.query;
    const callerClientId = await getUserClientId(user.id);

    // Import batch rollback support
    if (import_batch_id) {
      let sql = "DELETE FROM questions WHERE import_batch_id = ?";
      const args: any[] = [import_batch_id as string];

      if (isClientAdmin && !isSuper) {
        sql += " AND client_id = ?";
        args.push(callerClientId as string);
      }

      const result = await db.execute({ sql, args });
      return res.status(200).json({ success: true, message: `Rollback completed. Removed ${result.rowsAffected} questions.` });
    }

    if (ids) {
      const idList = (ids as string).split(",").filter(Boolean);
      if (isClientAdmin && !isSuper) {
        const placeholders = idList.map(() => "?").join(",");
        const { rows } = await db.execute({
          sql: `SELECT COUNT(*) as count FROM questions WHERE id IN (${placeholders}) AND client_id != ?`,
          args: [...idList, callerClientId],
        });
        if ((rows[0] as any).count > 0) {
          return res.status(403).json({ error: "Cannot delete questions belonging to another organization" });
        }
      }

      const placeholders = idList.map(() => "?").join(",");
      await db.execute({ sql: `DELETE FROM questions WHERE id IN (${placeholders})`, args: idList });
      return res.status(200).json({ success: true });
    }

    if (id) {
      if (isClientAdmin && !isSuper) {
        const { rows } = await db.execute({
          sql: "SELECT client_id FROM questions WHERE id = ?",
          args: [id as string],
        });
        if (!rows.length) return res.status(404).json({ error: "Question not found" });
        if (rows[0].client_id !== callerClientId) {
          return res.status(403).json({ error: "Permission denied" });
        }
      }

      await db.execute({ sql: "DELETE FROM questions WHERE id = ?", args: [id as string] });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "id, ids, or import_batch_id required" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
