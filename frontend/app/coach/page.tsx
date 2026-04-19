"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Mic, ArrowUp, Info, Calendar, Target } from "lucide-react";
import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { AnimatedOrb } from "@/components/animated-orb";
import { QuickReplyChips } from "@/components/quick-reply-chips";
import { useTheme } from "@/contexts/theme-context";

interface Message {
  id: string;
  role: "ai" | "user";
  content: string;
  timestamp: string;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "ai",
    content:
      "I noticed something. You've opened the 'Write your offer' task three times this week. Each time, you closed it within 2 minutes. That's not procrastination — that's avoidance of something specific. What happens when you sit down to write it?",
    timestamp: "9:14 AM",
  },
  {
    id: "2",
    role: "user",
    content:
      "Honestly? I freeze. I don't know how to sound professional without sounding generic. And I'm scared I'll undersell myself.",
    timestamp: "9:16 AM",
  },
  {
    id: "3",
    role: "ai",
    content:
      "That's the block. You're trying to write for an imaginary 'professional' audience instead of one real person. Let's do a roleplay. I'll be a potential client — a startup founder who needs a landing page redesigned. You pitch me in 2-3 sentences. Don't overthink it. Just talk to me like a human.",
    timestamp: "9:17 AM",
  },
  {
    id: "4",
    role: "user",
    content:
      "Okay... Hi! I help startups turn cluttered landing pages into clear, high-converting designs. I've worked with 3 early-stage companies this year and helped one increase signups by 40%. I'd love to take a look at yours and share some quick ideas.",
    timestamp: "9:19 AM",
  },
  {
    id: "5",
    role: "ai",
    content:
      "That's your offer. Clear, specific, backed by a result. You didn't sound generic — you sounded like someone who knows what they do. Copy that message, paste it into your offer doc, and polish it. That's your starting point. Save it.",
    timestamp: "9:20 AM",
  },
];

const quickReplies = [
  "I'm struggling",
  "Mark task done",
  "Reschedule today",
];

