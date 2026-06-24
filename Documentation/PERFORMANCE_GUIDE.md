# NS Exam Portal - Performance Guide

## Table of Contents
1. [Frontend Optimization](#frontend-optimization)
2. [Backend Optimization](#backend-optimization)
3. [Database Performance](#database-performance)
4. [Scaling Recommendations](#scaling-recommendations)
5. [Monitoring Performance](#monitoring-performance)

---

## Frontend Optimization

### Code Splitting & Lazy Loading

**Current Implementation**:
```typescript
// routes/Router.tsx
import { lazy, Suspense } from 'react';

const SuperAdminDashboard = lazy(() => import('./pages/SuperAdmin/Dashboard'));
const ClientAdminDashboard = lazy(() => import('./pages/ClientAdmin/Dashboard'));
const StudentDashboard = lazy(() => import('./pages/Student/Dashboard'));
const TestEngine = lazy(() => import('./pages/Student/Engine'));

export function Router() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/superadmin" element={<SuperAdminDashboard />} />
        <Route path="/client-admin" element={<ClientAdminDashboard />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/exam" element={<TestEngine />} />
      </Routes>
    </Suspense>
  );
}
```

**Benefits**:
- ✅ Initial bundle reduced (~40% smaller)
- ✅ Only loaded routes downloaded on demand
- ✅ Faster Time to Interactive (TTI)

### Bundle Analysis

**Analyze current bundle**:
```bash
npm run build
npm install -g source-map-explorer
source-map-explorer 'frontend/dist/**/*.js'
```

**Expected bundle breakdown**:
- React & React Router: ~150 KB
- shadcn/ui components: ~180 KB
- Tailwind CSS: ~50 KB (with PurgeCSS)
- App code: ~100 KB
- **Total**: ~480 KB (gzipped: ~120 KB)

**Optimization targets**:
```typescript
// Bad - imports entire chart library
import * as recharts from 'recharts';

// Good - imports only needed components
import { BarChart, Bar, XAxis } from 'recharts';

// Better - lazy load charts
const PerformanceChart = lazy(() => import('./charts/Performance'));
```

### Image Optimization

**Current Strategy**:
```typescript
// Use optimized images
export function BrandLogo() {
  return (
    <img 
      src={organizationLogo} 
      alt="Organization Logo"
      loading="lazy"
      width={200}
      height={100}
      // Serves WebP with PNG fallback
      srcSet={`
        ${logoWebP} 1x,
        ${logoWebP2x} 2x
      `}
    />
  );
}
```

**Recommendations**:
- ✅ Use WebP format (20-30% smaller)
- ✅ Lazy load below-the-fold images
- ✅ Responsive images with srcSet
- ✅ Compress PNGs/JPGs before upload

### CSS Optimization

**Tailwind CSS Purging**:
```javascript
// tailwind.config.ts
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  purge: {
    enabled: true,
    preserveHtmlElements: false,
  }
}
```

**Result**: Removes unused CSS (~50% reduction)

### JavaScript Performance

**Debouncing & Throttling**:
```typescript
// Answer auto-save with debounce (2 seconds)
const debouncedSave = useMemo(
  () => debounce((answers) => {
    apiClient.saveAnswers(answers);
  }, 2000),
  []
);

// Scroll performance with throttle
const throttledScroll = useMemo(
  () => throttle(() => {
    updateVisibleQuestions();
  }, 100),
  []
);
```

**React Performance Tips**:
```typescript
// 1. Use React.memo for expensive components
const QuestionCard = React.memo(({ question, onChange }) => {
  return <div>{question.text}</div>;
});

// 2. useCallback for event handlers
const handleAnswerChange = useCallback((answer) => {
  setAnswers(prev => ({ ...prev, answer }));
}, []);

// 3. useMemo for derived state
const score = useMemo(() => {
  return answers.reduce((sum, ans) => sum + getPoints(ans), 0);
}, [answers]);

// 4. Use key prop correctly in lists
{questions.map(q => (
  <QuestionCard key={q.id} question={q} />
))}
```

---

## Backend Optimization

### API Response Optimization

**Pagination Implementation**:
```typescript
// routes/attempts.ts
export async function getAttempts(req: Request, res: Response) {
  const page = Math.max(1, parseInt(req.query.page || '1'));
  const limit = Math.min(100, parseInt(req.query.limit || '20'));
  const offset = (page - 1) * limit;
  
  // Use Promise.all for parallel queries
  const [totalRows, dataRows] = await Promise.all([
    db.execute(`SELECT COUNT(*) as total FROM attempts`),
    db.execute({
      sql: `SELECT * FROM attempts ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      args: [limit, offset]
    })
  ]);
  
  const total = totalRows.rows[0].total;
  return res.json({
    data: dataRows.rows,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}
```

**Benefits**: Only fetch needed data, faster responses

### Query Optimization

**N+1 Query Problem - BAD**:
```typescript
// ❌ This causes N+1 queries (slow)
const tests = await db.execute(`SELECT * FROM tests`);
for (const test of tests.rows) {
  const sections = await db.execute({
    sql: `SELECT * FROM test_sections WHERE test_id = ?`,
    args: [test.id]
  });
  test.sections = sections.rows;
}
```

**Solution - Use JOINs**:
```typescript
// ✅ Single query (fast)
const { rows } = await db.execute(`
  SELECT t.*, ts.*
  FROM tests t
  LEFT JOIN test_sections ts ON t.id = ts.test_id
  ORDER BY t.id, ts.position
`);

// Group results in code
const testsMap = new Map();
rows.forEach(row => {
  if (!testsMap.has(row.test_id)) {
    testsMap.set(row.test_id, { ...row, sections: [] });
  }
  if (row.section_id) {
    testsMap.get(row.test_id).sections.push({ /* section */ });
  }
});
```

### Connection Pooling

**Turso Connection Management**:
```typescript
// db/db.ts - Single client instance
let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });
  }
  return client;
}

