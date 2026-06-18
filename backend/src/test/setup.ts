import { beforeAll, afterAll } from "vitest";
import { getDb } from "../db/db.js";
import fs from "fs";
import path from "path";

// Set environment variables before any code runs
process.env.NODE_ENV = "test";
process.env.TURSO_DATABASE_URL = "file:test.db";
process.env.TURSO_AUTH_TOKEN = "dummy-token";

beforeAll(async () => {
  const db = getDb();
  
  // Check if schema is already loaded
  let schemaLoaded = false;
  try {
    const res = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_roles'");
    schemaLoaded = res.rows.length > 0;
  } catch (e) {}

  if (!schemaLoaded) {
    const schemaPath = path.resolve(__dirname, "../../../docs/supabase/turso-schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    
    // Split sql by semicolon
    const statements = schemaSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const sql of statements) {
      try {
        await db.execute(sql);
      } catch (err: any) {
        console.error(`Failed to execute setup SQL: ${sql.slice(0, 50)}`, err.message);
      }
    }
  }
});

afterAll(async () => {
  // Keep the database file alive to avoid breaking active connection pool references in other test files.
});
