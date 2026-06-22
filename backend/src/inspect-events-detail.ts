import { getDb } from "./db/db.js";
import "dotenv/config";

async function main() {
  const db = getDb();
  console.log("--- Detail of events ---");
  const { rows } = await db.execute(`
    SELECT 
      pe.id as pe_id, 
      pe.attempt_id,
      pe.test_id as pe_test_id,
      t.id as t_id,
      t.client_id as t_client_id,
      c.name as client_name
    FROM proctoring_events pe
    LEFT JOIN attempts a ON a.id = pe.attempt_id
    LEFT JOIN tests t ON t.id = pe.test_id
    LEFT JOIN clients c ON c.id = t.client_id
  `);
  console.log(rows);
}

main().catch(console.error);
