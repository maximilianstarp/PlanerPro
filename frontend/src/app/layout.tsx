import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ThemeProvider } from '@/context/ThemeContext'
import Navbar from '@/app/components/Navbar'
import VerifyEmailBanner from '@/app/components/VerifyEmailBanner'
import Footer from '@/app/components/Footer'

// robots: { index: false } is a beta-phase choice (paired with
// src/app/robots.ts) so search engines don't index the app before it's
// ready for a public launch - remove/adjust both once out of beta.
export const metadata: Metadata = {
  title: 'PlannerPro',
  description: 'Plan your university timetable - conflict-free, automatically.',
  robots: { index: false, follow: false },
};

// Sets the .dark class on <html> before React hydrates/paints, based on the
// persisted choice (localStorage) or, on a first visit, the OS preference.
// Uses next/script's beforeInteractive strategy (rather than a plain
// <script> tag, which the App Router strips from a manual <head>) so it
// runs ahead of hydration; ThemeProvider then keeps this in sync on every
// toggle. See docs/color-palette.md for the palette this maps to.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col transition-colors" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <Navbar />
              <VerifyEmailBanner />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
