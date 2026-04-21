"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, Calendar, Target, Sparkles } from "lucide-react";
import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { AnimatedOrb } from "@/components/animated-orb";
import { QuickReplyChips } from "@/components/quick-reply-chips";
import { useTheme } from "@/contexts/theme-context";
import { useCoach } from "@/contexts/coach-context";
import { useGoals } from "@/contexts/goals-context";

const quickReplies = [
  "I'm struggling",
  "What should I focus on today?",
  "Reschedule today's task",
];

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export default function CoachChatPage() {
  const { messages, sending, streaming, sendMessage, unread, markSeen } = useCoach();
  const { activeGoal } = useGoals();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Hide chips after the first user message.
  const showChips = messages.filter((m) => m.role === "user").length === 0;

  // Opening the dedicated /coach page counts as "seeing" the coach.
  useEffect(() => {
    if (unread.count > 0) void markSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, streaming?.content]);

  const handleSend = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setInputValue("");
    await sendMessage(trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSend(inputValue);
  };

  // Pull today's phase + next incomplete micro-task hints out of the active goal.
  const currentPhaseLabel = activeGoal
    ? (activeGoal.phases[activeGoal.currentPhase]?.title ??
      `Phase ${activeGoal.currentPhase + 1}`)
    : null;
  const todaysTasks = activeGoal?.dailyTasks ?? [];

  return (
    <div className="min-h-screen bg-background noise-bg transition-colors duration-300" data-testid="coach-page">
      <SidebarNav />

      {/* Main Content */}
      <div className="md:ml-[72px] lg:ml-[240px] flex min-h-screen">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top Bar - Desktop */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
            className="hidden md:flex items-center justify-between sticky top-0 z-40 px-6 lg:px-8 py-5"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, rgba(8, 11, 20, 0.95) 0%, rgba(8, 11, 20, 0.8) 100%)'
                : 'linear-gradient(180deg, rgba(248, 249, 250, 0.95) 0%, rgba(248, 249, 250, 0.8) 100%)',
              backdropFilter: 'blur(20px)',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="flex items-center gap-4">
              <AnimatedOrb size={40} />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-sans font-bold text-lg lg:text-xl text-foreground">
                    Your Coach
                  </h1>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5C518] opacity-75" />
                    <span className="relative inline-flex rounded-full h-full w-full bg-[#F5C518] shadow-[0_0_8px_rgba(245,197,24,0.6)]" />
                  </span>
                </div>
                <p className="font-mono text-xs text-[#00D4FF]" data-testid="coach-context-line">
                  {activeGoal
                    ? `${activeGoal.title}${currentPhaseLabel ? ` — ${currentPhaseLabel}` : ""}`
                    : "Claude Sonnet 4.6 · knows your goals"}
                </p>
              </div>
            </div>
          </motion.header>

          {/* Mobile context header */}
          <div className="md:hidden pt-16 px-4 pb-3 flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5C518] opacity-75" />
              <span className="relative inline-flex rounded-full h-full w-full bg-[#F5C518]" />
            </span>
            <p className="font-mono text-[10px] text-[#00D4FF]">
              {activeGoal
                ? `${activeGoal.title}${currentPhaseLabel ? ` — ${currentPhaseLabel}` : ""}`
                : "Your Coach"}
            </p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-48 lg:pb-40" data-testid="coach-page-messages">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
                  className="flex gap-3 lg:gap-4 justify-start"
                >
                  <div className="flex-shrink-0 mt-1 hidden sm:block">
                    <AnimatedOrb size={36} />
                  </div>
                  <div className="max-w-[85%] sm:max-w-[80%] lg:max-w-[75%]">
                    <div
                      className="rounded-2xl rounded-bl-md p-4 lg:p-5"
                      style={{
                        background: isDark
                          ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                        backdropFilter: 'blur(24px)',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
                        borderLeft: '2px solid #00D4FF',
                      }}
                    >
                      <p className="text-sm lg:text-base text-foreground leading-relaxed">
                        I&apos;m your coach. I have full context on {activeGoal ? `your goal "${activeGoal.title}"` : "your goals"} and every step you&apos;ve taken so far. Tell me what&apos;s on your mind — or pick one of the prompts below.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {messages.map((message, index) => {
                const isUser = message.role === "user";
                return (
                  <motion.div
                    key={message.message_id}
                    initial={{
                      opacity: 0,
                      x: isUser ? 20 : -20,
                      y: 10,
                    }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3), ease: [0.25, 0.4, 0.25, 1] }}
                    className={`flex gap-3 lg:gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                    data-testid={`coach-page-msg-${message.role}`}
                  >
                    {!isUser && (
                      <div className="flex-shrink-0 mt-1 hidden sm:block">
                        <AnimatedOrb size={36} />
                      </div>
                    )}

                    <div className={`max-w-[85%] sm:max-w-[80%] lg:max-w-[75%] ${isUser ? "order-first" : ""}`}>
                      <div
                        className={`rounded-2xl p-4 lg:p-5 ${isUser ? "rounded-br-md" : "rounded-bl-md"}`}
                        style={{
                          background: !isUser
                            ? isDark
                              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)'
                            : isDark
                              ? 'linear-gradient(135deg, rgba(245, 197, 24, 0.12) 0%, rgba(245, 197, 24, 0.04) 100%)'
                              : 'linear-gradient(135deg, rgba(245, 197, 24, 0.2) 0%, rgba(245, 197, 24, 0.08) 100%)',
                          backdropFilter: 'blur(24px)',
                          border: !isUser
                            ? isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)'
                            : isDark ? '1px solid rgba(245, 197, 24, 0.2)' : '1px solid rgba(212, 169, 18, 0.3)',
                          borderLeft: !isUser ? '2px solid #00D4FF' : undefined,
                          boxShadow: !isUser
                            ? isDark
                              ? '0 4px 20px rgba(0, 0, 0, 0.15), -4px 0 16px rgba(0, 212, 255, 0.08)'
                              : '0 4px 20px rgba(0, 0, 0, 0.05), -4px 0 16px rgba(0, 212, 255, 0.1)'
                            : isDark
                              ? '0 4px 20px rgba(245, 197, 24, 0.08)'
                              : '0 4px 20px rgba(212, 169, 18, 0.12)',
                        }}
                      >
                        <p className="text-sm lg:text-base text-foreground leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>

                      {/* Gold action chips under assistant messages that came with tool calls */}
                      {!isUser && message.actions && message.actions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2" data-testid={`coach-page-actions-${message.message_id}`}>
                          {message.actions.map((action, i) => (
                            <span
                              key={`${message.message_id}-action-${i}`}
                              data-testid={`coach-page-action-chip-${action.tool}`}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] leading-none ${
                                action.ok
                                  ? isDark
                                    ? "bg-[rgba(245,197,24,0.12)] border border-[rgba(245,197,24,0.3)] text-[#F5C518]"
                                    : "bg-[rgba(212,169,18,0.12)] border border-[rgba(212,169,18,0.3)] text-[#D4A912]"
                                  : isDark
                                    ? "bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.3)] text-[#EF4444]"
                                    : "bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] text-[#B91C1C]"
                              }`}
                            >
                              {action.ok ? "✓" : "⚠"} {action.summary}
                            </span>
                          ))}
                        </div>
                      )}

                      <p
                        className={`font-mono text-[10px] lg:text-[11px] text-muted-foreground mt-2 ${
                          isUser ? "text-right" : "text-left"
                        }`}
                      >
                        {formatTimestamp(message.created_at)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}

              {/* Typing indicator while Claude is thinking — cross-fades into
                   the streaming bubble as soon as the first delta arrives. */}
              {sending && (
                <div
                  data-testid="coach-page-stream-slot"
                  className="flex gap-3 lg:gap-4 justify-start"
                >
                  <div className="flex-shrink-0 mt-1 hidden sm:block">
                    <AnimatedOrb size={36} />
                  </div>
                  <AnimatePresence mode="wait">
                    {streaming ? (
                      <motion.div
                        key="page-streaming-bubble"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.25, 0.4, 0.25, 1] }}
                        className="max-w-[85%] sm:max-w-[80%] lg:max-w-[75%] rounded-2xl rounded-bl-md p-4 lg:p-5"
                        data-testid="coach-page-streaming-bubble"
                        style={{
                          background: isDark
                            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                          backdropFilter: 'blur(24px)',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
                          borderLeft: '2px solid #00D4FF',
                        }}
                      >
                        <p className="text-sm lg:text-base text-foreground leading-relaxed whitespace-pre-wrap">
                          {streaming.content}
                          <motion.span
                            aria-hidden
                            className="inline-block w-[7px] h-[1em] align-[-2px] ml-[2px] bg-[#00D4FF] rounded-[1px]"
                            animate={{ opacity: [1, 0.2, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                          />
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="page-typing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-2xl rounded-bl-md px-4 py-3"
                        data-testid="coach-page-typing"
                        style={{
                          background: isDark
                            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                          backdropFilter: 'blur(24px)',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
                          borderLeft: '2px solid #00D4FF',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
            className="fixed bottom-0 left-0 md:left-[72px] lg:left-[240px] right-0 lg:right-[320px] xl:right-[360px] pt-6 pb-20 md:pb-6 px-4 sm:px-6 lg:px-8"
            style={{
              background: isDark
                ? 'linear-gradient(0deg, rgba(8, 11, 20, 1) 0%, rgba(8, 11, 20, 0.95) 60%, transparent 100%)'
                : 'linear-gradient(0deg, rgba(248, 249, 250, 1) 0%, rgba(248, 249, 250, 0.95) 60%, transparent 100%)',
            }}
          >
            <div className="max-w-3xl mx-auto space-y-3">
              {/* Quick Reply Chips */}
              <QuickReplyChips
                chips={quickReplies}
                onSelect={(chip) => void handleSend(chip)}
                visible={showChips && !sending}
              />

              {/* Input Bar */}
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl p-2 lg:p-2.5 flex items-center gap-2"
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                  backdropFilter: 'blur(24px)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: isDark ? '0 4px 24px rgba(0, 0, 0, 0.2)' : '0 4px 24px rgba(0, 0, 0, 0.08)',
                }}
                data-testid="coach-page-input-form"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Message your coach..."
                  disabled={sending}
                  data-testid="coach-page-input"
                  className={`flex-1 bg-transparent font-mono text-sm lg:text-base text-foreground outline-none py-2 px-3 disabled:opacity-60 ${isDark ? "placeholder:text-[#4A5568]" : "placeholder:text-[#9CA3AF]"}`}
                />

                <button
                  type="submit"
                  disabled={!inputValue.trim() || sending}
                  data-testid="coach-page-send"
                  className="p-3 bg-[#F5C518] text-[#080B14] rounded-xl hover:bg-[#FFD633] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 pulse-glow shadow-[0_4px_16px_rgba(245,197,24,0.3)]"
                  aria-label="Send message"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar - Desktop only */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="hidden lg:block w-[320px] xl:w-[360px] p-6 overflow-y-auto"
          style={{
            borderLeft: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.06)',
            background: isDark
              ? 'linear-gradient(180deg, rgba(8, 11, 20, 0.6) 0%, rgba(8, 11, 20, 0.9) 100%)'
              : 'linear-gradient(180deg, rgba(248, 249, 250, 0.6) 0%, rgba(248, 249, 250, 0.9) 100%)',
          }}
          data-testid="coach-page-context-panel"
        >
          <h3 className="font-sans text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">
            Context
          </h3>

          {/* Current Goal */}
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-4 h-4 text-[#F5C518]" />
              <span className="font-mono text-xs text-muted-foreground">Current Goal</span>
            </div>
            {activeGoal ? (
              <>
                <p className="font-sans font-semibold text-foreground" data-testid="coach-page-goal-title">
                  {activeGoal.title}
                </p>
                {currentPhaseLabel && (
                  <p className="font-mono text-xs text-[#00D4FF] mt-1">
                    {currentPhaseLabel}
                  </p>
                )}
              </>
            ) : (
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                No active goal yet.{" "}
                <Link href="/" className="text-[#F5C518] hover:underline">
                  Create one
                </Link>{" "}
                to give your coach something to work on.
              </p>
            )}
          </div>

          {/* Today's Focus */}
          {todaysTasks.length > 0 && (
            <div className="glass-card p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-4 h-4 text-[#00D4FF]" />
                <span className="font-mono text-xs text-muted-foreground">Today&apos;s Focus</span>
              </div>
              <ul className="space-y-2" data-testid="coach-page-todays-focus">
                {todaysTasks.slice(0, 4).map((task) => (
                  <li key={task.id} className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        task.completed
                          ? "bg-[#22C55E]"
                          : "bg-[#F5C518]"
                      }`}
                    />
                    <span
                      className={`font-mono text-sm ${
                        task.completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground/80"
                      }`}
                    >
                      {task.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coach Info */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="w-4 h-4 text-[#9D4EDD]" />
              <span className="font-mono text-xs text-muted-foreground">About Your Coach</span>
            </div>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              Powered by Claude Sonnet 4.6. Your coach adapts to your communication style, remembers every conversation, and can act on your plan — completing tasks, rescheduling, logging mood, or saving notes for you.
            </p>
          </div>

          {activeGoal && (
            <div className={`mt-6 pt-6 border-t ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.06)]"}`}>
              <Link
                href="/path"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-mono text-sm text-[#F5C518] bg-[rgba(245,197,24,0.08)] hover:bg-[rgba(245,197,24,0.12)] transition-colors"
                data-testid="coach-page-view-path"
              >
                View Full Path
              </Link>
            </div>
          )}
        </motion.aside>
      </div>
    </div>
  );
}
