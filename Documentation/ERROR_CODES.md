# NS Exam Portal - Error Codes Reference

## Overview
Complete error code reference for the NS Exam Portal API. All error responses include an error code, HTTP status, and message for proper error handling and debugging.

---

## HTTP Status Codes

### 2xx Success
| Code | Meaning | Use Case |
|------|---------|----------|
| `200` | OK | Successful GET, PUT, or PATCH request |
| `201` | Created | Successful POST request (resource created) |
| `204` | No Content | Successful DELETE request |

### 4xx Client Errors
| Code | Meaning | Use Case |
|------|---------|----------|
| `400` | Bad Request | Invalid parameters or validation failure |
| `401` | Unauthorized | Missing or invalid authentication token |
| `403` | Forbidden | Authenticated but lacks permission |
| `404` | Not Found | Resource does not exist |
| `409` | Conflict | Resource state conflict (duplicate, expired) |
| `429` | Too Many Requests | Rate limit exceeded |

### 5xx Server Errors
| Code | Meaning | Use Case |
|------|---------|----------|
| `500` | Internal Server Error | Unexpected server error |
| `503` | Service Unavailable | Maintenance mode or database unavailable |

---

## Authentication Errors (401)

### MISSING_AUTH_TOKEN
```json
{
  "error": "Missing authentication token",
  "code": "MISSING_AUTH_TOKEN",
  "status": 401
}
```
**Cause**: Request missing `Authorization: Bearer` header
**Solution**: Add Firebase ID token to request header

### INVALID_TOKEN
```json
{
  "error": "Invalid or expired token",
  "code": "INVALID_TOKEN",
  "status": 401
}
```
**Cause**: Token is malformed, expired, or from wrong Firebase project
**Solution**: Get fresh token from Firebase Authentication

### TOKEN_VERIFICATION_FAILED
```json
{
  "error": "Token verification failed",
  "code": "TOKEN_VERIFICATION_FAILED",
  "status": 401
}
```
**Cause**: Token signature validation failed
**Solution**: Ensure token is from correct Firebase project

---

## Authorization Errors (403)

### PERMISSION_DENIED
```json
{
  "error": "Permission denied",
  "code": "PERMISSION_DENIED",
  "status": 403
}
```
**Cause**: User lacks required role for operation
**Solution**: Verify user role (Super Admin, Client Admin, Student)

### TENANT_MISMATCH
```json
{
  "error": "Permission denied: Tenant mismatch",
  "code": "TENANT_MISMATCH",
  "status": 403
}
```
**Cause**: Attempting to access resource from different tenant
**Solution**: Verify client_id matches user's organization

### INSUFFICIENT_PRIVILEGES
```json
{
  "error": "Insufficient privileges for this operation",
  "code": "INSUFFICIENT_PRIVILEGES",
  "status": 403
}
```
**Cause**: User role doesn't have permission for operation
**Solution**: Use appropriate user role (e.g., Super Admin for client management)

### ATTEMPT_TOKEN_INVALID
```json
{
  "error": "Permission denied: Invalid attempt token",
  "code": "ATTEMPT_TOKEN_INVALID",
  "status": 403
}
```
**Cause**: Guest attempt missing or incorrect `attempt_token`
**Solution**: Include correct `attempt_token` in query or header for guest operations

---

## Validation Errors (400)

