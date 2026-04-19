"use client";

import { motion } from "motion/react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();

  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        className="relative p-2 rounded-lg transition-all duration-300 hover:bg-[rgba(255,255,255,0.06)] dark:hover:bg-[rgba(255,255,255,0.06)] light:hover:bg-[rgba(0,0,0,0.04)]"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        <motion.div
          initial={false}
          animate={{ rotate: theme === "dark" ? 0 : 180 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {theme === "dark" ? (
            <Moon className="w-5 h-5 text-[#F5C518]" />
          ) : (
            <Sun className="w-5 h-5 text-[#D4A912]" />
          )}
        </motion.div>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggleTheme}
        className={`relative flex items-center w-16 h-8 rounded-full p-1 transition-all duration-300 ${
          theme === "dark"
            ? "bg-[rgba(255,255,255,0.08)]"
            : "bg-[rgba(0,0,0,0.08)]"
        }`}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {/* Icons */}
        <Sun
          className={`absolute left-2 w-4 h-4 transition-opacity ${
            theme === "light" ? "opacity-100 text-[#D4A912]" : "opacity-30 text-white"
          }`}
        />
        <Moon
          className={`absolute right-2 w-4 h-4 transition-opacity ${
            theme === "dark" ? "opacity-100 text-[#F5C518]" : "opacity-30 text-gray-500"
          }`}
        />

        {/* Sliding indicator */}
        <motion.div
          animate={{ x: theme === "dark" ? 32 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`w-6 h-6 rounded-full shadow-md ${
            theme === "dark"
              ? "bg-gradient-to-br from-[#1a1d24] to-[#0d1117]"
              : "bg-gradient-to-br from-white to-gray-100"
          }`}
        />
      </button>

      <span className={`font-mono text-xs ${theme === "dark" ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
        {theme === "dark" ? "Dark" : "Light"}
      </span>
    </div>
  );
}
