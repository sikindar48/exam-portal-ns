# Deployment Guide - NS Exam Portal

This document outlines the step-by-step procedure to deploy the NS Exam Portal application to Google Cloud Platform (GCP) for the backend and Cloudflare Pages for the frontend.

---

## Local Development Setup

To run the application locally:

### 1. Backend Setup
Navigate to the `backend/` directory:
```bash
cd backend
```

Create a `.env` file containing:
```ini
PORT=8080
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
DISABLE_RATE_LIMITER=false
NODE_ENV=development
```

Start the Express development server:
```bash
npm install
npm run dev
```

The API will be available at `http://localhost:8080`.

### 2. Frontend Setup
Navigate to the `frontend/` directory:
```bash
cd ../frontend
```

Create a `.env` file containing:
```ini
VITE_API_URL=http://localhost:8080
VITE_FIREBASE_API_KEY=your-firebase-client-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

Start the Vite development server:
```bash
npm install
npm run dev
```

The frontend will be available at `http://localhost:8081` or `http://localhost:3000`.

---

## Build Process

### Frontend Build
Vite compiles the frontend assets into the `dist/` directory:
```bash
cd frontend
npm run build
```

### Backend Build
TypeScript compiles the Express code into the `dist/` folder:
```bash
cd backend
npm run build
```

### Docker Build
A multi-stage Docker build is used to keep the final container small. The configuration is defined in the [Dockerfile](file:///Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend/Dockerfile):
```bash
docker build -t exam-portal-api ./backend
```

---

## GCP Cloud Run Deployment

The production backend runs on Google Cloud Run in the `asia-south1` region.

### Production Environment Settings

The following specifications are applied to the Cloud Run service:

* **Region**: `asia-south1`
* **CPU Allocation**: `1` (Dedicated CPU)
* **Memory Limit**: `1Gi` (Configured to prevent out-of-memory errors during high concurrent candidate submits)
* **Concurrency**: `80` (Up to 80 concurrent connections per container instance)
* **Minimum Instances**: `1` (Keeps one container active to prevent cold starts during peak exam schedules)
* **Maximum Instances**: `3` (Limits cost and manages database connection pool size)
* **Request Timeout**: `300s`

### Deployment Commands

#### Step 1: Push Secrets to GCP Secret Manager
```bash
# Push Turso Connection Details
gcloud secrets create turso-database-url --replication-policy="automatic"
echo -n "libsql://exam-portal-ns-software-solutions.aws-ap-south-1.turso.io" | gcloud secrets versions add turso-database-url --data-file=-

gcloud secrets create turso-auth-token --replication-policy="automatic"
echo -n "YOUR_TOKEN" | gcloud secrets versions add turso-auth-token --data-file=-
```

#### Step 2: Deploy to Cloud Run
Deploying directly from the backend directory using GCP Cloud Build:
```bash
cd backend
gcloud run deploy exam-portal-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="PORT=8080,DISABLE_RATE_LIMITER=true" \
  --set-secrets="TURSO_DATABASE_URL=turso-database-url:latest,TURSO_AUTH_TOKEN=turso-auth-token:latest" \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=3 \
  --concurrency=80
```

---

## Rollback Process

In the event of a critical failure or bug, rollback to a previous stable revision:

1. **List Revisions**:
   ```bash
   gcloud run revisions list --service=exam-portal-api --region=asia-south1
   ```
2. **Route Traffic**:
   Redirect 100% of the traffic to the known stable revision:
   ```bash
   gcloud run services update-traffic exam-portal-api \
     --region=asia-south1 \
     --to-revisions=exam-portal-api-00014-abc=100
   ```

---

## Troubleshooting Guide

### Common Cloud Run Issues
* **HTTP 503 Service Unavailable / Container Crashing**:
  Usually indicates an out-of-memory (OOM) error or uncaught exception. Ensure the memory is set to at least `1Gi`. Check logs using:
  ```bash
  gcloud run logs read exam-portal-api --region=asia-south1 --limit=100
  ```
* **Cold Starts / High Join Latency**:
  Verify that `--min-instances=1` is configured. If min-instances is 0, initial candidate joins will experience 5-10s delays while the container boots.

### Firebase Auth Issues
* **IP_REFERER_BLOCKED (HTTP 400)**:
  During load tests or headless candidate sign-ins, Firebase auth checks may fail due to HTTP Referer headers. Ensure client requests include the correct header matching the Firebase allowed domains list.
* **Unauthorized Access**:
  Ensure the backend environment variables (`FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`) are correctly formatted. Private keys containing `\n` characters must be correctly evaluated by the backend auth loader.

### Turso Database Issues
* **Turso Connection Pool Exhaustion**:
  Because SQLite handles writes sequentially, high concurrent submissions will queue transactions. Set max instances on Cloud Run to `3` to limit connections, and ensure that the client-side debounces answers (`2000ms`) to reduce write-frequency.
* **Case-Sensitive Code Lookups**:
  Ensure search queries on join-codes use case-insensitive constraints. The database column `tests.share_code` is indexed with `COLLATE NOCASE` for this reason.