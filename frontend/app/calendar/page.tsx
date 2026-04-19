"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  addWeeks,
  subWeeks,
  subDays,
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  setHours,
  setMinutes,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Menu, X, Calendar as CalendarIcon } from "lucide-react";
import { MiniCalendar } from "@/components/calendar/mini-calendar";
import { CalendarLayers, type CalendarLayerType } from "@/components/calendar/calendar-layers";
import { WeeklyView } from "@/components/calendar/weekly-view";
import { NewBlockModal } from "@/components/calendar/new-block-modal";
import type { CalendarEvent } from "@/components/calendar/event-block";
import { SidebarNav } from "@/components/sidebar-nav";
import { useTheme } from "@/contexts/theme-context";

const createSampleEvents = (): CalendarEvent[] => {
  const today = new Date();
  const weekStart = startOfWeek(today);

  return [
    {
      id: "1",
      title: "Morning Trade Review",
      start: setMinutes(setHours(addDays(weekStart, 1), 8), 0),
      end: setMinutes(setHours(addDays(weekStart, 1), 9), 0),
      color: "cyan",
      isAIScheduled: true,
    },
    {
      id: "2",
      title: "AI Coach Session",
      start: setMinutes(setHours(addDays(weekStart, 1), 10), 0),
      end: setMinutes(setHours(addDays(weekStart, 1), 11), 30),
      color: "gold",
      isAIScheduled: true,
    },
    {
      id: "3",
      title: "Deep Work: Strategy Study",
      start: setMinutes(setHours(addDays(weekStart, 2), 9), 0),
      end: setMinutes(setHours(addDays(weekStart, 2), 10), 0),
      color: "green",
      isAIScheduled: true,
    },
    {
      id: "4",
      title: "Mentor Call — John Rivera",
      start: setMinutes(setHours(addDays(weekStart, 3), 14), 0),
      end: setMinutes(setHours(addDays(weekStart, 3), 15), 0),
      color: "purple",
      isAIScheduled: false,
    },
  ];
};

const initialLayers = [
  { id: "gold" as CalendarLayerType, name: "AI Coaching Sessions", color: "#F5C518", enabled: true },
  { id: "cyan" as CalendarLayerType, name: "Trading Review Blocks", color: "#00D4FF", enabled: true },
  { id: "purple" as CalendarLayerType, name: "Human Mentor Calls", color: "#A855F7", enabled: true },
  { id: "green" as CalendarLayerType, name: "Deep Work / Study", color: "#22C55E", enabled: true },
  { id: "red" as CalendarLayerType, name: "Risk Review (flagged)", color: "#EF4444", enabled: true },
];

type ViewType = "day" | "week" | "month";

