import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function main() {
  try {
    console.log("Fetching proctoring events from Turso...");
    const res = await client.execute("SELECT id, event_type, duration_seconds, has_evidence, storage_path, created_at FROM proctoring_events ORDER BY created_at DESC LIMIT 15");
    console.log("Proctoring events:", res.rows);
  } catch (err) {
    console.error("Error fetching proctoring events:", err);
  } finally {
    client.close();
  }
}

main();
