import { getDb } from "../db/db.js";

export interface PlanLimits {
  plan: string;
  max_exams_per_month: number;
  max_questions_per_exam: number;
  max_students_per_exam: number;
  features: string[];
}

export const FREE_PLAN_LIMITS: PlanLimits = {
  plan: "free",
  max_exams_per_month: 3,
  max_questions_per_exam: 50,
  max_students_per_exam: 20,
  features: ["analytics", "shuffle"]
};

export const PLAN_LIMITS_MAP: Record<string, Omit<PlanLimits, "plan">> = {
  free: {
    max_exams_per_month: 3,
    max_questions_per_exam: 50,
    max_students_per_exam: 20,
    features: ["analytics", "shuffle"]
  },
  starter: {
    max_exams_per_month: 25,
    max_questions_per_exam: 100,
    max_students_per_exam: 100,
    features: ["csv_import", "xlsx_export", "analytics", "custom_branding", "advanced_proctoring", "shuffle"]
  },
  growth: {
    max_exams_per_month: 50,
    max_questions_per_exam: 200,
    max_students_per_exam: 250,
    features: ["csv_import", "xlsx_export", "analytics", "custom_branding", "advanced_proctoring", "shuffle"]
  },
  enterprise: {
    max_exams_per_month: -1,
    max_questions_per_exam: -1,
    max_students_per_exam: -1,
    features: ["csv_import", "xlsx_export", "analytics", "custom_branding", "advanced_proctoring", "camera_proctoring", "shuffle"]
  }
};

/** Get the effective capabilities of a client based on their active subscription */
export async function getEffectivePlan(clientId: string): Promise<PlanLimits> {
  const db = getDb();
  // Implicit Fallback: Query active subscription
  const { rows } = await db.execute({
    sql: `SELECT plan_id FROM client_subscriptions 
          WHERE client_id = ? AND status = 'active'
          LIMIT 1`,
    args: [clientId]
  });

  const planId = rows[0] ? String(rows[0].plan_id) : "free";
  const limits = PLAN_LIMITS_MAP[planId] || PLAN_LIMITS_MAP.free;
  
  return {
    plan: planId,
    ...limits
  };
}

/** Get all active packages for purchase */
export async function getAvailablePackages() {
  const db = getDb();
  const { rows } = await db.execute("SELECT * FROM test_packages WHERE active = 1");
  return rows;
}

/** Get all purchases made by a client organization */
export async function getClientPurchases(clientId: string) {
  const db = getDb();
  const { rows } = await db.execute({
    sql: `SELECT cp.*, 
                 tp.name as package_name, 
                 tp.price as package_price,
                 tp.max_questions as default_max_questions,
                 tp.max_candidates as default_max_candidates,
                 tp.basic_proctoring,
                 tp.camera_proctoring,
                 tp.custom_branding,
                 tp.csv_import,
                 tp.xlsx_export
          FROM client_test_purchases cp
          JOIN test_packages tp ON cp.package_id = tp.id
          WHERE cp.client_id = ?
          ORDER BY cp.purchased_at DESC`,
    args: [clientId]
  });
  return rows;
}

