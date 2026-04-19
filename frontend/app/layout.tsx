import type { Metadata } from 'next'
import { Syne, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import { GoalsProvider } from '@/contexts/goals-context'
import { ThemeProvider } from '@/contexts/theme-context'
import { CoachProvider } from '@/contexts/coach-context'
import { OAuthCallbackHandler } from '@/components/oauth-callback-handler'
import { AuthGate } from '@/components/auth-gate'
import { CoachWidget } from '@/components/coach-widget'
import './globals.css'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MentorMeUp | AI Mentorship for Any Goal',
  description: 'Any person. Any goal. One AI that gets you there.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Theme init runs before hydration to prevent FOUC. Served from /public
            so we don't need dangerouslySetInnerHTML. */}
        <script src="/theme-init.js" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            <GoalsProvider>
              <CoachProvider>
                <OAuthCallbackHandler />
                <AuthGate>{children}</AuthGate>
                <CoachWidget />
              </CoachProvider>
            </GoalsProvider>
          </AuthProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
