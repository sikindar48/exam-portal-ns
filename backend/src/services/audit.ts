import { getDb } from "../db/db.js";
import { randomUUID } from "crypto";

interface AuditLogEntry {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: any;
}

/** Insert a new record into the admin audit logs */
export async function createAuditLog({
  userId,
  action,
  entityType,
  entityId = null,
  metadata = null,
}: AuditLogEntry): Promise<void> {
  try {
    const db = getDb();
    const id = randomUUID();
    const metaStr = metadata ? JSON.stringify(metadata) : null;

    await db.execute({
      sql: `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, userId, action, entityType, entityId, metaStr],
    });
  } catch (err) {
    console.error("Failed to create audit log entry:", err);
  }
}
