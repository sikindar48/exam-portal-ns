Critical
No bulk student CSV import — manual-only at 1000-user scale
Admins must create students one at a time via the Edge Function. This is completely unworkable for schools or corporates onboarding 100+ students. Build a CSV import flow that calls create-user in batches with rate-limiting and a progress UI. Identical pattern to the existing question CSV importer.
CSV: name, email, password columns
Batch Edge Function calls (5 concurrent max)
Progress bar + error report per row


High
No "confirm submit" dialog with unanswered question count
Industry standard: before final submission, show a summary — "You have answered 18/25 questions. 7 are unanswered. Are you sure you want to submit?" This prevents accidental submissions. Currently submit is one click with no recovery.
Count nulls in attempt_answers
Modal with breakdown before submit RPC

High
Test history has no pass/fail filter or search — useless at scale
History page loads all attempts with no pagination, no filter by test name, no pass/fail toggle. With 50+ attempts this becomes a wall of rows. Add client-side filter + virtual scroll (TanStack Virtual is free). Pass threshold is hardcoded at 40% globally — it should be configurable per test.
Add pass_threshold column to tests table
Filter/search UI on history page
Pagination (limit 20 + load more)

Medium
Guest student names are not validated or deduplicated
Guest attempts upsert into profiles by UUID, so two guests named "John" are indistinguishable in the admin results view. Collect email (optional) + name at guest entry, and store both. Prevents admin confusion and enables basic follow-up.
Add guest_email to profiles (nullable)
Collect on /join guest entry modal

Critical
Test results page has no per-question analytics
Results page only shows total score per student. Admins cannot see which questions were most missed, difficulty distribution accuracy, or distractor effectiveness. These are the most valuable signals for improving question quality. All data is already in attempt_answers.
New tab: "Question analytics" on results page
RPC: get_question_stats(test_id) — % correct per question
Bar chart: question difficulty vs actual accuracy

High
Test builder replaces all questions on save — loses section order
Edit test does a full delete + re-insert of test_questions. Any reordering of questions mid-edit is fragile. If the save fails partway, the test is left in a broken state. Use a diff-based upsert: compare existing IDs vs new IDs, delete removals, insert additions, update positions — all in a single transaction via an RPC.
New RPC: upsert_test_questions(test_id, questions[])
Wrap in BEGIN/COMMIT transaction
Return conflict errors if question belongs to another client

High
No test duplication / cloning feature
Admins building a monthly quiz series need to clone a previous test and adjust questions. Currently they must rebuild from scratch every time. A "Duplicate test" action should deep-copy the test row, all test_sections, and all test_questions (resetting status to draft and share_code to a new value).
New RPC: clone_test(source_test_id) → new_test_id
Clone: tests → test_sections → test_questions
Reset status=draft, generate new share_code

Medium
No question search or filter in the repository picker
The "From Repository" picker in the test builder has no search. With 500+ questions, admins must scroll manually. Add a debounced full-text search against question_text using Supabase's built-in ilike or a tsvector index for performance.
Add GIN index on questions.question_text tsvector
Search input with 300ms debounce in picker dialog
Filter by difficulty and folder simultaneously

Medium
Student deletion is irreversible with no export — data loss risk
delete_student() cascades through auth.users and wipes all attempt history permanently. There is no soft-delete, no archive, and no "export before delete" prompt. Add a soft-delete flag (is_active) to profiles, hide inactive students from the UI, and archive their attempts. Hard delete becomes admin-only.
Add is_active boolean to profiles (default true)
Replace delete with deactivate in UI

High
No client usage limits — one org can starve the platform
Any client can create unlimited students, questions, and tests. At 1000 concurrent users, one org running a 500-student test with 100-question papers will hammer Supabase's free-tier connection pool. Add per-client quotas: max students, max tests, max questions — enforced in the Edge Function and displayed in the super admin panel.
Add max_students, max_tests, max_questions to clients table
Enforce in create-user Edge Function
Usage bar per client in super admin UI

Medium
Client deletion cascades silently — no confirmation of downstream impact
"Delete client" cascade removes all admins, students, questions, tests, and attempt history. The current dialog just says "Are you sure?". Show a pre-delete summary: "This will delete 3 admins, 247 students, 89 tests, and 1,204 attempts. This cannot be undone." Query counts before presenting the dialog.
RPC: get_client_deletion_summary(client_id)
Show counts in confirmation modal
Require typing client name to confirm

Medium
Super admin has no impersonation / login-as feature
When a client admin reports an issue, the super admin cannot reproduce it without knowing their credentials. Supabase supports admin JWT generation — add a "Login as this admin" action that generates a short-lived session token for the selected user, opens it in a new tab, and logs the action in an audit table.
Edge Function: impersonate_user(target_id)
Log to new audit_log table (actor, target, action, ts)

Critical
Auto-save on every answer fires a DB write per keypress — will exhaust connections
The test engine upserts attempt_answers on every single selection. At 1000 students × avg 2 selections/minute = 2000 writes/min. Supabase free tier allows ~60 connections. Add a 2-second debounce on the answer save, and batch-upsert all dirty answers together instead of one row at a time. Local state is already maintained — just throttle the flush.
Debounce answer save: 2000ms
Batch upsert dirty answers in one RPC call
Force-flush on navigation + submit (already done)

High
All tables load without pagination — O(N) queries everywhere
Students, questions, tests, and attempts are all fetched in full with no limit. TanStack Query is listed as "future" in the schema but not implemented. Add cursor-based pagination (Supabase's .range(from, to)) to every list view, page size 20. This alone prevents 90% of "slow admin panel" complaints at scale.
Implement TanStack Query (already a dependency)
useInfiniteQuery for all list pages
Supabase .range() on every table query

High
Missing index: attempts.status — every in_progress resume scans the full table
The test engine checks for an existing in_progress attempt on load. With no index on status, this is a sequential scan. Add a composite index: (student_id, test_id, status). Also missing: attempt_answers(attempt_id, question_id) is unique but the restore query filters by attempt_id — verify the index covers this.
CREATE INDEX idx_attempts_status_student ON attempts(student_id, test_id, status)
EXPLAIN ANALYZE the resume query

Critical
Credentials shown in plaintext copy dialog — no rotation possible
When a client admin creates a student or admin, their password is generated client-side and shown once in a dialog. There is no password reset flow for admins/students initiated by the admin. If the dialog is dismissed or the password is lost, the only option is to delete and recreate the user. Add a "Reset password" action that triggers Supabase's built-in password reset email.
Add "Reset password" button in student/admin rows
Call supabase.auth.admin.generateLink('recovery', email)
Display link or send email directly

High
RLS on attempt_answers allows any student to read any attempt by ID
The RLS policy "ALL (own attempts)" on attempt_answers checks attempt_id ownership, but the SELECT path is "SELECT (own client)" for admins — not scoped to the student's own student_id. Verify the student SELECT policy joins through attempts.student_id = auth.uid(), not just attempts.test_id IN (client tests).
Audit: SELECT policy on attempt_answers
Confirm: WHERE EXISTS (SELECT 1 FROM attempts WHERE id = attempt_id AND student_id = auth.uid())

Medium
No rate limiting on the create-user Edge Function
A compromised client admin JWT could spam POST /functions/v1/create-user to create thousands of users, exhausting Supabase's auth.users table and your free-tier limits. Add a simple in-memory rate limit (10 requests/minute per JWT) or use Supabase's built-in rate limiting headers.
Check X-RateLimit headers in Edge Function
Or: Redis-based counter via Upstash (free tier: 10k req/day)
