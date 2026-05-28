# Architecture & Database Schema

## Tech Stack

| Layer          | Technology                                     |
| -------------- | ---------------------------------------------- |
| Frontend       | React 18, TypeScript, Vite                     |
| Routing        | React Router v6                                |
| UI Components  | shadcn/ui (Radix UI primitives + Tailwind CSS) |
| State / Data   | React Context (Auth), TanStack Query (future)  |
| Backend        | Supabase (PostgreSQL 15, Auth, Edge Functions) |
| Edge Functions | Deno (TypeScript)                              |
| Hosting        | Vercel (frontend), Supabase (backend)          |
| CI/CD          | GitHub Actions (keep-alive workflow)           |

---

## Project Structure

```
exam-portal-ns/
├── src/
│   ├── App.css
│   ├── App.tsx                        # Root router, providers, lazy pages
│   ├── main.tsx                       # React entry point
│   ├── index.css                      # Tailwind + design tokens
│   ├── components/
│   │   ├── Auth/
│   │   │   └── Protected.tsx          # Role-based route guard
│   │   ├── Brand/
│   │   │   └── Footer.tsx             # Footer with NS branding
│   │   ├── ClientAdmin/
│   │   │   ├── Questions/             # Category folder and dialog components
│   │   │   └── Tests/                 # Test table and folder components
│   │   ├── Common/
│   │   │   ├── ErrorBoundary.tsx      # Global error boundary component
│   │   │   └── NavLink.tsx            # Active link component
│   │   ├── QuestionImport/
│   │   │   └── CSV.tsx                # CSV question import UI
│   │   ├── SuperAdmin/
│   │   │   └── Clients/               # Client and admin management components
│   │   ├── Test/
│   │   │   └── Sharing.tsx            # Share code + QR dialog
│   │   ├── TestBuilder/               # Sidebar and question editor components
│   │   ├── TestEngine/                # Header, sidebar, and question navigation
│   │   ├── Theme/
│   │   │   ├── Provider.tsx           # Light/dark/system theme provider
│   │   │   └── Toggle.tsx             # Theme switcher dropdown
│   │   └── ui/                        # shadcn/ui primitives
│   ├── contexts/
│   │   └── AuthContext.tsx            # Auth state, role, clientId
│   ├── hooks/
│   │   ├── use-mobile.tsx             # Mobile detection hook
│   │   └── use-toast.ts               # Toast notification hook
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts              # Supabase client init
│   │       └── types.ts               # Auto-generated DB types
│   ├── pages/
│   │   ├── Auth/
│   │   │   ├── Forgot.tsx             # Password reset request
│   │   │   ├── Page.tsx               # Sign in / Sign up page
│   │   │   └── Reset.tsx              # Password reset form
│   │   ├── ClientAdmin/
│   │   │   ├── Builder.tsx            # Test builder (create/edit) page
│   │   │   ├── Dashboard.tsx          # Org stats & analytics dashboard
│   │   │   ├── Questions.tsx          # Question bank management page
│   │   │   ├── Results.tsx            # Test attempts and results viewer
│   │   │   ├── Settings.tsx           # Org settings management page
│   │   │   ├── Students.tsx           # Student user accounts page
│   │   │   └── Tests.tsx              # Folder-based tests management page
│   │   ├── Home/
│   │   │   └── Page.tsx               # Public landing page
│   │   ├── Student/
│   │   │   ├── Dashboard.tsx          # Available tests listing page
│   │   │   ├── Engine.tsx             # Secure test taking screen
│   │   │   └── History.tsx            # Previous attempts history page
│   │   ├── SuperAdmin/
│   │   │   ├── Clients.tsx            # Client organization control page
│   │   │   └── Dashboard.tsx          # Platform-wide stats dashboard
│   │   ├── Index.tsx
│   │   └── NotFound.tsx               # 404 error page
│   ├── types/
│   │   └── test.ts                    # Test builder types
│   └── utils/
│       ├── csvParser.ts               # CSV parsing utility
│       └── questionValidator.ts       # Question validation
├── supabase/
│   ├── functions/
│   │   └── create-user/index.ts       # Edge Function: user creation
│   └── migrations/                    # SQL migration files
├── docs/                              # Documentation
│   ├── architecture-db-schema.md      # This file
│   └── features-flow.md               # User flows
├── public/
│   ├── 404.html                       # SPA fallback
│   ├── favicon.ico
│   └── robots.txt
├── complete-setup.sql                 # Full DB bootstrap
├── .github/workflows/keep-alive.yml   # Supabase ping cron
└── .env                               # Local env vars (gitignored)
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                   │
│                                                      │
│  ThemeProvider → AuthProvider → Router               │
│                         │                            │
│              BrowserRouter (React Router v6)         │
│                         │                            │
│   ┌──────────┬──────────┼──────────┬──────────┐     │
│   │SuperAdmin│ClientAdmin│  Student │  Public  │     │
│   │ Dashboard│ Dashboard │Dashboard │ Landing  │     │
│   │  Clients │  Tests    │ History  │ JoinTest │     │
│   └──────────┴──────────┴──────────┴──────────┘     │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS (REST / Realtime)
┌─────────────────────▼───────────────────────────────┐
│                    Supabase                          │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Auth   │  │  PostgreSQL  │  │ Edge Functions│  │
│  │  (JWT)   │  │  + RLS       │  │  (Deno)       │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema

### Enum

```sql
CREATE TYPE public.app_role AS ENUM ('superadmin', 'clientadmin', 'student');
```

---

### Tables

#### `clients`

Represents an organization (tenant).

| Column          | Type          | Notes               |
| --------------- | ------------- | ------------------- |
| `id`            | `uuid` PK     | `gen_random_uuid()` |
| `name`          | `text`        | Required            |
| `address`       | `text`        | Optional            |
| `logo_url`      | `text`        | Optional            |
| `active_status` | `boolean`     | Default `true`      |
| `created_at`    | `timestamptz` | Auto                |
| `updated_at`    | `timestamptz` | Auto (trigger)      |

---

#### `profiles`

One row per auth user. Extends `auth.users`.

| Column       | Type          | Notes                                                      |
| ------------ | ------------- | ---------------------------------------------------------- |
| `id`         | `uuid` PK     | FK → `auth.users(id)` CASCADE                              |
| `name`       | `text`        | Required                                                   |
| `email`      | `text`        | Required                                                   |
| `client_id`  | `uuid`        | FK → `clients(id)` CASCADE, nullable (superadmin has null) |
| `created_at` | `timestamptz` | Auto                                                       |
| `updated_at` | `timestamptz` | Auto (trigger)                                             |

---

#### `user_roles`

Stores role assignments. A user can have multiple roles (e.g., both `clientadmin` and `student`), but the app picks the highest-priority one.

| Column      | Type       | Notes                                  |
| ----------- | ---------- | -------------------------------------- |
| `id`        | `uuid` PK  |                                        |
| `user_id`   | `uuid`     | FK → `auth.users(id)` CASCADE          |
| `role`      | `app_role` | `superadmin \| clientadmin \| student` |
| `client_id` | `uuid`     | FK → `clients(id)` CASCADE, nullable   |
| —           | UNIQUE     | `(user_id, role)`                      |

---

#### `test_folders`

Stores folders created by client admins to organize tests.

| Column       | Type          | Notes                      |
| ------------ | ------------- | -------------------------- |
| `id`         | `uuid` PK     |                            |
| `client_id`  | `uuid`        | FK → `clients(id)` CASCADE |
| `name`       | `text`        | Required                   |
| `created_at` | `timestamptz` | Auto                       |
| `updated_at` | `timestamptz` | Auto (trigger)             |

---

#### `question_folders`

Stores categories/folders created by client admins to organize questions in their question bank.

| Column       | Type          | Notes                                     |
| ------------ | ------------- | ----------------------------------------- |
| `id`         | `uuid` PK     |                                           |
| `client_id`  | `uuid`        | FK → `clients(id)` CASCADE                |
| `name`       | `text`        | Required                                  |
| `parent_id`  | `uuid`        | FK → `question_folders(id)` CASCADE, null |
| `created_at` | `timestamptz` | Auto                                      |
| `updated_at` | `timestamptz` | Auto (trigger)                            |

---

#### `test_sections`

Stores sections within a test to group questions (e.g. Section A, Section B).

| Column       | Type          | Notes                    |
| ------------ | ------------- | ------------------------ |
| `id`         | `uuid` PK     |                          |
| `test_id`    | `uuid`        | FK → `tests(id)` CASCADE |
| `name`       | `text`        | Required                 |
| `position`   | `integer`     | Section order index      |
| `created_at` | `timestamptz` | Auto                     |

---

#### `questions`

MCQ questions belonging to a client.

| Column           | Type          | Notes                                      |
| ---------------- | ------------- | ------------------------------------------ |
| `id`             | `uuid` PK     |                                            |
| `client_id`      | `uuid`        | FK → `clients(id)` CASCADE                 |
| `folder_id`      | `uuid`        | FK → `question_folders(id)` SET NULL, null |
| `question_text`  | `text`        |                                            |
| `option_a`       | `text`        |                                            |
| `option_b`       | `text`        |                                            |
| `option_c`       | `text`        |                                            |
| `option_d`       | `text`        |                                            |
| `correct_answer` | `text`        | CHECK `IN ('A','B','C','D')`               |
| `difficulty`     | `text`        | Nullable (Constraint dropped for builder)  |
| `marks`          | `integer`     | Default `1`                                |
| `created_at`     | `timestamptz` | Auto                                       |
| `updated_at`     | `timestamptz` | Auto (trigger)                             |

---

#### `tests`

A test created by a client admin. Supports folders, scheduling, and flexible attempt limits.

| Column                | Type          | Notes                                     |
| --------------------- | ------------- | ----------------------------------------- |
| `id`                  | `uuid` PK     |                                           |
| `client_id`           | `uuid`        | FK → `clients(id)` CASCADE                |
| `folder_id`           | `uuid`        | FK → `test_folders(id)` SET NULL          |
| `test_name`           | `text`        |                                           |
| `timer`               | `integer`     | Duration in minutes                       |
| `shuffle`             | `boolean`     | Randomize question order                  |
| `allow_review`        | `boolean`     | Allow post-test review                    |
| `negative_marking`    | `boolean`     | Enable score deduction                    |
| `negative_marks`      | `decimal`     | Marks deducted per wrong answer           |
| `restrict_navigation` | `boolean`     | Prevent going back                        |
| `attempts_allowed`    | `integer`     | NULL = unlimited, else 1-100              |
| `status`              | `text`        | `draft` or `published`                    |
| `active`              | `boolean`     | Default `true`                            |
| `allow_guests`        | `boolean`     | Default `false`                           |
| `scheduled_start`     | `timestamptz` | Optional scheduled start                  |
| `scheduled_end`       | `timestamptz` | Optional scheduled end                    |
| `share_code`          | `text`        | UNIQUE, 8-char, auto-generated by trigger |
| `public_link_enabled` | `boolean`     | Enables public join URL                   |
| `created_at`          | `timestamptz` | Auto                                      |
| `updated_at`          | `timestamptz` | Auto (trigger)                            |

---

#### `test_questions`

Junction table linking tests to questions (many-to-many), organized by sections and positions.

| Column        | Type      | Notes                                    |
| ------------- | --------- | ---------------------------------------- |
| `id`          | `uuid` PK |                                          |
| `test_id`     | `uuid`    | FK → `tests(id)` CASCADE                 |
| `question_id` | `uuid`    | FK → `questions(id)` CASCADE             |
| `section_id`  | `uuid`    | FK → `test_sections(id)` SET NULL        |
| `position`    | `integer` | Order index of question within section   |
| —             | UNIQUE    | `(test_id, question_id)`                 |

---

#### `attempts`

A student's attempt at a test.

| Column         | Type          | Notes                         |
| -------------- | ------------- | ----------------------------- |
| `id`           | `uuid` PK     |                               |
| `student_id`   | `uuid`        | FK → `auth.users(id)` CASCADE |
| `test_id`      | `uuid`        | FK → `tests(id)` CASCADE      |
| `score`        | `decimal`     | Calculated on submit          |
| `total_marks`  | `decimal`     | Sum of all question marks     |
| `submitted_at` | `timestamptz` | Auto                          |
| `time_taken`   | `integer`     | Seconds elapsed               |
| `status`       | `text`        | `in_progress \| submitted`    |

---

#### `attempt_answers`

Per-question answer record for an attempt.

| Column              | Type      | Notes                                        |
| ------------------- | --------- | -------------------------------------------- |
| `id`                | `uuid` PK |                                              |
| `attempt_id`        | `uuid`    | FK → `attempts(id)` CASCADE                  |
| `question_id`       | `uuid`    | FK → `questions(id)` CASCADE                 |
| `selected_option`   | `text`    | `A \| B \| C \| D \| null`                   |
| `marked_for_review` | `boolean` | Default `false`                              |
| —                   | UNIQUE    | `(attempt_id, question_id)` — enables upsert |

---

### Entity Relationship Diagram

```
auth.users
    │
    ├──── profiles (1:1)
    │         └── client_id ──────────────────┐
    │                                          │
    ├──── user_roles (1:N)                     │
    │         └── client_id ──────────────────►│
    │                                          │
    └──── attempts (1:N)                    clients (1 per tenant)
              │                                │
              │                    ┌───────────┤
              │                    │           │
              │                questions     tests
              │                    │           │
              │                    └───────────┤
              │                    test_questions
              │
              └──── attempt_answers (1:N)
                        └── question_id ──► questions
