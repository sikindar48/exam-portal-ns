/**
 * Turso API client
 * Drop-in replacement for supabase.from() data calls.
 * Auth (signIn/signOut/session) still goes through Supabase.
 */

import { supabase } from "@/integrations/supabase/client";

const API_BASE = "/api";

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
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

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const json = await res.json();

    if (!res.ok) return { data: null, error: { message: json.error ?? res.statusText } };
    return { data: json as T, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message ?? "Network error" } };
  }
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

// ── Create User (replaces Edge Function) ─────────────────────────────────────

export const createUser = (body: {
  email: string;
  password: string;
  name: string;
  client_id: string;
  role: "clientadmin" | "student";
}) => apiFetch("/create-user", { method: "POST", body: JSON.stringify(body) });
