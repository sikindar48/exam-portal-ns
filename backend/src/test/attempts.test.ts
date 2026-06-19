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

async function seedAttemptsData() {
  const db = getDb();
  await db.execute("DELETE FROM user_roles");
  await db.execute("DELETE FROM profiles");
  await db.execute("DELETE FROM attempts");
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
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["guest-1", "Guest One", "guest_12345678@temp.exam", "client-1"]
  });
  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["guest-2", "Guest Two", "guest_87654321@temp.exam", "client-1"]
  });

  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: ["test-1", "client-1", "Math Test", 60, "published", 1]
  });
}

describe("Attempts Endpoint /api/attempts", () => {
  beforeAll(async () => {
    await seedAttemptsData();
  });

  it("should block attempts with invalid UUID validation payloads", async () => {
    const res = await request(app)
      .post("/api/attempts")
      .set("x-test-user-id", "student-1")
      .send({
        test_id: "", // Invalid parameter
      });
    expect(res.status).toBe(400);
  });

  it("should successfully create a new attempt", async () => {
    const res = await request(app)
      .post("/api/attempts")
      .set("x-test-user-id", "student-1")
      .send({
        test_id: "test-1",
        status: "in_progress",
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe("in_progress");
  });

  it("should resume the existing in_progress attempt rather than creating a duplicate", async () => {
    const res = await request(app)
      .post("/api/attempts")
      .set("x-test-user-id", "student-1")
      .send({
        test_id: "test-1",
        status: "in_progress",
      });
    expect(res.status).toBe(200); // 200 means resumed, 201 means created
  });

  it("should prevent a student from accessing another student's history", async () => {
    const res = await request(app)
      .get("/api/attempts?student_id=student-1")
      .set("x-test-user-id", "student-2");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Permission denied");
  });

  it("should ensure guest users on the same IP receive unique attempts and do not share them", async () => {
    // 1. Create a guest attempt
    const resCreate = await request(app)
      .post("/api/attempts")
      .set("x-test-user-id", "anon-user-1")
      .send({
        student_id: "guest-1",
        test_id: "test-1",
        status: "in_progress",
      });
    expect(resCreate.status).toBe(201);
    expect(resCreate.body.student_id).toBe("guest-1");
    const attemptId = resCreate.body.id;

    // 2. Try to resume/create with a different guest profile (e.g. guest-2) on the same IP
    const resResume = await request(app)
      .post("/api/attempts")
      .set("x-test-user-id", "anon-user-2")
      .send({
        student_id: "guest-2",
        test_id: "test-1",
        status: "in_progress",
      });
    expect(resResume.status).toBe(201); // should create a new one!
    expect(resResume.body.id).not.toBe(attemptId);
    expect(resResume.body.student_id).toBe("guest-2");

    // 3. Resuming with the same guest profile should return 200
    const resResumeSame = await request(app)
      .post("/api/attempts")
      .set("x-test-user-id", "anon-user-2")
      .send({
        student_id: "guest-2",
        test_id: "test-1",
        status: "in_progress",
      });
    expect(resResumeSame.status).toBe(200);
    expect(resResumeSame.body.id).toBe(resResume.body.id);
  });
});

