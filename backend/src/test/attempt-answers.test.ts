import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../server.js";
import { getDb } from "../db/db.js";
import { vi } from "vitest";

vi.mock("../auth/auth.js", () => {
  return {
    getUser: async (req: any) => {
      const userId = req.headers["x-test-user-id"];
      if (!userId) return null;
      return { id: userId, email: req.headers["x-test-user-email"] || "test@example.com" };
    },
    requireUser: async (req: any, res: any) => {
      const userId = req.headers["x-test-user-id"];
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return null;
      }
      return { id: userId, email: req.headers["x-test-user-email"] || "test@example.com" };
    }
  };
});

async function seedAttemptAnswersData() {
  const db = getDb();
  await db.execute("DELETE FROM user_roles");
  await db.execute("DELETE FROM profiles");
  await db.execute("DELETE FROM attempt_answers");
  await db.execute("DELETE FROM attempts");
  await db.execute("DELETE FROM questions");
  await db.execute("DELETE FROM tests");
  await db.execute("DELETE FROM clients");

  await db.execute({
    sql: "INSERT INTO clients (id, name, active_status) VALUES (?, ?, ?)",
    args: ["client-1", "Client One", 1]
  });

  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["student-1", "Student One", "student1@test.com", "client-1"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-1", "student-1", "student", "client-1"]
  });

  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["student-2", "Student Two", "student2@test.com", "client-1"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-2", "student-2", "student", "client-1"]
  });

  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: ["test-1", "client-1", "Geography Test", 60, "published", 1]
  });

  await db.execute({
    sql: `INSERT INTO questions (id, client_id, question_text, option_a, option_b, option_c, option_d, correct_answer)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["q-1", "client-1", "What is the capital of France?", "London", "Paris", "Berlin", "Rome", "B"]
  });

  await db.execute({
    sql: `INSERT INTO attempts (id, student_id, test_id, status)
          VALUES (?, ?, ?, ?)`,
    args: ["attempt-1", "student-1", "test-1", "in_progress"]
  });

  await db.execute({
    sql: `INSERT INTO attempts (id, student_id, test_id, status)
          VALUES (?, ?, ?, ?)`,
    args: ["attempt-submitted", "student-1", "test-1", "submitted"]
  });
}

describe("Attempt Answers Endpoint /api/attempt-answers", () => {
  beforeAll(async () => {
    await seedAttemptAnswersData();
  });

  it("should block a student from writing answers for someone else's attempt", async () => {
    const res = await request(app)
      .post("/api/attempt-answers")
      .set("x-test-user-id", "student-2")
      .send([{
        attempt_id: "attempt-1",
        question_id: "q-1",
        selected_option: "B",
      }]);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Permission denied");
  });

  it("should allow a student to save answers on their own in_progress attempt", async () => {
    const res = await request(app)
      .post("/api/attempt-answers")
      .set("x-test-user-id", "student-1")
      .send([{
        attempt_id: "attempt-1",
        question_id: "q-1",
        selected_option: "B",
      }]);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should prevent a student from saving answers on a submitted attempt", async () => {
    const res = await request(app)
      .post("/api/attempt-answers")
      .set("x-test-user-id", "student-1")
      .send([{
        attempt_id: "attempt-submitted",
        question_id: "q-1",
        selected_option: "B",
      }]);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Cannot modify answers of a submitted attempt");
  });
});
