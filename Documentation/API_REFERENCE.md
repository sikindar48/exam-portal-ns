# NS Exam Portal - API Reference

## Overview
Complete REST API documentation for the NS Exam Portal. All endpoints require Firebase ID token authentication via `Authorization: Bearer <token>` header, except for public endpoints.

---

## Authentication

### JWT Token Requirements
- **Header**: `Authorization: Bearer <firebase_id_token>`
- **Token Source**: Firebase Authentication SDK
- **Expiry**: 1 hour (automatic refresh in client)
- **Guest Access**: Use `attempt_token` query parameter for guest operations

### Guest Access Pattern
```
GET /api/attempts/:attemptId?attempt_token=<token>
Headers: Authorization: Bearer <guest_firebase_token>
```

---

## Core Endpoints

### Clients Management

#### GET /api/clients
List all clients (Super Admin only)
```bash
curl -X GET https://api.example.com/api/clients \
  -H "Authorization: Bearer $TOKEN"
```
**Response**: 
```json
{
  "clients": [
    {
      "id": "uuid",
      "name": "Organization Name",
      "address": "Address",
      "logo_url": "https://...",
      "active_status": 1,
      "created_at": "2026-06-24T10:00:00Z"
    }
  ]
}
```

#### POST /api/clients
Create new client (Super Admin only)
```bash
curl -X POST https://api.example.com/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Organization",
    "address": "Street Address",
    "logo_url": "https://logo.url/image.png",
    "plan_id": "starter"
  }'
```
**Response**: `201 Created` with client object

#### PUT /api/clients/:clientId
Update client details
```bash
curl -X PUT https://api.example.com/api/clients/$CLIENT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "active_status": 1
  }'
```

---

### Tests Management

#### GET /api/tests
List tests for user's tenant
```bash
curl -X GET "https://api.example.com/api/tests?client_id=$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN"
```
**Query Parameters**:
- `client_id` (required for admins)
- `status` (draft, published)
- `folder_id` (filter by folder)
- `share_code` (public lookup)

**Response**:
```json
{
  "tests": [
    {
      "id": "test-uuid",
      "test_name": "Math Exam",
      "timer": 60,
      "status": "published",
      "active": 1,
      "created_at": "2026-06-24T10:00:00Z"
    }
  ]
}
```

#### POST /api/tests
Create new test
```bash
curl -X POST https://api.example.com/api/tests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_name": "Physics Exam",
    "timer": 120,
    "folder_id": "folder-uuid",
    "negative_marking": true,
    "negative_marks": 0.25,
    "allow_guests": true,
    "show_results_after_submission": true
  }'
```

#### PUT /api/tests/:testId
Update test configuration
```bash
curl -X PUT https://api.example.com/api/tests/$TEST_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_name": "Updated Name",
    "timer": 90,
    "status": "published"
  }'
```

#### POST /api/rpc/clone-test
Duplicate a test
```bash
curl -X POST https://api.example.com/api/rpc/clone-test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "original-test-uuid"
  }'
```
**Response**: `201 Created` with cloned test

---

### Questions Management

#### GET /api/questions
List questions in client's bank
```bash
curl -X GET "https://api.example.com/api/questions?client_id=$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

#### POST /api/questions
Create single question
```bash
curl -X POST https://api.example.com/api/questions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question_text": "What is 2+2?",
    "question_type": "mcq",
    "option_a": "3",
    "option_b": "4",
    "option_c": "5",
    "option_d": "6",
    "correct_answer": "B",
    "marks": 1,
    "difficulty": "easy"
  }'
```

#### POST /api/questions/import
Bulk import questions from CSV
```bash
curl -X POST https://api.example.com/api/questions/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@questions.csv"
```
**CSV Format**:
```
question_text,question_type,option_a,option_b,option_c,option_d,correct_answer,marks,difficulty
"What is 2+2?",mcq,"3","4","5","6","B",1,easy
```

#### DELETE /api/questions?import_batch_id=<batchId>
Rollback bulk import
```bash
curl -X DELETE "https://api.example.com/api/questions?import_batch_id=$BATCH_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Attempts Management

#### POST /api/attempts
Create test attempt
```bash
curl -X POST https://api.example.com/api/attempts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "user-uuid",
    "test_id": "test-uuid"
  }'
```
**Response**: `201 Created`
```json
{
  "id": "attempt-uuid",
  "student_id": "user-uuid",
  "test_id": "test-uuid",
  "status": "in_progress",
  "attempt_token": "secure-token-for-guests"
}
```

#### GET /api/attempts
List attempts for student or test
```bash
curl -X GET "https://api.example.com/api/attempts?student_id=$STUDENT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

#### GET /api/attempts/:attemptId
Get single attempt details
```bash
curl -X GET "https://api.example.com/api/attempts/$ATTEMPT_ID?attempt_token=$TOKEN" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Answers Management

#### POST /api/attempt-answers
Save or update answers (auto-save)
```bash
curl -X POST https://api.example.com/api/attempt-answers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "attempt_id": "attempt-uuid",
      "question_id": "question-uuid",
      "selected_option": "B",
      "marked_for_review": false
    }
  ]'
```
**Note**: Supports batch array for multiple answers

#### GET /api/attempt-answers/:attemptId
Retrieve saved answers
```bash
curl -X GET "https://api.example.com/api/attempt-answers/$ATTEMPT_ID?attempt_token=$TOKEN" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Submission & Grading

#### POST /api/rpc/submit-attempt
Submit attempt for grading
```bash
curl -X POST https://api.example.com/api/rpc/submit-attempt \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attempt_id": "attempt-uuid",
    "time_taken": 3600
  }'
