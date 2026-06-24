# NS Exam Portal - Security & Exam Integrity Documentation

## Overview
This document details the security measures, exam integrity controls, and compliance features implemented in the NS Exam Portal. The platform is designed for high-stakes assessments with robust security at every layer.

## Authentication System

### Firebase Authentication
- **Primary Auth Provider**: Firebase Authentication with email/password and anonymous auth
- **JWT Tokens**: Firebase ID tokens validated on every API request
- **Token Lifetime**: 1-hour tokens with automatic refresh
- **Guest Access**: Anonymous authentication for guest candidates

### Authentication Flow
```
Student/Admin Login → Firebase Auth → ID Token → Backend Verification → Role Resolution
      │                     │                │              │                 │
      │                     │                │              │                 └────► Access Granted with Roles
      │                     │                │              │
      │                     │                │              └────► Token Signature Validation
      │                     │                │
      │                     └────► Firebase Project Validation
      │
Guest Candidate → Share Code → Anonymous Auth → Temporary Profile → Attempt Creation
```

### Security Features
- **Token Validation**: Backend validates Firebase project ID and token signature
- **Revocation Detection**: Tokens checked for revocation status
- **Session Management**: Client-side token refresh before expiry
- **Logout Clearing**: Local storage and state cleared on logout

## Tenant Isolation & Data Segregation

### Multi-Tenant Architecture
- **Database Level**: All tables include `client_id` column for partitioning
- **Query Filtering**: Automatic `WHERE client_id = ?` injection on all queries
- **Super Admin Bypass**: Explicit checks required for cross-tenant access
- **Guest Scoping**: Guest access limited to specific tests via share codes

### Isolation Enforcement Points
1. **Route Handlers**: All API routes verify user belongs to correct tenant
2. **Database Queries**: Raw SQL includes tenant filtering
3. **Middleware**: Auth middleware attaches tenant context to requests
4. **Frontend Routing**: Role-based routes prevent unauthorized access

### Cross-Tenant Protection
- **BOLA Prevention**: Attempt IDs checked against user's tenant
- **IDOR Mitigation**: Resource ownership verified before access
- **Share Code Security**: 8-character codes with high entropy
- **Public Link Controls**: Requires explicit `public_link_enabled = 1`

## BOLA/IDOR Protections

### Broken Object Level Authorization (BOLA) Prevention

#### Attempt Access Control
```typescript
// Example from attempts.ts route handler
if (!isSuper) {
  if (isClientAdmin) {
    const callerClientId = await getUserClientId(user.id);
    if (row.test_client_id !== callerClientId) {
      return res.status(403).json({ error: "Permission denied" });
    }
  } else {
    // Student / Guest
    if (row.student_id !== user.id) {
      return res.status(403).json({ error: "Permission denied" });
    }
    const isGuest = await isGuestStudent(row.student_id);
    if (isGuest) {
      const headerToken = req.headers["x-attempt-token"] || req.query.attempt_token;
      if (!headerToken || row.attempt_token !== headerToken) {
        return res.status(403).json({ error: "Permission denied: Invalid attempt token" });
      }
    }
  }
}
```

#### Test Access Control
- **Published Tests**: Only accessible if `public_link_enabled = 1` or user belongs to tenant
- **Draft Tests**: Only accessible to client admins of the tenant
- **Scheduled Tests**: Time window enforcement at attempt creation
- **Guest Tests**: Requires valid share code and `allow_guests = 1`

### Insecure Direct Object Reference (IDOR) Mitigation

#### Resource Ownership Verification
- **User Resources**: Profiles, attempts, answers verified against user ID
- **Tenant Resources**: Tests, questions, folders verified against tenant ID
- **Guest Resources**: Attempts require matching `attempt_token`
- **Admin Resources**: Client admins limited to their tenant's resources

#### Secure Resource Access Patterns
1. **Always Verify Ownership**: Never trust client-provided IDs without validation
2. **Join-Based Verification**: Use SQL joins to verify relationships
3. **Middleware Protection**: Role-based middleware for admin endpoints
4. **Guest Token Requirement**: `attempt_token` required for all guest operations

## Rate Limiting & Abuse Prevention

### Rate Limiting Configuration
```typescript
// Global limiter: 1000 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// Strict limiter: 100 requests per minute for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
```