/** Assign a package to a test in a transaction */
export async function assignPackageToTest(clientId: string, purchaseId: string, testId: string): Promise<boolean> {
  const db = getDb();
  
  // Verify purchase exists, belongs to client, and is available
  const pCheck = await db.execute({
    sql: "SELECT * FROM client_test_purchases WHERE id = ? AND client_id = ? AND status = 'available' LIMIT 1",
    args: [purchaseId, clientId]
  });
  if (pCheck.rows.length === 0) return false;
  
  const purchase = pCheck.rows[0];
  const packageId = String(purchase.package_id);

  // Fetch package details to copy limits
  const pkgCheck = await db.execute({
    sql: "SELECT * FROM test_packages WHERE id = ? LIMIT 1",
    args: [packageId]
  });
  if (pkgCheck.rows.length === 0) return false;
  
  const pkg = pkgCheck.rows[0];

  const maxQs = purchase.custom_max_questions !== null && purchase.custom_max_questions !== undefined
    ? Number(purchase.custom_max_questions)
    : Number(pkg.max_questions);

  const maxCands = purchase.custom_max_candidates !== null && purchase.custom_max_candidates !== undefined
    ? Number(purchase.custom_max_candidates)
    : Number(pkg.max_candidates);

  const tx = await db.transaction("write");
  try {
    // 1. Mark purchase as used
    await tx.execute({
      sql: "UPDATE client_test_purchases SET status = 'used', used_at = datetime('now'), assigned_test_id = ? WHERE id = ?",
      args: [testId, purchaseId]
    });

    // 2. Create test_billing record copying package specs
    await tx.execute({
      sql: `INSERT INTO test_billing (test_id, purchase_id, package_id, max_questions, max_candidates, basic_proctoring, camera_proctoring, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      args: [
        testId,
        purchaseId,
        packageId,
        maxQs,
        maxCands,
        Number(pkg.basic_proctoring),
        Number(pkg.camera_proctoring)
      ]
    });
    
    await tx.commit();
    return true;
  } catch (err) {
    await tx.rollback();
    console.error("Failed to assign package to test:", err);
    return false;
  }
}

/** Validate if the proposed questions count fits within limits */
export async function validateQuestionLimit(testId: string, proposedCount: number): Promise<boolean> {
  const db = getDb();
  
  // 1. Check if test uses a Pay Per Test package
  const billingCheck = await db.execute({
    sql: "SELECT max_questions FROM test_billing WHERE test_id = ? LIMIT 1",
    args: [testId]
  });

  if (billingCheck.rows.length > 0) {
    const maxQs = Number(billingCheck.rows[0].max_questions);
    return proposedCount <= maxQs;
  }

  // 2. Otherwise fall back to tenant subscription limits
  const testInfo = await db.execute({
    sql: "SELECT client_id FROM tests WHERE id = ? LIMIT 1",
    args: [testId]
  });
  if (testInfo.rows.length === 0) return true;

  const clientId = String(testInfo.rows[0].client_id);
  const plan = await getEffectivePlan(clientId);

  if (plan.max_questions_per_exam === -1) return true;
  return proposedCount <= plan.max_questions_per_exam;
}

/** Validate if candidate capacity is exceeded for attempts creation */
export async function validateCandidateCapacity(testId: string): Promise<boolean> {
  const db = getDb();

  // 1. Check if test has read_only flag
  const testCheck = await db.execute({
    sql: "SELECT client_id, read_only FROM tests WHERE id = ? LIMIT 1",
    args: [testId]
  });
  if (testCheck.rows.length === 0) return false;
  if (Number(testCheck.rows[0].read_only) === 1) return false;

  const clientId = String(testCheck.rows[0].client_id);

  // Count active/completed attempts
  const countCheck = await db.execute({
    sql: "SELECT COUNT(*) as count FROM attempts WHERE test_id = ?",
    args: [testId]
  });
  const currentAttempts = Number((countCheck.rows[0] as any).count);

  // 2. Check if Pay Per Test is active
  const billingCheck = await db.execute({
    sql: "SELECT status, max_candidates FROM test_billing WHERE test_id = ? LIMIT 1",
    args: [testId]
  });

  if (billingCheck.rows.length > 0) {
    const billing = billingCheck.rows[0];
    if (String(billing.status) === "completed") return false;
    const maxCandidates = Number(billing.max_candidates);

    if (currentAttempts >= maxCandidates) {
      // Transition to completed and read-only
      await db.execute({
        sql: "UPDATE test_billing SET status = 'completed' WHERE test_id = ?",
        args: [testId]
      });
      await db.execute({
        sql: "UPDATE tests SET read_only = 1 WHERE id = ?",
        args: [testId]
      });
      return false;
    }
    return true;
  }

  // 3. Subscription check
  const plan = await getEffectivePlan(clientId);
  if (plan.max_students_per_exam === -1) return true;
  return currentAttempts < plan.max_students_per_exam;
}

/** Validate if a feature is allowed for a test */
export async function validatePackageFeatures(testId: string, feature: string): Promise<boolean> {
  const db = getDb();

  // Check if test has test_billing record
  const billingCheck = await db.execute({
    sql: "SELECT * FROM test_billing WHERE test_id = ? LIMIT 1",
    args: [testId]
  });

  if (billingCheck.rows.length > 0) {
    const billing = billingCheck.rows[0];
    if (feature === "basic_proctoring") {
      return Number(billing.basic_proctoring) === 1;
    }
    if (feature === "camera_proctoring") {
      return Number(billing.camera_proctoring) === 1;
    }
    // Fall back to package config for other features
    const pkgCheck = await db.execute({
      sql: "SELECT * FROM test_packages WHERE id = ? LIMIT 1",
      args: [String(billing.package_id)]
    });
    if (pkgCheck.rows.length === 0) return false;
    const pkg = pkgCheck.rows[0];
    return Number((pkg as any)[feature]) === 1;
  }

  // Otherwise, use active subscription features
  const testInfo = await db.execute({
    sql: "SELECT client_id FROM tests WHERE id = ? LIMIT 1",
    args: [testId]
  });
  if (testInfo.rows.length === 0) return false;
  
  const clientId = String(testInfo.rows[0].client_id);
  const plan = await getEffectivePlan(clientId);
  return plan.features.includes(feature);
}
