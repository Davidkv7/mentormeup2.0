/**
 * Minimal fetch wrapper for the MentorMeUp backend.
 *
 * Auth strategy — works everywhere including Safari Private Mode:
 * - On login we receive a `session_token` and store it in localStorage.
 * - Every request sends it as `Authorization: Bearer <token>`.
 * - We still send cookies (`credentials: 'include'`) as a belt-and-braces
 *   fallback; browsers that accept the cookie will use it, browsers that
 *   drop it (Safari Private Mode, iOS) use the Bearer header instead.
 * - All requests use RELATIVE URLs so they're first-party to whatever
 *   preview hostname the user is on.
 */
const BASE = process.env.NEXT_PUBLIC_BACKEND_URL_OVERRIDE ?? "";
const TOKEN_KEY = "mentormeup.auth.token";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage blocked (some private modes) — fall back to cookie only.
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  const parsed: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail =
      parsed && typeof parsed === "object" && "detail" in parsed
        ? String((parsed as { detail: unknown }).detail)
        : res.statusText;
    throw new ApiError(res.status, detail, parsed);
  }
  return parsed as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

// ---------- Types shared with backend ----------
export interface AuthUser {
  user_id: string;
  email: string;
  name: string;
  picture: string | null;
  created_at: string;
}

export interface ApiGoalTask {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  goal_id: string;
}

export interface ApiGoalPhase {
  id: string;
  title: string;
  milestones: { id: string; title: string; status: "complete" | "active" | "locked" }[];
}

export interface ApiGoal {
  goal_id: string;
  user_id: string;
  title: string;
  description: string | null;
  color: "gold" | "cyan" | "purple" | "green" | "red";
  status: "active" | "paused" | "completed" | "archived";
  progress: number;
  phases: ApiGoalPhase[];
  current_phase: number;
  daily_tasks: ApiGoalTask[];
  created_at: string;
}

export interface ApiCoachAction {
  tool: string;
  ok: boolean;
  summary: string;
  task_id?: string;
  note_id?: string;
  mood?: string;
  scheduled_date?: string;
}

export interface ApiChatMessage {
  message_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  actions?: ApiCoachAction[];
}

export interface ApiActivityEvent {
  event_id: string;
  user_id: string;
  kind: string;
  summary: string;
  payload: Record<string, unknown>;
  created_at: string;
}