export default function CoachChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [showChips, setShowChips] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (content: string) => {
    if (!content.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");
    setShowChips(false);
  };

  const handleChipSelect = (chip: string) => {
    handleSend(chip);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  return (
    <div className="min-h-screen bg-background noise-bg transition-colors duration-300">
      <SidebarNav />

      {/* Main Content */}
      <div className="md:ml-[72px] lg:ml-[240px] flex min-h-screen">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top Bar - Desktop */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
            className="hidden md:flex items-center justify-between sticky top-0 z-40 px-6 lg:px-8 py-5"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, rgba(8, 11, 20, 0.95) 0%, rgba(8, 11, 20, 0.8) 100%)'
                : 'linear-gradient(180deg, rgba(248, 249, 250, 0.95) 0%, rgba(248, 249, 250, 0.8) 100%)',
              backdropFilter: 'blur(20px)',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            <div className="flex items-center gap-4">
              <AnimatedOrb size={40} />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-sans font-bold text-lg lg:text-xl text-foreground">
                    Your Coach
                  </h1>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5C518] opacity-75" />
                    <span className="relative inline-flex rounded-full h-full w-full bg-[#F5C518] shadow-[0_0_8px_rgba(245,197,24,0.6)]" />
                  </span>
                </div>
                <p className="font-mono text-xs text-[#00D4FF]">
                  Full context: Freelancing Goal — Phase 2
                </p>
              </div>
            </div>
          </motion.header>

          {/* Mobile context header */}
          <div className="md:hidden pt-16 px-4 pb-3 flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5C518] opacity-75" />
              <span className="relative inline-flex rounded-full h-full w-full bg-[#F5C518]" />
            </span>
            <p className="font-mono text-[10px] text-[#00D4FF]">
              Freelancing Goal — Phase 2
            </p>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-48 lg:pb-40">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{
                    opacity: 0,
                    x: message.role === "ai" ? -20 : 20,
                    y: 10,
                  }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.4, 0.25, 1] }}
                  className={`flex gap-3 lg:gap-4 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "ai" && (
                    <div className="flex-shrink-0 mt-1 hidden sm:block">
                      <AnimatedOrb size={36} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] lg:max-w-[75%] ${
                      message.role === "user" ? "order-first" : ""
                    }`}
                  >
                    <div
                      className={`rounded-2xl p-4 lg:p-5 ${
                        message.role === "ai"
                          ? "rounded-bl-md"
                          : "rounded-br-md"
                      }`}
                      style={{
                        background: message.role === "ai"
                          ? isDark 
                            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)'
                          : isDark
                            ? 'linear-gradient(135deg, rgba(245, 197, 24, 0.12) 0%, rgba(245, 197, 24, 0.04) 100%)'
                            : 'linear-gradient(135deg, rgba(245, 197, 24, 0.2) 0%, rgba(245, 197, 24, 0.08) 100%)',
                        backdropFilter: 'blur(24px)',
                        border: message.role === "ai"
                          ? isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)'
                          : isDark ? '1px solid rgba(245, 197, 24, 0.2)' : '1px solid rgba(212, 169, 18, 0.3)',
                        borderLeft: message.role === "ai" ? '2px solid #00D4FF' : undefined,
                        boxShadow: message.role === "ai"
                          ? isDark 
                            ? '0 4px 20px rgba(0, 0, 0, 0.15), -4px 0 16px rgba(0, 212, 255, 0.08)'
                            : '0 4px 20px rgba(0, 0, 0, 0.05), -4px 0 16px rgba(0, 212, 255, 0.1)'
                          : isDark 
                            ? '0 4px 20px rgba(245, 197, 24, 0.08)'
                            : '0 4px 20px rgba(212, 169, 18, 0.12)',
                      }}
                    >
                      <p className="text-sm lg:text-base text-foreground leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    <p
                      className={`font-mono text-[10px] lg:text-[11px] text-muted-foreground mt-2 ${
                        message.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      {message.timestamp}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
            className="fixed bottom-0 left-0 md:left-[72px] lg:left-[240px] right-0 lg:right-[320px] xl:right-[360px] pt-6 pb-20 md:pb-6 px-4 sm:px-6 lg:px-8"
            style={{
              background: isDark
                ? 'linear-gradient(0deg, rgba(8, 11, 20, 1) 0%, rgba(8, 11, 20, 0.95) 60%, transparent 100%)'
                : 'linear-gradient(0deg, rgba(248, 249, 250, 1) 0%, rgba(248, 249, 250, 0.95) 60%, transparent 100%)',
            }}
          >
            <div className="max-w-3xl mx-auto space-y-3">
              {/* Quick Reply Chips */}
              <QuickReplyChips
                chips={quickReplies}
                onSelect={handleChipSelect}
                visible={showChips}
              />

              {/* Input Bar */}
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl p-2 lg:p-2.5 flex items-center gap-2"
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                  backdropFilter: 'blur(24px)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.1)',
                  boxShadow: isDark ? '0 4px 24px rgba(0, 0, 0, 0.2)' : '0 4px 24px rgba(0, 0, 0, 0.08)',
                }}
              >
                <button
                  type="button"
                  className="p-3 text-[#00D4FF] hover:bg-[rgba(0,212,255,0.1)] rounded-xl transition-all duration-200"
                  aria-label="Voice input"
                >
                  <Mic className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Message your coach..."
                  className={`flex-1 bg-transparent font-mono text-sm lg:text-base text-foreground outline-none py-2 ${isDark ? "placeholder:text-[#4A5568]" : "placeholder:text-[#9CA3AF]"}`}
                />

                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="p-3 bg-[#F5C518] text-[#080B14] rounded-xl hover:bg-[#FFD633] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 pulse-glow shadow-[0_4px_16px_rgba(245,197,24,0.3)]"
                  aria-label="Send message"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar - Desktop only */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="hidden lg:block w-[320px] xl:w-[360px] p-6 overflow-y-auto"
          style={{
            borderLeft: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.06)',
            background: isDark
              ? 'linear-gradient(180deg, rgba(8, 11, 20, 0.6) 0%, rgba(8, 11, 20, 0.9) 100%)'
              : 'linear-gradient(180deg, rgba(248, 249, 250, 0.6) 0%, rgba(248, 249, 250, 0.9) 100%)',
          }}
        >
          <h3 className="font-sans text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">
            Context
          </h3>

          {/* Current Goal */}
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-4 h-4 text-[#F5C518]" />
              <span className="font-mono text-xs text-muted-foreground">Current Goal</span>
            </div>
            <p className="font-sans font-semibold text-foreground">Start freelancing as a designer</p>
            <p className="font-mono text-xs text-[#00D4FF] mt-1">Phase 2 — Building Portfolio</p>
          </div>

          {/* Today's Focus */}
          <div className="glass-card p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-4 h-4 text-[#00D4FF]" />
              <span className="font-mono text-xs text-muted-foreground">Today&apos;s Focus</span>
            </div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5C518]" />
                <span className="font-mono text-sm text-foreground/80">Write your offer</span>
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-[rgba(255,255,255,0.3)]" : "bg-[rgba(0,0,0,0.2)]"}`} />
                <span className="font-mono text-sm text-muted-foreground">Update portfolio</span>
              </li>
            </ul>
          </div>

          {/* Coach Info */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Info className="w-4 h-4 text-[#9D4EDD]" />
              <span className="font-mono text-xs text-muted-foreground">About Your Coach</span>
            </div>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              Your AI coach adapts to your communication style and progress patterns. It has full context of your goal history and past conversations.
            </p>
          </div>

          <div className={`mt-6 pt-6 border-t ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.06)]"}`}>
            <Link 
              href="/path" 
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-mono text-sm text-[#F5C518] bg-[rgba(245,197,24,0.08)] hover:bg-[rgba(245,197,24,0.12)] transition-colors"
            >
              View Full Path
            </Link>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
