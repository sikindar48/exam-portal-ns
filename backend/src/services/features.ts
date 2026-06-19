import { getDb } from "../db/db.js";

/** Check if a specific feature is enabled for a client organization */
export async function isFeatureEnabled(clientId: string | null, featureName: string): Promise<boolean> {
  if (!clientId) return false;
  const db = getDb();
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
