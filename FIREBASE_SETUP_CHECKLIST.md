# Firebase Setup Checklist

This checklist helps you set up Firebase authentication for the NS Exam Portal. Complete all items to ensure authentication works properly.

---

## 1. Firebase Project Setup

- [ ] **Firebase Project Created**: `ns-exam-portal`
  - Firebase Console: https://console.firebase.google.com/project/ns-exam-portal
  - Project ID: `ns-exam-portal`
  - Location: Any (global)

- [ ] **Firebase Web App Registered**
  - App name: `ns-exam-portal-web`
  - Config in: `frontend/.env` ✅ (Already configured)
  - API Key: `AIzaSyDeCd6Ek_fzMwxDGvwXjYxLdgvuYwghjj8`
  - Auth Domain: `ns-exam-portal.firebaseapp.com`

---

## 2. Authentication Methods Setup

### Email/Password Authentication
- [ ] **Enable Email/Password Sign-in**
  1. Go to Firebase Console → **Authentication** → **Sign-in method**
  2. Click **Email/Password**
  3. Toggle **Enable**
  4. Click **Save**

### Google OAuth
- [ ] **Enable Google Sign-in**
  1. Go to Firebase Console → **Authentication** → **Sign-in method**
  2. Click **Google**
  3. Toggle **Enable**
  4. Select **Support email**: `info.nssoftwaresolutions@gmail.com` (or your email)
  5. Click **Save**

- [ ] **Google OAuth Consent Screen Configured** (if first time)
  1. Go to Google Cloud Console → **APIs & Services** → **OAuth consent screen**
  2. Choose **External** user type
  3. Fill in app info:
     - App name: `NS Exam Portal`
     - User support email: `info.nssoftwaresolutions@gmail.com`
     - Developer contact: `info.nssoftwaresolutions@gmail.com`
  4. Add scopes: `openid`, `email`, `profile`
  5. Click **Save and Continue**
  6. Add test users: your email, test users' emails
  7. Publish app (or keep in Testing mode for development)

### Anonymous Authentication
- [ ] **Enable Anonymous Sign-in**
  1. Go to Firebase Console → **Authentication** → **Sign-in method**
  2. Click **Anonymous**
  3. Toggle **Enable**
  4. Click **Save**

---

## 3. Authorized Domains Configuration ⚠️ CRITICAL

These domains must be whitelisted in Firebase. Without this, authentication will fail with `net::ERR_EMPTY_RESPONSE`.

- [ ] **Add Authorized Domains**
  1. Go to Firebase Console → **Authentication** → **Settings** (tab at top)
  2. Scroll down to **Authorized domains**
  3. Click **Add domain** and add these:
     - [ ] `exam-portal-ns-479112457276.asia-south2.run.app`
     - [ ] `localhost:8081`
     - [ ] `127.0.0.1:8081`
     - [ ] `test.nssoftwaresolutions.in` (custom domain, when ready)

---

## 4. Create Test Users

These accounts are needed to test email/password authentication.

### Create First Test User
- [ ] **Create Test Account**
  1. Go to Firebase Console → **Authentication** → **Users**
  2. Click **Add User** button
  3. Enter credentials:
     - **Email:** `test@example.com`
     - **Password:** `Test@12345`
     - Leave other fields empty
  4. Click **Add User**
  5. Note the **UID** (you may need this for debugging)

### Optional: Create Additional Test Users
- [ ] **Student Test User**
  - Email: `student@test.com`
  - Password: `Student@123`

- [ ] **Admin Test User** (if you have admin features)
  - Email: `admin@test.com`
  - Password: `Admin@123`

---

## 5. Firebase Rules Setup

### Firestore Rules (if using Firestore - you're using Turso, so skip)
- [ ] Not applicable (using Turso database instead)

### Realtime Database Rules (if using Realtime DB - you're using Turso, so skip)
- [ ] Not applicable (using Turso database instead)

### Cloud Storage Rules (if using Storage - currently not used)
- [ ] Optional for future file uploads

---

## 6. Verify Configuration

### Test in Browser
- [ ] **Local Testing** (`http://localhost:8081`)
  1. Open browser: `http://localhost:8081/auth`
  2. Test Email/Password:
     - Enter: `test@example.com` / `Test@12345`
     - Should redirect to dashboard after sign-in ✅
  3. Test Google Sign-in:
     - Click "Sign in with Google"
     - Should open popup and allow sign-in ✅
  4. Test Anonymous:
     - Click "Continue as Guest"
     - Should allow access without account ✅