### VALIDATION_ERROR
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "status": 400,
  "details": [
    {
      "field": "test_name",
      "message": "Test name is required"
    },
    {
      "field": "timer",
      "message": "Timer must be positive integer"
    }
  ]
}
```
**Cause**: Invalid or missing required fields
**Solution**: Check field requirements and data types

### INVALID_TEST_CONFIGURATION
```json
{
  "error": "Invalid test configuration",
  "code": "INVALID_TEST_CONFIGURATION",
  "status": 400,
  "details": {
    "reason": "Timer cannot be less than 5 minutes"
  }
}
```
**Cause**: Test settings violate business rules
**Solution**: Verify timer, limits, and configuration values

### INVALID_QUESTION_TYPE
```json
{
  "error": "Invalid question type",
  "code": "INVALID_QUESTION_TYPE",
  "status": 400
}
```
**Cause**: Question type not in (mcq, true_false, multi_select, fill_blank, subjective, coding)
**Solution**: Use supported question type

### CSV_IMPORT_VALIDATION_ERROR
```json
{
  "error": "CSV import validation failed",
  "code": "CSV_IMPORT_VALIDATION_ERROR",
  "status": 400,
  "details": {
    "line": 5,
    "error": "Missing required column: correct_answer",
    "row_data": "What is 2+2?,mcq,3,4,5,6,,1,easy"
  }
}
```
**Cause**: CSV file format invalid or missing required columns
**Solution**: Verify CSV has headers: question_text, question_type, option_a, option_b, correct_answer, marks

---

## Subscription & Billing Errors (400/409)

### SUBSCRIPTION_EXPIRED
```json
{
  "error": "Client subscription has expired",
  "code": "SUBSCRIPTION_EXPIRED",
  "status": 400
}
```
**Cause**: Client's subscription plan expired
**Solution**: Contact Super Admin to renew subscription

### QUOTA_EXCEEDED
```json
{
  "error": "Quota exceeded: Monthly exam limit reached",
  "code": "QUOTA_EXCEEDED",
  "status": 400,
  "details": {
    "limit": 3,
    "current_usage": 3,
    "resource": "exams_per_month"
  }
}
```
**Cause**: Client exceeded plan limits
**Solution**: Upgrade subscription or use Pay Per Test packages

### INSUFFICIENT_PACKAGE_CAPACITY
```json
{
  "error": "Insufficient package capacity",
  "code": "INSUFFICIENT_PACKAGE_CAPACITY",
  "status": 400,
  "details": {
    "limit": 50,
    "requested": 75,
    "resource": "questions"
  }
}
```
**Cause**: Pay Per Test package question/candidate limit exceeded
**Solution**: Select higher capacity package or upgrade

### PACKAGE_ALREADY_USED
```json
{
  "error": "Package has already been used",
  "code": "PACKAGE_ALREADY_USED",
  "status": 409
}
```
**Cause**: Attempting to reuse Pay Per Test package
**Solution**: Purchase new package for new test

---

## Exam Engine Errors (400/403/409)

### TEST_NOT_PUBLISHED
```json
{
  "error": "Test is not published",
  "code": "TEST_NOT_PUBLISHED",
  "status": 400
}
```
**Cause**: Attempting to start attempt on draft test
**Solution**: Client Admin must publish test first

### TEST_NOT_ACTIVE
```json
{
  "error": "Test is not currently active",
  "code": "TEST_NOT_ACTIVE",
  "status": 400
}
```
**Cause**: Test is inactive or hidden
**Solution**: Wait for test to be activated by admin

### OUTSIDE_SCHEDULED_WINDOW
```json
{
  "error": "Test is outside scheduled time window",
  "code": "OUTSIDE_SCHEDULED_WINDOW",
  "status": 400,
  "details": {
    "scheduled_start": "2026-06-25T10:00:00Z",
    "scheduled_end": "2026-06-25T12:00:00Z",
    "current_time": "2026-06-26T10:00:00Z"
  }
}
```
**Cause**: Current time outside test's scheduled window
**Solution**: Wait for scheduled start or contact admin

### GUEST_ACCESS_NOT_ALLOWED
```json
{
  "error": "Guest access is not allowed for this test",
  "code": "GUEST_ACCESS_NOT_ALLOWED",
  "status": 403
}
```
**Cause**: Test has `allow_guests = false`
**Solution**: Use registered student account or ask admin to enable guest access

### INVALID_SHARE_CODE
```json
{
  "error": "Invalid share code",
  "code": "INVALID_SHARE_CODE",
  "status": 404
}
```
**Cause**: Share code doesn't exist or invalid
**Solution**: Verify share code and try again

### ATTEMPT_LIMIT_EXCEEDED
```json
{
  "error": "Attempt limit exceeded",
  "code": "ATTEMPT_LIMIT_EXCEEDED",
  "status": 400,
  "details": {
    "allowed_attempts": 1,
    "current_attempts": 1
  }
}
```
**Cause**: Student exceeded allowed attempts
**Solution**: Cannot take more attempts unless admin changes limit

### CANDIDATE_CAPACITY_REACHED
```json
{
  "error": "Candidate capacity reached for this test",
  "code": "CANDIDATE_CAPACITY_REACHED",
  "status": 403
}
```
**Cause**: Pay Per Test candidate limit exhausted
**Solution**: Purchase package with higher capacity

### TEST_READ_ONLY
```json
{
  "error": "Test is read-only",
  "code": "TEST_READ_ONLY",
  "status": 400
}
```
**Cause**: Test capacity exhausted or locked
**Solution**: Cannot modify test configuration when read-only

### DUPLICATE_ANSWER_SUBMISSION
```json
{
  "error": "Attempt has already been submitted",
  "code": "DUPLICATE_ANSWER_SUBMISSION",
  "status": 409
}
```
**Cause**: Attempting to submit attempt that's already submitted
**Solution**: Cannot resubmit. View results or start new attempt

---

## Proctoring Errors (400)

### CAMERA_PERMISSION_DENIED
```json
{
  "error": "Camera permission denied",
  "code": "CAMERA_PERMISSION_DENIED",
  "status": 400,
  "details": {
    "event_type": "CAMERA_PERMISSION_DENIED",
    "message": "Browser denied camera access"
  }
}
```
**Cause**: User denied browser camera access
**Solution**: Grant camera permission in browser settings

### CAMERA_NOT_AVAILABLE
```json
{
  "error": "Camera device not available",
  "code": "CAMERA_NOT_AVAILABLE",
  "status": 400
}
```
**Cause**: No camera device detected or already in use
**Solution**: Check camera device availability

### PROCTORING_NOT_ENABLED
```json
{
  "error": "Proctoring is not enabled for this test",
  "code": "PROCTORING_NOT_ENABLED",
  "status": 400
}
```
**Cause**: Attempting camera proctoring on test without feature
**Solution**: Test must have camera_proctoring feature enabled

---

## Rate Limiting Errors (429)

### RATE_LIMIT_EXCEEDED
```json
{
  "error": "Too many requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "status": 429,
  "details": {
    "retry_after": 60,
    "limit": 100,
    "window": "1 minute"
  }
}
```
**Cause**: Exceeded API rate limit
**Solution**: Wait before retrying (see `retry_after`)

---

## Server Errors (5xx)

### INTERNAL_SERVER_ERROR
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_SERVER_ERROR",
  "status": 500
}
```
**Cause**: Unexpected server error
**Solution**: Contact support with request ID

