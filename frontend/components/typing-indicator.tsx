"use client"

import { motion } from "motion/react"

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
      className="flex items-center gap-3"
    >
      <span className="text-[rgba(255,255,255,0.45)] font-mono text-xs sm:text-sm">MentorMeUp is thinking</span>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: '#00D4FF',
              boxShadow: '0 0 8px rgba(0, 212, 255, 0.5)',
            }}
            animate={{
              y: [0, -8, 0],
              opacity: [0.4, 1, 0.4],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.12,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}
