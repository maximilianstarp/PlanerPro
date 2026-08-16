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

  // 1. Auth guard: if not logged in, redirect to login
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // 2. Load projects from the backend
  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get('/api/projects');
      setProjects(res.data);
    } catch {
      showToast("Failed to load projects.", "error");
    }
  }, [showToast]);

  useEffect(() => {
    if (user) fetchProjects();
  }, [user, fetchProjects]);

  // 3. Create a new project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      await axios.post('/api/projects', { name: newProjectName });
      setNewProjectName('');
      fetchProjects();
    } catch {
      showToast("Failed to create project.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // 4. Delete a project
  const deleteProject = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Extra safety against triggering the link
    if (confirm("Delete this project and all plans it contains?")) {
      try {
        await axios.delete(`/api/projects/${id}`);
        fetchProjects();
      } catch {
        showToast("Failed to delete.", "error");
      }
    }
  };

  // While the auth status is being checked, show a spinner
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6 md:p-12 transition-colors">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
              <LayoutGrid className="text-blue-600" size={32} /> Planner<span className="text-blue-600">Pro</span>
            </h1>
          </div>
        </header>

        {/* Create Project Card */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 mb-12">
          <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">New semester / project</h2>
          <form onSubmit={handleCreateProject} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="e.g. Summer Semester 2026"
              className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-lg font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <button
              type="submit"
              disabled={isCreating || !newProjectName.trim()}
              className="bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 text-white px-10 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all disabled:opacity-30 active:scale-95 shadow-lg shadow-slate-200 dark:shadow-black/30"
            >
              <Plus size={24} /> {isCreating ? 'Please wait...' : 'Create project'}
            </button>
          </form>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.length === 0 ? (
            <div className="col-span-full py-24 text-center border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] bg-white/50 dark:bg-slate-900/50">
              <FolderPlus size={64} className="mx-auto text-slate-200 dark:text-slate-700 mb-6" />
              <p className="text-slate-400 dark:text-slate-500 text-xl font-bold">No projects yet.</p>
              <p className="text-slate-400 dark:text-slate-500 mt-2">Create your first semester project above!</p>
            </div>
          ) : (
            projects.map((project) => (
              <Link href={`/projects/${project.id}`} key={project.id} className="group outline-none">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 group-hover:border-blue-400 dark:group-hover:border-blue-500 group-hover:shadow-xl group-hover:shadow-blue-900/5 transition-all duration-300 relative h-full flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-[1.2rem] group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                      <Calendar size={28} />
                    </div>
                    <button
                      onClick={(e) => deleteProject(project.id, e)}
                      className="text-slate-200 dark:text-slate-700 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2"
                      title="Delete project"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                    {project.name}
                  </h3>
                  <p className="text-sm font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-8 flex-1">
                    {new Date(project.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>

                  <div className="flex items-center text-slate-900 dark:text-slate-100 font-black text-sm gap-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">
                    OPEN PROJECT <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
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