### Protected Endpoints
- **Global Protection**: All `/api/*` routes (1000/15min)
- **Strict Protection**:
  - `/api/create-user` (user registration)
  - `/api/attempts` (attempt creation)
  - `/api/attempt-answers` (answer saving)
  - `/api/proctoring/events` (proctoring events)
  - `/api/rpc/submit-attempt` (exam submission)

### Bypass Controls
- **Environment Variable**: `DISABLE_RATE_LIMITER=true` for load testing only
- **Production Default**: Rate limiting always enabled in production
- **Monitoring**: Rate limit hits logged for security analysis

## Proctoring System

### Event Types & Severity Scoring

| Event Type | Severity | Score | Evidence Required | Description |
|------------|----------|-------|-------------------|-------------|
| `TAB_SWITCH` | LOW | 1 | No | Candidate switched browser tabs |
| `WINDOW_BLUR` | LOW | 1 | No | Browser window lost focus |
| `FULLSCREEN_EXIT` | MEDIUM | 2 | No | Fullscreen mode exited |
| `NO_FACE` | MEDIUM | 3 | Yes | No face detected in camera |
| `MULTIPLE_FACES` | HIGH | 5 | Yes | Multiple faces detected |
| `CAMERA_DISCONNECTED` | HIGH | 5 | Yes | Camera disconnected during exam |
| `CAMERA_PERMISSION_DENIED` | HIGH | 5 | No | Camera permission denied |

### Proctoring Implementation

#### Client-Side Detection
- **Fullscreen Monitoring**: `fullscreenchange` events
- **Visibility Tracking**: `visibilitychange` and `blur` events
- **Camera Analysis**: TensorFlow.js for face detection
- **Event Deduplication**: 30-second window to prevent spam

#### Server-Side Processing
- **Event Storage**: All events logged in `proctoring_events` table
- **Evidence Handling**: Base64 images stored in Firebase Storage
- **Risk Scoring**: Cumulative score per attempt
- **Auto-Submit**: 3 strikes (15+ score) triggers auto-submission

#### Evidence Management
- **Image Capture**: Canvas rendering of video stream
- **Compression**: Base64 encoding with quality reduction
- **Storage**: Firebase Storage with organized folder structure
- **Access Control**: Signed URLs with 15-minute expiry
- **Retention Policy**: Evidence preserved with attempt records

### Proctoring Feature Gating
- **Basic Proctoring**: Tab/window/fullscreen events (requires `advanced_proctoring` feature)
- **Camera Proctoring**: Face detection and camera events (requires `camera_proctoring` feature)
- **Plan Enforcement**: Features enabled based on subscription or Pay Per Test package

## Timer Enforcement & Auto-Submission

### Exam Timer System
- **Test-Level Timer**: Overall exam duration in minutes
- **Section-Level Timer**: Optional per-section timers override test timer
- **Client-Side Countdown**: Real-time countdown with UI updates
- **Server-Side Validation**: Timer validation on submission

### Auto-Submission Triggers
1. **Timer Expiry**: When countdown reaches 0
2. **Proctoring Violations**: 3 security strikes (15+ risk score)
3. **Network Issues**: Prolonged disconnection detection
4. **Browser Closure**: Beforeunload handler with attempt preservation

### Timer Integrity Measures
- **Server Time Sync**: Client time synchronized with server on exam start
- **Progress Saving**: Answers auto-saved every 2 seconds
- **Grace Period**: 30-second grace period for network issues
- **Submission Lock**: Prevents multiple submissions for same attempt

## Section Locking & Navigation Controls

### Section-Based Navigation
- **Navigation Lock**: Prevents returning to completed sections
- **Server Enforcement**: Backend validates section progression
- **Client Restriction**: UI disables navigation to locked sections
- **Timer Integration**: Section timer expiry auto-advances to next section

