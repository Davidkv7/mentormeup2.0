"use client";

import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";

export default function LoginPage() {
  const { status } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const isDark = theme === "dark";
  const [redirecting, setRedirecting] = useState(false);

  // Already signed in? Send them home.
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  const handleLogin = () => {
    setRedirecting(true);
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = `${window.location.origin}/`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <main
      className={`relative min-h-screen flex items-center justify-center overflow-hidden noise-bg transition-colors duration-300 ${
        isDark ? "bg-[#080B14]" : "bg-[#F8F9FA]"
      }`}
      data-testid="login-page"
    >
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: isDark
            ? `radial-gradient(ellipse 80% 50% at 50% 50%, rgba(0,100,200,0.15) 0%, transparent 50%), #080B14`
            : `radial-gradient(ellipse 80% 50% at 50% 50%, rgba(0,100,200,0.08) 0%, transparent 50%), #F8F9FA`,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
        className="relative z-10 flex flex-col items-center gap-10 px-6 max-w-md w-full"
      >
        <h1
          className={`font-sans text-5xl md:text-6xl font-bold tracking-[0.08em] ${
            isDark ? "text-[#F5C518]" : "text-[#D4A912]"
          }`}
          data-testid="login-title"
        >
          MentorMeUp
        </h1>
        <p
          className={`font-mono text-sm md:text-base text-center -mt-4 ${
            isDark ? "text-[#00D4FF]" : "text-[#0099CC]"
          }`}
        >
          Any person. Any goal. One AI that gets you there.
        </p>

        <div
          className={`w-full p-6 rounded-2xl border ${
            isDark
              ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)]"
              : "bg-white border-[rgba(0,0,0,0.06)]"
          }`}
          style={{ backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-[#F5C518]" />
            <span
              className={`font-mono text-xs ${
                isDark ? "text-[rgba(255,255,255,0.6)]" : "text-[rgba(0,0,0,0.6)]"
              }`}
            >
              Sign in to meet your coach
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={redirecting}
            data-testid="google-login-button"
            className={`group w-full flex items-center justify-center gap-3 px-6 py-4 rounded-full font-sans font-bold text-base transition-all duration-300 pulse-glow ${
              isDark
                ? "bg-gradient-to-r from-[#F5C518] to-[#E5B516] text-[#080B14] hover:from-[#FFD633] hover:to-[#F5C518] shadow-[0_4px_20px_rgba(245,197,24,0.3)]"
                : "bg-gradient-to-r from-[#D4A912] to-[#C49B10] text-white hover:from-[#E5B516] hover:to-[#D4A912] shadow-[0_4px_20px_rgba(212,169,18,0.3)]"
            } disabled:opacity-50`}
          >
            {redirecting ? "Redirecting…" : "Continue with Google"}
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          <p
            className={`mt-4 font-mono text-[11px] text-center ${
              isDark ? "text-[rgba(255,255,255,0.35)]" : "text-[rgba(0,0,0,0.35)]"
            }`}
          >
            We use Google for secure sign-in. Your coach starts the moment you land on the home screen.
          </p>
        </div>
      </motion.div>
    </main>
  );
}
