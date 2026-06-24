# NS Exam Portal - Monitoring & Operations Guide

## Table of Contents
1. [Health Checks](#health-checks)
2. [Logging Strategy](#logging-strategy)
3. [Backup & Recovery](#backup-and-recovery)
4. [Incident Response](#incident-response)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Metrics & Dashboards](#metrics-and-dashboards)

---

## Health Checks

### Application Health Endpoints

#### Backend Health Check
```bash
curl -X GET https://api.example.com/health
```
**Response**: `200 OK`
```json
{
  "status": "ok"
}
```

#### API Info Endpoint
```bash
curl -X GET https://api.example.com/
```
**Response**:
```json
{
  "name": "NS Exam Portal Backend API",
  "version": "1.0.0",
  "status": "healthy"
}
```

### Database Health Verification

**Check Turso Connection**:
```bash
# Using CLI
turso db list
turso db shell exam-portal
SELECT 1;

# In application
const db = getDb();
await db.execute("SELECT 1");
// If throws error, database is unavailable
```

### Frontend Health

**Cloudflare Pages Status**:
```bash
# Check domain DNS
nslookup test.nssoftwaresolutions.in

# Check SSL certificate
openssl s_client -connect test.nssoftwaresolutions.in:443

# Test accessibility
curl -I https://test.nssoftwaresolutions.in
```

### Automated Health Monitoring

**GCP Cloud Monitoring Setup**:
```bash
# Create health check policy
gcloud compute health-checks create https exam-portal-health \
  --request-path=/health \
  --port=8080 \
  --check-interval=30s \
  --timeout=10s

# Verify health check
gcloud compute health-checks describe exam-portal-health
```

---

## Logging Strategy

### Application Logging

**Backend Logging Implementation**:
```typescript
// structured JSON logging
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'INFO',
  service: 'exam-portal-api',
  message: 'Test created',
  userId: user.id,
  testId: test.id,
  clientId: test.client_id,
  duration_ms: performance.now() - startTime,
  correlationId: req.headers['x-correlation-id']
}));
```

### Log Levels

```typescript
// CRITICAL - System down
console.error(JSON.stringify({ level: 'CRITICAL', message: 'Database connection failed' }));

// ERROR - Operation failed
console.error(JSON.stringify({ level: 'ERROR', message: 'Grading failed', testId, error: err.message }));

// WARN - Potential issue
console.warn(JSON.stringify({ level: 'WARN', message: 'High response time', duration_ms: 1200 }));

// INFO - Normal operation
console.log(JSON.stringify({ level: 'INFO', message: 'Attempt created', attemptId }));

// DEBUG - Diagnostic info (development only)
console.debug(JSON.stringify({ level: 'DEBUG', message: 'Query executed', sql, duration_ms }));
```

### Log Aggregation

**GCP Cloud Logging**:
```bash
# View application logs
gcloud logging read "resource.type=cloud_run_revision" \
  --limit 50 \
  --format json

# Filter by service
gcloud logging read "resource.service_name=exam-portal-api" \
  --limit 100 \
  --sort-by ~timestamp

# Search for errors
gcloud logging read "severity=ERROR" \
  --limit 50

# Create log-based alert
gcloud logging sinks create error-alert \
  ERROR_SINK_DESTINATION \
  --log-filter='severity=ERROR'
```

### Audit Logging

**Database Audit Trail**:
```typescript
// Log all important actions
async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
) {
  await db.execute({
    sql: `
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      randomUUID(),
      userId,
      action,
      entityType,
      entityId,
      JSON.stringify(metadata),
      new Date().toISOString()
    ]
  });
}

// Usage
await createAuditLog(
  user.id,
  'TEST_CREATED',
  'test',
  test.id,
  { testName: test.test_name, clientId: test.client_id }
);
```

### Log Retention

**Archive Old Logs**:
```bash
# GCP Cloud Logging retention is 30 days by default
# For longer retention, export to Cloud Storage
gcloud logging sinks create long-term-storage \
  storage.googleapis.com/exam-portal-logs \
  --log-filter='timestamp>="2024-01-01T00:00:00Z"'
```

---

## Backup & Recovery

### Automated Backups

**Turso Automatic Backups**:
- ✅ Daily automated backups
- ✅ 30-day retention
- ✅ Point-in-time recovery available
- ✅ Geographic redundancy

**Verify Backups**:
```bash
# List backups
turso db backup list exam-portal

# Check backup status
turso db backup show exam-portal <BACKUP_ID>
```

### Manual Backup

**Export Data**:
```bash
# Export to SQL file
turso db shell exam-portal < backup_query.sql > backup.sql

# Backup query
SELECT 
  name, 
  sql 
FROM sqlite_master 
WHERE type='table' OR type='index';
```

### Recovery Procedures

**Point-in-Time Recovery**:
```bash
# If data corrupted, contact Turso support
# Request restore to specific timestamp
# Usually available within 1 hour

# Verify recovery
turso db shell exam-portal-recovered
SELECT COUNT(*) FROM clients;
```

**Manual Recovery from Backup**:
```sql
-- 1. Identify backup point
-- 2. Export backup data
-- 3. Create new database from backup
-- 4. Validate data integrity
SELECT 
  COUNT(*) as client_count,
  COUNT(DISTINCT id) as unique_clients
