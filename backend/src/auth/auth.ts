import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Request } from "express";

// Initialize Firebase Admin once
if (!getApps().length) {
  // Try Application Default Credentials first (for GCP Cloud Run)
  try {
    initializeApp({
      credential: applicationDefault(),
    });
    console.log("Firebase Admin initialized using Application Default Credentials");
  } catch (adcError: any) {
    console.log("Application Default Credentials not available, trying manual credentials:", adcError.message);
    
    // Fallback to manual credentials (for local development)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (
      !projectId ||
      !clientEmail ||
      !privateKey ||
      !privateKey.startsWith("-----BEGIN PRIVATE KEY-----")
    ) {
      console.warn(
        "Missing or invalid Firebase Admin credentials. Auth will run in fallback JWT mode."
      );
    } else {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
      console.log("Firebase Admin initialized using manual credentials");
    }
  }
}

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Extracts and verifies the Firebase JWT from the Authorization header.
 * Returns the decoded user, or null if the token is missing/invalid.
 */
export async function getUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.log("Auth header invalid format (must start with Bearer):", authHeader);
    return null;
  }

  const token = authHeader.slice(7);
  try {
    // Try to verify with Firebase Admin SDK if configured
    if (getApps().length > 0) {
      const decoded = await getAuth().verifyIdToken(token);
      return { id: decoded.uid, email: decoded.email ?? "" };
    }
    
    // Fallback: decode JWT manually for local development
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log("Token parts length is not 3:", parts.length);
      return null;
    }
    
    let payload: any;
    try {
      payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    } catch (parseErr) {
      console.error("Failed to parse JWT payload:", parseErr);
      return null;
    }

    // Proactively check both user_id (standard Firebase) and sub (OIDC standard)
    const userId = payload.user_id || payload.sub;
    if (!userId) {
      console.log("No user_id or sub found in JWT payload. Keys present:", Object.keys(payload));
      return null;
    }
    
    return { id: userId, email: payload.email ?? "" };
  } catch (err) {
    console.error("Auth error:", err instanceof Error ? err.message : "Unknown error");
    return null;
  }
}

/**
 * Returns the user or sends a 401 response.
 * Usage: const user = await requireUser(req, res); if (!user) return;
 */
export async function requireUser(
  req: Request,
  res: { status: (n: number) => { json: (b: any) => void } }
): Promise<AuthUser | null> {
  const user = await getUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}
