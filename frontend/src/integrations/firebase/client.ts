import { initializeApp, getApps } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Log env vars for debugging (remove in production)
console.log("Firebase Config Check:", {
  apiKey: firebaseConfig.apiKey ? "✓" : "✗",
  authDomain: firebaseConfig.authDomain ? "✓" : "✗",
  projectId: firebaseConfig.projectId ? "✓" : "✗",
});

if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.projectId
) {
  console.error("Missing Firebase environment variables");
  throw new Error(
    "Missing Firebase environment variables. Ensure VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID are set."
  );
}

let auth: any = null;

try {
  // Prevent duplicate initialization during hot-reload
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);

  // Set persistence to local so user stays logged in after page refresh
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Failed to set auth persistence:", error);
  });
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { auth };
