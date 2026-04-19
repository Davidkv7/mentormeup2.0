"use client";

import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "@/contexts/theme-context";

interface QuickReplyChipsProps {
  chips: string[];
  onSelect: (chip: string) => void;
  visible: boolean;
}

export function QuickReplyChips({
  chips,
  onSelect,
  visible,
}: QuickReplyChipsProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
          transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          className="flex flex-wrap gap-2 sm:gap-2.5 justify-center"
        >
          {chips.map((chip, index) => (
            <motion.button
              key={chip}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.06, ease: [0.25, 0.4, 0.25, 1] }}
              onClick={() => onSelect(chip)}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-mono text-[10px] sm:text-xs transition-all duration-300 hover:text-[#F5C518] ${isDark ? "text-[rgba(255,255,255,0.6)]" : "text-[rgba(0,0,0,0.6)]"}`}
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                backdropFilter: 'blur(16px)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245, 197, 24, 0.1) 0%, rgba(245, 197, 24, 0.04) 100%)';
                e.currentTarget.style.border = '1px solid rgba(245, 197, 24, 0.25)';
                e.currentTarget.style.boxShadow = '0 0 16px rgba(245, 197, 24, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)';
                e.currentTarget.style.border = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {chip}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
