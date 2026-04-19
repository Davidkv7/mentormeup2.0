"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  datesWithEvents: Date[];
}

export function MiniCalendar({ selectedDate, onDateSelect, datesWithEvents }: MiniCalendarProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = new Date();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const hasEvent = (date: Date) => {
    return datesWithEvents.some((d) => isSameDay(d, date));
  };

  return (
    <div className="w-full">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-sans font-semibold text-sm ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className={`p-1.5 rounded-lg transition-all ${isDark ? "hover:bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] hover:text-white" : "hover:bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)] hover:text-black"}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className={`p-1.5 rounded-lg transition-all ${isDark ? "hover:bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] hover:text-white" : "hover:bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)] hover:text-black"}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className={`text-center font-mono text-[10px] py-1 ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const dayHasEvent = hasEvent(day);

          return (
            <motion.button
              key={day.toISOString()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.01 }}
              onClick={() => onDateSelect(day)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-mono transition-all duration-200 ${
                !isCurrentMonth
                  ? isDark ? "text-[rgba(255,255,255,0.2)]" : "text-[rgba(0,0,0,0.2)]"
                  : isToday
                  ? "bg-[#F5C518] text-[#080B14] font-semibold shadow-[0_2px_12px_rgba(245,197,24,0.3)]"
                  : isSelected
                  ? "bg-[rgba(245,197,24,0.2)] text-[#F5C518] border border-[rgba(245,197,24,0.3)]"
                  : isDark 
                    ? "text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.06)]"
                    : "text-[rgba(0,0,0,0.7)] hover:bg-[rgba(0,0,0,0.04)]"
              }`}
            >
              {format(day, "d")}
              {dayHasEvent && !isToday && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#F5C518]" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