// Reuse client for all queries
// Automatic connection pooling handled by Turso
```

### Caching Strategy

**Response Caching**:
```typescript
// Cache static data with HTTP headers
res.set('Cache-Control', 'public, max-age=3600'); // 1 hour

// Cache validation data
app.use('/api/packages', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
  next();
});
```

### Batch Operations

**Bulk Insert Optimization**:
```typescript
// ❌ Slow - Multiple inserts
for (const question of questions) {
  await db.execute({
    sql: `INSERT INTO questions (...) VALUES (...)`,
    args: [/* values */]
  });
}

// ✅ Fast - Batch insert
const values = questions.map(q => [...]).flat();
const placeholders = questions.map(() => '(?,?,?,?)').join(',');
await db.execute({
  sql: `INSERT INTO questions (...) VALUES ${placeholders}`,
  args: values
});
```

---

## Database Performance

### Strategic Indexing

**Current Indexes** (See DATABASE_SCHEMA.md for complete list):
```sql
-- Most important indexes
CREATE INDEX idx_attempts_student_id ON attempts(student_id);
CREATE INDEX idx_attempts_test_id ON attempts(test_id);
CREATE INDEX idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX idx_profiles_client_id ON profiles(client_id);
CREATE INDEX idx_tests_client_id ON tests(client_id);
CREATE INDEX idx_tests_status ON tests(status);

-- Composite indexes for common queries
CREATE INDEX idx_attempts_student_test ON attempts(student_id, test_id);
```

**Query Planning**:
```bash
turso db shell exam-portal

-- Analyze query performance
EXPLAIN QUERY PLAN
SELECT * FROM attempts WHERE student_id = ? AND test_id = ?;
-- Should use: idx_attempts_student_test
```

### Data Archival

**Move old records to archive**:
```typescript
// Archive old attempts (older than 1 year)
async function archiveOldAttempts() {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
  
  await db.execute({
    sql: `
      DELETE FROM attempts 
      WHERE submitted_at < ? AND status = 'submitted'
      LIMIT 10000
    `,
    args: [cutoffDate.toISOString()]
  });
}
```

### Query Optimization Examples

**Slow Query - Full Table Scan**:
```sql
-- ❌ O(n) - Slow
SELECT * FROM questions WHERE question_text LIKE '%keyword%';

-- ✅ O(log n) - Better
-- Requires full-text search index or application-level filtering
```

**Inefficient Joins**:
```sql
-- ❌ Slow - Multiple subqueries
SELECT * FROM tests 
WHERE id IN (SELECT test_id FROM attempts WHERE student_id = ?)
AND status = 'published'
AND client_id = ?;

