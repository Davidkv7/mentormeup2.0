"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Target, Send } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { useTheme } from "@/contexts/theme-context";
import { useGoals } from "@/contexts/goals-context";
import { api } from "@/lib/api";

interface IntakeMessage {
  message_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface IntakeHistory {
  goal_id: string;
  goal_title: string;
  intake_status:
    | "not_started"
    | "in_progress"
    | "building_path"
    | "building_options"
    | "options_ready"
    | "complete"
    | "failed";
  path_id: string | null;
  messages: IntakeMessage[];
}

export default function IntakePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { activeGoalId, activeGoal, goals } = useGoals();

  const [goalId, setGoalId] = useState<string | null>(activeGoalId);
  const [goalTitle, setGoalTitle] = useState<string>(activeGoal?.title ?? "");
  const [messages, setMessages] = useState<IntakeMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [intakeStatus, setIntakeStatus] = useState<IntakeHistory["intake_status"]>("not_started");
  const [bootstrapped, setBootstrapped] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pick the goal whose intake is most relevant (active if not yet complete,
  // else the newest goal still in intake).
  useEffect(() => {
    if (goalId) return;
    if (activeGoal && activeGoal.id) {
      setGoalId(activeGoal.id);
      setGoalTitle(activeGoal.title);
    } else if (goals.length > 0) {
      const newest = [...goals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      setGoalId(newest.id);
      setGoalTitle(newest.title);
    }
  }, [goalId, activeGoal, goals]);

  // Load intake history for this goal on mount / goal change.
  const loadHistory = useCallback(async () => {
    if (!goalId) return;
    try {
      const h = await api.get<IntakeHistory>(`/api/intake/${goalId}/history`);
      setGoalTitle(h.goal_title);
      setMessages(h.messages);
      setIntakeStatus(h.intake_status);
      // If options have been generated (or are being generated), send the user
      // to the multi-path selector instead of the old "building path" screen.
      if (
        h.intake_status === "building_options" ||
        h.intake_status === "options_ready"
      ) {
        router.replace(`/path/select?goal_id=${goalId}`);
        return;
      }
      // If we're already past the whole flow, jump straight to the path.
      if (h.intake_status === "complete" && h.path_id) {
        router.replace(`/path?goal_id=${goalId}`);
        return;
      }
    } catch (err) {
      // Ignore — user may have no goal yet.
    } finally {
      setBootstrapped(true);
    }
  }, [goalId, router]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // Auto-scroll to latest message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // When intake completes, send them to the multi-path selector.
  useEffect(() => {
    if (intakeStatus !== "building_options" && intakeStatus !== "building_path") return;
    if (!goalId) return;
    // building_path still exists as a legacy state for anything that bypassed
    // Session B — we redirect to /path in that case; otherwise /path/select.
    const target =
      intakeStatus === "building_path"
        ? `/path?goal_id=${goalId}`
        : `/path/select?goal_id=${goalId}`;
    router.replace(target);
  }, [intakeStatus, goalId, router]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !goalId || sending) return;
    setSending(true);
    setDraft("");

    const optimistic: IntakeMessage = {
      message_id: `tmp_${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await api.post<{
        message_id: string;
        reply: string;
        intake_complete: boolean;
        created_at: string;
      }>("/api/intake/chat", { goal_id: goalId, message: text });

      setMessages((prev) => [
        ...prev,
        {
          message_id: res.message_id,
          role: "assistant",
          content: res.reply,
          created_at: res.created_at,
        },
      ]);
      if (res.intake_complete) {
        setIntakeStatus("building_options");
      } else {
        setIntakeStatus("in_progress");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          message_id: `err_${Date.now()}`,
          role: "assistant",
          content: "I couldn't reach the coach just now. Try again in a moment.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const isBuilding = intakeStatus === "building_path";

  return (
    <div
      className={`min-h-screen noise-bg transition-colors duration-300 ${
        isDark ? "bg-[#080B14]" : "bg-[#F8F9FA]"
      }`}
      data-testid="intake-page"
    >
      <SidebarNav />

      <div className="relative md:ml-[72px] lg:ml-[240px] min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`sticky top-0 z-20 px-4 sm:px-6 lg:px-10 py-4 sm:py-5 flex items-center justify-between border-b ${
            isDark ? "border-[rgba(255,255,255,0.04)]" : "border-[rgba(0,0,0,0.06)]"
          }`}
          style={{
            background: isDark
              ? "linear-gradient(180deg, rgba(8,11,20,0.95) 0%, rgba(8,11,20,0.8) 100%)"
              : "linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(248,249,250,0.8) 100%)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-[#F5C518] font-sans font-bold text-base sm:text-lg lg:text-xl">
              {isBuilding ? "Building Your Path" : "Quick Intake"}
            </h1>
            <p className="text-[#00D4FF] font-mono text-[10px] sm:text-xs">
              {goalTitle ? `Goal: ${goalTitle}` : "Select a goal to begin"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#F5C518]" />
            <span
              className={`font-mono text-xs px-2.5 py-1 rounded-full ${
                isDark
                  ? "bg-[rgba(245,197,24,0.1)] text-[#F5C518]"
                  : "bg-[rgba(212,169,18,0.12)] text-[#D4A912]"
              }`}
              data-testid="intake-status-pill"
            >
              {intakeStatus.replace("_", " ")}
            </span>
          </div>
        </motion.header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 pb-[220px] md:pb-40"
          data-testid="intake-messages"
        >
          {!bootstrapped && (
            <p className={`font-mono text-sm ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
              Loading your conversation…
            </p>
          )}

          {bootstrapped && !goalId && (
            <div className="max-w-xl mx-auto text-center mt-20">
              <p className={`font-sans text-lg ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                You don't have a goal yet.
              </p>
              <button
                onClick={() => router.push("/")}
                className="mt-6 px-6 py-3 rounded-full bg-[#F5C518] text-[#080B14] font-sans font-bold"
              >
                Enter a goal →
              </button>
            </div>
          )}

          {bootstrapped && messages.length === 0 && goalId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-2xl mx-auto rounded-2xl p-5 border-l-4 border-l-[#00D4FF] ${
                isDark ? "bg-[rgba(0,212,255,0.06)]" : "bg-[rgba(0,212,255,0.04)]"
              }`}
            >
              <p className={`font-mono text-sm leading-relaxed ${isDark ? "text-[rgba(255,255,255,0.85)]" : "text-[rgba(0,0,0,0.75)]"}`}>
                Say hi and we'll start. I'll ask a few short questions, then build your path.
                Takes about 2 minutes.
              </p>
            </motion.div>
          )}

          <div className="max-w-2xl mx-auto space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.message_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`intake-msg-${m.role}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 font-sans text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-[#F5C518] text-[#080B14]"
                        : isDark
                          ? "bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.9)] border border-[rgba(255,255,255,0.06)]"
                          : "bg-white text-[#1A1D21] border border-[rgba(0,0,0,0.06)]"
                    }`}
                  >
                    {m.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

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
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "240ms" }} />
                  </span>
                </div>
              </div>
            )}

            {isBuilding && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-10 rounded-2xl p-8 text-center border-2 ${
                  isDark
                    ? "bg-[rgba(245,197,24,0.04)] border-[rgba(245,197,24,0.2)]"
                    : "bg-[rgba(245,197,24,0.06)] border-[rgba(212,169,18,0.25)]"
                }`}
                data-testid="intake-building-banner"
              >
                <Sparkles className="w-8 h-8 text-[#F5C518] mx-auto mb-3 animate-pulse" />
                <p className={`font-sans font-semibold text-lg ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                  Building your path…
                </p>
                <p className={`font-mono text-xs mt-2 ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                  Researching your goal, mapping phases, scheduling tasks. ~30 seconds.
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input */}
        {!isBuilding && goalId && (
          <form
            onSubmit={handleSend}
            className={`fixed bottom-[72px] left-0 right-0 md:bottom-0 md:left-[72px] lg:left-[240px] px-4 sm:px-6 lg:px-10 py-4 pb-[calc(16px+env(safe-area-inset-bottom))] md:pb-4 border-t z-30 ${
              isDark ? "bg-[#080B14]/95 border-[rgba(255,255,255,0.06)]" : "bg-[#F8F9FA]/95 border-[rgba(0,0,0,0.06)]"
            }`}
            style={{ backdropFilter: "blur(20px)" }}
          >
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Say hi, or answer the coach's question…"
                disabled={sending}
                data-testid="intake-input"
                className={`flex-1 px-5 py-3.5 rounded-full font-mono text-sm focus:outline-none border ${
                  isDark
                    ? "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-white placeholder:text-[rgba(255,255,255,0.3)] focus:border-[#F5C518]/40"
                    : "bg-white border-[rgba(0,0,0,0.08)] text-[#1A1D21] placeholder:text-[rgba(0,0,0,0.3)] focus:border-[#D4A912]/40"
                } disabled:opacity-60`}
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                data-testid="intake-send"
                className={`p-3.5 rounded-full transition-colors ${
                  draft.trim() && !sending
                    ? "bg-[#F5C518] text-[#080B14] hover:bg-[#FFD633]"
                    : isDark
                      ? "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.3)]"
                      : "bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.3)]"
                }`}
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
