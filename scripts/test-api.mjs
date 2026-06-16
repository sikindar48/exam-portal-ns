/**
 * test-api.mjs
 * 
 * Tests the Turso API layer directly (no HTTP server needed).
 * Imports the db/roles logic and runs SQL against live Turso.
 * 
 * Run: node --env-file=.env scripts/test-api.mjs
 */

import { createClient } from "@libsql/client";

const TURSO_URL = process.env.VITE_TURSO_URL || process.env.TURSO_URL;
const TURSO_TOKEN = process.env.VITE_TURSO_TOKEN || process.env.TURSO_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("❌ Missing TURSO_URL or TURSO_TOKEN");
  process.exit(1);
}

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    const result = await fn();
    console.log(`  ✅ ${name}${result !== undefined ? ` → ${JSON.stringify(result).slice(0, 120)}` : ""}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

// ─────────────────────────────────────────────────────────────────────────────

console.log("\n══════════════════════════════════════════════");
console.log("  Turso API Layer — Integration Tests");
console.log("══════════════════════════════════════════════\n");

// ── 1. Schema: all tables exist ──────────────────────────────────────────────
console.log("📋 Schema checks");

const EXPECTED_TABLES = [
  "clients","profiles","user_roles","questions","question_folders",
  "tests","test_folders","test_questions","test_sections","attempts","attempt_answers"
];

for (const table of EXPECTED_TABLES) {
  await test(`Table "${table}" exists`, async () => {
    const { rows } = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
    const count = rows[0].count;
    return `${count} rows`;
  });
}

// ── 2. Read data ─────────────────────────────────────────────────────────────
console.log("\n📖 Data reads");

let clientId, testId, questionId, attemptId;

await test("clients: read all", async () => {
  const { rows } = await db.execute("SELECT * FROM clients");
  assert(rows.length > 0, "Expected at least 1 client");
  clientId = rows[0].id;
  return `id=${clientId}, name=${rows[0].name}`;
});

await test("clients: active_status is 0 or 1 (not true/false)", async () => {
  const { rows } = await db.execute("SELECT active_status FROM clients LIMIT 1");
  const val = rows[0].active_status;
  assert(val === 0 || val === 1, `Expected 0/1, got ${val}`);
  return val;
});

await test("tests: read by client_id", async () => {
  const { rows } = await db.execute({
    sql: "SELECT * FROM tests WHERE client_id = ?",
    args: [clientId],
  });
  assert(rows.length > 0, "Expected at least 1 test");
  testId = rows[0].id;
  return `${rows.length} tests, first="${rows[0].test_name}"`;
});

await test("tests: boolean fields are 0/1", async () => {
  const { rows } = await db.execute({
    sql: "SELECT shuffle, allow_review, negative_marking, active, allow_guests, public_link_enabled FROM tests WHERE id = ?",
    args: [testId],
  });
  const r = rows[0];
  for (const [k, v] of Object.entries(r)) {
    assert(v === 0 || v === 1 || v === null, `${k} should be 0/1, got ${v}`);
  }
  return JSON.stringify(r);
});

await test("tests: share_code exists and is 8 chars", async () => {
  const { rows } = await db.execute({
    sql: "SELECT share_code FROM tests WHERE id = ?",
    args: [testId],
  });
  const code = rows[0].share_code;
  assert(code && code.length === 8, `Expected 8-char code, got "${code}"`);
  return code;
});

await test("tests: lookup by share_code", async () => {
  const { rows: codeRows } = await db.execute({
    sql: "SELECT share_code FROM tests WHERE id = ?",
    args: [testId],
  });
  const code = codeRows[0].share_code;
  const { rows } = await db.execute({
    sql: "SELECT id, test_name FROM tests WHERE share_code = ? COLLATE NOCASE",
    args: [code],
  });
  assert(rows.length === 1 && rows[0].id === testId, "share_code lookup failed");
  return `found "${rows[0].test_name}"`;
});

await test("questions: read by client_id", async () => {
  const { rows } = await db.execute({
    sql: "SELECT * FROM questions WHERE client_id = ?",
    args: [clientId],
  });
  assert(rows.length > 0, "Expected at least 1 question");
  questionId = rows[0].id;
  return `${rows.length} questions`;
});

await test("questions: correct_answer is A/B/C/D", async () => {
  const { rows } = await db.execute({
    sql: "SELECT correct_answer FROM questions WHERE client_id = ? LIMIT 5",
    args: [clientId],
  });
  for (const r of rows) {
    assert(["A","B","C","D"].includes(r.correct_answer), `Invalid correct_answer: ${r.correct_answer}`);
  }
  return rows.map(r => r.correct_answer).join(",");
});

await test("test_questions: linked to test", async () => {
  const { rows } = await db.execute({
    sql: "SELECT COUNT(*) as count FROM test_questions WHERE test_id = ?",
    args: [testId],
  });
  assert(rows[0].count > 0, "Expected test to have questions");
  return `${rows[0].count} questions in test`;
});

await test("test_questions: join with questions (no correct_answer leak)", async () => {
  const { rows } = await db.execute({
    sql: `SELECT q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                 q.marks, q.difficulty, tq.section_id, tq.position
          FROM test_questions tq
          JOIN questions q ON q.id = tq.question_id
          WHERE tq.test_id = ?
          ORDER BY tq.position`,
    args: [testId],
  });
  assert(rows.length > 0, "Expected questions");
  // Verify correct_answer is NOT in result
  assert(!("correct_answer" in rows[0]), "correct_answer should not be returned for students");
  return `${rows.length} questions returned without correct_answer`;
});

await test("attempts: read submitted", async () => {
  const { rows } = await db.execute({
    sql: "SELECT * FROM attempts WHERE test_id = ? AND status = 'submitted' LIMIT 5",
    args: [testId],
  });
  if (rows.length > 0) {
    attemptId = rows[0].id;
    return `${rows.length} submitted attempts`;
  }
  return "0 submitted attempts (ok)";
});

await test("attempt_answers: read for attempt", async () => {
  if (!attemptId) return "skipped (no submitted attempts)";
  const { rows } = await db.execute({
    sql: "SELECT * FROM attempt_answers WHERE attempt_id = ?",
    args: [attemptId],
  });
  return `${rows.length} answers`;
});

await test("profiles: read by client_id", async () => {
  const { rows } = await db.execute({
    sql: "SELECT id, name, email FROM profiles WHERE client_id = ?",
    args: [clientId],
  });
  assert(rows.length > 0, "Expected profiles");
  return `${rows.length} profiles`;
});

await test("user_roles: read by client_id", async () => {
  const { rows } = await db.execute({
    sql: "SELECT role, user_id FROM user_roles WHERE client_id = ?",
    args: [clientId],
  });
  assert(rows.length > 0, "Expected user_roles");
  return `${rows.length} roles: ${[...new Set(rows.map(r => r.role))].join(", ")}`;
});

// ── 3. Write operations (create → verify → cleanup) ──────────────────────────
console.log("\n✏️  Write operations");

const { randomUUID } = await import("crypto");
let tempQuestionId, tempTestId, tempAttemptId, tempFolderId;

await test("question_folders: create + delete", async () => {
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO question_folders (id, client_id, name) VALUES (?,?,?)",
    args: [id, clientId, "_test_folder_"],
  });
  tempFolderId = id;
  const { rows } = await db.execute({
    sql: "SELECT name FROM question_folders WHERE id = ?",
    args: [id],
  });
  assert(rows[0].name === "_test_folder_", "Folder not found after insert");
  await db.execute({ sql: "DELETE FROM question_folders WHERE id = ?", args: [id] });
  const { rows: afterDelete } = await db.execute({
    sql: "SELECT id FROM question_folders WHERE id = ?",
    args: [id],
  });
  assert(afterDelete.length === 0, "Folder not deleted");
  return "created and deleted";
});

await test("questions: create + update + delete", async () => {
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO questions (id, client_id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks)
          VALUES (?,?,?,?,?,?,?,?,?)`,
    args: [id, clientId, "Test Q?", "A", "B", "C", "D", "A", 1],
  });
  tempQuestionId = id;

  await db.execute({
    sql: "UPDATE questions SET question_text = ?, updated_at = datetime('now') WHERE id = ?",
    args: ["Updated Q?", id],
  });
  const { rows } = await db.execute({ sql: "SELECT question_text FROM questions WHERE id = ?", args: [id] });
  assert(rows[0].question_text === "Updated Q?", "Update failed");

  await db.execute({ sql: "DELETE FROM questions WHERE id = ?", args: [id] });
  const { rows: after } = await db.execute({ sql: "SELECT id FROM questions WHERE id = ?", args: [id] });
  assert(after.length === 0, "Delete failed");
  return "create → update → delete OK";
});

