# NS Exam Portal - Quick Start Guide

## ✅ Status: Backend & Frontend Working Locally

Both backend and frontend are running and all API routes are working correctly.

---

## Starting Development Environment

### Terminal 1: Backend Server (Port 8080)
```bash
cd backend
npm run build
node dist/server.js
```

Output should show:
```
Missing Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
Server listening on port 8080
```

✅ The missing Firebase env vars warning is **normal** - they're stored in GCP secrets for production

### Terminal 2: Frontend Server (Port 8081)
```bash
cd frontend
npm run dev
```

Access at: http://localhost:8081/auth

---

## Testing API Endpoints

### Test Health Check
```bash
curl http://localhost:8080/health
# Response: {"status":"ok"}
```

### Test Public API (No auth required)
```bash
curl "http://localhost:8080/api/clients?active_only=true"
# Response: [{"id":"...","name":"RGMCET","logo_url":"..."}]
```

### Test Protected API (Requires Firebase Auth)
```bash
# Will return 401 Unauthorized (expected without token)
curl http://localhost:8080/api/attempts
# Response: {"error":"Unauthorized"}
```

---

## Available API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | No | Health check |
| `/api/clients` | GET/POST/PATCH | Varies | Organization management |
| `/api/profiles` | GET/POST/PATCH | Yes | User profiles |
| `/api/attempts` | GET/POST | Yes | Exam attempts |
| `/api/attempt-answers` | GET/POST | Yes | Answer tracking |
| `/api/questions` | GET/POST/PATCH | Yes | Question bank |
| `/api/test-questions` | GET/POST | Yes | Test questions |
| `/api/tests` | GET/POST/PATCH | Yes | Exam tests |
| `/api/user-roles` | GET/POST | Yes | Role management |
| `/api/question-folders` | GET/POST/PATCH | Yes | Question organization |
| `/api/test-folders` | GET/POST/PATCH | Yes | Test organization |
| `/api/stats` | GET | Yes | Statistics |
| `/api/create-user` | POST | No | User creation |
| `/api/rpc/clone-test` | POST | Yes | Clone exam test |
| `/api/rpc/submit-attempt` | POST | Yes | Submit exam attempt |

---

## Current Setup

### Backend
- **Framework**: Express.js
- **Database**: Turso (LibSQL)
- **Auth**: Firebase (token validation)
- **Port**: 8080
- **Status**: ✅ Running with all routes

### Frontend
- **Framework**: React + Vite
- **Auth**: Firebase Client SDK
- **Database**: Turso (for auth flow)
- **Port**: 8081
- **Status**: ✅ Running with Vite dev server

### Database
- **Type**: Turso (LibSQL)
- **Connection**: Configured in backend/.env and frontend/.env
- **Status**: ✅ Connected

### Authentication
- **Provider**: Firebase
- **Methods**: Email/Password, Google, Anonymous
- **Status**: ✅ Implemented (needs Firebase Console config)

---

## Firebase Setup Required

Before testing authentication, you must:

1. **Enable Authentication Methods** in Firebase Console
   - Go to Authentication → Sign-in method
   - Enable: Email/Password, Google, Anonymous

2. **Add Authorized Domains** in Firebase Console
   - Go to Authentication → Settings
   - Add: `localhost:8081`, `127.0.0.1:8081`

3. **Create Test User** in Firebase Console
   - Go to Authentication → Users
   - Email: `test@example.com`
   - Password: `Test@12345`

See `FIREBASE_SETUP_CHECKLIST.md` for detailed instructions.

---

## Testing Authentication Flow

### 1. Email/Password Sign-In (After Firebase setup)
```bash
# Navigate to http://localhost:8081/auth
# Enter test user credentials:
# Email: test@example.com
# Password: Test@12345
# Click "Sign in"
```

### 2. Google Sign-In (After Firebase setup)
```bash
# Navigate to http://localhost:8081/auth
# Click "Sign in with Google"
# Use your Google account
```

### 3. Anonymous/Guest Sign-In
```bash
# Navigate to http://localhost:8081/auth
# Click "Continue as Guest"
```

---

## Troubleshooting

### Backend Won't Start
```bash
# Check port 8080 is free
lsof -i :8080

# If occupied, kill the process
kill -9 <PID>

# Then restart
cd backend && npm run build && node dist/server.js
```

### "Cannot GET /" or "Server Error"
- **Cause**: Frontend dev server routing issue
- **Fix**: Clear browser cache, hard refresh (Cmd+Shift+R)
- **Also**: Make sure both backend AND frontend are running

### API Returns 401 Unauthorized
- **Cause**: Protected route without auth token
- **Fix**: Sign in first via Firebase, then API calls will work

### "Error finding module" or import errors
- **Cause**: TypeScript compilation issue
- **Fix**: Run `npm run build` in backend/
- **Check**: `backend/dist/` folder should have .js files

