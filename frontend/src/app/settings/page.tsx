"use client";
import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  LogOut,
  Trash2,
  User as UserIcon,
  Mail,
  KeyRound,
  BadgeCheck,
  BadgeAlert,
  Loader2,
} from 'lucide-react';

function errorMessage(err: unknown, fallback: string) {
  return (isAxiosError(err) ? err.response?.data?.error : undefined) || fallback;
}

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // --- username ---
  const [username, setUsername] = useState(user?.username || '');
  const [usernameSaving, setUsernameSaving] = useState(false);

  // --- password ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // --- email ---
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSaving, setEmailCodeSaving] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure? All your projects and timetables will be permanently deleted.")) {
      try {
        await axios.delete(`/api/delete-account`);
        window.location.href = "/";
      } catch {
        showToast("Failed to delete account.", "error");
      }
    }
  };

  const handleUsernameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameSaving(true);
    try {
      await axios.post('/api/settings/username', { username });
      await refreshUser();
      showToast('Username updated.', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Failed to update username.'), 'error');
    } finally {
      setUsernameSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    setPasswordSaving(true);
    try {
      await axios.post('/api/settings/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated.', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Failed to update password.'), 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleEmailRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSaving(true);
    try {
      await axios.post('/api/settings/email', {
        new_email: newEmail,
        current_password: emailPassword,
      });
      await refreshUser();
      setEmailPassword('');
      showToast('Verification code sent to your new email.', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Failed to update email.'), 'error');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleEmailVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailCodeSaving(true);
    try {
      await axios.post('/api/settings/email/verify', { code: emailCode });
      await refreshUser();
      setEmailCode('');
      setNewEmail('');
      showToast('Email updated.', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Invalid or expired code.'), 'error');
    } finally {
      setEmailCodeSaving(false);
    }
  };

  const handleEmailCancel = async () => {
    try {
      await axios.post('/api/settings/email/cancel');
      await refreshUser();
      setEmailCode('');
      showToast('Pending email change cancelled.', 'success');
    } catch {
      showToast('Failed to cancel.', 'error');
    }
  };

  const inputClass =
    "w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-800 rounded-xl focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm";
  const saveButtonClass =
    "flex items-center gap-2 bg-slate-900 dark:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 dark:hover:bg-blue-500 transition disabled:opacity-50 text-sm";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-10 transition-colors">
      <div className="max-w-2xl mx-auto">

        {/* back Button */}
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200 transition mb-8 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to overview
        </button>

        <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-10">Settings</h1>

        <div className="space-y-6">
          {/* Profile / username section */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-100 dark:bg-blue-950/50 p-3 rounded-2xl text-blue-600 dark:text-blue-400">
                <UserIcon size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Profile</h2>
            </div>

            <form onSubmit={handleUsernameSave} className="flex flex-col gap-2 mb-6">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Username</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  required
                  className={inputClass}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <button type="submit" disabled={usernameSaving || username === user?.username} className={saveButtonClass}>
                  {usernameSaving ? <Loader2 className="animate-spin" size={16} /> : 'Save'}
                </button>
              </div>
            </form>

            <button
              onClick={logout}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <LogOut size={18} /> Log out
            </button>
          </div>

          {/* Email section */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-100 dark:bg-blue-950/50 p-3 rounded-2xl text-blue-600 dark:text-blue-400">
                <Mail size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Email</h2>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <span className="text-slate-700 dark:text-slate-300 font-bold">{user?.email}</span>
              {user?.email_verified ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <BadgeCheck size={16} /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold">
                  <BadgeAlert size={16} /> Unverified
                </span>
              )}
            </div>

            {user?.pending_email ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  A verification code was sent to <span className="font-bold text-slate-700 dark:text-slate-300">{user.pending_email}</span>.
                  Your current email stays active until you confirm it.
                </p>
                <form onSubmit={handleEmailVerify} className="flex gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    className={inputClass}
                    placeholder="6-digit code"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                  />
                  <button type="submit" disabled={emailCodeSaving} className={saveButtonClass}>
                    {emailCodeSaving ? <Loader2 className="animate-spin" size={16} /> : 'Confirm'}
                  </button>
                </form>
                <button
                  onClick={handleEmailCancel}
                  className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
                >
                  Cancel pending change
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailRequest} className="space-y-3">
                <input
                  type="email"
                  required
                  className={inputClass}
                  placeholder="New email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <input
                  type="password"
                  required
                  className={inputClass}
                  placeholder="Current password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                />
                <button type="submit" disabled={emailSaving} className={saveButtonClass}>
                  {emailSaving ? <Loader2 className="animate-spin" size={16} /> : 'Change email'}
                </button>
              </form>
            )}
          </div>

          {/* Password section */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-100 dark:bg-blue-950/50 p-3 rounded-2xl text-blue-600 dark:text-blue-400">
                <KeyRound size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Password</h2>
            </div>

            <form onSubmit={handlePasswordSave} className="space-y-3">
              <input
                type="password"
                required
                className={inputClass}
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <input
                type="password"
                required
                className={inputClass}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                type="password"
                required
                className={inputClass}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button type="submit" disabled={passwordSaving} className={saveButtonClass}>
                {passwordSaving ? <Loader2 className="animate-spin" size={16} /> : 'Update password'}
              </button>
            </form>
          </div>

          {/* Danger zone */}
          <div className="bg-red-50/50 dark:bg-red-950/20 p-8 rounded-[2rem] border border-red-100 dark:border-red-900/50 mt-12">
            <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Danger zone</h2>
            <p className="text-red-600/70 dark:text-red-400/70 text-sm mb-6">
              Once you delete your account, all your data (projects, modules, and saved plans) will be permanently removed.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-2 bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-6 py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition shadow-sm"
            >
              <Trash2 size={18} /> Permanently delete account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
