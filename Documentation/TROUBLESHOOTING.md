# NS Exam Portal - Troubleshooting Guide

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Build Failures](#build-failures)
3. [Deployment Issues](#deployment-issues)
4. [Database Problems](#database-problems)
5. [Authentication Issues](#authentication-issues)
6. [Runtime Issues](#runtime-issues)

---

## Local Development Setup

### Node.js Version Mismatch

**Problem**: Build fails with "Node version not compatible"

**Solution**:
```bash
# Check current Node version
node --version

# Should be 18+ (22+ recommended)
# Update if needed
brew install node@22  # macOS
nvm install 22 && nvm use 22  # Using nvm
```

### npm Dependencies Installation Fails

**Problem**: `npm install` fails with permission or network errors

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If behind proxy, configure npm
npm config set registry https://registry.npmjs.org/
npm config set proxy [proxy-address]
npm config set https-proxy [https-proxy-address]
```

### Port Already in Use

**Problem**: Backend/Frontend fails to start: "EADDRINUSE: address already in use"

**Solution**:
```bash
# Find process using port 8080 (backend)
lsof -i :8080
kill -9 <PID>

# Find process using port 5173 (frontend)
lsof -i :5173
kill -9 <PID>

# Or specify different port
PORT=8081 npm run dev:backend
```

### Missing Environment Variables

**Problem**: Application fails to start with "missing required environment variable"

**Solution**:
```bash
# Copy example env file
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit and fill in values
# Backend requires:
# - TURSO_DATABASE_URL
# - TURSO_AUTH_TOKEN
# - FIREBASE_PROJECT_ID
# - FIREBASE_CLIENT_EMAIL
# - FIREBASE_PRIVATE_KEY

# Frontend requires:
# - VITE_API_URL
# - VITE_FIREBASE_API_KEY
# - VITE_FIREBASE_AUTH_DOMAIN
# - VITE_FIREBASE_PROJECT_ID
# - VITE_FIREBASE_APP_ID
```

### Firebase Credentials Invalid

**Problem**: "Firebase initialization failed" or "Invalid service account"

**Solution**:
```bash
# Verify Firebase credentials
# 1. Go to Firebase Console
# 2. Project Settings > Service Accounts
# 3. Generate new key (JSON)
# 4. Copy private key content

# In backend/.env:
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Note: Preserve \n for newlines
# Can also use:
export FIREBASE_PRIVATE_KEY=$(cat /path/to/key.json | jq -r '.private_key')
```

---

## Build Failures

### TypeScript Compilation Errors

**Problem**: `npm run build` fails with TypeScript errors

**Solution**:
```bash
# Check for type errors
npx tsc --noEmit

# Fix common issues
# 1. Missing type definitions
npm install --save-dev @types/node

# 2. Strict mode violations
# Check tsconfig.json "strict": true
# Add type annotations or use 'any' temporarily

# 3. Clear build cache
rm -rf dist/ .tsc-cache/
npm run build
```

### ESLint/Lint Errors

**Problem**: Linting fails before build

**Solution**:
```bash
# Check lint errors
npm run lint

# Fix automatically where possible
npm run lint -- --fix

# Or disable for specific lines
// eslint-disable-next-line
const anyVariable = something;
```

### Frontend Build Size Too Large

**Problem**: Frontend bundle exceeds size limits

**Solution**:
```bash
# Analyze bundle
npm run build
npm install -g source-map-explorer
source-map-explorer 'dist/**/*.js'

# Optimize:
# 1. Enable code splitting in vite.config.ts
# 2. Lazy load heavy components
# 3. Use dynamic imports
# 4. Remove unused dependencies

# In vite.config.ts:
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        ui: ['shadcn-ui']
      }
    }
  }
}
```

### Docker Build Failures

**Problem**: Docker build fails during backend container creation

**Solution**:
```bash
# Check Dockerfile syntax
docker build --tag exam-portal-backend .

# Common issues:
# 1. Node version in Dockerfile
# FROM node:22 (check latest LTS)

# 2. Missing .dockerignore entries
echo "node_modules" >> .dockerignore
echo ".env" >> .dockerignore
echo "dist" >> .dockerignore

# 3. Build context too large
# Remove node_modules before build
rm -rf node_modules
docker build --tag exam-portal-backend .
```

---

## Deployment Issues

### GCP Cloud Run Deployment Fails

**Problem**: `gcloud run deploy` fails or service starts but doesn't respond

**Solution**:
```bash
# 1. Check authentication
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Build and push image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/exam-portal-api

# 3. Deploy
gcloud run deploy exam-portal-api \
  --image gcr.io/YOUR_PROJECT_ID/exam-portal-api \
  --platform managed \
  --region asia-south2 \
  --allow-unauthenticated

# 4. Check logs if fails
gcloud run logs read exam-portal-api --region asia-south2 --limit 50

# 5. Verify environment variables
gcloud run services describe exam-portal-api --region asia-south2
```

### Cloudflare Pages Deployment Fails

**Problem**: Frontend deployment to Cloudflare Pages fails

**Solution**:
```bash
# 1. Install wrangler
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Build frontend
npm run build

# 4. Deploy
wrangler pages deploy dist/

# 5. Configure in wrangler.toml
[env.production]
vars = { API_URL = "https://api.example.com" }

# 6. Check deployment
wrangler pages deployments list

# Common fixes:
# - Verify build output in dist/
# - Check VITE_API_URL is correct
# - Ensure index.html exists in dist/
```

### Environment Variables Not Loaded

**Problem**: Deployed service missing environment variables

**Solution**:
```bash
# GCP Cloud Run
gcloud run services update exam-portal-api \
  --set-env-vars TURSO_DATABASE_URL=libsql://...,TURSO_AUTH_TOKEN=...

# Verify
gcloud run services describe exam-portal-api --region asia-south2

# Cloudflare Pages
# Set in wrangler.toml or via dashboard
wrangler secret put VITE_API_URL
# Enter value when prompted
```

---

## Database Problems

### Turso Connection Fails

**Problem**: "Cannot connect to Turso database" or "Connection timeout"

**Solution**:
```bash
# 1. Verify connection string format
# Should be: libsql://namespace-org.turso.io?authToken=token

# 2. Check authentication token
# In Turso dashboard > Database > Auth Tokens

# 3. Test connection locally
curl -H "Authorization: Bearer TOKEN" \
  https://namespace-org.turso.io

# 4. In code, check environment variables
echo $TURSO_DATABASE_URL
echo $TURSO_AUTH_TOKEN

# 5. Restart application after env changes
npm run dev
```

### Migration Fails or Hangs

**Problem**: Database migrations hang or fail during startup

**Solution**:
```bash
# 1. Check logs for specific error
# Application logs should show migration step

# 2. If migrations hung:
# - Kill application
# - Check database status in Turso dashboard
# - No action needed (migrations safe)
# - Restart application

# 3. If specific column already exists:
# This is expected - migrations skip existing columns
# Check db.ts for ALTER TABLE IF NOT EXISTS

# 4. Manual migration recovery
# Connect directly to Turso
turso db shell exam-portal

# View tables
.tables

# Check column
.schema tests
```

### Database Out of Sync

**Problem**: Schema doesn't match expected structure

**Solution**:
```bash
# 1. Verify schema
turso db shell exam-portal
.schema

# 2. Check db.ts migrations
# Look for all CREATE TABLE and ALTER TABLE statements

# 3. Re-run specific migration
# Edit db.ts to comment out completed migrations
# Keep pending ones
# Restart application

# 4. If corrupted, restore from backup
# Contact Turso support for point-in-time restore
```

### Query Timeout or Slow Queries

**Problem**: Database queries take too long

**Solution**:
```bash
# 1. Check indexes exist
turso db shell exam-portal
.indexes

# 2. Verify all strategic indexes are created
# See DATABASE_SCHEMA.md for index list

# 3. Enable query logging
NODE_ENV=development npm run dev

# 4. Optimize queries
# - Add pagination (LIMIT/OFFSET)
# - Filter early (WHERE clauses)
# - Use indexes for filters

# 5. Check query statistics
turso stats READ exam-portal
```

---

## Authentication Issues

### Firebase Token Invalid or Expired

**Problem**: "Invalid token" error on API requests

**Solution**:
```bash
# 1. Verify Firebase project ID
# Check FIREBASE_PROJECT_ID matches Firebase Console

# 2. Check token expiry
# Frontend should auto-refresh before expiry

# 3. For development, generate test token
// In Firebase Console > Authentication
// Create test user and get ID token

# 4. Verify CORS allows Firebase domains
# Check server.ts CORS configuration
// Should include .firebaseapp.com

# 5. Check ADC (Application Default Credentials) on Cloud Run
# Automatically uses service account
# Verify IAM roles in GCP Console
```

### Guest Authentication Fails

**Problem**: Guest user cannot access attempt

**Solution**:
```bash
# 1. Verify attempt_token is included
# Query parameter or header: x-attempt-token

# 2. Check token matches database
# Compare token in request with attempt_token in attempts table

# 3. Verify attempt exists and belongs to guest
turso db shell exam-portal
SELECT * FROM attempts WHERE id = 'attempt-uuid';
SELECT * FROM profiles WHERE id = student_id;

# 4. Check guest profile created
# Guest profiles have email like: guest_firebase_*@temp.exam

# 5. Ensure anonymous auth enabled in Firebase
# Firebase Console > Authentication > Sign-in method
# Enable Anonymous checkbox
```

### CORS Errors

**Problem**: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution**:
```bash
# 1. Check CORS configuration in server.ts
# Verify frontend domain in allowedOrigins

# 2. Add frontend domain if missing
// In backend/src/server.ts
const allowedOrigins = [
  "http://localhost:3000",
  "https://test.nssoftwaresolutions.in",
  // Add your domain
];

# 3. Restart backend
npm run dev:backend

# 4. If using Firebase domains
# Already allowed: .firebaseapp.com, .pages.dev
```

### Session Persistence Issues

**Problem**: User logged in but session lost on refresh

**Solution**:
```bash
# 1. Verify token storage in browser
// In browser DevTools > Application > Local Storage
// Check: firebase:authUser:*

# 2. Check Firebase SDK initialization
// In frontend/src/integrations/firebase/client.ts
// Verify apiKey, authDomain, projectId

# 3. Clear browser cache and cookies
// DevTools > Application > Clear Storage
// Refresh page

# 4. Verify AuthContext provider setup
// Check frontend/src/contexts/AuthContext.tsx
// Ensure useEffect sets up onAuthStateChanged
```

---

## Runtime Issues

### High Memory Usage

**Problem**: Application uses excessive memory

**Solution**:
```bash
# 1. Monitor memory
# Backend: Check Cloud Run metrics
gcloud run services describe exam-portal-api --region asia-south2

# 2. Check for memory leaks
# Backend: Add memory profiling
NODE_OPTIONS=--max-old-space-size=1024 npm run dev

# 3. Optimize database queries
# Use pagination
# Avoid fetching unnecessary columns

# 4. Clear old logs
# Database: Archive old audit_logs if table grows large
```

### High CPU Usage

**Problem**: Application uses excessive CPU

**Solution**:
```bash
# 1. Check for infinite loops or blocking operations
# Review recent code changes

# 2. Optimize expensive operations
# Move heavy computations to background jobs
# Use pagination for large queries

# 3. Enable rate limiting
# Verify DISABLE_RATE_LIMITER not set to true in production
# Check rate limit configuration in server.ts

# 4. Check concurrent requests
# Use load balancing if needed
# Review GCP Cloud Run concurrency settings
```

### Proctoring Events Not Logging

**Problem**: Proctoring events not stored

**Solution**:
```bash
# 1. Verify feature enabled
// Check isFeatureEnabled('advanced_proctoring')

# 2. Check table exists
turso db shell exam-portal
SELECT * FROM proctoring_events LIMIT 1;

# 3. Verify event structure
// POST /api/proctoring/events should receive:
{
  "attempt_id": "uuid",
  "test_id": "uuid",
  "event_type": "TAB_SWITCH",
  "severity": "LOW"
}

# 4. Check network requests
// Browser DevTools > Network
// Look for POST /api/proctoring/events
// Check response status

# 5. Verify permissions
// Student should have permission to log events
```

### Score Not Calculating

**Problem**: Attempt score shows null or incorrect value

**Solution**:
```bash
# 1. Verify submission completed
turso db shell exam-portal
SELECT * FROM attempts WHERE id = 'attempt-uuid';
# Check: score NOT NULL, submitted_at NOT NULL

# 2. Check answers saved
SELECT COUNT(*) FROM attempt_answers WHERE attempt_id = 'attempt-uuid';

# 3. Verify correct answers stored
SELECT * FROM questions WHERE id = 'question-uuid';
# Check: correct_answer column populated

# 4. Check grading logic
// Review POST /api/rpc/submit-attempt handler
// Verify all answers compared against correct_answer

# 5. Resubmit attempt if needed
// POST /api/rpc/submit-attempt with same attempt_id
// Should return 400 (duplicate) or update score
```

---

## Getting Support

### Debug Information to Collect

When reporting issues, include:

```bash
# System information
node --version
npm --version
git status

# Error logs
npm run dev 2>&1 | head -100

# Database status
turso db shell exam-portal
SELECT COUNT(*) FROM clients;

# Environment check
echo "API: $VITE_API_URL"
echo "Firebase Project: $VITE_FIREBASE_PROJECT_ID"

# Browser console errors
// Open DevTools > Console
// Screenshot of error messages

# Recent changes
git log --oneline -10
git diff HEAD~1
```

### Contact Information

- **Email**: info.nssoftwaresolutions@gmail.com
- **Documentation**: [docs.nssoftwaresolutions.in/exam-portal](https://docs.nssoftwaresolutions.in/exam-portal)
- **GitHub Issues**: Report bugs with system info