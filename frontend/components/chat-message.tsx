"use client"

import { motion } from "motion/react"
import { useTheme } from "@/contexts/theme-context"

interface ChatMessageProps {
  content: string
  isUser: boolean
  timestamp: string
  delay?: number
}

export function ChatMessage({ content, isUser, timestamp, delay = 0 }: ChatMessageProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 40 : -40, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[90%] sm:max-w-[85%] md:max-w-[75%] p-3.5 sm:p-5 ${
          isUser
            ? "rounded-2xl rounded-br-md"
            : "rounded-2xl rounded-bl-md border-l-2 border-l-[#00D4FF]"
        }`}
        style={{
          background: isUser 
            ? 'linear-gradient(135deg, rgba(245, 197, 24, 0.12) 0%, rgba(245, 197, 24, 0.04) 100%)'
            : isDark
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
          backdropFilter: 'blur(24px)',
          border: isUser 
            ? '1px solid rgba(245, 197, 24, 0.2)' 
            : isDark
              ? '1px solid rgba(255, 255, 255, 0.06)'
              : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isUser 
            ? '0 4px 20px rgba(245, 197, 24, 0.08)' 
            : isDark
              ? '0 4px 20px rgba(0, 0, 0, 0.15), -4px 0 16px rgba(0, 212, 255, 0.08)'
              : '0 4px 20px rgba(0, 0, 0, 0.05), -4px 0 16px rgba(0, 212, 255, 0.05)',
        }}
      >
        <p className={`font-mono text-xs sm:text-sm md:text-base leading-relaxed ${isDark ? "text-[#E8EAED]" : "text-[#1A1D21]"}`}>
          {content}
        </p>
        <p className={`font-mono text-[10px] sm:text-[11px] mt-2 sm:mt-3 tracking-wide ${isDark ? "text-[#6B7280]" : "text-[#9CA3AF]"}`}>
          {timestamp}
        </p>
      </div>
    </motion.div>
  )
}
