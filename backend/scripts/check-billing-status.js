import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function main() {
  try {
    const testId = '2ab0e3c0-c4ec-4d20-92da-48d9c11a71e9';
    console.log("Checking test_billing details...");
    const billing = await client.execute({
      sql: "SELECT * FROM test_billing WHERE test_id = ?",
      args: [testId]
    });
    console.log("test_billing:", billing.rows);

    const test = await client.execute({
      sql: "SELECT client_id FROM tests WHERE id = ?",
      args: [testId]
    });
    const clientId = test.rows[0]?.client_id;
    console.log("Client ID:", clientId);

    console.log("Checking client subscriptions...");
    const subs = await client.execute({
      sql: "SELECT * FROM client_subscriptions WHERE client_id = ?",
      args: [clientId]
    });
    console.log("Subscriptions:", subs.rows);

    console.log("Checking subscription features...");
    if (subs.rows.length > 0) {
      const feats = await client.execute({
        sql: "SELECT * FROM subscription_plan_features WHERE plan_id = ?",
        args: [subs.rows[0].plan_id]
      });
      console.log("Features list for plan:", feats.rows);
    }

    console.log("Checking client overrides in client_features...");
    const overrides = await client.execute({
      sql: "SELECT * FROM client_features WHERE client_id = ?",
      args: [clientId]
    });
    console.log("Overrides:", overrides.rows);

  } catch (err) {
    console.error("Error checking billing status:", err);
  } finally {
    client.close();
  }
}

main();
