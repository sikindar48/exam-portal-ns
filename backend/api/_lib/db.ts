import { createClient } from "@libsql/client";

let client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!client) {
    const url = process.env.VITE_TURSO_URL || process.env.TURSO_URL;
    const authToken = process.env.VITE_TURSO_TOKEN || process.env.TURSO_TOKEN;
    if (!url || !authToken) throw new Error("Missing TURSO_URL or TURSO_TOKEN env vars");
    client = createClient({ url, authToken });
  }
  return client;
}

/** Convert SQLite integers back to booleans for the frontend */
export function rowBools<T extends Record<string, any>>(row: T, fields: string[]): T {
  const out = { ...row };
  for (const f of fields) {
    if (f in out && out[f] !== null) (out as any)[f] = out[f] === 1 || out[f] === true;
  }
  return out;
}
