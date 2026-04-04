import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/app/components/Navbar' // Importieren

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-slate-50 min-h-screen">
        <AuthProvider>
          <Navbar /> {/* children*/}
          <main>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}