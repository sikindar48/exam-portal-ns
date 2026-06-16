/**
 * migrate-to-turso.mjs
 * 
 * Exports all data from Supabase and imports into Turso.
 * Keeps Supabase Auth untouched — only migrates table data.
 * 
 * Run:  node scripts/migrate-to-turso.mjs
 * 
 * Requirements:
 *   npm install @libsql/client @supabase/supabase-js
 */

import { createClient as createTurso } from "@libsql/client";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://vfarnhcjxvowjfyxadvm.supabase.co";

// ⚠️  Uses the service_role key to bypass RLS and read all data.
const SUPABASE_SERVICE_KEY = (
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ""
).trim();

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment.");
  console.error("   Get it from: Supabase Dashboard → Settings → API → service_role");
  console.error("   Then add to .env:  VITE_SUPABASE_SERVICE_ROLE_KEY=eyJ...");
  process.exit(1);
}

const TURSO_URL =
  "libsql://exam-portal-ns-software-solutions.aws-ap-south-1.turso.io";
const TURSO_TOKEN =
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiJmN2NhZTlkZC01OGU2LTRjOTQtOGI2YS03MjRiMGVhZjFmMjMiLCJpYXQiOjE3ODE1NzY2ODUsInJpZCI6ImQyYzcxZTJlLWY1YzItNDBhMy1hYzIwLTFiZmIyYjAyOTUxMCJ9.3UvMxF5cdcXu7faGg4WakL4w2liOLU67w650zRxB2RY0ccEbrBUrP1vmZyWL63DAs3Q7qfaSnPysx92zsjVxAA";

// ── Clients ───────────────────────────────────────────────────────────────────
const supabase = createSupabase(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const turso = createTurso({ url: TURSO_URL, authToken: TURSO_TOKEN });

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert PostgreSQL boolean to SQLite integer */
const bool = (v) => (v ? 1 : 0);

/** Normalize timestamp — keep as ISO string, null if missing */
const ts = (v) => v ?? null;

/** Log with timestamp */
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

/** Fetch all rows from a Supabase table, handling pagination */
async function fetchAll(table) {
  const pageSize = 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Supabase fetch error on ${table}: ${error.message}`);
    if (!data || data.length === 0) break;

    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

/** Run inserts in batches to avoid hitting Turso limits */
async function batchInsert(statements) {
  const BATCH = 50;
  for (let i = 0; i < statements.length; i += BATCH) {
    await turso.batch(statements.slice(i, i + BATCH), "write");
  }
}

// ── Schema ────────────────────────────────────────────────────────────────────

async function applySchema() {
  log("Applying Turso schema...");

  // Read and execute schema file line by line
  const { readFileSync } = await import("fs");
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");

  const __dir = dirname(fileURLToPath(import.meta.url));
  const schemaSQL = readFileSync(join(__dir, "../turso-schema.sql"), "utf8");

  // Remove comment lines, then split on semicolons
  const stripped = schemaSQL
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = stripped
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Execute sequentially so FKs and indexes respect table creation order
  for (const stmt of statements) {
    await turso.execute(stmt);
  }

  log("Schema applied.");
}

// ── Table Migrations ──────────────────────────────────────────────────────────

async function migrateClients() {
  const rows = await fetchAll("clients");
  log(`Migrating clients: ${rows.length} rows`);

  const stmts = rows.map((r) => ({
    sql: `INSERT OR REPLACE INTO clients 
          (id, name, address, logo_url, active_status, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?)`,
    args: [r.id, r.name, r.address ?? null, r.logo_url ?? null,
           bool(r.active_status), ts(r.created_at), ts(r.updated_at)],
  }));

  await batchInsert(stmts);
  log(`✓ clients done`);
}

async function migrateProfiles() {
  const rows = await fetchAll("profiles");
  log(`Migrating profiles: ${rows.length} rows`);

  const stmts = rows.map((r) => ({
    sql: `INSERT OR REPLACE INTO profiles 
          (id, name, email, client_id, created_at, updated_at)
          VALUES (?,?,?,?,?,?)`,
    args: [r.id, r.name, r.email, r.client_id ?? null,
           ts(r.created_at), ts(r.updated_at)],
  }));

  await batchInsert(stmts);
  log(`✓ profiles done`);
}

async function migrateUserRoles() {
  const rows = await fetchAll("user_roles");
  log(`Migrating user_roles: ${rows.length} rows`);

  const stmts = rows.map((r) => ({
    sql: `INSERT OR REPLACE INTO user_roles (id, user_id, role, client_id)
          VALUES (?,?,?,?)`,
    args: [r.id, r.user_id, r.role, r.client_id ?? null],
  }));

  await batchInsert(stmts);
  log(`✓ user_roles done`);
}

async function migrateQuestionFolders() {
  const rows = await fetchAll("question_folders");
  log(`Migrating question_folders: ${rows.length} rows`);

  const stmts = rows.map((r) => ({
    sql: `INSERT OR REPLACE INTO question_folders
          (id, client_id, name, parent_id, created_at, updated_at)
          VALUES (?,?,?,?,?,?)`,
    args: [r.id, r.client_id, r.name, r.parent_id ?? null,
           ts(r.created_at), ts(r.updated_at)],
  }));

  await batchInsert(stmts);
  log(`✓ question_folders done`);
}

async function migrateQuestions() {
  const rows = await fetchAll("questions");
  log(`Migrating questions: ${rows.length} rows`);

  const stmts = rows.map((r) => ({
    sql: `INSERT OR REPLACE INTO questions
          (id, client_id, folder_id, question_text, option_a, option_b, option_c, option_d,
           correct_answer, difficulty, marks, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [r.id, r.client_id, r.folder_id ?? null, r.question_text,
           r.option_a, r.option_b, r.option_c, r.option_d,
           r.correct_answer, r.difficulty ?? null, r.marks ?? 1,
           ts(r.created_at), ts(r.updated_at)],
  }));

  await batchInsert(stmts);
  log(`✓ questions done`);
}

