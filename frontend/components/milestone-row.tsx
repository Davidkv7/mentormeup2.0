"use client";

import { motion } from "motion/react";
import { Check, Lock, ArrowRight } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

type MilestoneStatus = "complete" | "active" | "locked";

interface MilestoneRowProps {
  title: string;
  status: MilestoneStatus;
  index: number;
}

export function MilestoneRow({ title, status, index }: MilestoneRowProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const getIconContent = () => {
    if (status === "complete") {
      return <Check className="w-4 h-4" />;
    }
    if (status === "active") {
      return <div className="w-2.5 h-2.5 rounded-full bg-[#00D4FF] pulse-cyan" />;
    }
    return <Lock className="w-3.5 h-3.5" />;
  };

  const getStyles = () => {
    if (status === "complete") {
      return {
        iconBg: "bg-[rgba(245,197,24,0.15)] border-[rgba(245,197,24,0.4)] text-[#F5C518]",
        iconShadow: "shadow-[0_0_12px_rgba(245,197,24,0.2)]",
        text: "text-[#F5C518]",
        hoverBg: "hover:bg-[rgba(245,197,24,0.05)]",
        arrowColor: "text-[#F5C518]",
      };
    }
    if (status === "active") {
      return {
        iconBg: "bg-[rgba(0,212,255,0.15)] border-[rgba(0,212,255,0.4)]",
        iconShadow: "shadow-[0_0_12px_rgba(0,212,255,0.2)]",
        text: "text-foreground",
        hoverBg: "hover:bg-[rgba(0,212,255,0.05)]",
        arrowColor: "text-[#00D4FF]",
      };
    }
    return {
      iconBg: isDark 
        ? "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.3)]"
        : "bg-[rgba(0,0,0,0.04)] border-[rgba(0,0,0,0.12)] text-[rgba(0,0,0,0.3)]",
      iconShadow: "",
      text: isDark ? "text-[rgba(255,255,255,0.35)]" : "text-[rgba(0,0,0,0.35)]",
      hoverBg: "",
      arrowColor: "",
    };
  };

  const styles = getStyles();

  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.08 * index, ease: [0.25, 0.4, 0.25, 1] }}
      className={`group relative flex items-center justify-between p-3 sm:p-5 rounded-xl transition-all duration-300 ${styles.hoverBg} ${status !== "locked" ? "cursor-pointer" : "cursor-not-allowed"}`}
      style={{
        background: status !== "locked" 
          ? isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
          : 'transparent',
      }}
    >
      <div className="flex items-center gap-3 sm:gap-5 min-w-0">
        <div
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center flex-shrink-0 ${styles.iconBg} ${styles.iconShadow}`}
        >
          {getIconContent()}
        </div>
        <span className={`font-mono text-xs sm:text-sm ${styles.text} truncate`}>{title}</span>
      </div>
      {status !== "locked" && (
        <ArrowRight
          className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1 ${styles.arrowColor}`}
        />
      )}
      {/* Hover glow overlay */}
      {status !== "locked" && (
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            boxShadow: status === "complete" 
              ? 'inset 0 0 24px rgba(245, 197, 24, 0.08)' 
              : 'inset 0 0 24px rgba(0, 212, 255, 0.08)',
          }}
        />
      )}
    </motion.div>
  );
}
