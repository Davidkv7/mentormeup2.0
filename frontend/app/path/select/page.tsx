"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Clock,
  Gauge,
  BookOpen,
  Flame,
  Leaf,
  Check,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { useTheme } from "@/contexts/theme-context";
import { useGoals } from "@/contexts/goals-context";
import { api, ApiError } from "@/lib/api";

interface PathSource {
  title: string;
  url: string;
  snippet: string;
}
interface PathOption {
  option_id: string;
  angle: "evidence_based" | "fastest" | "sustainable" | string;
  name: string;
  tagline: string;
  timeline: string;
  intensity: "low" | "moderate" | "high";
  why_this_fits: string;
  key_milestones: string[];
  sources: PathSource[];
  recommended: boolean;
}
interface PathOptionsDoc {
  goal_id: string;
  goal_title: string;
  coach_recommendation: string;
  options: PathOption[];
  generated_at: string;
  intake_status: string;
  selected_option_id: string | null;
}

const LOADING_MESSAGES = [
  "Researching evidence-based approaches…",
  "Scanning intensive-sprint methods…",
  "Weighing sustainable habit systems…",
  "Cross-checking with your behavioral profile…",
  "Naming your three paths…",
];

const ANGLE_META: Record<
  string,
  { label: string; Icon: typeof BookOpen; color: string; bg: string }
> = {
  evidence_based: {
    label: "Evidence-based",
    Icon: BookOpen,
    color: "#00D4FF",
    bg: "rgba(0,212,255,0.10)",
  },
  fastest: {
    label: "Fastest",
    Icon: Flame,
    color: "#FF6B3D",
    bg: "rgba(255,107,61,0.10)",
  },
  sustainable: {
    label: "Sustainable",
    Icon: Leaf,
    color: "#63D471",
    bg: "rgba(99,212,113,0.10)",
  },
};

