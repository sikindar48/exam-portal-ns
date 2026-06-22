# NS Exam Portal - E2E QA, Security, Exam Integrity & Production Readiness Audit

This document presents a comprehensive, execution-grounded audit of the NS Exam Portal codebase. The audit traces actual execution flows, verifies API constraints, analyzes database interactions, and tests multi-role permission boundaries.

---

## 1. Executive Summary

| Metrics Category | Score | Status / Verdict |
|---|---|---|
| **Production Readiness** | **68 / 100** | **Beta Ready** (Requires fixing critical security & guest auth gaps before full production release) |
| **Security Score** | **55 / 100** | Needs Attention (High-risk IDOR / BOLA and guest attempt validation issues present) |
| **Exam Integrity** | **82 / 100** | Good (Client-side proctoring telemetry is verified, though lacks cryptographic signatures) |
| **Performance Score** | **78 / 100** | Stable (Acceptable local times, bundle splitting is recommended for heavy vendor dependencies) |
| **Maintainability Score** | **75 / 100** | Good (Schema migrations and baseline testing are clean; frontend contains lint cleanup tasks) |

---

## 2. Phase-by-Phase Audit Findings

### Phase 0 – Environment Validation
* **Database Migrations**: **HEALTHY**. The startup index-creation order crash in [db.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/db/db.ts) was successfully resolved by reordering index creations to execute after tables are generated.
* **Baseline Tests**: All **35/35 integration tests** now pass cleanly in under 2 seconds.
* **Server Startups**: Backend starts without errors on port `8082`, and frontend compiles successfully.

### Phase 1 & 2 – Backend Integration & API Route Audit
Through our custom integration suite in [qa-audit.test.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/test/qa-audit.test.ts), we verified:
* **Tenant Isolation Leak**:
  * *Vulnerability*: Any authenticated student from **Tenant A** can read the full properties of an active, published test belonging to **Tenant B** via `GET /api/tests?id=<test_id>`. The isolation check on line 58 of `tests.ts` skips validation for any test where `active=1` and `status=published`, bypassing tenant boundaries.
  * *Severity*: **High** (Data exposure of proprietary exam structures).
* **Subscription Quota Bypass**:
  * *Behavior*: The system allows creating new attempts even if they exceed `max_students_per_exam` constraints in the manual `client_limits` table. This happens because the active subscription plan constraints (e.g. `Starter` plan limit of 100) take precedence and override manual limits.

### Phase 3 – Client Admin Portal Audit
* **Student CSV Import**: CSV/XLSX parser logic maps fields correctly to profiles.
* **Question Bank Mapping**: MCQ and legacy option structures are dynamically mapped, preventing database integrity failures during bulk uploads.
* **Section Timers & Locks**: Navigation locking prevents students from stepping backward into locked sections once they proceed forward.

### Phase 4 – Super Admin Portal Audit
* **Client Org Status**: Organization suspension works correctly; when `active_status` is updated to `0` in `clients`, attempts from students of that client are instantly blocked (returns `403 Forbidden`).
* **Maintenance Mode**: Global settings successfully gate student attempts, returning a `503 Service Unavailable` message when active.

### Phase 5 & 6 – Student & Exam Integrity Audit
* **Resume Behavior**: If a student refreshes or closes the browser mid-test, the backend resumes the attempt seamlessly, maintaining the duration counter.
* **Question/Option Shuffling**: The system shuffles questions correctly and preserves key-answer pairings.
* **Bypass Potential**: Proctoring events (tab switches/window blurs) rely heavily on the client browser emitting telemetry. DevTools tampering can suppress or forge these events since there is no server-side heartbeat verification.

### Phase 7 – Camera Proctoring Audit
* **Snapshot Storage**: Detections (`NO_FACE`, `MULTIPLE_FACES`) capture webcam screenshots, compress them, and save them.
* **Signed URLs**: The backend generates short-lived secure signed GCS URLs dynamically, preventing unauthorized exposure of candidate photographs.

---

## 3. High-Priority Issues & Actionable Fixes

### 🔴 Critical Security Vulnerability: Guest Attempt BOLA
* **File Location**: [backend/src/routes/attempt-answers.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/attempt-answers.ts#L38)
* **Root Cause**: The API grants read/write permissions to any caller if the attempt belongs to a guest user profile, without verifying if the caller is the actual owner of that guest session.
* **Reproduction**: Perform a `PATCH /api/attempt-answers` with another guest attempt's ID without passing a valid session token.
* **Recommended Fix**: Enforce the generated `attempt_token` as a mandatory request header or query parameter for all guest attempt reads and writes.

### 🟠 High Severity Bug: Cross-Tenant Published Test Leakage
* **File Location**: [backend/src/routes/tests.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/tests.ts#L57-L68)
* **Root Cause**: Line 58 explicitly allows cross-tenant access to tests if they are published:
  `const isPublicTest = row.active === 1 && row.status === "published";`
* **Recommended Fix**: Restrict cross-tenant direct test reads unless `public_link_enabled` is explicitly active and the guest access token matches.

---

## 4. Final Verdict

**BETA READY**: The platform's UI, question banks, section building, and database schema are in excellent shape. Once the **Guest Attempt BOLA** and **Cross-Tenant Test Leakage** are fixed, the platform will be ready for production/enterprise use.
