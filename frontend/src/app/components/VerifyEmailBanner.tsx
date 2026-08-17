"use client";
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MailWarning } from 'lucide-react';

export default function VerifyEmailBanner() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user || user.email_verified || pathname === '/verify-email') return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-8 py-2.5 flex items-center justify-center gap-2 text-amber-800 dark:text-amber-400 text-sm font-semibold transition-colors">
      <MailWarning size={16} className="shrink-0" />
      <span>Please verify your email address.</span>
      <Link href="/verify-email" className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-300">
        Verify now
      </Link>
    </div>
  );
}
