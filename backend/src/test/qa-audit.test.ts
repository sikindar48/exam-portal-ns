import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { app } from "../server.js";
import { getDb } from "../db/db.js";

// Mock Firebase Admin
vi.mock("firebase-admin/app", () => ({
  getApps: () => [{ name: "[DEFAULT]" }],
  initializeApp: () => {},
  cert: () => {},
  applicationDefault: () => {},
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({
    getUserByEmail: async (email: string) => {
      if (email === "existing@test.com") {
        return { uid: "existing-uid" };
      }
      throw { code: "auth/user-not-found" };
    },
    createUser: async (data: any) => {
      return { uid: "new-user-uid" };
    },
    updateUser: async () => {},
    deleteUser: async () => {},
  }),
}));

vi.mock("firebase-admin/storage", () => ({
  getStorage: () => ({
    bucket: () => ({
      file: () => ({
        save: async () => {},
        getSignedUrl: async () => ["https://mocked-signed-url.com"],
      }),
    }),
  }),
}));

// Mock auth module
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

async function seedAuditData() {
  const db = getDb();
  await db.execute("DELETE FROM user_roles");
  await db.execute("DELETE FROM profiles");
  await db.execute("DELETE FROM test_questions");
  await db.execute("DELETE FROM questions");
  await db.execute("DELETE FROM attempts");
  await db.execute("DELETE FROM tests");
  await db.execute("DELETE FROM client_subscriptions");
  await db.execute("DELETE FROM client_limits");
  await db.execute("DELETE FROM client_usage_monthly");
  await db.execute("DELETE FROM clients");

  // Clients
  await db.execute({
    sql: "INSERT INTO clients (id, name, active_status) VALUES (?, ?, ?)",
    args: ["client-active", "Active Org", 1]
  });
  await db.execute({
    sql: "INSERT INTO clients (id, name, active_status) VALUES (?, ?, ?)",
    args: ["client-suspended", "Suspended Org", 0]
  });
  await db.execute({
    sql: "INSERT INTO clients (id, name, active_status) VALUES (?, ?, ?)",
    args: ["client-other", "Other Org", 1]
  });

  // Profiles & Roles
  // Super Admin
  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["super-user", "Super Admin User", "super@test.com", null]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-super", "super-user", "superadmin", null]
  });

  // Client Admin for Active Org
  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["admin-active", "Active Admin", "admin@active.com", "client-active"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-admin", "admin-active", "clientadmin", "client-active"]
  });

  // Student for Active Org
  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["student-active", "Active Student", "student@active.com", "client-active"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-student", "student-active", "student", "client-active"]
  });

  // Guest Student profile
  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["guest-user", "Guest User", "guest_123@temp.exam", "client-active"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-guest", "guest-user", "student", "client-active"]
  });

  // Guest Student profile 2
  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["guest-user-2", "Guest User 2", "guest_456@temp.exam", "client-active"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-guest-2", "guest-user-2", "student", "client-active"]
  });

  // Subscriptions & Limits
  await db.execute({
    sql: `INSERT INTO client_subscriptions (client_id, plan_id, start_date, expiry_date, status, renewal_status)
          VALUES (?, 'starter', '2026-01-01', '2026-12-31', 'active', 'manual')`,
    args: ["client-active"]
  });
  await db.execute({
    sql: `INSERT INTO client_limits (client_id, max_exams_per_month, max_students_per_exam, max_questions_per_exam)
          VALUES (?, 3, 10, 10)`,
    args: ["client-active"]
  });

  // Other Client subscription
  await db.execute({
    sql: `INSERT INTO client_subscriptions (client_id, plan_id, start_date, expiry_date, status, renewal_status)
          VALUES (?, 'starter', '2026-01-01', '2026-12-31', 'active', 'manual')`,
    args: ["client-other"]
  });

  // Tests
  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active, share_code, allow_guests, public_link_enabled, attempts_allowed, show_results_after_submission)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["test-active-pub", "client-active", "Active Pub Test", 60, "published", 1, "PUB1", 1, 1, 1, 1]
  });
  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active, share_code, allow_guests, public_link_enabled, attempts_allowed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["test-active-draft", "client-active", "Draft Test", 60, "draft", 1, "DRAFT1", 0, 0, 1]
  });
  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active, share_code, allow_guests, public_link_enabled, attempts_allowed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["test-suspended-pub", "client-suspended", "Suspended Org Test", 60, "published", 1, "SUSP1", 1, 1, 1]
  });
  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active, share_code, allow_guests, public_link_enabled, attempts_allowed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["test-other-pub", "client-other", "Other Org Test", 60, "published", 1, "OTH1", 0, 0, 1]
  });

  // Seed question & test-question association to satisfy foreign keys
  await db.execute({
    sql: `INSERT INTO questions (id, client_id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["q-1", "client-active", "Question 1", "A", "B", "C", "D", "A", 2]
  });
  await db.execute({
    sql: `INSERT INTO test_questions (id, test_id, question_id, position)
          VALUES (?, ?, ?, ?)`,
    args: ["tq-1", "test-active-pub", "q-1", 1]
  });
}

describe("NS Exam Portal QA Audit Integration Tests", () => {
  beforeAll(async () => {
    await seedAuditData();
  });

  describe("Authentication & User Creation", () => {
    it("should allow Client Admin to create a Student", async () => {
      const res = await request(app)
        .post("/api/create-user")
        .set("x-test-user-id", "admin-active")
        .send({
          email: "newstudent@test.com",
          password: "password123",
          name: "New Student",
          client_id: "client-active",
          role: "student"
        });
      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
    });

    it("should prevent Client Admin from creating a user with admin role", async () => {
      const res = await request(app)
        .post("/api/create-user")
        .set("x-test-user-id", "admin-active")
        .send({
          email: "anotheradmin@test.com",
          password: "password123",
          name: "Another Admin",
          client_id: "client-active",
          role: "clientadmin"
        });
      expect(res.status).toBe(403);
    });

    it("should prevent Client Admin from creating a student for a different tenant", async () => {
      const res = await request(app)
        .post("/api/create-user")
        .set("x-test-user-id", "admin-active")
        .send({
          email: "crossstudent@test.com",
          password: "password123",
          name: "Cross Student",
          client_id: "client-other",
          role: "student"
        });
      expect(res.status).toBe(403);
    });
  });

  describe("Subscription Enforcement Tests", () => {
    it("should block attempt creation when client subscription is expired", async () => {
      const db = getDb();
      await db.execute("UPDATE client_subscriptions SET status = 'expired' WHERE client_id = 'client-active'");

      const res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-active")
        .send({
          test_id: "test-active-pub",
          student_id: "student-active"
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("expired");
    });

    it("should block attempt creation when client subscription is suspended", async () => {
      const db = getDb();
      await db.execute("UPDATE client_subscriptions SET status = 'suspended' WHERE client_id = 'client-active'");

      const res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-active")
        .send({
          test_id: "test-active-pub",
          student_id: "student-active"
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("suspended");
    });

    it("should allow attempts when trial subscription is active", async () => {
      const db = getDb();
      await db.execute("UPDATE client_subscriptions SET status = 'trial' WHERE client_id = 'client-active'");

      const res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-active")
        .send({
          test_id: "test-active-pub",
          student_id: "student-active"
        });
      expect(res.status).toBe(201);
    });

    it("should allow attempts when active subscription is active", async () => {
      const db = getDb();
      await db.execute("UPDATE client_subscriptions SET status = 'active' WHERE client_id = 'client-active'");

      const res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-active")
        .send({
          test_id: "test-active-pub",
          student_id: "student-active"
        });
      // Clean previous attempts first to avoid maximum attempt limits
      await db.execute("DELETE FROM attempts WHERE test_id = 'test-active-pub'");
      const res2 = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-active")
        .send({
          test_id: "test-active-pub",
          student_id: "student-active"
        });
      expect(res2.status).toBe(201);
    });
  });

  describe("Schedule Enforcement Tests", () => {
    it("should block attempts when starting before scheduled_start", async () => {
      const db = getDb();
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      await db.execute({
        sql: "UPDATE tests SET scheduled_start = ? WHERE id = 'test-active-pub'",
        args: [futureDate]
      });

      const res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-active")
        .send({
          test_id: "test-active-pub",
          student_id: "student-active"
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("not started");
    });

    it("should block attempts when starting after scheduled_end", async () => {
      const db = getDb();
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      await db.execute({
        sql: "UPDATE tests SET scheduled_start = NULL, scheduled_end = ? WHERE id = 'test-active-pub'",
        args: [pastDate]
      });

      const res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-active")
        .send({
          test_id: "test-active-pub",
          student_id: "student-active"
        });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("expired");
    });

    it("should allow attempts when starting within the valid schedule window", async () => {
      const db = getDb();
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      await db.execute({
        sql: "UPDATE tests SET scheduled_start = ?, scheduled_end = ? WHERE id = 'test-active-pub'",
        args: [pastDate, futureDate]
      });

      // Clear any prior attempts first to satisfy attempt limits
      await db.execute("DELETE FROM attempts WHERE test_id = 'test-active-pub'");
      const res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-active")
        .send({
          test_id: "test-active-pub",
          student_id: "student-active"
        });
      expect(res.status).toBe(201);
    });
  });

  describe("Guest Security Tests", () => {
    let guestAttemptId: string;
    let guestToken: string;

    beforeAll(async () => {
      const db = getDb();
      await db.execute("UPDATE tests SET scheduled_start = NULL, scheduled_end = NULL WHERE id = 'test-active-pub'");
      await db.execute("DELETE FROM attempts WHERE test_id = 'test-active-pub'");

      const res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "guest-user")
        .send({
          test_id: "test-active-pub",
          student_id: "guest-user"
        });
      guestAttemptId = res.body.id;
      guestToken = res.body.attempt_token;
    });

    it("should block saving answers for guests with missing attempt token", async () => {
      const res = await request(app)
        .post("/api/attempt-answers")
        .set("x-test-user-id", "guest-user")
        .send([{ attempt_id: guestAttemptId, question_id: "q-1", selected_option: "A" }]);
      expect(res.status).toBe(403);
    });

    it("should block saving answers for guests with invalid attempt token", async () => {
      const res = await request(app)
        .post("/api/attempt-answers")
        .set("x-test-user-id", "guest-user")
        .set("x-attempt-token", "fake-token")
        .send([{ attempt_id: guestAttemptId, question_id: "q-1", selected_option: "A" }]);
      expect(res.status).toBe(403);
    });

    it("should allow saving answers for guests with valid attempt token", async () => {
      const res = await request(app)
        .post("/api/attempt-answers")
        .set("x-test-user-id", "guest-user")
        .set("x-attempt-token", guestToken)
        .send([{ attempt_id: guestAttemptId, question_id: "q-1", selected_option: "A" }]);
      expect(res.status).toBe(200);
    });

    it("should block guest user 2 from reading or updating guest user 1's attempt answers", async () => {
      const res = await request(app)
        .get(`/api/attempt-answers?attempt_id=${guestAttemptId}`)
        .set("x-test-user-id", "guest-user-2")
        .set("x-attempt-token", guestToken); // Although token is correct, guest-2 does not own the attempt!
      expect(res.status).toBe(403);
    });
  });

  describe("Proctoring API Tests", () => {
    let guestAttemptId: string;
    let guestToken: string;

    beforeAll(async () => {
      const db = getDb();
      await db.execute("DELETE FROM attempts WHERE test_id = 'test-active-pub'");
      const res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "guest-user")
        .send({
          test_id: "test-active-pub",
          student_id: "guest-user"
        });
      guestAttemptId = res.body.id;
      guestToken = res.body.attempt_token;
    });

    it("should allow uploading proctoring events with valid attempt token", async () => {
      const res = await request(app)
        .post("/api/proctoring/events")
        .set("x-test-user-id", "guest-user")
        .set("x-attempt-token", guestToken)
        .send({
          attempt_id: guestAttemptId,
          test_id: "test-active-pub",
          event_type: "TAB_SWITCH",
          duration_seconds: 5
        });
      expect(res.status).toBe(201);
    });

    it("should block uploading proctoring events without attempt token", async () => {
      const res = await request(app)
        .post("/api/proctoring/events")
        .set("x-test-user-id", "guest-user")
        .send({
          attempt_id: guestAttemptId,
          test_id: "test-active-pub",
          event_type: "TAB_SWITCH",
          duration_seconds: 5
        });
      expect(res.status).toBe(403);
    });

    it("should deduplicate events posted within 30 seconds", async () => {
      const res = await request(app)
        .post("/api/proctoring/events")
        .set("x-test-user-id", "guest-user")
        .set("x-attempt-token", guestToken)
        .send({
          attempt_id: guestAttemptId,
          test_id: "test-active-pub",
          event_type: "TAB_SWITCH",
          duration_seconds: 10
        });
      expect(res.status).toBe(200);
      expect(res.body.deduplicated).toBe(true);
    });
  });

  describe("Cross-Tenant Isolation Tests", () => {
    it("should block client admin from fetching other tenant's questions", async () => {
      const res = await request(app)
        .get("/api/questions?client_id=client-other")
        .set("x-test-user-id", "admin-active");
      expect(res.status).toBe(403);
    });

    it("should block client admin from fetching other tenant's user roles", async () => {
      const res = await request(app)
        .get("/api/user-roles?client_id=client-other")
        .set("x-test-user-id", "admin-active");
      expect(res.status).toBe(403);
    });

    it("should block student from fetching profiles of other users", async () => {
      const res = await request(app)
        .get("/api/profiles?id=admin-active")
        .set("x-test-user-id", "student-active");
      expect(res.status).toBe(403);
    });
  });

  describe("Exam Rule Tests", () => {
    it("should enforce maintenance mode gating", async () => {
      const db = getDb();
      await db.execute("UPDATE global_settings SET value = 'true' WHERE key = 'maintenance_mode'");

      const res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-active")
        .send({
          test_id: "test-active-pub",
          student_id: "student-active"
        });
      expect(res.status).toBe(503);

      await db.execute("UPDATE global_settings SET value = 'false' WHERE key = 'maintenance_mode'");
    });

    it("should block attempts on inactive tests", async () => {
      const db = getDb();
      await db.execute("UPDATE tests SET active = 0 WHERE id = 'test-active-pub'");

      const res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-active")
        .send({
          test_id: "test-active-pub",
          student_id: "student-active"
        });
      expect(res.status).toBe(403);
      await db.execute("UPDATE tests SET active = 1 WHERE id = 'test-active-pub'");
    });
  });

  describe("Result Integrity & Scoring Tests", () => {
    it("should compute positive grading scores correctly", async () => {
      const db = getDb();
      await db.execute("DELETE FROM attempts WHERE test_id = 'test-active-pub'");

      const resAttempt = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-active")
        .send({
          test_id: "test-active-pub",
          student_id: "student-active"
        });
      const attemptId = resAttempt.body.id;

      // Save correct answer A
      await request(app)
        .post("/api/attempt-answers")
        .set("x-test-user-id", "student-active")
        .send([{ attempt_id: attemptId, question_id: "q-1", selected_option: "A" }]);

      // Submit
      const resSubmit = await request(app)
        .post("/api/rpc/submit-attempt")
        .set("x-test-user-id", "student-active")
        .send({
          attempt_id: attemptId,
          time_taken: 30
        });

      expect(resSubmit.status).toBe(200);
      expect(resSubmit.body.score).toBe(2); // q-1 has marks = 2
    });

    it("should compute negative grading scores correctly", async () => {
      const db = getDb();
      await db.execute("UPDATE tests SET negative_marking = 1, negative_marks = 0.5 WHERE id = 'test-active-pub'");
      await db.execute("DELETE FROM attempts WHERE test_id = 'test-active-pub'");

      const resAttempt = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-active")
        .send({
          test_id: "test-active-pub",
          student_id: "student-active"
        });
      const attemptId = resAttempt.body.id;

      // Save wrong answer B
      await request(app)
        .post("/api/attempt-answers")
        .set("x-test-user-id", "student-active")
        .send([{ attempt_id: attemptId, question_id: "q-1", selected_option: "B" }]);

      // Submit
      const resSubmit = await request(app)
        .post("/api/rpc/submit-attempt")
        .set("x-test-user-id", "student-active")
        .send({
          attempt_id: attemptId,
          time_taken: 30
        });

      expect(resSubmit.status).toBe(200);
      expect(resSubmit.body.score).toBe(0); // score should not drop below 0 due to Math.max(0, score)
    });
  });
});
