import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function main() {
  try {
    console.log("Searching for profiles with name or email containing 'multiface'...");
    const profiles = await client.execute("SELECT * FROM profiles WHERE name LIKE '%multiface%' OR email LIKE '%multiface%'");
    console.log("Profiles found:", profiles.rows);

    if (profiles.rows.length > 0) {
      for (const profile of profiles.rows) {
        console.log(`\nFetching attempts for profile ${profile.id} (${profile.name})...`);
        const attempts = await client.execute({
          sql: "SELECT id, test_id, status, submitted_at, feedback_fast_smooth FROM attempts WHERE student_id = ? ORDER BY submitted_at DESC",
          args: [profile.id]
        });
        console.log("Attempts:", attempts.rows);

        for (const attempt of attempts.rows) {
          console.log(`Fetching proctoring events for attempt ${attempt.id}...`);
          const events = await client.execute({
            sql: "SELECT id, event_type, duration_seconds, has_evidence, storage_path, created_at FROM proctoring_events WHERE attempt_id = ?",
            args: [attempt.id]
          });
          console.log("Events:", events.rows);
        }
      }
    } else {
      console.log("No profiles matching 'multiface' found. Checking latest attempts...");
      const latestAttempts = await client.execute(`
        SELECT a.id, a.submitted_at, a.status, p.name, p.email 
        FROM attempts a 
        LEFT JOIN profiles p ON p.id = a.student_id 
        ORDER BY a.submitted_at DESC LIMIT 5
      `);
      console.log("Latest attempts:", latestAttempts.rows);
    }
  } catch (err) {
    console.error("Error searching database:", err);
  } finally {
    client.close();
  }
}

main();
