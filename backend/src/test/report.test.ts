import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../server.js";
import { getDb } from "../db/db.js";
import { vi } from "vitest";
import XLSX from "xlsx";

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
  await db.execute("DELETE FROM attempts");
  await db.execute("DELETE FROM tests");
  await db.execute("DELETE FROM clients");
  await db.execute("DELETE FROM questions");
  await db.execute("DELETE FROM test_questions");
  await db.execute("DELETE FROM attempt_answers");
  await db.execute("DELETE FROM client_subscriptions");
  await db.execute("DELETE FROM client_features");

  // Seed Client
  await db.execute({
    sql: "INSERT INTO clients (id, name, active_status) VALUES (?, ?, ?)",
    args: ["client-1", "Client One", 1]
  });

  // Seed Active Subscription to enable xlsx_export
  await db.execute({
    sql: "INSERT INTO client_subscriptions (client_id, plan_id, start_date, expiry_date, status, renewal_status) VALUES (?, 'enterprise', '2026-01-01', '2030-12-31', 'active', 'manual')",
    args: ["client-1"]
  });

  // Seed Admin & Student Profiles
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
    args: ["admin-1", "Admin One", "admin1@test.com", "client-1"]
  });
  await db.execute({
    sql: "INSERT INTO user_roles (id, user_id, role, client_id) VALUES (?, ?, ?, ?)",
    args: ["role-3", "admin-1", "clientadmin", "client-1"]
  });

  // Seed Guest Profile
  await db.execute({
    sql: "INSERT INTO profiles (id, name, email, client_id) VALUES (?, ?, ?, ?)",
    args: ["guest-1", "Guest User", "guest_abc123@temp.exam", "client-1"]
  });

  // Seed Tests
  // Test A: Results Enabled, Report Enabled, Published
  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active, show_results_after_submission, allow_report_download, result_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["test-enabled", "client-1", "Published Test", 60, "published", 1, 1, 1, "published"]
  });

  // Test B: Results Enabled, Report Disabled, Published
  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active, show_results_after_submission, allow_report_download, result_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["test-no-report", "client-1", "No Report Test", 60, "published", 1, 1, 0, "published"]
  });

  // Test C: Results Disabled, Report Enabled, Published
  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active, show_results_after_submission, allow_report_download, result_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["test-hidden", "client-1", "Hidden Results Test", 60, "published", 1, 0, 1, "draft"]
  });

  // Test D: Results Enabled, Report Enabled, Draft result_status
  await db.execute({
    sql: `INSERT INTO tests (id, client_id, test_name, timer, status, active, show_results_after_submission, allow_report_download, result_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["test-draft", "client-1", "Draft Results Test", 60, "published", 1, 0, 1, "draft"]
  });

  // Seed Question
  await db.execute({
    sql: `INSERT INTO questions (id, client_id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["q-1", "client-1", "What is 2+2?", "3", "4", "5", "6", "B", 1]
  });

  await db.execute({
    sql: "INSERT INTO test_questions (test_id, question_id) VALUES (?, ?)",
    args: ["test-enabled", "q-1"]
  });
  await db.execute({
    sql: "INSERT INTO test_questions (test_id, question_id) VALUES (?, ?)",
    args: ["test-no-report", "q-1"]
  });
  await db.execute({
    sql: "INSERT INTO test_questions (test_id, question_id) VALUES (?, ?)",
    args: ["test-hidden", "q-1"]
  });
  await db.execute({
    sql: "INSERT INTO test_questions (test_id, question_id) VALUES (?, ?)",
    args: ["test-draft", "q-1"]
  });

  // Seed Attempts
  // student-1 attempt for test-enabled
  await db.execute({
    sql: `INSERT INTO attempts (id, student_id, test_id, status, score, total_marks, time_taken, submitted_at, ip_address, attempt_token)
          VALUES (?, ?, ?, 'submitted', 1, 1, 120, datetime('now'), '127.0.0.1', 'token-enabled')`,
    args: ["attempt-enabled", "student-1", "test-enabled"]
  });
  await db.execute({
    sql: "INSERT INTO attempt_answers (attempt_id, question_id, selected_option) VALUES (?, ?, ?)",
    args: ["attempt-enabled", "q-1", "B"]
  });

  // student-1 attempt for test-no-report
  await db.execute({
    sql: `INSERT INTO attempts (id, student_id, test_id, status, score, total_marks, time_taken, submitted_at, ip_address, attempt_token)
          VALUES (?, ?, ?, 'submitted', 1, 1, 120, datetime('now'), '127.0.0.1', 'token-no-report')`,
    args: ["attempt-no-report", "student-1", "test-no-report"]
  });

  // student-1 attempt for test-hidden
  await db.execute({
    sql: `INSERT INTO attempts (id, student_id, test_id, status, score, total_marks, time_taken, submitted_at, ip_address, attempt_token)
          VALUES (?, ?, ?, 'submitted', 1, 1, 120, datetime('now'), '127.0.0.1', 'token-hidden')`,
    args: ["attempt-hidden", "student-1", "test-hidden"]
  });

  // student-1 attempt for test-draft
  await db.execute({
    sql: `INSERT INTO attempts (id, student_id, test_id, status, score, total_marks, time_taken, submitted_at, ip_address, attempt_token)
          VALUES (?, ?, ?, 'submitted', 1, 1, 120, datetime('now'), '127.0.0.1', 'token-draft')`,
    args: ["attempt-draft", "student-1", "test-draft"]
  });

  // guest-1 attempt for test-enabled
  await db.execute({
    sql: `INSERT INTO attempts (id, student_id, test_id, status, score, total_marks, time_taken, submitted_at, ip_address, attempt_token)
          VALUES (?, ?, ?, 'submitted', 1, 1, 120, datetime('now'), '127.0.0.1', 'token-guest-enabled')`,
    args: ["attempt-guest-enabled", "guest-1", "test-enabled"]
  });
}

