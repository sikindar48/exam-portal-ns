# Login Troubleshooting Guide

## Problem: "Wrong Credentials" or "Check Your Email" Message

### Root Causes
There are two main issues you're experiencing:

1. **No test user account in Firebase** - The email/password you're using doesn't exist
2. **Password reset not configured** - Firebase is triggering password reset instead of allowing login

---

## Solution: Step-by-Step Fix

### Step 1: Go to Firebase Console
**URL**: https://console.firebase.google.com/project/ns-exam-portal

### Step 2: Verify Email/Password is Enabled
1. Click **Authentication** (left sidebar)
2. Click **Sign-in method** tab
3. Look for **Email/Password** - should show "Enabled"
4. If not enabled:
   - Click on it
   - Toggle **Enable** ON
   - Click **Save**

### Step 3: Create Test User Account
⚠️ **This is the critical step - you need to do this**

1. In Firebase Console, go to **Authentication** → **Users**
2. Click **+ Add User** button (top right)
3. Fill in:
   - **Email**: `test@example.com` (or any email)
   - **Password**: `Test@12345` (must be at least 6 characters)
   - Leave other fields empty
4. Click **Add User**
5. You should see the user listed

### Step 4: Try Logging In Again
1. Go to: `http://localhost:8081/auth`
2. Enter credentials:
   - **Email**: `test@example.com` (same as you created)
   - **Password**: `Test@12345` (same as you created)
3. Click **Sign in**

---

## If You're Still Getting "Wrong Credentials"

### Check These Things:

1. **Email is wrong**
   - Make sure you typed the email exactly as you created it in Firebase
   - Firebase is case-insensitive, but the full email must match

2. **Password is wrong**
   - Make sure you typed the password exactly
   - Firebase passwords are case-sensitive
   - No spaces before/after

3. **User wasn't actually created**
   - Go back to Firebase Console
   - Authentication → Users
   - Check the list - do you see your user?
   - If not, create again

4. **Using a Google account email**
   - Some Gmail emails might be linked to Google Sign-in
   - Try a different email address: `testuser@example.com`
   - Or create user with Google first, then password reset

### Test with Different Email
Try this test account:
```
Email: tester@nssoftwaresolutions.in
Password: Test@123456
```

Create this exact account in Firebase and try again.

---

## If You're Still Getting "Check Your Email"

### Causes:
1. **User doesn't exist** - See above
2. **Password reset flow triggered** - Frontend bug
3. **Auth domain not authorized** - Need to add localhost

### Fix: Add Authorized Domain

1. Go to Firebase Console
2. Authentication → **Settings** tab (top right of the page)
3. Scroll down to **Authorized domains**
4. Click **Add domain**
5. Add: `localhost:8081`
6. Click **Add**
7. Try login again

### Also Add These Domains:
- `127.0.0.1:8081`
- `localhost:3000` (for other dev ports)

---

## Quick Verification Checklist

- [ ] Firebase project exists: `ns-exam-portal`
- [ ] Authentication is enabled
- [ ] Email/Password method is **Enabled** in Sign-in methods
- [ ] At least one test user created (check Users list)
- [ ] Test user email matches what you're trying to login with
- [ ] Test user password is correct
- [ ] `localhost:8081` is in Authorized domains
- [ ] Backend is running on port 8080
- [ ] Frontend is running on port 8081

---

## Step-by-Step Video Guide

If you prefer visual instructions:

### Part 1: Create Test User
```
1. Go to: https://console.firebase.google.com/project/ns-exam-portal
2. Click Authentication (left menu)
3. Click Users tab
4. Click + Add User
5. Enter email: test@example.com
6. Enter password: Test@12345
7. Click Add User
```

### Part 2: Try Login
```
1. Go to: http://localhost:8081/auth
2. Make sure you're on the "Sign in" tab
3. Email: test@example.com
4. Password: Test@12345
5. Click "Sign in"
```

---

## Advanced Troubleshooting

### Check Browser Console for Errors
1. Go to: `http://localhost:8081/auth`
2. Press **F12** (or right-click → Inspect)
3. Click **Console** tab
4. Look for red error messages
5. Note any errors and check below

### Common Console Errors

**Error: "Invalid login credentials"**
- Means: Email/password wrong, user doesn't exist, or email not verified
- Fix: Create test user in Firebase Console (see above)

**Error: "Firebase not initialized"**
- Means: Firebase credentials not loaded
- Fix: Check `.env` file has credentials:
  ```
  VITE_FIREBASE_API_KEY=AIzaSyDeCd6Ek_fzMwxDGvwXjYxLdgvuYwghjj8
  VITE_FIREBASE_AUTH_DOMAIN=ns-exam-portal.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=ns-exam-portal
  ```

**Error: "Cannot GET /auth"**
- Means: Frontend not running
- Fix: Run `cd frontend && npm run dev`

**Error: "CORS error" or "net::ERR_EMPTY_RESPONSE"**
- Means: Domain not authorized
- Fix: Add `localhost:8081` to Firebase Authorized domains

### Check Network Tab
1. Press **F12**
2. Click **Network** tab
3. Try to login
4. Look for requests starting with `identitytoolkit.googleapis.com`
5. Check the response:
   - Status 200 = Working
   - Status 400 = Invalid credentials
   - Status 403 = Domain not authorized
   - No response = CORS issue

