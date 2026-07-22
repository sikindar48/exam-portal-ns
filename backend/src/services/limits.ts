import { getDb } from "../db/db.js";
import { randomUUID } from "crypto";

export interface ClientLimits {
  client_id: string;
  max_exams_per_month: number;
  max_students_per_exam: number;
  max_questions_per_exam: number;
  max_storage_mb: number;
}

const DEFAULT_LIMITS = {
  max_exams_per_month: -1,
  max_students_per_exam: -1,
  max_questions_per_exam: -1,
  max_storage_mb: 25,
};

/** Get usage limits for a client. Returns defaults if no record exists. */
export async function getClientLimits(clientId: string | null): Promise<ClientLimits> {
  if (!clientId) {
    return { client_id: "", ...DEFAULT_LIMITS };
  }
  const db = getDb();

  // Try checking active subscription plan limits first
  const { rows: subRows } = await db.execute({
    sql: `SELECT sp.max_exams_per_month, sp.max_students_per_exam, sp.max_questions_per_exam, sp.max_storage_mb 
          FROM client_subscriptions cs
          JOIN subscription_plans sp ON sp.id = cs.plan_id
          WHERE cs.client_id = ? AND cs.status IN ('active', 'trial')`,
    args: [clientId],
  });

  if (subRows.length > 0) {
    const s = subRows[0] as any;
    return {
      client_id: clientId,
      max_exams_per_month: Number(s.max_exams_per_month),
      max_students_per_exam: Number(s.max_students_per_exam),
      max_questions_per_exam: Number(s.max_questions_per_exam),
      max_storage_mb: Number(s.max_storage_mb || 25),
    };
  }

  const { rows } = await db.execute({
    sql: "SELECT * FROM client_limits WHERE client_id = ?",
    args: [clientId],
  });

  if (rows.length === 0) {
    return { client_id: clientId, ...DEFAULT_LIMITS };
  }

  const r = rows[0] as any;
  return {
    client_id: clientId,
    max_exams_per_month: Number(r.max_exams_per_month),
    max_students_per_exam: Number(r.max_students_per_exam),
    max_questions_per_exam: Number(r.max_questions_per_exam),
    max_storage_mb: Number(r.max_storage_mb || 25),
  };
}

/** Increment monthly metrics for a client in the database */
export async function incrementClientUsage(
  clientId: string,
  metric: "exams_created" | "attempts_created" | "storage_used_mb",
  incrementBy = 1
): Promise<void> {
  const db = getDb();
  const month = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const id = randomUUID();

  // Upsert usage record for current month
  await db.execute({
    sql: `INSERT INTO client_usage_monthly (id, client_id, month, ${metric})
          VALUES (?, ?, ?, ?)
          ON CONFLICT(client_id, month) DO UPDATE SET
            ${metric} = MAX(0, ${metric} + ?),
            updated_at = CURRENT_TIMESTAMP`,
    args: [id, clientId, month, incrementBy, incrementBy],
  });
}

/** Get monthly usage metrics for a client */
export async function getClientUsageMonthly(clientId: string): Promise<{ exams_created: number; attempts_created: number; storage_used_mb: number }> {
  const db = getDb();
  const month = new Date().toISOString().slice(0, 7);
  const { rows } = await db.execute({
    sql: "SELECT exams_created, attempts_created, storage_used_mb FROM client_usage_monthly WHERE client_id = ? AND month = ?",
    args: [clientId, month],
  });

  if (rows.length === 0) {
    return { exams_created: 0, attempts_created: 0, storage_used_mb: 0 };
  }
  const r = rows[0] as any;
  return {
    exams_created: Number(r.exams_created || 0),
    attempts_created: Number(r.attempts_created || 0),
    storage_used_mb: Number(r.storage_used_mb || 0),
  };
}
