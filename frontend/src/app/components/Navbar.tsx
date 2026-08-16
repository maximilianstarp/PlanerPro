"use client";
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';
import { LogOut, Settings, LayoutGrid, User, Moon, Sun } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // If there is no user (e.g. on the login page), we don't show a navbar
  if (!user) return null;

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center shadow-sm transition-colors">
      <Link href="/projects" className="flex items-center gap-2 font-black text-xl text-blue-600 tracking-tight">
        <LayoutGrid size={24} strokeWidth={2.5} />
        <span>Planer<span className="text-slate-900 dark:text-slate-100">Pro</span></span>
      </Link>

      <div className="flex items-center gap-8">
        <div className="hidden md:flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium border-r pr-8 border-slate-200 dark:border-slate-800">
          <User size={16} />
          <span>{user.username}</span>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <Link href="/settings" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2 text-sm font-semibold">
            <Settings size={18} />
            Settings
          </Link>

          <button
            onClick={logout}
            className="text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-semibold"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
