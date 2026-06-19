# Codebase Implementation Status - NS Exam Portal

This document tracks the current implementation status of the features and architectural components in the NS Exam Portal, backed by direct codebase evidence.

---

## Fully Implemented Features

### 1. Multi-Tenant Organization (Clients)
* **Status**: Fully Implemented.
* **Evidence**: Supported by [clients.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/clients.ts), which contains the handlers for creating, editing, and listing client organizations. The database schema enforces tenant partitioning with the `client_id` field.

### 2. Authentication & Authorization Flow
* **Status**: Fully Implemented.
* **Evidence**: Integrated with Firebase Authentication. [auth.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/auth/auth.ts) decodes standard JWT ID tokens. User roles (`superadmin`, `clientadmin`, and `student`) are managed in the Turso database and verified at the route level via [authz.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/middleware/authz.ts) and [roles.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/services/roles.ts).

### 3. Assessment Builder
* **Status**: Fully Implemented.
* **Evidence**: Client-admin test configuration is managed via [tests.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/tests.ts). Question linking and ordered placement within sections uses the PUT handler in [test-questions.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/test-questions.ts#L146-L218) to replace/re-save selections.

### 4. Public Invite & Guest Candidate Joining
* **Status**: Fully Implemented.
* **Evidence**: Tests can be looked up publicly by share code without signing in via the public route handler in [tests.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/tests.ts#L22). Guest sessions are stored using Firebase Anonymous credentials and synced as transient records using `POST /api/profiles` ([profiles.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/profiles.ts)).

### 5. Exam Engine Execution & Autosave
* **Status**: Fully Implemented.
* **Evidence**: Exam engine runs via [attempts.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/attempts.ts), which manages the lifecycle of attempts. Answers are saved using a batch UPSERT command inside [attempt-answers.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/attempt-answers.ts) to handle high-frequency selections. Fullscreen locks and tab switch event listeners are implemented on the frontend.

### 6. Test Evaluation & Grading
* **Status**: Fully Implemented.
* **Evidence**: Processed server-side using the submit-attempt RPC handler in [submit-attempt.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/rpc/submit-attempt.ts). This compares student answers with target keys, registers points, and applies configured negative marking policies.

### 7. Test Cloning / Duplication
* **Status**: Fully Implemented.
* **Evidence**: Handled via the `/api/rpc/clone-test` route defined in [clone-test.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/rpc/clone-test.ts), which clones tests and links their questions to the cloned test ID.

---

## Partially Implemented Features

### 1. Guest IP-Based Attempt Resumption
* **Status**: Partially Implemented.
* **Evidence**: In [attempts.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/attempts.ts#L217), resumption by IP is disabled when `DISABLE_RATE_LIMITER` is set to `"true"` (which is standard during k6 testing rounds to prevent guest candidate ID conflicts).

---

## Not Implemented Features

### 1. Bulk Student Rostering via CSV
* **Status**: Not Implemented.
* **Evidence**: Frontend and backend lack batch import endpoints for students. Students are registered one by one by administrators calling [create-user.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/create-user.ts).

### 2. Impersonation Flow for Superadmins
* **Status**: Not Implemented.
* **Evidence**: The routes under `backend/src/routes` contain no support or handlers for user login impersonation or token generation.

### 3. Configurable Test Pass Threshold
* **Status**: Not Implemented.
* **Evidence**: The database schema in `tests` does not contain a `pass_threshold` column. The frontend hardcodes the pass rate threshold to 40% globally.

### 4. Per-Question Dashboard Analytics
* **Status**: Not Implemented.
* **Evidence**: Under [stats.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/stats.ts), only overall score metadata, count stats, and general dashboards are supported. Difficulty accuracy rates and distractor efficiency distributions are not implemented.

---

## Known Issues

* **None**: All critical concurrency issues (such as IP-based attempt session collisions) have been resolved.

---

## Technical Debt

### 1. Rate Limiting Bypass Vulnerability
* **Description**: Global and strict rate limiters are bypassed when `DISABLE_RATE_LIMITER=true` is set as an environment variable in production.
* **Fix**: Apply dedicated route-level limits to vulnerable administration and registration routes while maintaining a high bypass rate only for exam-taking nodes.

### 2. Serial Awaiting in Collection Routes
* **Description**: In `/api/attempts` ([attempts.ts](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/attempts.ts#L85)), queries for pagination counts and actual records are awaited sequentially rather than using parallel execution.
* **Fix**: Wrap count and page data promises in `Promise.all()` to decrease API round-trip latency.

---

## Pending Improvements

* **Confirm Submit Dialog**: Needs a modal showing a count of unanswered or marked-for-review questions before submission.
* **Repository Picker Search**: Test builder question picker needs a debounced search query filter to allow admins to search large databases.
* **Student Soft Delete**: Replacing cascades with an `is_active` profile status key to prevent complete history deletion.