export default function PathSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const goalIdParam = searchParams?.get("goal_id") ?? null;
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { activeGoalId, goals } = useGoals();

  const goalId =
    goalIdParam || activeGoalId || (goals.length > 0 ? goals[0].id : null);

  const [doc, setDoc] = useState<PathOptionsDoc | null>(null);
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "none" | "error" | "submitting"
  >("loading");
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Rotate loading message copy every 4s while building.
  useEffect(() => {
    if (loadState !== "loading") return;
    const t = setInterval(
      () => setLoadingTextIdx((i) => (i + 1) % LOADING_MESSAGES.length),
      4000,
    );
    return () => clearInterval(t);
  }, [loadState]);

  const kickoffIfNeeded = useCallback(async () => {
    if (!goalId) return;
    try {
      await api.post(`/api/paths/build-options/${goalId}`, {});
    } catch {
      // Ignore — the poll loop below will surface any real error.
    }
  }, [goalId]);

  const fetchOptions = useCallback(async () => {
    if (!goalId) {
      setLoadState("none");
      return;
    }
    try {
      const d = await api.get<PathOptionsDoc>(`/api/paths/options/${goalId}`);
      setDoc(d);
      setLoadState("ready");
      // Pre-select the recommended one so the primary CTA is ready.
      const rec = d.options.find((o) => o.recommended);
      setSelectedId((prev) => prev ?? rec?.option_id ?? d.options[0]?.option_id ?? null);
      return "ready" as const;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return "building" as const;
      }
      setLoadState("error");
      return "error" as const;
    }
  }, [goalId]);

  // On mount: kick off generation (idempotent) + poll every 3s until ready.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await kickoffIfNeeded();
      const first = await fetchOptions();
      if (cancelled || first === "ready" || first === "error") return;
      for (let attempt = 0; attempt < 40; attempt++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 3000));
        const s = await fetchOptions();
        if (s === "ready" || s === "error") return;
      }
      if (!cancelled) setLoadState("error");
    })();
    return () => {
      cancelled = true;
    };
  }, [kickoffIfNeeded, fetchOptions]);

  const handleSelect = async () => {
    if (!goalId || !selectedId) return;
    setLoadState("submitting");
    try {
      await api.post(`/api/paths/select-option/${goalId}`, {
        option_id: selectedId,
      });
      // Path expansion takes 20-60s — send them to /path which already
      // polls GET /api/paths/:goal until ready.
      router.replace(`/path?goal_id=${goalId}`);
    } catch {
      setLoadState("ready");
    }
  };

  const subtitle = useMemo(() => {
    if (!doc) return "";
    return doc.goal_title;
  }, [doc]);

  return (
    <div
      className={`min-h-screen noise-bg transition-colors duration-300 ${
        isDark ? "bg-[#080B14]" : "bg-[#F8F9FA]"
      }`}
      data-testid="path-select-page"
    >
      <SidebarNav />

      <div className="relative md:ml-[72px] lg:ml-[240px] min-h-screen pb-24 md:pb-8">
        <header
          className={`px-4 sm:px-6 lg:px-10 py-6 border-b ${
            isDark ? "border-[rgba(255,255,255,0.04)]" : "border-[rgba(0,0,0,0.06)]"
          }`}
          style={{
            background: isDark
              ? "linear-gradient(180deg, rgba(8,11,20,0.95) 0%, rgba(8,11,20,0.8) 100%)"
              : "linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(248,249,250,0.8) 100%)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="max-w-5xl mx-auto">
            <p
              className={`font-mono text-[11px] uppercase tracking-[0.15em] mb-1 ${
                isDark ? "text-[rgba(245,197,24,0.8)]" : "text-[#D4A912]"
              }`}
            >
              Pick your path
            </p>
            <h1
              className={`font-sans font-bold text-xl lg:text-2xl ${
                isDark ? "text-white" : "text-[#1A1D21]"
              }`}
              data-testid="path-select-title"
            >
              {subtitle || "Choosing your approach"}
            </h1>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-10 max-w-5xl mx-auto py-8 space-y-6">
          {loadState === "none" && (
            <div className="text-center py-20">
              <p className={`font-sans text-lg ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                No goal selected.
              </p>
              <Link
                href="/"
                className="inline-block mt-6 px-6 py-3 rounded-full bg-[#F5C518] text-[#080B14] font-sans font-bold"
              >
                Start with a goal →
              </Link>
            </div>
          )}

          {(loadState === "loading" || loadState === "submitting") && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-3xl p-10 sm:p-12 border-2 ${
                isDark
                  ? "bg-[rgba(245,197,24,0.04)] border-[rgba(245,197,24,0.2)]"
                  : "bg-[rgba(245,197,24,0.06)] border-[rgba(212,169,18,0.25)]"
              }`}
              data-testid="path-select-loading"
            >
              <div className="flex flex-col items-center text-center gap-5">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full bg-[#F5C518] opacity-20 animate-ping" />
                  <div
                    className="relative w-16 h-16 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, #FFD633 0%, #F5C518 45%, #D4A912 100%)",
                    }}
                  >
                    <Sparkles className="w-7 h-7 text-[#080B14]" />
                  </div>
                </div>
                <h2
                  className={`font-sans font-semibold text-xl sm:text-2xl ${
                    isDark ? "text-white" : "text-[#1A1D21]"
                  }`}
                >
                  {loadState === "submitting"
                    ? "Building the full plan for your pick…"
                    : "Mapping out 3 ways to get you there"}
                </h2>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingTextIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35 }}
                    className={`font-mono text-sm ${
                      isDark ? "text-[rgba(255,255,255,0.65)]" : "text-[rgba(0,0,0,0.65)]"
                    }`}
                  >
                    {loadState === "submitting"
                      ? "Phases, milestones, and your Day-1 task…"
                      : LOADING_MESSAGES[loadingTextIdx]}
                  </motion.p>
                </AnimatePresence>
                <p
                  className={`font-mono text-xs ${
                    isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"
                  }`}
                >
                  Usually 15–20 seconds. We're searching the web so your plan isn't generic.
                </p>
              </div>
            </motion.div>
          )}

          {loadState === "error" && (
            <div
              className={`rounded-2xl p-6 ${
                isDark ? "bg-[rgba(255,100,100,0.06)]" : "bg-[rgba(200,50,50,0.06)]"
              }`}
              data-testid="path-select-error"
            >
              <p className="font-mono text-sm text-red-400 mb-3">
                Couldn't build your options. The AI gateway may be recovering.
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoadState("loading");
                  setLoadingTextIdx(0);
                  void kickoffIfNeeded().then(fetchOptions);
                }}
                className="px-4 py-2 rounded-full bg-[#F5C518] text-[#080B14] font-sans font-semibold text-sm"
                data-testid="path-select-retry"
              >
                Try again
              </button>
            </div>
          )}

          {loadState === "ready" && doc && (
            <>
              {doc.coach_recommendation && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  data-testid="coach-recommendation"
                  className={`relative rounded-3xl p-6 border-2 ${
                    isDark
                      ? "bg-gradient-to-br from-[rgba(245,197,24,0.06)] to-[rgba(0,212,255,0.04)] border-[rgba(245,197,24,0.25)]"
                      : "bg-gradient-to-br from-[rgba(245,197,24,0.08)] to-[rgba(0,212,255,0.05)] border-[rgba(212,169,18,0.3)]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 30%, #FFD633 0%, #F5C518 45%, #D4A912 100%)",
                      }}
                    >
                      <Sparkles className="w-5 h-5 text-[#080B14]" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`font-mono text-[11px] uppercase tracking-[0.15em] mb-1.5 ${
                          isDark ? "text-[rgba(245,197,24,0.8)]" : "text-[#D4A912]"
                        }`}
                      >
                        What your coach recommends
                      </p>
                      <p
                        className={`font-sans text-base leading-relaxed ${
                          isDark ? "text-white" : "text-[#1A1D21]"
                        }`}
                      >
                        {doc.coach_recommendation}
                      </p>
                    </div>
                  </div>
                </motion.section>
              )}

              <section className="space-y-4" data-testid="path-options-list">
                {doc.options.map((opt, i) => (
                  <OptionCard
                    key={opt.option_id}
                    option={opt}
                    isDark={isDark}
                    selected={selectedId === opt.option_id}
                    onSelect={() => setSelectedId(opt.option_id)}
                    index={i}
                  />
                ))}
              </section>

              <div
                className={`sticky bottom-4 z-10 rounded-2xl p-4 flex items-center justify-between gap-4 backdrop-blur border ${
                  isDark
                    ? "bg-[rgba(8,11,20,0.92)] border-[rgba(255,255,255,0.08)]"
                    : "bg-[rgba(255,255,255,0.92)] border-[rgba(0,0,0,0.08)]"
                }`}
                data-testid="path-select-cta-bar"
              >
                <p
                  className={`font-mono text-xs ${
                    isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"
                  } min-w-0 truncate`}
                >
                  {selectedId
                    ? `Selected: ${
                        doc.options.find((o) => o.option_id === selectedId)?.name ?? ""
                      }`
                    : "Pick an approach to continue"}
                </p>
                <button
                  type="button"
                  onClick={handleSelect}
                  disabled={!selectedId}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F5C518] text-[#080B14] font-sans font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD633] transition-colors"
                  data-testid="path-select-confirm"
                >
                  Build this path
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  option,
  isDark,
  selected,
  onSelect,
  index,
}: {
  option: PathOption;
  isDark: boolean;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const meta = ANGLE_META[option.angle] ?? ANGLE_META.evidence_based;
  const { Icon, label, color, bg } = meta;

  const border = selected
    ? "border-[#F5C518]"
    : isDark
      ? "border-[rgba(255,255,255,0.06)]"
      : "border-[rgba(0,0,0,0.06)]";

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 + index * 0.05 }}
      className={`w-full text-left rounded-3xl p-5 sm:p-6 border-2 ${border} transition-all ${
        isDark ? "bg-[rgba(255,255,255,0.02)]" : "bg-white"
      } ${selected ? "shadow-[0_0_0_4px_rgba(245,197,24,0.15)]" : "hover:border-[rgba(245,197,24,0.35)]"}`}
      data-testid={`path-option-${option.option_id}`}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ background: bg }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: bg, color }}
            >
              {label}
            </span>
            {option.recommended && (
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F5C518] text-[#080B14] font-bold">
                Coach pick
              </span>
            )}
          </div>

          <h3
            className={`font-sans font-bold text-lg sm:text-xl ${
              isDark ? "text-white" : "text-[#1A1D21]"
            }`}
          >
            {option.name}
          </h3>
          <p
            className={`font-sans text-sm mt-1 ${
              isDark ? "text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.7)]"
            }`}
          >
            {option.tagline}
          </p>

          <div className="mt-4 flex flex-wrap gap-4 text-xs font-mono">
            <span className={`flex items-center gap-1.5 ${isDark ? "text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.7)]"}`}>
              <Clock className="w-3.5 h-3.5 text-[#00D4FF]" /> {option.timeline}
            </span>
            <span className={`flex items-center gap-1.5 ${isDark ? "text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.7)]"}`}>
              <Gauge className="w-3.5 h-3.5" style={{ color }} /> {option.intensity} intensity
            </span>
          </div>

          <p
            className={`font-sans text-sm leading-relaxed mt-4 ${
              isDark ? "text-[rgba(255,255,255,0.85)]" : "text-[rgba(0,0,0,0.8)]"
            }`}
          >
            {option.why_this_fits}
          </p>

          {option.key_milestones.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {option.key_milestones.map((m, idx) => (
                <li
                  key={idx}
                  className={`flex items-start gap-2 font-mono text-xs leading-relaxed ${
                    isDark ? "text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.7)]"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color }} />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          )}

          {option.sources.length > 0 && (
            <details
              className="mt-4 group"
              onClick={(e) => e.stopPropagation()}
            >
              <summary
                className={`cursor-pointer font-mono text-[11px] uppercase tracking-wider ${
                  isDark ? "text-[rgba(255,255,255,0.45)]" : "text-[rgba(0,0,0,0.5)]"
                } hover:text-[#F5C518] transition-colors select-none`}
                data-testid={`path-option-sources-toggle-${option.option_id}`}
              >
                View sources ({option.sources.length})
              </summary>
              <ul className="mt-2 space-y-2">
                {option.sources.map((s, idx) => (
                  <li
                    key={idx}
                    className={`rounded-lg p-2.5 ${
                      isDark ? "bg-[rgba(255,255,255,0.03)]" : "bg-[rgba(0,0,0,0.025)]"
                    }`}
                  >
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`font-sans text-sm font-medium inline-flex items-center gap-1 ${
                        isDark ? "text-[#00D4FF]" : "text-[#0099CC]"
                      } hover:underline`}
                    >
                      {s.title}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p
                      className={`font-mono text-[11px] mt-1 leading-relaxed ${
                        isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.55)]"
                      }`}
                    >
                      {s.snippet}
                    </p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            selected
              ? "bg-[#F5C518] border-[#F5C518]"
              : isDark
                ? "border-[rgba(255,255,255,0.3)]"
                : "border-[rgba(0,0,0,0.3)]"
          }`}
          aria-hidden
        >
          {selected && <Check className="w-4 h-4 text-[#080B14]" strokeWidth={3} />}
        </div>
      </div>
    </motion.button>
  );
}

// (reserved space for future inline loader / budget-exceeded state)
