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

async function seedTestData() {
  const db = getDb();
  await db.execute("DELETE FROM user_roles");
  await db.execute("DELETE FROM profiles");
  await db.execute("DELETE FROM test_sections");
  await db.execute("DELETE FROM test_questions");
  await db.execute("DELETE FROM questions");
  await db.execute("DELETE FROM tests");
  await db.execute("DELETE FROM clients");

  await db.execute({
    sql: "INSERT INTO clients (id, name, active_status) VALUES (?, ?, ?)",
    args: ["client-1", "Client One", 1]
  });
  await db.execute({
    sql: "INSERT INTO clients (id, name, active_status) VALUES (?, ?, ?)",
    args: ["client-2", "Client Two", 1]
  });

  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["super-user", "Super Admin", "super@test.com", null]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-1", "super-user", "superadmin", null]
  });

  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["c1-admin", "Client 1 Admin", "admin1@test.com", "client-1"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-2", "c1-admin", "clientadmin", "client-1"]
  });

  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["c2-admin", "Client 2 Admin", "admin2@test.com", "client-2"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-3", "c2-admin", "clientadmin", "client-2"]
  });

  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active, share_code)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ["test-c1", "client-1", "C1 Test", 60, "published", 1, "CODE1"]
  });

  await db.execute({
    sql: `INSERT INTO questions (id, client_id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks, question_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["q-1", "client-1", "Q1 Text", "A", "B", "C", "D", "A", 1, "mcq"]
  });
  await db.execute({
    sql: `INSERT INTO questions (id, client_id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks, question_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["q-2", "client-1", "Q2 Text", "A", "B", "C", "D", "B", 2, "mcq"]
  });
}

describe("Test Sections API", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  let createdSectionId: string;

  it("POST /api/test-sections - should allow admin to create a section", async () => {
    const res = await request(app)
      .post("/api/test-sections")
      .set("x-test-user-id", "c1-admin")
      .send({
        test_id: "test-c1",
        name: "Aptitude",
        duration_minutes: 30,
        negative_marks: 0.25,
        shuffle_questions: 1,
        navigation_locked: 1
      });
    
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe("Aptitude");
    expect(res.body.duration_minutes).toBe(30);
    expect(res.body.negative_marks).toBe(0.25);
    expect(res.body.shuffle_questions).toBe(1);
    expect(res.body.navigation_locked).toBe(1);
    
    createdSectionId = res.body.id;
  });

  it("GET /api/test-sections - should list sections for a test", async () => {
    const res = await request(app)
      .get("/api/test-sections?test_id=test-c1")
      .set("x-test-user-id", "c1-admin");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(createdSectionId);
    expect(res.body[0].name).toBe("Aptitude");
  });

  it("PATCH /api/test-sections - should update section properties", async () => {
    const res = await request(app)
      .patch(`/api/test-sections?id=${createdSectionId}`)
      .set("x-test-user-id", "c1-admin")
      .send({
        name: "Advanced Aptitude",
        duration_minutes: 45
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Advanced Aptitude");
    expect(res.body.duration_minutes).toBe(45);
  });

  it("POST /api/test-questions - should associate a question with a section", async () => {
    const res = await request(app)
      .post("/api/test-questions?test_id=test-c1")
      .set("x-test-user-id", "c1-admin")
      .send([
        { question_id: "q-1", section_id: createdSectionId, position: 0 },
        { question_id: "q-2", section_id: createdSectionId, position: 1 }
      ]);

    expect(res.status).toBe(201);
  });

  it("GET /api/test-questions - should return section details for test questions", async () => {
    const res = await request(app)
      .get("/api/test-questions?test_id=test-c1&with_answers=true")
      .set("x-test-user-id", "c1-admin");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0].section_id).toBe(createdSectionId);
    expect(res.body[0].section_name).toBe("Advanced Aptitude");
    expect(res.body[0].position).toBe(0);
  });

  it("DELETE /api/test-sections - should delete section and unset section_id in test_questions", async () => {
    const delRes = await request(app)
      .delete(`/api/test-sections?id=${createdSectionId}`)
      .set("x-test-user-id", "c1-admin");

    expect(delRes.status).toBe(200);

    const getQRes = await request(app)
      .get("/api/test-questions?test_id=test-c1")
      .set("x-test-user-id", "c1-admin");

    expect(getQRes.status).toBe(200);
    expect(getQRes.body[0].section_id).toBeNull();
    expect(getQRes.body[0].section_name).toBe("General Section");
  });
});