```

---

## Database Functions

### `has_role(_user_id, _role)` → boolean

`SECURITY DEFINER` — checks `user_roles` without triggering RLS. Used in all RLS policies to avoid circular dependency.

### `get_user_client_id(_user_id)` → uuid

`SECURITY DEFINER` — reads `profiles.client_id`. Used in RLS policies to scope data to the caller's organization.

### `get_test_questions_for_student(_test_id uuid, _student_id text)` → table

`SECURITY DEFINER` — returns question rows **without** `correct_answer`, including section details, sorted by section position and question position. Supports guest student credentials as text IDs (`guest_...`).

### `submit_test_attempt(_attempt_id uuid, _time_taken integer)` → json

`SECURITY DEFINER` — handles server-side assessment evaluation: matches candidate answers to correct keys, applies negative markings if enabled, computes final score/marks, and updates attempt status to `submitted`. Returns evaluation metrics.

### `delete_student(_student_id)` → void

`SECURITY DEFINER` — verifies caller is a `clientadmin` and the student belongs to their org, then deletes from `auth.users` (cascades to `profiles`, `user_roles`, `attempts`, `attempt_answers`).

### `generate_share_code()` → trigger function

Fires `BEFORE INSERT` on `tests`. Sets `share_code` to an 8-character uppercase hex string if not already provided.

### `update_updated_at_column()` → trigger function

Fires `BEFORE UPDATE` on `clients`, `profiles`, `questions`, `tests`. Sets `updated_at = now()`.

---

## Edge Function: `create-user`

**Endpoint:** `POST /functions/v1/create-user`

**Auth:** Requires a valid JWT (`Authorization: Bearer <token>`) from a `superadmin` or `clientadmin`.

**Purpose:** Creates a new user (admin or student) with email pre-confirmed (no confirmation email sent). Uses the Supabase service role key to bypass RLS.

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "secret123",
  "name": "John Doe",
  "client_id": "<uuid>",
  "role": "clientadmin | student"
}
```

