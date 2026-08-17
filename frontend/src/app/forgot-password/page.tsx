"use client";
import { useState } from 'react';
import { isAxiosError } from 'axios';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';
import { KeyRound, AlertCircle, CheckCircle2, Loader2, Moon, Sun } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/password-reset/request', { email });
      // Always the same message regardless of whether the email exists -
      // the backend intentionally doesn't reveal that either.
      setInfo(res.data.message);
      setStep('confirm');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/password-reset/confirm', { email, code, new_password: newPassword });
      router.push('/login?reset=true');
    } catch (err) {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      setError(message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-100 dark:border-slate-800 relative overflow-hidden">

        {error && (
          <div className="absolute top-4 right-4 left-4 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            <span className="text-xs font-bold">{error}</span>
          </div>
        )}

        {info && step === 'confirm' && !error && (
          <div className="absolute top-4 right-4 left-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 size={18} />
            <span className="text-xs font-bold">{info}</span>
          </div>
        )}

        <div className="text-center pt-4">
          <div className="bg-blue-50 dark:bg-blue-950/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400">
            <KeyRound size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Reset password</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
            {step === 'request' ? "We'll email you a reset code" : 'Enter the code and a new password'}
          </p>
        </div>

        {step === 'request' ? (
          <form className="mt-8 space-y-4" onSubmit={handleRequest}>
            <input
              type="email"
              required
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="Email address"
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "SEND CODE"}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleConfirm}>
            <input
              type="text"
              inputMode="numeric"
              required
              maxLength={6}
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium text-center text-2xl tracking-[0.5em] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="------"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <input
              type="password"
              required
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="New password"
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              required
              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="Confirm new password"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "RESET PASSWORD"}
            </button>
          </form>
        )}

        <p className="text-center text-sm font-bold text-slate-400 dark:text-slate-500">
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">BACK TO LOGIN</Link>
        </p>
      </div>
    </div>
  );
}