FROM clients;

-- 5. Switch DNS to recovered database
```

### Data Integrity Checks

**Validation Queries**:
```sql
-- Check for orphaned records
SELECT * FROM attempts 
WHERE test_id NOT IN (SELECT id FROM tests);

-- Check for missing relationships
SELECT * FROM test_questions 
WHERE test_id NOT IN (SELECT id FROM tests);

-- Verify counts match
SELECT 
  COUNT(*) as total_attempts,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(DISTINCT test_id) as unique_tests
FROM attempts;
```

---

## Incident Response

### Incident Classification

| Severity | Criteria | Response Time | Action |
|----------|----------|----------------|--------|
| **Critical** | System down, data loss, security breach | 5 minutes | Immediate escalation, war room |
| **High** | Major feature broken, significant degradation | 30 minutes | Immediate investigation, mitigation |
| **Medium** | Feature partial outage, minor performance | 2 hours | Investigation, planned fix |
| **Low** | Minor issue, cosmetic problems | Next business day | Log, schedule fix |

### Incident Response Checklist

**Immediate Actions (0-5 min)**:
- [ ] Acknowledge incident
- [ ] Assign incident commander
- [ ] Open communication channel
- [ ] Assess severity
- [ ] Notify stakeholders

**Investigation (5-30 min)**:
- [ ] Check application logs
- [ ] Check database status
- [ ] Check infrastructure metrics
- [ ] Verify monitoring alerts
- [ ] Identify root cause

**Mitigation (30-120 min)**:
- [ ] Apply temporary fix if needed
- [ ] Implement permanent fix
- [ ] Deploy changes
- [ ] Verify resolution
- [ ] Monitor metrics

**Post-Incident (1-24 hours)**:
- [ ] Conduct postmortem
- [ ] Document lessons learned
- [ ] Create follow-up tasks
- [ ] Communicate resolution
- [ ] Archive incident logs

### Common Incidents

#### Database Connection Failure

**Symptoms**: All API requests failing with 500 errors

**Investigation**:
```bash
# Check Turso status
turso db shell exam-portal
SELECT 1;

# Check network connectivity
curl -I https://exam-portal.turso.io

# Check credentials
echo $TURSO_DATABASE_URL
echo $TURSO_AUTH_TOKEN
```

**Recovery**:
```bash
# 1. Restart service
gcloud run services update exam-portal-api --no-gen2

# 2. If still failing, rollback to previous version
gcloud run deploy exam-portal-api \
  --image gcr.io/project/exam-portal-api:previous-version

# 3. Contact Turso support if issue persists
```

#### High Memory Usage

**Symptoms**: Cloud Run instance kills with OOM (Out of Memory)

**Investigation**:
```bash
# Check memory metrics
gcloud run services describe exam-portal-api --region asia-south2

# Analyze logs for memory spikes
gcloud logging read "resource.service_name=exam-portal-api AND memory_mb > 400" \
  --limit 20

# Profile application
NODE_OPTIONS=--max-old-space-size=1024 npm run dev
```

**Recovery**:
```bash
# Increase memory allocation
gcloud run services update exam-portal-api \
  --memory 512Mi

# Optimize queries to reduce memory usage
# Clear application cache if implemented
```

#### High CPU Usage

**Symptoms**: Slow response times, high latency

**Investigation**:
```bash
# Check CPU metrics
gcloud monitoring time-series list \
  --filter 'resource.service_name=exam-portal-api AND metric.type=run.googleapis.com/request_count'

# Check for inefficient queries
# Review recent code changes
```

**Recovery**:
```bash
# Increase CPU allocation
gcloud run services update exam-portal-api --cpu 2

# Optimize hot paths
# Enable caching if implemented
# Scale horizontally with more instances
```

#### Subscription Service Down

**Symptoms**: Cannot access platform, maintenance mode active

**Recovery**:
```bash
# Disable maintenance mode
PUT /api/settings
{
  "maintenance_mode": false
}

# Or via database
turso db shell exam-portal
UPDATE global_settings SET value = 'false' WHERE key = 'maintenance_mode';
```

---

## Maintenance Procedures

### Regular Maintenance Schedule

**Daily**:
- ✅ Monitor error rates
- ✅ Check backup completion
- ✅ Review suspicious activities

**Weekly**:
- ✅ Review performance metrics
- ✅ Check disk space usage
- ✅ Validate audit logs

**Monthly**:
- ✅ Full database integrity check
- ✅ Review and update monitoring rules
- ✅ Analyze trends and capacity
- ✅ Security audit

**Quarterly**:
- ✅ Disaster recovery drill
- ✅ Backup recovery test
- ✅ Performance baseline update
- ✅ Dependency updates

### Database Maintenance

**Vacuum Database** (if using SQLite locally):
```sql
-- Defragment database
VACUUM;

-- Analyze for optimization
ANALYZE;

