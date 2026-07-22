import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function main() {
  try {
    const res = await client.execute("SELECT id, test_name, camera_required FROM tests WHERE id = '2ab0e3c0-c4ec-4d20-92da-48d9c11a71e9'");
    console.log("Test details in Turso:", res.rows);
  } catch (err) {
    console.error("Error fetching test details:", err);
  } finally {
    client.close();
  }
}

main();
