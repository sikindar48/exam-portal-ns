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

/** Get client_id from profiles (fallback to user_roles if NULL) */
export async function getUserClientId(userId: string): Promise<string | null> {
  const db = getDb();
  const { rows } = await db.execute({
    sql: "SELECT client_id FROM profiles WHERE id = ?",
    args: [userId],
  });
  const profClientId = (rows[0] as any)?.client_id ?? null;
  if (profClientId) return profClientId;

  // Fallback to user_roles table
  const { rows: roleRows } = await db.execute({
    sql: "SELECT client_id FROM user_roles WHERE user_id = ? AND client_id IS NOT NULL",
    args: [userId],
  });
  return (roleRows[0] as any)?.client_id ?? null;
}

/** Check if user/student ID belongs to a guest profile */
export async function isGuestStudent(userId: string): Promise<boolean> {
  const db = getDb();
  const { rows } = await db.execute({
    sql: "SELECT email FROM profiles WHERE id = ?",
    args: [userId],
  });
  if (rows.length === 0) return false;
  const email = (rows[0] as any).email || "";
  return email.startsWith("guest_") && email.endsWith("@temp.exam");
}

