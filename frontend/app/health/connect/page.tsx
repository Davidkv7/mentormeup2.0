"use client";

import { motion } from "motion/react";
import { Watch, Circle, Activity, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const devices = [
  {
    id: "oura",
    name: "Oura Ring",
    description: "Sleep, HRV, Readiness",
    icon: Circle,
    buttonText: "Connect Oura",
  },
  {
    id: "apple",
    name: "Apple Watch",
    description: "Activity, Heart Rate, Workouts",
    icon: Watch,
    buttonText: "Connect Apple Health",
  },
  {
    id: "whoop",
    name: "Whoop",
    description: "Strain, Recovery, Sleep",
    icon: Activity,
    buttonText: "Connect Whoop",
  },
];

const comingSoon = ["Garmin", "Fitbit", "Polar"];

export default function WearableConnectPage() {
  const router = useRouter();

  const handleConnect = (deviceId: string) => {
    // Simulate connection - in real app would open OAuth flow
    alert(`Connecting to ${deviceId}...`);
    // After connection, redirect to health hub
    // router.push("/health");
  };

  return (
    <div className="min-h-screen bg-background noise-bg flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Deep blue radial glow behind cards */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] lg:w-[1200px] h-[500px] sm:h-[600px] lg:h-[800px] bg-[#0A1628] rounded-full blur-[100px] lg:blur-[150px]" />
        {/* Subtle gold accent at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#F5C518]/[0.03] rounded-full blur-[80px]" />
        {/* Cyan accent */}
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#00D4FF]/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-12 lg:mb-16"
        >
          <h1 className="font-sans font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white mb-4">
            Connect Your Body Data
          </h1>
          <p className="font-mono text-xs sm:text-sm md:text-base text-[#00D4FF] max-w-xl mx-auto leading-relaxed px-4">
            MentorMeUp uses your recovery and sleep data to adjust your coaching plan in real time.
          </p>
        </motion.div>

        {/* Device Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 mb-6 sm:mb-8">
          {devices.map((device, index) => (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className="group relative"
            >
              <div
                className="relative rounded-2xl p-6 sm:p-7 lg:p-8 transition-all duration-300 cursor-pointer
                  bg-gradient-to-b from-[rgba(255,255,255,0.06)] to-[rgba(255,255,255,0.02)]
                  border border-[rgba(255,255,255,0.08)]
                  backdrop-blur-xl
                  shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_24px_rgba(0,0,0,0.3)]
                  group-hover:border-[rgba(245,197,24,0.3)]
                  group-hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_40px_rgba(245,197,24,0.15),0_0_60px_rgba(245,197,24,0.08)]
                  group-hover:-translate-y-1"
              >
                {/* Device Icon */}
                <div className="w-16 h-16 sm:w-18 sm:h-18 lg:w-20 lg:h-20 mx-auto mb-5 sm:mb-6 rounded-full bg-gradient-to-b from-[rgba(255,255,255,0.08)] to-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center group-hover:border-[rgba(245,197,24,0.2)] transition-all duration-300">
                  <device.icon className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 text-[rgba(255,255,255,0.6)] group-hover:text-[#F5C518] transition-colors duration-300" />
                </div>

                {/* Device Name */}
                <h3 className="font-sans font-bold text-lg sm:text-xl text-white text-center mb-2">
                  {device.name}
                </h3>

                {/* Description */}
                <p className="font-mono text-xs sm:text-sm text-[rgba(255,255,255,0.5)] text-center mb-6 sm:mb-7">
                  {device.description}
                </p>

                {/* Connect Button */}
                <button
                  onClick={() => handleConnect(device.id)}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-xl font-sans font-semibold text-sm sm:text-base text-[#080B14] bg-gradient-to-r from-[#F5C518] to-[#E5B516] hover:from-[#FFD633] hover:to-[#F5C518] transition-all duration-300 shadow-[0_4px_20px_rgba(245,197,24,0.25)] hover:shadow-[0_6px_30px_rgba(245,197,24,0.35)]"
                >
                  {device.buttonText}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Coming Soon Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="max-w-md mx-auto mb-8 sm:mb-10"
        >
          <div
            className="rounded-xl p-4 sm:p-5 text-center
              bg-gradient-to-b from-[rgba(255,255,255,0.03)] to-[rgba(255,255,255,0.01)]
              border border-[rgba(255,255,255,0.05)]
              backdrop-blur-lg"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[rgba(255,255,255,0.3)]" />
              <span className="font-mono text-xs text-[rgba(255,255,255,0.4)]">
                More coming soon
              </span>
            </div>
            <p className="font-mono text-xs sm:text-sm text-[rgba(255,255,255,0.25)]">
              {comingSoon.join(" • ")}
            </p>
          </div>
        </motion.div>

        {/* Skip Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-center"
        >
          <Link
            href="/health"
            className="inline-flex items-center gap-1.5 font-mono text-xs sm:text-sm text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors duration-200 group"
          >
            Skip for now
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
