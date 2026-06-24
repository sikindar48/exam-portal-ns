# NS Exam Portal - Features & User Flows

## Overview
This document outlines all features and user workflows in the NS Exam Portal, covering Super Admin, Client Admin, Student, and Guest User roles with detailed flow diagrams and implementation specifics.

## Role-Based Feature Matrix

### Super Admin Features
| Feature | Description | Implementation Status |
|---------|-------------|----------------------|
| **Platform Dashboard** | Overview of all clients, subscriptions, live activity | ✅ Fully Implemented |
| **Client Management** | Create, edit, suspend client organizations | ✅ Fully Implemented |
| **Subscription Administration** | Assign plans, manage expiry, track history | ✅ Fully Implemented |
| **Package Approval** | Approve/reject Pay Per Test package requests | ✅ Fully Implemented |
| **Audit Logs** | View all platform actions with filters | ✅ Fully Implemented |
| **Platform Settings** | Maintenance mode, announcements, registration controls | ✅ Fully Implemented |
| **Security Controls** | Client suspension, password reset, access management | ✅ Fully Implemented |
| **Billing Management** | Track package purchases, revenue reporting | ✅ Fully Implemented |
| **Live Monitoring** | Concurrent users, API performance, system health | ✅ Fully Implemented |

### Client Admin Features
| Feature | Description | Implementation Status |
|---------|-------------|----------------------|
| **Organization Dashboard** | Tenant-specific metrics and analytics | ✅ Fully Implemented |
| **Test Management** | Create, edit, publish, schedule, clone tests | ✅ Fully Implemented |
| **Question Bank** | Create, import, organize questions in folders | ✅ Fully Implemented |
| **Student Roster** | Manage student accounts, bulk import | ✅ Fully Implemented |
| **Analytics & Reports** | Performance metrics, XLSX report generation | ✅ Fully Implemented |
| **Subscription Management** | View current plan, request upgrades | ✅ Fully Implemented |
| **Package Selection** | Choose Pay Per Test packages for assessments | ✅ Fully Implemented |
| **Branding Controls** | Upload organization logo, customize appearance | ✅ Fully Implemented |
| **Proctoring Settings** | Configure proctoring based on plan features | ✅ Fully Implemented |

### Student Features
| Feature | Description | Implementation Status |
|---------|-------------|----------------------|
| **Student Dashboard** | View available and completed tests | ✅ Fully Implemented |
| **Exam Taking** | Complete assessments with timer and navigation | ✅ Fully Implemented |
| **Answer Management** | Select answers, mark for review, auto-save | ✅ Fully Implemented |
| **Result Review** | View scores and performance reports | ✅ Fully Implemented |
| **Attempt History** | Review past attempts and performance trends | ✅ Fully Implemented |
| **Report Download** | Download detailed XLSX performance reports | ✅ Fully Implemented |
| **Profile Management** | Update personal information | ✅ Fully Implemented |

### Guest User Features
| Feature | Description | Implementation Status |
|---------|-------------|----------------------|
| **Share Code Entry** | Enter 8-character code to join test | ✅ Fully Implemented |
| **Anonymous Authentication** | Temporary account creation without registration | ✅ Fully Implemented |
| **Exam Taking** | Complete assessment with full feature set | ✅ Fully Implemented |
| **Result Access** | View scores if enabled by test settings | ✅ Fully Implemented |
| **Report Download** | Download reports with secure token access | ✅ Fully Implemented |

## Detailed User Flows

### Super Admin Workflow

#### 1. Client Onboarding Flow
```mermaid
sequenceDiagram
    participant SA as Super Admin
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database
    
    SA->>FE: Navigate to Clients page
    FE->>BE: GET /api/clients
    BE->>DB: Query all clients
    DB-->>BE: Return client list
    BE-->>FE: Client data with subscription status
    FE-->>SA: Display client table
    
    SA->>FE: Click "Add New Client"
    FE-->>SA: Show client creation form
    SA->>FE: Enter client details + plan selection
    FE->>BE: POST /api/clients
    BE->>DB: Create client record
    BE->>DB: Create client_subscription record
    BE->>DB: Create client_limits record
    DB-->>BE: Success confirmation
    BE-->>FE: 201 Created with client ID
    FE-->>SA: Success message, redirect to client settings
```