### Implementation Details
```typescript
// Section lock validation in attempt-answers.ts
const sectionCheck = await db.execute({
  sql: `SELECT ts.navigation_locked, ts.duration_minutes,
         (SELECT COUNT(*) FROM attempt_answers aa2 
          WHERE aa2.attempt_id = ? AND aa2.question_id IN 
          (SELECT tq.question_id FROM test_questions tq WHERE tq.section_id = ts.id)
         ) as answered_in_section
        FROM test_sections ts
        JOIN test_questions tq ON tq.section_id = ts.id
        WHERE tq.question_id = ?`,
  args: [attemptId, questionId]
});

if (sectionCheck.rows.length > 0) {
  const section = sectionCheck.rows[0];
  if (section.navigation_locked === 1 && section.answered_in_section > 0) {
    return res.status(403).json({ error: "Section navigation locked" });
  }
}
```

### Navigation Rules
1. **Forward Navigation**: Always allowed to next section
2. **Backward Navigation**: Blocked if `navigation_locked = 1`
3. **Section Completion**: Determined by answered questions count
4. **Timer-Based Progression**: Auto-advance on section timer expiry

## Question & Option Shuffling

### Shuffling Implementation

#### Question Shuffling
- **Test-Level**: All questions shuffled if `tests.shuffle = 1`
- **Section-Level**: Section-specific shuffle if `test_sections.shuffle_questions = 1`
- **Deterministic**: Seed-based shuffling for consistency
- **Client-Side**: Shuffling done in browser, mapping preserved

#### Option Shuffling
- **Per-Question**: Options A-D shuffled independently per question
- **Mapping Preservation**: Client maintains option→original mapping
- **Grading Integrity**: Selected option mapped back to original for scoring
- **Section Control**: `test_sections.shuffle_options` enables per-section

### Security Considerations
- **No Correct Answer Leakage**: Shuffling doesn't reveal correct answers
- **Consistent Experience**: Same shuffling for resume attempts
- **Audit Trail**: Original question/option order preserved in database
- **Cheating Prevention**: Different shuffling per candidate when possible

## Scoring System & Result Security

### Grading Engine
- **Server-Side Only**: All grading happens in `submit-attempt.ts` RPC
- **Question Types**: Support for MCQ, true/false, multi-select, fill blanks
- **Negative Marking**: Configurable per test and per section
- **Score Floor**: Scores cannot go below 0

### Result Visibility Controls
- **Publication Workflow**: `result_status` (`draft`/`published`) controls visibility
- **Student Access**: Requires `show_results_after_submission = 1` AND `result_status = 'published'`
- **Admin Override**: Client admins and super admins can always view results
- **Score Masking**: Scores hidden in API responses when not published

### Report Security
- **XLSX Reports**: Comprehensive performance reports with multiple sheets
- **Access Control**: Reports require ownership or admin privileges
- **Guest Access**: `attempt_token` required for guest report downloads
- **Signed URLs**: Temporary access tokens for secure downloads

## Security Limitations & Mitigations

### Known Limitations

#### 1. Client-Side Proctoring Trust
- **Limitation**: Proctoring events generated by client browser
- **Risk**: Malicious users could tamper with event detection
- **Mitigation**: 
  - Server-side event validation where possible
  - Evidence requirement for high-severity events
  - Cumulative risk scoring with auto-submit thresholds
  - Regular proctoring review by administrators

#### 2. Camera Proctoring Reliability
- **Limitation**: Dependent on candidate's hardware and environment
- **Risk**: False positives/negatives in face detection
- **Mitigation**:
  - Multiple evidence capture for high-risk events
  - Human review capability for disputed events
  - Clear candidate guidelines and system requirements
  - Grace periods for technical issues

#### 3. Network Dependency
- **Limitation**: Requires stable internet connection
- **Risk**: Disconnections could interrupt exams
- **Mitigation**:
  - Auto-save with debouncing (2-second intervals)
  - Offline answer caching with sync on reconnect
  - Grace period for temporary disconnections
  - Clear communication of network requirements

#### 4. Browser Security
- **Limitation**: Browser DevTools can potentially bypass restrictions
- **Risk**: Determined users could circumvent client-side controls
- **Mitigation**:
  - Server-side validation of all critical actions
  - Proctoring event logging with evidence
  - Regular security updates and monitoring
  - Terms of service with consequences for cheating

### Security Best Practices Implemented

#### 1. Defense in Depth
- **Authentication**: Firebase JWT validation
- **Authorization**: Role-based access control
- **Tenant Isolation**: Database-level partitioning
- **Input Validation**: Zod schemas for all inputs
- **Output Encoding**: Proper JSON serialization

