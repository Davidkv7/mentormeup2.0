"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  Target,
  Clock,
  CheckCircle2,
  Circle,
  MessageCircle,
  Calendar,
  Flame,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { useTheme } from "@/contexts/theme-context";
import { useGoals } from "@/contexts/goals-context";
import { api, ApiError } from "@/lib/api";

interface MicroTask {
  task_id: string;
  title: string;
  duration_minutes: number;
  why_today: string;
  mood_today: string | null;
  order: number;
}
interface Step {
  step_id: string;
  title: string;
  why_it_matters: string;
  estimated_minutes: number;
  order: number;
  micro_tasks: MicroTask[];
}
interface Milestone {
  milestone_id: string;
  title: string;
  success_criterion: string;
  order: number;
  steps: Step[];
}
interface Phase {
  phase_id: string;
  title: string;
  summary: string;
  order: number;
  estimated_weeks: number;
  milestones: Milestone[];
}
interface PathSource {
  title: string;
  url: string;
  snippet: string;
}
interface Path {
  path_id: string;
  goal_id: string;
  goal_title: string;
  why_this_path: string;
  estimated_duration_weeks: number;
  weekly_time_commitment_hours: number;
  streak_count: number;
  intake_summary: Record<string, unknown>;
  phases: Phase[];
  status: string;
  created_at: string;
  selected_option_id?: string;
  selected_option_name?: string;
  selected_option_angle?: string;
  selected_option_tagline?: string;
  coach_recommendation?: string;
  sources?: PathSource[];
  path_change_deadline?: string;
}