**Permission rules:**

- `superadmin` can create `clientadmin` or `student` for any client
- `clientadmin` can only create `student` for their own client

**On success:** Returns `{ id: "<new_user_uuid>" }`

**Rollback:** If profile or role insert fails, the auth user is deleted to avoid orphaned records.

---

## Row Level Security (RLS)

All tables have RLS enabled. Policies use `has_role()` and `get_user_client_id()` (both `SECURITY DEFINER`) to avoid circular dependency.

| Table             | superadmin | clientadmin                 | student                     | anon                         |
| ----------------- | ---------- | --------------------------- | --------------------------- | ---------------------------- |
| `clients`         | ALL        | SELECT (own) + UPDATE (own) | SELECT (own)                | SELECT (active only)         |
| `user_roles`      | ALL        | —                           | SELECT (own)                | —                            |
| `profiles`        | ALL        | ALL (own client)            | SELECT + UPDATE (own)       | —                            |
| `questions`       | ALL        | ALL (own client)            | SELECT (own client)         | SELECT (public tests only)   |
| `question_folders`| ALL        | ALL (own client)            | —                           | —                            |
| `test_folders`    | ALL        | ALL (own client)            | —                           | —                            |
| `tests`           | ALL        | ALL (own client)            | SELECT (active, own client) | SELECT (public_link_enabled) |
| `test_sections`   | ALL        | ALL (own client tests)      | SELECT (own client tests)   | SELECT (public tests only)   |
| `test_questions`  | ALL        | ALL (own client tests)      | SELECT (own client tests)   | —                            |
| `attempts`        | SELECT     | SELECT (own client tests)   | ALL (own)                   | —                            |
| `attempt_answers` | SELECT     | SELECT (own client)         | ALL (own attempts)          | —                            |

