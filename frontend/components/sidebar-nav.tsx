"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Target,
  Calendar,
  Settings,
  Home,
  Menu,
  X,
  Heart,
  Flag,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GoalSwitcher } from "./goal-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import { useTheme } from "@/contexts/theme-context";

const navItems = [
  { icon: Home, href: "/daily", label: "Home" },
  { icon: Flag, href: "/goals", label: "Goals" },
  { icon: MessageSquare, href: "/coach", label: "Coach" },
  { icon: Target, href: "/path", label: "Path" },
  { icon: FileText, href: "/notes", label: "Notes" },
  { icon: Calendar, href: "/calendar", label: "Calendar" },
  { icon: Heart, href: "/health", label: "Health" },
  { icon: Settings, href: "/settings", label: "Settings" },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  return (
    <>
      {/* Mobile Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 backdrop-blur-xl ${
          isDark 
            ? 'bg-[rgba(8,11,20,0.95)] border-b border-[rgba(255,255,255,0.04)]' 
            : 'bg-[rgba(248,249,250,0.95)] border-b border-[rgba(0,0,0,0.06)]'
        }`}
      >
        <Link href="/" className="flex items-center gap-2" data-testid="mobile-logo">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F5C518] to-[#D4A912] flex items-center justify-center shadow-[0_2px_12px_rgba(245,197,24,0.3)]">
            <span className="font-sans font-bold text-[#080B14] text-sm">M</span>
          </div>
          <span className={`font-sans font-bold text-sm tracking-wide ${isDark ? 'text-[#F5C518]' : 'text-[#D4A912]'}`}>MentorMeUp</span>
        </Link>
        {/* Active goal visible in the mobile top bar so multi-goal users can
            switch without opening the hamburger. */}
        <div className="flex-1 flex justify-center min-w-0 px-2">
          <GoalSwitcher variant="mobile-topbar" />
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`p-2 transition-colors ${isDark ? 'text-[rgba(255,255,255,0.7)] hover:text-white' : 'text-[rgba(0,0,0,0.6)] hover:text-[rgba(0,0,0,0.9)]'}`}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </motion.div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.nav
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`absolute left-0 top-0 bottom-0 w-64 py-20 px-4 ${
                isDark 
                  ? 'bg-[#0A0E18] border-r border-[rgba(255,255,255,0.06)]'
                  : 'bg-white border-r border-[rgba(0,0,0,0.06)]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Goal Switcher */}
              <div className="mb-4">
                <p className={`font-mono text-[10px] uppercase tracking-wider px-4 mb-2 ${isDark ? 'text-[rgba(255,255,255,0.3)]' : 'text-[rgba(0,0,0,0.4)]'}`}>Active Goal</p>
                <GoalSwitcher />
              </div>

              <div className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? isDark 
                            ? "bg-[rgba(245,197,24,0.12)] text-[#F5C518]"
                            : "bg-[rgba(212,169,18,0.12)] text-[#D4A912]"
                          : isDark
                            ? "text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
                            : "text-[rgba(0,0,0,0.5)] hover:text-[rgba(0,0,0,0.9)] hover:bg-[rgba(0,0,0,0.04)]"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-mono text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Theme Switcher - Mobile */}
              <div className={`mt-6 pt-4 border-t ${isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-[rgba(0,0,0,0.06)]'}`}>
                <p className={`font-mono text-[10px] uppercase tracking-wider px-4 mb-3 ${isDark ? 'text-[rgba(255,255,255,0.3)]' : 'text-[rgba(0,0,0,0.4)]'}`}>Appearance</p>
                <div className="px-4">
                  <ThemeSwitcher />
                </div>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
        className={`hidden md:flex fixed left-0 top-0 bottom-0 w-[72px] lg:w-[240px] flex-col py-6 gap-2 z-50 ${
          isDark 
            ? 'bg-[#0A0E18] border-r border-[rgba(255,255,255,0.04)]'
            : 'bg-white border-r border-[rgba(0,0,0,0.06)] shadow-[2px_0_16px_rgba(0,0,0,0.04)]'
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 px-4 lg:px-5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5C518] to-[#D4A912] flex items-center justify-center shadow-[0_4px_16px_rgba(245,197,24,0.3)] flex-shrink-0">
            <span className="font-sans font-bold text-[#080B14] text-sm">M</span>
          </div>
          <span className={`hidden lg:block font-sans font-bold text-base tracking-wide ${isDark ? 'text-[#F5C518]' : 'text-[#D4A912]'}`}>MentorMeUp</span>
        </Link>

        {/* Goal Switcher - Desktop: compact on 72px sidebar, full on 240px. */}
        <div className="px-3 lg:px-4 mb-4">
          <div className="lg:hidden flex justify-center">
            <GoalSwitcher variant="compact" />
          </div>
          <div className="hidden lg:block">
            <GoalSwitcher />
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col gap-1 flex-1 px-3 lg:px-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === "/goals" && pathname?.startsWith("/goals"));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? isDark 
                      ? "bg-[rgba(245,197,24,0.12)] text-[#F5C518]"
                      : "bg-[rgba(212,169,18,0.12)] text-[#D4A912]"
                    : isDark
                      ? "text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.8)] hover:bg-[rgba(255,255,255,0.04)]"
                      : "text-[rgba(0,0,0,0.4)] hover:text-[rgba(0,0,0,0.8)] hover:bg-[rgba(0,0,0,0.04)]"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="hidden lg:block font-mono text-sm">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full ${isDark ? 'bg-[#F5C518] shadow-[0_0_12px_rgba(245,197,24,0.5)]' : 'bg-[#D4A912] shadow-[0_0_12px_rgba(212,169,18,0.4)]'}`}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {/* Tooltip - only on collapsed sidebar */}
                <span className={`lg:hidden absolute left-full ml-3 px-3 py-1.5 backdrop-blur-xl text-xs font-mono rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap pointer-events-none shadow-xl translate-x-[-4px] group-hover:translate-x-0 ${
                  isDark 
                    ? 'bg-[rgba(13,17,23,0.95)] text-white border border-[rgba(255,255,255,0.08)]'
                    : 'bg-white text-[#1A1D21] border border-[rgba(0,0,0,0.08)]'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Theme Switcher */}
        <div className={`px-3 lg:px-4 pt-4 border-t ${isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-[rgba(0,0,0,0.06)]'}`}>
          <div className="flex items-center justify-center lg:justify-start">
            <ThemeSwitcher compact />
            <span className={`hidden lg:block font-mono text-xs ml-3 ${isDark ? 'text-[rgba(255,255,255,0.4)]' : 'text-[rgba(0,0,0,0.4)]'}`}>Theme</span>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Bottom Nav */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2 safe-area-pb backdrop-blur-xl ${
        isDark 
          ? 'bg-[rgba(8,11,20,0.95)] border-t border-[rgba(255,255,255,0.06)]'
          : 'bg-[rgba(255,255,255,0.95)] border-t border-[rgba(0,0,0,0.06)]'
      }`}>
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? isDark ? "text-[#F5C518]" : "text-[#D4A912]"
                  : isDark 
                    ? "text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]"
                    : "text-[rgba(0,0,0,0.4)] hover:text-[rgba(0,0,0,0.7)]"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-mono text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