---

## Working Login Flow (What Should Happen)

### Correct Flow:
```
1. User enters email and password
2. Click "Sign in"
3. App sends request to Firebase
4. Firebase returns user token
5. App stores token in localStorage
6. App fetches user role from backend
7. User redirected to dashboard
8. ✅ Login successful
```

### Error Flow (What's Happening):
```
1. User enters email and password
2. Click "Sign in"
3. App sends request to Firebase
4. Firebase returns error (user not found OR wrong password)
5. App shows error message
6. ❌ Login fails
```

---

## Firebase Settings to Double-Check

### Authentication Settings
- [ ] Email/Password: **ENABLED**
- [ ] Google: **ENABLED** (optional but recommended)
- [ ] Anonymous: **ENABLED** (optional)

### Authorized Domains
- [ ] `localhost:8081` - ✅ Must have
- [ ] `127.0.0.1:8081` - ✅ Should have
- [ ] `exam-portal-ns-479112457276.asia-south2.run.app` - ✅ For GCP (after deploy)

### Users Created
- [ ] At least 1 test user with:
  - [ ] Email address set
  - [ ] Password set
  - [ ] Email verified (optional but helps)

### Email Configuration (Optional)
- If users want to reset passwords themselves:
  - Go to Templates
  - Customize "Password reset" template
  - Set sender email

---

## Quick Test Command

Run this to verify Firebase config is loaded:
```bash
# In browser console (F12):
console.log(localStorage.getItem('kiro_cached_role'))
# Should show role or null

# Test Firebase init:
fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDeCd6Ek_fzMwxDGvwXjYxLdgvuYwghjj8', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'Test@12345',
    returnSecureToken: true
  })
})
.then(r => r.json())
.then(d => console.log(d))
```

---

## Common Mistakes (Don't Do These)

❌ **Using wrong email**
- Created: `test@example.com`
- Trying: `test@gmail.com`
- Fix: Use exact email

❌ **Using wrong password**
- Created: `Test@12345`
- Trying: `Test@1234`
- Fix: Match exactly

❌ **Not enabling auth method**
- Created user but Email/Password not Enabled
- Fix: Enable in Sign-in methods

❌ **Not adding authorized domain**
- localhost:8081 not in Firebase Authorized domains
- Fix: Add it

❌ **Typing email with spaces**
- User input: ` test@example.com ` (extra spaces)
- Fix: The app trims it, but double-check

❌ **Password with 5 characters**
- Firebase requires minimum 6 characters
- Fix: Use at least 6 characters

---

## Test User Accounts to Try

### Primary Test Account
```
Email: test@example.com
Password: Test@12345
Role: Student (default)
```

### Alternative Test Accounts
```
Email: student@nssoftwaresolutions.in
Password: Student@12345
Role: Student

Email: admin@nssoftwaresolutions.in
Password: Admin@12345
Role: Admin (after assignment)

Email: testuser@mail.com
Password: TestUser@123
Role: Student
```

---

## After Login Works

Once email/password login works, try:

1. **Google Sign-in**
   - Click "Sign in with Google"
   - Select your Google account
   - Should automatically create profile

2. **Guest/Anonymous Sign-in**
   - Click "Continue as Guest"
   - Should give you limited access

3. **Sign Up (New Account)**
   - Click "Sign up" tab
   - Select organization: RGMCET
   - Enter email and password
   - Enter name
   - Click "Sign up"

---

## Getting Help

If you're still stuck:

1. **Check Firebase Console**
   - Verify project: ns-exam-portal
   - Verify user exists in Users list
   - Verify auth methods enabled

2. **Check Browser Console**
   - F12 → Console
   - Look for error messages
   - Copy exact error text

3. **Check Backend Logs**
   - Terminal running backend
   - Look for errors
   - Copy exact error text

4. **Verify Services Running**
   - Backend: `curl http://localhost:8080/health`
   - Frontend: `curl http://localhost:8081/`
   - Both should respond

---

## Reference

- **Firebase Docs**: https://firebase.google.com/docs/auth
- **Firebase Console**: https://console.firebase.google.com
- **Local Frontend**: http://localhost:8081
- **Local Backend**: http://localhost:8080

---

## Summary

**If you're getting login errors:**

1. ✅ Create test user in Firebase Console
2. ✅ Add `localhost:8081` to Authorized domains
3. ✅ Make sure Email/Password is Enabled
4. ✅ Try login with exact credentials

**Expected behavior after setup:**
- Correct credentials → Redirect to dashboard ✅
- Wrong credentials → "Invalid email or password" error ✅
- User doesn't exist → "Invalid email or password" error ✅

**Do NOT get:**
- "Check your email" message (unless actually resetting password)
- "Domain not authorized" (add localhost to authorized domains)
- "Firebase not initialized" (check .env file)

---

**Quick Action Items:**
1. Go to: https://console.firebase.google.com/project/ns-exam-portal
2. Create test user: `test@example.com` / `Test@12345`
3. Add authorized domain: `localhost:8081`
4. Try login at: http://localhost:8081/auth
