# NS Exam Portal

A production-grade multi-tenant online examination platform for educational institutions and corporate assessment providers. Built on a decoupled React + Express + Turso (libSQL) stack, deployed on Cloudflare Pages and GCP Cloud Run.

**Developed and maintained by [NS Software Solutions](https://www.nssoftwaresolutions.in)**

---

## Table of Contents

- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Development Guidelines](#development-guidelines)
- [Known Limitations](#known-limitations)
- [Support](#support)

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Firebase Admin service account credentials
- Turso database instance and auth token
- Git

### Installation

**1. Clone the repository:**
```sh
git clone <YOUR_GIT_URL>
cd exam-portal-ns
```

**2. Configure the backend:**
```sh
cd backend
cp .env.example .env
# Edit backend/.env — add Turso URL/token and Firebase service account credentials
npm install
```

**3. Configure the frontend:**
```sh
cd ../frontend
cp .env.example .env
# Edit frontend/.env — add Firebase public config and VITE_API_URL
npm install
```

**4. Start development servers:**

Backend (port 8082 by default):
```sh
cd backend
npm run dev
```

Frontend (Vite dev server):
```sh
cd frontend
npm run dev
```

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18, TypeScript, Vite | Single Page Application with code splitting |
| UI | shadcn/ui (Radix UI + Tailwind CSS) | Dark/light theme support, accessible components |
| Routing | React Router v6 | Role-based layout structures with protected routes |
| Auth (client) | Firebase Authentication | Anonymous (guest) + email/password + token refresh |
| Backend | Node.js 22, Express, TypeScript | REST API + RPC endpoints, ESM modules |
| Database | Turso (libSQL / SQLite) | Serverless, edge-distributed with global replication |
| Auth (server) | Firebase Admin SDK | JWT verification, ADC on Cloud Run |
| File Storage | Firebase Storage (GCS) | Proctoring evidence with signed URLs |
| Hosting — Frontend | Cloudflare Pages | Edge CDN, custom domain: `test.nssoftwaresolutions.in` |
| Hosting — Backend | GCP Cloud Run (Asia South 2) | Containerized, auto-scaling, health monitoring |
| CI/CD | GCP Cloud Build | Automated build and deployment pipeline |
| Monitoring | GCP Cloud Monitoring | Performance metrics, logs, alerts |

---

## Features

### Multi-Role Platform

| Role | Access |
|---|---|
| **Super Admin** | Full platform control — tenant management, subscription and billing administration, global settings, audit logs, security. |
| **Client Admin** | Organizational control — question banks, test creation, student roster, analytics, subscription and Pay Per Test management. |
| **Student** | Test-taking, history, post-submission scorecard and XLSX performance report download. |
| **Guest Student** | Anonymous exam access via share code, no account required. |

### Subscription & Billing System

- **Four subscription tiers**: Free, Starter (₹1,999/mo), Growth (₹3,999/mo), Enterprise (custom).
- **Plan-driven limits**: exams per month, candidates per exam, questions per exam — enforced server-side at every write operation.
- **Plan-driven feature flags**: `csv_import`, `xlsx_export`, `analytics`, `custom_branding`, `advanced_proctoring`, `camera_proctoring`.
- **Subscription request workflow**: Client Admins submit upgrade requests; Super Admins approve (auto-syncs limits, features, history) or reject.
- **Automatic expiry**: subscription status flips to `expired` on every `/api/superadmin/subscriptions` fetch when `expiry_date` is past.
- **Pay Per Test (PPT) System**: Transactional assessment packages (Base ₹99, Basic ₹199, Standard ₹399, Professional ₹499, Placement Drive ₹1,499). Features include question limits (50-200), candidate capacity (50-500), proctoring controls, branding, and analytics. Client requests → Super Admin approves → Inventory available → Consumed on test creation with hard limits locked in `test_billing`.

### Test Management

- Folder-based test organization with uncategorized fallback.
- Draft / Published workflow with `status` and `active` field sync.
- Scheduled activation and termination windows (`scheduled_start` / `scheduled_end`).
- Configurable attempts limit per student (0 = unlimited).
- Guest access toggle and public link with 8-character share code and QR code.
- Test cloning (`POST /api/rpc/clone-test`) — copies questions, clears schedule, resets share code, forces `draft` status.
- `read_only` lock: auto-applied when Pay Per Test candidate capacity is exhausted; blocks structural edits while allowing branding/visibility changes.

### Assessment Builder

- Visual question palette with drag-and-drop-style reordering.
- Multi-section support with per-section configuration:
  - Custom countdown timer (`duration_minutes`)
  - Navigation lock (once candidate advances, prior section is locked)
  - Shuffle questions and/or options independently
  - Section-level negative marks override
- Question types: `mcq`, `true_false`, `multi_select`, `fill_blank`, `subjective`, `coding`.
- Bulk CSV question import with two-stage validation, batch rollback by `import_batch_id`, and question versioning.

### Exam Engine (Student / Guest)

- Fullscreen enforcement with violation counter (3 strikes → auto-submit).
- Tab-switch / window-blur detection.
- Copy, paste, cut, right-click blocking.
- CSS text selection disabled on exam content.
- Section countdown timers with auto-advance or auto-submit on expiry.
- Section navigation lock: backend enforces via timer elapsed check and answer progression tracking — not just client-side.
- Auto-save answers with 2-second debounce (`POST /api/attempt-answers`).
- Auto-flush dirty answers before submission.
- Score masked until `show_results_after_submission = 1` AND `result_status = published`.

### Grading

- Server-side grading only (`POST /api/rpc/submit-attempt`).
- Supports single correct (`correct_answer`) and multi-select (`correct_answers` JSON array).
- Section-level negative marks override test-level negative marks.
- Score is floored at 0 (cannot go negative).
- Submission idempotent — duplicate submits return 400.

### Proctoring

- Event types: `TAB_SWITCH`, `WINDOW_BLUR`, `FULLSCREEN_EXIT`, `NO_FACE`, `MULTIPLE_FACES`, `CAMERA_DISCONNECTED`, `CAMERA_PERMISSION_DENIED`.
- Severity scoring: LOW (1), MEDIUM (2–3), HIGH (5). Total risk score per attempt.
- Evidence snapshots (base64 → Firebase Storage GCS) for `NO_FACE`, `MULTIPLE_FACES`, `CAMERA_DISCONNECTED`.
- 30-second deduplication window: repeated events accumulate duration instead of inserting duplicates.
- Signed URLs (15-minute expiry) for evidence image retrieval.
- Feature-gated: `advanced_proctoring` (basic events) and `camera_proctoring` (camera events).

### Analytics

- **Super Admin dashboard**: total clients, students, questions, tests, attempts; subscription plan distribution; expiring-soon alerts; today's exam activity and proctoring events; top orgs by student count; live load metrics (concurrent users, RPS, CPU, memory, API latency).
- **Client Admin dashboard**: student/question/test counts; average score and pass rate; top 5 performers; per-test performance breakdown.
- XLSX performance report: 3-sheet workbook (Summary, Detailed Questions, Analytics) with signed download for guests via `attempt_token`.

### Security

- Firebase ID token verification on every authenticated request.
- Tenant isolation: every query scoped to `client_id` resolved from the authenticated user's profile.
- BOLA/IDOR protection: all attempt/answer/proctoring reads verify `student_id === user.id` or admin role.
- Guest attempt token: `attempt_token` (UUID) required for all guest read/write/submit/report/proctoring operations.
- Rate limiting: 1,000 req/15 min global; 100 req/min on auth-sensitive endpoints.
- Maintenance mode: globally blocks new attempt creation when enabled; admin panels stay accessible.

### Platform Controls (Super Admin)

- Maintenance mode toggle.
- Platform-wide announcement banner.
- User registration enable/disable.
- Platform branding logo (base64 or URL, reflected in all admin sidebars).
- Password reset for any user (Firebase Admin SDK).
- Paginated audit log with filters (user, action, entity type, date range).
- Client suspension (sets `active_status = 0`, blocks all exam operations for that tenant).

---

## Project Structure

```
exam-portal-ns/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   └── auth.ts              # Firebase Admin SDK init + token verification
│   │   ├── db/
│   │   │   └── db.ts                # Turso client init + all schema migrations
│   │   ├── middleware/
│   │   │   ├── auth.ts              # Global auth context extractor
│   │   │   └── authz.ts             # requireRole() middleware factory
│   │   ├── routes/
│   │   │   ├── rpc/
│   │   │   │   ├── clone-test.ts    # Test duplication handler
│   │   │   │   └── submit-attempt.ts # Server-side grading engine
│   │   │   ├── attempt-answers.ts   # Answer save/load with section lock enforcement
│   │   │   ├── attempts.ts          # Attempt lifecycle management
│   │   │   ├── audit-logs.ts        # Paginated audit log viewer (superadmin)
│   │   │   ├── clients.ts           # Tenant CRUD + limits + features
│   │   │   ├── create-user.ts       # Firebase + Turso user provisioning
│   │   │   ├── packages.ts          # Pay Per Test package catalog + purchases
│   │   │   ├── proctoring.ts        # Proctoring event logging + evidence upload
│   │   │   ├── profiles.ts          # User profile management
│   │   │   ├── question-folders.ts  # Question category folders
│   │   │   ├── questions.ts         # Question bank CRUD + bulk import
│   │   │   ├── report.ts            # XLSX performance report generation
│   │   │   ├── settings.ts          # Global platform settings
│   │   │   ├── stats.ts             # Dashboard analytics
│   │   │   ├── subscription-requests.ts # Upgrade request workflow
│   │   │   ├── subscriptions.ts     # Subscription management (superadmin)
│   │   │   ├── test-folders.ts      # Test folder management
│   │   │   ├── test-questions.ts    # Test-question linking + quota enforcement
│   │   │   ├── test-sections.ts     # Section CRUD
│   │   │   └── tests.ts             # Test lifecycle + PPT integration
│   │   ├── services/
│   │   │   ├── audit.ts             # createAuditLog() helper
│   │   │   ├── billing.ts           # PPT package assignment + limit validation
│   │   │   ├── features.ts          # isFeatureEnabled() — plan + override lookup
│   │   │   ├── limits.ts            # getClientLimits() + usage tracking
│   │   │   └── roles.ts             # hasRole(), getUserClientId(), isGuestStudent()
│   │   ├── validation/
│   │   │   └── schemas.ts           # Zod schemas for test and question payloads
│   │   └── server.ts                # Express entry point, routes, rate limiters
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/              # Reusable UI (Auth, Brand, ClientAdmin, SuperAdmin, TestEngine)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx      # Firebase auth state + role resolution
│   │   ├── integrations/
│   │   │   └── firebase/client.ts   # Firebase client SDK initialization
│   │   ├── pages/
│   │   │   ├── SuperAdmin/          # Dashboard, Clients, Packages, Subscriptions, AuditLogs, Settings
│   │   │   ├── ClientAdmin/         # Dashboard, Tests, Questions, Students, Subscription, Plans, PackageSelection
│   │   │   ├── Student/             # Dashboard, Engine, History, Review, SubmitSuccess
│   │   │   └── Test/                # Join (public share code entry)
│   │   ├── services/
│   │   │   └── api/client.ts        # All API calls — typed apiFetch wrapper + domain APIs
│   │   └── hooks/                   # useToast, useMobile
│   ├── wrangler.toml                # Cloudflare Pages deployment config
│   └── package.json
├── docs/                            # Technical documentation
└── cloudbuild.yaml                  # GCP Cloud Build pipeline
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port. Default: `8080`. |
| `TURSO_DATABASE_URL` | Yes | Turso connection URL (`libsql://...`). |
| `TURSO_AUTH_TOKEN` | Yes | Turso authentication token. |
| `FIREBASE_PROJECT_ID` | Yes* | Firebase project ID for token verification. |
| `FIREBASE_CLIENT_EMAIL` | Yes* | Firebase service account email. |
| `FIREBASE_PRIVATE_KEY` | Yes* | Firebase service account private key (newlines as `\n`). |
| `FIREBASE_STORAGE_BUCKET` | No | GCS bucket for proctoring evidence. Defaults to `<PROJECT_ID>.appspot.com`. |
| `DISABLE_RATE_LIMITER` | No | Set `true` to disable rate limiting (k6 load tests only). |
| `FRONTEND_URL` | No | Additional CORS origin. |
| `NODE_ENV` | No | `production` disables fallback JWT decode. |

*Not required when running on Cloud Run with Application Default Credentials (`K_SERVICE` set).

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend API base URL (e.g., `https://api.example.com`). |
| `VITE_FIREBASE_API_KEY` | Yes | Firebase public API key. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain. |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID. |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID. |

---

## Deployment

### Frontend — Cloudflare Pages

```sh
cd frontend
npm run build
# Deploy via Cloudflare Pages dashboard or wrangler
npx wrangler pages deploy dist
```

The `wrangler.toml` file in the frontend directory contains the Cloudflare Pages project configuration.

### Backend — GCP Cloud Run

The backend is containerized using a multi-stage Dockerfile:

```sh
# Build and deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml

# Or deploy directly
gcloud run deploy exam-portal-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars TURSO_DATABASE_URL=...,TURSO_AUTH_TOKEN=...
```

The production deployment at `https://exam-portal-ns-479112457276.asia-south2.run.app` uses Application Default Credentials (no manual Firebase key files needed on Cloud Run).

---

## Development Guidelines

### Running Tests

```sh
# Backend unit tests (Vitest)
cd backend
npm test

# Load tests (k6)
k6 run backend/loadtest.js
```

### Code Style

- TypeScript strict mode throughout.
- All API routes use a single handler function pattern (`export default async function handler`).
- Zod validation on all incoming request bodies for create/update operations.
- Boolean fields stored as SQLite INTEGER (0/1); `rowBools()` helper converts on read.

### Adding a New Feature Flag

1. Add the feature name to `subscription_plan_features` seeds in `db.ts`.
2. Use `isFeatureEnabled(clientId, 'feature_name')` in the relevant route handler.
3. Add the feature checkbox to the `ClientSettings.tsx` module licensing panel.

### Database Migrations

All schema changes are applied automatically at startup via `runMigrations()` in `db.ts`. New columns use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pattern with `try/catch` to skip already-applied changes. New tables use `CREATE TABLE IF NOT EXISTS`.

---

## Known Limitations & Future Enhancements

### Current Limitations
- **Email Notifications**: No automated email system for test assignments or subscription updates (manual communication required)
- **Proctoring Authenticity**: Evidence is client-reported without server-side camera validation (future: AI-based verification)
- **Subscription Expiry**: Lazy checking on Super Admin page load rather than scheduled cron jobs
- **Payment Integration**: Manual billing process without automated payment gateway (planned: Stripe/Razorpay)
- **Advanced Analytics**: Limited to basic metrics, lacking predictive analytics and distractor analysis

### Technical Constraints
- **Browser Security**: Client-side proctoring can be circumvented by determined users with DevTools access
- **Network Dependency**: Requires stable internet connection with auto-save grace periods
- **Camera Reliability**: Dependent on candidate hardware and environment quality
- **Mobile Support**: Responsive design but no native mobile application

### Future Roadmap
- **Short Term (3 months)**: Email notifications, enhanced proctoring, payment integration
- **Medium Term (6-12 months)**: Live proctoring, coding sandbox, AI question generation
- **Long Term (12+ months)**: Blockchain certificates, AR/VR assessments, global deployment

---

## Comprehensive Documentation

The platform includes detailed documentation for developers, administrators, and auditors:

### Core Documentation
- **ARCHITECTURE.md**: Complete system architecture and design decisions
- **DATABASE_SCHEMA.md**: Detailed ERD, table documentation, and business rules
- **SECURITY_AND_EXAM_INTEGRITY.md**: Security controls, proctoring, and compliance features
- **CHANGELOG.md**: Version history and feature evolution
- **Features-Flow.md**: Role-based workflows and user journeys
- **DOCUMENTATION_HEALTH_SUMMARY.md**: Documentation completeness assessment

### Technical Documentation
- **Project Structure**: See `STRUCTURE.txt` for detailed organization
- **API Reference**: REST API endpoints with authentication requirements
- **Database Migrations**: Runtime schema evolution strategy
- **Deployment Guide**: Production deployment on GCP Cloud Run + Cloudflare Pages
- **Development Guidelines**: Code standards, testing, and contribution processes

## Support & Contact

**Developed by:** [NS Software Solutions](https://www.nssoftwaresolutions.in)
**Email:** info.nssoftwaresolutions@gmail.com
**Internship Program:** [internships.nssoftwaresolutions.in](https://internships.nssoftwaresolutions.in)
**Documentation:** [docs.nssoftwaresolutions.in/exam-portal](https://docs.nssoftwaresolutions.in/exam-portal)

---

## License

© 2024–2026 NS Software Solutions. All rights reserved.

---

## Acknowledgments

- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) for accessible, customizable components
- **Database**: [Turso (libSQL)](https://turso.tech/) for edge-distributed SQLite
- **Authentication**: [Firebase](https://firebase.google.com/) for production-grade auth
- **Hosting**: [GCP Cloud Run](https://cloud.google.com/) + [Cloudflare Pages](https://pages.cloudflare.com/)
- **Monitoring**: GCP Cloud Monitoring for observability and alerting
- **Open Source Community**: All libraries and tools that power this platform