```
**Response**: `200 OK`
```json
{
  "score": 8.5,
  "total_marks": 10,
  "time_taken": 3600,
  "status": "submitted"
}
```

#### GET /api/attempts/:attemptId/report
Download XLSX performance report
```bash
curl -X GET "https://api.example.com/api/attempts/$ATTEMPT_ID/report?attempt_token=$TOKEN" \
  -H "Authorization: Bearer $TOKEN" \
  -o report.xlsx
```

---

### Proctoring Events

#### POST /api/proctoring/events
Log proctoring event
```bash
curl -X POST https://api.example.com/api/proctoring/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attempt_id": "attempt-uuid",
    "test_id": "test-uuid",
    "event_type": "TAB_SWITCH",
    "evidence": "base64-encoded-image"
  }'
```
**Event Types**:
- `TAB_SWITCH` - Tab/window changed
- `WINDOW_BLUR` - Window lost focus
- `FULLSCREEN_EXIT` - Fullscreen exited
- `NO_FACE` - Face not detected
- `MULTIPLE_FACES` - Multiple faces detected
- `CAMERA_DISCONNECTED` - Camera disconnected
- `CAMERA_PERMISSION_DENIED` - Permission denied

#### GET /api/proctoring/events
List proctoring events for attempt
```bash
curl -X GET "https://api.example.com/api/proctoring/events?attempt_id=$ATTEMPT_ID&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Subscriptions Management

#### GET /api/superadmin/subscriptions
List all client subscriptions
```bash
curl -X GET https://api.example.com/api/superadmin/subscriptions \
  -H "Authorization: Bearer $TOKEN"
```

#### PUT /api/superadmin/subscriptions/:clientId
Update client subscription
```bash
curl -X PUT "https://api.example.com/api/superadmin/subscriptions/$CLIENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "growth",
    "expiry_date": "2027-06-24"
  }'
```

#### GET /api/subscription-requests
List subscription upgrade requests
```bash
curl -X GET https://api.example.com/api/subscription-requests \
  -H "Authorization: Bearer $TOKEN"
```

#### PUT /api/subscription-requests/:requestId/approve
Approve subscription request
```bash
curl -X PUT "https://api.example.com/api/subscription-requests/$REQUEST_ID/approve" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Analytics & Reporting

#### GET /api/stats
Get dashboard statistics
```bash
curl -X GET https://api.example.com/api/stats \
  -H "Authorization: Bearer $TOKEN"
```
**Response**: Role-specific metrics (Super Admin vs Client Admin)

#### GET /api/stats/dashboard
Get admin dashboard data
```bash
curl -X GET https://api.example.com/api/stats/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

---

### Audit Logging

#### GET /api/superadmin/audit-logs
List platform audit logs
```bash
curl -X GET "https://api.example.com/api/superadmin/audit-logs?page=1&limit=50&user_id=$USER_ID" \
  -H "Authorization: Bearer $TOKEN"
```
**Query Parameters**:
- `page` - Pagination page number
- `limit` - Results per page
- `user_id` - Filter by user
- `action` - Filter by action type
- `entity_type` - Filter by entity type
- `start_date` - Filter by date range
- `end_date` - Filter by date range

---

### Settings & Configuration

#### GET /api/settings
Get global platform settings
```bash
curl -X GET https://api.example.com/api/settings \
  -H "Authorization: Bearer $TOKEN"
```

#### PUT /api/settings
Update platform settings (Super Admin only)
```bash
curl -X PUT https://api.example.com/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "maintenance_mode": false,
    "announcement_banner": "Platform under maintenance",
    "registration_enabled": true
  }'
```

---

## Permissions Matrix

| Endpoint | Super Admin | Client Admin | Student | Guest |
|----------|-------------|--------------|---------|-------|
| GET /api/clients | ✅ | ❌ | ❌ | ❌ |
| POST /api/clients | ✅ | ❌ | ❌ | ❌ |
| GET /api/tests | ✅ Tenant | ✅ Tenant | ✅ Tenant | ✅ Share Code |
| POST /api/tests | ❌ | ✅ Tenant | ❌ | ❌ |
| POST /api/attempts | ✅ | ✅ Tenant | ✅ Own | ✅ Token |
| GET /api/attempts | ✅ | ✅ Tenant | ✅ Own | ✅ Token |
| POST /api/attempt-answers | ✅ | ❌ | ✅ Own | ✅ Token |
| POST /api/rpc/submit-attempt | ✅ | ❌ | ✅ Own | ✅ Token |
| GET /api/superadmin/* | ✅ | ❌ | ❌ | ❌ |
| POST /api/settings | ✅ | ❌ | ❌ | ❌ |

---

## Rate Limiting

### Global Rate Limiter
- **Limit**: 1000 requests per 15 minutes
- **Response**: `429 Too Many Requests`

### Strict Rate Limiter (Sensitive Endpoints)
- **Limit**: 100 requests per minute
- **Endpoints**:
  - `/api/create-user`
  - `/api/attempts`
  - `/api/attempt-answers`
  - `/api/proctoring/events`
  - `/api/rpc/submit-attempt`

---

## Common Response Patterns

### Success Response
```json
{
  "data": { /* resource or array */ },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Validation Error
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## Health Checks

#### GET /health
Server health check (no auth required)
```bash
curl -X GET https://api.example.com/health
```
**Response**: `200 OK`
```json
{
  "status": "ok"
}
```

#### GET /
API info endpoint (no auth required)
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