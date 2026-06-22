import { getDb } from "../db/db.js";

/** Check if a specific feature is enabled for a client organization */
export async function isFeatureEnabled(clientId: string | null, featureName: string): Promise<boolean> {
  if (!clientId) return false;
  const db = getDb();

  // 1. Check if the client has an active subscription plan that enables this feature
  const { rows: subFeatures } = await db.execute({
    sql: `SELECT 1 
          FROM client_subscriptions cs
          JOIN subscription_plan_features spf ON spf.plan_id = cs.plan_id
          WHERE cs.client_id = ? AND cs.status IN ('active', 'trial') AND spf.feature_name = ?`,
    args: [clientId, featureName]
  });

  if (subFeatures.length > 0) {
    return true;
  }

  // 2. Fallback: check manual client overrides in client_features
  const { rows } = await db.execute({
    sql: "SELECT enabled FROM client_features WHERE client_id = ? AND feature_name = ?",
    args: [clientId, featureName],
  });
  
  if (rows.length === 0) {
    // Default fallback rules if no feature-permission record exists yet:
    // Premium features default to false; others can default to true.
    const premiumFeatures = ["camera_proctoring"];
    if (premiumFeatures.includes(featureName)) {
      return false;
    }
    return true;
  }
  
  return (rows[0] as any).enabled === 1 || (rows[0] as any).enabled === true;
}
