"use client";

import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

export type CalendarLayerType = "gold" | "cyan" | "purple" | "green" | "red";

interface CalendarLayer {
  id: CalendarLayerType;
  name: string;
  color: string;
  enabled: boolean;
}

interface CalendarLayersProps {
  layers: CalendarLayer[];
  onToggleLayer: (id: CalendarLayerType) => void;
}

export function CalendarLayers({ layers, onToggleLayer }: CalendarLayersProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="w-full">
      <h3 className={`font-sans font-semibold text-sm mb-4 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>Calendars</h3>
      <div className="flex flex-col gap-2">
        {layers.map((layer, index) => (
          <motion.button
            key={layer.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onToggleLayer(layer.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left ${
              layer.enabled
                ? isDark ? "bg-[rgba(255,255,255,0.04)]" : "bg-[rgba(0,0,0,0.04)]"
                : "opacity-50 hover:opacity-70"
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                layer.enabled ? "shadow-[0_0_8px_currentColor]" : ""
              }`}
              style={{ backgroundColor: layer.color }}
            />
            <span className={`font-mono text-xs flex-1 ${isDark ? "text-[rgba(255,255,255,0.8)]" : "text-[rgba(0,0,0,0.8)]"}`}>
              {layer.name}
            </span>
            {layer.enabled && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-[rgba(255,255,255,0.4)]" : "bg-[rgba(0,0,0,0.4)]"}`}
              />
            )}
          </motion.button>
        ))}
      </div>
      <button className={`flex items-center gap-2 px-3 py-2.5 mt-3 hover:text-[#00D4FF] transition-colors font-mono text-xs ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
        <Plus className="w-3.5 h-3.5" />
        Add Calendar
      </button>
    </div>
  );
}
