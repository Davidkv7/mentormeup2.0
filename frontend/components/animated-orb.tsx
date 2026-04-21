"use client";

import { motion, AnimatePresence } from "motion/react";

export function AnimatedOrb({
  size = 48,
  pulse = false,
}: {
  size?: number;
  /** When true, overlay a gold pulse ring — the coach has reached out. */
  pulse?: boolean;
}) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      data-testid={pulse ? "animated-orb-pulsing" : "animated-orb"}
    >
      {/* Outer ambient glow */}
      <motion.div
        className="absolute inset-[-4px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0, 212, 255, 0.25) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Secondary glow layer */}
      <motion.div
        className="absolute inset-0 rounded-full blur-sm"
        style={{
          background:
            "linear-gradient(135deg, rgba(0, 212, 255, 0.4) 0%, rgba(245, 197, 24, 0.2) 100%)",
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Core orb */}
      <motion.div
        className="absolute inset-[3px] rounded-full"
        style={{
          background:
            "linear-gradient(135deg, #00D4FF 0%, rgba(0, 180, 220, 0.8) 50%, rgba(245, 197, 24, 0.4) 100%)",
          boxShadow:
            "0 0 16px rgba(0, 212, 255, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2)",
        }}
        animate={{
          scale: [1, 1.06, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Inner highlight */}
      <motion.div
        className="absolute rounded-full bg-white/70 blur-[1px]"
        style={{
          left: size * 0.2,
          top: size * 0.15,
          width: size * 0.15,
          height: size * 0.15,
        }}
        animate={{
          opacity: [0.5, 0.9, 0.5],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Gold "coach reached out" pulse — two expanding rings. */}
      <AnimatePresence>
        {pulse && (
          <>
            <motion.div
              key="pulse-ring-1"
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: "2px solid rgba(245, 197, 24, 0.85)",
                boxShadow: "0 0 22px rgba(245, 197, 24, 0.55)",
              }}
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: [1, 1.9], opacity: [0.9, 0] }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
            <motion.div
              key="pulse-ring-2"
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: "2px solid rgba(245, 197, 24, 0.6)",
              }}
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: [1, 2.4], opacity: [0.7, 0] }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.6,
              }}
            />
            {/* Inner gold tint on the core when unread */}
            <motion.div
              key="pulse-tint"
              className="absolute inset-[3px] rounded-full pointer-events-none mix-blend-screen"
              style={{
                background:
                  "radial-gradient(circle, rgba(245, 197, 24, 0.55) 0%, transparent 70%)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
