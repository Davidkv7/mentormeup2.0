"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  User,
  Brain,
  Palette,
  ChevronRight,
  Moon,
  Sun,
  Download,
  Trash2,
  LogOut,
  AlertTriangle,
  Target,
  FileText,
  Check,
  Loader2,
} from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/contexts/auth-context";
import {
  api,
  ApiError,
  setAuthToken,
  type ApiUserPreferences,
  type ApiGoalContextItem,
  type CoachingStyle,
  type MessageFrequency,
  type PreferredWorkTime,
} from "@/lib/api";

// --------- Small subcomponents (design preserved verbatim) ---------

function ToggleSwitch({
  enabled,
  onToggle,
  isDark = true,
  testId,
}: {
  enabled: boolean;
  onToggle: () => void;
  isDark?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid={testId}
      className={`relative rounded-full transition-all duration-300 w-12 h-6 ${
        enabled
          ? "bg-gradient-to-r from-[#F5C518] to-[#D4A912]"
          : isDark
            ? "bg-[rgba(255,255,255,0.1)]"
            : "bg-[rgba(0,0,0,0.1)]"
      }`}
    >
      <motion.div
        animate={{ x: enabled ? 24 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 rounded-full bg-white shadow-md w-4 h-4"
      />
    </button>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  children,
  delay = 0,
  testId,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  delay?: number;
  testId?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-4 sm:p-6"
      data-testid={testId}
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
    <div
      className={`flex items-center justify-between py-3 border-b last:border-0 ${
        isDark ? "border-[rgba(255,255,255,0.04)]" : "border-[rgba(0,0,0,0.06)]"
      }`}
    >
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

function SelectDropdown({
  value,
  onChange,
  options,
  isDark = true,
  testId,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  isDark?: boolean;
  testId?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testId}
      className={`rounded-lg px-3 py-1.5 font-mono text-xs text-foreground outline-none focus:border-[#F5C518] transition-colors cursor-pointer ${
        isDark
          ? "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]"
          : "bg-[rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.08)]"
      }`}
    >
      {options.map((opt) => (
        <option
          key={opt.value}
          value={opt.value}
          className={isDark ? "bg-[#0D1117]" : "bg-white"}
        >
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ClickableRow({
  icon: Icon,
  label,
  description,
  onClick,
  danger = false,
  disabled = false,
  isDark = true,
  testId,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  isDark?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : danger
            ? "hover:bg-[rgba(239,68,68,0.1)]"
            : isDark
              ? "hover:bg-[rgba(255,255,255,0.04)]"
              : "hover:bg-[rgba(0,0,0,0.04)]"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          danger
            ? "bg-[rgba(239,68,68,0.12)]"
            : isDark
              ? "bg-[rgba(255,255,255,0.06)]"
              : "bg-[rgba(0,0,0,0.04)]"
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

// -------------------------- Delete confirmation modal --------------------------
function DeleteAccountModal({
  open,
  onClose,
  onConfirm,
  isDark,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDark: boolean;
  busy: boolean;
  error: string | null;
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);
  if (!open) return null;
  const canDelete = typed === "DELETE" && !busy;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
      data-testid="delete-account-modal"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className={`max-w-md w-full rounded-2xl p-6 ${
          isDark ? "bg-[#0D1117]" : "bg-white"
        } border ${
          isDark
            ? "border-[rgba(239,68,68,0.3)]"
            : "border-[rgba(239,68,68,0.25)]"
        }`}
        style={{ boxShadow: "0 20px 60px rgba(239,68,68,0.15)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[rgba(239,68,68,0.12)] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
          </div>
          <h3 className="font-sans font-bold text-foreground text-lg">
            Delete your account?
          </h3>
        </div>
        <p className="font-mono text-sm text-muted-foreground mb-4 leading-relaxed">
          This permanently deletes your profile, goals, paths, notes, calendar,
          chat history, and activity log. You can&apos;t undo this.
        </p>
        <p className="font-mono text-xs text-muted-foreground mb-2">
          Type <span className="font-bold text-[#EF4444]">DELETE</span> to confirm.
        </p>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="DELETE"
          autoFocus
          data-testid="delete-account-confirm-input"
          className={`w-full rounded-lg px-3 py-2 font-mono text-sm text-foreground outline-none border ${
            isDark
              ? "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.1)] focus:border-[#EF4444]"
              : "bg-[rgba(0,0,0,0.03)] border-[rgba(0,0,0,0.1)] focus:border-[#EF4444]"
          }`}
        />
        {error && (
          <p className="mt-3 font-mono text-xs text-[#EF4444]" data-testid="delete-account-error">
            {error}
          </p>
        )}
        <div className="mt-6 flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            data-testid="delete-account-cancel"
            className={`font-mono text-sm px-4 py-2 rounded-lg transition-colors ${
              isDark
                ? "text-muted-foreground hover:bg-[rgba(255,255,255,0.04)]"
                : "text-muted-foreground hover:bg-[rgba(0,0,0,0.04)]"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canDelete}
            data-testid="delete-account-confirm"
            className="font-mono text-sm px-4 py-2 rounded-lg bg-[#EF4444] text-white hover:bg-[#DC2626] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete permanently
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// -------------------------- The page --------------------------

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "EST (New York)" },
  { value: "America/Los_Angeles", label: "PST (Los Angeles)" },
  { value: "America/Chicago", label: "CST (Chicago)" },
  { value: "America/Denver", label: "MST (Denver)" },
  { value: "Europe/London", label: "GMT (London)" },
  { value: "Europe/Paris", label: "CET (Paris)" },
  { value: "Europe/Berlin", label: "CET (Berlin)" },
  { value: "Asia/Tokyo", label: "JST (Tokyo)" },
  { value: "Asia/Singapore", label: "SGT (Singapore)" },
  { value: "Asia/Kolkata", label: "IST (India)" },
  { value: "Australia/Sydney", label: "AEDT (Sydney)" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, refresh, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const [prefs, setPrefs] = useState<ApiUserPreferences | null>(null);
  const [goalContext, setGoalContext] = useState<ApiGoalContextItem[] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load prefs + goal context on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, gc] = await Promise.all([
          api.get<ApiUserPreferences>("/api/users/me/preferences"),
          api.get<{ goals: ApiGoalContextItem[] }>(
            "/api/users/me/goal-context",
          ),
        ]);
        if (cancelled) return;
        setPrefs(p);
        setGoalContext(gc.goals);
      } catch {
        // Silent — user can still use the page; errors surface on save.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced save on every pref change (except the initial load).
  useEffect(() => {
    if (!prefs || loading) return;
    setSaveStatus("saving");
    const handle = setTimeout(async () => {
      try {
        const saved = await api.patch<ApiUserPreferences>(
          "/api/users/me/preferences",
          prefs,
        );
        setPrefs(saved);
        setSaveStatus("saved");
        // If display_name changed, auth context needs a refresh so the orb/sidebar update.
        if (saved.display_name !== user?.name) {
          void refresh();
        }
        setTimeout(() => setSaveStatus("idle"), 1500);
      } catch {
        setSaveStatus("error");
      }
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    prefs?.display_name,
    prefs?.timezone,
    prefs?.coaching_style,
    prefs?.message_frequency,
    prefs?.proactive_checkins,
    prefs?.preferred_work_time,
  ]);

  const updatePref = <K extends keyof ApiUserPreferences>(
    key: K,
    value: ApiUserPreferences[K],
  ) => {
    setPrefs((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSignOut = async () => {
    await logout();
    setAuthToken(null);
    router.replace("/login");
  };

  const handleConfirmDelete = async () => {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.delete<{ ok: boolean; audit_id: string }>("/api/users/me", {
        confirmation: "DELETE",
      });
      // Success — wipe local token and route to login.
      setAuthToken(null);
      router.replace("/login");
    } catch (err) {
      setDeleteError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Deletion failed",
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-background noise-bg transition-colors duration-300"
      data-testid="settings-page"
    >
      <SidebarNav />

      <div className="fixed inset-0 pointer-events-none">
        <div
          className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] lg:w-[900px] h-[500px] lg:h-[700px] rounded-full blur-[100px] lg:blur-[150px] ${
            isDark ? "bg-[#F5C518]/[0.02]" : "bg-[#F5C518]/[0.04]"
          }`}
        />
      </div>

      <main className="relative ml-0 md:ml-[72px] lg:ml-[240px] pt-16 md:pt-0 pb-24 md:pb-8 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 lg:mb-10 flex items-center justify-between"
          >
            <div>
              <h1 className="font-sans font-bold text-2xl sm:text-3xl lg:text-4xl text-foreground">
                Settings
              </h1>
              <p className="font-mono text-sm lg:text-base text-muted-foreground mt-2">
                Customize your MentorMeUp experience. Changes save automatically.
              </p>
            </div>
            {/* Save status pill */}
            <div className="hidden sm:block" data-testid="settings-save-status">
              {saveStatus === "saving" && (
                <span className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="font-mono text-xs text-[#22C55E] flex items-center gap-1.5">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="font-mono text-xs text-[#EF4444] flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> Save failed
                </span>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Profile */}
              <SettingsSection
                icon={User}
                title="Profile"
                delay={0.1}
                testId="settings-section-profile"
              >
                <div
                  className={`flex items-center gap-4 pb-4 border-b ${
                    isDark ? "border-[rgba(255,255,255,0.04)]" : "border-[rgba(0,0,0,0.06)]"
                  }`}
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F5C518] to-[#00D4FF] flex items-center justify-center text-xl font-bold text-[#080B14]">
                    {(prefs?.display_name || user?.name || "?").charAt(0)}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={prefs?.display_name ?? ""}
                      onChange={(e) => updatePref("display_name", e.target.value)}
                      placeholder="Your name"
                      data-testid="settings-display-name"
                      className="bg-transparent font-sans font-semibold text-foreground text-lg outline-none w-full"
                    />
                    <p className="bg-transparent font-mono text-sm text-muted-foreground w-full mt-0.5">
                      {user?.email ?? "—"}
                    </p>
                  </div>
                </div>

                <SettingsRow label="Timezone" isDark={isDark}>
                  <SelectDropdown
                    value={prefs?.timezone ?? "UTC"}
                    onChange={(v) => updatePref("timezone", v)}
                    isDark={isDark}
                    options={TIMEZONES}
                    testId="settings-timezone"
                  />
                </SettingsRow>
              </SettingsSection>

              {/* AI Coach */}
              <SettingsSection
                icon={Brain}
                title="AI Coach"
                delay={0.15}
                testId="settings-section-coach"
              >
                <SettingsRow
                  label="Coaching Style"
                  description="How your coach communicates"
                  isDark={isDark}
                >
                  <SelectDropdown
                    value={prefs?.coaching_style ?? "balanced"}
                    onChange={(v) =>
                      updatePref("coaching_style", v as CoachingStyle)
                    }
                    isDark={isDark}
                    options={[
                      { value: "gentle", label: "Gentle" },
                      { value: "balanced", label: "Balanced" },
                      { value: "direct", label: "Direct" },
                      { value: "tough", label: "Tough Love" },
                    ]}
                    testId="settings-coaching-style"
                  />
                </SettingsRow>

                <SettingsRow
                  label="Message Frequency"
                  description="How often coach reaches out"
                  isDark={isDark}
                >
                  <SelectDropdown
                    value={prefs?.message_frequency ?? "moderate"}
                    onChange={(v) =>
                      updatePref("message_frequency", v as MessageFrequency)
                    }
                    isDark={isDark}
                    options={[
                      { value: "minimal", label: "Minimal" },
                      { value: "moderate", label: "Moderate" },
                      { value: "frequent", label: "Frequent" },
                    ]}
                    testId="settings-message-frequency"
                  />
                </SettingsRow>

                <SettingsRow
                  label="Preferred Work Time"
                  description="When you do your best deep work"
                  isDark={isDark}
                >
                  <SelectDropdown
                    value={prefs?.preferred_work_time ?? "flexible"}
                    onChange={(v) =>
                      updatePref("preferred_work_time", v as PreferredWorkTime)
                    }
                    isDark={isDark}
                    options={[
                      { value: "morning", label: "Morning" },
                      { value: "afternoon", label: "Afternoon" },
                      { value: "evening", label: "Evening" },
                      { value: "flexible", label: "Flexible" },
                    ]}
                    testId="settings-preferred-work-time"
                  />
                </SettingsRow>

                <SettingsRow
                  label="Proactive Check-ins"
                  description="Coach initiates conversations (evening nudges, struggle detection)"
                  isDark={isDark}
                >
                  <ToggleSwitch
                    enabled={prefs?.proactive_checkins ?? true}
                    onToggle={() =>
                      updatePref(
                        "proactive_checkins",
                        !(prefs?.proactive_checkins ?? true),
                      )
                    }
                    isDark={isDark}
                    testId="settings-proactive-checkins"
                  />
                </SettingsRow>
              </SettingsSection>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Your goal context (read-only) */}
              <SettingsSection
                icon={Target}
                title="Your Goal Context"
                delay={0.2}
                testId="settings-section-goal-context"
              >
                <p className="font-mono text-xs text-muted-foreground mb-2">
                  What the coach knows about you. Read-only for now — if
                  anything here is wrong, tell your coach and ask them to
                  update it.
                </p>
                {loading && (
                  <p className="font-mono text-xs text-muted-foreground">
                    Loading…
                  </p>
                )}
                {!loading && goalContext && goalContext.length === 0 && (
                  <p className="font-mono text-xs text-muted-foreground">
                    No goals yet. Create one from the home screen to start
                    building your context.
                  </p>
                )}
                {!loading &&
                  goalContext &&
                  goalContext.map((g) => (
                    <div
                      key={g.goal_id}
                      data-testid={`goal-context-${g.goal_id}`}
                      className={`rounded-xl p-3 ${
                        isDark
                          ? "bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
                          : "bg-[rgba(0,0,0,0.02)] border border-[rgba(0,0,0,0.04)]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-sans font-semibold text-sm text-foreground">
                          {g.title}
                        </p>
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                            g.intake_status === "complete"
                              ? "text-[#22C55E] bg-[rgba(34,197,94,0.1)]"
                              : g.intake_status === "in_progress" ||
                                  g.intake_status === "building_path"
                                ? "text-[#F5C518] bg-[rgba(245,197,24,0.1)]"
                                : "text-muted-foreground bg-[rgba(255,255,255,0.04)]"
                          }`}
                        >
                          {g.intake_status.replace("_", " ")}
                        </span>
                      </div>
                      {g.user_answers.length === 0 ? (
                        <p className="font-mono text-[11px] text-muted-foreground italic">
                          Intake not started yet.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {g.user_answers.map((a, i) => (
                            <li
                              key={i}
                              className="flex gap-2 font-mono text-[11px] leading-relaxed"
                            >
                              <FileText className="w-3 h-3 text-[#00D4FF] flex-shrink-0 mt-0.5" />
                              <span
                                className={
                                  isDark
                                    ? "text-[rgba(255,255,255,0.7)]"
                                    : "text-[rgba(0,0,0,0.7)]"
                                }
                              >
                                {a.content}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
              </SettingsSection>

              {/* Appearance */}
              <SettingsSection
                icon={Palette}
                title="Appearance"
                delay={0.25}
                testId="settings-section-appearance"
              >
                <SettingsRow label="Theme" isDark={isDark}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      data-testid="settings-theme-dark"
                      className={`p-2 rounded-lg transition-all ${
                        theme === "dark"
                          ? "bg-[#F5C518] text-[#080B14]"
                          : isDark
                            ? "bg-[rgba(255,255,255,0.06)] text-muted-foreground"
                            : "bg-[rgba(0,0,0,0.06)] text-muted-foreground"
                      }`}
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      data-testid="settings-theme-light"
                      className={`p-2 rounded-lg transition-all ${
                        theme === "light"
                          ? "bg-[#F5C518] text-[#080B14]"
                          : isDark
                            ? "bg-[rgba(255,255,255,0.06)] text-muted-foreground"
                            : "bg-[rgba(0,0,0,0.06)] text-muted-foreground"
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                  </div>
                </SettingsRow>
              </SettingsSection>

              {/* Data & Privacy */}
              <SettingsSection
                icon={Download}
                title="Data & Privacy"
                delay={0.3}
                testId="settings-section-data"
              >
                <div className="space-y-1">
                  <ClickableRow
                    icon={Download}
                    label="Export My Data"
                    description="Coming soon"
                    onClick={() => {}}
                    disabled
                    isDark={isDark}
                    testId="settings-export-data"
                  />
                  <ClickableRow
                    icon={LogOut}
                    label="Sign Out"
                    onClick={() => void handleSignOut()}
                    isDark={isDark}
                    testId="settings-sign-out"
                  />
                  <ClickableRow
                    icon={Trash2}
                    label="Delete Account"
                    description="Permanently delete all data"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteOpen(true);
                    }}
                    danger
                    isDark={isDark}
                    testId="settings-delete-account"
                  />
                </div>
              </SettingsSection>
            </div>
          </div>
        </div>
      </main>

      <DeleteAccountModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleConfirmDelete()}
        isDark={isDark}
        busy={deleteBusy}
        error={deleteError}
      />
    </div>
  );
}
