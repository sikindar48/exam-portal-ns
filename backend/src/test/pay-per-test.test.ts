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

async function seedTestBillingData() {
  const db = getDb();

  // Wait for migrations to run and create the tables
  let retries = 50;
  while (retries > 0) {
    const tableCheck = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='test_billing'");
    if (tableCheck.rows.length > 0) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
    retries--;
  }

  await db.execute("DELETE FROM user_roles");
  await db.execute("DELETE FROM profiles");
  await db.execute("DELETE FROM test_billing");
  await db.execute("DELETE FROM client_test_purchases");
  await db.execute("DELETE FROM test_questions");
  await db.execute("DELETE FROM questions");
  await db.execute("DELETE FROM attempts");
  await db.execute("DELETE FROM tests");
  await db.execute("DELETE FROM client_subscriptions");
  await db.execute("DELETE FROM client_limits");
  await db.execute("DELETE FROM clients");

  // Client 1 (Implicit Free Client)
  await db.execute({
    sql: "INSERT INTO clients (id, name, active_status) VALUES (?, ?, ?)",
    args: ["client-free", "Free Org", 1]
  });

  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["admin-free", "Free Admin", "admin@free.com", "client-free"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-admin-free", "admin-free", "clientadmin", "client-free"]
  });

  // Client 2 (Subscription Client)
  await db.execute({
    sql: "INSERT INTO clients (id, name, active_status) VALUES (?, ?, ?)",
    args: ["client-sub", "Subscription Org", 1]
  });
  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["admin-sub", "Sub Admin", "admin@sub.com", "client-sub"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-admin-sub", "admin-sub", "clientadmin", "client-sub"]
  });
  await db.execute({
    sql: `INSERT INTO client_subscriptions (client_id, plan_id, start_date, expiry_date, status, renewal_status)
          VALUES (?, 'starter', '2026-01-01', '2026-12-31', 'active', 'manual')`,
    args: ["client-sub"]
  });

  // Client 3 (Superadmin)
  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["superadmin-user", "Super Admin", "super@exam.com", null]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-super", "superadmin-user", "superadmin", null]
  });
}

