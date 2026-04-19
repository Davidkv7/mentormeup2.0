"use client";

import { motion } from "motion/react";

interface GoalProgressBarProps {
  progress: number;
  label: string;
}

export function GoalProgressBar({ progress, label }: GoalProgressBarProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm text-[#00D4FF]">{label}</span>
        <span className="font-mono text-sm text-[#F5C518] font-medium">{progress}%</span>
      </div>
      <div 
        className="h-3 w-full rounded-full overflow-hidden"
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
        }}
      >
        <motion.div
          className="h-full rounded-full relative"
          style={{
            background: 'linear-gradient(90deg, rgba(245, 197, 24, 0.7) 0%, #F5C518 100%)',
            boxShadow: '0 0 20px rgba(245, 197, 24, 0.4), 0 0 40px rgba(245, 197, 24, 0.2)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.4, ease: [0.25, 0.4, 0.25, 1], delay: 0.3 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
        </motion.div>
      </div>
    </div>
  );
}
