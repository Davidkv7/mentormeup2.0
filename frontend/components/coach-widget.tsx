"use client";

import { AnimatePresence, motion } from "motion/react";
import { Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCoach } from "@/contexts/coach-context";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";

/**
 * CoachWidget
 *
 * Renders a floating orb button in the bottom-right of every authenticated
 * page. Clicking the orb opens a side drawer with the live Claude-powered
 * coach thread.
 */
export function CoachWidget() {
  const { status } = useAuth();
  const { isOpen, open, close, messages, sending, sendMessage } = useCoach();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Always pin the chat to the latest message.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen, sending]);

  if (status !== "authenticated") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft;
    setDraft("");
    await sendMessage(text);
  };

  return (
    <>
      {/* Floating orb */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="coach-orb"
            type="button"
            onClick={open}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            data-testid="coach-orb"
            className="fixed bottom-[84px] right-4 sm:bottom-7 sm:right-7 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-[0_8px_28px_rgba(245,197,24,0.35)]"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, #FFD633 0%, #F5C518 45%, #D4A912 100%)",
            }}
            aria-label="Open coach"
          >
            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-[#080B14]" />
            <span className="absolute inset-0 rounded-full animate-ping bg-[#F5C518]/30" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="coach-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={close}
              data-testid="coach-backdrop"
            />
            <motion.aside
              key="coach-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
              data-testid="coach-drawer"
              className={`fixed top-0 right-0 z-50 h-[100dvh] w-full sm:w-[420px] md:w-[460px] flex flex-col border-l ${
                isDark
                  ? "bg-[#080B14] border-[rgba(255,255,255,0.06)]"
                  : "bg-[#F8F9FA] border-[rgba(0,0,0,0.06)]"
              }`}
            >
              {/* Header */}
              <div
                className={`flex items-center justify-between px-5 py-4 border-b ${
                  isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.06)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, #FFD633 0%, #F5C518 45%, #D4A912 100%)",
                    }}
                  >
                    <Sparkles className="w-4 h-4 text-[#080B14]" />
                  </div>
                  <div>
                    <p
                      className={`font-sans font-semibold text-sm ${
                        isDark ? "text-white" : "text-[#1A1D21]"
                      }`}
                    >
                      Your Coach
                    </p>
                    <p
                      className={`font-mono text-[10px] ${
                        isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"
                      }`}
                    >
                      Claude Sonnet 4.6 · knows your goals
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close coach"
                  data-testid="coach-close"
                  className={`p-2 rounded-lg transition-colors ${
                    isDark
                      ? "text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
                      : "text-[rgba(0,0,0,0.5)] hover:text-black hover:bg-[rgba(0,0,0,0.04)]"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
                data-testid="coach-messages"
              >
                {messages.length === 0 && (
                  <div
                    className={`rounded-2xl p-4 border-l-4 border-l-[#00D4FF] ${
                      isDark ? "bg-[rgba(0,212,255,0.06)]" : "bg-[rgba(0,212,255,0.04)]"
                    }`}
                  >
                    <p
                      className={`font-mono text-sm leading-relaxed ${
                        isDark ? "text-[rgba(255,255,255,0.85)]" : "text-[rgba(0,0,0,0.75)]"
                      }`}
                    >
                      I&apos;m your coach. Tell me the one goal you want to make real — or ask me
                      to review the goals you already have. I remember every step you take.
                    </p>
                  </div>
                )}

                {messages.map((m) => (
                  <div
                    key={m.message_id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 font-sans text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-[#F5C518] text-[#080B14]"
                          : isDark
                            ? "bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.9)] border border-[rgba(255,255,255,0.06)]"
                            : "bg-[rgba(0,0,0,0.04)] text-[#1A1D21] border border-[rgba(0,0,0,0.06)]"
                      }`}
                      data-testid={`coach-msg-${m.role}`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex justify-start">
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                        isDark
                          ? "bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.5)]"
                          : "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]"
                      }`}
                    >
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "120ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "240ms" }} />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className={`border-t px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] flex items-center gap-2 ${
                  isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.06)]"
                }`}
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Talk to your coach…"
                  disabled={sending}
                  data-testid="coach-input"
                  className={`flex-1 px-4 py-2.5 rounded-xl font-mono text-sm focus:outline-none border ${
                    isDark
                      ? "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[rgba(255,255,255,0.3)] focus:border-[#F5C518]/40"
                      : "bg-white border-[rgba(0,0,0,0.08)] text-[#1A1D21] placeholder:text-[rgba(0,0,0,0.3)] focus:border-[#D4A912]/40"
                  } disabled:opacity-60`}
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  data-testid="coach-send"
                  className={`p-2.5 rounded-xl transition-colors font-semibold ${
                    draft.trim() && !sending
                      ? "bg-[#F5C518] text-[#080B14] hover:bg-[#FFD633]"
                      : isDark
                        ? "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.3)]"
                        : "bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.3)]"
                  }`}
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