function binaryParser(res: any, callback: any) {
  res.setEncoding("binary");
  let data = "";
  res.on("data", (chunk: any) => {
    data += chunk;
  });
  res.on("end", () => {
    callback(null, Buffer.from(data, "binary"));
  });
}

describe("Result Visibility & Report Download API Tests", () => {
  beforeAll(async () => {
    await seedTestData();
  });

  describe("GET /api/attempts/:id (Score leakage checks)", () => {
    it("should allow student to see score if results are published", async () => {
      const res = await request(app)
        .get("/api/attempts?id=attempt-enabled")
        .set("x-test-user-id", "student-1");
      expect(res.status).toBe(200);
      expect(res.body.score).toBe(1);
      expect(res.body.total_marks).toBe(1);
    });

    it("should mask/hide score for student if show_results_after_submission = 0", async () => {
      const res = await request(app)
        .get("/api/attempts?id=attempt-hidden")
        .set("x-test-user-id", "student-1");
      expect(res.status).toBe(200);
      expect(res.body.score).toBeNull();
      expect(res.body.total_marks).toBeNull();
    });

    it("should mask/hide score for student if result_status = 'draft'", async () => {
      const res = await request(app)
        .get("/api/attempts?id=attempt-draft")
        .set("x-test-user-id", "student-1");
      expect(res.status).toBe(200);
      expect(res.body.score).toBeNull();
      expect(res.body.total_marks).toBeNull();
    });

    it("should allow admin to see score even if results are draft/hidden", async () => {
      const res = await request(app)
        .get("/api/attempts?id=attempt-hidden")
        .set("x-test-user-id", "admin-1");
      expect(res.status).toBe(200);
      expect(res.body.score).toBe(1);
      expect(res.body.total_marks).toBe(1);
    });
  });

  describe("GET /api/attempts/:attemptId/report (XLSX report checks)", () => {
    it("should allow student owner to download report if visibility and downloads are enabled", async () => {
      const res = await request(app)
        .get("/api/attempts/attempt-enabled/report")
        .set("x-test-user-id", "student-1")
        .parse(binaryParser);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      
      // Parse workbook to check for sheets
      const workbook = XLSX.read(res.body, { type: "buffer" });
      expect(workbook.SheetNames).toContain("Summary");
      expect(workbook.SheetNames).toContain("Detailed Questions");
      expect(workbook.SheetNames).toContain("Analytics");
    });

    it("should block download for student owner if allow_report_download = 0", async () => {
      const res = await request(app)
        .get("/api/attempts/attempt-no-report/report")
        .set("x-test-user-id", "student-1");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Report download is not enabled for this test.");
    });

    it("should block download for student owner if show_results_after_submission = 0", async () => {
      const res = await request(app)
        .get("/api/attempts/attempt-hidden/report")
        .set("x-test-user-id", "student-1");
      expect(res.status).toBe(403);
    });

    it("should block download for student owner if result_status = 'draft'", async () => {
      const res = await request(app)
        .get("/api/attempts/attempt-draft/report")
        .set("x-test-user-id", "student-1");
      expect(res.status).toBe(403);
    });

    it("should allow admin to download report regardless of visibility settings", async () => {
      const res = await request(app)
        .get("/api/attempts/attempt-hidden/report")
        .set("x-test-user-id", "admin-1")
        .parse(binaryParser);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    });

    it("should block non-owner students from downloading report", async () => {
      const res = await request(app)
        .get("/api/attempts/attempt-enabled/report")
        .set("x-test-user-id", "student-2");
      expect(res.status).toBe(403);
    });

    it("should allow guest to download report with valid token query parameter", async () => {
      const res = await request(app)
        .get("/api/attempts/attempt-guest-enabled/report?token=token-guest-enabled")
        .set("x-test-user-id", "guest-user-session-id") // arbitrary auth user id matching middleware
        .parse(binaryParser);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    });

    it("should block guest from downloading report with invalid or missing token", async () => {
      const res = await request(app)
        .get("/api/attempts/attempt-guest-enabled/report")
        .set("x-test-user-id", "guest-user-session-id");
      expect(res.status).toBe(403);
    });
  });
});
