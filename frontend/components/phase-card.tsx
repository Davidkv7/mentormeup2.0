"use client";

import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Lock } from "lucide-react";
import { MilestoneRow } from "./milestone-row";
import { useTheme } from "@/contexts/theme-context";

type MilestoneStatus = "complete" | "active" | "locked";

interface Milestone {
  title: string;
  status: MilestoneStatus;
}

interface PhaseCardProps {
  phaseNumber: number;
  title: string;
  milestones: Milestone[];
  isExpanded: boolean;
  isLocked: boolean;
  onToggle: () => void;
  index: number;
}

export function PhaseCard({
  phaseNumber,
  title,
  milestones,
  isExpanded,
  isLocked,
  onToggle,
  index,
}: PhaseCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.12, ease: [0.25, 0.4, 0.25, 1] }}
      className={`relative overflow-hidden rounded-2xl ${isLocked ? "opacity-50" : ""}`}
      style={{
        background: isLocked 
          ? isDark 
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)'
            : 'linear-gradient(135deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.01) 100%)'
          : isDark
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 50%, rgba(255, 255, 255, 0.03) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 255, 255, 0.8) 100%)',
        backdropFilter: 'blur(24px)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: isLocked ? 'none' : isDark ? '0 4px 24px -1px rgba(0, 0, 0, 0.2)' : '0 4px 24px -1px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Left border glow for active phase */}
      {!isLocked && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{
            background: 'linear-gradient(180deg, #F5C518 0%, rgba(245, 197, 24, 0.6) 100%)',
            boxShadow: '0 0 20px rgba(245, 197, 24, 0.5), 0 0 40px rgba(245, 197, 24, 0.2)',
          }}
        />
      )}

      {/* Locked border */}
      {isLocked && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isDark ? "bg-[rgba(255,255,255,0.1)]" : "bg-[rgba(0,0,0,0.1)]"}`} />
      )}

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <button
          onClick={onToggle}
          disabled={isLocked}
          className={`w-full flex items-center justify-between p-4 sm:p-5 lg:p-7 text-left transition-colors duration-300 ${
            isLocked 
              ? "cursor-not-allowed" 
              : isDark 
                ? "cursor-pointer hover:bg-[rgba(255,255,255,0.02)]"
                : "cursor-pointer hover:bg-[rgba(0,0,0,0.02)]"
          }`}
        >
          <div className="flex items-center gap-3 sm:gap-5">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-sans font-bold text-sm sm:text-base flex-shrink-0 ${
                isLocked 
                  ? isDark 
                    ? "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.08)]"
                    : "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.3)] border border-[rgba(0,0,0,0.08)]"
                  : "bg-[rgba(245,197,24,0.12)] text-[#F5C518] border border-[rgba(245,197,24,0.25)] shadow-[0_0_16px_rgba(245,197,24,0.15)]"
              }`}
            >
              {isLocked ? <Lock className="w-4 h-4 sm:w-5 sm:h-5" /> : phaseNumber}
            </div>
            <div className="min-w-0">
              <h3
                className={`font-sans font-semibold text-sm sm:text-base lg:text-lg ${
                  isLocked 
                    ? isDark ? "text-[rgba(255,255,255,0.35)]" : "text-[rgba(0,0,0,0.35)]"
                    : "text-foreground"
                }`}
              >
                Phase {phaseNumber} — {title}
              </h3>
              {!isLocked && (
                <p className="font-mono text-xs text-muted-foreground mt-1.5">
                  {milestones.filter((m) => m.status === "complete").length} of{" "}
                  {milestones.length} milestones complete
                </p>
              )}
            </div>
          </div>
          {!isLocked && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          )}
        </button>

        {/* Milestones */}
        <AnimatePresence>
          {isExpanded && !isLocked && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 sm:px-5 lg:px-7 pb-4 sm:pb-5 lg:pb-7 space-y-2">
                {milestones.map((milestone, i) => (
                  <MilestoneRow
                    key={milestone.title}
                    title={milestone.title}
                    status={milestone.status}
                    index={i}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
