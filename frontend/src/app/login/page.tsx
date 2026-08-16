"use client";
import { useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn, AlertCircle, CheckCircle2, Loader2, Moon, Sun } from 'lucide-react';

// The actual form is split out into its own component so it can be wrapped in Suspense
function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get('registered');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ username, password });
      router.push('/projects');
    } catch {
      setError("Login failed. Check your username and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
      {error && (
        <div className="absolute top-4 right-4 left-4 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={18} />
          <span className="text-xs font-bold">{error}</span>
        </div>
      )}

      {showSuccess && !error && (
        <div className="absolute top-4 right-4 left-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          <span className="text-xs font-bold">Account ready! Log in now.</span>
        </div>
      )}

      <div className="text-center pt-4">
        <div className="bg-blue-50 dark:bg-blue-950/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400">
          <LogIn size={32} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Welcome back</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">Log in to PlannerPro</p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-3">
          <input
            type="text"
            required
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            placeholder="Username"
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            required
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : "LOG IN"}
        </button>
      </form>

      <p className="text-center text-sm font-bold text-slate-400 dark:text-slate-500">
        No account yet? <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 ml-1">REGISTER NOW</Link>
      </p>
    </div>
  );
}

// The export wraps everything in Suspense
export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 font-sans relative transition-colors">
      <button
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute top-6 right-6 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <Suspense fallback={<Loader2 className="animate-spin text-blue-600" size={40} />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
