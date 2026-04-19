"use client";

import { motion } from "motion/react";
import { format } from "date-fns";
import {
  Watch,
  Smartphone,
  Activity,
  Moon,
  Footprints,
  Flame,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { SidebarNav } from "@/components/sidebar-nav";
import { AnimatedOrb } from "@/components/animated-orb";
import { useTheme } from "@/contexts/theme-context";

const sleepData = [
  { day: "Mon", hours: 7.2, deep: 1.8, rem: 2.1 },
  { day: "Tue", hours: 6.5, deep: 1.4, rem: 1.7 },
  { day: "Wed", hours: 5.8, deep: 1.1, rem: 1.3 },
  { day: "Thu", hours: 6.2, deep: 1.3, rem: 1.5 },
  { day: "Fri", hours: 7.8, deep: 2.0, rem: 2.2 },
  { day: "Sat", hours: 8.2, deep: 2.1, rem: 2.4 },
  { day: "Sun", hours: 7.5, deep: 1.9, rem: 2.0 },
];

const hrvData = Array.from({ length: 14 }, (_, i) => ({
  day: i + 1,
  hrv: 45 + Math.random() * 20 + (i > 7 ? 5 : 0),
  isGoalStart: i === 0,
}));

const recoveryVsOutputData = [
  { day: "Mon", recovery: 78, taskLoad: 72 },
  { day: "Tue", recovery: 82, taskLoad: 80 },
  { day: "Wed", recovery: 65, taskLoad: 88 },
  { day: "Thu", recovery: 58, taskLoad: 92 },
  { day: "Fri", recovery: 74, taskLoad: 68 },
  { day: "Sat", recovery: 85, taskLoad: 45 },
  { day: "Sun", recovery: 88, taskLoad: 50 },
];

function ReadinessRing({ score, isDark }: { score: number; isDark: boolean }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative w-[180px] h-[180px] sm:w-[200px] sm:h-[200px]">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
          strokeWidth="12"
        />
        <motion.circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="url(#goldGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        />
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F5C518" />
            <stop offset="100%" stopColor="#FFD633" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="font-mono text-4xl sm:text-5xl font-bold text-[#F5C518]"
        >
          {score}
        </motion.span>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
  percentage,
  isDark,
}: {
  label: string;
  value: string;
  color: string;
  percentage: number;
  isDark: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b last:border-0 ${isDark ? "border-[rgba(255,255,255,0.04)]" : "border-[rgba(0,0,0,0.06)]"}`}>
      <span className={`font-mono text-xs sm:text-sm ${isDark ? "text-[rgba(255,255,255,0.6)]" : "text-[rgba(0,0,0,0.6)]"}`}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <div className={`w-16 sm:w-20 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-[rgba(255,255,255,0.08)]" : "bg-[rgba(0,0,0,0.08)]"}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        <span className={`font-mono text-xs sm:text-sm font-medium w-12 text-right ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

function DeviceRow({
  icon: Icon,
  name,
  status,
  lastSync,
  onConnect,
  isDark,
}: {
  icon: React.ElementType;
  name: string;
  status: "connected" | "disconnected";
  lastSync?: string;
  onConnect?: () => void;
  isDark: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-3 border-b last:border-0 ${isDark ? "border-[rgba(255,255,255,0.04)]" : "border-[rgba(0,0,0,0.06)]"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? "bg-[rgba(255,255,255,0.04)]" : "bg-[rgba(0,0,0,0.04)]"}`}>
          <Icon className={`w-5 h-5 ${isDark ? "text-[rgba(255,255,255,0.6)]" : "text-[rgba(0,0,0,0.6)]"}`} />
        </div>
        <div>
          <p className={`font-sans text-sm ${isDark ? "text-white" : "text-[#1A1D21]"}`}>{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div
              className={`w-2 h-2 rounded-full ${
                status === "connected"
                  ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                  : isDark ? "bg-[rgba(255,255,255,0.2)]" : "bg-[rgba(0,0,0,0.2)]"
              }`}
            />
            <span className={`font-mono text-[10px] ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
              {status === "connected" ? lastSync : "Not connected"}
            </span>
          </div>
        </div>
      </div>
      {status === "disconnected" && (
        <button
          onClick={onConnect}
          className="px-3 py-1.5 rounded-lg bg-[rgba(245,197,24,0.12)] text-[#F5C518] font-mono text-xs hover:bg-[rgba(245,197,24,0.2)] transition-colors"
        >
          Connect
        </button>
      )}
    </div>
  );
}

function WeeklyStatBlock({
  icon: Icon,
  label,
  value,
  delay,
  isDark,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delay: number;
  isDark: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`p-3 sm:p-4 rounded-xl border ${isDark ? "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)]" : "bg-[rgba(0,0,0,0.02)] border-[rgba(0,0,0,0.06)]"}`}
    >
      <Icon className={`w-4 h-4 mb-2 ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`} />
      <p className="font-mono text-base sm:text-lg font-bold text-[#F5C518]">
        {value}
      </p>
      <p className={`font-sans text-[10px] sm:text-xs mt-0.5 ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
        {label}
      </p>
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label, isDark }: any) {
  if (active && payload && payload.length) {
    return (
      <div className={`px-3 py-2 rounded-lg border ${isDark ? "bg-[rgba(13,17,23,0.95)] border-[rgba(255,255,255,0.1)]" : "bg-white border-[rgba(0,0,0,0.1)]"}`}>
        <p className={`font-mono text-xs ${isDark ? "text-[rgba(255,255,255,0.6)]" : "text-[rgba(0,0,0,0.6)]"}`}>{label}</p>
        {payload.map((entry: any) => (
          <p
            key={entry.dataKey ?? entry.name}
            className="font-mono text-sm font-medium"
            style={{ color: entry.color }}
          >
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function HealthHubPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const today = format(new Date(), "EEEE, MMMM d");

  const axisColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#080B14]" : "bg-[#F8F9FA]"} noise-bg transition-colors duration-300`}>
      <SidebarNav />

      <main className="relative ml-0 md:ml-[72px] lg:ml-[240px] pt-16 md:pt-0 pb-24 md:pb-8 min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-10"
          >
            <div className="flex items-center gap-4">
              <h1 className={`font-sans font-bold text-2xl sm:text-3xl lg:text-4xl ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                Health Hub
              </h1>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)]">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                <span className="font-mono text-xs text-[#00D4FF]">
                  Oura Connected
                </span>
              </div>
            </div>
            <p className={`font-mono text-sm ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
              {today}
            </p>
          </motion.div>

          {/* 3-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-4 space-y-4 lg:space-y-6">
              {/* Readiness Score Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={`p-5 sm:p-6 lg:p-8 rounded-2xl ${isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)]" : "bg-white border-[rgba(0,0,0,0.06)]"} border`}
              >
                <div className="flex flex-col items-center">
                  <ReadinessRing score={82} isDark={isDark} />
                  <h2 className={`font-sans font-semibold text-lg sm:text-xl mt-4 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                    Readiness Score
                  </h2>
                  <p className="font-mono text-xs sm:text-sm text-[#00D4FF] mt-1">
                    Good to train today
                  </p>
                </div>

                <div className={`mt-6 pt-4 border-t ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.06)]"}`}>
                  <StatRow label="Sleep Score" value="79" color="#00D4FF" percentage={79} isDark={isDark} />
                  <StatRow label="HRV" value="58ms" color="#F5C518" percentage={65} isDark={isDark} />
                  <StatRow label="Resting HR" value="52bpm" color="#22C55E" percentage={85} isDark={isDark} />
                </div>
              </motion.div>

              {/* AI Coach Insight Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`p-5 sm:p-6 rounded-2xl border-l-4 border-l-[#00D4FF] ${isDark ? "bg-[rgba(0,212,255,0.06)] border-[rgba(0,212,255,0.15)]" : "bg-[rgba(0,212,255,0.04)] border-[rgba(0,212,255,0.15)]"} border`}
              >
                <div className="flex gap-4">
                  <AnimatedOrb size={40} />
                  <div className="flex-1">
                    <p className={`font-mono text-xs sm:text-sm leading-relaxed ${isDark ? "text-[rgba(255,255,255,0.85)]" : "text-[rgba(0,0,0,0.75)]"}`}>
                      Your HRV dropped 12% vs your 7-day average. I&apos;ve moved
                      today&apos;s deep work block to 10am when your energy typically
                      peaks. Light task first.
                    </p>
                    <button className="mt-4 font-mono text-xs text-[#F5C518] hover:text-[#FFD633] transition-colors flex items-center gap-1">
                      See adjusted schedule
                      <span className="text-[10px]">→</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* CENTER COLUMN */}
            <div className="lg:col-span-5 space-y-4 lg:space-y-6">
              {/* Sleep Breakdown Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className={`p-5 sm:p-6 rounded-2xl ${isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)]" : "bg-white border-[rgba(0,0,0,0.06)]"} border`}
              >
                <h3 className={`font-sans font-semibold text-base sm:text-lg mb-4 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                  Sleep This Week
                </h3>
                <div className="h-[180px] sm:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sleepData} barCategoryGap="20%">
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: axisColor, fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: axisColor, fontSize: 11 }}
                        domain={[0, 10]}
                      />
                      <Tooltip content={<CustomTooltip isDark={isDark} />} />
                      <Bar dataKey="hours" radius={[4, 4, 0, 0]} fill="#F5C518" name="Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className={`flex flex-wrap gap-2 sm:gap-3 mt-4 pt-4 border-t ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.06)]"}`}>
                  <div className={`px-3 py-1.5 rounded-lg border ${isDark ? "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)]" : "bg-[rgba(0,0,0,0.02)] border-[rgba(0,0,0,0.06)]"}`}>
                    <p className={`font-mono text-[10px] ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
                      Avg Deep Sleep
                    </p>
                    <p className="font-mono text-sm text-[#00D4FF] font-medium">1h 42m</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg border ${isDark ? "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)]" : "bg-[rgba(0,0,0,0.02)] border-[rgba(0,0,0,0.06)]"}`}>
                    <p className={`font-mono text-[10px] ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
                      Avg REM
                    </p>
                    <p className="font-mono text-sm text-[#F5C518] font-medium">1h 58m</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg border ${isDark ? "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)]" : "bg-[rgba(0,0,0,0.02)] border-[rgba(0,0,0,0.06)]"}`}>
                    <p className={`font-mono text-[10px] ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
                      Sleep Efficiency
                    </p>
                    <p className="font-mono text-sm text-[#22C55E] font-medium">89%</p>
                  </div>
                </div>
              </motion.div>

              {/* HRV Trend Line */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className={`p-5 sm:p-6 rounded-2xl ${isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)]" : "bg-white border-[rgba(0,0,0,0.06)]"} border`}
              >
                <h3 className={`font-sans font-semibold text-base sm:text-lg mb-4 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                  HRV Trend
                </h3>
                <div className="h-[140px] sm:h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hrvData}>
                      <defs>
                        <linearGradient id="hrvGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: axisColor, fontSize: 10 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: axisColor, fontSize: 10 }}
                        domain={[30, 80]}
                      />
                      <Tooltip content={<CustomTooltip isDark={isDark} />} />
                      <ReferenceLine
                        x={1}
                        stroke="#F5C518"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        label={{
                          value: "Goal started",
                          position: "top",
                          fill: "#F5C518",
                          fontSize: 10,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="hrv"
                        stroke="#00D4FF"
                        strokeWidth={2}
                        fill="url(#hrvGradient)"
                        name="HRV"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-3 space-y-4 lg:space-y-6">
              {/* Connected Devices Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`p-5 sm:p-6 rounded-2xl ${isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)]" : "bg-white border-[rgba(0,0,0,0.06)]"} border`}
              >
                <h3 className={`font-sans font-semibold text-base sm:text-lg mb-4 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                  Your Devices
                </h3>
                <DeviceRow
                  icon={Activity}
                  name="Oura Ring Gen3"
                  status="connected"
                  lastSync="Synced 4 min ago"
                  isDark={isDark}
                />
                <DeviceRow
                  icon={Watch}
                  name="Apple Watch Series 9"
                  status="connected"
                  lastSync="Synced 12 min ago"
                  isDark={isDark}
                />
                <DeviceRow
                  icon={Smartphone}
                  name="Whoop 4.0"
                  status="disconnected"
                  onConnect={() => alert("Connecting Whoop...")}
                  isDark={isDark}
                />
              </motion.div>

              {/* Recovery vs Output Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className={`p-5 sm:p-6 rounded-2xl ${isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)]" : "bg-white border-[rgba(0,0,0,0.06)]"} border`}
              >
                <h3 className={`font-sans font-semibold text-base sm:text-lg mb-4 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
                  Recovery vs Task Load
                </h3>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recoveryVsOutputData}>
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: axisColor, fontSize: 10 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: axisColor, fontSize: 10 }}
                        domain={[0, 100]}
                      />
                      <Tooltip content={<CustomTooltip isDark={isDark} />} />
                      <Line
                        type="monotone"
                        dataKey="recovery"
                        stroke="#00D4FF"
                        strokeWidth={2}
                        dot={false}
                        name="Recovery"
                      />
                      <Line
                        type="monotone"
                        dataKey="taskLoad"
                        stroke="#F5C518"
                        strokeWidth={2}
                        dot={false}
                        name="Task Load"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Weekly Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="grid grid-cols-2 gap-3"
              >
                <WeeklyStatBlock icon={Footprints} label="Avg Steps" value="8,420" delay={0.4} isDark={isDark} />
                <WeeklyStatBlock icon={Flame} label="Active Cals" value="2,180" delay={0.45} isDark={isDark} />
                <WeeklyStatBlock icon={Moon} label="Avg Sleep" value="7h 12m" delay={0.5} isDark={isDark} />
                <WeeklyStatBlock icon={Zap} label="Active Days" value="5/7" delay={0.55} isDark={isDark} />
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
