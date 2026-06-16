# NS Exam Portal - Project Structure

Clean monorepo organization with frontend and backend separation.

## 📁 Directory Structure

```
exam-portal-ns/
├── frontend/                    # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Route layouts
│   │   ├── contexts/            # React Context (auth, theme)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── integrations/        # Supabase/API clients
│   │   ├── utils/               # Helper functions
│   │   └── App.tsx              # Root router
│   ├── public/                  # Static assets
│   ├── index.html               # Entry point
│   ├── package.json             # Frontend dependencies
│   ├── vite.config.ts           # Vite configuration
│   ├── tsconfig.json            # TypeScript config
│   ├── tailwind.config.ts       # Tailwind CSS config
│   ├── postcss.config.js        # PostCSS config
│   ├── eslint.config.js         # ESLint config
│   └── components.json          # shadcn/ui config
│
├── backend/                     # Vercel Edge Functions + API routes
│   ├── api/                     # API endpoints
│   │   ├── _lib/                # Shared utilities
│   │   │   ├── auth.ts          # Authentication helpers
│   │   │   ├── db.ts            # Turso DB client
│   │   │   └── roles.ts         # Role-based access control
│   │   ├── rpc/                 # RPC/special functions
│   │   └── *.ts                 # Individual API routes
│   ├── .env                     # Backend environment variables
│   ├── .gitignore               # Git ignore rules
│   ├── bun.lock                 # Bun lock file
│   └── package.json             # Backend dependencies
│
├── docs/                        # Documentation
│   ├── architecture-db-schema.md
│   ├── features-flow.md
│   ├── implementation-status.md
│   └── supabase/                # Supabase config (reference)
│
├── config/                      # Configuration files
│   ├── complete-setup.sql       # Initial database schema
│   ├── turso-schema.sql         # Turso database schema
│   └── vercel.json              # Vercel deployment config
│
├── scripts/                     # Utility scripts
│   ├── migrate-to-turso.mjs     # Database migration script
│   └── test-api.mjs             # API testing script
│
├── .github/                     # GitHub workflows
│   └── workflows/
│       ├── deploy.yml           # Deployment workflow
│       └── keep-alive.yml       # Keep-alive workflow
│
├── .vscode/                     # VS Code settings
├── .git/                        # Git repository
├── README.md                    # Project overview
├── PROJECT_STRUCTURE.md         # This file
├── package.json                 # Root orchestration (npm workspaces)
└── .gitignore                   # Root git ignore

```

## 🚀 Quick Start

### Installation

```bash
# Install dependencies for both frontend and backend
cd frontend && npm install
cd ../backend && npm install
```

### Development

```bash
# From root directory
npm run dev          # Start frontend dev server (http://localhost:8081)
npm run lint         # Lint frontend code
npm run preview      # Preview production build
```

### Build & Deployment

```bash
# Build frontend for production
npm run build

# Deploy frontend to Vercel
npm run deploy:frontend

# Deploy backend API to Vercel
npm run deploy:backend
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Vercel Edge Functions, Node.js |
| **Database** | Turso (SQLite) |
| **Auth** | Supabase Auth (via JWT) |
| **File Storage** | Vercel Blob |
| **Deployment** | Vercel (frontend + backend), Turso (database) |

## 🔑 Environment Variables

### Frontend (`.env`)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_TURSO_URL=...
VITE_TURSO_TOKEN=...
```

### Backend (`backend/.env`)
```
VITE_TURSO_URL=...
TURSO_TOKEN=...
BLOB_STORE_ID=...
BLOB_READ_WRITE_TOKEN=...
```

## 📦 Dependencies

### Frontend
- React, React Router, React Hook Form
- shadcn/ui components (built on Radix UI)
- TailwindCSS, Tailwind Merge
- Supabase JS client
- TanStack React Query
- Recharts, Sonner, Lucide Icons

### Backend
- Vercel Node runtime
- @libsql/client (Turso driver)
- TypeScript

## 🚀 Deployment Notes

1. **Frontend**: Automatically deployed from `/frontend` directory on Vercel
2. **Backend**: API routes automatically deployed from `/backend/api` directory on Vercel
3. **Database**: Turso database queries use connection strings from environment variables

## 📝 Git Workflow

```bash
# Feature branches
git checkout -b feature/your-feature

# When changes are ready
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature

# Create PR and merge to main
# Vercel automatically deploys on merge
```

## 🔄 Key Files to Know

- **Frontend Entry**: `frontend/src/main.tsx` → `frontend/index.html`
- **Backend Entry**: `backend/api/` (Vercel auto-routes)
- **Routes Config**: `frontend/src/App.tsx`
- **API Utilities**: `backend/api/_lib/`
- **Database Client**: `backend/api/_lib/db.ts`

## ⚠️ Important Notes

- Both `frontend` and `backend` have their own `package.json`
- Root `package.json` is for orchestration via npm workspaces
- Environment variables are per directory (`.env` in each)
- Do NOT install dependencies at root level
- Always run scripts from the respective directory or use root orchestration commands

