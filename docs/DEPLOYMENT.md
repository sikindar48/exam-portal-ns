# NS Exam Portal - GCP Deployment Guide

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Project**: `ns-exam-portal`
3. **gcloud CLI** installed and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project ns-exam-portal
   ```

4. **Required APIs enabled**:
   ```bash
   gcloud services enable cloudbuild.googleapis.com \
     run.googleapis.com \
     artifactregistry.googleapis.com \
     secretmanager.googleapis.com
   ```

## Quick Deployment (One Command)

Navigate to your backend directory and run:

```bash
cd /Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend

gcloud run deploy exam-portal-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Complete Step-by-Step Guide

### Step 1: Setup Environment Variables as Secrets

Create secrets in GCP Secret Manager:

```bash
# Create Turso database URL secret
gcloud secrets create turso-database-url --replication-policy="automatic"
grep TURSO_DATABASE_URL .env | cut -d= -f2 | gcloud secrets versions add turso-database-url --data-file=-

# Create Turso auth token secret
gcloud secrets create turso-auth-token --replication-policy="automatic"
grep TURSO_AUTH_TOKEN .env | cut -d= -f2 | gcloud secrets versions add turso-auth-token --data-file=-
```

### Step 2: Grant Cloud Build Access

```bash
PROJECT_NUMBER=$(gcloud projects describe ns-exam-portal --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding turso-database-url \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding turso-auth-token \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 3: Manual Deployment (Direct Source)

```bash
cd /Users/nssikinar/Sites/exam-portal/exam-portal-ns/backend

# Option A: With secrets from local .env file
gcloud run deploy exam-portal-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="PORT=8080" \
  --set-env-vars="TURSO_DATABASE_URL=$(grep TURSO_DATABASE_URL .env | cut -d= -f2-)" \
  --set-env-vars="TURSO_AUTH_TOKEN=$(grep TURSO_AUTH_TOKEN .env | cut -d= -f2-)" \
  --memory=512Mi \
  --cpu=1

# Option B: With secrets from GCP Secret Manager
gcloud run deploy exam-portal-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars="PORT=8080" \
  --set-secrets="TURSO_DATABASE_URL=turso-database-url:latest" \
  --set-secrets="TURSO_AUTH_TOKEN=turso-auth-token:latest" \
  --memory=512Mi \
  --cpu=1
```

### Step 4: CI/CD Deployment (GitHub Integration)

1. **Push your code to GitHub** (if not already)
2. **Go to Cloud Console → Cloud Run**
3. **Click "CREATE SERVICE"**
4. **Select: "Continuously deploy new revisions from a source repository"**
5. **Connect GitHub repository** and select your repo
6. **Configure:**
   - **Dockerfile location**: `backend/Dockerfile`
   - **Source directory**: `backend`
   - **Region**: `asia-south1`
   - **Service name**: `exam-portal-api`
   - **Authentication**: Allow unauthenticated

### Step 5: Test Your Deployment

```bash
# Get the deployed URL
SERVICE_URL=$(gcloud run services describe exam-portal-api \
  --region asia-south1 \
  --format="value(status.url)")

echo "Your service is live at: $SERVICE_URL"

# Test endpoints
curl "$SERVICE_URL/health"
curl "$SERVICE_URL/"
curl "$SERVICE_URL/api/tests"
```

### Step 6: Update Frontend Configuration

Update your frontend `.env` file to use the deployed backend:

```bash
# In frontend/.env or frontend/.env.production
VITE_API_URL=https://exam-portal-api-xxxxxx-xx.asia-south1.run.app
```

## Common Deployment Commands

### Check Deployment Status
```bash
gcloud run services describe exam-portal-api --region asia-south1
```

### View Logs
```bash
# Real-time logs
gcloud run logs tail exam-portal-api --region asia-south1

# Recent logs
gcloud run logs read exam-portal-api --region asia-south1 --limit=20
```

### Update Environment Variables
```bash
gcloud run services update exam-portal-api \
  --region asia-south1 \
  --update-env-vars="NEW_VARIABLE=value"
```

### Scale the Service
```bash
# Set minimum instances
gcloud run services update exam-portal-api \
  --region asia-south1 \
  --min-instances=1

# Set maximum instances
gcloud run services update exam-portal-api \
  --region asia-south1 \
  --max-instances=10
```

### Delete the Service
```bash
gcloud run services delete exam-portal-api --region asia-south1
```

## Troubleshooting

### Build Fails with "Dockerfile not found"
Make sure you're in the correct directory or specify the Dockerfile path:
```bash
gcloud run deploy exam-portal-api \
  --source backend \
  --region asia-south1
```

### Permission Errors
```bash
# Grant Cloud Build service account access to secrets
PROJECT_NUMBER=$(gcloud projects describe ns-exam-portal --format="value(projectNumber)")
gcloud projects add-iam-policy-binding ns-exam-portal \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"
```

### Service Won't Start
Check logs for startup errors:
```bash
gcloud run logs read exam-portal-api --region asia-south1 | grep -A 5 -B 5 "error\|failed\|exception"
```

### Database Connection Issues
Verify Turso credentials are correct and accessible:
```bash
# Test database connection locally first
cd backend
npm run dev
```

## Cost Optimization

1. **Set min instances to 0** (default) for cost savings
2. **Configure concurrency** to handle traffic efficiently:
   ```bash
   gcloud run services update exam-portal-api \
     --region asia-south1 \
     --concurrency=80
   ```
3. **Use Cloud CDN** for static content caching
4. **Set up budget alerts** in GCP Billing

## Security Best Practices

1. **Use IAM conditions** for fine-grained access control
2. **Rotate secrets** regularly
3. **Enable VPC Service Controls** if handling sensitive data
4. **Use Cloud Run's built-in HTTPS** with auto-managed certificates
5. **Implement CORS properly** in your server configuration

## Maintenance

### Update Deployment
```bash
# Re-deploy with new changes
cd backend
git pull origin main
gcloud run deploy exam-portal-api --source . --region asia-south1
```

### Monitor Performance
```bash
# Check metrics in Cloud Console
open https://console.cloud.google.com/run/detail/asia-south1/exam-portal-api/metrics
```

### Backup Configuration
```bash
# Export service configuration
gcloud run services describe exam-portal-api \
  --region asia-south1 \
  --format=yaml > exam-portal-api-config.yaml
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `gcloud run deploy` | Deploy from source |
| `gcloud run services list` | List deployed services |
| `gcloud run logs tail` | View real-time logs |
| `gcloud run services update` | Update configuration |
| `gcloud run services delete` | Remove service |

For more details, visit: [Cloud Run Documentation](https://cloud.google.com/run/docs)