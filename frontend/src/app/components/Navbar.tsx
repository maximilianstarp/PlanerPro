"use client";
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { LogOut, Settings, LayoutGrid, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  // Wenn kein User da ist (z.B. auf der Login-Seite), zeigen wir keine Navbar
  if (!user) return null;

  return (
    <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
      <Link href="/projects" className="flex items-center gap-2 font-black text-xl text-blue-600 tracking-tight">
        <LayoutGrid size={24} strokeWidth={2.5} />
        <span>Planer<span className="text-slate-900">Pro</span></span>
      </Link>
      
      <div className="flex items-center gap-8">
        <div className="hidden md:flex items-center gap-2 text-slate-500 text-sm font-medium border-r pr-8 border-slate-200">
          <User size={16} />
          <span>{user.username}</span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/settings" className="text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2 text-sm font-semibold">
            <Settings size={18} />
            Einstellungen
          </Link>
          
          <button 
            onClick={logout}
            className="text-slate-600 hover:text-red-600 transition-colors flex items-center gap-2 text-sm font-semibold"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}