-- Check integrity
PRAGMA integrity_check;
```

**Archive Old Data**:
```sql
-- Archive attempts older than 1 year
DELETE FROM attempts 
WHERE submitted_at < date('now', '-1 year')
LIMIT 1000;

-- Archive audit logs older than 90 days
DELETE FROM audit_logs 
WHERE created_at < date('now', '-90 days')
LIMIT 5000;

-- Run optimization
ANALYZE;
```

### Security Maintenance

**Rotate Credentials**:
```bash
# Rotate Firebase service account key
# 1. Generate new key in Firebase Console
# 2. Update environment variables
# 3. Test with new key
# 4. Delete old key

# Rotate database credentials
# 1. Create new Turso auth token
# 2. Update TURSO_AUTH_TOKEN
# 3. Verify connectivity
# 4. Revoke old token

# Update dependencies
npm audit
npm update
npm audit fix
```

**Security Review**:
```bash
# Check for vulnerabilities
npm audit
npm audit --audit-level moderate

# Review CORS configuration
# Review rate limiting rules
# Review audit logs for suspicious activity
```

### Zero-Downtime Deployment

**Blue-Green Deployment**:
```bash
# 1. Deploy new version to new service
gcloud run deploy exam-portal-api-v2 \
  --image gcr.io/project/exam-portal-api:new-version

# 2. Test new version
curl https://exam-portal-api-v2-xxx.run.app/health

# 3. Switch traffic (instantaneous)
gcloud run services update-traffic exam-portal-api \
  --to-revisions LATEST=100

# 4. Keep old version for quick rollback
gcloud run revisions list --service=exam-portal-api
gcloud run services update-traffic exam-portal-api \
  --to-revisions PREVIOUS=100  # Rollback
```

---

## Metrics & Dashboards

### Key Metrics

**Application Metrics**:
```
- Request Count: /api/*/
- Request Latency: p50, p95, p99
- Error Rate: (500 errors) / total requests
- Success Rate: (2xx responses) / total requests
```

**Business Metrics**:
```
- Active Clients: COUNT(DISTINCT client_id) WHERE active_status=1
- Total Tests: COUNT(*) FROM tests WHERE status='published'
- Total Attempts: COUNT(*) FROM attempts WHERE status='submitted'
- Avg Score: AVG(score) FROM attempts
```

**Infrastructure Metrics**:
```
- CPU Usage: < 70%
- Memory Usage: < 80%
- Disk Usage: < 85%
- Network Bandwidth: monitor growth
```

### GCP Dashboard Setup

**Create Custom Dashboard**:
```bash
# Create dashboard
gcloud monitoring dashboards create --config-from-file dashboard.yaml
```

**Dashboard Configuration** (dashboard.yaml):
```yaml
displayName: "Exam Portal Overview"
mosaicLayout:
  columns: 12
  tiles:
    - width: 6
      height: 4
      xyChart:
        dataSets:
          - timeSeriesQuery:
              timeSeriesFilter:
                filter: 'resource.service_name="exam-portal-api" AND metric.type="run.googleapis.com/request_count"'
        title: "Request Rate"
    
    - width: 6
      height: 4
      xyChart:
        dataSets:
          - timeSeriesQuery:
              timeSeriesFilter:
                filter: 'resource.service_name="exam-portal-api" AND metric.type="run.googleapis.com/request_latencies"'
        title: "Request Latency"
```

### Alerting Rules

**Create Alerts**:
```bash
# High error rate alert
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 1%" \
  --condition-threshold-value=0.01 \
  --condition-threshold-filter='metric.type="run.googleapis.com/request_count" AND resource.service_name="exam-portal-api"'

# High latency alert
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Latency" \
  --condition-display-name="P95 latency > 500ms" \
  --condition-threshold-value=500
```

---

## Operational Runbooks

### Starting the Application

**Local Development**:
```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Access at http://localhost:5173
```

**Production**:
```bash
# Already deployed via GCP Cloud Build
# Monitor via:
gcloud run services list --region asia-south2

# View logs:
gcloud run logs read exam-portal-api --region asia-south2 --limit 100
```

### Stopping the Application

**Local Development**:
```bash
# Ctrl+C in both terminals
# Or kill processes:
lsof -i :8080 | awk 'NR!=1 {print $2}' | xargs kill -9
lsof -i :5173 | awk 'NR!=1 {print $2}' | xargs kill -9
```

**Production**:
```bash
# Don't stop production services
# Use maintenance mode instead:
curl -X PUT https://api.example.com/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"maintenance_mode": true}'
```

### Emergency Shutdown

```bash
# Only if critical issue
gcloud run services delete exam-portal-api --region asia-south2

# This requires redeployment to restore
gcloud run deploy exam-portal-api \
  --image gcr.io/project/exam-portal-api:latest \
  --region asia-south2
```

---

## Contact Information

**24/7 Support**:
- **Email**: info.nssoftwaresolutions@gmail.com
- **On-Call Rotation**: TBD
- **Escalation**: Manager → Director → CTO

**Documentation**:
- **Main Docs**: [docs.nssoftwaresolutions.in](https://docs.nssoftwaresolutions.in)
- **API Reference**: See API_REFERENCE.md
- **Architecture**: See ARCHITECTURE.md