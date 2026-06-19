import type { Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole, getUserClientId } from "../services/roles.js";

/**
 * POST /api/create-user
 * Uses Firebase Admin to create the auth user,
 * then stores profile + role in Turso.
 */
export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const caller = await requireUser(req, res);
  if (!caller) return;

  const { email, password, name, client_id, role } = req.body;
  if (!email || !password || !name || !client_id || !role)
    return res.status(400).json({ error: "email, password, name, client_id, role are required" });

  // Permission check
  const isSuperAdmin = await hasRole(caller.id, "superadmin");
  const isClientAdmin = await hasRole(caller.id, "clientadmin");

  if (!isSuperAdmin && !isClientAdmin)
    return res.status(403).json({ error: "Permission denied" });

  if (isClientAdmin && !isSuperAdmin) {
    if (role !== "student")
      return res.status(403).json({ error: "clientadmin can only create students" });
    const callerClientId = await getUserClientId(caller.id);
    if (callerClientId !== client_id)
      return res.status(403).json({ error: "Cannot create user for a different organization" });
  }

  // Check if auth user already exists in Firebase
  let userId: string;
  let userExists = false;
  try {
    const existingUser = await getAuth().getUserByEmail(email.trim());
    userId = existingUser.uid;
    userExists = true;
    
    // Update existing user credentials/name
    await getAuth().updateUser(userId, {
      password,
      displayName: name.trim(),
    });
  } catch (err: any) {
    if (err.code === "auth/user-not-found") {
      // Create auth user via Firebase Admin
      try {
        const userRecord = await getAuth().createUser({
          email: email.trim(),
          password,
          displayName: name.trim(),
          emailVerified: true,
        });
        userId = userRecord.uid;
      } catch (createErr: any) {
        return res.status(400).json({ error: createErr.message ?? "Failed to create auth user" });
      }
    } else {
      return res.status(400).json({ error: err.message ?? "Failed to check existing auth user" });
    }
  }

  const db = getDb();

  try {
    // Insert profile + role into Turso
    await db.batch([
      {
        sql: `INSERT INTO profiles (id, name, email, client_id) 
              VALUES (?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, client_id=excluded.client_id`,
        args: [userId, name.trim(), email.trim(), client_id],
      },
      {
        sql: `INSERT OR IGNORE INTO user_roles (id, user_id, role, client_id) VALUES (?,?,?,?)`,
        args: [crypto.randomUUID(), userId, role, client_id],
      },
    ], "write");

    return res.status(200).json({ id: userId });
  } catch (err: any) {
    // Rollback auth user ONLY if it was newly created in this request
    if (!userExists) {
      await getAuth().deleteUser(userId);
    }
    return res.status(500).json({ error: err.message ?? "Failed to store user profile" });
  }
}
