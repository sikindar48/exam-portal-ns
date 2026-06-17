import { getDb } from "../db/db.js";

export type AppRole = "superadmin" | "clientadmin" | "student";

const ROLE_PRIORITY: AppRole[] = ["superadmin", "clientadmin", "student"];

export interface UserRole {
  role: AppRole;
  client_id: string | null;
}

/** Fetch all roles for a user from Turso */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const db = getDb();
  const { rows } = await db.execute({
    sql: "SELECT role, client_id FROM user_roles WHERE user_id = ?",
    args: [userId],
  });
  return rows as unknown as UserRole[];
}

/** Get the highest-priority role for a user */
export async function getPrimaryRole(userId: string): Promise<UserRole | null> {
  const roles = await getUserRoles(userId);
  if (!roles.length) return null;
  return roles.sort(
    (a, b) => ROLE_PRIORITY.indexOf(a.role) - ROLE_PRIORITY.indexOf(b.role)
  )[0];
}

/** Check if user has a specific role */
export async function hasRole(userId: string, role: AppRole): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.some((r) => r.role === role);
}

/** Get client_id from profiles */
export async function getUserClientId(userId: string): Promise<string | null> {
  const db = getDb();
  const { rows } = await db.execute({
    sql: "SELECT client_id FROM profiles WHERE id = ?",
    args: [userId],
  });
  return (rows[0] as any)?.client_id ?? null;
}
