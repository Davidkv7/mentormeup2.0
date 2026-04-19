"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

interface TaskCardProps {
  title: string;
  goalTag: string;
  duration: string;
  index: number;
  isComplete?: boolean;
  onToggle?: () => void;
}

export function TaskCard({ title, goalTag, duration, index, isComplete: controlledComplete, onToggle }: TaskCardProps) {
  const [internalComplete, setInternalComplete] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Use controlled state if provided, otherwise use internal state
  const isComplete = controlledComplete !== undefined ? controlledComplete : internalComplete;

  const handleToggle = () => {
    if (!isComplete) {
      setShowRipple(true);
      setTimeout(() => setShowRipple(false), 600);
    }
    if (onToggle) {
      onToggle();
    } else {
      setInternalComplete(!internalComplete);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + index * 0.1, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
      className={`relative overflow-hidden glass-card p-4 sm:p-5 transition-all duration-300 hover-lift ${
        isComplete ? "opacity-50" : ""
      }`}
    >
      {/* Ripple effect */}
      <AnimatePresence>
        {showRipple && (
          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className={`absolute right-5 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full ${isDark ? 'bg-[#F5C518]' : 'bg-[#D4A912]'}`}
            style={{ originX: 0.5, originY: 0.5 }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex items-center gap-3 sm:gap-5">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-300 ${
            isComplete
              ? isDark 
                ? "border-[#F5C518] bg-[#F5C518] shadow-[0_0_16px_rgba(245,197,24,0.4)]"
                : "border-[#D4A912] bg-[#D4A912] shadow-[0_0_12px_rgba(212,169,18,0.3)]"
              : isDark
                ? "border-[rgba(255,255,255,0.25)] hover:border-[#F5C518]/60 hover:shadow-[0_0_12px_rgba(245,197,24,0.2)]"
                : "border-[rgba(0,0,0,0.2)] hover:border-[#D4A912]/60 hover:shadow-[0_0_8px_rgba(212,169,18,0.15)]"
          }`}
        >
          <AnimatePresence>
            {isComplete && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Check className={`h-4 w-4 ${isDark ? 'text-[#080B14]' : 'text-white'}`} strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Content */}
        <div className="flex-1">
          <h3
            className={`font-sans text-sm sm:text-base font-semibold transition-all ${
              isDark ? 'text-white' : 'text-[#1A1D21]'
            } ${isComplete ? "line-through opacity-50" : ""}`}
          >
            {title}
          </h3>
          <div className="mt-1.5 sm:mt-2 flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className={`rounded-full px-2 sm:px-3 py-0.5 sm:py-1 font-mono text-[10px] sm:text-xs ${
              isDark 
                ? 'bg-[rgba(245,197,24,0.15)] border border-[rgba(245,197,24,0.2)] text-[#F5C518]'
                : 'bg-[rgba(212,169,18,0.12)] border border-[rgba(212,169,18,0.2)] text-[#D4A912]'
            }`}>
              {goalTag}
            </span>
            <span className={`font-mono text-[10px] sm:text-xs ${isDark ? 'text-[rgba(255,255,255,0.4)]' : 'text-[rgba(0,0,0,0.4)]'}`}>{duration}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
