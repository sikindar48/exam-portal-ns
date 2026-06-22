gcloud run deploy exam-portal-api \                        
  --source . \
  --region asia-south1 \
  --allow-unauthenticated

npx vitest run

cd backend
npx vitest src/test/qa-audit.test.ts