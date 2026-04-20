"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Sparkles,
  User,
  Menu,
  X,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { useGoals } from "@/contexts/goals-context";
import { useTheme } from "@/contexts/theme-context";
import { api } from "@/lib/api";
import { logActivity } from "@/lib/activity";

interface ApiNote {
  note_id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// UI-layer note shape
interface Note {
  id: string;
  title: string;
  date: string;
  type: "ai" | "user";
  goalId: string;
  goalTitle: string;
  content: string;
}

const UNASSIGNED_BUCKET = "__unassigned__";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type FilterType = "all" | "ai" | "user";

export default function NotesPage() {
  const { goals } = useGoals();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [rawNotes, setRawNotes] = useState<ApiNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGoals, setExpandedGoals] = useState<string[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const goalTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of goals) map.set(g.id, g.title);
    return map;
  }, [goals]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const list = await api.get<ApiNote[]>("/api/notes");
      setRawNotes(list);
    } catch {
      setRawNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotes();
  }, []);

  const notes: Note[] = useMemo(
    () =>
      rawNotes.map((n) => ({
        id: n.note_id,
        title: n.title || "Untitled note",
        date: formatDate(n.created_at),
        type: n.tags?.includes("from-coach") ? "ai" : "user",
        goalId: n.goal_id ?? UNASSIGNED_BUCKET,
        goalTitle: n.goal_id
          ? goalTitleById.get(n.goal_id) ?? "Unknown goal"
          : "Unassigned",
        content: n.content,
      })),
    [rawNotes, goalTitleById],
  );

  const filteredNotes = notes.filter((note) => {
    if (filter === "ai" && note.type !== "ai") return false;
    if (filter === "user" && note.type !== "user") return false;
    if (
      searchQuery &&
      !(
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    ) {
      return false;
    }
    return true;
  });

  const notesByGoal = filteredNotes.reduce(
    (acc, note) => {
      if (!acc[note.goalId]) {
        acc[note.goalId] = { title: note.goalTitle, notes: [] };
      }
      acc[note.goalId].notes.push(note);
      return acc;
    },
    {} as Record<string, { title: string; notes: Note[] }>,
  );

  // Auto-expand all goal buckets that have notes the first time a non-empty
  // list loads, and auto-select the first note if nothing selected.
  useEffect(() => {
    if (expandedGoals.length === 0 && Object.keys(notesByGoal).length > 0) {
      setExpandedGoals(Object.keys(notesByGoal));
    }
    if (!selectedNoteId && filteredNotes.length > 0) {
      setSelectedNoteId(filteredNotes[0].id);
    }
  }, [notesByGoal, filteredNotes, expandedGoals.length, selectedNoteId]);

  const selectedNote = filteredNotes.find((n) => n.id === selectedNoteId) ?? null;

  const toggleGoalExpand = (goalId: string) => {
    setExpandedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId],
    );
  };

  const handleDelete = async (noteId: string) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/api/notes/${noteId}`);
      logActivity("note.deleted", `Deleted note`, { note_id: noteId });
      setRawNotes((prev) => prev.filter((n) => n.note_id !== noteId));
      setSelectedNoteId((prev) => (prev === noteId ? null : prev));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-[#080B14]" : "bg-[#F8F9FA]"} noise-bg transition-colors duration-300`}>
      <SidebarNav />

      <main className="relative ml-0 md:ml-[72px] lg:ml-[240px] pt-16 md:pt-0 pb-24 md:pb-0 min-h-screen">
        {/* Top Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b ${
            isDark ? "border-[rgba(255,255,255,0.04)]" : "border-[rgba(0,0,0,0.06)]"
          }`}
          style={{
            background: isDark 
              ? "linear-gradient(180deg, rgba(8,11,20,0.98) 0%, rgba(8,11,20,0.95) 100%)"
              : "linear-gradient(180deg, rgba(248,249,250,0.98) 0%, rgba(248,249,250,0.95) 100%)",
            backdropFilter: "blur(20px)",
          }}
        >
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className={`lg:hidden p-2 -ml-2 ${isDark ? "text-[rgba(255,255,255,0.5)] hover:text-white" : "text-[rgba(0,0,0,0.5)] hover:text-black"}`}
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className={`font-sans font-bold text-xl sm:text-2xl ${isDark ? "text-white" : "text-[#1A1D21]"}`}>Notes</h1>

          {/* Search bar */}
          <div className="hidden sm:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00D4FF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your notes..."
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl font-mono text-sm ${
                  isDark 
                    ? "text-white placeholder:text-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)]" 
                    : "text-[#1A1D21] placeholder:text-[rgba(0,0,0,0.3)] bg-[rgba(0,0,0,0.03)] border-[rgba(0,0,0,0.08)]"
                } border focus:border-[rgba(0,212,255,0.3)] focus:outline-none transition-colors`}
              />
            </div>
          </div>

          <Link href="/notes/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F5C518] to-[#E5B516] text-[#080B14] font-sans font-semibold text-sm shadow-[0_4px_16px_rgba(245,197,24,0.25)]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Note</span>
            </motion.button>
          </Link>
        </motion.div>

        {/* Two Panel Layout */}
        <div className="flex h-[calc(100vh-73px)] md:h-[calc(100vh-73px)]">
          {/* Left Panel - Note Navigator */}
          <AnimatePresence>
            {(mobileNavOpen || true) && (
              <motion.aside
                initial={{ x: -280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -280, opacity: 0 }}
                className={`${
                  mobileNavOpen ? "fixed inset-y-0 left-0 z-40 pt-32" : "hidden lg:block"
                } w-[280px] flex-shrink-0 border-r ${isDark ? "border-[rgba(255,255,255,0.04)]" : "border-[rgba(0,0,0,0.06)]"} overflow-hidden`}
                style={{
                  background: isDark 
                    ? "linear-gradient(180deg, rgba(12,16,26,0.6) 0%, rgba(8,11,20,0.8) 100%)"
                    : "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(248,249,250,0.9) 100%)",
                }}
              >
                {mobileNavOpen && (
                  <button
                    onClick={() => setMobileNavOpen(false)}
                    className={`absolute top-20 right-4 p-2 ${isDark ? "text-[rgba(255,255,255,0.5)] hover:text-white" : "text-[rgba(0,0,0,0.5)] hover:text-black"} lg:hidden`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                <div className="h-full flex flex-col overflow-hidden">
                  {/* Filter Tabs */}
                  <div className={`flex items-center gap-1 px-4 py-3 border-b ${isDark ? "border-[rgba(255,255,255,0.04)]" : "border-[rgba(0,0,0,0.06)]"}`}>
                    {(["all", "ai", "user"] as FilterType[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`relative px-3 py-1.5 font-mono text-xs transition-colors ${
                          filter === f
                            ? "text-[#F5C518]"
                            : isDark ? "text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.4)] hover:text-[rgba(0,0,0,0.7)]"
                        }`}
                      >
                        {f === "all" ? "All" : f === "ai" ? "AI Generated" : "My Notes"}
                        {filter === f && (
                          <motion.div
                            layoutId="filterUnderline"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F5C518]"
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Notes Tree */}
                  <div className="flex-1 overflow-y-auto py-3 px-2">
                    {Object.entries(notesByGoal).map(([goalId, { title, notes }]) => (
                      <div key={goalId} className="mb-3">
                        <button
                          onClick={() => toggleGoalExpand(goalId)}
                          className="w-full flex items-center gap-2 px-2 py-2 text-left group"
                        >
                          {expandedGoals.includes(goalId) ? (
                            <ChevronDown className={`w-4 h-4 ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`} />
                          ) : (
                            <ChevronRight className={`w-4 h-4 ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`} />
                          )}
                          <span className="font-sans font-semibold text-sm text-[#F5C518]">
                            {title}
                          </span>
                          <span className={`ml-auto font-mono text-[10px] ${isDark ? "text-[rgba(255,255,255,0.3)]" : "text-[rgba(0,0,0,0.3)]"}`}>
                            {notes.length}
                          </span>
                        </button>

                        <AnimatePresence>
                          {expandedGoals.includes(goalId) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              {notes.map((note) => (
                                <motion.button
                                  key={note.id}
                                  onClick={() => {
                                    setSelectedNoteId(note.id);
                                    setMobileNavOpen(false);
                                  }}
                                  whileHover={{ x: 2 }}
                                  className={`w-full flex flex-col gap-1 px-3 py-2.5 ml-4 mr-1 rounded-lg text-left transition-all ${
                                    selectedNoteId === note.id
                                      ? "bg-[rgba(245,197,24,0.08)] border-l-2 border-l-[#F5C518]"
                                      : isDark 
                                        ? "hover:bg-[rgba(255,255,255,0.03)] border-l-2 border-l-transparent"
                                        : "hover:bg-[rgba(0,0,0,0.03)] border-l-2 border-l-transparent"
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    <span
                                      className={`font-sans text-sm truncate ${
                                        selectedNoteId === note.id
                                          ? isDark ? "text-white" : "text-[#1A1D21]"
                                          : isDark ? "text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.7)]"
                                      }`}
                                    >
                                      {note.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-mono text-[10px] ${isDark ? "text-[rgba(255,255,255,0.35)]" : "text-[rgba(0,0,0,0.35)]"}`}>
                                      {note.date}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                                        note.type === "ai"
                                          ? "bg-[rgba(0,212,255,0.15)] text-[#00D4FF]"
                                          : "bg-[rgba(245,197,24,0.15)] text-[#F5C518]"
                                      }`}
                                    >
                                      {note.type === "ai" ? "AI" : "Mine"}
                                    </span>
                                  </div>
                                </motion.button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>

                  {/* Empty state inside sidebar when no notes */}
                  {!loading && filteredNotes.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className={`font-mono text-xs ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
                        No notes yet. Hit &quot;New Note&quot; above or ask your coach
                        to save one for you.
                      </p>
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {mobileNavOpen && (
            <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileNavOpen(false)} />
          )}

          {/* Right Panel - Note Editor */}
          <div className="flex-1 overflow-y-auto">
            {selectedNote ? (
              <motion.div
                key={selectedNote.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10"
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex-1">
                    <h2 className={`font-sans font-bold text-2xl sm:text-3xl ${isDark ? "text-white" : "text-[#1A1D21]"} mb-4`}>
                      {selectedNote.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-mono bg-[rgba(245,197,24,0.12)] text-[#F5C518] border border-[rgba(245,197,24,0.2)]">
                        {selectedNote.goalTitle}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-mono ${isDark ? "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border-[rgba(255,255,255,0.06)]" : "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)] border-[rgba(0,0,0,0.08)]"} border`}>
                        {selectedNote.date}
                      </span>
                      <span
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono ${
                          selectedNote.type === "ai"
                            ? "bg-[rgba(0,212,255,0.12)] text-[#00D4FF] border border-[rgba(0,212,255,0.2)]"
                            : isDark 
                              ? "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.06)]"
                              : "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)] border border-[rgba(0,0,0,0.08)]"
                        }`}
                      >
                        {selectedNote.type === "ai" ? (
                          <>
                            <Sparkles className="w-3 h-3" />
                            AI Generated
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3" />
                            My Note
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(selectedNote.id)}
                      disabled={deleting}
                      data-testid="note-delete-button"
                      className={`p-2.5 rounded-xl border transition-colors disabled:opacity-50 ${
                        isDark
                          ? "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] hover:text-red-400"
                          : "bg-[rgba(0,0,0,0.03)] border-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.5)] hover:text-red-500"
                      }`}
                      aria-label="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                {/* Note Content */}
                <div className="space-y-4" data-testid="note-content">
                  {renderPlainContent(selectedNote.content, isDark, selectedNote.id)}
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className={`font-mono text-sm ${isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[rgba(0,0,0,0.4)]"}`}>
                  {loading ? "Loading notes…" : "Select a note to view"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function renderPlainContent(content: string, isDark: boolean, noteId: string) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let para: string[] = [];
  const flushPara = (key: string) => {
    if (para.length === 0) return;
    const text = para.join(" ").trim();
    if (text) {
      nodes.push(
        <p
          key={key}
          className={`font-sans text-sm leading-relaxed whitespace-pre-wrap ${isDark ? "text-[rgba(255,255,255,0.75)]" : "text-[rgba(0,0,0,0.75)]"}`}
        >
          {text}
        </p>,
      );
    }
    para = [];
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const key = `${noteId}-l-${i}`;
    if (!line.trim()) {
      flushPara(`${key}-p`);
      return;
    }
    if (line.startsWith("# ")) {
      flushPara(`${key}-p`);
      nodes.push(
        <h2 key={key} className={`font-sans font-bold text-xl mt-4 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
          {line.slice(2)}
        </h2>,
      );
      return;
    }
    if (line.startsWith("## ")) {
      flushPara(`${key}-p`);
      nodes.push(
        <h3 key={key} className={`font-sans font-semibold text-lg mt-4 ${isDark ? "text-white" : "text-[#1A1D21]"}`}>
          {line.slice(3)}
        </h3>,
      );
      return;
    }
    if (line.startsWith("> ")) {
      flushPara(`${key}-p`);
      nodes.push(
        <div
          key={key}
          className={`p-4 rounded-xl border-l-4 border-l-[#F5C518] ${
            isDark ? "bg-[rgba(245,197,24,0.08)]" : "bg-[rgba(245,197,24,0.06)]"
          }`}
        >
          <p className={`font-mono text-sm ${isDark ? "text-[rgba(255,255,255,0.85)]" : "text-[rgba(0,0,0,0.8)]"}`}>
            {line.slice(2)}
          </p>
        </div>,
      );
      return;
    }
    if (line === "---") {
      flushPara(`${key}-p`);
      nodes.push(
        <hr
          key={key}
          className={isDark ? "border-[rgba(255,255,255,0.08)]" : "border-[rgba(0,0,0,0.08)]"}
        />,
      );
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara(`${key}-p`);
      nodes.push(
        <li
          key={key}
          className={`ml-6 list-disc font-sans text-sm leading-relaxed ${isDark ? "text-[rgba(255,255,255,0.75)]" : "text-[rgba(0,0,0,0.75)]"}`}
        >
          {line.replace(/^[-*]\s+/, "")}
        </li>,
      );
      return;
    }
    if (/^\[\s?[xX ]?\]\s+/.test(line)) {
      flushPara(`${key}-p`);
      const checked = /\[[xX]\]/.test(line);
      nodes.push(
        <div key={key} className="flex items-start gap-2">
          <span className={`mt-0.5 text-sm ${isDark ? "text-[#F5C518]" : "text-[#D4A912]"}`}>
            {checked ? "☑" : "☐"}
          </span>
          <span
            className={`font-sans text-sm leading-relaxed ${
              checked
                ? isDark
                  ? "text-[rgba(255,255,255,0.5)] line-through"
                  : "text-[rgba(0,0,0,0.45)] line-through"
                : isDark
                  ? "text-[rgba(255,255,255,0.75)]"
                  : "text-[rgba(0,0,0,0.75)]"
            }`}
          >
            {line.replace(/^\[\s?[xX ]?\]\s+/, "")}
          </span>
        </div>,
      );
      return;
    }
    para.push(line);
  });
  flushPara(`${noteId}-p-end`);
  return nodes;
}