export default function PathPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goalIdParam = searchParams?.get("goal_id") ?? null;
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { activeGoalId, goals } = useGoals();

  const goalId = goalIdParam || activeGoalId || (goals.length > 0 ? goals[0].id : null);

  const [path, setPath] = useState<Path | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "building" | "ready" | "error" | "none">("idle");
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);

  const loadPath = useCallback(async () => {
    if (!goalId) {
      setLoadState("none");
      return;
    }
    setLoadState("loading");
    try {
      const p = await api.get<Path>(`/api/paths/${goalId}`);
      setPath(p);
      setLoadState("ready");
      setExpandedPhase(p.phases[0]?.phase_id ?? null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setLoadState("building");
      } else {
        setLoadState("error");
      }
    }
  }, [goalId]);

  useEffect(() => {
    void loadPath();
  }, [loadPath]);

  // Poll while building.
  useEffect(() => {
    if (loadState !== "building") return;
    let cancelled = false;
    const tick = async () => {
      for (let i = 0; i < 90; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const p = await api.get<Path>(`/api/paths/${goalId}`);
          if (cancelled) return;
          setPath(p);
          setExpandedPhase(p.phases[0]?.phase_id ?? null);
          setLoadState("ready");
          return;
        } catch (err) {
          if (err instanceof ApiError && (err.status === 404 || err.status === 502)) continue;
          setLoadState("error");
          return;
        }
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [loadState, goalId]);

  const totalTasks = useMemo(() => {
    if (!path) return 0;
    return path.phases.reduce(
      (sum, ph) => sum + ph.milestones.reduce((m, ms) => m + ms.steps.reduce((s, st) => s + st.micro_tasks.length, 0), 0),
      0,
    );
  }, [path]);

  return (
    <div
      className={`min-h-screen noise-bg transition-colors duration-300 ${
        isDark ? "bg-[#080B14]" : "bg-[#F8F9FA]"
      }`}
      data-testid="path-page"
    >
      <SidebarNav />

      <div className="relative md:ml-[72px] lg:ml-[240px] min-h-screen pb-24 md:pb-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-4 sm:px-6 lg:px-10 py-6 sticky top-0 z-20 border-b"
          style={{
            background: isDark
              ? "linear-gradient(180deg, rgba(8,11,20,0.95) 0%, rgba(8,11,20,0.8) 100%)"
              : "linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(248,249,250,0.8) 100%)",
            backdropFilter: "blur(20px)",
            borderBottomColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div>
              <h1 className={`font-sans font-bold text-xl lg:text-2xl ${isDark ? "text-white" : "text-[#1A1D21]"}`} data-testid="path-title">
                {path?.goal_title || "Your Path"}
              </h1>
              {path && (
                <p className={`font-mono text-xs mt-1 ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                  {path.estimated_duration_weeks} weeks · {path.weekly_time_commitment_hours} hrs/week · {totalTasks} tasks
                </p>
              )}
            </div>
            <Link
              href="/coach"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-sm transition-colors ${
                isDark
                  ? "bg-[rgba(255,255,255,0.04)] text-white hover:bg-[rgba(255,255,255,0.08)]"
                  : "bg-white text-[#1A1D21] border border-[rgba(0,0,0,0.06)] hover:border-[rgba(245,197,24,0.3)]"
              }`}
            >
              <MessageCircle className="w-4 h-4 text-[#00D4FF]" />
              <span className="hidden sm:inline">Talk to coach</span>
            </Link>
          </div>
        </motion.header>

        <div className="px-4 sm:px-6 lg:px-10 max-w-5xl mx-auto py-8 space-y-6">
          {loadState === "loading" && (
            <p className={`font-mono text-sm ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
              Loading path…
            </p>
          )}

          {loadState === "building" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-10 text-center border-2 ${
                isDark
                  ? "bg-[rgba(245,197,24,0.04)] border-[rgba(245,197,24,0.2)]"
                  : "bg-[rgba(245,197,24,0.06)] border-[rgba(212,169,18,0.25)]"
              }`}
              data-testid="path-building"
            >
              <Sparkles className="w-10 h-10 text-[#F5C518] mx-auto mb-4 animate-pulse" />
              <h2 className={`font-sans font-semibold text-xl mb-2 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                Your path is being built…
              </h2>
              <p className={`font-mono text-sm ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                Usually 30–60 seconds. Hang tight.
              </p>
            </motion.div>
          )}

          {loadState === "none" && (
            <div className="text-center py-20">
              <p className={`font-sans text-lg ${isDark ? "text-white" : "text-[#1A1D21]"}`}>No path yet.</p>
              <Link href="/" className="inline-block mt-6 px-6 py-3 rounded-full bg-[#F5C518] text-[#080B14] font-sans font-bold">
                Start with a goal →
              </Link>
            </div>
          )}

          {loadState === "error" && (
            <div className={`rounded-2xl p-6 ${isDark ? "bg-[rgba(255,100,100,0.06)]" : "bg-[rgba(200,50,50,0.06)]"}`}>
              <p className="font-mono text-sm text-red-400">Couldn't load your path. Try refreshing.</p>
            </div>
          )}

          {loadState === "ready" && path && (
            <>
              {/* --- TRUST LAYER CARD --- */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                data-testid="trust-layer-card"
                className={`relative rounded-3xl p-6 sm:p-8 overflow-hidden border-2 ${
                  isDark
                    ? "bg-gradient-to-br from-[rgba(245,197,24,0.06)] to-[rgba(0,212,255,0.04)] border-[rgba(245,197,24,0.25)]"
                    : "bg-gradient-to-br from-[rgba(245,197,24,0.08)] to-[rgba(0,212,255,0.05)] border-[rgba(212,169,18,0.3)]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, #FFD633 0%, #F5C518 45%, #D4A912 100%)",
                    }}
                  >
                    <Sparkles className="w-5 h-5 text-[#080B14]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-mono text-[11px] uppercase tracking-[0.15em] mb-2 ${
                        isDark ? "text-[rgba(245,197,24,0.8)]" : "text-[#D4A912]"
                      }`}
                    >
                      Why this path — from your coach
                    </p>
                    <p
                      className={`font-sans text-base sm:text-lg leading-relaxed whitespace-pre-wrap ${
                        isDark ? "text-white" : "text-[#1A1D21]"
                      }`}
                      data-testid="why-this-path"
                    >
                      {path.why_this_path}
                    </p>

                    <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Stat isDark={isDark} icon={<Calendar className="w-3.5 h-3.5 text-[#00D4FF]" />} label="Duration" value={`${path.estimated_duration_weeks} wk`} />
                      <Stat isDark={isDark} icon={<Clock className="w-3.5 h-3.5 text-[#F5C518]" />} label="Weekly" value={`${path.weekly_time_commitment_hours} hr`} />
                      <Stat isDark={isDark} icon={<Target className="w-3.5 h-3.5 text-[#9D4EDD]" />} label="Tasks" value={`${totalTasks}`} />
                      <Stat isDark={isDark} icon={<Flame className="w-3.5 h-3.5 text-orange-500" />} label="Streak" value={`${path.streak_count}`} />
                    </div>

                    <ChangePathLink path={path} goalId={goalId} isDark={isDark} />
                  </div>
                </div>
              </motion.section>

              {/* --- PHASES --- */}
              <section className="space-y-3" data-testid="phases-list">
                {path.phases.map((phase) => {
                  const isPhaseOpen = expandedPhase === phase.phase_id;
                  return (
                    <motion.article
                      key={phase.phase_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl border ${
                        isDark ? "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]" : "bg-white border-[rgba(0,0,0,0.06)]"
                      }`}
                      data-testid={`phase-${phase.order}`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedPhase(isPhaseOpen ? null : phase.phase_id)}
                        className="w-full flex items-center gap-4 px-5 py-4 text-left"
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-bold shrink-0 ${
                            phase.order === 1 ? "bg-[#F5C518] text-[#080B14]" : isDark ? "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.8)]" : "bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.8)]"
                          }`}
                        >
                          {phase.order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-sans font-semibold ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                            {phase.title}
                          </h3>
                          <p className={`font-mono text-xs mt-0.5 ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                            {phase.estimated_weeks} weeks · {phase.milestones.length} milestones
                          </p>
                        </div>
                        {isPhaseOpen ? (
                          <ChevronDown className="w-5 h-5 text-[rgba(255,255,255,0.4)]" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-[rgba(255,255,255,0.4)]" />
                        )}
                      </button>

                      <AnimatePresence initial={false}>
                        {isPhaseOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className={`px-5 pb-5 pt-1 space-y-3 border-t ${isDark ? "border-[rgba(255,255,255,0.04)]" : "border-[rgba(0,0,0,0.05)]"}`}>
                              <p className={`font-mono text-sm leading-relaxed ${isDark ? "text-[rgba(255,255,255,0.6)]" : "text-[rgba(0,0,0,0.6)]"}`}>
                                {phase.summary}
                              </p>

                              {phase.milestones.map((m) => {
                                const isOpen = expandedMilestone === m.milestone_id;
                                return (
                                  <div
                                    key={m.milestone_id}
                                    className={`rounded-xl overflow-hidden border ${
                                      isDark ? "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)]" : "bg-[rgba(0,0,0,0.015)] border-[rgba(0,0,0,0.04)]"
                                    }`}
                                    data-testid={`milestone-${phase.order}-${m.order}`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setExpandedMilestone(isOpen ? null : m.milestone_id)}
                                      className="w-full flex items-start gap-3 px-4 py-3 text-left"
                                    >
                                      <Circle className="w-4 h-4 text-[#00D4FF] mt-1 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-sans font-medium text-sm ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                                          {m.title}
                                        </p>
                                        <p className={`font-mono text-[11px] mt-1 italic ${isDark ? "text-[rgba(255,255,255,0.45)]" : "text-[rgba(0,0,0,0.45)]"}`}>
                                          Success: {m.success_criterion}
                                        </p>
                                      </div>
                                      {isOpen ? (
                                        <ChevronDown className="w-4 h-4 text-[rgba(255,255,255,0.4)] mt-1" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-[rgba(255,255,255,0.4)] mt-1" />
                                      )}
                                    </button>
                                    <AnimatePresence initial={false}>
                                      {isOpen && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: "auto", opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden"
                                        >
                                          <div className="px-4 pb-4 space-y-3 pl-11">
                                            {m.steps.map((s) => (
                                              <div key={s.step_id} data-testid={`step-${s.step_id}`}>
                                                <p className={`font-sans font-medium text-sm ${isDark ? "text-[rgba(255,255,255,0.9)]" : "text-[#1A1D21]"}`}>
                                                  {s.title}
                                                  <span className={`ml-2 font-mono text-[10px] ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
                                                    · {s.estimated_minutes}m
                                                  </span>
                                                </p>
                                                <p className={`font-mono text-[11px] mt-0.5 ${isDark ? "text-[rgba(255,255,255,0.45)]" : "text-[rgba(0,0,0,0.45)]"}`}>
                                                  {s.why_it_matters}
                                                </p>
                                                <ul className="mt-2 space-y-1.5">
                                                  {s.micro_tasks.map((t) => (
                                                    <li
                                                      key={t.task_id}
                                                      className={`flex items-start gap-2 rounded-lg p-2.5 ${
                                                        isDark ? "bg-[rgba(255,255,255,0.02)]" : "bg-white"
                                                      }`}
                                                      data-testid={`task-${t.task_id}`}
                                                    >
                                                      <CheckCircle2 className="w-3.5 h-3.5 text-[rgba(255,255,255,0.3)] mt-0.5 shrink-0" />
                                                      <div className="flex-1 min-w-0">
                                                        <p className={`font-sans text-[13px] ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                                                          {t.title}
                                                          <span className={`ml-2 font-mono text-[10px] ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                                                            · {t.duration_minutes}m
                                                          </span>
                                                        </p>
                                                        <p className={`font-mono text-[11px] mt-1 leading-relaxed italic ${isDark ? "text-[rgba(0,212,255,0.7)]" : "text-[#0099CC]"}`}>
                                                          {t.why_today}
                                                        </p>
                                                      </div>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            ))}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.article>
                  );
                })}
              </section>

              <SourcesFooter path={path} isDark={isDark} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  isDark,
  icon,
  label,
  value,
}: {
  isDark: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 border ${
        isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)]" : "bg-white border-[rgba(0,0,0,0.06)]"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className={`font-mono text-[10px] uppercase tracking-wider ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
          {label}
        </span>
      </div>
      <p className={`font-sans font-semibold text-base ${isDark ? "text-white" : "text-[#1A1D21]"}`}>{value}</p>
    </div>
  );
}

function ChangePathLink({ path, goalId, isDark }: { path: Path; goalId: string | null; isDark: boolean }) {
  const deadline = path.path_change_deadline;
  if (!deadline || !goalId || !path.selected_option_id) return null;
  const deadlineMs = new Date(deadline).getTime();
  const nowMs = Date.now();
  if (!isFinite(deadlineMs) || deadlineMs <= nowMs) return null;
  const hoursLeft = Math.max(1, Math.round((deadlineMs - nowMs) / 3_600_000));
  return (
    <div className="mt-4 flex items-center gap-2 flex-wrap" data-testid="change-path-link">
      <Link
        href={`/path/select?goal_id=${goalId}`}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs transition-colors ${
          isDark
            ? "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.75)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
            : "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.75)] hover:bg-[rgba(0,0,0,0.08)] hover:text-[#1A1D21]"
        }`}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Change path
      </Link>
      <span
        className={`font-mono text-[11px] ${
          isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.5)]"
        }`}
      >
        {hoursLeft}h left to switch
      </span>
      {path.selected_option_name && (
        <span
          className={`font-mono text-[11px] ${
            isDark ? "text-[rgba(255,255,255,0.45)]" : "text-[rgba(0,0,0,0.55)]"
          }`}
        >
          · picked {path.selected_option_name}
        </span>
      )}
    </div>
  );
}

function SourcesFooter({ path, isDark }: { path: Path; isDark: boolean }) {
  const sources = path.sources ?? [];
  if (sources.length === 0) return null;
  return (
    <section
      className={`rounded-2xl p-5 border ${
        isDark
          ? "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]"
          : "bg-white border-[rgba(0,0,0,0.06)]"
      }`}
      data-testid="path-sources-footer"
    >
      <p
        className={`font-mono text-[11px] uppercase tracking-[0.15em] mb-3 ${
          isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"
        }`}
      >
        Research behind this path
      </p>
      <ul className="space-y-3">
        {sources.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <ExternalLink
              className={`w-3.5 h-3.5 mt-1 shrink-0 ${
                isDark ? "text-[rgba(255,255,255,0.45)]" : "text-[rgba(0,0,0,0.45)]"
              }`}
            />
            <div className="min-w-0">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`font-sans font-medium text-sm hover:underline ${
                  isDark ? "text-[#00D4FF]" : "text-[#0099CC]"
                }`}
              >
                {s.title}
              </a>
              {s.snippet && (
                <p
                  className={`font-mono text-[11px] mt-0.5 leading-relaxed ${
                    isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.55)]"
                  }`}
                >
                  {s.snippet}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

