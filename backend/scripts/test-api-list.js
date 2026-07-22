import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function main() {
  try {
    const sql = `
      SELECT a.id as attempt_id, a.submitted_at,
             a.feedback_fast_smooth, a.feedback_easy_to_use, a.feedback_strong_security,
             a.feedback_faced_errors, a.feedback_good_design, a.feedback_text,
             t.test_name, c.name as client_name, p.name as candidate_name, p.email as candidate_email
      FROM attempts a
      JOIN tests t ON t.id = a.test_id
      JOIN clients c ON c.id = t.client_id
      JOIN profiles p ON p.id = a.student_id
      WHERE a.feedback_fast_smooth IS NOT NULL
      ORDER BY a.submitted_at DESC LIMIT 20 OFFSET 0
    `;
    const res = await client.execute(sql);
    console.log("SQL Results:");
    console.log(res.rows);
  } catch (err) {
    console.error("Query failed:", err);
  } finally {
    client.close();
  }
}

main();
