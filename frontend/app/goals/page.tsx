"use client";

import { motion, AnimatePresence } from "motion/react";
import { Target, Plus, Pause, Play, Archive, Trash2, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SidebarNav } from "@/components/sidebar-nav";
import { useGoals, type Goal } from "@/contexts/goals-context";
import { useTheme } from "@/contexts/theme-context";

const colorMap: Record<Goal["color"], string> = {
  gold: "#F5C518",
  cyan: "#00D4FF",
  purple: "#A855F7",
  green: "#22C55E",
  red: "#EF4444",
};

function GoalCard({ goal, onSetActive, onPause, onResume, onArchive, onDelete, isActive, isDark }: {
  goal: Goal;
  onSetActive: () => void;
  onPause: () => void;
  onResume: () => void;
  onArchive: () => void;
  onDelete: () => void;
  isActive: boolean;
  isDark: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const color = colorMap[goal.color];
  const isPaused = goal.status === "paused";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`glass-card overflow-hidden transition-all duration-300 ${
        isPaused ? "opacity-60" : ""
      } ${isActive ? "ring-2 ring-[#F5C518]/50" : ""}`}
      style={{
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: `${color}15`,
                border: `1px solid ${color}30`,
              }}
            >
              <Target className="w-5 h-5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-sans font-semibold text-foreground text-lg">
                  {goal.title}
                </h3>
                {isActive && (
                  <span className="px-2 py-0.5 rounded-full bg-[rgba(245,197,24,0.15)] border border-[rgba(245,197,24,0.3)] font-mono text-[10px] text-[#F5C518] uppercase">
                    Active
                  </span>
                )}
                {isPaused && (
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase ${isDark ? "bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.5)]" : "bg-[rgba(0,0,0,0.05)] border border-[rgba(0,0,0,0.1)] text-[rgba(0,0,0,0.5)]"}`}>
                    Paused
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-muted-foreground mt-1">
                Phase {goal.currentPhase} of {goal.phases.length} &bull; Started {new Date(goal.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowActions(!showActions)}
            className={`p-2 rounded-lg transition-all flex-shrink-0 ${isDark ? "hover:bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)] hover:text-white" : "hover:bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.4)] hover:text-foreground"}`}
          >
            <ChevronRight className={`w-5 h-5 transition-transform ${showActions ? "rotate-90" : ""}`} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-xs text-muted-foreground">Progress</span>
            <span className="font-mono text-xs text-foreground">{goal.progress}%</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? "bg-[rgba(255,255,255,0.08)]" : "bg-[rgba(0,0,0,0.08)]"}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goal.progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span className="font-mono text-xs text-muted-foreground">
              {goal.phases.flatMap(p => p.milestones).filter(m => m.status === "complete").length} milestones done
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-mono text-xs text-muted-foreground">
              {goal.dailyTasks.filter(t => !t.completed).length} tasks today
            </span>
          </div>
        </div>

        {/* Expanded Actions */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`mt-5 pt-5 border-t ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.06)]"}`}
            >
              <div className="flex flex-wrap gap-2">
                {!isActive && (
                  <button
                    onClick={onSetActive}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(245,197,24,0.12)] hover:bg-[rgba(245,197,24,0.2)] text-[#F5C518] transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="font-mono text-xs">Set as Active</span>
                  </button>
                )}
                {isPaused ? (
                  <button
                    onClick={onResume}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(34,197,94,0.12)] hover:bg-[rgba(34,197,94,0.2)] text-[#22C55E] transition-all"
                  >
                    <Play className="w-4 h-4" />
                    <span className="font-mono text-xs">Resume</span>
                  </button>
                ) : (
                  <button
                    onClick={onPause}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isDark ? "bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.7)]" : "bg-[rgba(0,0,0,0.04)] hover:bg-[rgba(0,0,0,0.08)] text-[rgba(0,0,0,0.7)]"}`}
                  >
                    <Pause className="w-4 h-4" />
                    <span className="font-mono text-xs">Pause</span>
                  </button>
                )}
                <button
                  onClick={onArchive}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isDark ? "bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.7)]" : "bg-[rgba(0,0,0,0.04)] hover:bg-[rgba(0,0,0,0.08)] text-[rgba(0,0,0,0.7)]"}`}
                >
                  <Archive className="w-4 h-4" />
                  <span className="font-mono text-xs">Archive</span>
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.2)] text-[#EF4444] transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="font-mono text-xs">Delete</span>
                </button>
              </div>
              <Link
                href={`/path?goal=${goal.id}`}
                className="flex items-center gap-2 mt-3 font-mono text-xs text-[#00D4FF] hover:underline"
              >
                View full roadmap
                <ChevronRight className="w-3 h-3" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function GoalsPage() {
  const { goals, activeGoalId, setActiveGoal, pauseGoal, resumeGoal, archiveGoal, deleteGoal } = useGoals();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "archived">("all");

  const filteredGoals = goals.filter((goal) => {
    if (filter === "all") return goal.status !== "archived";
    if (filter === "archived") return goal.status === "archived";
    return goal.status === filter;
  });

  const activeGoals = goals.filter((g) => g.status === "active");
  const pausedGoals = goals.filter((g) => g.status === "paused");
  const archivedGoals = goals.filter((g) => g.status === "archived");

  return (
    <div className="min-h-screen bg-background noise-bg transition-colors duration-300">
      <SidebarNav />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] lg:w-[900px] h-[500px] lg:h-[700px] rounded-full blur-[100px] lg:blur-[150px] ${isDark ? "bg-[#F5C518]/[0.02]" : "bg-[#F5C518]/[0.04]"}`} />
      </div>

      <main className="relative ml-0 md:ml-[72px] lg:ml-[240px] pt-16 md:pt-0 pb-24 md:pb-8 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="font-sans font-bold text-2xl sm:text-3xl lg:text-4xl text-foreground">
                Your Goals
              </h1>
              <p className="font-mono text-sm text-muted-foreground mt-2">
                {activeGoals.length} active &bull; {pausedGoals.length} paused &bull; {archivedGoals.length} archived
              </p>
            </div>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#F5C518] to-[#D4A912] text-[#080B14] font-sans font-semibold text-sm transition-all hover:shadow-[0_4px_20px_rgba(245,197,24,0.4)] pulse-glow"
            >
              <Plus className="w-4 h-4" />
              Add New Goal
            </Link>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 mb-6 overflow-x-auto pb-2"
          >
            {(["all", "active", "paused", "archived"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full font-mono text-xs transition-all whitespace-nowrap ${
                  filter === f
                    ? "bg-[rgba(245,197,24,0.15)] text-[#F5C518] border border-[rgba(245,197,24,0.3)]"
                    : isDark 
                      ? "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)]"
                      : "bg-[rgba(0,0,0,0.03)] text-[rgba(0,0,0,0.5)] border border-[rgba(0,0,0,0.08)] hover:bg-[rgba(0,0,0,0.06)]"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "active" && ` (${activeGoals.length})`}
                {f === "paused" && ` (${pausedGoals.length})`}
                {f === "archived" && ` (${archivedGoals.length})`}
              </button>
            ))}
          </motion.div>

          {/* Goals Grid */}
          {filteredGoals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="w-20 h-20 rounded-full bg-[rgba(245,197,24,0.1)] border border-[rgba(245,197,24,0.2)] flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-[#F5C518]" />
              </div>
              <h3 className="font-sans font-semibold text-lg text-foreground mb-2">
                {filter === "all" ? "No goals yet" : `No ${filter} goals`}
              </h3>
              <p className="font-mono text-sm text-muted-foreground text-center max-w-sm mb-6">
                {filter === "all"
                  ? "Start your journey by adding your first goal. MentorMeUp will guide you every step of the way."
                  : `You don't have any ${filter} goals at the moment.`}
              </p>
              {filter === "all" && (
                <Link
                  href="/"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#F5C518] to-[#D4A912] text-[#080B14] font-sans font-semibold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Goal
                </Link>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <AnimatePresence mode="popLayout">
                {filteredGoals.map((goal, index) => (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <GoalCard
                      goal={goal}
                      isDark={isDark}
                      isActive={goal.id === activeGoalId}
                      onSetActive={() => setActiveGoal(goal.id)}
                      onPause={() => pauseGoal(goal.id)}
                      onResume={() => resumeGoal(goal.id)}
                      onArchive={() => archiveGoal(goal.id)}
                      onDelete={() => {
                        if (confirm("Are you sure you want to delete this goal? This cannot be undone.")) {
                          deleteGoal(goal.id);
                        }
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
