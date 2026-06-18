import { getDb } from "./db.js";
import "dotenv/config";

async function main() {
  const db = getDb();
  console.log("Running migration: ADD COLUMN ip_address TO attempts...");
  try {
    await db.execute("ALTER TABLE attempts ADD COLUMN ip_address TEXT");
    console.log("Migration completed successfully!");
  } catch (err: any) {
    if (err.message.includes("duplicate column name")) {
      console.log("Column ip_address already exists.");
    } else {
      console.error("Migration failed:", err.message);
    }
  }
}

main().catch(console.error);
