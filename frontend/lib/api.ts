/**
 * Minimal fetch wrapper for the MentorMeUp backend.
 * - Uses a RELATIVE URL (no host prefix) so every request is first-party to
 *   whatever preview hostname the browser is on — this is required because
 *   the Emergent preview serves the app from multiple hosts (e.g.
 *   mentor-hub-141.preview.emergentagent.com AND the id-based one), and the
 *   httpOnly auth cookie must be first-party or mobile browsers will silently
 *   drop it (iOS Safari / Chrome third-party cookie blocking).
 * - Always sends credentials so the cookie rides along.
 * - Throws a typed ApiError on non-2xx so callers can react.
 */
// Empty base ⇒ relative URLs (same-origin fetch). A user-provided
// NEXT_PUBLIC_BACKEND_URL is still respected as an explicit override (useful
// for local dev hitting a separate backend).
const BASE = process.env.NEXT_PUBLIC_BACKEND_URL_OVERRIDE ?? "";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
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

export interface ApiChatMessage {
  message_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ApiActivityEvent {
  event_id: string;
  user_id: string;
  kind: string;
  summary: string;
  payload: Record<string, unknown>;
  created_at: string;
}