#### 2. Subscription Management Flow
```mermaid
sequenceDiagram
    participant SA as Super Admin
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database
    
    SA->>FE: Navigate to Subscriptions page
    FE->>BE: GET /api/superadmin/subscriptions
    BE->>DB: Query all client subscriptions
    BE->>DB: Check expiry dates (lazy expiry check)
    DB-->>BE: Subscription data with updated status
    BE-->>FE: Subscription list with expiry alerts
    FE-->>SA: Display subscription dashboard
    
    SA->>FE: Click "Change Plan" on client
    FE-->>SA: Show plan selection modal
    SA->>FE: Select new plan, set expiry date
    FE->>BE: PUT /api/superadmin/subscriptions/:client_id
    BE->>DB: Update client_subscription
    BE->>DB: Log to subscription_history
    BE->>DB: Update client_limits if needed
    DB-->>BE: Success confirmation
    BE-->>FE: 200 OK with updated subscription
    FE-->>SA: Success message, refresh view
```

#### 3. Package Approval Flow
```mermaid
sequenceDiagram
    participant CA as Client Admin
    participant SA as Super Admin
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database
    
    CA->>FE: Request Pay Per Test package
    FE->>BE: POST /api/packages/request
    BE->>DB: Create client_test_purchases (status: requested)
    DB-->>BE: Success
    BE-->>FE: 201 Created
    
    SA->>FE: Navigate to Package Requests page
    FE->>BE: GET /api/packages/requests
    BE->>DB: Query requested purchases
    DB-->>BE: Request list with client details
    BE-->>FE: Package request dashboard
    FE-->>SA: Display pending requests
    
    SA->>FE: Click "Approve" on request
    FE-->>SA: Show approval modal (option to customize limits)
    SA->>FE: Set custom limits if needed, confirm approval
    FE->>BE: PUT /api/packages/requests/:id/approve
    BE->>DB: Update client_test_purchases (status: available)
    BE->>DB: Set custom limits if provided
    DB-->>BE: Success
    BE-->>FE: 200 OK
    FE-->>SA: Success message, request removed from pending
```

### Client Admin Workflow

#### 1. Test Creation Flow
```mermaid
sequenceDiagram
    participant CA as Client Admin
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database
    
    CA->>FE: Navigate to Tests page
    FE->>BE: GET /api/tests?client_id=...
    BE->>DB: Query tenant's tests
    DB-->>BE: Test list
    BE-->>FE: Tests with folder organization
    FE-->>CA: Display test dashboard
    
    CA->>FE: Click "Create New Test"
    FE-->>CA: Show test creation wizard
    
    alt Using Pay Per Test Package
        CA->>FE: Select "Use Pay Per Test Package"
        FE->>BE: GET /api/packages/available
        BE->>DB: Query available purchases
        DB-->>BE: Available packages
        BE-->>FE: Package selection options
        FE-->>CA: Show package selection
        CA->>FE: Select package, proceed
    else Using Subscription
        CA->>FE: Select "Use Subscription"
        FE->>BE: Validate subscription limits
        BE-->>FE: Limit validation
    end
    
    CA->>FE: Configure test settings (name, timer, etc.)
    FE->>BE: POST /api/tests
    BE->>DB: Create test record
    BE->>DB: Validate limits (subscription or package)
    alt Pay Per Test
        BE->>DB: Create test_billing record
        BE->>DB: Update client_test_purchases (status: used)
    end
    DB-->>BE: Success
    BE-->>FE: 201 Created with test ID
    FE-->>CA: Redirect to Test Builder
```

#### 2. Question Bank Management Flow
```mermaid
sequenceDiagram
    participant CA as Client Admin
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database
    
    CA->>FE: Navigate to Questions page
    FE->>BE: GET /api/questions?client_id=...
    BE->>DB: Query tenant's questions
    DB-->>BE: Question list with folders
    BE-->>FE: Question bank interface
    FE-->>CA: Display question dashboard
    
    CA->>FE: Click "Import Questions"
    FE-->>CA: Show CSV import modal
    
    CA->>FE: Upload CSV file
    FE->>FE: Client-side CSV validation
    FE->>BE: POST /api/questions/import (with batch validation)
    BE->>BE: Server-side validation (syntax + business rules)
    BE-->>FE: Validation results with errors/warnings
    
    CA->>FE: Review validation, confirm import
    FE->>BE: POST /api/questions/import/confirm
    BE->>DB: Batch insert questions (chunked for performance)
    BE->>DB: Create question_import_logs record
    DB-->>BE: Success with import statistics
    BE-->>FE: 201 Created with import summary
    FE-->>CA: Success message, refresh question list
```

