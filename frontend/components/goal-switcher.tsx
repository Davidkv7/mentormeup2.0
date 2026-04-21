"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Plus, Target, Pause, Check } from "lucide-react";
import Link from "next/link";
import { useGoals, type Goal } from "@/contexts/goals-context";
import { useTheme } from "@/contexts/theme-context";

const colorMap: Record<Goal["color"], string> = {
  gold: "#F5C518",
  cyan: "#00D4FF",
  purple: "#A855F7",
  green: "#22C55E",
  red: "#EF4444",
};

const colorMapLight: Record<Goal["color"], string> = {
  gold: "#D4A912",
  cyan: "#0099CC",
  purple: "#9333EA",
  green: "#16A34A",
  red: "#DC2626",
};

export function GoalSwitcher({ variant = "full" }: { variant?: "full" | "compact" | "mobile-topbar" } = {}) {
  const { goals, activeGoal, setActiveGoal } = useGoals();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const isDark = theme === 'dark';
  const colors = isDark ? colorMap : colorMapLight;

  const activeGoals = goals.filter((g) => g.status === "active" || g.status === "paused");

  if (activeGoals.length === 0) {
    if (variant === "compact") {
      return (
        <Link
          href="/"
          data-testid="goal-switcher-add-first-compact"
          aria-label="Add your first goal"
          className={`flex items-center justify-center w-10 h-10 rounded-full glass-card-subtle transition-all ${
            isDark
              ? "bg-[rgba(245,197,24,0.15)] border border-[rgba(245,197,24,0.3)] hover:bg-[rgba(245,197,24,0.25)]"
              : "bg-[rgba(212,169,18,0.15)] border border-[rgba(212,169,18,0.3)] hover:bg-[rgba(212,169,18,0.25)]"
          }`}
        >
          <Plus className={`w-4 h-4 ${isDark ? "text-[#F5C518]" : "text-[#D4A912]"}`} />
        </Link>
      );
    }
    if (variant === "mobile-topbar") {
      return (
        <Link
          href="/"
          data-testid="goal-switcher-add-first-mobile"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${
            isDark
              ? "bg-[rgba(245,197,24,0.12)] border border-[rgba(245,197,24,0.25)]"
              : "bg-[rgba(212,169,18,0.12)] border border-[rgba(212,169,18,0.25)]"
          }`}
        >
          <Plus className={`w-3 h-3 ${isDark ? "text-[#F5C518]" : "text-[#D4A912]"}`} />
          <span className={`font-mono text-[11px] ${isDark ? "text-[#F5C518]" : "text-[#D4A912]"}`}>
            Add goal
          </span>
        </Link>
      );
    }
    return (
      <Link
        href="/"
        data-testid="goal-switcher-add-first"
        className={`flex items-center gap-2 px-3 py-2 rounded-xl glass-card-subtle transition-all group ${
          isDark ? 'hover:bg-[rgba(255,255,255,0.06)]' : 'hover:bg-[rgba(0,0,0,0.04)]'
        }`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isDark 
            ? 'bg-[rgba(245,197,24,0.15)] border border-[rgba(245,197,24,0.3)]'
            : 'bg-[rgba(212,169,18,0.15)] border border-[rgba(212,169,18,0.3)]'
        }`}>
          <Plus className={`w-4 h-4 ${isDark ? 'text-[#F5C518]' : 'text-[#D4A912]'}`} />
        </div>
        <span className={`font-mono text-xs transition-colors ${
          isDark 
            ? 'text-[rgba(255,255,255,0.6)] group-hover:text-white'
            : 'text-[rgba(0,0,0,0.6)] group-hover:text-[rgba(0,0,0,0.9)]'
        }`}>
          Add your first goal
        </span>
      </Link>
    );
  }

  // --------- Compact trigger: just the coloured goal dot (72px sidebar). ---------
  if (variant === "compact") {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          data-testid="goal-switcher-compact-trigger"
          aria-label={activeGoal ? `Active goal: ${activeGoal.title}` : "Switch goal"}
          className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
            isDark ? "hover:scale-105" : "hover:scale-105"
          }`}
          style={
            activeGoal
              ? {
                  backgroundColor: `${colors[activeGoal.color]}20`,
                  borderColor: `${colors[activeGoal.color]}60`,
                }
              : undefined
          }
        >
          {activeGoal && (
            <Target
              className="w-4 h-4"
              style={{ color: colors[activeGoal.color] }}
            />
          )}
        </button>
        {renderDropdown()}
      </div>
    );
  }

  // --------- Mobile top-bar trigger: colour dot + first ~16 chars of title. ---------
  if (variant === "mobile-topbar") {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          data-testid="goal-switcher-mobile-trigger"
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg max-w-[180px] transition-colors ${
            isDark
              ? "hover:bg-[rgba(255,255,255,0.06)]"
              : "hover:bg-[rgba(0,0,0,0.04)]"
          }`}
        >
          {activeGoal && (
            <>
              <span
                aria-hidden
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors[activeGoal.color] }}
              />
              <span
                className={`font-mono text-[11px] truncate ${isDark ? "text-white/85" : "text-[#1A1D21]"}`}
              >
                {activeGoal.title}
              </span>
            </>
          )}
          <ChevronDown
            className={`w-3 h-3 flex-shrink-0 transition-transform ${
              isDark ? "text-white/40" : "text-black/40"
            } ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {renderDropdown()}
      </div>
    );
  }

  // --------- Default full trigger (sidebar expanded + mobile drawer). ---------
  function renderDropdown() {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              data-testid="goal-switcher-dropdown"
              className={`absolute top-full left-0 min-w-[220px] mt-2 z-50 glass-card rounded-xl overflow-hidden ${
                isDark
                  ? "shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                  : "shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
              }`}
            >
              <div className="p-2 space-y-1 max-h-[280px] overflow-y-auto">
                {activeGoals.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => {
                      setActiveGoal(goal.id);
                      setIsOpen(false);
                    }}
                    data-testid={`goal-switcher-option-${goal.id}`}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all ${
                      goal.id === activeGoal?.id
                        ? isDark
                          ? "bg-[rgba(255,255,255,0.08)]"
                          : "bg-[rgba(0,0,0,0.06)]"
                        : isDark
                          ? "hover:bg-[rgba(255,255,255,0.04)]"
                          : "hover:bg-[rgba(0,0,0,0.03)]"
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center border flex-shrink-0"
                      style={{
                        backgroundColor: `${colors[goal.color]}15`,
                        borderColor: `${colors[goal.color]}40`,
                      }}
                    >
                      {goal.status === "paused" ? (
                        <Pause
                          className="w-3 h-3"
                          style={{ color: colors[goal.color] }}
                        />
                      ) : (
                        <Target
                          className="w-3 h-3"
                          style={{ color: colors[goal.color] }}
                        />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p
                        className={`font-sans text-sm truncate ${isDark ? "text-white" : "text-[#1A1D21]"}`}
                      >
                        {goal.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div
                          className={`flex-1 h-1 rounded-full overflow-hidden ${isDark ? "bg-[rgba(255,255,255,0.1)]" : "bg-[rgba(0,0,0,0.1)]"}`}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${goal.progress}%`,
                              backgroundColor: colors[goal.color],
                            }}
                          />
                        </div>
                        <span
                          className={`font-mono text-[10px] ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}
                        >
                          {goal.progress}%
                        </span>
                      </div>
                    </div>
                    {goal.id === activeGoal?.id && (
                      <Check
                        className={`w-4 h-4 flex-shrink-0 ${isDark ? "text-[#F5C518]" : "text-[#D4A912]"}`}
                      />
                    )}
                  </button>
                ))}
              </div>

              <div
                className={`border-t p-2 ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.06)]"}`}
              >
                <Link
                  href="/goals"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-all ${
                    isDark ? "hover:bg-[rgba(255,255,255,0.04)]" : "hover:bg-[rgba(0,0,0,0.03)]"
                  }`}
                >
                  <Target
                    className={`w-4 h-4 ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}
                  />
                  <span
                    className={`font-mono text-xs ${isDark ? "text-[rgba(255,255,255,0.6)]" : "text-[rgba(0,0,0,0.6)]"}`}
                  >
                    Manage all goals
                  </span>
                </Link>
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-all ${
                    isDark ? "hover:bg-[rgba(255,255,255,0.04)]" : "hover:bg-[rgba(0,0,0,0.03)]"
                  }`}
                >
                  <Plus
                    className={`w-4 h-4 ${isDark ? "text-[#F5C518]" : "text-[#D4A912]"}`}
                  />
                  <span
                    className={`font-mono text-xs ${isDark ? "text-[#F5C518]" : "text-[#D4A912]"}`}
                  >
                    Add new goal
                  </span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-testid="goal-switcher-full-trigger"
        className={`flex items-center gap-2 px-3 py-2 rounded-xl glass-card-subtle transition-all w-full ${
          isDark ? 'hover:bg-[rgba(255,255,255,0.06)]' : 'hover:bg-[rgba(0,0,0,0.04)]'
        }`}
      >
        {activeGoal && (
          <>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center border"
              style={{
                backgroundColor: `${colors[activeGoal.color]}15`,
                borderColor: `${colors[activeGoal.color]}40`,
              }}
            >
              <Target
                className="w-4 h-4"
                style={{ color: colors[activeGoal.color] }}
              />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className={`font-sans text-sm truncate ${isDark ? 'text-white' : 'text-[#1A1D21]'}`}>
                {activeGoal.title}
              </p>
              <p className={`font-mono text-[10px] ${isDark ? 'text-[rgba(255,255,255,0.4)]' : 'text-[rgba(0,0,0,0.4)]'}`}>
                {activeGoal.progress}% complete
              </p>
            </div>
          </>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isDark ? 'text-[rgba(255,255,255,0.4)]' : 'text-[rgba(0,0,0,0.4)]'
          } ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {renderDropdown()}
    </div>
  );
}
