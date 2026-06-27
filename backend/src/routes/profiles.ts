import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole, getUserClientId } from "../services/roles.js";
import { randomUUID } from "crypto";
import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { profileUpsertSchema } from "../validation/schemas.js";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  // ── GET /api/profiles ───────────────────────────────────────────────────────
  if (req.method === "GET") {
    const { id, ids, client_id, page, limit } = req.query;

    const callerClientId = await getUserClientId(user.id);
    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");

    if (id) {
      if (!isSuper) {
        if (id !== user.id) {
          if (isClientAdmin) {
            const targetClientId = await getUserClientId(id as string);
            if (targetClientId !== callerClientId) {
              const { rows: roleRows } = await db.execute({
                sql: "SELECT COUNT(*) as count FROM user_roles WHERE user_id = ? AND client_id = ?",
                args: [id as string, callerClientId],
              });
              if ((roleRows[0] as any).count === 0) {
                return res.status(403).json({ error: "Access denied" });
              }
            }
          } else {
            return res.status(403).json({ error: "Access denied" });
          }
        }
      }

      const { rows } = await db.execute({ sql: "SELECT * FROM profiles WHERE id = ?", args: [id as string] });
      return res.status(200).json(rows[0] ?? null);
    }

    if (ids) {
      const idList = (ids as string).split(",").filter(Boolean);
      if (!idList.length) return res.status(200).json([]);

      if (!isSuper) {
        if (isClientAdmin) {
          const placeholders = idList.map(() => "?").join(",");
          const { rows } = await db.execute({
            sql: `SELECT COUNT(*) as count FROM profiles WHERE id IN (${placeholders}) 
                  AND client_id != ? 
                  AND id NOT IN (
                    SELECT user_id FROM user_roles WHERE client_id = ?
                  )`,
            args: [...idList, callerClientId, callerClientId],
          });
          if ((rows[0] as any).count > 0) {
            return res.status(403).json({ error: "Access denied" });
          }
        } else {
          // Student role can only fetch their own ID
          if (idList.length > 1 || idList[0] !== user.id) {
            return res.status(403).json({ error: "Access denied" });
          }
        }
      }

      const placeholders = idList.map(() => "?").join(",");
      const { rows } = await db.execute({
        sql: `SELECT id, name, email, created_at FROM profiles WHERE id IN (${placeholders})`,
        args: idList,
      });
      return res.status(200).json(rows);
    }

    if (client_id) {
      if (!isSuper) {
        if (!isClientAdmin || client_id !== callerClientId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      const isPaginationRequested = page !== undefined && limit !== undefined;
      const { rows: countRows } = await db.execute({
        sql: "SELECT COUNT(*) as total FROM profiles WHERE client_id = ?",
        args: [client_id as string],
      });
      const total = (countRows[0] as any).total;

      let sql = "SELECT id, name, email, client_id, created_at FROM profiles WHERE client_id = ?";
      const args: any[] = [client_id as string];

      if (isPaginationRequested) {
        const pNum = Math.max(1, parseInt(page as string, 10));
        const lNum = Math.max(1, parseInt(limit as string, 10));
        const offset = (pNum - 1) * lNum;
        sql += " LIMIT ? OFFSET ?";
        args.push(lNum, offset);
      }

      const { rows } = await db.execute({ sql, args });

      if (isPaginationRequested) {
        return res.status(200).json({
          data: rows,
          pagination: {
            page: Math.max(1, parseInt(page as string, 10)),
            limit: Math.max(1, parseInt(limit as string, 10)),
            total,
          },
        });
      }

      return res.status(200).json(rows);
    }

    return res.status(400).json({ error: "id, ids, or client_id required" });
  }

  // ── POST /api/profiles (upsert — used by guest student registration) ─────────
  if (req.method === "POST") {
    const validation = profileUpsertSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }
    const { id, name, email, client_id } = validation.data;
    const profileId = id || randomUUID();

    // Prevent profile hijacking / overwrite of non-guest accounts
    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    const callerClientId = await getUserClientId(user.id);

    if (!isSuper && profileId !== user.id) {
      if (isClientAdmin) {
        const { rows } = await db.execute({
          sql: "SELECT client_id FROM profiles WHERE id = ?",
          args: [profileId],
        });
        const targetClientId = rows[0]?.client_id;
        if (!callerClientId || targetClientId !== callerClientId) {
          const { rows: roleRows } = await db.execute({
            sql: "SELECT COUNT(*) as count FROM user_roles WHERE user_id = ? AND client_id = ?",
            args: [profileId, callerClientId],
          });
          if ((roleRows[0] as any).count === 0) {
            return res.status(403).json({ error: "Cannot modify this profile" });
          }
        }
      } else {
        const { rows } = await db.execute({
          sql: "SELECT email FROM profiles WHERE id = ?",
          args: [profileId],
        });
        if (rows.length > 0) {
          const existingEmail = (rows[0] as any).email || "";
          const isGuestEmail = existingEmail.startsWith("guest_") && existingEmail.endsWith("@temp.exam");
          if (!isGuestEmail) {
            return res.status(403).json({ error: "Cannot modify this profile" });
          }
        }
      }
    }

    // Sync with Firebase Auth if Firebase Admin SDK is active and the user is not a guest
    if (getApps().length > 0) {
      try {
        const { rows: existingRows } = await db.execute({
          sql: "SELECT email FROM profiles WHERE id = ?",
          args: [profileId],
        });
        if (existingRows.length > 0) {
          const existingEmail = (existingRows[0] as any).email || "";
          const isGuestEmail = existingEmail.startsWith("guest_") && existingEmail.endsWith("@temp.exam");
          if (!isGuestEmail) {
            await getAuth().updateUser(profileId, {
              email: email.trim(),
              displayName: name.trim(),
            });
          }
        }
      } catch (authErr: any) {
        console.error("Failed to update Firebase Auth user:", authErr);
        return res.status(400).json({ error: authErr.message || "Failed to update Firebase Auth credentials" });
      }
    }

    await db.execute({
      sql: `INSERT INTO profiles (id, name, email, client_id)
            VALUES (?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              email = excluded.email,
              client_id = COALESCE(client_id, excluded.client_id),
              updated_at = datetime('now')`,
      args: [profileId, name, email, client_id ?? null],
    });

    const { rows } = await db.execute({ sql: "SELECT * FROM profiles WHERE id = ?", args: [profileId] });
    return res.status(200).json(rows[0]);
  }


  // ── DELETE /api/profiles?id= ─────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id is required" });

    const isSuper = await hasRole(user.id, "superadmin");
    const isClientAdmin = await hasRole(user.id, "clientadmin");
    if (!isSuper && !isClientAdmin) {
      return res.status(403).json({ error: "Permission denied" });
    }

    if (isClientAdmin && !isSuper) {
      const callerClientId = await getUserClientId(user.id);
      const targetClientId = await getUserClientId(id as string);
      if (!callerClientId || callerClientId !== targetClientId) {
        const { rows: roleRows } = await db.execute({
          sql: "SELECT COUNT(*) as count FROM user_roles WHERE user_id = ? AND client_id = ?",
          args: [id as string, callerClientId],
        });
        if ((roleRows[0] as any).count === 0) {
          return res.status(403).json({ error: "Permission denied" });
        }
      }
    }

    // Clean up all related student records in a batch transaction
    await db.batch([
      { sql: "DELETE FROM profiles WHERE id = ?", args: [id as string] },
      { sql: "DELETE FROM user_roles WHERE user_id = ?", args: [id as string] },
      { sql: "DELETE FROM attempts WHERE student_id = ?", args: [id as string] }
    ], "write");

    // Clean up Firebase Auth user if Firebase Admin SDK is initialized
    if (getApps().length > 0) {
      try {
        await getAuth().deleteUser(id as string);
      } catch (authErr) {
        console.error("Failed to delete user from Firebase Auth:", authErr);
      }
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
