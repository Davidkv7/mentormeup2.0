"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  MoreHorizontal,
  Heading1,
  Heading2,
  Bold,
  Italic,
  MessageSquare,
  CheckSquare,
  List,
  Minus,
  Link as LinkIcon,
  ChevronDown,
  Send,
  Sparkles,
  X,
  Trash2,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGoals } from "@/contexts/goals-context";
import { api } from "@/lib/api";
import { logActivity } from "@/lib/activity";

interface EditorBlock {
  id: string;
  type: "paragraph" | "heading1" | "heading2" | "callout" | "checklist" | "bullets" | "divider";
  content: string;
  items?: { id: string; text: string; checked?: boolean }[];
  variant?: "insight" | "tip" | "warning";
}

function blocksToPlainText(blocks: EditorBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading1":
          return b.content ? `# ${b.content}` : "";
        case "heading2":
          return b.content ? `## ${b.content}` : "";
        case "callout":
          return b.content ? `> ${b.content}` : "";
        case "divider":
          return "---";
        case "checklist":
          return (b.items ?? [])
            .map((it) => `${it.checked ? "[x]" : "[ ]"} ${it.text}`)
            .filter((s) => s.trim().length > 3)
            .join("\n");
        case "bullets":
          return (b.items ?? [])
            .map((it) => `- ${it.text}`)
            .filter((s) => s.trim().length > 2)
            .join("\n");
        default:
          return b.content ?? "";
      }
    })
    .filter((s) => s.trim().length > 0)
    .join("\n\n");
}

