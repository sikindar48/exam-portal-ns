# Exam Portal

## How can I edit this code?

**Use your preferred IDE**

You can clone this repo and work locally using your own IDE.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Deploy using your preferred hosting platform (Vercel, Netlify, etc.).

## What's already there

- Multi-role auth (superadmin / client admin / student)
- Full test engine with anti-cheat (fullscreen, tab-switch, copy-paste blocking)
- Question bank with CSV import
- Test sharing via invite code, public link, QR code
- Basic analytics dashboard (charts, top performers, pass rate)
- Negative marking, shuffle, attempt limits

---

## High-value features you can add easily

These are all well-supported by the existing schema and stack — no DB changes needed for most:

### 1. Post-test Review Screen ⭐ (highest value)

The `allow_review` flag already exists in the `tests` table and `attempt_answers` stores what the student selected. You just need a UI that shows each question, the student's answer, and the correct answer after submission. Students currently get a score with zero feedback — this would dramatically improve the learning experience.

### 2. Test Edit (not just delete)

Tests can only be deleted right now. Adding an edit dialog (same form as create) would let admins fix typos, change timer, toggle settings — very common need.

### 3. Search & Filter in Tables

Questions, Students, and Tests tables have no search. Adding a simple text input filter on the frontend (no DB changes) would make managing large datasets much easier.

### 4. Restrict Navigation Enforcement

The `restrict_navigation` flag is stored but never enforced. One conditional in TestEngine to hide the Previous button and disable palette navigation would complete this feature.

### 5. Per-Student Analytics for Admins

The data is all there in `attempts` and `attempt_answers`. A student detail view showing their test history, average score, and per-test breakdown would give admins real insight. Currently they only see top 5 performers.

### 6. Bulk Student Import (CSV)

CSV import already exists for questions with a full parser/validator. Reusing the same pattern for students (name, email, password columns) would be straightforward.

### 7. Test Duplication / Clone

A "Duplicate" button on a test that copies the test config and its question assignments. Very useful when creating similar tests. One RPC or two inserts.

### 8. Question Tags / Categories

Adding a `tags` or `category` column to questions (or a separate tags table) would let admins filter questions when building tests. Especially useful as the question bank grows.

### 9. Pagination on Tables

Questions and Students tables load everything at once. Adding Supabase `.range()` pagination with simple prev/next controls would prevent performance issues at scale.

### 10. Admin Attempt Detail View

Admins can see scores but can't drill into a specific attempt to see which questions were answered correctly/incorrectly. The data exists in `attempt_answers` — just needs a detail page.

---

## Quick wins (UI polish, no schema changes)

- **Dark mode toggle** visible on all pages (already implemented on Auth, just needs to be added to nav)
- **Confirmation dialogs** before deleting students/questions (some exist, some don't)
- **Empty state illustrations** when tables have no data
- **Score percentage** shown alongside raw score in History page

---