export default function CalendarPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<ViewType>("week");
  const [events, setEvents] = useState<CalendarEvent[]>(createSampleEvents);
  const [layers, setLayers] = useState(initialLayers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | undefined>();
  const [modalHour, setModalHour] = useState<number | undefined>();
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const datesWithEvents = useMemo(() => {
    return events.map((e) => e.start);
  }, [events]);

  const visibleLayers = useMemo(() => {
    return layers.filter((l) => l.enabled).map((l) => l.id);
  }, [layers]);

  const navigateWeek = (direction: "prev" | "next") => {
    setSelectedDate((prev) =>
      direction === "prev" ? subWeeks(prev, 1) : addWeeks(prev, 1)
    );
  };

  const navigateDay = (direction: "prev" | "next") => {
    setSelectedDate((prev) =>
      direction === "prev" ? subDays(prev, 1) : addDays(prev, 1)
    );
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const toggleLayer = (id: CalendarLayerType) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, enabled: !layer.enabled } : layer
      )
    );
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setModalDate(date);
    setModalHour(hour);
    setEditEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditEvent(event);
    setModalDate(event.start);
    setModalHour(event.start.getHours());
    setIsModalOpen(true);
  };

  const handleSaveEvent = (eventData: Omit<CalendarEvent, "id">) => {
    if (editEvent) {
      setEvents((prev) =>
        prev.map((e) => (e.id === editEvent.id ? { ...eventData, id: editEvent.id } : e))
      );
    } else {
      setEvents((prev) => [
        ...prev,
        { ...eventData, id: `event-${Date.now()}` },
      ]);
    }
    setIsModalOpen(false);
    setEditEvent(null);
  };

  const weekRange = `${format(startOfWeek(selectedDate), "MMM d")} – ${format(
    endOfWeek(selectedDate),
    "MMM d, yyyy"
  )}`;

  const mobileDate = format(selectedDate, "EEE, MMM d");

  return (
    <div className={`fixed inset-0 ${isDark ? "bg-[#080B14]" : "bg-[#F8F9FA]"} transition-colors duration-300`}>
      <SidebarNav />

      <div className="flex h-full ml-0 md:ml-[72px] lg:ml-[240px] pb-20 md:pb-0">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className={`fixed left-0 top-0 bottom-0 z-50 w-[280px] flex flex-col border-r lg:hidden ${
                  isDark ? "border-[rgba(255,255,255,0.06)] bg-[#0D1020]" : "border-[rgba(0,0,0,0.06)] bg-white"
                }`}
              >
                <div className={`flex items-center justify-between p-4 border-b ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.06)]"}`}>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-[#F5C518]" />
                    <span className={`font-sans font-semibold ${isDark ? "text-white" : "text-[#1A1D21]"}`}>Calendar</span>
                  </div>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`p-2 rounded-lg ${isDark ? "hover:bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)]" : "hover:bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]"}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-8">
                  <MiniCalendar
                    selectedDate={selectedDate}
                    onDateSelect={(date) => {
                      setSelectedDate(date);
                      setMobileSidebarOpen(false);
                    }}
                    datesWithEvents={datesWithEvents}
                  />
                  <CalendarLayers layers={layers} onToggleLayer={toggleLayer} />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Left Sidebar */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ 
            opacity: sidebarOpen ? 1 : 0, 
            x: sidebarOpen ? 0 : -240,
            width: sidebarOpen ? 240 : 0,
          }}
          className={`hidden lg:flex flex-col flex-shrink-0 border-r overflow-hidden ${
            isDark ? "border-[rgba(255,255,255,0.06)] bg-[#0D1020]" : "border-[rgba(0,0,0,0.06)] bg-white"
          }`}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-8">
            <MiniCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              datesWithEvents={datesWithEvents}
            />
            <CalendarLayers layers={layers} onToggleLayer={toggleLayer} />
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 border-b ${
              isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.06)]"
            }`}
            style={{
              background: isDark 
                ? "linear-gradient(180deg, rgba(13, 16, 32, 0.95) 0%, rgba(8, 11, 20, 0.9) 100%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,250,0.95) 100%)",
            }}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className={`lg:hidden p-2 rounded-lg ${isDark ? "hover:bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] hover:text-white" : "hover:bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)] hover:text-black"} transition-all`}
              >
                <Menu className="w-5 h-5" />
              </button>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`hidden lg:flex p-2 rounded-lg ${isDark ? "hover:bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] hover:text-white" : "hover:bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)] hover:text-black"} transition-all`}
              >
                <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarOpen ? "" : "rotate-180"}`} />
              </button>

              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  onClick={() => {
                    if (window.innerWidth < 640) {
                      navigateDay("prev");
                    } else {
                      navigateWeek("prev");
                    }
                  }}
                  className={`p-1.5 sm:p-2 rounded-lg ${isDark ? "hover:bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] hover:text-white" : "hover:bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)] hover:text-black"} transition-all`}
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => {
                    if (window.innerWidth < 640) {
                      navigateDay("next");
                    } else {
                      navigateWeek("next");
                    }
                  }}
                  className={`p-1.5 sm:p-2 rounded-lg ${isDark ? "hover:bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] hover:text-white" : "hover:bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)] hover:text-black"} transition-all`}
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <button
                onClick={goToToday}
                className={`px-2 sm:px-3 lg:px-4 py-1.5 rounded-lg border ${isDark ? "border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.06)] text-white" : "border-[rgba(0,0,0,0.1)] hover:bg-[rgba(0,0,0,0.04)] text-[#1A1D21]"} font-mono text-[10px] sm:text-xs transition-all`}
              >
                Today
              </button>

              <h1 className={`font-sans font-semibold text-xs sm:text-sm lg:text-lg ml-1 sm:ml-2 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                <span className="sm:hidden">{mobileDate}</span>
                <span className="hidden sm:inline">{weekRange}</span>
              </h1>
            </div>

            {/* View Toggle */}
            <div className={`hidden md:flex items-center gap-1 p-1 rounded-lg ${isDark ? "bg-[rgba(255,255,255,0.04)]" : "bg-[rgba(0,0,0,0.04)]"}`}>
              {(["day", "week", "month"] as ViewType[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md font-mono text-[10px] sm:text-xs capitalize transition-all ${
                    currentView === view
                      ? "bg-[rgba(245,197,24,0.15)] text-[#F5C518]"
                      : isDark ? "text-[rgba(255,255,255,0.5)] hover:text-white" : "text-[rgba(0,0,0,0.5)] hover:text-black"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* New Block Button */}
            <button
              onClick={() => {
                setModalDate(selectedDate);
                setModalHour(9);
                setEditEvent(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 lg:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#F5C518] to-[#E5B516] text-[#080B14] font-sans font-semibold text-[10px] sm:text-xs transition-all hover:from-[#FFD633] hover:to-[#F5C518] shadow-[0_2px_12px_rgba(245,197,24,0.25)]"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">New Block</span>
            </button>
          </motion.header>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-hidden">
            <WeeklyView
              selectedDate={selectedDate}
              events={events}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
              onDateSelect={setSelectedDate}
              visibleLayers={visibleLayers}
            />
          </div>
        </div>

        <NewBlockModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditEvent(null);
          }}
          onSave={handleSaveEvent}
          initialDate={modalDate}
          initialHour={modalHour}
          editEvent={editEvent}
        />
      </div>
    </div>
  );
}