function deriveTitleFromContent(content: string): string {
  const firstLine = content.split("\n").find((l) => l.trim().length > 0) ?? "";
  const cleaned = firstLine.replace(/^#+\s*/, "").replace(/^>\s*/, "").trim();
  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}…` : cleaned;
}

export default function NewNotePage() {
  const router = useRouter();
  const { goals } = useGoals();
  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [linkedGoalId, setLinkedGoalId] = useState<string | null>(null);
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [blocks, setBlocks] = useState<EditorBlock[]>([
    { id: "block-1", type: "paragraph", content: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Goals for the goal-picker. Avoid sample fallbacks — only real goals can be
  // linked because the backend validates goal ownership.
  const availableGoals = goals;

  // Focus title on mount
  useEffect(() => {
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 300);
  }, []);

  const addBlock = (type: EditorBlock["type"]) => {
    const newBlock: EditorBlock = {
      id: `block-${Date.now()}`,
      type,
      content: "",
      items: type === "checklist" || type === "bullets" ? [{ id: `item-${Date.now()}`, text: "", checked: false }] : undefined,
      variant: type === "callout" ? "tip" : undefined,
    };
    setBlocks([...blocks, newBlock]);
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsAiThinking(true);
    
    // Simulate AI response
    setTimeout(() => {
      const aiBlock: EditorBlock = {
        id: `block-${Date.now()}`,
        type: "callout",
        variant: "insight",
        content: `Coach insight: ${aiPrompt.includes("context") 
          ? "Based on your progress, you've been consistent for 12 of the last 17 days. This note captures a key turning point in your journey."
          : "This is a great topic to explore. Consider breaking it down into smaller, actionable steps that you can track daily."}`,
      };
      setBlocks([...blocks, aiBlock]);
      setAiPrompt("");
      setIsAiThinking(false);
    }, 1500);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    const content = blocksToPlainText(blocks);
    const fallbackTitle = title.trim() || deriveTitleFromContent(content) || "Untitled note";
    try {
      const saved = await api.post<{ note_id: string; title: string }>("/api/notes", {
        title: fallbackTitle,
        content,
        goal_id: linkedGoalId,
        tags: [],
      });
      logActivity("note.created", `Created note: ${saved.title}`, {
        note_id: saved.note_id,
        goal_id: linkedGoalId,
      });
      router.push("/notes");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save note");
      setSaving(false);
    }
  };

  const toolbarButtons = [
    { icon: Heading1, label: "H1", action: () => addBlock("heading1") },
    { icon: Heading2, label: "H2", action: () => addBlock("heading2") },
    { icon: Bold, label: "Bold", action: () => {} },
    { icon: Italic, label: "Italic", action: () => {} },
  ];

  const blockButtons = [
    { icon: MessageSquare, label: "Callout", action: () => addBlock("callout") },
    { icon: CheckSquare, label: "Checklist", action: () => addBlock("checklist") },
    { icon: List, label: "Bullet", action: () => addBlock("bullets") },
    { icon: Minus, label: "Divider", action: () => addBlock("divider") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-background noise-bg flex flex-col"
    >
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[rgba(0,100,180,0.03)] rounded-full blur-[120px]" />
      </div>

      {/* Top Bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative z-20 flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-[rgba(255,255,255,0.04)]"
        style={{
          background: "linear-gradient(180deg, rgba(8,11,20,0.98) 0%, rgba(8,11,20,0.95) 100%)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Back button */}
        <Link
          href="/notes"
          className="p-2 -ml-2 rounded-lg text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Title input */}
        <div className="flex-1 max-w-md mx-auto">
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note"
            className="w-full text-center font-sans text-base sm:text-lg text-[rgba(255,255,255,0.7)] placeholder:text-[rgba(255,255,255,0.3)] bg-transparent outline-none focus:text-white transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            data-testid="note-save-button"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5C518] to-[#E5B516] text-[#080B14] font-sans font-semibold text-sm shadow-[0_4px_16px_rgba(245,197,24,0.25)] hover:shadow-[0_4px_24px_rgba(245,197,24,0.35)] transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save"}
          </motion.button>
          {saveError && (
            <span className="text-xs font-mono text-red-400" data-testid="note-save-error">
              {saveError}
            </span>
          )}

          {/* Options menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2 rounded-lg text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-all"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showOptionsMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] shadow-2xl z-50"
                  style={{
                    background: "linear-gradient(180deg, rgba(20,25,35,0.98) 0%, rgba(15,20,30,0.98) 100%)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-red-400 hover:text-red-300 hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="relative z-10 flex items-center justify-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.04)] overflow-x-auto"
        style={{
          background: "rgba(8,11,20,0.6)",
        }}
      >
        <div className="flex items-center gap-1">
          {/* Text formatting */}
          <div className="flex items-center rounded-lg overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
            {toolbarButtons.map((btn, i) => (
              <button
                key={btn.label}
                onClick={btn.action}
                className={`p-2.5 text-[rgba(255,255,255,0.5)] hover:text-[#F5C518] hover:bg-[rgba(255,255,255,0.04)] transition-all ${
                  i > 0 ? "border-l border-[rgba(255,255,255,0.06)]" : ""
                }`}
                title={btn.label}
              >
                <btn.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-[rgba(255,255,255,0.08)] mx-2" />

          {/* Block types */}
          <div className="flex items-center rounded-lg overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
            {blockButtons.map((btn, i) => (
              <button
                key={btn.label}
                onClick={btn.action}
                className={`p-2.5 text-[rgba(255,255,255,0.5)] hover:text-[#F5C518] hover:bg-[rgba(255,255,255,0.04)] transition-all ${
                  i > 0 ? "border-l border-[rgba(255,255,255,0.06)]" : ""
                }`}
                title={btn.label}
              >
                <btn.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-[rgba(255,255,255,0.08)] mx-2" />

          {/* Link to Goal dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowGoalDropdown(!showGoalDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.05)] text-[#00D4FF] hover:bg-[rgba(0,212,255,0.1)] transition-all text-sm font-mono"
            >
              <LinkIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Link to Goal</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {showGoalDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute left-0 top-full mt-2 w-56 rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] shadow-2xl z-50"
                  style={{
                    background: "linear-gradient(180deg, rgba(20,25,35,0.98) 0%, rgba(15,20,30,0.98) 100%)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {availableGoals.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => {
                        setLinkedGoalId(goal.id);
                        setShowGoalDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                        linkedGoalId === goal.id
                          ? "bg-[rgba(245,197,24,0.1)] text-[#F5C518]"
                          : "text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          goal.color === "gold" ? "bg-[#F5C518]" :
                          goal.color === "cyan" ? "bg-[#00D4FF]" :
                          goal.color === "purple" ? "bg-[#A855F7]" :
                          goal.color === "green" ? "bg-[#22C55E]" :
                          "bg-[#EF4444]"
                        }`}
                      />
                      {goal.title}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Editor Canvas */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex-1 overflow-y-auto pb-32"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
          {/* Goal Linker Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <span className="font-mono text-xs text-[rgba(255,255,255,0.4)]">Link to goal:</span>
            {availableGoals.slice(0, 3).map((goal) => (
              <button
                key={goal.id}
                onClick={() => setLinkedGoalId(linkedGoalId === goal.id ? null : goal.id)}
                className={`px-3 py-1.5 rounded-full font-mono text-xs transition-all ${
                  linkedGoalId === goal.id
                    ? "bg-gradient-to-r from-[#F5C518] to-[#E5B516] text-[#080B14] shadow-[0_2px_12px_rgba(245,197,24,0.3)]"
                    : "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(245,197,24,0.3)] hover:text-[#F5C518]"
                }`}
              >
                {goal.title}
              </button>
            ))}
          </div>

          {/* Editor Blocks */}
          <div ref={editorRef} className="space-y-4">
            {blocks.map((block, index) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                {block.type === "paragraph" && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className={`min-h-[1.5em] font-mono text-base text-[rgba(255,255,255,0.8)] outline-none ${
                      !block.content && index === 0 ? "empty-placeholder" : ""
                    }`}
                    style={{
                      caretColor: "#F5C518",
                    }}
                    data-placeholder="Start writing, or type '/' for commands..."
                    onInput={(e) => {
                      const newBlocks = [...blocks];
                      newBlocks[index].content = e.currentTarget.textContent || "";
                      setBlocks(newBlocks);
                    }}
                  />
                )}

                {block.type === "heading1" && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="font-sans font-bold text-2xl text-white outline-none"
                    style={{ caretColor: "#F5C518" }}
                    data-placeholder="Heading 1"
                    onInput={(e) => {
                      const newBlocks = [...blocks];
                      newBlocks[index].content = e.currentTarget.textContent || "";
                      setBlocks(newBlocks);
                    }}
                  />
                )}

                {block.type === "heading2" && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="font-sans font-semibold text-xl text-white outline-none"
                    style={{ caretColor: "#F5C518" }}
                    data-placeholder="Heading 2"
                    onInput={(e) => {
                      const newBlocks = [...blocks];
                      newBlocks[index].content = e.currentTarget.textContent || "";
                      setBlocks(newBlocks);
                    }}
                  />
                )}

                {block.type === "callout" && (
                  <div
                    className={`p-4 rounded-xl border-l-4 ${
                      block.variant === "insight"
                        ? "bg-[rgba(0,212,255,0.06)] border-l-[#00D4FF]"
                        : block.variant === "warning"
                        ? "bg-[rgba(239,68,68,0.06)] border-l-[#EF4444]"
                        : "bg-[rgba(245,197,24,0.06)] border-l-[#F5C518]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        block.variant === "insight" ? "text-[#00D4FF]" : "text-[#F5C518]"
                      }`} />
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className={`flex-1 font-mono text-sm italic outline-none ${
                          block.variant === "insight" ? "text-[#00D4FF]" : "text-[#F5C518]"
                        }`}
                        style={{ caretColor: block.variant === "insight" ? "#00D4FF" : "#F5C518" }}
                        data-placeholder="Add callout text..."
                        onInput={(e) => {
                          const newBlocks = [...blocks];
                          newBlocks[index].content = e.currentTarget.textContent || "";
                          setBlocks(newBlocks);
                        }}
                      >
                        {block.content}
                      </div>
                    </div>
                  </div>
                )}

                {block.type === "checklist" && (
                  <div className="space-y-2">
                    {block.items?.map((item, itemIndex) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <button
                          onClick={() => {
                            const newBlocks = [...blocks];
                            if (newBlocks[index].items) {
                              newBlocks[index].items![itemIndex].checked = !newBlocks[index].items![itemIndex].checked;
                              setBlocks(newBlocks);
                            }
                          }}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            item.checked
                              ? "bg-[#F5C518] border-[#F5C518]"
                              : "border-[rgba(255,255,255,0.2)] hover:border-[#F5C518]"
                          }`}
                        >
                          {item.checked && (
                            <svg className="w-3 h-3 text-[#080B14]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          className={`flex-1 font-mono text-sm outline-none ${
                            item.checked ? "text-[rgba(255,255,255,0.4)] line-through" : "text-[rgba(255,255,255,0.8)]"
                          }`}
                          style={{ caretColor: "#F5C518" }}
                          data-placeholder="To-do item..."
                          onInput={(e) => {
                            const newBlocks = [...blocks];
                            if (newBlocks[index].items) {
                              newBlocks[index].items![itemIndex].text = e.currentTarget.textContent || "";
                              setBlocks(newBlocks);
                            }
                          }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newBlocks = [...blocks];
                        if (newBlocks[index].items) {
                          newBlocks[index].items!.push({ id: `item-${Date.now()}`, text: "", checked: false });
                          setBlocks(newBlocks);
                        }
                      }}
                      className="flex items-center gap-2 text-[rgba(255,255,255,0.3)] hover:text-[#F5C518] font-mono text-xs transition-colors ml-8"
                    >
                      + Add item
                    </button>
                  </div>
                )}

                {block.type === "bullets" && (
                  <div className="space-y-2">
                    {block.items?.map((item, itemIndex) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#F5C518] flex-shrink-0 mt-2" />
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          className="flex-1 font-mono text-sm text-[rgba(255,255,255,0.8)] outline-none"
                          style={{ caretColor: "#F5C518" }}
                          data-placeholder="Bullet point..."
                          onInput={(e) => {
                            const newBlocks = [...blocks];
                            if (newBlocks[index].items) {
                              newBlocks[index].items![itemIndex].text = e.currentTarget.textContent || "";
                              setBlocks(newBlocks);
                            }
                          }}
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newBlocks = [...blocks];
                        if (newBlocks[index].items) {
                          newBlocks[index].items!.push({ id: `item-${Date.now()}`, text: "" });
                          setBlocks(newBlocks);
                        }
                      }}
                      className="flex items-center gap-2 text-[rgba(255,255,255,0.3)] hover:text-[#F5C518] font-mono text-xs transition-colors ml-5"
                    >
                      + Add bullet
                    </button>
                  </div>
                )}

                {block.type === "divider" && (
                  <div className="py-4">
                    <div className="h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.main>

      {/* AI Assistant Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-30"
      >
        <div
          className="border-t border-[rgba(0,212,255,0.15)]"
          style={{
            background: "linear-gradient(180deg, rgba(8,11,20,0.95) 0%, rgba(8,11,20,0.98) 100%)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 -4px 30px rgba(0,212,255,0.05)",
          }}
        >
          {/* Subtle pulse glow line */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00D4FF] to-transparent"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <form
            onSubmit={handleAiSubmit}
            className="max-w-3xl mx-auto flex items-center gap-3 px-4 sm:px-6 py-4"
          >
            {/* Orb icon */}
            <div className="relative flex-shrink-0">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0066FF] flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.3)]"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
            </div>

            {/* Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask your coach to add context to this note..."
                disabled={isAiThinking}
                className="w-full px-4 py-3 rounded-xl font-mono text-sm text-white placeholder:text-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.04)] border border-[rgba(0,212,255,0.15)] focus:border-[rgba(0,212,255,0.4)] focus:outline-none transition-colors disabled:opacity-50"
              />
              {isAiThinking && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]"
                      animate={{ y: [-2, 2, -2] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Send button */}
            <motion.button
              type="submit"
              disabled={!aiPrompt.trim() || isAiThinking}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-xl bg-gradient-to-r from-[#F5C518] to-[#E5B516] text-[#080B14] shadow-[0_4px_16px_rgba(245,197,24,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </form>
        </div>
      </motion.div>

      {/* Close dropdown when clicking outside */}
      {(showGoalDropdown || showOptionsMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowGoalDropdown(false);
            setShowOptionsMenu(false);
          }}
        />
      )}

      {/* CSS for placeholder */}
      <style jsx global>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgba(255, 255, 255, 0.3);
          font-style: italic;
          pointer-events: none;
        }
        [data-placeholder]:focus:before {
          content: "";
        }
      `}</style>
    </motion.div>
  );
}
