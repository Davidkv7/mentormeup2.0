"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setAuthToken, type AuthUser } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

/**
 * OAuthCallbackHandler
 *
 * Detects Emergent's `#session_id=...` URL fragment, exchanges it with the
 * backend (which sets the httpOnly cookie), then cleans up and refreshes auth.
 *
 * HARD PROBLEMS SOLVED HERE
 *
 * 1) Hydration mismatch — `window.location.hash` is NEVER sent to the server,
 *    so any render that reads the hash produces different markup on server vs
 *    client. We always render null on first render; the hash is only read
 *    inside useEffect (client-only).
 *
 * 2) Double-fire — React dev mode, hot reload, route changes, and layout shifts
 *    all cause components to mount twice. Emergent's `session-data` endpoint is
 *    SINGLE USE — a second POST with the same session_id returns 404. The 2nd
 *    request would appear to fail and bounce the user back to /login.
 *    Fix: a MODULE-level Set of handled session_ids, and we also clear the
 *    hash synchronously before firing the POST so the 2nd mount sees no hash.
 */
const consumedSessionIds = new Set<string>();

export function OAuthCallbackHandler() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.includes("session_id=")) return;

    const sessionId = new URLSearchParams(hash.replace(/^#/, "")).get("session_id");
    if (!sessionId) return;

    // Have we already processed this id in this tab? (handles re-mounts)
    if (consumedSessionIds.has(sessionId)) return;
    consumedSessionIds.add(sessionId);

    // Strip the hash IMMEDIATELY — synchronously, before any async work —
    // so a concurrent mount can't read it and re-fire the POST.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setProcessing(true);

    (async () => {
      try {
        const res = await api.post<{ session_token: string; user: AuthUser }>(
          "/api/auth/session",
          { session_id: sessionId },
        );
        // Safari Private Mode blocks cookies — persist the token in
        // localStorage so the subsequent /api/auth/me call can authenticate
        // via the Authorization: Bearer header.
        if (res.session_token) setAuthToken(res.session_token);
      } catch {
        // Expired / invalid session_id — refresh will end us up anonymous.
      } finally {
        try {
          await refresh();
        } catch {
          // ignore
        }
        setProcessing(false);
        router.replace("/");
      }
    })();
  }, [refresh, router]);

  if (!processing) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#080B14]/95 backdrop-blur-sm"
      data-testid="oauth-callback-overlay"
    >
      <p className="font-mono text-sm text-[#00D4FF]">Signing you in…</p>
    </div>
  );
}
