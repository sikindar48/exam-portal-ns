# Firebase Authentication Deployment - Next Steps

## Current Status
✅ **Completed:**
- Firebase authentication fully implemented with 3 auth methods:
  - Email/Password sign-in and sign-up
  - Google OAuth sign-in
  - Anonymous sign-in
- Backend security headers added (`server.ts` with CORS and COOP headers)
- Frontend redesigned with modern UI
- Both frontend and backend built and ready

❌ **Blockers:**
- Firebase authenticated domains not configured
- Backend security headers not yet deployed to GCP
- GCP IAM permission issue preventing direct deployment
- No test user accounts created in Firebase

---

## Step 1: Configure Firebase Authorized Domains (REQUIRED)

Firebase is blocking requests because the domain isn't authorized. You must add these domains to Firebase Console:

### In Firebase Console:
1. Go to **Firebase Console** → **Authentication** → **Settings**
2. Scroll down to **Authorized domains**
3. Add these domains:
   - `exam-portal-ns-479112457276.asia-south2.run.app` (current GCP deployment)
   - `localhost:8081` (local development)
   - `test.nssoftwaresolutions.in` (custom domain - when ready)
   - `test.nssoftwaresolutions.in:443` (HTTPS custom domain)

### Why this matters:
- Firebase Identity Toolkit API checks the request origin
- Without authorized domain, you get `net::ERR_EMPTY_RESPONSE`
- This is a security feature; all Firebase apps must whitelist their domains

---

## Step 2: Create Test User Account in Firebase (REQUIRED for Email/Password Testing)

### In Firebase Console:
1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Create a test account:
   - **Email:** `test@example.com`
   - **Password:** `Test@12345` (or your preferred password)
   - Click **Add User**

### Why this matters:
- You're currently getting `INVALID_LOGIN_CREDENTIALS` because no test user exists
- Once domain is authorized AND test user created, email/password login will work

---

## Step 3: Deploy Updated Backend to GCP Cloud Run

The backend has been updated with proper security headers. Two deployment options:

### Option A: Using Cloud Build (Recommended - Bypasses IAM Issues)
This uses Google Cloud Build to handle the deployment instead of your local `gcloud` command.

```bash
cd /Users/nssikinar/Sites/exam-portal/exam-portal-ns

# Push to GitHub (if not already pushed)
git add -A
git commit -m "feat: Deploy Firebase auth with security headers to GCP"
git push -u origin main

# Trigger Cloud Build deployment
gcloud builds submit \
  --config=cloudbuild.yaml \
  --project=ns-exam-portal
```

### Option B: Fix IAM Permissions (If you want to use direct deploy)
The error is: `479112457276-compute@developer.gserviceaccount.com does not have storage.objects.get access`

You need to add Cloud Run Admin role to the service account:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  479112457276-compute@developer.gserviceaccount.com \
  --member=serviceAccount:479112457276-compute@developer.gserviceaccount.com \
  --role=roles/iam.serviceAccountUser \
  --project=ns-exam-portal
```

Then try deployment:
```bash
gcloud run deploy exam-portal-ns \
  --source=/Users/nssikinar/Sites/exam-portal/exam-portal-ns \
  --platform=managed \
  --region=asia-south2 \
  --allow-unauthenticated \
  --project=ns-exam-portal
```

### Option C: Deploy via GitHub Actions
Create `.github/workflows/gcp-deploy.yml` to automatically deploy on push (see file structure below)

---

## Step 4: Verify Deployment Success

Once deployed to GCP, test each authentication method:

### 1. Test Email/Password (after Firebase domain & user created):
```bash
curl -X POST https://exam-portal-ns-479112457276.asia-south2.run.app/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@12345"}'
```

Or go to: `https://exam-portal-ns-479112457276.asia-south2.run.app` and try signing in

### 2. Test Google Sign-In:
Click "Sign in with Google" button on auth page

### 3. Test Anonymous Sign-In:
Click "Continue as Guest" button on auth page

### 4. Verify Health Check:
```bash
curl https://exam-portal-ns-479112457276.asia-south2.run.app/health
# Should return: {"status":"ok"}
```

---

