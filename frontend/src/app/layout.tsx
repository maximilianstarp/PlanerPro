import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import Navbar from '@/app/components/Navbar'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 min-h-screen">
        <ToastProvider>
          <AuthProvider>
            <Navbar /> {/* children*/}
            <main>
              {children}
            </main>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}