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
    args: ["c1-student", "Client 1 Student", "student1@test.com", "client-1"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-3", "c1-student", "student", "client-1"]
  });

  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["c2-student", "Client 2 Student", "student2@test.com", "client-2"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-4", "c2-student", "student", "client-2"]
  });

  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active, share_code)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ["test-c1-active", "client-1", "C1 Active Test", 60, "published", 1, "CODE1"]
  });
  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active, share_code)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: ["test-c1-inactive", "client-1", "C1 Inactive Test", 60, "published", 0, "CODE2"]
  });
}

describe("Tests Endpoint /api/tests", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  describe("Authentication", () => {
    it("should return 401 when no auth header is provided", async () => {
      const res = await request(app).get("/api/tests");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });
  });

  describe("CORS / OPTIONS Preflight", () => {
    it("should respond with 204 to OPTIONS request and bypass auth", async () => {
      const res = await request(app)
        .options("/api/tests")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "GET");
      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    });
  });

  describe("Tenant Isolation (BOLA)", () => {
    it("should allow a client admin to fetch their own tests", async () => {
      const res = await request(app)
        .get("/api/tests")
        .set("x-test-user-id", "c1-admin");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it("should prevent a client admin from explicitly querying another client ID", async () => {
      const res = await request(app)
        .get("/api/tests?client_id=client-2")
        .set("x-test-user-id", "c1-admin");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Access denied");
    });

    it("should prevent a student from fetching single test belonging to another client", async () => {
      const res = await request(app)
        .get("/api/tests?id=test-c1-inactive")
        .set("x-test-user-id", "c2-student");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Access denied");
    });

    it("should return public test info by share code without authentication", async () => {
      const res = await request(app).get("/api/tests?share_code=CODE1");
      expect(res.status).toBe(200);
      expect(res.body.test_name).toBe("C1 Active Test");
    });
  });

  describe("Validation", () => {
    it("should return 400 validation error when posting invalid test data", async () => {
      const res = await request(app)
        .post("/api/tests")
        .set("x-test-user-id", "c1-admin")
        .send({
          test_name: "", // Invalid: empty name
          timer: 500, // Invalid: exceeds max 480
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("should successfully create a test when valid data is supplied", async () => {
      const res = await request(app)
        .post("/api/tests")
        .set("x-test-user-id", "c1-admin")
        .send({
          test_name: "Valid Integration Test",
          timer: 90,
          status: "draft"
        });
      expect(res.status).toBe(201);
      expect(res.body.test_name).toBe("Valid Integration Test");
      expect(res.body.timer).toBe(90);
    });
  });

  describe("Pagination", () => {
    it("should return a paginated object structure when page and limit query params are supplied", async () => {
      const res = await request(app)
        .get("/api/tests?page=1&limit=1")
        .set("x-test-user-id", "c1-admin");
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 1,
        total: 3 // 2 seeded + 1 created
      });
    });
  });
});
