import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole, getUserClientId } from "../services/roles.js";
import { randomUUID } from "crypto";
import { userRoleCreateSchema } from "../validation/schemas.js";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    // Auto-migrate user ID from old Supabase UUID to new Firebase UID if email matches
    if (user.email) {
      const { rows: existingProfiles } = await db.execute({
        sql: "SELECT id FROM profiles WHERE email = ? AND id != ?",
        args: [user.email, user.id],
      });
      if (existingProfiles.length > 0) {
        const oldId = existingProfiles[0].id as string;
        console.log(`Auto-migrating user ${user.email} from ${oldId} to new Firebase UID ${user.id}`);
        try {
          // Delete any new duplicate profile/roles to prevent unique constraint failures during migration
          await db.execute({ sql: "DELETE FROM user_roles WHERE user_id = ?", args: [user.id] });
          await db.execute({ sql: "DELETE FROM profiles WHERE id = ?", args: [user.id] });

          // Migrate old records to the new Firebase UID
          await db.execute({
            sql: "UPDATE profiles SET id = ? WHERE id = ?",
            args: [user.id, oldId],
          });
          await db.execute({
            sql: "UPDATE user_roles SET user_id = ? WHERE user_id = ?",
            args: [user.id, oldId],
          });
          await db.execute({
            sql: "UPDATE attempts SET student_id = ? WHERE student_id = ?",
            args: [user.id, oldId],
          });
        } catch (migrateErr) {
          console.error("Migration error:", migrateErr);
        }
      }
    }

    const { user_id, client_id, role } = req.query;

    let sql = "SELECT * FROM user_roles WHERE 1=1";
    const args: any[] = [];

    // If no specific filters are requested, default to the logged-in user's own roles
    if (!user_id && !client_id && !role) {
      sql += " AND user_id = ?";
      args.push(user.id);
    } else {
      if (user_id) { sql += " AND user_id = ?"; args.push(user_id); }
      if (client_id) { sql += " AND client_id = ?"; args.push(client_id); }
      if (role) { sql += " AND role = ?"; args.push(role); }
    }

    const { rows } = await db.execute({ sql, args });
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const validation = userRoleCreateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }
    const { user_id, role, client_id } = validation.data;

    // Role check and privilege validation
    const isSelfAssignment = user_id === user.id;
    if (isSelfAssignment) {
      // Students can only self-assign the student role
      if (role !== "student") {
        return res.status(403).json({ error: "Cannot self-assign administrative roles" });
      }
    } else {
      // Administrative assignment
      const callerSuper = await hasRole(user.id, "superadmin");
      const callerClientAdmin = await hasRole(user.id, "clientadmin");
      
      if (!callerSuper && !callerClientAdmin) {
        return res.status(403).json({ error: "Permission denied" });
      }
      
      if (callerClientAdmin && !callerSuper) {
        if (role !== "student") {
          return res.status(403).json({ error: "clientadmin can only assign student role" });
        }
        const callerClientId = await getUserClientId(user.id);
        if (!callerClientId || callerClientId !== client_id) {
          return res.status(403).json({ error: "Cannot assign roles for another organization" });
        }
      }
    }

    const id = randomUUID();
    await db.execute({
      sql: `INSERT OR IGNORE INTO user_roles (id, user_id, role, client_id)
            VALUES (?,?,?,?)`,
      args: [id, user_id, role, client_id ?? null],
    });
    return res.status(201).json({ id, user_id, role, client_id });
  }

  if (req.method === "DELETE") {
    const { user_id, role } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    const callerSuper = await hasRole(user.id, "superadmin");
    const callerClientAdmin = await hasRole(user.id, "clientadmin");

    if (!callerSuper && !callerClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    if (callerClientAdmin && !callerSuper) {
      // clientadmin can only delete student roles for their own client
      const callerClientId = await getUserClientId(user.id);
      
      // Get the target user's client_id from their profile
      const targetClientId = await getUserClientId(user_id as string);
      
      if (!callerClientId || callerClientId !== targetClientId) {
        return res.status(403).json({ error: "Cannot modify roles for another organization" });
      }
      
      if (role && role !== "student") {
        return res.status(403).json({ error: "clientadmin can only remove student roles" });
      }
    }

    let sql = "DELETE FROM user_roles WHERE user_id = ?";
    const args: any[] = [user_id as string];
    if (role) { 
      sql += " AND role = ?"; 
      args.push(role); 
    } else if (callerClientAdmin && !callerSuper) {
      // Force delete only student role if clientadmin does not specify
      sql += " AND role = 'student'";
    }

    await db.execute({ sql, args });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
