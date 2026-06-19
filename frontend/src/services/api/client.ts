/**
 * Restructured API client
 * Handles all network requests to the backend API.
 * Configured dynamically using VITE_API_URL.
 */

import { auth } from "@/integrations/firebase/client";

const API_BASE = import.meta.env.VITE_API_URL || "";

function getUrl(path: string): string {
  const cleanBase = API_BASE.replace(/\/$/, "");
  
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  
  if (path.startsWith("/api")) {
    return `${cleanBase}${path}`;
  }
  
  return `${cleanBase}/api${path.startsWith("/") ? path : `/${path}`}`;
}

async function getToken(): Promise<string | null> {
  if (auth.currentUser) return auth.currentUser.getIdToken();
  
  // On fresh page reload, Firebase currentUser might be null for a brief moment
  // while restoring the session. We wait for the first auth state event to resolve it.
  return new Promise((resolve) => {
    let resolved = false;
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        resolve(user ? user.getIdToken() : null);
      }
    });
    // Fallback safety timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsubscribe();
        resolve(null);
      }
    }, 2000);
  });
}

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: { message: string } | null }> {
  try {
    const token = await getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = getUrl(path);
    const res = await fetch(url, { ...options, headers });
    const json = await res.json();

    if (!res.ok) return { data: null, error: { message: json.error ?? res.statusText } };
    return { data: json as T, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message ?? "Network error" } };
  }
}

/**
 * Low-level fetch helper for use in AuthContext where we pass the token directly
 * (user may not be set in Firebase yet at call time).
 */
