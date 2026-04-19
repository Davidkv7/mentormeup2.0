"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

const PUBLIC_PATHS = new Set<string>(["/login"]);

/**
 * Redirects unauthenticated users to /login (except for public routes).
 * Shows a minimal full-screen placeholder while auth status is being
 * determined, to avoid rendering protected UI that will flash and redirect.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.has(pathname ?? "/");

  useEffect(() => {
    if (isPublic) return;
    if (status === "anonymous") router.replace("/login");
  }, [status, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (status === "loading")
    return (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-[#080B14]"
        data-testid="auth-gate-loading"
      >
        <p className="font-mono text-sm text-[rgba(255,255,255,0.5)]">Loading…</p>
      </div>
    );
  if (status === "anonymous") return null;
  return <>{children}</>;
}
