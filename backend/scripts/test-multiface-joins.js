import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function main() {
  try {
    const attemptId = '0b6891fb-0f74-4411-b977-04e642bd784d';
    console.log(`Checking attempt ${attemptId}...`);
    const attempt = await client.execute({
      sql: "SELECT * FROM attempts WHERE id = ?",
      args: [attemptId]
    });
    console.log("Attempt details:", attempt.rows[0]);

    if (attempt.rows[0]) {
      const studentId = attempt.rows[0].student_id;
      const testId = attempt.rows[0].test_id;

      console.log(`Checking student profile (${studentId})...`);
      const profile = await client.execute({
        sql: "SELECT * FROM profiles WHERE id = ?",
        args: [studentId]
      });
      console.log("Profile:", profile.rows[0]);

      console.log(`Checking test (${testId})...`);
      const test = await client.execute({
        sql: "SELECT * FROM tests WHERE id = ?",
        args: [testId]
      });
      console.log("Test:", test.rows[0]);

      if (test.rows[0]) {
        const clientId = test.rows[0].client_id;
        console.log(`Checking client (${clientId})...`);
        const org = await client.execute({
          sql: "SELECT * FROM clients WHERE id = ?",
          args: [clientId]
        });
        console.log("Client:", org.rows[0]);
      }
    }
  } catch (err) {
    console.error("Error checking joins:", err);
  } finally {
    client.close();
  }
}

main();
