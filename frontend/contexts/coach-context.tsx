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
import { api, type ApiChatMessage } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useGoals } from "@/contexts/goals-context";

interface CoachContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: ApiChatMessage[];
  sending: boolean;
  sendMessage: (text: string) => Promise<void>;
}

const CoachContext = createContext<CoachContextValue | undefined>(undefined);

export function CoachProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { refresh: refreshGoals } = useGoals();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const loadHistory = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const history = await api.get<ApiChatMessage[]>("/api/coach/history?limit=100");
      setMessages(history);
    } catch {
      setMessages([]);
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      void loadHistory();
    } else if (status === "anonymous") {
      setMessages([]);
      setIsOpen(false);
    }
  }, [status, loadHistory]);

  const sendMessage = useCallback<CoachContextValue["sendMessage"]>(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setSending(true);
      // Optimistic user message.
      const optimistic: ApiChatMessage = {
        message_id: `tmp_${Date.now()}`,
        user_id: "me",
        role: "user",
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const res = await api.post<{
          message_id: string;
          reply: string;
          created_at: string;
        }>("/api/coach/chat", { message: trimmed });
        const assistant: ApiChatMessage = {
          message_id: res.message_id,
          user_id: "me",
          role: "assistant",
          content: res.reply,
          created_at: res.created_at,
        };
        setMessages((prev) => [...prev, assistant]);
        // Coach may have implied data changes; pull fresh state.
        void refreshGoals();
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            message_id: `err_${Date.now()}`,
            user_id: "me",
            role: "assistant",
            content:
              "I couldn't reach the coaching brain just now. Try again in a moment — your message is saved.",
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [sending, refreshGoals],
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo<CoachContextValue>(
    () => ({ isOpen, open, close, toggle, messages, sending, sendMessage }),
    [isOpen, open, close, toggle, messages, sending, sendMessage],
  );

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

export function useCoach() {
  const ctx = useContext(CoachContext);
  if (!ctx) throw new Error("useCoach must be used within CoachProvider");
  return ctx;
}
