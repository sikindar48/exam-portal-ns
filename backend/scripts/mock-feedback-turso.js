import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing Turso env vars in .env");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function main() {
  try {
    const attempts = await client.execute("SELECT id, student_id, status FROM attempts LIMIT 10");
    console.log("Attempts in Turso:", attempts.rows);
    
    const submitted = attempts.rows.find(row => row.status === 'submitted');
    
    if (submitted) {
      console.log("Found submitted attempt:", submitted.id);
      await client.execute({
        sql: `UPDATE attempts 
              SET feedback_fast_smooth = 5,
                  feedback_easy_to_use = 4,
                  feedback_strong_security = 5,
                  feedback_faced_errors = 5,
                  feedback_good_design = 4,
                  feedback_text = 'Excellent exam portal experience, very fast!'
              WHERE id = ?`,
        args: [submitted.id]
      });
      console.log("Successfully updated feedback for attempt:", submitted.id);
    } else if (attempts.rows.length > 0) {
      const firstAttempt = attempts.rows[0];
      console.log("No submitted attempts found, updating status of first attempt to 'submitted' and adding feedback...");
      await client.execute({
        sql: `UPDATE attempts 
              SET status = 'submitted',
                  feedback_fast_smooth = 5,
                  feedback_easy_to_use = 4,
                  feedback_strong_security = 5,
                  feedback_faced_errors = 5,
                  feedback_good_design = 4,
                  feedback_text = 'Excellent exam portal experience, very fast!'
              WHERE id = ?`,
        args: [firstAttempt.id]
      });
      console.log("Successfully updated attempt:", firstAttempt.id);
    } else {
      console.log("No attempts found in the database. Please take an exam first to create an attempt.");
    }
  } catch (err) {
    console.error("Error executing queries:", err);
  } finally {
    client.close();
  }
}

main();
