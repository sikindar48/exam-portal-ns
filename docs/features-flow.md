# Features & Flow

## Overview

Exam Portal is a multi-tenant online examination platform. It supports three user roles — **Super Admin**, **Client Admin**, and **Student** — each with their own dashboard and capabilities. The frontend is built with React + Vite, the backend is Supabase (PostgreSQL + Auth + Edge Functions).

Branding: powered by **[NS Software Solutions](https://www.nssoftwaresolutions.in)** — support: info.nssoftwaresolutions@gmail.com

---

## Roles

| Role          | Description                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| `superadmin`  | Platform owner. Manages all client organizations and their admins.           |
| `clientadmin` | Organization admin. Manages students, questions, and tests within their org. |
| `student`     | End user. Takes tests assigned to their organization.                        |

---

## Authentication Flow

```
User visits /
  └─► Redirected to /auth

/auth page
  ├─► Sign In tab
  │     └─► supabase.auth.signInWithPassword()
  │           └─► AuthContext fetches role from user_roles table (with retry)
  │                 └─► Redirects to role dashboard:
  │                       superadmin  → /superadmin
  │                       clientadmin → /client-admin
  │                       student     → /student
  │
  └─► Sign Up tab (students only)
        └─► supabase.auth.signUp()
              └─► Inserts profile + user_roles (role: student)
                    └─► User signs in manually after signup

Forgot Password → /forgot-password
  └─► supabase.auth.resetPasswordForEmail()
        └─► Email link → /reset-password
              └─► supabase.auth.updateUser({ password })
```

**Session persistence:** Sessions are stored in `localStorage` and auto-refreshed via Supabase client config.

**Role priority:** If a user has multiple roles, the highest-priority role wins: `superadmin > clientadmin > student`.

---

## Route Protection

All role-specific routes are wrapped in `<ProtectedRoute allowedRoles={[...]}>`:

- Not logged in → redirect to `/auth`
- Wrong role → redirect to their own dashboard
- Loading state → spinner shown while auth initializes

---

## Super Admin Flow

### Dashboard (`/superadmin`)

- Views platform-wide stats: total clients, students, questions, tests, attempts
- Charts: students per organization (bar), tests per organization (pie)
- Quick link to Manage Clients

### Manage Clients (`/superadmin/clients`)

- **Add client** — name, address, logo URL, active status
- **Edit client** — update any field
- **Delete client** — cascades to all associated data
- **Manage admins** per client:
  - View existing client admins
  - **Create admin** — calls `POST /functions/v1/create-user` Edge Function with role `clientadmin`
  - Credentials (email + password) shown once in a copy dialog after creation
  - **Remove admin** — deletes from `user_roles`

---

## Client Admin Flow

### Dashboard (`/client-admin`)

- Stats: students, questions, tests, attempts, avg score, pass rate
- Charts: avg score by test (bar), top 5 performers (leaderboard)
- Quick action buttons to all management pages

### Manage Students (`/client-admin/students`)

- Lists all students in the organization
- **Add student** — calls Edge Function with role `student`; credentials shown once in copy dialog
- **Delete student** — calls `delete_student()` RPC which cascades deletion through `auth.users`

### Manage Questions (`/client-admin/questions`)

- Lists all questions for the organization
- **Add question** — question text, 4 options (A–D), correct answer, difficulty (easy/medium/hard), marks
- **Edit question** — update any field
- **Delete question**
- **CSV Import** — bulk import questions via CSV file (parsed client-side, validated, then batch inserted)

### Manage Tests (`/client-admin/tests`)

Tests are organized with a flexible folder system. Tests are independent by default and can be moved into folders at any time.

#### Folder System

- **Root view** shows a folder grid and an "Independent Tests" table
- **Create Folder** — name only; folders are purely organizational
- **Open Folder** — click a folder card to drill in; breadcrumb navigation shown in header
- **Delete Folder** — folder is removed; tests inside become independent (not deleted)
- Tests display their count per folder card

#### Test Lifecycle

```
Create Test (folder_id = NULL by default)
  └─► Build test (name, duration, questions, settings)
        └─► Saved as Draft
              └─► (Optional) Move to Folder
                    └─► Publish when ready
                          └─► Students can see and take the test
```

#### Create Test

- **Test Name** and **Duration (minutes)** — required
- **Attempts Allowed** — numeric input (1–100) with an **Unlimited toggle**; when toggled on, `attempts_allowed` is stored as `NULL` in the database (displayed as ∞ in the table)
- **Schedule (optional)** — Start Date & Time and End Date & Time (`datetime-local`); leave blank to make available immediately after publishing
- **Settings panel:**
  - Shuffle Questions
  - Allow Review After Test
  - Enable Negative Marking (reveals a deduction-per-wrong-answer input when on)
  - Restrict Navigation
- **Select Questions** — paginated list (10 per page) with Previous / Next controls; checkboxes persist across pages; shows selected count
- Saved as **Draft** on creation — not visible to students until published

#### Edit Test

- Opens pre-populated form with all current values
- Existing question selections loaded from `test_questions`
- Same paginated question list as create
- Replaces all question associations on save (delete + re-insert)

#### Publish / Unpublish

- **Publish** button in the test row → sets `status = 'published'`; students can now see the test
- **Draft** button (shown when published) → sets `status = 'draft'`; hides from students
- Status badge shown in table: `Published` (green) / `Draft` (yellow)

#### Move Test to Folder

- **Move** button (→ icon) on any test row opens a dialog
- Select any folder or "No folder (independent)"
- Updates `folder_id` on the test — no data is lost

#### Delete Test

- Confirmation dialog before deletion
- Cascades to `test_questions` and all `attempts` / `attempt_answers`

#### Share Test

- Via `TestSharing` component (share icon in action row)
- View/copy the 8-character invite code (`share_code`)
- Toggle public link on/off (`public_link_enabled`)
- Copy shareable URL
- QR code generated from the public link

### Organization Settings (`/client-admin/settings`)

- Update organization name, address, logo URL
- Logo URL previewed inline

---

## Student Flow

### Join Test (public, `/join` or `/join/:code`)

- Student (or anyone) can enter an invite code to look up a test
- If not logged in → redirected to `/auth?redirect=/join/:code` → after login, redirected back
- If logged in as student → goes directly to test engine

### Dashboard (`/student`)

- Lists all active tests for the student's organization
- Shows attempts used vs allowed per test (∞ shown for unlimited)
- Disables "Start Test" button when attempts are exhausted
- Shows 5 most recent submitted attempts with scores
- Link to full test history

### Test Engine (`/student/test/:testId`)

**Initialization:**

1. Loads test config from `tests` table
2. Checks submitted attempt count against `attempts_allowed` — blocks if exhausted; `NULL` = unlimited (never blocked)
3. Resumes existing `in_progress` attempt if one exists (restores saved answers)
4. Otherwise creates a new attempt record
5. Fetches questions via `get_test_questions_for_student()` RPC — **correct answers are never sent to the client**
6. Shuffles questions if `shuffle = true`
7. Requests fullscreen

**During test:**

- Timer counts down from `timer * 60` seconds
- Answers auto-saved to `attempt_answers` on every selection (upsert)
- Mark for review flag toggled per question
- Question palette shows answered (green), marked for review (orange border), unanswered (empty)
- Navigation: Previous / Next buttons + palette click

**Security measures:**

| Measure                    | Behaviour                                            |
| -------------------------- | ---------------------------------------------------- |
| Fullscreen enforcement     | Exits trigger warning overlay; 3 exits = auto-submit |
| Tab switch detection       | 3 tab switches = auto-submit                         |
| Copy/paste blocked         | `copy`, `cut`, `paste` events prevented              |
| Right-click disabled       | `contextmenu` event prevented                        |
| Keyboard shortcuts blocked | Ctrl+C/V/X/A/P/U, F12, Ctrl+Shift+I, Ctrl+F5         |
| Print screen blocked       | Clipboard cleared on PrintScreen key                 |
| `user-select: none`        | CSS prevents text selection                          |

**Submission:**

1. Fetches correct answers server-side from `test_questions` join
2. Calculates score: +marks for correct, −negative_marks for wrong (if enabled), clamped to 0 minimum
3. Updates attempt: `score`, `total_marks`, `status: submitted`, `time_taken`
4. Exits fullscreen
5. Redirects to `/student`

**Auto-submit triggers:** timer reaches 0, 3 tab switches, 3 fullscreen exits.

### Test History (`/student/history`)

- All submitted attempts ordered by date
- Shows: score, time taken, percentage, pass/fail badge (pass threshold: 40%)

---

## CSV Question Import

File: `src/utils/csvParser.ts` + `src/components/QuestionImport/CSVImport.tsx`

Expected CSV columns:

```
question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty, marks
```

- Parsed and validated client-side
- Invalid rows reported with row numbers
- Valid rows batch-inserted into `questions` table with the client's `client_id`

---

## Test Sharing

Each test gets an auto-generated 8-character uppercase `share_code` (DB trigger on insert).

Two sharing modes:

1. **Invite code** — student enters code at `/join`
2. **Public link** — `public_link_enabled = true` enables a direct URL `/join/:code` and a QR code

---

## Branding & Footer

A `BrandFooter` component (`src/components/BrandFooter.tsx`) is rendered at the bottom of every page:

- Links to **https://www.nssoftwaresolutions.in**
- Support email: **info.nssoftwaresolutions@gmail.com**

Present on: Auth, JoinTest, SuperAdmin Dashboard & Clients, ClientAdmin Dashboard / Tests / Questions / Students / Settings, Student Dashboard & History.

---

## Theme

- Light / Dark / System modes via custom `ThemeProvider`
- Preference stored in `localStorage` under key `exam-portal-theme`
- `ThemeToggle` dropdown available on most pages

---

## Keep-Alive (CI)

GitHub Actions workflow (`.github/workflows/keep-alive.yml`) pings Supabase every 3 days to prevent the free-tier project from pausing after 7 days of inactivity.
