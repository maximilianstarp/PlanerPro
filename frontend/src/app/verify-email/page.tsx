"use client";
import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { MailCheck, AlertCircle, Loader2 } from 'lucide-react';

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmailPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const { user, isLoading, refreshUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
    if (!isLoading && user?.email_verified) router.push('/projects');
  }, [isLoading, user, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/verify-email', { code });
      await refreshUser();
      showToast('Email verified!', 'success');
      router.push('/projects');
    } catch (err) {
      const message = isAxiosError(err) ? err.response?.data?.error : undefined;
      setError(message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await axios.post('/api/resend-verification-email');
      showToast('New code sent.', 'success');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      showToast('Failed to resend code.', 'error');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-black/30 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        {error && (
          <div className="absolute top-4 right-4 left-4 bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} />
            <span className="text-xs font-bold">{error}</span>
          </div>
        )}

        <div className="text-center pt-4">
          <div className="bg-blue-50 dark:bg-blue-950/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400">
            <MailCheck size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Verify your email</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 font-medium">
            Enter the code we sent to {user?.email || 'your email'}
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
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
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "VERIFY"}
          </button>
        </form>

        <p className="text-center text-sm font-bold text-slate-400 dark:text-slate-500">
          Didn&apos;t get a code?{' '}
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:hover:text-blue-600"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </p>
      </div>
    </div>
  );
}