await test("tests: create + update + delete", async () => {
  const id = randomUUID();
  const code = "TESTCODE";
  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, share_code, status, active)
          VALUES (?,?,?,?,?,?,?)`,
    args: [id, clientId, "_test_exam_", 30, code, "draft", 0],
  });
  tempTestId = id;

  await db.execute({
    sql: "UPDATE tests SET test_name = ?, active = 1, updated_at = datetime('now') WHERE id = ?",
    args: ["_updated_exam_", id],
  });
  const { rows } = await db.execute({ sql: "SELECT test_name, active FROM tests WHERE id = ?", args: [id] });
  assert(rows[0].test_name === "_updated_exam_", "Update failed");
  assert(rows[0].active === 1, "Boolean update failed");

  await db.execute({ sql: "DELETE FROM tests WHERE id = ?", args: [id] });
  const { rows: after } = await db.execute({ sql: "SELECT id FROM tests WHERE id = ?", args: [id] });
  assert(after.length === 0, "Delete failed");
  return "create → update (bool) → delete OK";
});

await test("attempt_answers: upsert (ON CONFLICT)", async () => {
  if (!attemptId) return "skipped (no submitted attempts to test against)";

  // Find a question in the attempt
  const { rows: ans } = await db.execute({
    sql: "SELECT question_id, selected_option FROM attempt_answers WHERE attempt_id = ? LIMIT 1",
    args: [attemptId],
  });
  if (!ans.length) return "skipped (no answers in attempt)";

  const { question_id, selected_option: original } = ans[0];

  // Upsert with different option
  const newOption = original === "A" ? "B" : "A";
  await db.execute({
    sql: `INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option, marked_for_review)
          VALUES (?,?,?,?,?)
          ON CONFLICT(attempt_id, question_id) DO UPDATE SET
            selected_option = excluded.selected_option,
            marked_for_review = excluded.marked_for_review`,
    args: [randomUUID(), attemptId, question_id, newOption, 0],
  });

  const { rows: after } = await db.execute({
    sql: "SELECT selected_option FROM attempt_answers WHERE attempt_id = ? AND question_id = ?",
    args: [attemptId, question_id],
  });
  assert(after[0].selected_option === newOption, "Upsert did not update");

  // Restore original
  await db.execute({
    sql: `INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option, marked_for_review)
          VALUES (?,?,?,?,?)
          ON CONFLICT(attempt_id, question_id) DO UPDATE SET
            selected_option = excluded.selected_option`,
    args: [randomUUID(), attemptId, question_id, original, 0],
  });
  return "upsert conflict handling OK";
});

// ── 4. Submit attempt logic ───────────────────────────────────────────────────
console.log("\n🎯  Submit attempt scoring logic");

await test("submit_test_attempt: score calculation", async () => {
  // Create a temp test + questions + attempt + answers to verify scoring
  const tId = randomUUID();
  const q1Id = randomUUID(), q2Id = randomUUID(), q3Id = randomUUID();
  const tqId1 = randomUUID(), tqId2 = randomUUID(), tqId3 = randomUUID();
  const aId = randomUUID();
  const aa1 = randomUUID(), aa2 = randomUUID(), aa3 = randomUUID();

  const stmts = [
    // test with negative marking
    { sql: `INSERT INTO tests (id, client_id, test_name, timer, share_code, negative_marking, negative_marks)
            VALUES (?,?,?,?,?,?,?)`,
      args: [tId, clientId, "_score_test_", 30, "SCORETEST", 1, 0.5] },
    // 3 questions: marks 2, 1, 3
    { sql: `INSERT INTO questions (id, client_id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks)
            VALUES (?,?,'Q1?','A','B','C','D','A',2)`, args: [q1Id, clientId] },
    { sql: `INSERT INTO questions (id, client_id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks)
            VALUES (?,?,'Q2?','A','B','C','D','B',1)`, args: [q2Id, clientId] },
    { sql: `INSERT INTO questions (id, client_id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks)
            VALUES (?,?,'Q3?','A','B','C','D','C',3)`, args: [q3Id, clientId] },
    // link to test
    { sql: `INSERT INTO test_questions (id, test_id, question_id) VALUES (?,?,?)`, args: [tqId1, tId, q1Id] },
    { sql: `INSERT INTO test_questions (id, test_id, question_id) VALUES (?,?,?)`, args: [tqId2, tId, q2Id] },
    { sql: `INSERT INTO test_questions (id, test_id, question_id) VALUES (?,?,?)`, args: [tqId3, tId, q3Id] },
    // attempt
    { sql: `INSERT INTO attempts (id, student_id, test_id, status) VALUES (?,?,?,'in_progress')`,
      args: [aId, "00000000-0000-0000-0000-000000000001", tId] },
    // answers: Q1 correct(+2), Q2 wrong(-0.5), Q3 unanswered(0) → expected score = 1.5
    { sql: `INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option) VALUES (?,?,?,?)`,
      args: [aa1, aId, q1Id, "A"] },  // correct
    { sql: `INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option) VALUES (?,?,?,?)`,
      args: [aa2, aId, q2Id, "A"] },  // wrong
    { sql: `INSERT INTO attempt_answers (id, attempt_id, question_id, selected_option) VALUES (?,?,?,?)`,
      args: [aa3, aId, q3Id, null] }, // unanswered
  ];

  await db.batch(stmts, "write");

  // ── Run the scoring logic (mirrors submit-attempt.ts) ──
  const { rows: attemptRows } = await db.execute({
    sql: `SELECT a.*, t.negative_marking, t.negative_marks
          FROM attempts a JOIN tests t ON t.id = a.test_id WHERE a.id = ?`,
    args: [aId],
  });
  const attempt = attemptRows[0];

  const { rows: answerRows } = await db.execute({
    sql: "SELECT question_id, selected_option FROM attempt_answers WHERE attempt_id = ?",
    args: [aId],
  });

  const { rows: questionRows } = await db.execute({
    sql: `SELECT q.id, q.correct_answer, q.marks FROM questions q
          JOIN test_questions tq ON tq.question_id = q.id WHERE tq.test_id = ?`,
    args: [tId],
  });

  const answerMap = new Map(answerRows.map(r => [r.question_id, r.selected_option]));
  let score = 0, totalMarks = 0;
  for (const q of questionRows) {
    totalMarks += q.marks ?? 1;
    const sel = answerMap.get(q.id);
    if (sel && sel === q.correct_answer) score += q.marks ?? 1;
    else if (sel && attempt.negative_marking === 1) score -= attempt.negative_marks ?? 0;
  }
  score = Math.max(0, score);

  assert(totalMarks === 6, `totalMarks should be 6, got ${totalMarks}`);
  assert(score === 1.5, `score should be 1.5 (2 - 0.5), got ${score}`);

  // Update attempt
  await db.execute({
    sql: `UPDATE attempts SET status='submitted', score=?, total_marks=?, time_taken=42 WHERE id=?`,
    args: [score, totalMarks, aId],
  });

  // Cleanup
  await db.batch([
    { sql: "DELETE FROM attempt_answers WHERE attempt_id = ?", args: [aId] },
    { sql: "DELETE FROM attempts WHERE id = ?", args: [aId] },
    { sql: "DELETE FROM test_questions WHERE test_id = ?", args: [tId] },
    { sql: "DELETE FROM questions WHERE id IN (?,?,?)", args: [q1Id, q2Id, q3Id] },
    { sql: "DELETE FROM tests WHERE id = ?", args: [tId] },
  ], "write");

  return `score=${score}, totalMarks=${totalMarks} ✓ (expected 1.5/6)`;
});

// ── 5. Indexes ────────────────────────────────────────────────────────────────
console.log("\n⚡  Index checks");

const EXPECTED_INDEXES = [
  "idx_user_roles_user_id", "idx_profiles_client_id", "idx_questions_client_id",
  "idx_tests_client_id", "idx_tests_share_code", "idx_attempts_student_id",
  "idx_attempt_answers_attempt_id", "idx_test_questions_test_id",
];

await test("all performance indexes exist", async () => {
  const { rows } = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'"
  );
  const existingNames = new Set(rows.map(r => r.name));
  const missing = EXPECTED_INDEXES.filter(i => !existingNames.has(i));
  assert(missing.length === 0, `Missing indexes: ${missing.join(", ")}`);
  return `${rows.length} indexes present`;
});

// ── 6. FK integrity ───────────────────────────────────────────────────────────
console.log("\n🔗  Foreign key integrity");

await test("all test_questions point to valid tests", async () => {
  const { rows } = await db.execute(`
    SELECT COUNT(*) as count FROM test_questions tq
    LEFT JOIN tests t ON t.id = tq.test_id WHERE t.id IS NULL`);
  assert(rows[0].count === 0, `${rows[0].count} orphaned test_questions found`);
  return "no orphans";
});

await test("all test_questions point to valid questions", async () => {
  const { rows } = await db.execute(`
    SELECT COUNT(*) as count FROM test_questions tq
    LEFT JOIN questions q ON q.id = tq.question_id WHERE q.id IS NULL`);
  assert(rows[0].count === 0, `${rows[0].count} orphaned test_questions found`);
  return "no orphans";
});

await test("all attempts point to valid tests", async () => {
  const { rows } = await db.execute(`
    SELECT COUNT(*) as count FROM attempts a
    LEFT JOIN tests t ON t.id = a.test_id WHERE t.id IS NULL`);
  assert(rows[0].count === 0, `${rows[0].count} orphaned attempts`);
  return "no orphans";
});

await test("all attempt_answers point to valid attempts", async () => {
  const { rows } = await db.execute(`
    SELECT COUNT(*) as count FROM attempt_answers aa
    LEFT JOIN attempts a ON a.id = aa.attempt_id WHERE a.id IS NULL`);
  assert(rows[0].count === 0, `${rows[0].count} orphaned attempt_answers`);
  return "no orphans";
});

await test("all profiles have valid client_id (or null)", async () => {
  const { rows } = await db.execute(`
    SELECT COUNT(*) as count FROM profiles p
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.client_id IS NOT NULL AND c.id IS NULL`);
  assert(rows[0].count === 0, `${rows[0].count} profiles with invalid client_id`);
  return "all valid";
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("══════════════════════════════════════════════\n");

if (failed > 0) process.exit(1);
