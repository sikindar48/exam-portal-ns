-- ============================================================
-- Turso (libSQL / SQLite) schema
-- Converted from Supabase PostgreSQL schema
-- ============================================================

-- clients
CREATE TABLE IF NOT EXISTS clients (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  address     TEXT,
  logo_url    TEXT,
  active_status INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- profiles (id = supabase auth user UUID, kept as TEXT)
CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  client_id   TEXT REFERENCES clients(id) ON DELETE CASCADE,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('superadmin', 'clientadmin', 'student')),
  client_id   TEXT REFERENCES clients(id) ON DELETE CASCADE,
  UNIQUE(user_id, role)
);

-- question_folders
CREATE TABLE IF NOT EXISTS question_folders (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  parent_id   TEXT REFERENCES question_folders(id) ON DELETE CASCADE,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- questions
CREATE TABLE IF NOT EXISTS questions (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  folder_id       TEXT REFERENCES question_folders(id) ON DELETE SET NULL,
  question_text   TEXT NOT NULL,
  option_a        TEXT NOT NULL,
  option_b        TEXT NOT NULL,
  option_c        TEXT NOT NULL,
  option_d        TEXT NOT NULL,
  correct_answer  TEXT NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  difficulty      TEXT,
  marks           INTEGER DEFAULT 1,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

-- test_folders
CREATE TABLE IF NOT EXISTS test_folders (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- tests
CREATE TABLE IF NOT EXISTS tests (
  id                   TEXT PRIMARY KEY,
  client_id            TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  folder_id            TEXT REFERENCES test_folders(id) ON DELETE SET NULL,
  test_name            TEXT NOT NULL,
  timer                INTEGER NOT NULL,
  shuffle              INTEGER DEFAULT 0,
  allow_review         INTEGER DEFAULT 1,
  negative_marking     INTEGER DEFAULT 0,
  negative_marks       REAL DEFAULT 0,
  restrict_navigation  INTEGER DEFAULT 0,
  attempts_allowed     INTEGER DEFAULT 1,
  status               TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  active               INTEGER DEFAULT 1,
  allow_guests         INTEGER DEFAULT 0,
  scheduled_start      TEXT,
  scheduled_end        TEXT,
  share_code           TEXT UNIQUE,
  public_link_enabled  INTEGER DEFAULT 0,
  created_at           TEXT DEFAULT (datetime('now')),
  updated_at           TEXT DEFAULT (datetime('now'))
);

-- test_sections
CREATE TABLE IF NOT EXISTS test_sections (
  id          TEXT PRIMARY KEY,
  test_id     TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  position    INTEGER,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- test_questions
CREATE TABLE IF NOT EXISTS test_questions (
  id          TEXT PRIMARY KEY,
  test_id     TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  section_id  TEXT REFERENCES test_sections(id) ON DELETE SET NULL,
  position    INTEGER,
  UNIQUE(test_id, question_id)
);

-- attempts
CREATE TABLE IF NOT EXISTS attempts (
  id           TEXT PRIMARY KEY,
  student_id   TEXT NOT NULL,
  test_id      TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  score        REAL,
  total_marks  REAL,
  submitted_at TEXT DEFAULT (datetime('now')),
  time_taken   INTEGER,
  status       TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted'))
);

-- attempt_answers
CREATE TABLE IF NOT EXISTS attempt_answers (
  id                TEXT PRIMARY KEY,
  attempt_id        TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id       TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option   TEXT CHECK (selected_option IN ('A','B','C','D')),
  marked_for_review INTEGER DEFAULT 0,
  UNIQUE(attempt_id, question_id)
);

-- ============================================================
-- Indexes (mirrors the Supabase performance indexes)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id         ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_client_id       ON user_roles(client_id);
CREATE INDEX IF NOT EXISTS idx_profiles_client_id         ON profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_questions_client_id        ON questions(client_id);
CREATE INDEX IF NOT EXISTS idx_questions_folder_id        ON questions(folder_id);
CREATE INDEX IF NOT EXISTS idx_tests_client_id            ON tests(client_id);
CREATE INDEX IF NOT EXISTS idx_tests_share_code           ON tests(share_code);
CREATE INDEX IF NOT EXISTS idx_tests_folder_id            ON tests(folder_id);
CREATE INDEX IF NOT EXISTS idx_tests_status               ON tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_scheduled_start      ON tests(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_attempts_student_id        ON attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test_id           ON attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id     ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_section_id  ON test_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_position    ON test_questions(position);
CREATE INDEX IF NOT EXISTS idx_test_sections_test_id      ON test_sections(test_id);
CREATE INDEX IF NOT EXISTS idx_test_folders_client_id     ON test_folders(client_id);
CREATE INDEX IF NOT EXISTS idx_question_folders_client_id ON question_folders(client_id);