async function migrateTestFolders() {
  const rows = await fetchAll("test_folders");
  log(`Migrating test_folders: ${rows.length} rows`);

  const stmts = rows.map((r) => ({
    sql: `INSERT OR REPLACE INTO test_folders (id, client_id, name, created_at, updated_at)
          VALUES (?,?,?,?,?)`,
    args: [r.id, r.client_id, r.name, ts(r.created_at), ts(r.updated_at)],
  }));

  await batchInsert(stmts);
  log(`✓ test_folders done`);
}

async function migrateTests() {
  const rows = await fetchAll("tests");
  log(`Migrating tests: ${rows.length} rows`);

  const stmts = rows.map((r) => ({
    sql: `INSERT OR REPLACE INTO tests
          (id, client_id, folder_id, test_name, timer, shuffle, allow_review,
           negative_marking, negative_marks, restrict_navigation, attempts_allowed,
           status, active, allow_guests, scheduled_start, scheduled_end,
           share_code, public_link_enabled, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      r.id, r.client_id, r.folder_id ?? null, r.test_name, r.timer,
      bool(r.shuffle), bool(r.allow_review),
      bool(r.negative_marking), r.negative_marks ?? 0,
      bool(r.restrict_navigation), r.attempts_allowed ?? 1,
      r.status ?? "draft", bool(r.active),
      bool(r.allow_guests), ts(r.scheduled_start), ts(r.scheduled_end),
      r.share_code ?? null, bool(r.public_link_enabled),
      ts(r.created_at), ts(r.updated_at),
    ],
  }));

  await batchInsert(stmts);
  log(`✓ tests done`);
}

async function migrateTestSections() {
  const rows = await fetchAll("test_sections");
  log(`Migrating test_sections: ${rows.length} rows`);

  const stmts = rows.map((r) => ({
    sql: `INSERT OR REPLACE INTO test_sections (id, test_id, name, position, created_at)
          VALUES (?,?,?,?,?)`,
    args: [r.id, r.test_id, r.name, r.position ?? null, ts(r.created_at)],
  }));

  await batchInsert(stmts);
  log(`✓ test_sections done`);
}

async function migrateTestQuestions() {
  const rows = await fetchAll("test_questions");
  log(`Migrating test_questions: ${rows.length} rows`);

  const stmts = rows.map((r) => ({
    sql: `INSERT OR REPLACE INTO test_questions
          (id, test_id, question_id, section_id, position)
          VALUES (?,?,?,?,?)`,
    args: [r.id, r.test_id, r.question_id, r.section_id ?? null, r.position ?? null],
  }));

  await batchInsert(stmts);
  log(`✓ test_questions done`);
}

async function migrateAttempts() {
  const rows = await fetchAll("attempts");
  log(`Migrating attempts: ${rows.length} rows`);

  const stmts = rows.map((r) => ({
    sql: `INSERT OR REPLACE INTO attempts
          (id, student_id, test_id, score, total_marks, submitted_at, time_taken, status)
          VALUES (?,?,?,?,?,?,?,?)`,
    args: [r.id, r.student_id, r.test_id, r.score ?? null,
           r.total_marks ?? null, ts(r.submitted_at),
           r.time_taken ?? null, r.status ?? "in_progress"],
  }));

  await batchInsert(stmts);
  log(`✓ attempts done`);
}

async function migrateAttemptAnswers() {
  const rows = await fetchAll("attempt_answers");
  log(`Migrating attempt_answers: ${rows.length} rows`);

  const stmts = rows.map((r) => ({
    sql: `INSERT OR REPLACE INTO attempt_answers
          (id, attempt_id, question_id, selected_option, marked_for_review)
          VALUES (?,?,?,?,?)`,
    args: [r.id, r.attempt_id, r.question_id,
           r.selected_option ?? null, bool(r.marked_for_review)],
  }));

  await batchInsert(stmts);
  log(`✓ attempt_answers done`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log("═══════════════════════════════════════");
  log("  Supabase → Turso Migration");
  log("═══════════════════════════════════════");

  try {
    // 1. Apply schema first
    await applySchema();

    // 2. Migrate in FK-safe order (parents before children)
    await migrateClients();
    await migrateProfiles();
    await migrateUserRoles();
    await migrateQuestionFolders();
    await migrateQuestions();
    await migrateTestFolders();
    await migrateTests();
    await migrateTestSections();
    await migrateTestQuestions();
    await migrateAttempts();
    await migrateAttemptAnswers();

    log("═══════════════════════════════════════");
    log("  ✅ Migration complete!");
    log("═══════════════════════════════════════");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

main();
