import './globals.css'
import Script from 'next/script'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ThemeProvider } from '@/context/ThemeContext'
import Navbar from '@/app/components/Navbar'

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
      <body className="bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <Navbar /> {/* children*/}
              <main>
                {children}
              </main>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