#### 2. Secure Development
- **Parameterized Queries**: SQL injection prevention
- **CORS Configuration**: Restricted origins
- **Security Headers**: COOP, CORP for Firebase
- **Error Handling**: Generic error messages
- **Logging**: Structured audit logs

#### 3. Compliance Features
- **Audit Trail**: Comprehensive action logging
- **Data Retention**: Evidence preservation policies
- **Access Logs**: User activity tracking
- **Export Capabilities**: Data export for compliance
- **User Consent**: Clear terms and privacy policy

### Ongoing Security Measures

#### 1. Regular Security Reviews
- **Code Audits**: Periodic security code reviews
- **Dependency Scanning**: Regular vulnerability checks
- **Penetration Testing**: Scheduled security testing
- **Compliance Checks**: Regular compliance assessments

#### 2. Monitoring & Alerting
- **Security Logs**: Centralized security event logging
- **Anomaly Detection**: Unusual pattern detection
- **Alert System**: Real-time security alerts
- **Incident Response**: Documented response procedures

#### 3. User Education
- **Security Guidelines**: Clear security guidelines for users
- **Best Practices**: Documentation on secure usage
- **Support Channels**: Security incident reporting channels
- **Regular Updates**: Security feature announcements

## Incident Response & Recovery

### Security Incident Classification

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **Critical** | System compromise, data breach | Immediate | Unauthorized admin access, data exfiltration |
| **High** | Security bypass, integrity violation | 2 hours | Cheating detection bypass, score manipulation |
| **Medium** | Feature abuse, policy violation | 24 hours | Rate limit evasion, resource exhaustion |
| **Low** | Configuration issues, minor vulnerabilities | 7 days | Information leakage, UI security warnings |

### Response Procedures
1. **Identification**: Detect and classify security incident
2. **Containment**: Isolate affected systems and prevent spread
3. **Eradication**: Remove threat and fix vulnerabilities
4. **Recovery**: Restore normal operations with enhanced security
5. **Lessons Learned**: Document incident and improve defenses

### Data Recovery Procedures
- **Database Backups**: Daily automated Turso backups
- **Evidence Preservation**: Proctoring evidence retained with attempts
- **Audit Trail**: Complete action history for forensic analysis
- **Rollback Capability**: Point-in-time recovery from backups

## Compliance & Regulatory Considerations

### Data Protection
- **Personal Data**: Candidate names, emails, assessment results
- **Storage Locations**: GCP India region, compliant with local regulations
- **Retention Periods**: Configurable data retention policies
- **Access Controls**: Role-based access with audit logging

### Assessment Integrity
- **Exam Security**: Proctoring, timer enforcement, navigation controls
- **Result Validity**: Secure grading, score protection, audit trails
- **Cheating Prevention**: Multiple layers of security controls
- **Fairness**: Consistent testing environment for all candidates

### Accessibility & Inclusivity
- **Browser Support**: Modern browsers with accessibility features
- **Disability Accommodations**: Configurable time extensions
- **Language Support**: Unicode support for multilingual content
- **Technical Requirements**: Clear system requirements communicated

## Future Security Enhancements

### Planned Improvements
1. **Enhanced Proctoring**: AI-based behavior analysis
2. **Biometric Verification**: Facial recognition for identity verification
3. **Browser Lockdown**: Secure browser or kiosk mode
4. **Live Proctoring**: Real-time human proctoring integration
5. **Blockchain Verification**: Immutable exam result verification

### Research & Development
- **Advanced Cheating Detection**: Machine learning for anomaly detection
- **Secure Execution Environment**: Containerized exam environments
- **Zero-Trust Architecture**: Enhanced authentication and authorization
- **Quantum-Safe Cryptography**: Future-proof encryption algorithms

## Conclusion
The NS Exam Portal implements comprehensive security measures designed for high-stakes assessment environments. While no system is completely impervious to attack, the platform employs defense-in-depth strategies, regular security reviews, and ongoing improvements to maintain exam integrity and protect sensitive data.

Security is treated as an ongoing process rather than a one-time implementation, with regular updates, monitoring, and user education to address evolving threats in the online assessment landscape.