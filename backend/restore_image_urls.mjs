/**
 * Debug and fix: find exact question IDs linked to the test, check and fix their image_url
 */
import { createClient } from "@libsql/client";

import "dotenv/config";
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://exam-portal-ns-software-solutions.aws-ap-south-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const TEST_ID = "278e0614-3550-45f5-b42d-9acec8c6423f";

// Step 1: Find question IDs linked to the test
const { rows: tqRows } = await db.execute({
  sql: `SELECT tq.question_id, q.question_text, q.image_url
        FROM test_questions tq
        JOIN questions q ON q.id = tq.question_id
        WHERE tq.test_id = ?
        ORDER BY tq.position`,
  args: [TEST_ID],
});

console.log(`\nTest ${TEST_ID} has ${tqRows.length} questions:\n`);

// Image URL map keyed by text fragments
const textToUrl = [
  ["galaxy", "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=500"],
  ["computer hardware", "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500"],
  ["architectural", "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500"],
  ["programming language", "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500"],
  ["mountain peak", "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=500"],
  ["micro-circuitry", "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500"],
  ["microscopic", "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=500"],
  ["geometric pattern", "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500"],
];

const toFix = [];

for (const row of tqRows) {
  const id = row.question_id;
  const text = row.question_text || "";
  const currentUrl = row.image_url;

  const match = textToUrl.find(([fragment]) =>
    text.toLowerCase().includes(fragment.toLowerCase())
  );

  if (match) {
    const url = match[1];
    if (!currentUrl) {
      console.log(`  ❌ MISSING URL: "${text.substring(0, 55)}" [${id.substring(0, 8)}]`);
      toFix.push({ id, url, text });
    } else {
      console.log(`  ✅ HAS URL:    "${text.substring(0, 55)}" [${id.substring(0, 8)}]`);
    }
  } else {
    console.log(`  ⚪ No image:   "${text.substring(0, 55)}" [${id.substring(0, 8)}] url=${currentUrl || "null"}`);
  }
}

if (toFix.length === 0) {
  console.log("\n✅ All questions already have image_url set in DB. Issue is in API layer.");
} else {
  console.log(`\n🔧 Fixing ${toFix.length} questions directly by ID...\n`);
  for (const { id, url, text } of toFix) {
    const r = await db.execute({
      sql: "UPDATE questions SET image_url = ? WHERE id = ?",
      args: [url, id],
    });
    console.log(`  ${r.rowsAffected > 0 ? "✅" : "❌"} [${id.substring(0, 8)}] "${text.substring(0, 50)}"`);
  }
  console.log("\n✅ Done. Reload Builder now.");
}
