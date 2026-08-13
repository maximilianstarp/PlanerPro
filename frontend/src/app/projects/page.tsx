"use client";
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import axios from '@/lib/axios';
import { Plus, FolderPlus, Calendar, ArrowRight, Trash2, LayoutGrid, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProjectSummary } from '@/types';

export default function ProjectsPage() {
  const { user, isLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 1. Auth-Guard: Wenn nicht eingeloggt, zurück zum Login
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // 2. Projekte vom Backend laden
  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get('/api/projects');
      setProjects(res.data);
    } catch {
      showToast("Fehler beim Laden der Projekte.", "error");
    }
  }, [showToast]);

  useEffect(() => {
    if (user) fetchProjects();
  }, [user, fetchProjects]);

  // 3. Neues Projekt erstellen
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      await axios.post('/api/projects', { name: newProjectName });
      setNewProjectName('');
      fetchProjects();
    } catch {
      showToast("Fehler beim Erstellen des Projekts.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // 4. Projekt löschen
  const deleteProject = async (id: number, e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); // Doppelte Sicherheit gegen Link-Auslösung
    if (confirm("Dieses Projekt und alle enthaltenen Pläne löschen?")) {
      try {
        await axios.delete(`/api/projects/${id}`);
        fetchProjects();
      } catch {
        showToast("Fehler beim Löschen.", "error");
      }
    }
  };

  // Während der Auth-Status geprüft wird, zeigen wir einen Spinner
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
              <LayoutGrid className="text-blue-600" size={32} /> Planner<span className="text-blue-600">Pro</span>
            </h1>
          </div>
        </header>

        {/* Create Project Card */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 mb-12">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Neues Semester / Projekt</h2>
          <form onSubmit={handleCreateProject} className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              placeholder="z.B. Sommersemester 2026"
              className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-lg font-medium"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <button 
              type="submit"
              disabled={isCreating || !newProjectName.trim()}
              className="bg-slate-900 hover:bg-blue-600 text-white px-10 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-30 active:scale-95 shadow-lg shadow-slate-200"
            >
              <Plus size={24} /> {isCreating ? 'Warten...' : 'Projekt erstellen'}
            </button>
          </form>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.length === 0 ? (
            <div className="col-span-full py-24 text-center border-4 border-dashed border-slate-200 rounded-[3rem] bg-white/50">
              <FolderPlus size={64} className="mx-auto text-slate-200 mb-6" />
              <p className="text-slate-400 text-xl font-bold">Noch keine Projekte vorhanden.</p>
              <p className="text-slate-400 mt-2">Lege oben dein erstes Semester-Projekt an!</p>
            </div>
          ) : (
            projects.map((project) => (
              <Link href={`/projects/${project.id}`} key={project.id} className="group outline-none">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 group-hover:border-blue-400 group-hover:shadow-xl group-hover:shadow-blue-900/5 transition-all duration-300 relative h-full flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.2rem] group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                      <Calendar size={28} />
                    </div>
                    <button 
                      onClick={(e) => deleteProject(project.id, e)}
                      className="text-slate-200 hover:text-red-500 transition-colors p-2"
                      title="Projekt löschen"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-2 group-hover:text-blue-600 transition-colors leading-tight">
                    {project.name}
                  </h3>
                  <p className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-8 flex-1">
                    {new Date(project.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>

                  <div className="flex items-center text-slate-900 font-black text-sm gap-2 group-hover:text-blue-600 transition-all">
                    PROJEKT ÖFFNEN <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}