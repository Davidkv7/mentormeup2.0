"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, openSSE, type ApiChatMessage } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useGoals } from "@/contexts/goals-context";
import { logActivity } from "@/lib/activity";

interface StreamingAssistant {
  message_id: string; // temporary id until `done` arrives
  content: string;
  created_at: string;
}

interface UnreadInfo {
  count: number;
  latest: {
    message_id: string;
    kind: string;
    preview: string;
    created_at: string;
  } | null;
}

interface CoachContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: ApiChatMessage[];
  sending: boolean;
  /** Assistant message currently being streamed in (null otherwise). */
  streaming: StreamingAssistant | null;
  /** Count of unread proactive coach messages (for the gold orb pulse). */
  unread: UnreadInfo;
  markSeen: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
}

const CoachContext = createContext<CoachContextValue | undefined>(undefined);

export function CoachProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { refresh: refreshGoals } = useGoals();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState<StreamingAssistant | null>(null);
  const [unread, setUnread] = useState<UnreadInfo>({ count: 0, latest: null });

  const loadHistory = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const history = await api.get<ApiChatMessage[]>(
        "/api/coach/history?limit=100",
      );
      setMessages(history);
    } catch {
      setMessages([]);
    }
  }, [status]);

  const refreshUnread = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const data = await api.get<UnreadInfo>("/api/coach/unread");
      setUnread(data);
    } catch {
      // ignore — keep last value
    }
  }, [status]);

  const markSeen = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      await api.post("/api/coach/mark-seen");
      setUnread({ count: 0, latest: null });
    } catch {
      // ignore
    }
  }, [status]);

  // Poll for unread every 60s. Cheap — backend is one count_documents call.
  useEffect(() => {
    if (status !== "authenticated") {
      setUnread({ count: 0, latest: null });
      return;
    }
    void refreshUnread();
    const handle = setInterval(() => void refreshUnread(), 60_000);
    return () => clearInterval(handle);
  }, [status, refreshUnread]);

  // Auto mark-seen when drawer opens.
  useEffect(() => {
    if (isOpen && unread.count > 0) {
      void markSeen();
    }
  }, [isOpen, unread.count, markSeen]);

  useEffect(() => {
    if (status === "authenticated") {
      void loadHistory();
    } else if (status === "anonymous") {
      setMessages([]);
      setStreaming(null);
      setIsOpen(false);
    }
  }, [status, loadHistory]);

  const abortRef = useRef<AbortController | null>(null);
  const pendingRef = useRef<string>("");
  const renderedRef = useRef<string>("");
  const paintRafRef = useRef<number | null>(null);
  const streamCompleteRef = useRef<boolean>(false);
  const streamingIdRef = useRef<string | null>(null);

  // Character-by-character painter: the Claude proxy delivers deltas in 2-3
  // burst chunks near end-of-generation, which makes "streaming" look like
  // popcorn. This painter smooths the already-received text onto the UI at
  // ~250 chars/second so it reads like word-by-word generation. Runs via
  // requestAnimationFrame so it stays smooth on mobile.
  const PAINT_CHARS_PER_MS = 0.22;

  const stopPaintLoop = useCallback(() => {
    if (paintRafRef.current !== null) {
      cancelAnimationFrame(paintRafRef.current);
      paintRafRef.current = null;
    }
  }, []);

  const runPaintLoop = useCallback(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const pending = pendingRef.current;
      if (pending.length > 0) {
        const allowed = Math.max(1, Math.floor(dt * PAINT_CHARS_PER_MS));
        const take = Math.min(allowed, pending.length);
        const chunk = pending.slice(0, take);
        pendingRef.current = pending.slice(take);
        renderedRef.current += chunk;
        const id = streamingIdRef.current;
        if (id) {
          setStreaming({
            message_id: id,
            content: renderedRef.current,
            created_at: new Date().toISOString(),
          });
        }
      }
      // Stop when stream is complete AND queue is drained.
      if (streamCompleteRef.current && pendingRef.current.length === 0) {
        paintRafRef.current = null;
        return;
      }
      paintRafRef.current = requestAnimationFrame(tick);
    };
    paintRafRef.current = requestAnimationFrame(tick);
  }, []);

  const ensurePaintLoop = useCallback(() => {
    if (paintRafRef.current === null) runPaintLoop();
  }, [runPaintLoop]);

  const sendMessage = useCallback<CoachContextValue["sendMessage"]>(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setSending(true);
      setStreaming(null);

      // Optimistic user message.
      const optimistic: ApiChatMessage = {
        message_id: `tmp_${Date.now()}`,
        user_id: "me",
        role: "user",
        content: trimmed,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      logActivity("coach.message_sent", `User sent coach a message`, {
        preview: trimmed.slice(0, 120),
      });

      const controller = new AbortController();
      abortRef.current = controller;
      let streamStarted = false;
      const streamingId = `streaming_${Date.now()}`;
      const startedAt = new Date().toISOString();
      // Reset the painter buffers for this turn.
      pendingRef.current = "";
      renderedRef.current = "";
      streamCompleteRef.current = false;
      streamingIdRef.current = streamingId;

      // Will be filled when the `done` event arrives — we can't finalize
      // until the painter has drained all queued text.
      let doneData: {
        message_id: string;
        created_at: string;
        content: string;
        actions?: ApiChatMessage["actions"];
      } | null = null;

      try {
        for await (const ev of openSSE(
          "/api/coach/chat/stream",
          { message: trimmed },
          controller.signal,
        )) {
          if (ev.event === "user_message") {
            const data = ev.data as { message_id: string; created_at: string };
            setMessages((prev) =>
              prev.map((m) =>
                m.message_id === optimistic.message_id
                  ? { ...m, message_id: data.message_id, created_at: data.created_at }
                  : m,
              ),
            );
          } else if (ev.event === "delta") {
            const data = ev.data as { text: string };
            if (!data.text) continue;
            if (!streamStarted) {
              streamStarted = true;
              // Show the streaming bubble immediately (empty → grows).
              setStreaming({
                message_id: streamingId,
                content: "",
                created_at: startedAt,
              });
            }
            // Queue the raw text; the painter will flush it to the UI.
            pendingRef.current += data.text;
            ensurePaintLoop();
          } else if (ev.event === "done") {
            doneData = ev.data as {
              message_id: string;
              created_at: string;
              content: string;
              actions?: ApiChatMessage["actions"];
            };
            // Make sure we queue any final text the server added in `content`
            // that we didn't see via deltas (action-tag filtering can trim a
            // bit). Compute the diff and append.
            const alreadyQueued =
              renderedRef.current + pendingRef.current;
            if (
              doneData.content.length > alreadyQueued.length &&
              doneData.content.startsWith(alreadyQueued)
            ) {
              pendingRef.current += doneData.content.slice(alreadyQueued.length);
              ensurePaintLoop();
            }
            streamCompleteRef.current = true;
          } else if (ev.event === "error") {
            const data = ev.data as { detail?: string };
            throw new Error(data.detail ?? "Coach stream failed");
          }
        }

        // Wait for the painter to finish flushing before we hand off to
        // the final assistant message.
        if (doneData) {
          while (pendingRef.current.length > 0) {
            await new Promise((r) => setTimeout(r, 50));
          }
          stopPaintLoop();
          const final: ApiChatMessage = {
            message_id: doneData.message_id,
            user_id: "me",
            role: "assistant",
            content: doneData.content,
            created_at: doneData.created_at,
            actions: doneData.actions ?? [],
          };
          setMessages((prev) => [...prev, final]);
          setStreaming(null);
          streamingIdRef.current = null;
          void refreshGoals();
        }
      } catch (err) {
        stopPaintLoop();
        setStreaming(null);
        streamingIdRef.current = null;
        pendingRef.current = "";
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        if (!aborted) {
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
        }
      } finally {
        abortRef.current = null;
        setSending(false);
      }
    },
    [sending, refreshGoals, ensurePaintLoop, stopPaintLoop],
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo<CoachContextValue>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      messages,
      sending,
      streaming,
      unread,
      markSeen,
      sendMessage,
    }),
    [
      isOpen,
      open,
      close,
      toggle,
      messages,
      sending,
      streaming,
      unread,
      markSeen,
      sendMessage,
    ],
  );

  return <CoachContext.Provider value={value}>{children}</CoachContext.Provider>;
}

export function useCoach() {
  const ctx = useContext(CoachContext);
  if (!ctx) throw new Error("useCoach must be used within CoachProvider");
  return ctx;
}
