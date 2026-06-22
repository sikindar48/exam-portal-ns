import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole } from "../services/roles.js";

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  // Super Admin security block
  const isSuper = await hasRole(user.id, "superadmin");
  if (!isSuper) {
    return res.status(403).json({ error: "Permission denied. Super Admin access only." });
  }

  // ── GET /api/superadmin/audit-logs ─────────────────────────────────────────
  if (req.method === "GET") {
    const { page, limit, user_query, action, entity_type, start_date, end_date } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 20);
    const offset = (pageNum - 1) * limitNum;

    try {
      let sql = `
        SELECT al.*, p.name as user_name, p.email as user_email
        FROM audit_logs al
        LEFT JOIN profiles p ON p.id = al.user_id
      `;

      const conditions: string[] = [];
      const args: any[] = [];

      // Filter by user ID, name, or email match
      if (user_query) {
        conditions.push(`(p.email LIKE ? OR p.name LIKE ? OR al.user_id = ?)`);
        const likeQuery = `%${user_query}%`;
        args.push(likeQuery, likeQuery, user_query);
      }

      // Filter by action keyword
      if (action) {
        conditions.push(`al.action LIKE ?`);
        args.push(`%${action}%`);
      }

      // Filter by entity type (exact match)
      if (entity_type) {
        conditions.push(`al.entity_type = ?`);
        args.push(entity_type as string);
      }

      // Filter by start and end timestamps
      if (start_date) {
        conditions.push(`al.created_at >= ?`);
        args.push(start_date as string);
      }
      if (end_date) {
        conditions.push(`al.created_at <= ?`);
        args.push(end_date as string);
      }

      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }

      // Count query
      const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
      const countArgs = [...args];
      const { rows: countRows } = await db.execute({ sql: countSql, args: countArgs });
      const total = Number((countRows[0] as any)?.total || 0);

      // Paginated list query
      sql += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
      const queryArgs = [...args, limitNum, offset];
      const { rows: logs } = await db.execute({ sql, args: queryArgs });

      // Parse metadata field if stored as JSON string
      const parsedLogs = logs.map((log: any) => {
        let meta = log.metadata;
        if (typeof meta === "string") {
          try {
            meta = JSON.parse(meta);
          } catch {
            // Keep original string if parsing fails
          }
        }
        return {
          ...log,
          metadata: meta
        };
      });

      return res.status(200).json({
        logs: parsedLogs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to retrieve audit logs" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
