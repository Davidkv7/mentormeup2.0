"use client";

import { motion } from "motion/react";
import { format } from "date-fns";
import { Pencil, Trash2, GripVertical, Sparkles } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: "gold" | "cyan" | "purple" | "green" | "red";
  notes?: string;
  isAIScheduled?: boolean;
}

const getColorMap = (isDark: boolean) => ({
  gold: {
    bg: isDark ? "rgba(245, 197, 24, 0.15)" : "rgba(245, 197, 24, 0.25)",
    border: "#F5C518",
    hover: isDark ? "rgba(245, 197, 24, 0.25)" : "rgba(245, 197, 24, 0.35)",
    shadow: "rgba(245, 197, 24, 0.3)",
    badge: isDark ? "rgba(245, 197, 24, 0.2)" : "rgba(245, 197, 24, 0.3)",
    text: isDark ? "#FFFFFF" : "#1A1D21",
    subtext: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
  },
  cyan: {
    bg: isDark ? "rgba(0, 212, 255, 0.15)" : "rgba(0, 153, 204, 0.2)",
    border: isDark ? "#00D4FF" : "#0099CC",
    hover: isDark ? "rgba(0, 212, 255, 0.25)" : "rgba(0, 153, 204, 0.3)",
    shadow: "rgba(0, 212, 255, 0.3)",
    badge: isDark ? "rgba(0, 212, 255, 0.2)" : "rgba(0, 153, 204, 0.25)",
    text: isDark ? "#FFFFFF" : "#1A1D21",
    subtext: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
  },
  purple: {
    bg: isDark ? "rgba(168, 85, 247, 0.15)" : "rgba(168, 85, 247, 0.2)",
    border: "#A855F7",
    hover: isDark ? "rgba(168, 85, 247, 0.25)" : "rgba(168, 85, 247, 0.3)",
    shadow: "rgba(168, 85, 247, 0.3)",
    badge: isDark ? "rgba(168, 85, 247, 0.2)" : "rgba(168, 85, 247, 0.25)",
    text: isDark ? "#FFFFFF" : "#1A1D21",
    subtext: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
  },
  green: {
    bg: isDark ? "rgba(34, 197, 94, 0.15)" : "rgba(34, 197, 94, 0.2)",
    border: "#22C55E",
    hover: isDark ? "rgba(34, 197, 94, 0.25)" : "rgba(34, 197, 94, 0.3)",
    shadow: "rgba(34, 197, 94, 0.3)",
    badge: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.25)",
    text: isDark ? "#FFFFFF" : "#1A1D21",
    subtext: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
  },
  red: {
    bg: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.2)",
    border: "#EF4444",
    hover: isDark ? "rgba(239, 68, 68, 0.25)" : "rgba(239, 68, 68, 0.3)",
    shadow: "rgba(239, 68, 68, 0.3)",
    badge: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.25)",
    text: isDark ? "#FFFFFF" : "#1A1D21",
    subtext: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
  },
});

interface EventBlockProps {
  event: CalendarEvent;
  height: number;
  top: number;
  onClick: () => void;
  index: number;
  compact?: boolean;
}

export function EventBlock({ event, height, top, onClick, index, compact = false }: EventBlockProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const colorMap = getColorMap(isDark);
  const colors = colorMap[event.color];
  const minHeight = Math.max(height, compact ? 32 : 40);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      className="absolute left-0.5 right-0.5 sm:left-1 sm:right-1 group cursor-pointer rounded-md sm:rounded-lg overflow-hidden transition-all duration-200"
      style={{
        top: `${top}px`,
        height: `${minHeight}px`,
        background: colors.bg,
        borderLeft: `${compact ? '3px' : '4px'} solid ${colors.border}`,
      }}
      whileHover={{
        y: -2,
        boxShadow: `0 4px 20px ${colors.shadow}`,
        background: colors.hover,
      }}
    >
      {/* Action Buttons - visible on hover, hidden on mobile */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={`p-1 rounded transition-colors ${
            isDark 
              ? "hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)]" 
              : "hover:bg-[rgba(0,0,0,0.1)] text-[rgba(0,0,0,0.5)]"
          }`}
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={`p-1 rounded transition-colors ${
            isDark 
              ? "hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)]" 
              : "hover:bg-[rgba(0,0,0,0.1)] text-[rgba(0,0,0,0.5)]"
          }`}
        >
          <Trash2 className="w-3 h-3" />
        </button>
        <div className={`p-1 cursor-grab ${isDark ? "text-[rgba(255,255,255,0.3)]" : "text-[rgba(0,0,0,0.3)]"}`}>
          <GripVertical className="w-3 h-3" />
        </div>
      </div>

      <div className={`${compact ? 'p-1 sm:p-1.5' : 'p-1.5 sm:p-2'} h-full flex flex-col`}>
        {/* AI Scheduled Badge */}
        {event.isAIScheduled && !compact && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 + 0.2 }}
            className="flex items-center gap-1 mb-0.5 sm:mb-1"
          >
            <div 
              className="flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-md text-[7px] sm:text-[9px] font-mono"
              style={{ 
                background: colors.badge,
                border: `1px solid ${colors.border}40`,
              }}
            >
              <Sparkles 
                className="w-2 h-2 sm:w-2.5 sm:h-2.5" 
                style={{ color: colors.border }}
              />
              <span className="hidden sm:inline" style={{ color: colors.border }}>AI</span>
            </div>
          </motion.div>
        )}

        {/* Mobile AI indicator - just sparkle icon */}
        {event.isAIScheduled && compact && (
          <Sparkles 
            className="absolute top-1 right-1 w-2.5 h-2.5" 
            style={{ color: colors.border }}
          />
        )}

        <h4 
          className={`font-sans font-semibold leading-tight line-clamp-${compact ? '1' : '2'} ${
            compact ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'
          }`}
          style={{ color: colors.text }}
        >
          {event.title}
        </h4>
        {minHeight >= (compact ? 45 : 60) && (
          <p 
            className={`font-mono mt-0.5 sm:mt-1 ${
              compact ? 'text-[7px] sm:text-[8px]' : 'text-[8px] sm:text-[10px]'
            }`}
            style={{ color: colors.subtext }}
          >
            {format(event.start, "h:mm")} – {format(event.end, "h:mm a")}
          </p>
        )}
      </div>

      {/* Drag-to-resize handle at bottom - hidden on mobile */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="w-6 sm:w-8 h-1 rounded-full"
          style={{ background: `${colors.border}60` }}
        />
      </div>
    </motion.div>
  );
}