export async function apiClient(
  path: string,
  options: { token?: string; method?: string; body?: any } = {}
): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers["Authorization"] = `Bearer ${options.token}`;

  const url = getUrl(path);
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? res.statusText);
  }
  return res.json();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function qs(params: Record<string, any>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ── Clients ───────────────────────────────────────────────────────────────────

export const clientsApi = {
  list: () => apiFetch("/clients"),
  listActive: () => apiFetch("/clients?active_only=true"),
  get: (id: string) => apiFetch(`/clients?id=${id}`),
  create: (body: any) => apiFetch("/clients", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) => apiFetch(`/clients?id=${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch(`/clients?id=${id}`, { method: "DELETE" }),
};

// ── Questions ─────────────────────────────────────────────────────────────────

export const questionsApi = {
  list: (params: { client_id?: string; folder_id?: string | null; search?: string; difficulty?: string } = {}) =>
    apiFetch(`/questions${qs({ ...params, folder_id: params.folder_id ?? undefined })}`),
  getByIds: (ids: string[]) => apiFetch(`/questions?ids=${ids.join(",")}`),
  create: (body: any | any[]) => apiFetch("/questions", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) => apiFetch(`/questions?id=${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  bulkMove: (ids: string[], folder_id: string | null) =>
    apiFetch(`/questions?id=bulk`, { method: "PATCH", body: JSON.stringify({ ids, folder_id }) }),
  delete: (id: string) => apiFetch(`/questions?id=${id}`, { method: "DELETE" }),
  bulkDelete: (ids: string[]) => apiFetch(`/questions?ids=${ids.join(",")}`, { method: "DELETE" }),
  checkDuplicates: (client_id: string) => apiFetch(`/questions?client_id=${client_id}`),
  rollback: (import_batch_id: string) => apiFetch(`/questions?import_batch_id=${import_batch_id}`, { method: "DELETE" }),
};

// ── Question Folders ──────────────────────────────────────────────────────────

export const questionFoldersApi = {
  list: () => apiFetch("/question-folders"),
  create: (body: any) => apiFetch("/question-folders", { method: "POST", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch(`/question-folders?id=${id}`, { method: "DELETE" }),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

export const testsApi = {
  list: (params: { client_id?: string; with_question_count?: boolean } = {}) =>
    apiFetch(`/tests${qs(params)}`),
  get: (id: string) => apiFetch(`/tests?id=${id}`),
  getByShareCode: (code: string) => apiFetch(`/tests?share_code=${encodeURIComponent(code)}`),
  create: (body: any) => apiFetch("/tests", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) => apiFetch(`/tests?id=${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch(`/tests?id=${id}`, { method: "DELETE" }),
};

// ── Test Folders ──────────────────────────────────────────────────────────────

export const testFoldersApi = {
  list: () => apiFetch("/test-folders"),
  create: (body: any) => apiFetch("/test-folders", { method: "POST", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch(`/test-folders?id=${id}`, { method: "DELETE" }),
};

// ── Test Questions ────────────────────────────────────────────────────────────

export const testQuestionsApi = {
  list: (test_id: string, with_answers = false) =>
    apiFetch(`/test-questions?test_id=${test_id}&with_answers=${with_answers}`),
  add: (test_id: string, rows: any[]) =>
    apiFetch(`/test-questions?test_id=${test_id}`, { method: "POST", body: JSON.stringify(rows) }),
  /** Full replace — used by Builder save */
  replace: (test_id: string, questions: any[]) =>
    apiFetch(`/test-questions?test_id=${test_id}`, { method: "PUT", body: JSON.stringify(questions) }),
  remove: (test_id: string, question_id: string) =>
    apiFetch(`/test-questions?test_id=${test_id}&question_id=${question_id}`, { method: "DELETE" }),
};

// ── Test Sections ─────────────────────────────────────────────────────────────

export const testSectionsApi = {
  list: (test_id: string) =>
    apiFetch(`/test-sections?test_id=${test_id}`),
  create: (body: any) =>
    apiFetch("/test-sections", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: any) =>
    apiFetch(`/test-sections?id=${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) =>
    apiFetch(`/test-sections?id=${id}`, { method: "DELETE" }),
};

// ── Attempts ──────────────────────────────────────────────────────────────────

export const attemptsApi = {
  get: (id: string) => apiFetch(`/attempts?id=${id}`),
  list: (params: { student_id?: string; test_id?: string; status?: string } = {}) =>
    apiFetch(`/attempts${qs(params)}`),
  countCompleted: (test_id: string, student_id: string) =>
    apiFetch(`/attempts?test_id=${test_id}&student_id=${student_id}&count_only=true`),
  getInProgress: (test_id: string, student_id: string) =>
    apiFetch(`/attempts?test_id=${test_id}&student_id=${student_id}&status=in_progress`),
  create: (body: { student_id?: string; test_id: string; status?: string }) =>
    apiFetch("/attempts", { method: "POST", body: JSON.stringify(body) }),
  listForTest: (test_id: string) => apiFetch(`/attempts?test_id=${test_id}`),
};

// ── Attempt Answers ───────────────────────────────────────────────────────────

export const attemptAnswersApi = {
  list: (attempt_id: string) => apiFetch(`/attempt-answers?attempt_id=${attempt_id}`),
  upsert: (rows: any[]) =>
    apiFetch("/attempt-answers", { method: "POST", body: JSON.stringify(rows) }),
};

// ── Profiles ──────────────────────────────────────────────────────────────────

export const profilesApi = {
  get: (id: string) => apiFetch(`/profiles?id=${id}`),
  getByIds: (ids: string[]) => apiFetch(`/profiles?ids=${ids.join(",")}`),
  upsert: (body: any) => apiFetch("/profiles", { method: "POST", body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch(`/profiles?id=${id}`, { method: "DELETE" }),
};

// ── User Roles ────────────────────────────────────────────────────────────────

export const userRolesApi = {
  list: (params: { user_id?: string; client_id?: string; role?: string } = {}) =>
    apiFetch(`/user-roles${qs(params)}`),
  create: (body: any) => apiFetch("/user-roles", { method: "POST", body: JSON.stringify(body) }),
  delete: (user_id: string, role?: string) =>
    apiFetch(`/user-roles?user_id=${user_id}${role ? `&role=${role}` : ""}`, { method: "DELETE" }),
};

// ── Stats ─────────────────────────────────────────────────────────────────────

export const statsApi = {
  platform: () => apiFetch("/stats?scope=platform"),
  client: () => apiFetch("/stats?scope=client"),
};

// ── RPC ───────────────────────────────────────────────────────────────────────

export const rpc = {
  submitAttempt: (attempt_id: string, time_taken: number) =>
    apiFetch("/rpc/submit-attempt", {
      method: "POST",
      body: JSON.stringify({ attempt_id, time_taken }),
    }),
  cloneTest: (source_test_id: string) =>
    apiFetch("/rpc/clone-test", {
      method: "POST",
      body: JSON.stringify({ source_test_id }),
    }),
};

// ── Create User ──────────────────────────────────────────────────────────────

export const createUser = (body: {
  email: string;
  password: string;
  name: string;
  client_id: string;
  role: "clientadmin" | "student";
}) => apiFetch("/create-user", { method: "POST", body: JSON.stringify(body) });
