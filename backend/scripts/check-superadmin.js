import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function main() {
  try {
    console.log("Checking superadmin roles in Turso...");
    const superadmins = await client.execute("SELECT * FROM user_roles WHERE role = 'superadmin'");
    console.log("Superadmins:", superadmins.rows);

    console.log("Checking all profiles to match their emails...");
    for (const admin of superadmins.rows) {
      const profile = await client.execute({
        sql: "SELECT name, email FROM profiles WHERE id = ?",
        args: [admin.user_id]
      });
      console.log(`User ID: ${admin.user_id} | Role: ${admin.role} | Profile:`, profile.rows[0]);
    }
  } catch (err) {
    console.error("Error checking roles:", err);
  } finally {
    client.close();
  }
}

main();
