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
 * The detection is done during the first render so it beats any race with a
 * sibling `useEffect` that tries to hit `/api/auth/me`.
 */
export function OAuthCallbackHandler() {
  const router = useRouter();
  const { refresh } = useAuth();
  const didRun = useRef(false);
  const [processing, setProcessing] = useState(
    () => typeof window !== "undefined" && window.location.hash.includes("session_id="),
  );

  useEffect(() => {
    if (didRun.current) return;
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.includes("session_id=")) return;
    didRun.current = true;

    const sessionId = new URLSearchParams(hash.replace(/^#/, "")).get("session_id");
    if (!sessionId) {
      setProcessing(false);
      return;
    }

    (async () => {
      try {
        await api.post("/api/auth/session", { session_id: sessionId });
        await refresh();
      } catch {
        // Fall through — user will see login page if auth fails.
      } finally {
        // Strip the hash so a refresh doesn't try to re-exchange a spent id.
        const url = window.location.pathname + window.location.search;
        window.history.replaceState(null, "", url);
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
