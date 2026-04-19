"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  getHours,
  getMinutes,
  differenceInMinutes,
} from "date-fns";
import { EventBlock, type CalendarEvent } from "./event-block";
import { useTheme } from "@/contexts/theme-context";

interface WeeklyViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
  onDateSelect?: (date: Date) => void;
  visibleLayers: string[];
}

const HOUR_HEIGHT = 60;
const MOBILE_HOUR_HEIGHT = 50;
const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

export function WeeklyView({
  selectedDate,
  events,
  onSlotClick,
  onEventClick,
  onDateSelect,
  visibleLayers,
}: WeeklyViewProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const today = new Date();
  const weekStart = startOfWeek(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const hourHeight = isMobile ? MOBILE_HOUR_HEIGHT : HOUR_HEIGHT;

  const currentHour = today.getHours();
  const currentMinutes = today.getMinutes();
  const currentTimeTop = useMemo(
    () =>
      (currentHour - START_HOUR) * hourHeight +
      (currentMinutes / 60) * hourHeight,
    [currentHour, currentMinutes, hourHeight],
  );

  useEffect(() => {
    if (scrollRef.current) {
      const scrollPosition = Math.max(0, currentTimeTop - 150);
      scrollRef.current.scrollTop = scrollPosition;
    }
  }, [currentTimeTop]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => visibleLayers.includes(event.color));
  }, [events, visibleLayers]);

  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter((event) => isSameDay(event.start, day));
  };

  const getEventPosition = (event: CalendarEvent) => {
    const startHour = getHours(event.start);
    const startMinutes = getMinutes(event.start);
    const top = (startHour - START_HOUR) * hourHeight + (startMinutes / 60) * hourHeight;
    const durationMinutes = differenceInMinutes(event.end, event.start);
    const height = (durationMinutes / 60) * hourHeight;
    return { top, height };
  };

  const selectedIndex = days.findIndex((d) => isSameDay(d, selectedDate));
  const centerIndex = selectedIndex >= 0 ? selectedIndex : days.findIndex((d) => isSameDay(d, today));
  const startIdx = Math.max(0, Math.min(centerIndex - 1, 4));
  const visibleDays = isMobile ? days.slice(startIdx, startIdx + 3) : days;

  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const hoverBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";

  return (
    <div className={`flex flex-col h-full ${isDark ? "bg-[#080B14]" : "bg-[#F8F9FA]"}`}>
      {/* Day Headers */}
      <div className={`flex border-b sticky top-0 z-10 ${isDark ? "bg-[#080B14]" : "bg-[#F8F9FA]"}`} style={{ borderColor }}>
        <div className="w-10 sm:w-14 lg:w-20 flex-shrink-0" />
        
        {visibleDays.map((day) => {
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect?.(day)}
              className="flex-1 text-center py-2 sm:py-3 lg:py-4 border-l min-w-0 transition-colors"
              style={{ 
                borderColor,
                backgroundColor: isToday ? "rgba(245,197,24,0.04)" : "transparent"
              }}
            >
              <p className={`font-mono text-[9px] sm:text-[10px] lg:text-xs uppercase ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
                {format(day, "EEE")}
              </p>
              <p
                className={`font-sans font-semibold text-sm sm:text-base lg:text-lg mt-0.5 ${
                  isToday ? "text-[#F5C518]" : isSelected && isMobile ? "text-[#00D4FF]" : isDark ? "text-white" : "text-[#1A1D21]"
                }`}
              >
                {format(day, "d")}
              </p>
            </button>
          );
        })}
      </div>

      {/* Scrollable Time Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="relative flex">
          {/* Time Column */}
          <div className="w-10 sm:w-14 lg:w-20 flex-shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative border-b"
                style={{ height: `${hourHeight}px`, borderColor }}
              >
                <span className={`absolute -top-2 right-1 sm:right-2 lg:right-3 font-mono text-[8px] sm:text-[10px] lg:text-xs ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
                  {format(new Date().setHours(hour, 0), isMobile ? "ha" : "h a")}
                </span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {visibleDays.map((day) => {
            const isToday = isSameDay(day, today);
            const dayEvents = getEventsForDay(day);

            return (
              <div
                key={day.toISOString()}
                className="flex-1 relative border-l min-w-0"
                style={{
                  borderColor,
                  backgroundColor: isToday ? "rgba(245,197,24,0.02)" : "transparent"
                }}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    onClick={() => onSlotClick(day, hour)}
                    className="border-b cursor-pointer transition-colors"
                    style={{ 
                      height: `${hourHeight}px`, 
                      borderColor,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  />
                ))}

                {dayEvents.map((event, index) => {
                  const { top, height } = getEventPosition(event);
                  return (
                    <EventBlock
                      key={event.id}
                      event={event}
                      top={top}
                      height={height}
                      onClick={() => onEventClick(event)}
                      index={index}
                      compact={isMobile}
                    />
                  );
                })}

                {isToday && currentHour >= START_HOUR && currentHour <= END_HOUR && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: `${currentTimeTop}px` }}
                  >
                    <div className="relative flex items-center">
                      <div 
                        className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-[#FF4444] shadow-[0_0_12px_rgba(255,68,68,0.6)]" 
                        style={{ marginLeft: "-4px" }} 
                      />
                      <div className="flex-1 h-[2px] bg-[#FF4444] shadow-[0_0_8px_rgba(255,68,68,0.4)]" />
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