#### 3. Student Management Flow
```mermaid
sequenceDiagram
    participant CA as Client Admin
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database
    participant FB as Firebase Auth
    
    CA->>FE: Navigate to Students page
    FE->>BE: GET /api/profiles?client_id=...
    BE->>DB: Query tenant's student profiles
    DB-->>BE: Student list
    BE-->>FE: Student roster
    FE-->>CA: Display student dashboard
    
    CA->>FE: Click "Add Students"
    FE-->>CA: Show student addition options
    
    alt Single Student
        CA->>FE: Enter student details manually
        FE->>BE: POST /api/create-user
        BE->>FB: Create Firebase user account
        FB-->>BE: Firebase UID
        BE->>DB: Create profile record
        BE->>DB: Create user_roles record (student)
        DB-->>BE: Success
        BE-->>FE: 201 Created
    else Bulk Import
        CA->>FE: Upload CSV with students
        FE->>FE: Parse CSV client-side
        loop For each student
            FE->>BE: POST /api/create-user
            BE->>FB: Create Firebase account
            BE->>DB: Create profile + role
        end
        BE-->>FE: Bulk import summary
    end
    
    FE-->>CA: Success message, refresh student list
```

### Student Workflow

#### 1. Exam Taking Flow (Registered Student)
```mermaid
sequenceDiagram
    participant S as Student
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database
    
    S->>FE: Log in to Student Dashboard
    FE->>BE: GET /api/tests?client_id=...
    BE->>DB: Query published, active tests for tenant
    DB-->>BE: Available tests list
    BE-->>FE: Tests with attempt status
    FE-->>S: Display available tests
    
    S->>FE: Click "Start Test" on available test
    FE->>BE: POST /api/attempts
    BE->>DB: Validate test status (published, active, schedule)
    BE->>DB: Check attempts_allowed limit
    BE->>DB: Create attempt record (status: in_progress)
    DB-->>BE: Attempt ID
    BE-->>FE: 201 Created with attempt details
    FE-->>S: Redirect to Test Engine
    
    S->>FE: Answer questions (auto-save every 2s)
    FE->>BE: POST /api/attempt-answers (debounced)
    BE->>DB: Upsert attempt_answers
    DB-->>BE: Success
    BE-->>FE: 200 OK
    
    S->>FE: Click "Submit Exam"
    FE->>BE: POST /api/rpc/submit-attempt
    BE->>DB: Grade answers, calculate score
    BE->>DB: Update attempt (status: submitted, score, time)
    DB-->>BE: Grading results
    BE-->>FE: 200 OK with score (if results published)
    FE-->>S: Display submission success page
```

#### 2. Result Review Flow
```mermaid
sequenceDiagram
    participant S as Student
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database
    
    S->>FE: Navigate to History/Results page
    FE->>BE: GET /api/attempts?student_id=...
    BE->>DB: Query student's attempts
    DB-->>BE: Attempt list with test details
    BE-->>FE: Attempt history with scores (if published)
    FE-->>S: Display attempt history
    
    alt Results Published
        S->>FE: Click "View Details" on attempt
        FE->>BE: GET /api/attempts/:id
        BE->>DB: Query attempt details
        BE->>DB: Verify result_status = published
        DB-->>BE: Attempt with score details
        BE-->>FE: Detailed results
        FE-->>S: Display score breakdown
        
        S->>FE: Click "Download Report"
        FE->>BE: GET /api/attempts/:id/report
        BE->>BE: Generate XLSX report
        BE-->>FE: XLSX file download
        FE-->>S: Download performance report
    else Results Not Published
        S->>FE: Click "View Details"
        FE->>BE: GET /api/attempts/:id
        BE->>DB: Query attempt
        BE->>DB: Mask score (result_status = draft)
        DB-->>BE: Attempt without score
        BE-->>FE: Attempt details (score: null)
        FE-->>S: Display "Results pending" message
    end
```

### Guest User Workflow

#### 1. Guest Exam Join Flow
```mermaid
sequenceDiagram
    participant G as Guest Candidate
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database
    participant FB as Firebase Auth
    
    G->>FE: Access public join page (/test/join)
    FE-->>G: Display share code entry form
    
    G->>FE: Enter 8-character share code
    FE->>BE: GET /api/tests?share_code=XXXXXX
    BE->>DB: Query test by share_code
    BE->>DB: Validate test (published, active, allow_guests=1, schedule)
    DB-->>BE: Test details
    BE-->>FE: Test information (without sensitive data)
    FE-->>G: Display test details, prompt for name
    
    G->>FE: Enter name, click "Start Exam"
    FE->>FB: Firebase anonymous signup
    FB-->>FE: Firebase ID token + UID
    FE->>BE: POST /api/profiles (sync guest profile)
    BE->>DB: Create/update guest profile
    DB-->>BE: Success
    FE->>BE: POST /api/attempts (create guest attempt)
    BE->>DB: Create attempt with attempt_token
    DB-->>BE: Attempt ID with token
    BE-->>FE: 201 Created
    FE-->>G: Redirect to Test Engine with attempt_token
```

