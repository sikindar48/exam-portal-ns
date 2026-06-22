Audit Result
I completed a code-grounded audit of the current repo state at /Users/nssikinar/Sites/exam-portal/exam-portal-ns. This was a static/code and build/test audit, not a full browser/manual penetration test against a live deployed system.
Overall Score: 52/100
Security Score: 38/100
Performance Score: 62/100
Maintainability Score: 55/100
SaaS Readiness Score: 58/100
Final verdict: Not Ready for production or enterprise exam use yet. The app has meaningful foundations, but there are several integrity and authorization issues that are too serious for a proctored assessment platform.
Critical Findings
Guest attempt authorization is unsafe
In [backend/src/routes/attempt-answers.ts (line 38)](/Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/attempt-answers.ts:38), [backend/src/routes/attempt-answers.ts (line 72)](/Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/attempt-answers.ts:72), [backend/src/routes/rpc/submit-attempt.ts (line 40)](/Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/rpc/submit-attempt.ts:40), and [backend/src/routes/proctoring.ts (line 270)](/Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/proctoring.ts:270), the code allows access when the target attempt belongs to any guest profile. That proves the attempt is a guest attempt, but not that the caller controls it. A logged-in user could read, modify, submit, or log events for another guest attempt if they know the attempt id.

attempt_token is generated but not enforced
[backend/src/routes/attempts.ts (line 369)](/Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/attempts.ts:369) creates an attempt_token, but answer save, report, proctoring, and submission routes do not consistently require it. This weakens guest resume, anti-tamper, and exam integrity controls.

Attempt creation does not enforce published/active/scheduled/guest rules strongly enough
[backend/src/routes/attempts.ts (line 315)](/Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/attempts.ts:315) fetches only client_id and active. It does not verify status = published, scheduled start/end windows, allow_guests, public_link_enabled, or attempts allowed before creating/resuming attempts.

Runtime migrations can fail silently
[backend/src/db/db.ts (line 239)](/Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/db/db.ts:239) creates indexes on client_subscriptions before the table is created at [backend/src/db/db.ts (line 264)](/Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/db/db.ts:264). Backend tests hit this immediately. Migration failure is caught and logged instead of failing startup, which can leave production partially migrated.

High Priority Findings
Rate limits are far too permissive for auth, attempt, answer-save, import, and proctoring endpoints: [backend/src/server.ts (line 35)](/Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/server.ts:35) allows 10,000 requests per 15 minutes, and the stricter limiter is defined but unused.
Public test lookup exposes full test rows via share code, including configuration fields: [backend/src/routes/tests.ts (line 24)](/Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/routes/tests.ts:24). It should return a minimal join payload.
CORS allows broad preview domains such as any .pages.dev and .firebaseapp.com: [backend/src/server.ts (line 76)](/Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/src/server.ts:76). That is risky with credentialed requests.
Proctoring is mostly client-generated telemetry. It detects tab/camera events, but backend trust is too high and event authenticity is weak.
Subscription expiry/trial expiry appears modeled, but enforcement is incomplete across workflows. Test creation checks some limits, but attempt creation and feature usage are not uniformly gated.
Medium Findings
Frontend lint fails with 191 errors and 32 warnings, mostly any usage and missing React hook dependencies. This affects maintainability and can hide stale-state bugs in exam workflows.
Frontend production build succeeds, but the largest chunks include chart-vendor at ~401 KB and ui-vendor at ~258 KB before gzip. Acceptable for admin screens, but lazy loading should be reviewed.
README architecture is stale: it describes Supabase, while the actual backend is Express + Turso + Firebase. This is a production-readiness/documentation gap.
.DS_Store files are present in source paths, and generated/local artifacts like backend/test.db exist in the worktree.
API tests exist, but there is no backend test script in backend/package.json.
Verification Performed
backend TypeScript build: passed
frontend production build: passed
frontend lint: failed, 223 total problems
backend Vitest run: failed, primarily migration ordering plus sandbox socket binding errors
Broken/At-Risk Flows
Guest student attempts are vulnerable to cross-attempt access.
Public/private test availability can be bypassed at attempt creation.
Scheduled exam windows are not reliably enforced server-side.
Proctoring evidence can be spoofed or suppressed client-side.
Subscription limits are only partially enforced.
Recommended Next Fixes
Require attempt_token for all guest attempt read/write/submit/report/proctoring operations.
Fix guest authorization checks so “target is guest” never grants access by itself.
Enforce test active, published, schedule, guest/public-link, and attempts-allowed rules in POST /api/attempts.
Move schema migrations out of runtime startup, fix ordering, and fail fast on migration errors.
Add focused backend tests for BOLA/IDOR, guest attempts, subscription expiry, schedule enforcement, and tenant isolation.
This has good bones, but right now I would not trust it for high-stakes exams until the guest attempt and server-side exam-rule enforcement issues are fixed.



This audit is actually quite valuable. Out of everything, only 4 items are genuine launch blockers.

Fix Before Launch (Critical)

Priority	Issue	Impact
🔴 Critical	Guest attempt authorization	One guest could potentially access another guest’s attempt
🔴 Critical	attempt_token not enforced	Guest session security weak
🔴 Critical	Attempt creation not validating publish/schedule rules	Students may start tests they shouldn’t
🔴 Critical	Migration ordering issue	Production deployments can end up partially migrated

⸻

Fix Soon (High)

Priority	Issue
🟠 High	Rate limiting too loose
🟠 High	Public test lookup exposes too much data
🟠 High	Proctoring events are mostly client-trusted
🟠 High	Subscription enforcement not consistent

⸻

Can Wait

Priority	Issue
🟡 Medium	191 lint errors
🟡 Medium	Large frontend bundles
🟡 Medium	Stale README
🟡 Medium	.DS_Store / test.db cleanup

These won’t stop production.

⸻

My Assessment

Current state:

Area	Score
UI/UX	8.5/10
Features	9/10
Multi-Tenant SaaS	7.5/10
Security	5/10
Exam Integrity	6/10
Production Readiness	6.5/10

⸻

What I would do next

Phase 1 (Mandatory)

Fix:

1. Guest authorization
2. Enforce attempt_token
3. Validate:
    * Published
    * Active
    * Scheduled window
    * Guest access
    * Public link access
4. Fix migration order

After that:

Re-run the audit.

⸻

Phase 2

Add backend tests for:

* Guest attempt access
* Tenant isolation
* Schedule enforcement
* Subscription expiry
* Proctoring endpoints

⸻

Phase 3

Then do a real browser E2E audit using:

* Playwright
* Multiple roles:
    * Super Admin
    * Client Admin
    * Student
    * Guest Student

Because this audit is mostly code-based. Many issues in exam portals only appear during actual workflows:

* Import students
* Import questions
* Publish tests
* Resume attempts
* Section timers
* Proctoring
* Result publishing
* Subscription limits
* Organization suspension

Those need browser automation testing.

Bottom line

The audit did not find catastrophic architecture problems.

The biggest concern is guest attempt security and server-side exam rule enforcement. Once those are fixed, your platform would likely move from roughly 52/100 to around 75–80/100 production readiness, which is a solid beta-launch position for the Exam Portal.