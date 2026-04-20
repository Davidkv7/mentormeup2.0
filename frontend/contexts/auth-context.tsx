"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, setAuthToken, type AuthUser } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  status: "loading" | "authenticated" | "anonymous";
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<AuthUser>("/api/auth/me");
      setUser(me);
      setStatus("authenticated");
    } catch (err) {
      // Any failure → anonymous. Also clear any stale stored token so we
      // don't keep sending a dead Bearer header.
      if (err instanceof ApiError && err.status === 401) {
        setAuthToken(null);
      }
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Ignore; we'll clear local state regardless.
    }
    setAuthToken(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    // If returning from OAuth, the OAuthCallbackHandler exchanges the
    // session_id first and then calls refresh() itself. Skip /me here so we
    // don't race and 401 against a not-yet-set cookie.
    if (typeof window !== "undefined" && window.location.hash.includes("session_id=")) {
      // Safety net: if the callback handler silently fails and never refreshes
      // us, don't leave the UI stuck on the loading screen forever.
      const timer = setTimeout(() => {
        setStatus((s) => (s === "loading" ? "anonymous" : s));
      }, 8000);
      return () => clearTimeout(timer);
    }
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, refresh, logout }),
    [user, status, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
