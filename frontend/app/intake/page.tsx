"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Target, Clock, Sparkles } from "lucide-react"
import { ChatMessage } from "@/components/chat-message"
import { ChatInput } from "@/components/chat-input"
import { TypingIndicator } from "@/components/typing-indicator"
import { useTheme } from "@/contexts/theme-context"

interface Message {
  id: number
  content: string
  isUser: boolean
  timestamp: string
}

const initialMessages: Message[] = [
  {
    id: 1,
    content: "I see you want to lose 15kg — that's a meaningful goal. Before I build your personalized path, I need to understand where you're starting from. What's your current weight and height?",
    isUser: false,
    timestamp: "2:34 PM",
  },
  {
    id: 2,
    content: "I'm 92kg and 175cm tall. I've been at this weight for about 2 years now after gaining during the pandemic.",
    isUser: true,
    timestamp: "2:35 PM",
  },
  {
    id: 3,
    content: "Got it — 92kg at 175cm puts your BMI around 30. Two years is enough time for habits to solidify. Now, what's gotten in the way of losing weight in the past? Be honest — I'm not here to judge, just to understand.",
    isUser: false,
    timestamp: "2:35 PM",
  },
  {
    id: 4,
    content: "Honestly, I start strong for a week or two then fall off. Work gets busy, I skip the gym, then I stress eat at night. It's a cycle I can't seem to break.",
    isUser: true,
    timestamp: "2:36 PM",
  },
]

export default function IntakePage() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isTyping, setIsTyping] = useState(true)
  const router = useRouter()

  const handleSend = (content: string) => {
    const newMessage: Message = {
      id: messages.length + 1,
      content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    }
    setMessages([...messages, newMessage])
    setIsTyping(true)
    
    setTimeout(() => {
      router.push("/path")
    }, 2000)
  }

  const handleSkip = () => {
    router.push("/path")
  }

  return (
    <main className={`min-h-screen ${isDark ? "bg-[#080B14]" : "bg-[#F8F9FA]"} noise-bg relative overflow-hidden transition-colors duration-300`}>
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] lg:w-[900px] h-[500px] lg:h-[700px] ${isDark ? "bg-[radial-gradient(ellipse_at_center,_rgba(0,212,255,0.06)_0%,_transparent_60%)]" : "bg-[radial-gradient(ellipse_at_center,_rgba(0,212,255,0.03)_0%,_transparent_60%)]"}`} />
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[500px] lg:w-[700px] h-[400px] lg:h-[500px] ${isDark ? "bg-[radial-gradient(ellipse_at_center,_rgba(245,197,24,0.04)_0%,_transparent_60%)]" : "bg-[radial-gradient(ellipse_at_center,_rgba(245,197,24,0.02)_0%,_transparent_60%)]"}`} />
      </div>

      {/* Top bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: isDark 
            ? 'linear-gradient(180deg, rgba(8, 11, 20, 0.95) 0%, rgba(8, 11, 20, 0.8) 100%)'
            : 'linear-gradient(180deg, rgba(248, 249, 250, 0.95) 0%, rgba(248, 249, 250, 0.8) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex flex-col gap-1 sm:gap-1.5">
            <h1 className="text-[#F5C518] font-sans font-bold text-base sm:text-lg lg:text-xl">Building Your Path</h1>
            <p className="text-[#00D4FF] font-mono text-[10px] sm:text-xs">Interview — Step 1 of 2</p>
          </div>
          <button 
            onClick={handleSkip}
            className={`font-mono text-xs sm:text-sm transition-colors ${isDark ? "text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.4)] hover:text-[rgba(0,0,0,0.7)]"}`}
          >
            Skip →
          </button>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="relative z-10 pt-20 sm:pt-24 pb-32 sm:pb-36 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Chat area */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="max-w-3xl mx-auto lg:max-w-none">
              <div className="flex flex-col gap-4 sm:gap-6">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    content={message.content}
                    isUser={message.isUser}
                    timestamp={message.timestamp}
                    delay={index * 0.12}
                  />
                ))}
                
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: messages.length * 0.12 + 0.3 }}
                    className="pl-2"
                  >
                    <TypingIndicator />
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Context sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="hidden lg:block lg:col-span-4 xl:col-span-3"
          >
            <div className="sticky top-24 space-y-5">
              {/* Goal Context */}
              <div className={`p-5 rounded-2xl border ${isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)]" : "bg-white border-[rgba(0,0,0,0.06)]"}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-4 h-4 text-[#F5C518]" />
                  <span className={`font-mono text-xs ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>Your Goal</span>
                </div>
                <p className={`font-sans font-semibold text-lg ${isDark ? "text-white" : "text-[#1A1D21]"}`}>Lose 15kg</p>
                <p className={`font-mono text-xs mt-2 ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                  Submitted just now
                </p>
              </div>

              {/* What happens next */}
              <div className={`p-5 rounded-2xl border ${isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)]" : "bg-white border-[rgba(0,0,0,0.06)]"}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="w-4 h-4 text-[#00D4FF]" />
                  <span className={`font-mono text-xs ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>What&apos;s Next</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[rgba(245,197,24,0.15)] text-[#F5C518] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span className={`font-mono text-sm ${isDark ? "text-[rgba(255,255,255,0.7)]" : "text-[rgba(0,0,0,0.7)]"}`}>Quick intake chat</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5 ${isDark ? "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]" : "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.4)]"}`}>2</span>
                    <span className={`font-mono text-sm ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>AI builds your path</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5 ${isDark ? "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.4)]" : "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.4)]"}`}>3</span>
                    <span className={`font-mono text-sm ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>Start your first task</span>
                  </li>
                </ul>
              </div>

              {/* Time estimate */}
              <div className={`p-5 rounded-2xl border ${isDark ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)]" : "bg-white border-[rgba(0,0,0,0.06)]"}`}>
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-4 h-4 text-[#9D4EDD]" />
                  <span className={`font-mono text-xs ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>Estimated Time</span>
                </div>
                <p className={`font-sans font-semibold ${isDark ? "text-white" : "text-[#1A1D21]"}`}>2-3 minutes</p>
                <p className={`font-mono text-xs mt-1 ${isDark ? "text-[rgba(255,255,255,0.5)]" : "text-[rgba(0,0,0,0.5)]"}`}>
                  Just a few questions to personalize your journey
                </p>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>

      {/* Chat input */}
      <div className="fixed bottom-0 left-0 right-0 lg:right-[calc(33.333%-2rem)] xl:right-[calc(25%-2rem)]">
        <ChatInput onSend={handleSend} />
      </div>
    </main>
  )
}
