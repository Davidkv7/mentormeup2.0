"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useTheme } from "@/contexts/theme-context";

const moods = [
  { emoji: "😤", label: "Energised" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😓", label: "Struggling" },
];

export function MoodSelector() {
  const [selected, setSelected] = useState<number | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
      className="space-y-4"
    >
      <p className={`font-mono text-xs sm:text-sm ${isDark ? 'text-[rgba(255,255,255,0.5)]' : 'text-[rgba(0,0,0,0.5)]'}`}>How are you feeling?</p>
      <div className="flex gap-2 sm:gap-3">
        {moods.map((mood, index) => (
          <button
            key={mood.label}
            onClick={() => setSelected(index)}
            className={`flex flex-1 flex-col items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-300 ${
              selected === index
                ? isDark 
                  ? "shadow-[0_0_24px_rgba(245,197,24,0.3),0_0_0_1px_rgba(245,197,24,0.3)]"
                  : "shadow-[0_0_20px_rgba(212,169,18,0.25),0_0_0_1px_rgba(212,169,18,0.3)]"
                : isDark
                  ? "hover:bg-[rgba(255,255,255,0.04)]"
                  : "hover:bg-[rgba(0,0,0,0.03)]"
            }`}
            style={{
              background: selected === index 
                ? isDark
                  ? 'linear-gradient(135deg, rgba(245, 197, 24, 0.15) 0%, rgba(245, 197, 24, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(212, 169, 18, 0.15) 0%, rgba(212, 169, 18, 0.05) 100%)'
                : isDark
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)'
                  : 'linear-gradient(135deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.01) 100%)',
              backdropFilter: 'blur(16px)',
              border: selected === index 
                ? isDark
                  ? '1px solid rgba(245, 197, 24, 0.25)'
                  : '1px solid rgba(212, 169, 18, 0.3)'
                : isDark
                  ? '1px solid rgba(255, 255, 255, 0.06)'
                  : '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            <span className="text-xl sm:text-2xl">{mood.emoji}</span>
            <span
              className={`font-mono text-[10px] sm:text-xs transition-colors ${
                selected === index 
                  ? isDark ? "text-[#F5C518]" : "text-[#D4A912]"
                  : isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"
              }`}
            >
              {mood.label}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
