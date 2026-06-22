import { getDb } from "./db/db.js";
import "dotenv/config";

async function main() {
  const db = getDb();
  console.log("--- Proctoring Events ---");
  const { rows } = await db.execute(`
    SELECT pe.id, pe.attempt_id, pe.test_id, pe.event_type, pe.severity
    FROM proctoring_events pe
  `);
  console.log("Raw events count:", rows.length);
  console.log(rows);

  console.log("\n--- Associated Attempts ---");
  const { rows: attempts } = await db.execute(`
    SELECT id, test_id, student_id FROM attempts
  `);
  console.log(attempts);

  console.log("\n--- Associated Tests ---");
  const { rows: tests } = await db.execute(`
    SELECT id, test_name, client_id FROM tests
  `);
  console.log(tests);

  console.log("\n--- Associated Clients ---");
  const { rows: clients } = await db.execute(`
    SELECT id, name FROM clients
  `);
  console.log(clients);
}

main().catch(console.error);