---

## Performance Indexes

```sql
idx_user_roles_user_id          -- has_role() lookups
idx_user_roles_client_id        -- client-scoped role queries
idx_profiles_client_id          -- get_user_client_id() + student lists
idx_questions_client_id         -- question bank queries
idx_tests_client_id             -- test list queries
idx_tests_share_code            -- join-by-code lookups
idx_attempts_student_id         -- student history queries
idx_attempts_test_id            -- admin attempt reporting
idx_attempt_answers_attempt_id   -- answer restore on resume
idx_test_questions_test_id      -- question fetch per test
idx_test_folders_client_id      -- folder listings by client
idx_tests_folder_id             -- test lookup inside folder
idx_tests_status                -- filters for published tests
idx_tests_scheduled_start       -- scheduling status lookups
idx_test_sections_test_id       -- sections lookup inside test
idx_test_questions_section_id   -- questions lookup inside section
idx_test_questions_position     -- ordered questions inside test section
```

---

## Environment Variables

| Variable                        | Used in                          | Description                                 |
| ------------------------------- | -------------------------------- | ------------------------------------------- |
| `VITE_SUPABASE_URL`             | Frontend + Edge Function         | Supabase project URL                        |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend                         | Supabase anon/public key                    |
| `VITE_SUPABASE_PROJECT_ID`      | Reference only                   | Project ID                                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Edge Function (server-side only) | Service role key — never exposed to browser |

> `.env` is gitignored. For GitHub Actions (keep-alive workflow), set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as repository secrets.
