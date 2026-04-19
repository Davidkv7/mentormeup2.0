"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/contexts/theme-context";

interface HealthSnapshotProps {
  readinessScore: number;
  sleepDuration: string;
  hrv: number;
  aiInsight: string;
}

export function HealthSnapshot({
  readinessScore = 84,
  sleepDuration = "7h 20m",
  hrv = 61,
  aiInsight = "Good recovery today. I've scheduled your hardest task at 9am. You're ready.",
}: HealthSnapshotProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Determine readiness color based on score
  const getReadinessColor = (score: number) => {
    if (score >= 80) return { bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.3)", text: "#22C55E", glow: "rgba(34, 197, 94, 0.2)" };
    if (score >= 60) return { bg: "rgba(245, 197, 24, 0.15)", border: "rgba(245, 197, 24, 0.3)", text: isDark ? "#F5C518" : "#D4A912", glow: "rgba(245, 197, 24, 0.2)" };
    return { bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)", text: "#EF4444", glow: "rgba(239, 68, 68, 0.2)" };
  };

  const colors = getReadinessColor(readinessScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      layout
      className="w-full"
    >
      <motion.div
        layout
        className="rounded-xl sm:rounded-2xl overflow-hidden"
        style={{
          background: isDark
            ? "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
          boxShadow: isDark 
            ? "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)"
            : "0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
      >
        {/* Collapsed Strip */}
        <motion.button
          layout="position"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 sm:p-4 gap-3 sm:gap-4"
        >
          {/* Left: Readiness Circle */}
          <div
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: colors.bg,
              border: `2px solid ${colors.border}`,
              boxShadow: `0 0 16px ${colors.glow}`,
            }}
          >
            <span
              className="font-mono font-bold text-sm sm:text-base"
              style={{ color: colors.text }}
            >
              {readinessScore}
            </span>
          </div>

          {/* Center: Stats */}
          <div className="flex-1 flex items-center justify-center gap-2 sm:gap-4 flex-wrap min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-xs sm:text-sm">💤</span>
              <span className={`font-mono text-[10px] sm:text-xs ${isDark ? 'text-[rgba(255,255,255,0.7)]' : 'text-[rgba(0,0,0,0.6)]'}`}>
                {sleepDuration}
              </span>
            </div>
            <div className="hidden xs:flex items-center gap-1 sm:gap-1.5">
              <span className="text-xs sm:text-sm">💓</span>
              <span className={`font-mono text-[10px] sm:text-xs ${isDark ? 'text-[rgba(255,255,255,0.7)]' : 'text-[rgba(0,0,0,0.6)]'}`}>
                {hrv}ms
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="text-xs sm:text-sm">🔥</span>
              <span className={`font-mono text-[10px] sm:text-xs ${isDark ? 'text-[rgba(255,255,255,0.7)]' : 'text-[rgba(0,0,0,0.6)]'}`}>
                Ready
              </span>
            </div>
          </div>

          {/* Right: Chevron */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-shrink-0"
          >
            <ChevronDown className={`w-5 h-5 ${isDark ? 'text-[rgba(255,255,255,0.4)]' : 'text-[rgba(0,0,0,0.4)]'}`} />
          </motion.div>
        </motion.button>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className={`px-3 sm:px-4 pb-3 sm:pb-4 pt-1 border-t ${isDark ? 'border-[rgba(255,255,255,0.04)]' : 'border-[rgba(0,0,0,0.04)]'}`}>
                {/* AI Insight */}
                <p className={`font-mono text-xs sm:text-sm italic leading-relaxed ${isDark ? 'text-[#00D4FF]' : 'text-[#0099CC]'}`}>
                  &ldquo;{aiInsight}&rdquo;
                </p>

                {/* Link to Health Hub */}
                <Link
                  href="/health"
                  className={`inline-flex items-center gap-1.5 mt-3 font-mono text-xs transition-colors group ${isDark ? 'text-[#F5C518] hover:text-[#FFD633]' : 'text-[#D4A912] hover:text-[#B8941A]'}`}
                >
                  See full health data
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
