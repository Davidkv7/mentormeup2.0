"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { User, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { AnimatedOrb } from "@/components/animated-orb";
import { TaskCard } from "@/components/task-card";
import { SidebarNav } from "@/components/sidebar-nav";
import { HealthSnapshot } from "@/components/health-snapshot";
import { useGoals } from "@/contexts/goals-context";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { api, ApiError } from "@/lib/api";

type Mood = "great" | "ok" | "drained";

interface TodayMicroTask {
  task_id: string;
  title: string;
  duration_minutes: number;
  why_today: string;
  mood_today: Mood | null;
  completed: boolean;
  scheduled_date?: string;
  order: number;
}

interface TodayResponse {
  task: TodayMicroTask | null;
  step_title?: string;
  step_why?: string;
  milestone_title?: string;
  phase_title?: string;
  goal_title?: string;
  goal_id?: string;
  path_id?: string;
  message?: string;
}

const MOODS: { key: Mood; emoji: string; label: string }[] = [
  { key: "great", emoji: "😤", label: "Great" },
  { key: "ok", emoji: "😐", label: "Okay" },
  { key: "drained", emoji: "😓", label: "Drained" },
];

export default function DailyFocusPage() {
  const { activeGoal } = useGoals();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [today, setToday] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const goalId = activeGoal?.id ?? null;

  const loadToday = useCallback(async () => {
    if (!goalId) {
      setToday(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<TodayResponse>(`/api/paths/${goalId}/today`);
      setToday(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("no_path");
      } else {
        setError("load_failed");
      }
      setToday(null);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    void loadToday();
  }, [loadToday]);

  const handleToggleComplete = useCallback(async () => {
    if (!goalId || !today?.task || mutating) return;
    setMutating(true);
    try {
      await api.post(`/api/paths/${goalId}/tasks/${today.task.task_id}/toggle`, {
        completed: !today.task.completed,
      });
      await loadToday();
    } finally {
      setMutating(false);
    }
  }, [goalId, today, mutating, loadToday]);

  const handleMood = useCallback(
    async (mood: Mood) => {
      if (!goalId || !today?.task || mutating) return;
      setMutating(true);
      // Optimistic update
      setToday((prev) =>
        prev && prev.task
          ? { ...prev, task: { ...prev.task, mood_today: mood } }
          : prev,
      );
      try {
        await api.post(`/api/paths/${goalId}/tasks/${today.task.task_id}/toggle`, {
          mood_today: mood,
        });
      } finally {
        setMutating(false);
      }
    },
    [goalId, today, mutating],
  );

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="noise-bg min-h-screen bg-background transition-colors duration-300">
      <SidebarNav />

      <div className={`fixed inset-0 ${isDark ? "bg-[radial-gradient(ellipse_at_center,rgba(0,212,255,0.06)_0%,transparent_50%)]" : "bg-[radial-gradient(ellipse_at_center,rgba(0,153,204,0.04)_0%,transparent_50%)]"}`} />
      <div className={`fixed inset-0 ${isDark ? "bg-[radial-gradient(ellipse_at_top,rgba(245,197,24,0.04)_0%,transparent_40%)]" : "bg-[radial-gradient(ellipse_at_top,rgba(212,169,18,0.03)_0%,transparent_40%)]"}`} />

      <div className="relative md:ml-[72px] lg:ml-[240px] min-h-screen pb-24 md:pb-8">
        {/* Top Bar - Desktop */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          className={`hidden md:flex items-center justify-between px-6 lg:px-10 py-6 sticky top-0 z-30 backdrop-blur-xl ${
            isDark ? "bg-[rgba(8,11,20,0.9)]" : "bg-[rgba(248,249,250,0.9)]"
          }`}
        >
          <div>
            <Link href="/" className={`font-sans text-xl lg:text-2xl font-bold tracking-[0.02em] ${isDark ? "text-[#F5C518]" : "text-[#D4A912]"}`}>
              MentorMeUp
            </Link>
            <p className={`font-mono text-xs lg:text-sm mt-1 ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
              {todayLabel}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`font-mono text-sm hidden lg:block ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
              Good morning, {firstName}
            </span>
            <div className={`flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full border backdrop-blur-xl ${
              isDark ? "border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)]" : "border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.8)]"
            }`}>
              <User className={`h-5 w-5 ${isDark ? "text-[rgba(255,255,255,0.6)]" : "text-[rgba(0,0,0,0.5)]"}`} />
            </div>
          </div>
        </motion.header>

        <div className="md:hidden flex flex-col items-center pt-16 pb-4 px-4">
          <span className={`font-mono text-xs ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
            {todayLabel}
          </span>
          <h1 className={`font-sans text-lg font-bold mt-2 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
            Good morning, {firstName}
          </h1>
        </div>

        <div className="px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
          <div className="mb-6 lg:mb-8">
            <HealthSnapshot
              readinessScore={84}
              sleepDuration="7h 20m"
              hrv={61}
              aiInsight="Good recovery today. Lock in the task below before 10am while you're fresh."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Left Column */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6 lg:space-y-8">
              {/* Coach message tied to today's task */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
                className="glass-card-cyan p-5 lg:p-6"
                data-testid="daily-coach-message"
              >
                <div className="flex gap-4 lg:gap-5">
                  <div className="flex-shrink-0">
                    <AnimatedOrb size={48} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CoachMessage
                      loading={loading}
                      today={today}
                      error={error}
                      hasActiveGoal={!!activeGoal}
                      firstName={firstName}
                      isDark={isDark}
                    />
                    <Link
                      href="/coach"
                      className={`inline-flex items-center gap-2 mt-4 font-mono text-sm transition-colors group ${isDark ? "text-[#F5C518] hover:text-[#FFD633]" : "text-[#D4A912] hover:text-[#B8941A]"}`}
                    >
                      Open coach
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* Today's focus */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className={`font-sans text-lg lg:text-xl font-bold ${isDark ? "text-[#F5C518]" : "text-[#D4A912]"}`}>
                    Today&apos;s Focus
                  </h2>
                  {today?.task && (
                    <span className={`font-mono text-xs ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
                      {today.task.duration_minutes} min
                    </span>
                  )}
                </div>

                {loading && (
                  <div className={`glass-card p-6 flex items-center gap-3 ${isDark ? "text-[rgba(255,255,255,0.6)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-mono text-sm">Loading today&apos;s focus…</span>
                  </div>
                )}

                {!loading && !activeGoal && (
                  <div className="glass-card p-6" data-testid="daily-no-goal">
                    <p className={`font-sans text-base font-semibold mb-1 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                      Pick a goal to get your daily focus.
                    </p>
                    <p className={`font-mono text-xs mb-4 ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                      Your coach needs something to aim at before it can show you today&apos;s task.
                    </p>
                    <Link
                      href="/goals"
                      className={`inline-flex items-center gap-2 font-mono text-sm ${isDark ? "text-[#F5C518]" : "text-[#D4A912]"}`}
                    >
                      Choose a goal
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {!loading && activeGoal && error === "no_path" && (
                  <div className="glass-card p-6" data-testid="daily-no-path">
                    <p className={`font-sans text-base font-semibold mb-1 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                      No path yet for this goal.
                    </p>
                    <p className={`font-mono text-xs mb-4 ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                      Run the intake and your coach will build the path, then today&apos;s task lands here.
                    </p>
                    <Link
                      href={`/intake?goal_id=${goalId}`}
                      className={`inline-flex items-center gap-2 font-mono text-sm ${isDark ? "text-[#F5C518]" : "text-[#D4A912]"}`}
                    >
                      Start intake
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {!loading && activeGoal && !error && today && !today.task && (
                  <div className="glass-card p-6 text-center" data-testid="daily-all-done">
                    <Sparkles className={`mx-auto mb-3 h-6 w-6 ${isDark ? "text-[#F5C518]" : "text-[#D4A912]"}`} />
                    <p className={`font-sans text-base font-semibold ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                      All tasks complete. Incredible.
                    </p>
                    <p className={`font-mono text-xs mt-1 ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                      {today.message}
                    </p>
                  </div>
                )}

                {!loading && today?.task && (
                  <div className="space-y-4" data-testid="daily-task-list">
                    <TaskCard
                      title={today.task.title}
                      goalTag={today.goal_title ?? activeGoal?.title ?? ""}
                      duration={`${today.task.duration_minutes} min`}
                      index={0}
                      isComplete={today.task.completed}
                      onToggle={handleToggleComplete}
                    />
                    {today.task.why_today && (
                      <div
                        className={`rounded-xl px-4 py-3 text-sm font-mono italic ${
                          isDark
                            ? "bg-[rgba(245,197,24,0.05)] border border-[rgba(245,197,24,0.12)] text-[rgba(255,255,255,0.7)]"
                            : "bg-[rgba(212,169,18,0.06)] border border-[rgba(212,169,18,0.15)] text-[rgba(0,0,0,0.65)]"
                        }`}
                        data-testid="daily-why-today"
                      >
                        <span className={isDark ? "text-[#F5C518]" : "text-[#D4A912]"}>Why today: </span>
                        {today.task.why_today}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:space-y-8">
              {/* Current milestone */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
                className="glass-card p-5 lg:p-6"
              >
                <h3 className={`font-sans text-base lg:text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                  Current Milestone
                </h3>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Link
                    href="/path"
                    className={`font-mono text-xs truncate transition-colors ${isDark ? "text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.8)]" : "text-[rgba(0,0,0,0.5)] hover:text-[rgba(0,0,0,0.7)]"}`}
                  >
                    {today?.milestone_title ?? today?.phase_title ?? "No milestone yet"}
                  </Link>
                </div>
                {today?.step_title && (
                  <p className={`font-mono text-xs mb-4 ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.45)]"}`}>
                    Step: {today.step_title}
                  </p>
                )}
                <Link
                  href="/path"
                  className={`inline-flex items-center gap-2 font-mono text-xs transition-colors group ${isDark ? "text-[#00D4FF] hover:text-[#33DDFF]" : "text-[#0099CC] hover:text-[#007AA3]"}`}
                >
                  View full path
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              {/* Mood Log — writes to today's task */}
              {today?.task && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
                  className="space-y-4"
                  data-testid="daily-mood-selector"
                >
                  <p className={`font-mono text-xs sm:text-sm ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                    How are you feeling about today&apos;s task?
                  </p>
                  <div className="flex gap-2 sm:gap-3">
                    {MOODS.map((m) => {
                      const selected = today.task?.mood_today === m.key;
                      return (
                        <button
                          key={m.key}
                          onClick={() => handleMood(m.key)}
                          disabled={mutating}
                          data-testid={`daily-mood-${m.key}`}
                          className={`flex flex-1 flex-col items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-300 disabled:opacity-50 ${
                            selected
                              ? isDark
                                ? "shadow-[0_0_24px_rgba(245,197,24,0.3),0_0_0_1px_rgba(245,197,24,0.3)] bg-[rgba(245,197,24,0.12)]"
                                : "shadow-[0_0_20px_rgba(212,169,18,0.25),0_0_0_1px_rgba(212,169,18,0.3)] bg-[rgba(212,169,18,0.12)]"
                              : isDark
                                ? "hover:bg-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]"
                                : "hover:bg-[rgba(0,0,0,0.03)] bg-[rgba(0,0,0,0.02)] border border-[rgba(0,0,0,0.06)]"
                          }`}
                        >
                          <span className="text-xl sm:text-2xl">{m.emoji}</span>
                          <span
                            className={`font-mono text-[10px] sm:text-xs transition-colors ${
                              selected
                                ? isDark
                                  ? "text-[#F5C518]"
                                  : "text-[#D4A912]"
                                : isDark
                                  ? "text-[rgba(255,255,255,0.4)]"
                                  : "text-[rgba(0,0,0,0.4)]"
                            }`}
                          >
                            {m.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoachMessage({
  loading,
  today,
  error,
  hasActiveGoal,
  firstName,
  isDark,
}: {
  loading: boolean;
  today: TodayResponse | null;
  error: string | null;
  hasActiveGoal: boolean;
  firstName: string;
  isDark: boolean;
}) {
  const baseClass = `font-mono text-sm lg:text-base italic leading-relaxed ${
    isDark ? "text-[rgba(255,255,255,0.85)]" : "text-[rgba(0,0,0,0.75)]"
  }`;
  if (loading) {
    return (
      <p className={baseClass}>
        One second, {firstName} — pulling today&apos;s focus from your path.
      </p>
    );
  }
  if (!hasActiveGoal) {
    return (
      <p className={baseClass}>
        Hey {firstName}. Pick an active goal and I&apos;ll pull today&apos;s focus from your
        path. No path yet? Run the intake and I&apos;ll build one in about 30 seconds.
      </p>
    );
  }
  if (error === "no_path") {
    return (
      <p className={baseClass}>
        I don&apos;t have a path built for this goal yet, {firstName}. Run the intake
        and I&apos;ll have today&apos;s task ready before you finish your coffee.
      </p>
    );
  }
  if (error === "load_failed") {
    return (
      <p className={baseClass}>
        Couldn&apos;t reach your path just now. Try again in a moment.
      </p>
    );
  }
  if (today && !today.task) {
    return (
      <p className={baseClass}>
        Every task complete, {firstName}. That&apos;s not normal. Celebrate it,
        then ask me what&apos;s next.
      </p>
    );
  }
  if (today?.task) {
    return (
      <p className={baseClass}>
        Good morning, {firstName}. Today&apos;s move:{" "}
        <span className={isDark ? "text-[#F5C518] not-italic" : "text-[#D4A912] not-italic"}>
          {today.task.title}
        </span>
        . {today.task.why_today} Mark it done the moment you finish — momentum is
        everything right now.
      </p>
    );
  }
  return <p className={baseClass}>Loading your focus…</p>;
}
