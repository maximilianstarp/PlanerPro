"use client";
import { useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LogIn, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

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
    <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
      {error && (
        <div className="absolute top-4 right-4 left-4 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={18} />
          <span className="text-xs font-bold">{error}</span>
        </div>
      )}

      {showSuccess && !error && (
        <div className="absolute top-4 right-4 left-4 bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          <span className="text-xs font-bold">Account ready! Log in now.</span>
        </div>
      )}

      <div className="text-center pt-4">
        <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
          <LogIn size={32} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back</h1>
        <p className="mt-2 text-slate-500 font-medium">Log in to PlannerPro</p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-3">
          <input
            type="text"
            required
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
            placeholder="Username"
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            required
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : "LOG IN"}
        </button>
      </form>

      <p className="text-center text-sm font-bold text-slate-400">
        No account yet? <Link href="/register" className="text-blue-600 hover:text-blue-700 ml-1">REGISTER NOW</Link>
      </p>
    </div>
  );
}

// The export wraps everything in Suspense
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans">
      <Suspense fallback={<Loader2 className="animate-spin text-blue-600" size={40} />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}