### Firebase authentication errors
- See `FIREBASE_SETUP_CHECKLIST.md` for complete setup
- Check browser console (F12) for detailed error messages

---

## Development Workflow

### Making Backend Changes
```bash
# 1. Edit backend code
vim backend/api/clients.ts

# 2. Rebuild TypeScript
cd backend && npm run build

# 3. Restart backend (or it auto-reloads if using nodemon)
# If using node dist/server.js, stop and restart

# 4. Test API
curl http://localhost:8080/api/clients?active_only=true
```

### Making Frontend Changes
```bash
# 1. Edit frontend code
vim frontend/src/pages/Auth/Page.tsx

# 2. Vite auto-reloads (no rebuild needed)
# Just refresh browser

# 3. Check browser console for errors (F12)
```

### Database Changes
```bash
# Database is Turso (managed)
# Changes are made via queries in API files
# Schema defined in docs/supabase/migrations/

# For local development, use:
# npx turso db shell ns-exam-portal-ns-software-solutions
```

---

## Deployment to GCP

When ready to deploy to production:

```bash
# 1. Ensure all changes are committed
git status
git add .
git commit -m "Your message"
git push origin main

# 2. Build Docker image
docker build -f backend/Dockerfile -t exam-portal-ns .

# 3. Deploy to Cloud Run
gcloud run deploy exam-portal-ns \
  --image=exam-portal-ns \
  --region=asia-south2 \
  --allow-unauthenticated

# See DEPLOYMENT_NEXT_STEPS.md for full deployment guide
```

---

## Useful Commands

### Build Backend
```bash
cd backend && npm run build
```

### Start Backend Dev Mode (with auto-reload)
```bash
cd backend && npm run dev
```

### Start Frontend Dev
```bash
cd frontend && npm run dev
```

### Build Frontend for Production
```bash
cd frontend && npm run build
# Output: frontend/dist/
```

### Test Database Connection
```bash
npx turso db shell ns-exam-portal-ns-software-solutions
# Then: SELECT COUNT(*) FROM clients;
```

### View Backend Logs
```bash
# If running in terminal, see logs directly
# Or if using process manager:
journalctl -u exam-portal -f
```

### View GCP Logs
```bash
gcloud run logs read exam-portal-ns --region=asia-south2 --limit=100
```

---

## File Structure

```
exam-portal-ns/
├── backend/              # Express backend
│   ├── api/             # API route handlers
│   │   ├── clients.ts   # /api/clients
│   │   ├── profiles.ts  # /api/profiles
│   │   ├── tests.ts     # /api/tests
│   │   ├── _lib/        # Shared utilities
│   │   └── rpc/         # Custom RPC endpoints
│   ├── dist/            # Compiled JavaScript
│   ├── server.ts        # Express app setup
│   ├── package.json     # Dependencies
│   └── Dockerfile       # Docker build config
│
├── frontend/            # React + Vite frontend
│   ├── src/
│   │   ├── contexts/    # React contexts (Auth)
│   │   ├── pages/       # Page components
│   │   ├── components/  # UI components
│   │   └── integrations/ # Firebase, Turso
│   ├── dist/            # Built app
│   ├── package.json     # Dependencies
│   └── vite.config.ts   # Vite config
│
├── docs/                # Documentation
│   └── supabase/migrations/ # Database migrations
│
├── .github/workflows/   # GitHub Actions
├── cloudbuild.yaml      # GCP Cloud Build config
└── README.md            # Project overview
```

---

## Next Steps

1. ✅ **Backend Working Locally** - All API routes operational
2. ✅ **Frontend Working Locally** - Can make auth requests
3. ⏳ **Configure Firebase** - See FIREBASE_SETUP_CHECKLIST.md
4. ⏳ **Test Auth Flow** - Sign in with all 3 methods
5. ⏳ **Deploy to GCP** - See DEPLOYMENT_NEXT_STEPS.md

---

## Support

- **Backend Issues**: Check `BACKEND_STATUS.md`
- **Firebase Issues**: Check `FIREBASE_SETUP_CHECKLIST.md`
- **Deployment Issues**: Check `DEPLOYMENT_NEXT_STEPS.md`
- **GCP Issues**: Check GCP Cloud Run dashboard

---

## Quick Reference

| What | Command | Port |
|------|---------|------|
| Start Backend | `cd backend && npm run build && node dist/server.js` | 8080 |
| Start Frontend | `cd frontend && npm run dev` | 8081 |
| Test Health | `curl http://localhost:8080/health` | - |
| View App | http://localhost:8081 | - |
| View Auth Page | http://localhost:8081/auth | - |

---

**Everything is set up and ready to go!** 🚀

Start with the Quick Start steps above, then configure Firebase following the checklist.
