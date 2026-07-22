import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function main() {
  try {
    console.log("Checking if the attempt has feedback...");
    const feedbackCheck = await client.execute("SELECT id, student_id, test_id, feedback_fast_smooth FROM attempts WHERE id = 'bd5e6cc2-64f6-43b4-a576-3249c3ecaede'");
    console.log("Attempt details:", feedbackCheck.rows);

    const studentId = feedbackCheck.rows[0]?.student_id;
    const testId = feedbackCheck.rows[0]?.test_id;

    console.log("Checking if student profile exists...");
    const profileCheck = await client.execute({
      sql: "SELECT * FROM profiles WHERE id = ?",
      args: [studentId]
    });
    console.log("Profile details:", profileCheck.rows);

    console.log("Checking if test exists...");
    const testCheck = await client.execute({
      sql: "SELECT * FROM tests WHERE id = ?",
      args: [testId]
    });
    console.log("Test details:", testCheck.rows);

    const clientId = testCheck.rows[0]?.client_id;
    console.log("Checking if client exists...");
    const clientCheck = await client.execute({
      sql: "SELECT * FROM clients WHERE id = ?",
      args: [clientId]
    });
    console.log("Client details:", clientCheck.rows);

    console.log("Executing the full join query...");
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
    `;
    const res = await client.execute(sql);
    console.log("Query Results:", res.rows);
  } catch (err) {
    console.error("Error executing query test:", err);
  } finally {
    client.close();
  }
}

main();
