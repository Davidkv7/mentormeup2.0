"use client";

import { motion } from "motion/react";
import { User, ArrowRight } from "lucide-react";
import Link from "next/link";
import { AnimatedOrb } from "@/components/animated-orb";
import { TaskCard } from "@/components/task-card";
import { MoodSelector } from "@/components/mood-selector";
import { SidebarNav } from "@/components/sidebar-nav";
import { HealthSnapshot } from "@/components/health-snapshot";
import { useGoals } from "@/contexts/goals-context";
import { useTheme } from "@/contexts/theme-context";

export default function DailyFocusPage() {
  const { activeGoal, completeTask } = useGoals();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Get tasks from active goal or show default
  const tasks = activeGoal?.dailyTasks || [];
  
  // Fallback tasks if no goals exist
  const fallbackTasks = [
    {
      id: "fallback-1",
      title: "Morning weigh-in + log",
      goalTag: "Lose 15kg",
      duration: "5 min",
      completed: false,
      goalId: "",
    },
    {
      id: "fallback-2",
      title: "20-min walk",
      goalTag: "Lose 15kg",
      duration: "20 min",
      completed: false,
      goalId: "",
    },
    {
      id: "fallback-3",
      title: "Log meals in app",
      goalTag: "Lose 15kg",
      duration: "3 min",
      completed: false,
      goalId: "",
    },
  ];

  const displayTasks = tasks.length > 0 ? tasks : fallbackTasks;
  const goalTitle = activeGoal?.title || "Lose 15kg";

  return (
    <div className="noise-bg min-h-screen bg-background transition-colors duration-300">
      {/* Sidebar */}
      <SidebarNav />

      {/* Radial gradient backgrounds */}
      <div className={`fixed inset-0 ${isDark ? 'bg-[radial-gradient(ellipse_at_center,rgba(0,212,255,0.06)_0%,transparent_50%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(0,153,204,0.04)_0%,transparent_50%)]'}`} />
      <div className={`fixed inset-0 ${isDark ? 'bg-[radial-gradient(ellipse_at_top,rgba(245,197,24,0.04)_0%,transparent_40%)]' : 'bg-[radial-gradient(ellipse_at_top,rgba(212,169,18,0.03)_0%,transparent_40%)]'}`} />

      {/* Main content with sidebar offset */}
      <div className="relative md:ml-[72px] lg:ml-[240px] min-h-screen pb-24 md:pb-8">
        {/* Top Bar - Desktop */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          className={`hidden md:flex items-center justify-between px-6 lg:px-10 py-6 sticky top-0 z-30 backdrop-blur-xl ${
            isDark 
              ? 'bg-[rgba(8,11,20,0.9)]' 
              : 'bg-[rgba(248,249,250,0.9)]'
          }`}
        >
          <div>
            <Link href="/" className={`font-sans text-xl lg:text-2xl font-bold tracking-[0.02em] ${isDark ? 'text-[#F5C518]' : 'text-[#D4A912]'}`}>
              MentorMeUp
            </Link>
            <p className={`font-mono text-xs lg:text-sm mt-1 ${isDark ? 'text-[rgba(255,255,255,0.4)]' : 'text-[rgba(0,0,0,0.4)]'}`}>{today}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`font-mono text-sm hidden lg:block ${isDark ? 'text-[rgba(255,255,255,0.5)]' : 'text-[rgba(0,0,0,0.5)]'}`}>
              Good morning, David
            </span>
            <div className={`flex h-10 w-10 lg:h-11 lg:w-11 items-center justify-center rounded-full border backdrop-blur-xl ${
              isDark 
                ? 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.05)]'
                : 'border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.8)]'
            }`}>
              <User className={`h-5 w-5 ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[rgba(0,0,0,0.5)]'}`} />
            </div>
          </div>
        </motion.header>

        {/* Mobile date display */}
        <div className="md:hidden flex flex-col items-center pt-16 pb-4 px-4">
          <span className={`font-mono text-xs ${isDark ? 'text-[rgba(255,255,255,0.4)]' : 'text-[rgba(0,0,0,0.4)]'}`}>{today}</span>
          <h1 className={`font-sans text-lg font-bold mt-2 ${isDark ? 'text-white' : 'text-[#1A1D21]'}`}>Good morning, David</h1>
        </div>

        {/* Content Grid */}
        <div className="px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
          {/* Health Snapshot - shows when wearable connected */}
          <div className="mb-6 lg:mb-8">
            <HealthSnapshot
              readinessScore={84}
              sleepDuration="7h 20m"
              hrv={61}
              aiInsight="Good recovery today. I've scheduled your hardest task at 9am. You're ready."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            
            {/* Left Column - AI Coach Message + Tasks */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6 lg:space-y-8">
              {/* AI Coach Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
                className="glass-card-cyan p-5 lg:p-6"
              >
                <div className="flex gap-4 lg:gap-5">
                  <div className="flex-shrink-0">
                    <AnimatedOrb size={48} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-mono text-sm lg:text-base italic leading-relaxed ${isDark ? 'text-[rgba(255,255,255,0.85)]' : 'text-[rgba(0,0,0,0.75)]'}`}>
                      Good morning, David. Today is your third weigh-in. You&apos;ve been
                      consistent 12 of 17 days — that&apos;s real. Don&apos;t expect a big
                      number today, water retention will skew it. What matters is the
                      trend. Log it and we&apos;ll look at the 3-week average together.
                    </p>
                    <Link 
                      href="/coach" 
                      className={`inline-flex items-center gap-2 mt-4 font-mono text-sm transition-colors group ${isDark ? 'text-[#F5C518] hover:text-[#FFD633]' : 'text-[#D4A912] hover:text-[#B8941A]'}`}
                    >
                      Full message 
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* Today's Tasks */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className={`font-sans text-lg lg:text-xl font-bold ${isDark ? 'text-[#F5C518]' : 'text-[#D4A912]'}`}>
                    Today&apos;s Tasks
                  </h2>
                  <span className={`font-mono text-xs ${isDark ? 'text-[rgba(255,255,255,0.4)]' : 'text-[rgba(0,0,0,0.4)]'}`}>
                    {displayTasks.filter(t => !t.completed).length} remaining
                  </span>
                </div>
                <div className="space-y-4">
                  {displayTasks.map((task, index) => (
                    <TaskCard
                      key={task.id}
                      title={task.title}
                      goalTag={goalTitle}
                      duration={task.duration}
                      index={index}
                      isComplete={task.completed}
                      onToggle={activeGoal ? () => completeTask(activeGoal.id, task.id) : undefined}
                    />
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right Column - Progress + Mood */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:space-y-8">
              {/* Milestone Progress Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
                className="glass-card p-5 lg:p-6"
              >
                <h3 className={`font-sans text-base lg:text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#1A1D21]'}`}>
                  Current Milestone
                </h3>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Link 
                    href="/path" 
                    className={`font-mono text-xs truncate transition-colors ${isDark ? 'text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.8)]' : 'text-[rgba(0,0,0,0.5)] hover:text-[rgba(0,0,0,0.7)]'}`}
                  >
                    Milestone 2 — Build the Deficit
                  </Link>
                  <span className={`font-mono text-xs flex-shrink-0 ${isDark ? 'text-[#F5C518]' : 'text-[#D4A912]'}`}>3/7</span>
                </div>
                <div className={`h-2.5 overflow-hidden rounded-full ${isDark ? 'bg-[rgba(255,255,255,0.08)]' : 'bg-[rgba(0,0,0,0.08)]'}`}>
                  <motion.div
                    className="relative h-full rounded-full"
                    style={{
                      background: isDark 
                        ? 'linear-gradient(90deg, rgba(245, 197, 24, 0.8) 0%, #F5C518 100%)'
                        : 'linear-gradient(90deg, rgba(212, 169, 18, 0.8) 0%, #D4A912 100%)',
                      boxShadow: isDark 
                        ? '0 0 16px rgba(245, 197, 24, 0.4)'
                        : '0 0 12px rgba(212, 169, 18, 0.3)',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: "43%" }}
                    transition={{ delay: 0.7, duration: 1.2, ease: [0.25, 0.4, 0.25, 1] }}
                  >
                    <div className="absolute inset-0 overflow-hidden rounded-full">
                      <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    </div>
                  </motion.div>
                </div>
                <Link 
                  href="/path"
                  className={`inline-flex items-center gap-2 mt-4 font-mono text-xs transition-colors group ${isDark ? 'text-[#00D4FF] hover:text-[#33DDFF]' : 'text-[#0099CC] hover:text-[#007AA3]'}`}
                >
                  View full path 
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              {/* Stats Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
                className="glass-card p-5 lg:p-6"
              >
                <h3 className={`font-sans text-base lg:text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#1A1D21]'}`}>
                  This Week
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`text-center p-4 rounded-xl ${isDark ? 'bg-[rgba(245,197,24,0.06)] border border-[rgba(245,197,24,0.1)]' : 'bg-[rgba(212,169,18,0.06)] border border-[rgba(212,169,18,0.15)]'}`}>
                    <p className={`font-sans text-2xl lg:text-3xl font-bold ${isDark ? 'text-[#F5C518]' : 'text-[#D4A912]'}`}>12</p>
                    <p className={`font-mono text-xs mt-1 ${isDark ? 'text-[rgba(255,255,255,0.5)]' : 'text-[rgba(0,0,0,0.5)]'}`}>Days consistent</p>
                  </div>
                  <div className={`text-center p-4 rounded-xl ${isDark ? 'bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.1)]' : 'bg-[rgba(0,153,204,0.06)] border border-[rgba(0,153,204,0.15)]'}`}>
                    <p className={`font-sans text-2xl lg:text-3xl font-bold ${isDark ? 'text-[#00D4FF]' : 'text-[#0099CC]'}`}>71%</p>
                    <p className={`font-mono text-xs mt-1 ${isDark ? 'text-[rgba(255,255,255,0.5)]' : 'text-[rgba(0,0,0,0.5)]'}`}>Task completion</p>
                  </div>
                </div>
              </motion.div>

              {/* Mood Log */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
              >
                <MoodSelector />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
