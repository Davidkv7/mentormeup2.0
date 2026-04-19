"use client"

import { GoalInput } from "@/components/goal-input"
import { useTheme } from "@/contexts/theme-context"

export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden noise-bg bg-background transition-colors duration-300">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: isDark
            ? `
              radial-gradient(ellipse 80% 50% at 50% 50%, rgba(0, 100, 200, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 50% 45%, rgba(0, 212, 255, 0.08) 0%, transparent 60%),
              #080B14
            `
            : `
              radial-gradient(ellipse 80% 50% at 50% 50%, rgba(0, 100, 200, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 50% 45%, rgba(0, 153, 204, 0.05) 0%, transparent 60%),
              #F8F9FA
            `,
        }}
      />
      
      {/* Subtle top glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] z-0"
        style={{
          background: isDark 
            ? "radial-gradient(ellipse at center top, rgba(245, 197, 24, 0.03) 0%, transparent 70%)"
            : "radial-gradient(ellipse at center top, rgba(212, 169, 18, 0.04) 0%, transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full py-12">
        <GoalInput />
      </div>
    </main>
  )
}
