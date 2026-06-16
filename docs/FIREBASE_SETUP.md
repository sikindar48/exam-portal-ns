# Firebase Authentication Setup Guide

This document explains how to set up Firebase Authentication with Email/Password, Google Sign-in, and Anonymous authentication for the NS Exam Portal.

## Overview

The exam portal uses Firebase for authentication with the following methods:
- **Email/Password**: Standard email and password authentication
- **Google Sign-in**: OAuth 2.0 authentication via Google
- **Anonymous Authentication**: Guest access for temporary/trial use

## Prerequisites

- A Firebase project created at [Firebase Console](https://console.firebase.google.com)
- The exam portal frontend installed with dependencies (`npm install`)

## Step 1: Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (or create a new one)
3. Navigate to **Project Settings** (⚙️ icon)
4. Under the **General** tab, scroll to "Your apps" section
5. Click the Web icon (</>) to create a new web app if you haven't already
6. Copy the Firebase configuration object

Example configuration:
```javascript
{
  "apiKey": "AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxx",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "1234567890",
  "appId": "1:1234567890:web:abcdef1234567890"
}
```

## Step 2: Configure Environment Variables

1. In the `frontend` directory, create a `.env` file (copy from `.env.example` if it exists)
2. Add your Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Turso Configuration (existing)
VITE_TURSO_CONNECTION_URL=your_turso_url
VITE_TURSO_AUTH_TOKEN=your_turso_token
```

## Step 3: Enable Authentication Methods

### Email/Password Authentication

1. In Firebase Console, go to **Authentication**
2. Click the **Sign-in method** tab
3. Enable **Email/Password** provider
4. Click **Save**

### Google Sign-in

1. In Firebase Console, go to **Authentication**
2. Click the **Sign-in method** tab
3. Click on **Google** provider
4. Enable it
5. Add a project support email (required)
6. Click **Save**

### Anonymous Authentication

1. In Firebase Console, go to **Authentication**
2. Click the **Sign-in method** tab
3. Enable **Anonymous** provider
4. Click **Save**

## Step 4: Configure Authorized Domains

If deploying to a specific domain:

1. Go to **Authentication** → **Settings**
2. Under "Authorized domains", add your domain
3. Examples:
   - Local: `localhost`
   - Staging: `staging.example.com`
   - Production: `example.com`

## Step 5: Configure Google OAuth Consent Screen (for Google Sign-in)

1. Go to **Google Cloud Console** (linked from Firebase)
2. Navigate to **OAuth consent screen**
3. Choose **External** user type
4. Fill in required fields:
   - App name
   - User support email
   - Developer contact email
5. Add scopes:
   - `email`
   - `profile`
   - `openid`
6. Add test users (emails that can test OAuth during development)
7. Click **Save and Continue**

## Frontend Implementation

The authentication is implemented in `/frontend/src/contexts/AuthContext.tsx` with the following functions:

### Sign In (Email/Password)
```typescript
const { signIn } = useAuth();
const { error } = await signIn(email, password);
```

### Sign Up (Email/Password)
```typescript
const { signUp } = useAuth();
const { error } = await signUp(email, password, name, clientId);
```

### Sign In with Google
```typescript
const { signInWithGoogle } = useAuth();
const { error } = await signInWithGoogle(clientId);
```

### Sign In Anonymously
```typescript
const { signInAnonymously } = useAuth();
const { error } = await signInAnonymously();
```

### Sign Out
```typescript
const { signOut } = useAuth();
await signOut();
```

## Backend Integration

When users authenticate via Firebase:

1. They receive a Firebase ID token
2. This token is sent to the backend API endpoints
3. The backend validates the token using Firebase Admin SDK
4. User profile and roles are synced with Turso database

### Key API Endpoints

- `POST /api/profiles` - Create or retrieve user profile
- `POST /api/user-roles` - Create or retrieve user roles
- `GET /api/user-roles` - Fetch user's roles

## Testing

### Local Development

1. Run the frontend: `npm run dev`
2. Navigate to `http://localhost:8081/auth`
3. Test each authentication method

### Google Sign-in Testing

1. Add your email to Firebase's "Test users" list (during development)
2. You can sign in with your Google account
3. No approval needed for test users during development phase

## Troubleshooting

### "Missing Firebase environment variables" Error

**Problem**: Environment variables not loaded
**Solution**: 
- Check that `.env` file exists in `/frontend` directory
- Restart the dev server after creating `.env`
- Check for typos in variable names

### "Firebase: Error (auth/unauthorized-domain)"

**Problem**: Domain not authorized
**Solution**:
- Add the domain to Firebase Console → Authentication → Settings → Authorized domains
- For localhost development, add `localhost:8081`

### "Google sign-in popup blocked"

**Problem**: Browser blocks popup
**Solution**:
- Check browser popup blocker settings
- The popup blocker may need to be disabled for `localhost`
- Works normally in production without blocker interference

### "User profile not found"

**Problem**: User signs in but profile is missing
**Solution**:
- Ensure backend is running and connected to Turso
- Check that API endpoints are accessible
- Verify backend can reach Turso database

## Security Considerations

1. **API Keys**: Firebase API keys in `.env` are embedded in frontend code. This is normal for web apps—they're not secrets.
2. **ID Tokens**: Short-lived tokens (1 hour expiry) used for backend validation
3. **Refresh Tokens**: Handled automatically by Firebase SDK
4. **HTTPS**: Always use HTTPS in production
5. **CORS**: Configure backend CORS to accept only authorized origins

## Production Deployment

1. Set environment variables in your hosting provider
2. Configure authorized domains in Firebase
3. Ensure backend API is deployed and accessible
4. Test all authentication flows in staging before production
5. Monitor Firebase authentication logs in Console

## References

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com)
- [Google Cloud OAuth Setup](https://cloud.google.com/docs/authentication/oauth2)