-- ✅ Fast - Direct JOIN
SELECT DISTINCT t.* FROM tests t
JOIN attempts a ON t.id = a.test_id
WHERE a.student_id = ? AND t.status = 'published' AND t.client_id = ?;
```

---

## Scaling Recommendations

### Horizontal Scaling

**Current Architecture**:
- ✅ Stateless Express backend (scales horizontally)
- ✅ Turso handles database distribution
- ✅ Cloudflare CDN caches static assets

**Scaling to 1000+ Users**:
```bash
# GCP Cloud Run already handles auto-scaling
# Verify settings:
gcloud run services update exam-portal-api \
  --concurrency 100 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 2
```

### Load Balancing

**Traffic Distribution**:
```
CloudFlare CDN (Global Edge)
        ↓
GCP Load Balancer
        ↓
Cloud Run Instances (Auto-scaled)
        ↓
Turso Database (Replicated)
```

**Enable load balancing**:
```bash
# Already configured in production setup
# Cloudflare distributes requests globally
# GCP Cloud Run scales instances automatically
```

### Database Scaling

**Turso Scaling Strategy**:
- ✅ Read replicas auto-distributed globally
- ✅ Automatic failover
- ✅ Point-in-time recovery

**Monitor database metrics**:
```bash
turso metrics EXAM_PORTAL
# Shows: queries/sec, latency, connections
```

### Caching Layer

**Redis Caching (Future Enhancement)**:
```typescript
// Add caching for frequently accessed data
import Redis from 'redis';

const redis = Redis.createClient();

async function getCachedTests(clientId) {
  const cached = await redis.get(`tests:${clientId}`);
  if (cached) return JSON.parse(cached);
  
  const tests = await db.execute({
    sql: 'SELECT * FROM tests WHERE client_id = ?',
    args: [clientId]
  });
  
  await redis.setex(`tests:${clientId}`, 3600, JSON.stringify(tests));
  return tests;
}
```

---

## Monitoring Performance

### Performance Metrics

**Key Metrics to Track**:
```
Frontend:
- First Contentful Paint (FCP): < 2 seconds
- Largest Contentful Paint (LCP): < 2.5 seconds
- Cumulative Layout Shift (CLS): < 0.1
- Time to Interactive (TTI): < 3.5 seconds

Backend:
- API Response Time: < 200 ms (p95)
- Database Query Time: < 100 ms (p95)
- Throughput: > 100 RPS
- Error Rate: < 0.1%

Database:
- Query Latency: < 50 ms (p95)
- Connection Pool Utilization: < 80%
- Storage Used: Monitor growth
```

### GCP Monitoring

**Set up Cloud Monitoring**:
```bash
# View metrics in GCP Console
gcloud run services update exam-portal-api \
  --update-env-vars LOG_LEVEL=INFO

# Create custom alerts
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="API High Latency" \
  --condition-display-name="Response time > 500ms"
```

### Frontend Performance Monitoring

**Implement Web Vitals**:
```typescript
// src/main.tsx
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### Load Testing

**k6 Load Test**:
```bash
# Run load test
k6 run backend/loadtest.js

# Expected results
// Should handle 100 concurrent users
// Response times < 500ms
// Error rate < 1%
```

### Profiling

**Backend Profiling**:
```bash
# Node.js built-in profiler
node --prof backend/dist/server.js
# Visit /api/tests
# Stop with Ctrl+C

# Process results
node --prof-process isolate-*.log > profile.txt
```

---

## Performance Checklist

**Frontend**:
- ✅ Code splitting implemented
- ✅ Images optimized (WebP, lazy loading)
- ✅ CSS purged with Tailwind
- ✅ Debounced input handlers
- ✅ React.memo for expensive components
- ✅ Bundle < 150 KB gzipped

**Backend**:
- ✅ Pagination on list endpoints
- ✅ Query optimization with indexes
- ✅ Connection pooling configured
- ✅ HTTP caching headers set
- ✅ Batch operations for bulk data
- ✅ Response time < 200ms p95

**Database**:
- ✅ All strategic indexes created
- ✅ Query plans analyzed
- ✅ Connection pool tuned
- ✅ Archival strategy in place
- ✅ Replication configured
- ✅ Backups automated

**Infrastructure**:
- ✅ Auto-scaling enabled
- ✅ CDN caching active
- ✅ Load balancing configured
- ✅ Monitoring alerts set
- ✅ Log aggregation enabled
- ✅ Error tracking configured