## Step 5: Monitor Deployment Logs

```bash
# View recent logs
gcloud run services describe exam-portal-ns \
  --region=asia-south2 \
  --project=ns-exam-portal

# Stream logs in real-time
gcloud run logs read exam-portal-ns \
  --region=asia-south2 \
  --project=ns-exam-portal \
  --limit=100 \
  --follow
```

---

## What Was Changed in Backend

**File: `backend/server.ts`**
- Added `Cross-Origin-Opener-Policy: same-origin-allow-popups` header (allows Google popup)
- Added `Cross-Origin-Resource-Policy: cross-origin` header (allows Firebase API calls)
- Updated CORS origin to allow Firebase domains
- Proper SPA routing with fallback to `index.html`
- Frontend static file serving

**File: `backend/Dockerfile`**
- Multi-stage build: frontend builder → backend builder → runtime
- Copies built frontend to backend's `frontend/dist`
- Runs backend on port 8080 with health check

---

## Troubleshooting Common Issues

### Issue: "Cannot GET /"
- **Cause:** Old deployed code doesn't have updated frontend serving
- **Fix:** Redeploy backend using one of the options above

### Issue: "net::ERR_EMPTY_RESPONSE" on Firebase requests
- **Cause:** Domain not authorized in Firebase Console
- **Fix:** Add domain to Firebase authorized domains (Step 1)

### Issue: "INVALID_LOGIN_CREDENTIALS"
- **Cause:** No test user in Firebase or wrong credentials
- **Fix:** Create test user in Firebase (Step 2)

### Issue: "Cross-Origin-Opener-Policy would block window.closed"
- **Cause:** Missing security header from backend
- **Fix:** Redeploy backend with latest code

### Issue: Google sign-in popup blocked
- **Cause:** COOP policy blocking popup or domain not authorized
- **Fix:** 
  1. Check browser console for popup blocker messages
  2. Ensure domain is authorized in Firebase
  3. Verify COOP header is set to `same-origin-allow-popups`

---

## Quick Reference: Key Files

**Production Deployment Files:**
- `/backend/Dockerfile` - Multi-stage Docker build
- `/backend/server.ts` - Security headers and frontend serving
- `/backend/package.json` - Production dependencies
- `/frontend/dist/` - Built frontend (ready to deploy)

**Local Development:**
- Run backend: `cd backend && npm run dev`
- Run frontend: `cd frontend && npm run dev`
- Both will be on `http://localhost:8081`

**Firebase Config:**
- `/frontend/.env` - Firebase credentials (already configured)
- Project ID: `ns-exam-portal`
- Auth Domain: `ns-exam-portal.firebaseapp.com`

---

## Summary of Blockers & Solutions

| Blocker | Solution | Effort |
|---------|----------|--------|
| Firebase domain not authorized | Add domain in Firebase Console | 2 min |
| No test user account | Create user in Firebase Console | 2 min |
| Backend not deployed | Deploy using Cloud Build or fix IAM | 5 min |
| Authentication still failing | Check browser console, verify all 3 above completed | Debug |

**Recommended next action:**
1. ✅ Add authorized domains to Firebase (2 min)
2. ✅ Create test user account in Firebase (2 min)
3. ✅ Deploy backend to GCP (5 min)
4. ✅ Test all 3 auth methods

---

## Cloud Build Configuration (Optional - For CI/CD)

If you want automated deployments, create `.github/workflows/gcp-deploy.yml`:

```yaml
name: Deploy to GCP Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v1
        with:
          service: exam-portal-ns
          region: asia-south2
          source: .
          
      - name: Show output
        run: echo "Service deployed to ${{ steps.deploy.outputs.url }}"
```

---

## Current GCP Info
- **Project:** ns-exam-portal
- **Region:** asia-south2
- **Service:** exam-portal-ns
- **URL:** https://exam-portal-ns-479112457276.asia-south2.run.app
- **Status:** Running (old code)
- **Last deployed:** 2026-06-16 08:37:03 UTC

---

## Contact & Support
- Firebase docs: https://firebase.google.com/docs/auth
- GCP Cloud Run: https://cloud.google.com/run/docs
- Local test: http://localhost:8081/auth
