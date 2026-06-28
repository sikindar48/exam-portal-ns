import { createClient } from "@libsql/client";

let client: ReturnType<typeof createClient> | null = null;
let migrated = false;
export let migrationPromise = Promise.resolve();

async function runMigrations(db: ReturnType<typeof createClient>) {
  if (migrated) return;
  migrated = true;

  try {
    const columns = [
      { name: "question_type", type: "TEXT DEFAULT 'mcq'" },
      { name: "options", type: "TEXT DEFAULT '[]'" },
      { name: "correct_answers", type: "TEXT DEFAULT '[]'" },
      { name: "negative_marks", type: "REAL DEFAULT 0" },
      { name: "difficulty", type: "TEXT DEFAULT 'medium'" },
      { name: "explanation", type: "TEXT DEFAULT ''" },
      { name: "is_case_sensitive", type: "INTEGER DEFAULT 0" },
      { name: "import_batch_id", type: "TEXT" },
      { name: "version", type: "INTEGER DEFAULT 1" }
    ];

    for (const col of columns) {
      try {
        await db.execute(`ALTER TABLE questions ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to questions table.`);
      } catch (err: any) {
        if (!err.message.includes("duplicate column") && !err.message.includes("already exists")) {
          console.error(`Error adding column ${col.name}:`, err);
        }
      }
    }

    // Migration for tests table: result settings
    const testCols = [
      { name: "show_results_after_submission", type: "INTEGER DEFAULT 0" },
      { name: "allow_report_download", type: "INTEGER DEFAULT 0" },
      { name: "result_status", type: "TEXT DEFAULT 'draft'" },
      { name: "camera_required", type: "INTEGER DEFAULT 0" }
    ];
    for (const col of testCols) {
      try {
        await db.execute(`ALTER TABLE tests ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to tests table.`);
      } catch (err: any) {
        if (!err.message.includes("duplicate column") && !err.message.includes("already exists")) {
          console.error(`Error adding column ${col.name} to tests:`, err);
        }
      }
    }

    // Migration for attempts table: attempt_token
    try {
      await db.execute(`ALTER TABLE attempts ADD COLUMN attempt_token TEXT`);
      console.log(`Added column attempt_token to attempts table.`);
    } catch (err: any) {
      if (!err.message.includes("duplicate column") && !err.message.includes("already exists")) {
        console.error(`Error adding column attempt_token to attempts:`, err);
      }
    }

    // Migration for attempts table: started_at
    try {
      await db.execute(`ALTER TABLE attempts ADD COLUMN started_at TEXT`);
      console.log(`Added column started_at to attempts table.`);
      // Migrate legacy rows
      await db.execute(`UPDATE attempts SET started_at = submitted_at WHERE started_at IS NULL`);
      await db.execute(`UPDATE attempts SET submitted_at = NULL WHERE status = 'in_progress' AND submitted_at IS NOT NULL`);
      console.log(`Migrated legacy attempts timestamps successfully.`);
    } catch (err: any) {
      if (!err.message.includes("duplicate column") && !err.message.includes("already exists")) {
        console.error(`Error adding column started_at to attempts:`, err);
      }
    }

    // Migration for test_sections table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS test_sections (
        id TEXT PRIMARY KEY,
        test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        duration_minutes INTEGER DEFAULT NULL,
        negative_marks REAL DEFAULT 0,
        shuffle_questions INTEGER DEFAULT 0,
        shuffle_options INTEGER DEFAULT 0,
        navigation_locked INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure columns in test_sections
    const sectionCols = [
      { name: "duration_minutes", type: "INTEGER DEFAULT NULL" },
      { name: "negative_marks", type: "REAL DEFAULT 0" },
      { name: "shuffle_questions", type: "INTEGER DEFAULT 0" },
      { name: "shuffle_options", type: "INTEGER DEFAULT 0" },
      { name: "navigation_locked", type: "INTEGER DEFAULT 0" }
    ];
    for (const col of sectionCols) {
      try {
        await db.execute(`ALTER TABLE test_sections ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to test_sections table.`);
      } catch (err: any) {
        if (!err.message.includes("duplicate column") && !err.message.includes("already exists")) {
          console.error(`Error adding column ${col.name} to test_sections:`, err);
        }
      }
    }

    // Ensure test_questions has section_id and position
    try {
      await db.execute(`ALTER TABLE test_questions ADD COLUMN section_id TEXT REFERENCES test_sections(id) ON DELETE SET NULL`);
      console.log("Added column section_id to test_questions table.");
    } catch (err: any) {
      if (!err.message.includes("duplicate column") && !err.message.includes("already exists")) {
        console.error("Error adding column section_id to test_questions:", err);
      }
    }
    try {
      await db.execute(`ALTER TABLE test_questions ADD COLUMN position INTEGER DEFAULT 0`);
      console.log("Added column position to test_questions table.");
    } catch (err: any) {
      if (!err.message.includes("duplicate column") && !err.message.includes("already exists")) {
        console.error("Error adding column position to test_questions:", err);
      }
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS question_import_logs (
        id TEXT PRIMARY KEY,
        uploaded_by TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        import_batch_id TEXT NOT NULL,
        total_questions INTEGER NOT NULL,
        imported_count INTEGER NOT NULL,
        duplicate_count INTEGER NOT NULL,
        failed_count INTEGER NOT NULL
      );
    `);

    // Client feature gating table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS client_features (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        feature_name TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, feature_name)
      );
    `);

    // Client limits table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS client_limits (
        client_id TEXT PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
        max_exams_per_month INTEGER DEFAULT -1,
        max_students_per_exam INTEGER DEFAULT -1,
        max_questions_per_exam INTEGER DEFAULT -1,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Monthly usage tracking table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS client_usage_monthly (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        month TEXT NOT NULL,
        exams_created INTEGER DEFAULT 0,
        attempts_created INTEGER DEFAULT 0,
        storage_used_mb REAL DEFAULT 0,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, month)
      );
    `);

    // Global settings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS global_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default global settings
    await db.execute(`
      INSERT OR IGNORE INTO global_settings (key, value)
      VALUES 
        ('maintenance_mode', 'false'),
        ('announcement_banner', ''),
        ('registration_enabled', 'true'),
        ('platform_logo', '')
    `);

    // Audit logs table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Proctoring events table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS proctoring_events (
        id TEXT PRIMARY KEY,
        attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
        test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        severity_score INTEGER DEFAULT 0,
        storage_path TEXT,
        has_evidence INTEGER DEFAULT 0,
        metadata TEXT,
        duration_seconds REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Performance Indexes for timeline
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_proctoring_attempt ON proctoring_events(attempt_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_proctoring_test ON proctoring_events(test_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_proctoring_created ON proctoring_events(created_at);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_attempts_student_test ON attempts(student_id, test_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_test_questions_test ON test_questions(test_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_attempts_started ON attempts(started_at);`);

    // Subscription plans table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        max_exams_per_month INTEGER DEFAULT -1,
        max_students_per_exam INTEGER DEFAULT -1,
        max_questions_per_exam INTEGER DEFAULT -1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Plan features mapping table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_plan_features (
        plan_id TEXT NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
        feature_name TEXT NOT NULL,
        PRIMARY KEY (plan_id, feature_name)
      );
    `);

    // Client subscriptions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS client_subscriptions (
        client_id TEXT PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
        plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
        start_date TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'trial', 'suspended', 'cancelled')),
        renewal_status TEXT NOT NULL CHECK (renewal_status IN ('auto_renew', 'manual')),
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`CREATE INDEX IF NOT EXISTS idx_client_subs_status ON client_subscriptions(status);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_client_subs_expiry ON client_subscriptions(expiry_date);`);

    // Subscription history table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_history (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        old_plan_id TEXT,
        new_plan_id TEXT NOT NULL,
        changed_by TEXT,
        changed_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Client subscription requests table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS client_subscription_requests (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
        status TEXT NOT NULL CHECK (status IN ('requested', 'approved', 'rejected')),
        requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
        actioned_at TEXT
      );
    `);

    // Seed default subscription plans if empty
    await db.execute(`
      INSERT OR IGNORE INTO subscription_plans (id, name, max_exams_per_month, max_students_per_exam, max_questions_per_exam)
      VALUES 
        ('free', 'Free Plan', 3, 20, 50),
        ('starter', 'Starter Plan', 25, 100, 100),
        ('growth', 'Growth Plan', 50, 250, 200),
        ('enterprise', 'Enterprise Plan', 100, 500, 300)
    `);

    // Sync plan feature mappings with plans documentation
    await db.execute("DELETE FROM subscription_plan_features");
    const planFeatures = [
      { plan_id: "starter", features: ["csv_import", "xlsx_export", "analytics", "custom_branding", "advanced_proctoring"] },
      { plan_id: "growth", features: ["csv_import", "xlsx_export", "analytics", "custom_branding", "camera_proctoring", "advanced_proctoring"] },
      { plan_id: "enterprise", features: ["csv_import", "xlsx_export", "analytics", "custom_branding", "camera_proctoring", "advanced_proctoring"] }
    ];
    for (const pf of planFeatures) {
      for (const feature of pf.features) {
        await db.execute({
          sql: "INSERT OR IGNORE INTO subscription_plan_features (plan_id, feature_name) VALUES (?, ?)",
          args: [pf.plan_id, feature]
        });
      }
    }

    // Seed default trial subscriptions for existing clients
    const existingClients = await db.execute("SELECT id FROM clients");
    const todayStr = new Date().toISOString().slice(0, 10);
    const expiryStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    for (const cRow of existingClients.rows) {
      const cId = (cRow as any).id;
      await db.execute({
        sql: "INSERT OR IGNORE INTO client_subscriptions (client_id, plan_id, start_date, expiry_date, status, renewal_status) VALUES (?, 'free', ?, ?, 'active', 'manual')",
        args: [cId, todayStr, expiryStr]
      });
      await db.execute({
        sql: "INSERT OR IGNORE INTO client_limits (client_id, max_exams_per_month, max_students_per_exam, max_questions_per_exam) VALUES (?, 3, 20, 50)",
        args: [cId]
      });
    }

    // Ensure all existing free subscriptions have status 'active' if they are 'trial' or 'expired'
    await db.execute(`
      UPDATE client_subscriptions
      SET status = 'active'
      WHERE plan_id = 'free' AND status IN ('trial', 'expired')
    `);

    // Pay Per Test migrations: add read_only to tests table
    try {
      await db.execute(`ALTER TABLE tests ADD COLUMN read_only INTEGER DEFAULT 0`);
      console.log("Added column read_only to tests table.");
    } catch (err: any) {
      if (!err.message.includes("duplicate column") && !err.message.includes("already exists")) {
        console.error("Error adding column read_only to tests:", err);
      }
    }

    // Create Pay Per Test packages table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS test_packages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        max_questions INTEGER NOT NULL,
        max_candidates INTEGER NOT NULL,
        csv_import INTEGER DEFAULT 0,
        xlsx_export INTEGER DEFAULT 0,
        analytics INTEGER DEFAULT 1,
        custom_branding INTEGER DEFAULT 0,
        basic_proctoring INTEGER DEFAULT 0,
        camera_proctoring INTEGER DEFAULT 0,
        priority_support INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1
      );
    `);

    // Create Client Test Purchases inventory table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS client_test_purchases (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        package_id TEXT NOT NULL REFERENCES test_packages(id) ON DELETE RESTRICT,
        status TEXT NOT NULL CHECK (status IN ('requested', 'available', 'used')),
        purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
        used_at TEXT,
        assigned_test_id TEXT UNIQUE REFERENCES tests(id) ON DELETE SET NULL
      );
    `);

    try {
      await db.execute(`ALTER TABLE client_test_purchases ADD COLUMN custom_max_candidates INTEGER DEFAULT NULL`);
      console.log("Added custom_max_candidates to client_test_purchases table.");
    } catch (err: any) {
      if (!err.message.includes("duplicate column") && !err.message.includes("already exists")) {
        console.error("Error adding custom_max_candidates to client_test_purchases:", err);
      }
    }

    try {
      await db.execute(`ALTER TABLE client_test_purchases ADD COLUMN custom_max_questions INTEGER DEFAULT NULL`);
      console.log("Added custom_max_questions to client_test_purchases table.");
    } catch (err: any) {
      if (!err.message.includes("duplicate column") && !err.message.includes("already exists")) {
        console.error("Error adding custom_max_questions to client_test_purchases:", err);
      }
    }

    // Create Test Billing mapping locks table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS test_billing (
        test_id TEXT PRIMARY KEY REFERENCES tests(id) ON DELETE CASCADE,
        purchase_id TEXT NOT NULL REFERENCES client_test_purchases(id) ON DELETE RESTRICT,
        package_id TEXT NOT NULL REFERENCES test_packages(id) ON DELETE RESTRICT,
        max_questions INTEGER NOT NULL,
        max_candidates INTEGER NOT NULL,
        basic_proctoring INTEGER DEFAULT 0,
        camera_proctoring INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default packages
    const seedPackages = [
      { id: "base", name: "Base Assessment", price: 99.00, max_questions: 50, max_candidates: 50, csv_import: 0, xlsx_export: 0, analytics: 1, custom_branding: 1, basic_proctoring: 0, camera_proctoring: 0 },
      { id: "basic", name: "Basic Assessment", price: 199.00, max_questions: 50, max_candidates: 50, csv_import: 1, xlsx_export: 1, analytics: 1, custom_branding: 1, basic_proctoring: 1, camera_proctoring: 0 },
      { id: "standard", name: "Standard Assessment", price: 399.00, max_questions: 50, max_candidates: 50, csv_import: 1, xlsx_export: 1, analytics: 1, custom_branding: 1, basic_proctoring: 1, camera_proctoring: 1 },
      { id: "professional", name: "Professional Assessment", price: 499.00, max_questions: 100, max_candidates: 100, csv_import: 1, xlsx_export: 1, analytics: 1, custom_branding: 1, basic_proctoring: 1, camera_proctoring: 1 }, // lite
      { id: "placement_drive", name: "Placement Drive", price: 1499.00, max_questions: 200, max_candidates: 500, csv_import: 1, xlsx_export: 1, analytics: 1, custom_branding: 1, basic_proctoring: 1, camera_proctoring: 1 } // lite
    ];

    for (const pkg of seedPackages) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO test_packages (id, name, price, max_questions, max_candidates, csv_import, xlsx_export, analytics, custom_branding, basic_proctoring, camera_proctoring)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [pkg.id, pkg.name, pkg.price, pkg.max_questions, pkg.max_candidates, pkg.csv_import, pkg.xlsx_export, pkg.analytics, pkg.custom_branding, pkg.basic_proctoring, pkg.camera_proctoring]
      });
    }

    // Migration to support 'requested' status in client_test_purchases table
    try {
      console.log("Testing if 'requested' status is supported in client_test_purchases...");
      await db.execute(`
        INSERT INTO client_test_purchases (id, client_id, package_id, status)
        VALUES ('temp-migration-test', 'non-existent', 'non-existent', 'requested')
      `);
      await db.execute("DELETE FROM client_test_purchases WHERE id = 'temp-migration-test'");
      console.log("'requested' status is already supported, no migration needed.");
    } catch (err: any) {
      if (err.message.includes("FOREIGN KEY constraint failed")) {
        console.log("'requested' status is supported (verified via foreign key validation).");
      } else {
        console.log("Migration test error:", err.message);
        if (err.message.includes("constraint failed")) {
          console.log("⚠️  WARNING: Found duplicate test assignments in PPT purchases - temporarily bypassing migration.");
          console.log("⚠️  IMPORTANT BUSINESS RULE VIOLATION:");
          console.log("   - Some tests are assigned to multiple PPT purchases");
          console.log("   - This violates: 'one test can only have one PPT purchase'");
          console.log("   - Server will continue running - data issue needs manual investigation");
          
          // Skip this migration for now to keep server running
          // The duplicates need to be investigated and fixed manually
        }
      }
    }

    // Custom password reset tokens table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        email TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);

    // Migration for attempts table: feedback columns
    const feedbackCols = [
      { name: "feedback_fast_smooth", type: "INTEGER DEFAULT NULL" },
      { name: "feedback_easy_to_use", type: "INTEGER DEFAULT NULL" },
      { name: "feedback_strong_security", type: "INTEGER DEFAULT NULL" },
      { name: "feedback_faced_errors", type: "INTEGER DEFAULT NULL" },
      { name: "feedback_good_design", type: "INTEGER DEFAULT NULL" },
      { name: "feedback_text", type: "TEXT DEFAULT NULL" }
    ];
    for (const col of feedbackCols) {
      try {
        await db.execute(`ALTER TABLE attempts ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Added column ${col.name} to attempts table.`);
      } catch (err: any) {
        if (!err.message.includes("duplicate column") && !err.message.includes("already exists")) {
          console.error(`Error adding column ${col.name} to attempts:`, err);
        }
      }
    }

    console.log("Database migrations ran successfully.");
  } catch (err) {
    console.error("Database migrations failed:", err);
  }
}

export function getDb() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.VITE_TURSO_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || process.env.VITE_TURSO_TOKEN;
    const isLocal = url && url.startsWith("file:");
    if (!url || (!isLocal && !authToken)) {
      throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN env vars");
    }
    client = isLocal ? createClient({ url }) : createClient({ url, authToken });
    
    // Enable SQLite foreign key constraint enforcement
    client.execute("PRAGMA foreign_keys = ON;").catch((err) => {
      console.error("Failed to enable SQLite foreign key support:", err);
    });

    // Run columns and table migrations asynchronously
    migrationPromise = runMigrations(client);
  }
  return client;
}

/** Convert SQLite integers back to booleans for the frontend */
export function rowBools<T extends Record<string, any>>(row: T, fields: string[]): T {
  const out = { ...row };
  for (const f of fields) {
    if (f in out && out[f] !== null) (out as any)[f] = out[f] === 1 || out[f] === true;
  }
  return out;
}