describe("NS Exam Portal Pay Per Test & Fallback Model Integration Tests", () => {
  beforeAll(async () => {
    await seedTestBillingData();
  });

  describe("Implicit Free Plan Fallback", () => {
    it("should allow creating up to 3 exams for Free Plan organization", async () => {
      // Create Exam 1
      let res = await request(app)
        .post("/api/tests")
        .set("x-test-user-id", "admin-free")
        .send({ test_name: "Free Exam 1" });
      expect(res.status).toBe(201);

      // Create Exam 2
      res = await request(app)
        .post("/api/tests")
        .set("x-test-user-id", "admin-free")
        .send({ test_name: "Free Exam 2" });
      expect(res.status).toBe(201);

      // Create Exam 3
      res = await request(app)
        .post("/api/tests")
        .set("x-test-user-id", "admin-free")
        .send({ test_name: "Free Exam 3" });
      expect(res.status).toBe(201);

      // Create Exam 4 (Should Fail)
      res = await request(app)
        .post("/api/tests")
        .set("x-test-user-id", "admin-free")
        .send({ test_name: "Free Exam 4" });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Quota Exceeded");
    });
  });

  describe("Pay Per Test Purchase & Assignment Flow", () => {
    let purchaseId: string;
    let testId: string;

    it("should allow Super Admin to provision packages for clients", async () => {
      const res = await request(app)
        .post("/api/packages/purchase")
        .set("x-test-user-id", "superadmin-user")
        .send({
          client_id: "client-free",
          package_id: "base"
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      purchaseId = res.body.id;
    });

    it("should allow Client Admin to fetch their purchases", async () => {
      const res = await request(app)
        .get("/api/packages?type=purchases")
        .set("x-test-user-id", "admin-free");
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].id).toBe(purchaseId);
      expect(res.body[0].status).toBe("available");
    });

    it("should allow Super Admin to edit and delete available packages", async () => {
      let res = await request(app)
        .post("/api/packages/purchase")
        .set("x-test-user-id", "superadmin-user")
        .send({
          client_id: "client-free",
          package_id: "basic",
          custom_max_candidates: 100,
          custom_max_questions: 150
        });
      expect(res.status).toBe(201);
      const tempPurchaseId = res.body.id;

      res = await request(app)
        .patch("/api/packages/purchase")
        .set("x-test-user-id", "superadmin-user")
        .send({
          purchase_id: tempPurchaseId,
          custom_max_candidates: 200,
          custom_max_questions: 250
        });
      expect(res.status).toBe(200);

      res = await request(app)
        .get("/api/packages?type=purchases")
        .set("x-test-user-id", "admin-free");
      const found = res.body.find((p: any) => p.id === tempPurchaseId);
      expect(found).toBeDefined();
      expect(found.custom_max_candidates).toBe(200);
      expect(found.custom_max_questions).toBe(250);

      res = await request(app)
        .delete("/api/packages/purchase")
        .set("x-test-user-id", "superadmin-user")
        .send({
          purchase_id: tempPurchaseId
        });
      expect(res.status).toBe(200);

      res = await request(app)
        .get("/api/packages?type=purchases")
        .set("x-test-user-id", "admin-free");
      const deletedCheck = res.body.find((p: any) => p.id === tempPurchaseId);
      expect(deletedCheck).toBeUndefined();
    });

    it("should assign package to test during creation and mark it used", async () => {
      const res = await request(app)
        .post("/api/tests")
        .set("x-test-user-id", "admin-free")
        .send({
          test_name: "Pay Per Test Exam 1",
          purchase_id: purchaseId
        });
      expect(res.status).toBe(201);
      testId = res.body.id;

      // Verify purchase record is now "used"
      const db = getDb();
      const check = await db.execute({
        sql: "SELECT * FROM client_test_purchases WHERE id = ?",
        args: [purchaseId]
      });
      expect(check.rows[0].status).toBe("used");
      expect(check.rows[0].assigned_test_id).toBe(testId);

      // Verify test_billing record exists
      const billingCheck = await db.execute({
        sql: "SELECT * FROM test_billing WHERE test_id = ?",
        args: [testId]
      });
      expect(billingCheck.rows.length).toBe(1);
      expect(billingCheck.rows[0].max_candidates).toBe(50);
      expect(billingCheck.rows[0].max_questions).toBe(50);
      expect(billingCheck.rows[0].status).toBe("active");
    });

    it("should block editing or deleting an assigned package", async () => {
      // Try to edit
      let res = await request(app)
        .patch("/api/packages/purchase")
        .set("x-test-user-id", "superadmin-user")
        .send({
          purchase_id: purchaseId,
          custom_max_candidates: 200
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Cannot modify");

      // Try to delete
      res = await request(app)
        .delete("/api/packages/purchase")
        .set("x-test-user-id", "superadmin-user")
        .send({
          purchase_id: purchaseId
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Cannot delete");
    });
  });

  describe("Pay Per Test Limits & Read-Only Gating", () => {
    let testId: string;
    let purchaseId: string;

    beforeAll(async () => {
      const db = getDb();
      // Provision a Custom package with extremely low limits to test easily
      await db.execute(`INSERT OR REPLACE INTO test_packages (id, name, price, max_questions, max_candidates)
                        VALUES ('test-low', 'Low Package', 10.0, 2, 2)`);
      // Provision purchase
      purchaseId = "purch-low";
      await db.execute({
        sql: `INSERT OR REPLACE INTO client_test_purchases (id, client_id, package_id, status)
              VALUES (?, 'client-free', 'test-low', 'available')`,
        args: [purchaseId]
      });
      // Create test
      const res = await request(app)
        .post("/api/tests")
        .set("x-test-user-id", "admin-free")
        .send({
          test_name: "Low Limit Test",
          purchase_id: purchaseId,
          status: "published"
        });
      testId = res.body.id;
    });

    it("should enforce max questions limit", async () => {
      // Try to link 3 questions (low limit package only allows 2)
      const res = await request(app)
        .put(`/api/test-questions?test_id=${testId}`)
        .set("x-test-user-id", "admin-free")
        .send([
          { id: "q1", question_text: "Q1", correct_answer: "A", option_a: "A", option_b: "B", option_c: "C", option_d: "D" },
          { id: "q2", question_text: "Q2", correct_answer: "B", option_a: "A", option_b: "B", option_c: "C", option_d: "D" },
          { id: "q3", question_text: "Q3", correct_answer: "C", option_a: "A", option_b: "B", option_c: "C", option_d: "D" }
        ]);
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Quota Exceeded");

      // Link 2 questions (should succeed)
      const res2 = await request(app)
        .put(`/api/test-questions?test_id=${testId}`)
        .set("x-test-user-id", "admin-free")
        .send([
          { id: "q1", question_text: "Q1", correct_answer: "A", option_a: "A", option_b: "B", option_c: "C", option_d: "D", marks: 1 },
          { id: "q2", question_text: "Q2", correct_answer: "B", option_a: "A", option_b: "B", option_c: "C", option_d: "D", marks: 1 }
        ]);
      expect(res2.status).toBe(200);
    });

    it("should enforce candidate capacity, set test billing status completed, and mark test read_only", async () => {
      const db = getDb();
      
      // Attempt 1 (Allowed)
      let res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-user-1")
        .send({ test_id: testId, student_id: "student-user-1" });
      expect(res.status).toBe(201);

      // Attempt 2 (Allowed)
      res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-user-2")
        .send({ test_id: testId, student_id: "student-user-2" });
      expect(res.status).toBe(201);

      // Attempt 3 (Should be blocked)
      res = await request(app)
        .post("/api/attempts")
        .set("x-test-user-id", "student-user-3")
        .send({ test_id: testId, student_id: "student-user-3" });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Capacity Reached");

      // Verify db changes
      const testCheck = await db.execute({
        sql: "SELECT read_only FROM tests WHERE id = ?",
        args: [testId]
      });
      expect(Number(testCheck.rows[0].read_only)).toBe(1);

      const billingCheck = await db.execute({
        sql: "SELECT status FROM test_billing WHERE test_id = ?",
        args: [testId]
      });
      expect(billingCheck.rows[0].status).toBe("completed");
    });

    it("should allow harmless settings updates on read-only tests, but block structural updates", async () => {
      // Harmless change: Naming update (should succeed)
      let res = await request(app)
        .patch(`/api/tests?id=${testId}`)
        .set("x-test-user-id", "admin-free")
        .send({ test_name: "Low Limit Test corrected" });
      expect(res.status).toBe(200);

      // Structural change: attempts_allowed modification (should fail)
      res = await request(app)
        .patch(`/api/tests?id=${testId}`)
        .set("x-test-user-id", "admin-free")
        .send({ attempts_allowed: 5 });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Block: Modifying structural settings");
    });

    it("should allow Super Admin to edit master package templates", async () => {
      let res = await request(app)
        .patch("/api/packages")
        .set("x-test-user-id", "superadmin-user")
        .send({
          id: "basic",
          name: "Basic Premium",
          price: 249.00,
          max_questions: 60,
          max_candidates: 75,
          csv_import: 1,
          xlsx_export: 1,
          analytics: 1,
          custom_branding: 1,
          basic_proctoring: 1,
          camera_proctoring: 1,
          priority_support: 0,
          active: 1
        });
      expect(res.status).toBe(200);

      res = await request(app)
        .get("/api/packages")
        .set("x-test-user-id", "admin-free");
      expect(res.status).toBe(200);
      const pkg = res.body.find((p: any) => p.id === "basic");
      expect(pkg).toBeDefined();
      expect(pkg.name).toBe("Basic Premium");
      expect(pkg.price).toBe(249.00);
      expect(pkg.max_questions).toBe(60);
      expect(pkg.max_candidates).toBe(75);
      expect(pkg.camera_proctoring).toBe(1);
    });
  });
});
