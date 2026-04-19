"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles } from "lucide-react";
import type { CalendarEvent } from "./event-block";
import { useTheme } from "@/contexts/theme-context";

const colorOptions = [
  { id: "gold", color: "#F5C518", label: "AI Session" },
  { id: "cyan", color: "#00D4FF", label: "Trading Review" },
  { id: "purple", color: "#A855F7", label: "Mentor Call" },
  { id: "green", color: "#22C55E", label: "Deep Work" },
  { id: "red", color: "#EF4444", label: "Risk Review" },
] as const;

interface NewBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, "id">) => void;
  initialDate?: Date;
  initialHour?: number;
  editEvent?: CalendarEvent | null;
}

export function NewBlockModal({
  isOpen,
  onClose,
  onSave,
  initialDate,
  initialHour,
  editEvent,
}: NewBlockModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [title, setTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState<CalendarEvent["color"]>("gold");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [isAIScheduled, setIsAIScheduled] = useState(false);

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setSelectedColor(editEvent.color);
      setStartTime(
        `${String(editEvent.start.getHours()).padStart(2, "0")}:${String(editEvent.start.getMinutes()).padStart(2, "0")}`
      );
      setEndTime(
        `${String(editEvent.end.getHours()).padStart(2, "0")}:${String(editEvent.end.getMinutes()).padStart(2, "0")}`
      );
      setNotes(editEvent.notes || "");
      setIsAIScheduled(editEvent.isAIScheduled || false);
    } else if (initialHour !== undefined) {
      setStartTime(`${String(initialHour).padStart(2, "0")}:00`);
      setEndTime(`${String(initialHour + 1).padStart(2, "0")}:00`);
      setTitle("");
      setSelectedColor("gold");
      setNotes("");
      setIsAIScheduled(false);
    }
  }, [editEvent, initialHour, isOpen]);

  const handleSave = () => {
    if (!title.trim() || !initialDate) return;

    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const start = new Date(initialDate);
    start.setHours(startHour, startMin, 0, 0);

    const end = new Date(initialDate);
    end.setHours(endHour, endMin, 0, 0);

    onSave({
      title,
      start,
      end,
      color: selectedColor,
      notes: notes || undefined,
      isAIScheduled,
    });

    onClose();
  };

  const selectedColorData = colorOptions.find(c => c.id === selectedColor);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className={`fixed inset-0 z-50 backdrop-blur-md ${
              isDark ? "bg-[rgba(0,0,0,0.8)]" : "bg-[rgba(0,0,0,0.4)]"
            }`}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, x: "100%", y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ 
              type: "spring", 
              damping: 30, 
              stiffness: 400,
              mass: 0.8 
            }}
            className="fixed z-50 
              inset-0 sm:inset-auto
              sm:right-4 sm:top-1/2 sm:-translate-y-1/2
              lg:right-8
              w-full sm:w-[400px] lg:w-[440px] sm:max-h-[90vh]
              overflow-y-auto
            "
          >
            <div
              className={`min-h-full sm:min-h-0 sm:rounded-3xl overflow-hidden border-0 sm:border ${
                isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.1)]"
              }`}
              style={{
                background: isDark 
                  ? "linear-gradient(165deg, rgba(18, 22, 38, 0.98) 0%, rgba(8, 11, 20, 0.99) 50%, rgba(6, 8, 16, 1) 100%)"
                  : "linear-gradient(165deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.99) 50%, rgba(245, 246, 247, 1) 100%)",
                boxShadow: isDark
                  ? `0 0 0 1px rgba(255, 255, 255, 0.03) inset, 0 32px 80px rgba(0, 0, 0, 0.6), 0 16px 40px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.3)`
                  : `0 0 0 1px rgba(255, 255, 255, 0.5) inset, 0 32px 80px rgba(0, 0, 0, 0.15), 0 16px 40px rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.08)`,
              }}
            >
              {/* Premium header with subtle gradient line */}
              <div 
                className="h-1 w-full"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${selectedColorData?.color || '#F5C518'}40 50%, transparent 100%)`,
                }}
              />

              <div className="p-5 sm:p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <div>
                    <h2 className={`font-sans font-bold text-lg sm:text-xl ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                      {editEvent ? "Edit Block" : "New Block"}
                    </h2>
                    <p className={`font-mono text-[10px] sm:text-xs mt-1 ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                      Schedule your time
                    </p>
                  </div>
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`p-2 sm:p-2.5 rounded-xl transition-all border ${
                      isDark 
                        ? "bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:text-white border-[rgba(255,255,255,0.06)]"
                        : "bg-[rgba(0,0,0,0.04)] hover:bg-[rgba(0,0,0,0.08)] text-[rgba(0,0,0,0.5)] hover:text-[#1A1D21] border-[rgba(0,0,0,0.06)]"
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Form */}
                <div className="flex flex-col gap-5 sm:gap-6">
                  {/* Title */}
                  <div>
                    <label className={`block font-mono text-[10px] sm:text-xs mb-2 sm:mb-2.5 tracking-wide uppercase ${
                      isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"
                    }`}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What are you working on?"
                      className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg sm:rounded-xl border font-mono text-xs sm:text-sm focus:outline-none transition-all duration-300 ${
                        isDark 
                          ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[rgba(255,255,255,0.25)] focus:border-[rgba(245,197,24,0.4)] focus:bg-[rgba(255,255,255,0.05)]"
                          : "bg-[rgba(0,0,0,0.02)] border-[rgba(0,0,0,0.08)] text-[#1A1D21] placeholder:text-[rgba(0,0,0,0.3)] focus:border-[rgba(212,169,18,0.5)] focus:bg-white"
                      }`}
                    />
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label className={`block font-mono text-[10px] sm:text-xs mb-2 sm:mb-2.5 tracking-wide uppercase ${
                      isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"
                    }`}>
                      Category
                    </label>
                    <div className="flex gap-2 sm:gap-3">
                      {colorOptions.map((option) => (
                        <motion.button
                          key={option.id}
                          onClick={() => setSelectedColor(option.id)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className="group relative w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl transition-all duration-300"
                          style={{
                            backgroundColor: selectedColor === option.id ? `${option.color}30` : `${option.color}10`,
                            border: selectedColor === option.id ? `2px solid ${option.color}` : `2px solid ${option.color}40`,
                            boxShadow: selectedColor === option.id ? `0 0 20px ${option.color}30` : 'none',
                          }}
                        >
                          <span
                            className="absolute inset-2 sm:inset-2.5 rounded-md sm:rounded-lg"
                            style={{ backgroundColor: option.color }}
                          />
                          {/* Tooltip */}
                          <span className={`absolute -bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1.5 text-[10px] font-mono rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border hidden sm:block ${
                            isDark 
                              ? "bg-[rgba(0,0,0,0.9)] text-white border-[rgba(255,255,255,0.1)]"
                              : "bg-white text-[#1A1D21] border-[rgba(0,0,0,0.1)] shadow-lg"
                          }`}>
                            {option.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                    {/* Mobile category label */}
                    <p className={`sm:hidden font-mono text-[10px] mt-2 ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                      {colorOptions.find(c => c.id === selectedColor)?.label}
                    </p>
                  </div>

                  {/* AI Scheduling Toggle */}
                  <div>
                    <button
                      onClick={() => setIsAIScheduled(!isAIScheduled)}
                      className={`w-full flex items-center justify-between px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg sm:rounded-xl border transition-all duration-300 ${
                        isAIScheduled 
                          ? "bg-[rgba(245,197,24,0.08)] border-[rgba(245,197,24,0.3)]" 
                          : isDark
                            ? "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.04)]"
                            : "bg-[rgba(0,0,0,0.02)] border-[rgba(0,0,0,0.06)] hover:bg-[rgba(0,0,0,0.04)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div 
                          className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                            isAIScheduled 
                              ? "bg-[rgba(245,197,24,0.2)]" 
                              : isDark ? "bg-[rgba(255,255,255,0.05)]" : "bg-[rgba(0,0,0,0.05)]"
                          }`}
                        >
                          <Sparkles 
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                              isAIScheduled ? "text-[#F5C518]" : isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"
                            }`} 
                          />
                        </div>
                        <div className="text-left">
                          <p className={`font-sans text-xs sm:text-sm font-medium transition-colors ${
                            isAIScheduled 
                              ? isDark ? "text-white" : "text-[#1A1D21]" 
                              : isDark ? "text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.7)]"
                          }`}>
                            AI Scheduled
                          </p>
                          <p className={`font-mono text-[9px] sm:text-[10px] ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                            Optimized by your coach
                          </p>
                        </div>
                      </div>
                      <div 
                        className={`w-9 h-5 sm:w-11 sm:h-6 rounded-full transition-all duration-300 relative ${
                          isAIScheduled 
                            ? "bg-[#F5C518]" 
                            : isDark ? "bg-[rgba(255,255,255,0.1)]" : "bg-[rgba(0,0,0,0.15)]"
                        }`}
                      >
                        <motion.div 
                          className="absolute top-0.5 sm:top-1 w-4 h-4 rounded-full bg-white shadow-md"
                          animate={{ left: isAIScheduled ? "calc(100% - 18px)" : "2px" }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      </div>
                    </button>
                  </div>

                  {/* Time Pickers */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className={`block font-mono text-[10px] sm:text-xs mb-2 sm:mb-2.5 tracking-wide uppercase ${
                        isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"
                      }`}>
                        Start
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg sm:rounded-xl border font-mono text-xs sm:text-sm focus:outline-none transition-all ${
                          isDark 
                            ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-white focus:border-[rgba(245,197,24,0.4)] [color-scheme:dark]"
                            : "bg-[rgba(0,0,0,0.02)] border-[rgba(0,0,0,0.08)] text-[#1A1D21] focus:border-[rgba(212,169,18,0.5)] [color-scheme:light]"
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block font-mono text-[10px] sm:text-xs mb-2 sm:mb-2.5 tracking-wide uppercase ${
                        isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"
                      }`}>
                        End
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg sm:rounded-xl border font-mono text-xs sm:text-sm focus:outline-none transition-all ${
                          isDark 
                            ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-white focus:border-[rgba(245,197,24,0.4)] [color-scheme:dark]"
                            : "bg-[rgba(0,0,0,0.02)] border-[rgba(0,0,0,0.08)] text-[#1A1D21] focus:border-[rgba(212,169,18,0.5)] [color-scheme:light]"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className={`block font-mono text-[10px] sm:text-xs mb-2 sm:mb-2.5 tracking-wide uppercase ${
                      isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"
                    }`}>
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes..."
                      rows={3}
                      className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg sm:rounded-xl border font-mono text-xs sm:text-sm focus:outline-none transition-all resize-none ${
                        isDark 
                          ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-white placeholder:text-[rgba(255,255,255,0.25)] focus:border-[rgba(245,197,24,0.4)]"
                          : "bg-[rgba(0,0,0,0.02)] border-[rgba(0,0,0,0.08)] text-[#1A1D21] placeholder:text-[rgba(0,0,0,0.3)] focus:border-[rgba(212,169,18,0.5)]"
                      }`}
                    />
                  </div>

                  {/* Save Button */}
                  <motion.button
                    onClick={handleSave}
                    disabled={!title.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#F5C518] to-[#E5B516] text-[#080B14] font-sans font-bold text-xs sm:text-sm transition-all duration-200 hover:from-[#FFD633] hover:to-[#F5C518] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(245,197,24,0.3),0_8px_32px_rgba(245,197,24,0.15)]"
                  >
                    Save Block
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
