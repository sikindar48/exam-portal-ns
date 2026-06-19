currently we provide basic procturing like tab switching, copy pasting, right click etc

also im planning to integrate image producting capturing images for 2-3 seconds ( not storing it...just check Implement a lightweight Camera Proctoring System for the NS Exam Portal.

Requirements:

1. Test Settings

* Add a new boolean field:
    * camera_required (default false)
* Show toggle in Test Settings UI.
* If enabled, candidates must grant webcam permission before starting the exam.
* Block exam start if permission is denied.

2. Frontend Proctoring Engine

Create a reusable ProctoringService.

Checks every 2-3 seconds:

A. Face Presence Detection

* Detect whether a face exists in the webcam stream.
* If no face is detected continuously for more than 5 seconds:
    * Create a violation event: NO_FACE

B. Multiple Face Detection

* Detect number of faces.
* If more than one face is detected:
    * Create violation event: MULTIPLE_FACES

C. Looking Away Detection

* Use head pose / face landmarks.
* If face is turned away for more than 5 seconds:
    * Create violation event: LOOKING_AWAY

Use MediaPipe Face Detection / Face Mesh entirely in the browser.

No server-side AI processing.
No video uploads.
No continuous image uploads.

3. Evidence Capture

Only when a violation occurs:

* Capture webcam image.
* Resize to 320x240.
* Compress as JPEG.
* Target size under 50KB.

Do NOT upload normal monitoring screenshots.

Upload images only for violations.

4. Storage

Use Google Cloud Storage.

Bucket Structure:

proctoring/
test_id/
attempt_id/
timestamp.jpg

Store:

* violation image
* timestamp
* attempt_id
* test_id

5. Database

Create table:

proctoring_events

Columns:

* id
* attempt_id
* test_id
* event_type
* image_url
* duration_seconds
* created_at

Supported event types:

* NO_FACE
* MULTIPLE_FACES
* LOOKING_AWAY
* FULLSCREEN_EXIT
* TAB_SWITCH
* WINDOW_BLUR

6. Backend API

Create endpoint:

POST /api/proctoring/events

Payload:

{
attempt_id,
test_id,
event_type,
image_url,
duration_seconds
}

Validate ownership and active attempt.

7. Admin Dashboard

Add Proctoring tab inside Attempt Details.

Display:

* Total Violations
* Violation Timeline
* Violation Images
* Event Type
* Timestamp
* Duration

8. Performance Requirements

* Detection interval: 2-3 seconds
* No continuous uploads
* No video storage
* No face recognition
* No biometric identity matching
* No eye tracking

System must be optimized for low bandwidth and low storage cost.

9. Security

* Camera access only during active exams.
* Stop webcam immediately after submission.
* Signed URLs for viewing violation images.
* Private GCS bucket.

Expected Result:

Admins can review evidence of cheating-related events while keeping infrastructure costs extremely low by storing only violation snapshots instead of continuous recordings. like this ) ,