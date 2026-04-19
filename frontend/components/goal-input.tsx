"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { ArrowRight } from "lucide-react"
import { useGoals } from "@/contexts/goals-context"
import { useTheme } from "@/contexts/theme-context"

const exampleGoals = [
  "Lose 15kg",
  "Negotiate a higher salary",
  "Start freelancing",
  "Build my personal brand",
  "Learn a language",
  "Build muscle",
]

export function GoalInput() {
  const [goal, setGoal] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const router = useRouter()
  const { addGoal, setActiveGoal } = useGoals()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const handleChipClick = (exampleGoal: string) => {
    setGoal(exampleGoal)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal.trim()) return
    try {
      const newGoal = await addGoal({
        title: goal.trim(),
        color: "gold",
      })
      setActiveGoal(newGoal.id)
      router.push("/intake")
    } catch {
      // Surfaced via UI-level error state in a future iteration.
    }
  }

  return (
    <div className="flex flex-col items-center gap-8 sm:gap-10 lg:gap-12 w-full max-w-2xl mx-auto px-4 sm:px-6">
      {/* Logo */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
        className={`font-sans text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[0.08em] ${isDark ? 'text-[#F5C518]' : 'text-[#D4A912]'}`}
      >
        MentorMeUp
      </motion.h1>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
        className={`font-mono text-xs sm:text-sm md:text-base text-center -mt-2 sm:-mt-4 px-2 ${isDark ? 'text-[#00D4FF]' : 'text-[#0099CC]'}`}
      >
        Any person. Any goal. One AI that gets you there.
      </motion.p>

      {/* Input Card */}
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        className="w-full"
      >
        <div
          className={`
            relative rounded-2xl p-[2px] transition-all duration-500 input-glow
            ${isFocused 
              ? isDark 
                ? "bg-gradient-to-r from-[#F5C518]/60 via-[#F5C518]/40 to-[#F5C518]/60"
                : "bg-gradient-to-r from-[#D4A912]/60 via-[#D4A912]/40 to-[#D4A912]/60"
              : isDark
                ? "bg-gradient-to-r from-[#F5C518]/20 via-[#F5C518]/10 to-[#F5C518]/20"
                : "bg-gradient-to-r from-[#D4A912]/20 via-[#D4A912]/10 to-[#D4A912]/20"
            }
          `}
        >
          <div 
            className="relative rounded-[14px] overflow-hidden glass-card" 
            style={{ 
              background: isDark 
                ? 'linear-gradient(135deg, rgba(13, 17, 23, 0.95) 0%, rgba(8, 11, 20, 0.98) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 250, 0.98) 100%)'
            }}
          >
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="What do you want to achieve?"
              className={`
                w-full py-4 px-5 sm:py-5 sm:px-6 lg:py-6 lg:px-8 text-base sm:text-lg lg:text-xl
                bg-transparent
                focus:outline-none
                font-mono
                ${isDark 
                  ? 'text-white placeholder:text-[#4A5568]' 
                  : 'text-[#1A1D21] placeholder:text-[#9CA3AF]'
                }
              `}
            />
            {/* Inner ambient glow */}
            <div 
              className={`
                absolute inset-0 pointer-events-none rounded-xl transition-opacity duration-500
                ${isFocused ? "opacity-100" : "opacity-0"}
              `}
              style={{
                background: isDark 
                  ? "radial-gradient(ellipse at center, rgba(245,197,24,0.06) 0%, transparent 60%)"
                  : "radial-gradient(ellipse at center, rgba(212,169,18,0.08) 0%, transparent 60%)",
              }}
            />
          </div>
        </div>
      </motion.form>

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
        onClick={handleSubmit}
        className={`
          group flex items-center gap-2 sm:gap-3 px-6 py-3.5 sm:px-8 sm:py-4 lg:px-10 lg:py-5
          font-sans font-bold text-sm sm:text-base lg:text-lg
          rounded-full
          transition-all duration-300
          pulse-glow
          ${isDark 
            ? 'bg-gradient-to-r from-[#F5C518] to-[#E5B516] text-[#080B14] hover:from-[#FFD633] hover:to-[#F5C518] shadow-[0_4px_20px_rgba(245,197,24,0.3)]'
            : 'bg-gradient-to-r from-[#D4A912] to-[#C49B10] text-white hover:from-[#E5B516] hover:to-[#D4A912] shadow-[0_4px_20px_rgba(212,169,18,0.3)]'
          }
        `}
      >
        Build My Path
        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
      </motion.button>

      {/* Example Goal Chips */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
        className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-xl"
      >
        {exampleGoals.map((exampleGoal, index) => (
          <motion.button
            key={exampleGoal}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 + index * 0.06, ease: [0.25, 0.4, 0.25, 1] }}
            onClick={() => handleChipClick(exampleGoal)}
            className={`
              px-3 py-2 sm:px-5 sm:py-2.5
              glass-card-subtle
              rounded-full
              font-mono text-xs sm:text-sm
              transition-all duration-300
              ${isDark 
                ? 'text-[#9CA3AF] hover:bg-[rgba(255,255,255,0.06)] hover:border-[#00D4FF]/40 hover:text-[#00D4FF] hover:shadow-[0_0_24px_rgba(0,212,255,0.15)]'
                : 'text-[#6B7280] hover:bg-[rgba(0,0,0,0.04)] hover:border-[#0099CC]/40 hover:text-[#0099CC] hover:shadow-[0_0_20px_rgba(0,153,204,0.12)]'
              }
            `}
          >
            {exampleGoal}
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
