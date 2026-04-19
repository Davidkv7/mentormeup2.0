"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Mic, ArrowUp } from "lucide-react"
import { useTheme } from "@/contexts/theme-context"

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage("")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
      className="fixed bottom-0 left-0 right-0 px-4 sm:px-6 pt-6 sm:pt-10 pb-6 sm:pb-8"
      style={{
        background: isDark
          ? 'linear-gradient(0deg, rgba(8, 11, 20, 1) 0%, rgba(8, 11, 20, 0.95) 60%, transparent 100%)'
          : 'linear-gradient(0deg, rgba(248, 249, 250, 1) 0%, rgba(248, 249, 250, 0.95) 60%, transparent 100%)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 flex items-center gap-1 sm:gap-2"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
          backdropFilter: 'blur(24px)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isDark ? '0 4px 24px rgba(0, 0, 0, 0.2)' : '0 4px 24px rgba(0, 0, 0, 0.1)',
        }}
      >
        <button
          type="button"
          className="p-2.5 sm:p-3.5 text-[#00D4FF] hover:bg-[rgba(0,212,255,0.1)] rounded-lg sm:rounded-xl transition-all duration-200"
          aria-label="Voice input"
        >
          <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your response..."
          disabled={disabled}
          className={`flex-1 bg-transparent font-mono text-xs sm:text-sm md:text-base outline-none py-2 ${
            isDark ? "text-[#E8EAED] placeholder:text-[#4A5568]" : "text-[#1A1D21] placeholder:text-[#9CA3AF]"
          }`}
        />
        
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className="p-2.5 sm:p-3.5 bg-[#F5C518] text-[#080B14] rounded-lg sm:rounded-xl hover:bg-[#FFD633] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 pulse-glow shadow-[0_4px_16px_rgba(245,197,24,0.3)]"
          aria-label="Send message"
        >
          <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </form>
    </motion.div>
  )
}
