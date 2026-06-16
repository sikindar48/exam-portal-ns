# Firebase Network Error Fix for GCP Cloud Run

## Problem

Firebase authentication is failing with `net::ERR_EMPTY_RESPONSE` when deployed on GCP Cloud Run.

**Errors:**
- `POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword` - ERR_EMPTY_RESPONSE
- `GET https://apis.google.com/js/api.js` - ERR_EMPTY_RESPONSE  
- `Cross-Origin-Opener-Policy` - Security policy blocking calls

## Root Cause

Firebase APIs are unreachable from GCP Cloud Run because:
1. **Network Policy** - GCP Cloud Run may have restrictive egress policies
2. **CORS Headers** - Missing proper Cross-Origin headers
3. **Authorized Domains** - Firebase Console not allowing the deployment domain
4. **Security Headers** - COOP (Cross-Origin-Opener-Policy) conflicts

## Solution

### Step 1: Add Authorized Domain to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `ns-exam-portal`
3. Go to **Authentication** → **Settings**
4. Under "Authorized domains", add:
   - `exam-portal-ns-479112457276.asia-south2.run.app` (current GCP URL)
   - `test.nssoftwaresolutions.in` (if using custom domain)
   - `localhost:8081` (for local development)

### Step 2: Update Backend Response Headers

Add proper security headers to allow Firebase:

**In `backend/server.ts`, add before other middleware:**

```typescript
// Security headers for Firebase
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
```

### Step 3: Fix CORS Configuration

Update CORS to explicitly allow Firebase domains:

```typescript
app.use(cors({
  origin: [
    "http://localhost:8081",
    "http://localhost:3000",
    "https://exam-portal-ns-479112457276.asia-south2.run.app",
    "https://test.nssoftwaresolutions.in",
    /\.firebaseapp\.com$/,
    /googleapis\.com$/
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
```

### Step 4: Check GCP Network Policies

Ensure egress is allowed for external HTTPS:

```bash
# Check VPC firewall rules
gcloud compute firewall-rules list --filter="direction=EGRESS"

# If restricted, create egress rule for HTTPS
gcloud compute firewall-rules create allow-egress-https \
  --direction=EGRESS \
  --priority=1000 \
  --destination-ranges=0.0.0.0/0 \
  --allow=tcp:443 \
  --project=exam-portal-ns-479112457276
```

### Step 5: Update Environment for Cloud Run

When deploying to GCP Cloud Run, ensure these env vars are set:

```bash
gcloud run deploy exam-portal-ns \
  --set-env-vars="NODE_ENV=production" \
  --region=asia-south2 \
  --project=exam-portal-ns-479112457276
```

## Testing Locally First

The easiest way to test if the fix works:

```bash
# Terminal 1: Run backend
cd backend
npm run dev

# Terminal 2: Run frontend (in new terminal)
cd frontend
npm run dev

# Open: http://localhost:8081
# Try signing in with email/password, Google, or guest
```

If auth works locally but not on GCP:
- The issue is GCP network configuration
- Contact GCP support for egress policy

## Deployment Steps After Fix

1. **Update backend/server.ts** with headers from Step 2
2. **Update backend/server.ts** CORS from Step 3
3. **Commit changes:**
   ```bash
   git add -A
   git commit -m "fix: Add Firebase security headers and CORS for GCP"
   git push origin main
   ```

4. **Redeploy to GCP:**
   ```bash
   gcloud run deploy exam-portal-ns \
     --source . \
     --region=asia-south2 \
     --platform=managed \
     --allow-unauthenticated
   ```

5. **Add authorized domains in Firebase Console** (Step 1 above)

## Fallback Options

If Firebase APIs still can't be reached from GCP:

### Option A: Use Firebase Emulator Suite (Development)
```bash
firebase emulators:start --import=./emulator-data
```

### Option B: Proxy Firebase Through Your Backend
Create a `/api/auth/*` proxy endpoint that forwards to Firebase APIs.

### Option C: Use Alternative Auth Provider
- Supabase Auth (built-in API gateway)
- Auth0 (more GCP-friendly)
- Custom JWT-based auth

## Verify Fix

After deployment:

```bash
# Check service is running
gcloud run services describe exam-portal-ns --region=asia-south2

# View recent logs
gcloud run services logs read exam-portal-ns --limit=50 --region=asia-south2

# Test endpoint
curl https://exam-portal-ns-479112457276.asia-south2.run.app/health
```

## Quick Checklist

- [ ] Added authorized domains to Firebase Console
- [ ] Updated backend server.ts with security headers
- [ ] Updated CORS configuration
- [ ] Checked GCP firewall egress rules
- [ ] Deployed to GCP Cloud Run
- [ ] Tested locally first
- [ ] Verified auth works

## Still Not Working?

1. Check browser DevTools → Network tab for blocked requests
2. Check GCP Cloud Run logs
3. Check Firebase Console for project settings
4. Try from local (http://localhost:8081) to isolate the issue
5. Contact GCP/Firebase support with error details

