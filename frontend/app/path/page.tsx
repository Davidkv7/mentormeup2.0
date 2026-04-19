"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { MessageCircle, TrendingUp, Calendar, Target } from "lucide-react";
import Link from "next/link";
import { GoalProgressBar } from "@/components/goal-progress-bar";
import { PhaseCard } from "@/components/phase-card";
import { SidebarNav } from "@/components/sidebar-nav";
import { useTheme } from "@/contexts/theme-context";

const phases = [
  {
    phaseNumber: 1,
    title: "Baseline & Clarity",
    isLocked: false,
    milestones: [
      { title: "Calculate TDEE", status: "complete" as const },
      { title: "Log food for 3 days", status: "active" as const },
      { title: "Identify top habits to change", status: "locked" as const },
    ],
  },
  {
    phaseNumber: 2,
    title: "Build Momentum",
    isLocked: true,
    milestones: [
      { title: "Create meal prep system", status: "locked" as const },
      { title: "Establish workout routine", status: "locked" as const },
      { title: "Set up accountability check-ins", status: "locked" as const },
    ],
  },
  {
    phaseNumber: 3,
    title: "Sustain & Adapt",
    isLocked: true,
    milestones: [
      { title: "Review progress metrics", status: "locked" as const },
      { title: "Adjust caloric targets", status: "locked" as const },
      { title: "Build long-term habits", status: "locked" as const },
    ],
  },
];

