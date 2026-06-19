import http from 'k6/http';
import { check, sleep, fail } from 'k6';

export const options = {
    scenarios: {
        guest_flow: {
            executor: 'per-vu-iterations',
            vus: 200,
            iterations: 1,
            maxDuration: '2m',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'], // less than 1% errors
        http_req_duration: ['p(95)<3000'], // 95% of requests must complete below 3s
    },
};

const BASE_URL = 'https://exam-portal-api-479112457276.asia-south1.run.app';
const FIREBASE_API_KEY = 'AIzaSyDeCd6Ek_fzMwxDGvwXjYxLdgvuYwghjj8';
const SHARE_CODE = '04E53B49';
const TEST_ID = 'ddb607e2-7fd0-41f5-b2f0-303853e09d6e';
const CLIENT_ID = '8ebacddb-d703-4c17-b368-a85c52827943';

// Helper to get random item from array
function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to generate a random delay between min and max seconds
function randomDelay(min, max) {
    return Math.random() * (max - min) + min;
}

let cachedIdToken = null;
let cachedFirebaseUid = null;

export default function () {
    const vuId = __VU;
    const iterId = __ITER;

    // --- STEP 0: Firebase Anonymous Authentication (Staggered to prevent rate limit spikes) ---
    if (!cachedIdToken) {
        // Sleep dynamically on startup (0.1s to 3.5s) to stagger the concurrent signup calls to Firebase Auth
        sleep(randomDelay(0.1, 3.5));

        const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
        const authPayload = JSON.stringify({ returnSecureToken: true });
        const authParams = {
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://test.nssoftwaresolutions.in' // Satisfies HTTP Referrer key restrictions
            },
        };

        const authRes = http.post(authUrl, authPayload, authParams);

        const authCheck = check(authRes, {
            'auth status is 200': (r) => r.status === 200,
            'auth token exists': (r) => {
                try {
                    return !!r.json('idToken');
                } catch (e) {
                    return false;
                }
            },
        });

        if (!authCheck) {
            console.log(`[VU ${vuId}] Firebase Anonymous Auth Failed! Status: ${authRes.status}, Response: ${authRes.body}`);
            fail(`[VU ${vuId}] Firebase authentication failed! Status: ${authRes.status}`);
        }

        cachedIdToken = authRes.json('idToken');
        cachedFirebaseUid = authRes.json('localId');
    }

    const idToken = cachedIdToken;
    const firebaseUid = cachedFirebaseUid;

    const authorizedHeaders = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
    };

    sleep(randomDelay(0.5, 1.5)); // Real-user delay before looking up code

    // --- STEP 1: Look up test by share code ---
    const testUrl = `${BASE_URL}/api/tests?share_code=${SHARE_CODE}`;
    const testRes = http.get(testUrl);

    const testCheck = check(testRes, {
        'share_code lookup is 200': (r) => r.status === 200,
    });

    if (!testCheck) {
        console.log(`[VU ${vuId}] Share Code Lookup Failed! Endpoint: ${testUrl}, Status: ${testRes.status}, Body: ${testRes.body}`);
    }

    sleep(randomDelay(1, 2.5)); // Time taken to view metadata and type name

    // --- STEP 2: Create Guest Profile ---
    const profileUrl = `${BASE_URL}/api/profiles`;
    const profilePayload = JSON.stringify({
        id: firebaseUid,
        name: `GUEST: Candidate_${vuId}_${iterId}`,
        email: `guest_${firebaseUid.substring(0, 10)}_${vuId}@temp.exam`,
        client_id: CLIENT_ID,
    });

    const profileRes = http.post(profileUrl, profilePayload, authorizedHeaders);

    const profileCheck = check(profileRes, {
        'profile sync status is 200': (r) => r.status === 200,
    });

    if (!profileCheck) {
        console.log(`[VU ${vuId}] Profile Sync Failed! Endpoint: ${profileUrl}, Status: ${profileRes.status}, Body: ${profileRes.body}`);
        fail(`[VU ${vuId}] Profile creation failed! Status: ${profileRes.status}`);
    }

    sleep(randomDelay(1, 2.5)); // Readying to start attempt

    // --- STEP 3: Create Attempt ---
    const attemptUrl = `${BASE_URL}/api/attempts`;
    const attemptPayload = JSON.stringify({
        student_id: firebaseUid,
        test_id: TEST_ID,
        status: 'in_progress',
    });

    const attemptRes = http.post(attemptUrl, attemptPayload, authorizedHeaders);

    const attemptCheck = check(attemptRes, {
        'attempt status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'attempt id exists': (r) => {
            try {
                return !!r.json('id');
            } catch (e) {
                return false;
            }
        },
    });

    if (!attemptCheck) {
        console.log(`[VU ${vuId}] Attempt Creation Failed! Endpoint: ${attemptUrl}, Status: ${attemptRes.status}, Body: ${attemptRes.body}`);
        fail(`[VU ${vuId}] Attempt creation failed! Status: ${attemptRes.status}`);
    }

    const attemptId = attemptRes.json('id');

    sleep(randomDelay(0.5, 1.5)); // Brief transition to engine screen

    // --- STEP 4: Fetch Test Questions ---
    const questionsUrl = `${BASE_URL}/api/test-questions?test_id=${TEST_ID}`;
    const questionsRes = http.get(questionsUrl, authorizedHeaders);

    const questionsCheck = check(questionsRes, {
        'fetch questions is 200': (r) => r.status === 200,
        'questions exist': (r) => {
            try {
                return r.json().length > 0;
            } catch (e) {
                return false;
            }
        },
    });

    if (!questionsCheck) {
        console.log(`[VU ${vuId}] Fetch Questions Failed! Endpoint: ${questionsUrl}, Status: ${questionsRes.status}, Body: ${questionsRes.body}`);
        fail(`[VU ${vuId}] Failed to retrieve test questions! Status: ${questionsRes.status}`);
    }

    // Parse question IDs from response
    const questionsList = questionsRes.json();
    const questionIds = questionsList.map((item) => item.questions.id);

    sleep(randomDelay(2, 5)); // User reading instructions

    // --- STEP 5: Save Answers for 10 Questions ---
    const targetAnswersCount = 10;
    const optionsList = ['A', 'B', 'C', 'D'];

    for (let i = 0; i < targetAnswersCount; i++) {
        const qId = questionIds[i % questionIds.length];
        const selectedOption = getRandomElement(optionsList);

        const saveUrl = `${BASE_URL}/api/attempt-answers`;
        const savePayload = JSON.stringify([
            {
                attempt_id: attemptId,
                question_id: qId,
                selected_option: selectedOption,
                marked_for_review: false,
            }
        ]);

        const saveRes = http.post(saveUrl, savePayload, authorizedHeaders);

        const ok = check(saveRes, {
            'save answer status is 200': (r) => r.status === 200,
        });

        if (!ok) {
            console.log(`[VU ${vuId}] Save Answer Failed! Endpoint: ${saveUrl}, Status: ${saveRes.status}, Body: ${saveRes.body}`);
        }

        // Think-time delay of 1 to 3 seconds between answering questions
        sleep(randomDelay(1.0, 3.0));
    }

    sleep(randomDelay(1.5, 4)); // Reviewing answers before final submission

    // --- STEP 6: Submit Exam Attempt ---
    const submitUrl = `${BASE_URL}/api/rpc/submit-attempt`;
    const submitPayload = JSON.stringify({
        attempt_id: attemptId,
        time_taken: 600, // Simulated 10 minutes taken
    });

    const submitRes = http.post(submitUrl, submitPayload, authorizedHeaders);

    const submitCheck = check(submitRes, {
        'submit status is 200': (r) => r.status === 200,
        'submit results validated': (r) => {
            try {
                return r.json('score') !== undefined;
            } catch (e) {
                return false;
            }
        },
    });

    if (!submitCheck) {
        console.log(`[VU ${vuId}] Submission Failed! Endpoint: ${submitUrl}, Attempt ID: ${attemptId}, Status: ${submitRes.status}, Body: ${submitRes.body}`);
        fail(`[VU ${vuId}] Submission failed! Status: ${submitRes.status}`);
    }
}