### Test on GCP
- [ ] **GCP Testing** (after backend deployed)
  1. Open browser: `https://exam-portal-ns-479112457276.asia-south2.run.app`
  2. Repeat steps from Local Testing above
  3. All three methods should work ✅

### Monitor Console Errors
- [ ] **Browser Console** (F12 or Right-click → Inspect)
  - Should NOT see:
    - `net::ERR_EMPTY_RESPONSE` ❌
    - `INVALID_LOGIN_CREDENTIALS` (unless wrong password) ❌
    - `Failed to load resource` ❌
  - Should see:
    - Successful auth: `User signed in: [email]` ✅

---

## 7. Security Configuration

### Firebase Security Rules
- [ ] **Authentication Rules Enabled**
  1. Go to Firebase Console → **Authentication** → **Settings**
  2. Under **User account linking**:
     - [ ] Enable **Multiple accounts per email address** (optional)

### OAuth Scopes
- [ ] **Google OAuth Scopes Limited**
  - Requested scopes: `profile`, `email`
  - Should NOT request unnecessary permissions

### API Keys Restrictions (Recommended but Optional)
- [ ] **Restrict API Key** (Extra security)
  1. Go to Google Cloud Console → **APIs & Services** → **Credentials**
  2. Find your API key (`AIzaSyDeCd6Ek_fzMwxDGvwXjYxLdgvuYwghjj8`)
  3. Click to edit
  4. Under **API restrictions**:
     - Select: **Firebase Authentication API**
  5. Under **Application restrictions**:
     - Select: **HTTP referrers (web sites)**
     - Add referrer: `exam-portal-ns-479112457276.asia-south2.run.app/*`
     - Add referrer: `localhost:8081/*`
  6. Click **Save**

---

## 8. Environment Variables Verification

- [ ] **Frontend `.env` file configured**
  ```
  VITE_FIREBASE_API_KEY=AIzaSyDeCd6Ek_fzMwxDGvwXjYxLdgvuYwghjj8
  VITE_FIREBASE_AUTH_DOMAIN=ns-exam-portal.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=ns-exam-portal
  VITE_FIREBASE_STORAGE_BUCKET=ns-exam-portal.firebasestorage.app
  VITE_FIREBASE_MESSAGING_SENDER_ID=479112457276
  VITE_FIREBASE_APP_ID=1:479112457276:web:9c5bfddc5e0b6d1e286739
  VITE_FIREBASE_MEASUREMENT_ID=G-97SNP07275
  ```

- [ ] **Backend `.env` file configured**
  ```
  FIREBASE_PROJECT_ID=ns-exam-portal
  FIREBASE_PRIVATE_KEY=<service account private key>
  FIREBASE_CLIENT_EMAIL=<service account email>
  ```

---

## 9. CORS & Headers Configuration

- [ ] **Backend CORS Headers Set**
  - File: `backend/server.ts` ✅ (Already configured)
  - Headers:
    - `Cross-Origin-Opener-Policy: same-origin-allow-popups`
    - `Cross-Origin-Resource-Policy: cross-origin`
    - CORS origins include Firebase domains

- [ ] **Deployed to GCP**
  - File: `backend/Dockerfile` ✅ (Correct config)
  - Status: ⏳ Pending deployment

---

## 10. Testing Checklist

### Local Testing Checklist
- [ ] Email/Password sign-in works
- [ ] Email/Password sign-up works
- [ ] Google sign-in opens popup and authenticates
- [ ] Anonymous sign-in works
- [ ] User redirects to correct dashboard after sign-in
- [ ] Signed-out users redirected to `/auth`
- [ ] No CORS errors in console
- [ ] No Firebase errors in console
- [ ] User role fetched from database after sign-in

### GCP Deployment Testing Checklist
- [ ] Health check passes: `curl https://exam-portal-ns-479112457276.asia-south2.run.app/health`
- [ ] Frontend loads at root URL
- [ ] Auth page loads at `/auth`
- [ ] Email/Password sign-in works
- [ ] Google sign-in works
- [ ] Anonymous sign-in works
- [ ] Logs show no errors: `gcloud run logs read exam-portal-ns --region=asia-south2`

---

## 11. Troubleshooting

### Issue: "net::ERR_EMPTY_RESPONSE"
- **Cause:** Domain not authorized in Firebase
- **Solution:** Add domain to authorized domains (Step 3)

