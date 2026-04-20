"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

/**
 * OAuthCallbackHandler
 *
 * Detects Emergent's `#session_id=...` in the URL fragment, exchanges it with
 * the backend (which sets the httpOnly cookie), then cleans the URL and
 * refreshes the auth context. Render it once, near the top of the tree.
 *
 * IMPORTANT: initial render must produce IDENTICAL output on server and
 * client, because `window.location.hash` is never visible to the server (the
 * fragment is never sent in HTTP requests). Reading the hash synchronously
 * during the initial render causes a hydration mismatch. Instead, we always
 * start with `processing=false`, and decide whether to show the overlay in a
 * useEffect that only runs on the client.
 */
export function OAuthCallbackHandler() {
  const router = useRouter();
  const { refresh } = useAuth();
  const didRun = useRef(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (didRun.current) return;
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.includes("session_id=")) return;
    didRun.current = true;
    setProcessing(true);

    const sessionId = new URLSearchParams(hash.replace(/^#/, "")).get("session_id");
    if (!sessionId) {
      setProcessing(false);
      return;
    }

    (async () => {
      try {
        await api.post("/api/auth/session", { session_id: sessionId });
      } catch {
        // Bad/expired session_id — we'll just end up anonymous.
      } finally {
        // Strip the hash so a refresh doesn't try to re-exchange a spent id.
        const url = window.location.pathname + window.location.search;
        window.history.replaceState(null, "", url);
        // CRITICAL: always refresh, even on failure, so AuthProvider leaves
        // its "loading" state (it skipped /me while the hash was present).
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
