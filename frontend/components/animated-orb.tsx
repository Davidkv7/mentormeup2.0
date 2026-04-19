"use client";

import { motion } from "motion/react";

export function AnimatedOrb({ size = 48 }: { size?: number }) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Outer ambient glow */}
      <motion.div
        className="absolute inset-[-4px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.25) 0%, transparent 70%)',
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
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.4) 0%, rgba(245, 197, 24, 0.2) 100%)',
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
          background: 'linear-gradient(135deg, #00D4FF 0%, rgba(0, 180, 220, 0.8) 50%, rgba(245, 197, 24, 0.4) 100%)',
          boxShadow: '0 0 16px rgba(0, 212, 255, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.2)',
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
    </div>
  );
}
