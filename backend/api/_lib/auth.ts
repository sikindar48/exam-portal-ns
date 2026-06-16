import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Request } from "express";

// Initialize Firebase Admin once
if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "Missing Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  } else {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
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
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return { id: decoded.uid, email: decoded.email ?? "" };
  } catch {
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
