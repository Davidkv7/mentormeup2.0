"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { logActivity } from "@/lib/activity";

const PAGE_LABELS: Record<string, string> = {
  "/": "Home",
  "/daily": "Daily focus",
  "/goals": "Goals list",
  "/path": "Goal path",
  "/coach": "Coach full page",
  "/intake": "Intake",
  "/notes": "Notes",
  "/notes/new": "New note",
  "/notes/ai-summary": "AI note summary",
  "/calendar": "Calendar",
  "/health": "Health hub",
  "/health/connect": "Health connect",
  "/settings": "Settings",
};

function labelFor(path: string): string {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  // e.g. /notes/123 → "Notes"
  const top = path.split("/").filter(Boolean)[0];
  if (top && PAGE_LABELS[`/${top}`]) return PAGE_LABELS[`/${top}`];
  return path;
}

/**
 * Logs a `page.viewed` activity event every time the authenticated user
 * navigates to a new route. Skips the /login route since activity is
 * user-scoped. Debounces duplicate fires of the same path within a single
 * session mount to avoid flooding the log on fast client re-renders.
 */
export function ActivityTracker() {
  const pathname = usePathname();
  const { status } = useAuth();
  const lastLogged = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!pathname) return;
    if (pathname === "/login") return;
    if (lastLogged.current === pathname) return;
    lastLogged.current = pathname;
    logActivity("page.viewed", `Viewed ${labelFor(pathname)}`, { path: pathname });
  }, [pathname, status]);

  return null;
}