export default function PathPage() {
  const [expandedPhase, setExpandedPhase] = useState<number>(1);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const togglePhase = (phaseNumber: number) => {
    setExpandedPhase(expandedPhase === phaseNumber ? -1 : phaseNumber);
  };

  return (
    <div className="min-h-screen bg-background noise-bg transition-colors duration-300">
      <SidebarNav />

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] lg:w-[900px] h-[500px] lg:h-[700px] rounded-full blur-[100px] lg:blur-[150px] ${isDark ? "bg-[#00D4FF]/[0.04]" : "bg-[#00D4FF]/[0.06]"}`} />
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[500px] lg:w-[700px] h-[400px] lg:h-[500px] rounded-full blur-[80px] lg:blur-[120px] ${isDark ? "bg-[#F5C518]/[0.03]" : "bg-[#F5C518]/[0.05]"}`} />
      </div>

      {/* Main content */}
      <div className="relative md:ml-[72px] lg:ml-[240px] min-h-screen pb-24 md:pb-8">
        {/* Top bar - Desktop */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
          className="hidden md:flex items-center justify-between px-6 lg:px-10 py-6 sticky top-0 z-30"
          style={{
            background: isDark 
              ? 'linear-gradient(180deg, rgba(8, 11, 20, 0.95) 0%, rgba(8, 11, 20, 0.8) 100%)'
              : 'linear-gradient(180deg, rgba(248, 249, 250, 0.95) 0%, rgba(248, 249, 250, 0.8) 100%)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center gap-4 lg:gap-6">
            <h1 className="font-sans font-bold text-xl lg:text-2xl xl:text-3xl text-foreground tracking-tight">
              Lose 15kg
            </h1>
            <span 
              className="px-3 lg:px-4 py-1.5 rounded-full font-mono text-xs font-medium text-[#F5C518]"
              style={{
                background: 'rgba(245, 197, 24, 0.1)',
                border: '1px solid rgba(245, 197, 24, 0.25)',
                boxShadow: '0 0 12px rgba(245, 197, 24, 0.1)',
              }}
            >
              Active
            </span>
          </div>
          <Link
            href="/coach"
            className={`flex items-center gap-3 px-5 py-3 rounded-xl font-mono text-sm text-foreground transition-all duration-300 group glass-card ${isDark ? "hover:border-[rgba(245,197,24,0.2)]" : "hover:border-[rgba(212,169,18,0.3)]"}`}
          >
            <MessageCircle className="w-4 h-4 text-[#00D4FF] group-hover:text-[#F5C518] transition-colors" />
            <span>Chat with Coach</span>
          </Link>
        </motion.header>

        {/* Mobile header */}
        <div className="md:hidden pt-16 px-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="font-sans font-bold text-xl text-foreground">Lose 15kg</h1>
              <span 
                className="px-2.5 py-1 rounded-full font-mono text-[10px] font-medium text-[#F5C518]"
                style={{
                  background: 'rgba(245, 197, 24, 0.1)',
                  border: '1px solid rgba(245, 197, 24, 0.25)',
                }}
              >
                Active
              </span>
            </div>
            <Link href="/coach" className="p-2.5 rounded-xl glass-card">
              <MessageCircle className="w-5 h-5 text-[#00D4FF]" />
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
            
            {/* Main Column - Progress + Phases */}
            <div className="xl:col-span-8 space-y-6 lg:space-y-8">
              {/* Progress bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
              >
                <GoalProgressBar
                  progress={34}
                  label="34% — Phase 1 in progress"
                />
              </motion.div>

              {/* Phase cards */}
              <div className="space-y-4 lg:space-y-5">
                {phases.map((phase, index) => (
                  <PhaseCard
                    key={phase.phaseNumber}
                    phaseNumber={phase.phaseNumber}
                    title={phase.title}
                    milestones={phase.milestones}
                    isExpanded={expandedPhase === phase.phaseNumber}
                    isLocked={phase.isLocked}
                    onToggle={() => togglePhase(phase.phaseNumber)}
                    index={index}
                  />
                ))}
              </div>
            </div>

            {/* Right Column - Stats */}
            <div className="xl:col-span-4 space-y-6 lg:space-y-8">
              {/* Goal Overview Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="glass-card p-5 lg:p-6"
              >
                <h3 className="font-sans text-lg font-semibold text-foreground mb-5">Goal Overview</h3>
                <div className="space-y-4">
                  <div className={`flex items-center justify-between py-3 border-b ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.06)]"}`}>
                    <div className="flex items-center gap-3">
                      <Target className="w-4 h-4 text-[#F5C518]" />
                      <span className="font-mono text-sm text-muted-foreground">Target</span>
                    </div>
                    <span className="font-mono text-sm text-foreground">15kg loss</span>
                  </div>
                  <div className={`flex items-center justify-between py-3 border-b ${isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[rgba(0,0,0,0.06)]"}`}>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-[#00D4FF]" />
                      <span className="font-mono text-sm text-muted-foreground">Progress</span>
                    </div>
                    <span className="font-mono text-sm text-foreground">2.3kg lost</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-[#9D4EDD]" />
                      <span className="font-mono text-sm text-muted-foreground">Started</span>
                    </div>
                    <span className="font-mono text-sm text-foreground">17 days ago</span>
                  </div>
                </div>
              </motion.div>

              {/* Weekly Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="glass-card p-5 lg:p-6"
              >
                <h3 className="font-sans text-lg font-semibold text-foreground mb-5">This Week</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-xl bg-[rgba(245,197,24,0.06)] border border-[rgba(245,197,24,0.1)]">
                    <p className="font-sans text-3xl font-bold text-[#F5C518]">5</p>
                    <p className="font-mono text-xs text-muted-foreground mt-1">Tasks done</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.1)]">
                    <p className="font-sans text-3xl font-bold text-[#00D4FF]">2</p>
                    <p className="font-mono text-xs text-muted-foreground mt-1">Coach chats</p>
                  </div>
                </div>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="glass-card p-5 lg:p-6"
              >
                <h3 className="font-sans text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    href="/coach"
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${isDark ? "bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)]" : "bg-[rgba(0,0,0,0.02)] hover:bg-[rgba(0,0,0,0.04)]"}`}
                  >
                    <MessageCircle className="w-4 h-4 text-[#00D4FF]" />
                    <span className="font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      Ask your coach
                    </span>
                  </Link>
                  <Link
                    href="/calendar"
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${isDark ? "bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)]" : "bg-[rgba(0,0,0,0.02)] hover:bg-[rgba(0,0,0,0.04)]"}`}
                  >
                    <Calendar className="w-4 h-4 text-[#F5C518]" />
                    <span className="font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      Schedule time block
                    </span>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
