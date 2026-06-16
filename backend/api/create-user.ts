import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { getDb } from "./_lib/db";
import { requireUser } from "./_lib/auth";
import { hasRole, getUserClientId } from "./_lib/roles";

/**
 * POST /api/create-user
 * Replaces the Supabase Edge Function `create-user`.
 * Uses Supabase Admin API to create the auth user (email pre-confirmed),
 * then stores profile + role in Turso.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  // Create auth user via Supabase Admin API
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false } }
  );

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { name: name.trim() },
  });

  if (authError || !authData.user)
    return res.status(400).json({ error: authError?.message ?? "Failed to create auth user" });

  const userId = authData.user.id;
  const db = getDb();

  try {
    // Insert profile + role into Turso
    await db.batch([
      {
        sql: `INSERT INTO profiles (id, name, email, client_id) VALUES (?,?,?,?)`,
        args: [userId, name.trim(), email.trim(), client_id],
      },
      {
        sql: `INSERT OR IGNORE INTO user_roles (id, user_id, role, client_id) VALUES (?,?,?,?)`,
        args: [crypto.randomUUID(), userId, role, client_id],
      },
    ], "write");

    return res.status(200).json({ id: userId });
  } catch (err: any) {
    // Rollback auth user if Turso insert fails
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return res.status(500).json({ error: err.message ?? "Failed to store user profile" });
  }
}