### DATABASE_ERROR
```json
{
  "error": "Database operation failed",
  "code": "DATABASE_ERROR",
  "status": 500
}
```
**Cause**: Database query or connection failed
**Solution**: Retry request; if persists, contact support

### SERVICE_UNAVAILABLE
```json
{
  "error": "Service temporarily unavailable",
  "code": "SERVICE_UNAVAILABLE",
  "status": 503,
  "details": {
    "reason": "maintenance_mode",
    "message": "Platform is under maintenance"
  }
}
```
**Cause**: Platform in maintenance mode or database down
**Solution**: Wait for maintenance to complete

---

## Not Found Errors (404)

### RESOURCE_NOT_FOUND
```json
{
  "error": "Resource not found",
  "code": "RESOURCE_NOT_FOUND",
  "status": 404,
  "details": {
    "resource_type": "Test",
    "resource_id": "invalid-uuid"
  }
}
```
**Cause**: Resource doesn't exist
**Solution**: Verify resource ID and try again

### CLIENT_NOT_FOUND
```json
{
  "error": "Client organization not found",
  "code": "CLIENT_NOT_FOUND",
  "status": 404
}
```
**Cause**: Client/organization doesn't exist
**Solution**: Verify client ID

### TEST_NOT_FOUND
```json
{
  "error": "Test not found",
  "code": "TEST_NOT_FOUND",
  "status": 404
}
```
**Cause**: Test doesn't exist
**Solution**: Verify test ID

### QUESTION_NOT_FOUND
```json
{
  "error": "Question not found",
  "code": "QUESTION_NOT_FOUND",
  "status": 404
}
```
**Cause**: Question doesn't exist
**Solution**: Verify question ID

### ATTEMPT_NOT_FOUND
```json
{
  "error": "Attempt not found",
  "code": "ATTEMPT_NOT_FOUND",
  "status": 404
}
```
**Cause**: Attempt doesn't exist
**Solution**: Verify attempt ID

---

## Conflict Errors (409)

### DUPLICATE_RESOURCE
```json
{
  "error": "Duplicate resource",
  "code": "DUPLICATE_RESOURCE",
  "status": 409,
  "details": {
    "field": "share_code",
    "message": "Share code already exists"
  }
}
```
**Cause**: Resource already exists (e.g., duplicate email)
**Solution**: Use different value or update existing resource

### STATE_CONFLICT
```json
{
  "error": "Resource state conflict",
  "code": "STATE_CONFLICT",
  "status": 409,
  "details": {
    "expected_state": "draft",
    "actual_state": "published"
  }
}
```
**Cause**: Operation not valid for current resource state
**Solution**: Change resource state first or different operation

---

## Error Handling Best Practices

### Retry Logic
```javascript
// Implement exponential backoff for retries
async function apiCallWithRetry(endpoint, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, options);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      if (response.status >= 500) {
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}
```

### Error Classification
```javascript
function classifyError(response) {
  const { status, code } = response;
  
  if (status === 401) return 'AUTHENTICATION_ERROR';
  if (status === 403) return 'AUTHORIZATION_ERROR';
  if (status === 400) return 'VALIDATION_ERROR';
  if (status === 429) return 'RATE_LIMIT_ERROR';
  if (status >= 500) return 'SERVER_ERROR';
  
  return 'UNKNOWN_ERROR';
}
```