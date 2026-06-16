import { createClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

// Single shared client for JWT verification (auth only — no DB queries)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Extracts and verifies the Supabase JWT from the Authorization header.
 * Returns the decoded user, or null if the token is missing/invalid.
 */
export async function getUser(req: VercelRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  return { id: data.user.id, email: data.user.email ?? "" };
}

/**
 * Returns the user or sends a 401 response.
 * Usage: const user = await requireUser(req, res); if (!user) return;
 */
export async function requireUser(
  req: VercelRequest,
  res: { status: (n: number) => { json: (b: any) => void } }
): Promise<AuthUser | null> {
  const user = await getUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}