#### 2. Guest Exam Security Flow
```mermaid
sequenceDiagram
    participant G as Guest Candidate
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database
    
    Note over G,DB: Guest attempt in progress
    
    G->>FE: Select answer
    FE->>BE: POST /api/attempt-answers
    Note right of FE: Headers include attempt_token
    BE->>DB: Verify attempt_token matches attempt
    DB-->>BE: Token validation result
    BE->>DB: Save answer
    DB-->>BE: Success
    BE-->>FE: 200 OK
    
    G->>FE: Switch browser tab
    FE->>FE: Detect tab switch event
    FE->>BE: POST /api/proctoring/events
    Note right of FE: Headers include attempt_token
    BE->>DB: Verify attempt_token
    BE->>DB: Log proctoring event (TAB_SWITCH)
    DB-->>BE: Success
    BE-->>FE: 200 OK
    
    G->>FE: Submit exam
    FE->>BE: POST /api/rpc/submit-attempt
    Note right of FE: Headers include attempt_token
    BE->>DB: Verify attempt_token
    BE->>DB: Grade attempt, calculate score
    DB-->>BE: Grading results
    BE-->>FE: 200 OK with score (if results published)
    FE-->>G: Display submission page with results
```

## Feature Implementation Details

### Test Builder Features

#### Section-Based Configuration
- **Multiple Sections**: Tests can have unlimited sections
- **Per-Section Settings**:
  - Custom duration timer (overrides test timer)
  - Negative marks override
  - Question shuffling (within section)
  - Option shuffling (within section)
  - Navigation locking (prevent return)
- **Visual Builder**: Drag-and-drop style section management
- **Question Palette**: Visual question selection and ordering

#### Question Types Support
1. **MCQ (Multiple Choice)**: Single correct answer (A-D)
2. **True/False**: Binary choice with A=True, B=False
3. **Multi-Select**: Multiple correct answers (A|B|D format)
4. **Fill in Blank**: Text input with case sensitivity option
5. **Subjective**: Essay/long answer questions
6. **Coding**: Programming questions (future enhancement)

#### Advanced Settings
- **Scheduling**: Start/end dates with timezone support
- **Attempt Limits**: Configurable attempts per student (0 = unlimited)
- **Guest Access**: Toggle guest participation
- **Result Controls**: When to show scores and allow downloads
- **Proctoring Requirements**: Camera requirement flags
- **Branding**: Organization logo display in exam

### Proctoring Implementation

#### Client-Side Detection
```javascript
// Example proctoring event detection
const proctoringEvents = {
  detectTabSwitch: () => {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        logProctoringEvent('TAB_SWITCH', { duration: 1 });
      }
    });
  },
  
  detectFullscreenExit: () => {
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        logProctoringEvent('FULLSCREEN_EXIT', {});
      }
    });
  },
  
  detectCameraEvents: async (videoElement) => {
    // TensorFlow.js face detection
    const faces = await faceDetection.detect(videoElement);
    if (faces.length === 0) {
      logProctoringEvent('NO_FACE', { evidence: captureFrame(videoElement) });
    } else if (faces.length > 1) {
      logProctoringEvent('MULTIPLE_FACES', { evidence: captureFrame(videoElement) });
    }
  }
};
```

#### Server-Side Processing
- **Event Deduplication**: 30-second window for same event types
- **Risk Scoring**: Cumulative score with severity weights
- **Evidence Storage**: Base64 images → Firebase Storage
- **Auto-Submit Logic**: 15+ risk score triggers submission
- **Review Interface**: Admin dashboard for proctoring review

### Subscription & Billing Features

#### Plan Enforcement Logic
```typescript
// Example from billing.ts service
async function validateQuestionLimit(testId: string, proposedCount: number): Promise<boolean> {
  // 1. Check Pay Per Test package limits first
  const billingCheck = await db.execute({
    sql: "SELECT max_questions FROM test_billing WHERE test_id = ? LIMIT 1",
    args: [testId]
  });

  if (billingCheck.rows.length > 0) {
    const maxQs = Number(billingCheck.rows[0].max_questions);
    return proposedCount <= maxQs;
  }

  // 2. Fall back to subscription limits
  const testInfo = await db.execute({
    sql: "SELECT client_id FROM tests WHERE id = ? LIMIT 1",
    args: [testId]
  });
  if (testInfo.rows.length === 0) return true;

  const clientId = String(testInfo.rows[0].client_id);
  const plan = await getEffectivePlan(clientId);

  if (plan.max_questions_per_exam === -1) return true;
  return proposedCount <= plan.max_questions_per_exam;
}
```

