"use client";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Trash2, User as UserIcon } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const handleDeleteAccount = async () => {
    if (confirm("Bist du sicher? Alle deine Projekte und Stundenpläne werden unwiderruflich gelöscht.")) {
      try {
        await axios.delete(`/api/delete-account`);
        window.location.href = "/";
      } catch {
        showToast("Fehler beim Löschen.", "error");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-2xl mx-auto">
        
        {/* back Button */}
        <button 
          onClick={() => router.push('/projects')} 
          className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800 transition mb-8 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          Zurück zur Übersicht
        </button>

        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-10">Einstellungen</h1>
        
        <div className="space-y-6">
          {/* Account Sektion */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
                <UserIcon size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Profil</h2>
            </div>
            
            <div className="flex flex-col gap-1 mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eingeloggt als</span>
              <p className="text-lg font-bold text-slate-700">{user?.username || 'Lädt...'}</p>
            </div>
            
            <button 
              onClick={logout}
              className="flex items-center gap-2 bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition"
            >
              <LogOut size={18} /> Abmelden
            </button>
          </div>

          {/* Gefahrenzone */}
          <div className="bg-red-50/50 p-8 rounded-[2rem] border border-red-100 mt-12">
            <h2 className="text-xl font-bold text-red-700 mb-2">Gefahrenbereich</h2>
            <p className="text-red-600/70 text-sm mb-6">
              Sobald du deinen Account löschst, werden alle deine Daten (Projekte, Module und gespeicherte Pläne) unwiderruflich entfernt.
            </p>
            <button 
              onClick={handleDeleteAccount}
              className="flex items-center gap-2 bg-white text-red-600 border border-red-200 px-6 py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white transition shadow-sm"
            >
              <Trash2 size={18} /> Account dauerhaft löschen
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}