/**
 * Fire-and-forget activity logger.
 *
 * The AI Coach reads the last N activity events on every turn to build its
 * live context. Logging frontend-driven behaviour (page visits, task views,
 * coach messages, moods) lets the coach react to *how* the user is actually
 * using the app — not just what's in the database.
 *
 * We deliberately never await the POST and never surface errors — this must
 * be zero-friction for the UI layer.
 */
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/api";

export type ActivityKind =
  | "page.viewed"
  | "task.viewed"
  | "mood.logged"
  | "coach.message_sent"
  | "goal.switched";

export function logActivity(
  kind: ActivityKind | string,
  summary: string,
  payload: Record<string, unknown> = {},
): void {
  // Only log when authenticated — activity events are user-scoped.
  if (!getAuthToken()) return;
  // Fire and forget. Intentionally not awaited.
  void api
    .post("/api/activity", { kind, summary, payload })
    .catch(() => {
      // Silently drop — activity logging must never break the UX.
    });
}
