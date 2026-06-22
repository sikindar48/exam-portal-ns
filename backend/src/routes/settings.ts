import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole } from "../services/roles.js";
import { getAuth } from "firebase-admin/auth";
import { createAuditLog } from "../services/audit.js";

export default async function handler(req: Request, res: Response) {
  const db = getDb();

  // ── GET /api/settings (publicly accessible for banner/maintenance status) ─────
  if (req.method === "GET") {
    try {
      const { rows } = await db.execute("SELECT key, value FROM global_settings");
      const settings: Record<string, string> = {};
      for (const r of rows) {
        settings[r.key as string] = r.value as string;
      }
      return res.status(200).json({
        maintenance_mode: settings.maintenance_mode === "true",
        announcement_banner: settings.announcement_banner || "",
        registration_enabled: settings.registration_enabled !== "false",
        platform_logo: settings.platform_logo || "",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to fetch global settings" });
    }
  }

  // Admin authentication check for write operations
  const user = await requireUser(req, res);
  if (!user) return;

  const isSuper = await hasRole(user.id, "superadmin");
  if (!isSuper) {
    return res.status(403).json({ error: "Permission denied: Super Admin role required." });
  }

  // ── POST /api/settings/reset-password ──────────────────────────────────────────
  if (req.method === "POST" && req.path.endsWith("/reset-password")) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    try {
      const userRecord = await getAuth().getUserByEmail(email.trim());
      await getAuth().updateUser(userRecord.uid, { password });

      // Create Audit Log
      await createAuditLog({
        userId: user.id,
        action: "Reset Password",
        entityType: "User",
        entityId: userRecord.uid,
        metadata: { target_email: email.trim() },
      });

      return res.status(200).json({ success: true, message: "Password reset successfully." });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Failed to reset password" });
    }
  }

  // ── POST /api/settings (Update global configurations) ────────────────────────
  if (req.method === "POST") {
    const { maintenance_mode, announcement_banner, registration_enabled, platform_logo } = req.body;
    
    try {
      const updates = [];
      if (maintenance_mode !== undefined) {
        updates.push({
          sql: "INSERT OR REPLACE INTO global_settings (key, value, updated_at) VALUES ('maintenance_mode', ?, CURRENT_TIMESTAMP)",
          args: [maintenance_mode ? "true" : "false"],
        });
      }
      if (announcement_banner !== undefined) {
        updates.push({
          sql: "INSERT OR REPLACE INTO global_settings (key, value, updated_at) VALUES ('announcement_banner', ?, CURRENT_TIMESTAMP)",
          args: [String(announcement_banner).trim()],
        });
      }
      if (registration_enabled !== undefined) {
        updates.push({
          sql: "INSERT OR REPLACE INTO global_settings (key, value, updated_at) VALUES ('registration_enabled', ?, CURRENT_TIMESTAMP)",
          args: [registration_enabled ? "true" : "false"],
        });
      }
      if (platform_logo !== undefined) {
        updates.push({
          sql: "INSERT OR REPLACE INTO global_settings (key, value, updated_at) VALUES ('platform_logo', ?, CURRENT_TIMESTAMP)",
          args: [String(platform_logo)],
        });
      }

      if (updates.length > 0) {
        await db.batch(updates, "write");

        // Create Audit Logs
        if (maintenance_mode !== undefined) {
          await createAuditLog({
            userId: user.id,
            action: "Enabled Maintenance Mode",
            entityType: "System",
            metadata: { enabled: maintenance_mode },
          });
        }
        if (platform_logo !== undefined) {
          await createAuditLog({
            userId: user.id,
            action: "Updated Platform Logo",
            entityType: "System",
            metadata: {},
          });
        }
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to update global settings" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