#### Feature Flag System
- **Plan-Based Features**: Determined by subscription tier
- **Package-Based Features**: Determined by Pay Per Test package
- **Client Overrides**: Manual feature enable/disable per client
- **Route-Level Enforcement**: Feature checks in API routes
- **UI Gating**: Features hidden/disabled based on availability

### Analytics & Reporting

#### Dashboard Metrics
- **Super Admin**:
  - Total clients, students, questions, tests, attempts
  - Subscription plan distribution
  - Expiring soon alerts
  - Today's exam activity
  - Live load metrics (users, RPS, CPU, memory, latency)
  - Top organizations by student count

- **Client Admin**:
  - Student/question/test counts
  - Average score and pass rate
  - Top 5 performers
  - Per-test performance breakdown
  - Monthly usage vs limits

#### XLSX Report Structure
1. **Summary Sheet**:
   - Candidate details (name, email, test, date)
   - Overall score and percentage
   - Time taken vs allocated
   - Section-wise performance

2. **Detailed Questions Sheet**:
   - Question number and text
   - Options A-D
   - Chosen answer vs correct answer
   - Status (Correct/Wrong/Skipped)
   - Marks awarded
   - Explanation (if provided)

3. **Analytics Sheet**:
   - Performance graphs and charts
   - Average time per question
   - Correct answer ratio by section
   - Difficulty analysis
   - Recommendations for improvement

## Integration Points

### Firebase Integration
- **Authentication**: Email/password + anonymous auth
- **Storage**: Proctoring evidence images
- **Security**: JWT token validation
- **User Management**: Profile synchronization

### Turso Database
- **Multi-Tenant Schema**: Client-based partitioning
- **Performance Indexes**: Optimized query patterns
- **Migrations**: Runtime schema evolution
- **Backups**: Automated daily backups

### Cloudflare Pages
- **Edge Distribution**: Global CDN for frontend
- **Custom Domain**: `test.nssoftwaresolutions.in`
- **Build Optimization**: Vite production builds
- **Environment Variables**: Build-time configuration

### GCP Cloud Run
- **Containerization**: Docker-based deployment
- **Auto-scaling**: Based on request load
- **Health Checks**: Automatic monitoring
- **Logging**: Structured application logs

## Future Feature Roadmap

### Short-Term (Next Release)
1. **Email Notifications**: Test assignments, subscription updates
2. **Enhanced Proctoring**: Server-side camera validation
3. **Payment Integration**: Stripe/Razorpay for automated billing
4. **Advanced Analytics**: Predictive insights and recommendations
5. **Mobile App**: Native mobile application for students

### Medium-Term (6-12 Months)
1. **Live Proctoring**: Human proctor integration
2. **Coding Sandbox**: Programming assessment environment
3. **AI Question Generation**: Automated question creation
4. **LMS Integration**: Moodle, Canvas, Blackboard compatibility
5. **Internationalization**: Multi-language support

### Long-Term (12+ Months)
1. **Blockchain Certificates**: Immutable result verification
2. **AR/VR Assessments**: Immersive testing environments
3. **Predictive Cheating Detection**: AI-based anomaly detection
4. **Global Deployment**: Regional compliance and performance
5. **Enterprise Scalability**: Million+ concurrent user support

## Support & Troubleshooting

### Common User Issues
1. **Share Code Not Working**: Verify test is published, active, and allows guests
2. **Timer Issues**: Check browser time synchronization
3. **Submission Problems**: Ensure network connectivity, try resume option
4. **Score Not Showing**: Results may not be published by administrator
5. **Proctoring False Positives**: Review evidence, contact support if needed

### Administrator Issues
1. **Test Creation Blocked**: Check subscription limits or package availability
2. **Student Import Errors**: Verify CSV format and required columns
3. **Analytics Delays**: Data processing may take time for large datasets
4. **Subscription Expiry**: Manual renewal required for expired plans
5. **Package Capacity**: Purchase additional packages for more tests

### Technical Support
- **Email**: info.nssoftwaresolutions@gmail.com
- **Documentation**: [docs.nssoftwaresolutions.in/exam-portal](https://docs.nssoftwaresolutions.in/exam-portal)
- **Issue Tracking**: GitHub repository issues
- **Emergency Support**: Priority support for enterprise clients

## Conclusion
The NS Exam Portal provides comprehensive assessment management with robust security, flexible subscription models, and detailed analytics. The platform supports multiple user roles with tailored workflows and continues to evolve based on user feedback and technological advancements.