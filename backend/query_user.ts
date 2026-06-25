import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing env variables");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function main() {
  const res = await client.execute(`
    SELECT p.email, p.name, ur.role 
    FROM profiles p 
    JOIN user_roles ur ON ur.user_id = p.id 
    WHERE ur.role = 'superadmin'
  `);
  console.table(res.rows);
}

main().catch(console.error);
