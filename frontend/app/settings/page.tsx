"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  User,
  Bell,
  Brain,
  Calendar,
  Palette,
  Link2,
  ChevronRight,
  Moon,
  Sun,
  Download,
  Trash2,
  LogOut,
} from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { useTheme } from "@/contexts/theme-context";

// Toggle Switch Component
function ToggleSwitch({
  enabled,
  onToggle,
  size = "default",
  isDark = true,
}: {
  enabled: boolean;
  onToggle: () => void;
  size?: "default" | "small";
  isDark?: boolean;
}) {
  const isSmall = size === "small";
  return (
    <button
      onClick={onToggle}
      className={`relative rounded-full transition-all duration-300 ${
        isSmall ? "w-10 h-5" : "w-12 h-6"
      } ${
        enabled
          ? "bg-gradient-to-r from-[#F5C518] to-[#D4A912]"
          : isDark ? "bg-[rgba(255,255,255,0.1)]" : "bg-[rgba(0,0,0,0.1)]"
      }`}
    >
      <motion.div
        animate={{ x: enabled ? (isSmall ? 20 : 24) : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`absolute top-1 rounded-full bg-white shadow-md ${
          isSmall ? "w-3 h-3" : "w-4 h-4"
        }`}
      />
    </button>
  );
}

// Settings Section Component
function SettingsSection({
  icon: Icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-4 sm:p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[rgba(245,197,24,0.12)] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#F5C518]" />
        </div>
        <h2 className="font-sans font-semibold text-foreground text-base sm:text-lg">
          {title}
        </h2>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

// Settings Row Component
function SettingsRow({
  label,
  description,
  children,
  isDark = true,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  isDark?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-3 border-b last:border-0 ${isDark ? "border-[rgba(255,255,255,0.04)]" : "border-[rgba(0,0,0,0.06)]"}`}>
      <div className="flex-1 min-w-0 mr-4">
        <p className="font-mono text-sm text-foreground">{label}</p>
        {description && (
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// Select Dropdown Component
function SelectDropdown({
  value,
  onChange,
  options,
  isDark = true,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  isDark?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-[#F5C518] transition-colors cursor-pointer ${
        isDark 
          ? "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]"
          : "bg-[rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.08)]"
      }`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className={isDark ? "bg-[#0D1117]" : "bg-white"}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// Clickable Row Component
function ClickableRow({
  icon: Icon,
  label,
  description,
  onClick,
  danger = false,
  isDark = true,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
  danger?: boolean;
  isDark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
        danger
          ? "hover:bg-[rgba(239,68,68,0.1)]"
          : isDark ? "hover:bg-[rgba(255,255,255,0.04)]" : "hover:bg-[rgba(0,0,0,0.04)]"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          danger
            ? "bg-[rgba(239,68,68,0.12)]"
            : isDark ? "bg-[rgba(255,255,255,0.06)]" : "bg-[rgba(0,0,0,0.04)]"
        }`}
      >
        <Icon
          className={`w-4 h-4 ${
            danger ? "text-[#EF4444]" : "text-muted-foreground"
          }`}
        />
      </div>
      <div className="flex-1 text-left">
        <p
          className={`font-mono text-sm ${
            danger ? "text-[#EF4444]" : "text-foreground"
          }`}
        >
          {label}
        </p>
        {description && (
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>
      <ChevronRight
        className={`w-4 h-4 ${
          danger ? "text-[#EF4444]" : "text-muted-foreground"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  // Profile state
  const [userName, setUserName] = useState("David Chen");
  const [userEmail, setUserEmail] = useState("david@example.com");
  const [timezone, setTimezone] = useState("America/New_York");

  // Notification settings
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [coachAlerts, setCoachAlerts] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // AI Coach settings
  const [coachingStyle, setCoachingStyle] = useState("balanced");
  const [messageFrequency, setMessageFrequency] = useState("moderate");
  const [proactiveCheckins, setProactiveCheckins] = useState(true);
  const [celebrateMilestones, setCelebrateMilestones] = useState(true);

  // Calendar settings
  const [defaultView, setDefaultView] = useState("week");
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("18:00");
  const [weekStartsOn, setWeekStartsOn] = useState("monday");
  const [showWeekends, setShowWeekends] = useState(true);

  // Appearance - using global theme context
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [reduceAnimations, setReduceAnimations] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  // Connected integrations
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(true);
  const [appleHealthConnected, setAppleHealthConnected] = useState(false);

  return (
    <div className="min-h-screen bg-background noise-bg transition-colors duration-300">
      <SidebarNav />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] lg:w-[900px] h-[500px] lg:h-[700px] rounded-full blur-[100px] lg:blur-[150px] ${isDark ? "bg-[#F5C518]/[0.02]" : "bg-[#F5C518]/[0.04]"}`} />
      </div>

      <main className="relative ml-0 md:ml-[72px] lg:ml-[240px] pt-16 md:pt-0 pb-24 md:pb-8 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 lg:mb-10"
          >
            <h1 className="font-sans font-bold text-2xl sm:text-3xl lg:text-4xl text-foreground">
              Settings
            </h1>
            <p className="font-mono text-sm lg:text-base text-muted-foreground mt-2">
              Customize your MentorMeUp experience
            </p>
          </motion.div>

          {/* Two column layout on large screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Profile Section */}
              <SettingsSection icon={User} title="Profile" delay={0.1}>
              <div className={`flex items-center gap-4 pb-4 border-b ${isDark ? "border-[rgba(255,255,255,0.04)]" : "border-[rgba(0,0,0,0.06)]"}`}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F5C518] to-[#00D4FF] flex items-center justify-center text-xl font-bold text-[#080B14]">
                  {userName.charAt(0)}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="bg-transparent font-sans font-semibold text-foreground text-lg outline-none w-full"
                  />
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="bg-transparent font-mono text-sm text-muted-foreground outline-none w-full mt-0.5"
                  />
                </div>
              </div>

              <SettingsRow label="Timezone" isDark={isDark}>
                <SelectDropdown
                  value={timezone}
                  onChange={setTimezone}
                  isDark={isDark}
                  options={[
                    { value: "America/New_York", label: "EST (New York)" },
                    { value: "America/Los_Angeles", label: "PST (Los Angeles)" },
                    { value: "America/Chicago", label: "CST (Chicago)" },
                    { value: "Europe/London", label: "GMT (London)" },
                    { value: "Europe/Paris", label: "CET (Paris)" },
                    { value: "Asia/Tokyo", label: "JST (Tokyo)" },
                    { value: "Asia/Singapore", label: "SGT (Singapore)" },
                  ]}
                />
              </SettingsRow>

              <SettingsRow label="Current Goal" isDark={isDark}>
                <span className="font-mono text-xs text-[#F5C518] bg-[rgba(245,197,24,0.12)] px-3 py-1 rounded-full">
                  Lose 15kg
                </span>
              </SettingsRow>
            </SettingsSection>

            {/* Notifications Section */}
            <SettingsSection icon={Bell} title="Notifications" delay={0.15}>
              <SettingsRow
                label="Push Notifications"
                description="Get notified on your device"
                isDark={isDark}
              >
                <ToggleSwitch enabled={pushEnabled} onToggle={() => setPushEnabled(!pushEnabled)} isDark={isDark} />
              </SettingsRow>

              <SettingsRow
                label="Email Notifications"
                description="Weekly progress summaries"
                isDark={isDark}
              >
                <ToggleSwitch enabled={emailEnabled} onToggle={() => setEmailEnabled(!emailEnabled)} isDark={isDark} />
              </SettingsRow>

              <SettingsRow
                label="Daily Reminder"
                description="Morning check-in reminder"
                isDark={isDark}
              >
                <ToggleSwitch enabled={dailyReminder} onToggle={() => setDailyReminder(!dailyReminder)} isDark={isDark} />
              </SettingsRow>

              {dailyReminder && (
                <SettingsRow label="Reminder Time" isDark={isDark}>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className={`rounded-lg px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-[#F5C518] transition-colors ${isDark ? "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]" : "bg-[rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.08)]"}`}
                  />
                </SettingsRow>
              )}

              <SettingsRow
                label="Coach Message Alerts"
                description="When your AI coach sends a message"
                isDark={isDark}
              >
                <ToggleSwitch enabled={coachAlerts} onToggle={() => setCoachAlerts(!coachAlerts)} isDark={isDark} />
              </SettingsRow>

              <SettingsRow
                label="Sound Effects"
                description="Task completion sounds"
                isDark={isDark}
              >
                <ToggleSwitch enabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} isDark={isDark} />
              </SettingsRow>
            </SettingsSection>

            {/* AI Coach Section */}
            <SettingsSection icon={Brain} title="AI Coach" delay={0.2}>
              <SettingsRow
                label="Coaching Style"
                description="How your coach communicates"
                isDark={isDark}
              >
                <SelectDropdown
                  value={coachingStyle}
                  onChange={setCoachingStyle}
                  isDark={isDark}
                  options={[
                    { value: "encouraging", label: "Encouraging" },
                    { value: "balanced", label: "Balanced" },
                    { value: "direct", label: "Direct" },
                    { value: "tough", label: "Tough Love" },
                  ]}
                />
              </SettingsRow>

              <SettingsRow
                label="Message Frequency"
                description="How often coach reaches out"
                isDark={isDark}
              >
                <SelectDropdown
                  value={messageFrequency}
                  onChange={setMessageFrequency}
                  isDark={isDark}
                  options={[
                    { value: "minimal", label: "Minimal" },
                    { value: "moderate", label: "Moderate" },
                    { value: "frequent", label: "Frequent" },
                  ]}
                />
              </SettingsRow>

              <SettingsRow
                label="Proactive Check-ins"
                description="Coach initiates conversations"
                isDark={isDark}
              >
                <ToggleSwitch enabled={proactiveCheckins} onToggle={() => setProactiveCheckins(!proactiveCheckins)} isDark={isDark} />
              </SettingsRow>

              <SettingsRow
                label="Celebrate Milestones"
                description="Special messages for achievements"
                isDark={isDark}
              >
                <ToggleSwitch enabled={celebrateMilestones} onToggle={() => setCelebrateMilestones(!celebrateMilestones)} isDark={isDark} />
              </SettingsRow>
            </SettingsSection>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Calendar Section */}
              <SettingsSection icon={Calendar} title="Calendar" delay={0.25}>
              <SettingsRow label="Default View" isDark={isDark}>
                <SelectDropdown
                  value={defaultView}
                  onChange={setDefaultView}
                  isDark={isDark}
                  options={[
                    { value: "day", label: "Day" },
                    { value: "week", label: "Week" },
                    { value: "month", label: "Month" },
                  ]}
                />
              </SettingsRow>

              <SettingsRow label="Week Starts On" isDark={isDark}>
                <SelectDropdown
                  value={weekStartsOn}
                  onChange={setWeekStartsOn}
                  isDark={isDark}
                  options={[
                    { value: "sunday", label: "Sunday" },
                    { value: "monday", label: "Monday" },
                  ]}
                />
              </SettingsRow>

              <SettingsRow label="Working Hours" isDark={isDark}>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={workingHoursStart}
                    onChange={(e) => setWorkingHoursStart(e.target.value)}
                    className={`rounded-lg px-2 py-1 font-mono text-xs text-foreground outline-none focus:border-[#F5C518] transition-colors w-20 ${isDark ? "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]" : "bg-[rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.08)]"}`}
                  />
                  <span className="text-muted-foreground text-xs">to</span>
                  <input
                    type="time"
                    value={workingHoursEnd}
                    onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    className={`rounded-lg px-2 py-1 font-mono text-xs text-foreground outline-none focus:border-[#F5C518] transition-colors w-20 ${isDark ? "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]" : "bg-[rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.08)]"}`}
                  />
                </div>
              </SettingsRow>

              <SettingsRow label="Show Weekends" isDark={isDark}>
                <ToggleSwitch enabled={showWeekends} onToggle={() => setShowWeekends(!showWeekends)} isDark={isDark} />
              </SettingsRow>
            </SettingsSection>

            {/* Appearance Section */}
            <SettingsSection icon={Palette} title="Appearance" delay={0.3}>
              <SettingsRow label="Theme" isDark={isDark}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTheme("dark")}
                    className={`p-2 rounded-lg transition-all ${
                      theme === "dark"
                        ? "bg-[#F5C518] text-[#080B14]"
                        : isDark ? "bg-[rgba(255,255,255,0.06)] text-muted-foreground" : "bg-[rgba(0,0,0,0.06)] text-muted-foreground"
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setTheme("light")}
                    className={`p-2 rounded-lg transition-all ${
                      theme === "light"
                        ? "bg-[#F5C518] text-[#080B14]"
                        : isDark ? "bg-[rgba(255,255,255,0.06)] text-muted-foreground" : "bg-[rgba(0,0,0,0.06)] text-muted-foreground"
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                  </button>
                </div>
              </SettingsRow>

              <SettingsRow
                label="Reduce Animations"
                description="For motion sensitivity"
                isDark={isDark}
              >
                <ToggleSwitch enabled={reduceAnimations} onToggle={() => setReduceAnimations(!reduceAnimations)} isDark={isDark} />
              </SettingsRow>

              <SettingsRow
                label="Compact Mode"
                description="Denser UI layout"
                isDark={isDark}
              >
                <ToggleSwitch enabled={compactMode} onToggle={() => setCompactMode(!compactMode)} isDark={isDark} />
              </SettingsRow>
            </SettingsSection>

            {/* Integrations Section */}
            <SettingsSection icon={Link2} title="Integrations" delay={0.35}>
              <div className="space-y-2">
                <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? "bg-[rgba(255,255,255,0.02)]" : "bg-[rgba(0,0,0,0.02)]"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-mono text-sm text-foreground">Google Calendar</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {googleCalendarConnected ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {googleCalendarConnected ? (
                    <button
                      onClick={() => setGoogleCalendarConnected(false)}
                      className="font-mono text-xs text-[#EF4444] hover:underline"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => setGoogleCalendarConnected(true)}
                      className="font-mono text-xs text-[#F5C518] hover:underline"
                    >
                      Connect
                    </button>
                  )}
                </div>

                <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? "bg-[rgba(255,255,255,0.02)]" : "bg-[rgba(0,0,0,0.02)]"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF3B30] to-[#FF6B6B] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-mono text-sm text-foreground">Apple Health</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {appleHealthConnected ? "Connected" : "Not connected"}
                      </p>
                    </div>
                  </div>
                  {appleHealthConnected ? (
                    <button
                      onClick={() => setAppleHealthConnected(false)}
                      className="font-mono text-xs text-[#EF4444] hover:underline"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => setAppleHealthConnected(true)}
                      className="font-mono text-xs text-[#F5C518] hover:underline"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </SettingsSection>

            {/* Data & Privacy Section */}
            <SettingsSection icon={Download} title="Data & Privacy" delay={0.4}>
              <div className="space-y-1">
                <ClickableRow
                  icon={Download}
                  label="Export My Data"
                  description="Download all your goals and progress"
                  onClick={() => alert("Exporting data...")}
                  isDark={isDark}
                />
                <ClickableRow
                  icon={Trash2}
                  label="Delete Account"
                  description="Permanently delete all data"
                  onClick={() => alert("Are you sure?")}
                  danger
                  isDark={isDark}
                />
                <ClickableRow
                  icon={LogOut}
                  label="Sign Out"
                  onClick={() => alert("Signing out...")}
                  isDark={isDark}
                />
              </div>
            </SettingsSection>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