### Issue: "INVALID_LOGIN_CREDENTIALS"
- **Cause:** 
  - Domain not authorized, OR
  - No test user in Firebase, OR
  - Wrong email/password
- **Solution:** 
  1. Verify domain is authorized (Step 3)
  2. Create test user (Step 4)
  3. Double-check email/password

### Issue: Google popup doesn't open
- **Cause:** 
  - Browser popup blocker
  - COOP header missing or wrong
  - Google Sign-in not enabled
- **Solution:**
  1. Check browser popup settings (allow popups for localhost)
  2. Verify backend has `same-origin-allow-popups` header
  3. Enable Google sign-in in Firebase (Step 2)

### Issue: "The user account has been disabled"
- **Cause:** User was disabled in Firebase Console
- **Solution:** Go to Firebase → Authentication → Users, enable user

### Issue: Cannot sign up with Email/Password
- **Cause:** Email already exists or weak password
- **Solution:** Use different email or stronger password (min 6 chars)

### Issue: "The email address is not authorized"
- **Cause:** Domain not in authorized list
- **Solution:** Add domain to authorized domains (Step 3)

---

## 12. Production Checklist

- [ ] **Firebase Project Security**
  - [ ] API key restricted to Firebase APIs only
  - [ ] API key restricted to correct domains
  - [ ] Service account key secured (not in public repo)

- [ ] **Authentication Methods**
  - [ ] All 3 methods enabled (Email, Google, Anonymous)
  - [ ] Email verification enabled (optional but recommended)
  - [ ] Password reset email template customized

- [ ] **User Management**
  - [ ] Create production admin account
  - [ ] Test user account created
  - [ ] Backup/export user data policy established

- [ ] **Monitoring**
  - [ ] GCP Cloud Run logs monitored
  - [ ] Firebase Authentication metrics checked
  - [ ] Error reporting set up

- [ ] **Documentation**
  - [ ] Team trained on auth flow
  - [ ] Emergency access procedures documented
  - [ ] Runbook for common issues created

---

## Quick Links

- **Firebase Console:** https://console.firebase.google.com/project/ns-exam-portal
- **Google Cloud Console:** https://console.cloud.google.com/home/dashboard?project=ns-exam-portal
- **GCP Cloud Run Service:** https://console.cloud.google.com/run/detail/asia-south2/exam-portal-ns
- **Local Development:** `http://localhost:8081`
- **GCP Deployment:** `https://exam-portal-ns-479112457276.asia-south2.run.app`

---

## Support & Resources

- Firebase Documentation: https://firebase.google.com/docs/auth
- Firebase Admin SDK: https://firebase.google.com/docs/auth/admin/start
- GCP Cloud Run: https://cloud.google.com/run/docs
- TypeScript Firebase: https://firebase.google.com/docs/web/setup
- React + Firebase: https://firebase.google.com/docs/web/setup#initialize-firebase

---

## Status Summary

| Item | Status | Notes |
|------|--------|-------|
| Firebase Project | ✅ Created | `ns-exam-portal` |
| Web App | ✅ Registered | Config in `.env` |
| Email/Password | ✅ Code Ready | Must enable in Firebase Console |
| Google OAuth | ✅ Code Ready | Must enable in Firebase Console |
| Anonymous Auth | ✅ Code Ready | Must enable in Firebase Console |
| **Authorized Domains** | ⏳ **TODO** | **CRITICAL: Add domains NOW** |
| **Test Users** | ⏳ **TODO** | **Create before testing** |
| Backend Security Headers | ✅ Configured | In `server.ts` |
| **GCP Deployment** | ⏳ **TODO** | **Needs to be deployed** |
| Local Testing | ⏳ Ready | After enabling methods & adding domains |
| Production Testing | ⏳ Ready | After GCP deployment |

---

## Next Steps (In Order)

1. **TODAY** ✅ Go to Firebase Console
2. **TODAY** ✅ Enable Email/Password, Google, Anonymous (Step 2)
3. **TODAY** ✅ Add authorized domains (Step 3)
4. **TODAY** ✅ Create test user account (Step 4)
5. **TODAY** ✅ Test locally: `http://localhost:8081/auth`
6. **THIS WEEK** ✅ Deploy to GCP using Cloud Build
7. **THIS WEEK** ✅ Test on GCP: `https://exam-portal-ns-479112457276.asia-south2.run.app`
8. **PRODUCTION** ✅ Set up monitoring and backups
