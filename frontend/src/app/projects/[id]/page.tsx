"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, BookOpen, Send, Calendar, Check, Save, ArrowLeft, Clock, Loader2 } from 'lucide-react';
import axios from '@/lib/axios';
import ResultsView from '@/app/components/ResultView';
import { useAuth } from '@/context/AuthContext';

const PRESET_COLORS = [
  { name: 'Blau', bg: 'bg-blue-100', border: 'border-blue-600', text: 'text-blue-900' },
  { name: 'Smaragd', bg: 'bg-emerald-100', border: 'border-emerald-600', text: 'text-emerald-900' },
  { name: 'Violett', bg: 'bg-violet-100', border: 'border-violet-600', text: 'text-violet-900' },
  { name: 'Bernstein', bg: 'bg-amber-100', border: 'border-amber-600', text: 'text-amber-900' },
  { name: 'Rose', bg: 'bg-rose-100', border: 'border-rose-600', text: 'text-rose-900' },
  { name: 'Indigo', bg: 'bg-indigo-100', border: 'border-indigo-600', text: 'text-indigo-900' },
  { name: 'Cyan', bg: 'bg-cyan-100', border: 'border-cyan-600', text: 'text-cyan-900' },
  { name: 'Orange', bg: 'bg-orange-100', border: 'border-orange-600', text: 'text-orange-900' },
  { name: 'Lime', bg: 'bg-lime-100', border: 'border-lime-600', text: 'text-lime-900' },
  { name: 'Schiefer', bg: 'bg-slate-200', border: 'border-slate-700', text: 'text-slate-900' },
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [projectName, setProjectName] = useState('Lädt...');
  const [modules, setModules] = useState<any[]>([]);
  const [view, setView] = useState('edit');
  const [results, setResults] = useState([]);
  const [currentPlanIdx, setCurrentPlanIdx] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const { user, isLoading } = useAuth(); 
  const [projects, setProjects] = useState<any[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 1. Auth-Guard: Wenn nicht eingeloggt, zurück zum Login
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // 2. Projekte vom Backend laden
  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects');
      setProjects(res.data);
    } catch (err) {
      console.error("Fehler beim Laden der Projekte", err);
    }
  };

  // 1. Daten laden
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await axios.get(`/api/projects/${id}`);
        setProjectName(res.data.name);
        
        const cached = localStorage.getItem(`project-cache-${id}`);
        if (cached) {
          setModules(JSON.parse(cached));
        } else {
          setModules(res.data.input_modules || []);
        }
      } catch (err) {
        router.push('/projects');
      }
    };
    if (id) fetchProject();
  }, [id, router]);

  // 2. LocalStorage Auto-Save
  useEffect(() => {
    if (modules.length > 0 && id) {
      localStorage.setItem(`project-cache-${id}`, JSON.stringify(modules));
    }
  }, [modules, id]);

  const addModule = () => {
    setModules([...modules, { 
      id: crypto.randomUUID(), 
      name: '', 
      color: PRESET_COLORS[0], 
      lectures: [], 
      labs: [], 
      tutorials: [] 
    }]);
  };

  // Kombinierte Speicher- und Optimierungslogik
  const handleSaveAndOptimize = async () => {
    setIsOptimizing(true);
    try {
      // Zuerst im Hintergrund in der Cloud sichern
      await axios.put(`/api/projects/${id}`, { input_modules: modules });
      
      // Dann optimieren
      const res = await axios.post('/api/optimize', { modules });
      if (res.data.status === 'success') {
        setResults(res.data.best_plans);
        setCurrentPlanIdx(0);
        setView('results');
      } else {
        alert("Keine Lösung ohne Konflikte gefunden.");
      }
    } catch (e) {
      alert("Fehler bei der Verarbeitung.");
    } finally {
      setIsOptimizing(false);
    }
  };

  if (view === 'results') {
    return <ResultsView plans={results} currentIdx={currentPlanIdx} setIdx={setCurrentPlanIdx} onBack={() => setView('edit')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 pb-20">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Navigation Bar */}
        <div className="flex justify-between items-center mb-10">
          <button onClick={() => router.push('/projects')} className="flex items-center gap-2 text-slate-400 font-bold hover:text-slate-800 transition group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Alle Projekte
          </button>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleSaveAndOptimize} 
              disabled={isOptimizing || modules.length === 0}
              className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black transition-all shadow-lg active:scale-95 ${
                isOptimizing 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-slate-900 text-white hover:bg-blue-600 shadow-blue-100'
              }`}
            >
              {isOptimizing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
              {isOptimizing ? 'BERECHNE...' : 'PLAN GENERIEREN'}
            </button>
          </div>
        </div>

        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter">{projectName}</h1>
          </div>
          <button onClick={addModule} className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:border-blue-500 hover:text-blue-500 transition-all shadow-sm">
            <Plus size={24} /> Modul hinzufügen
          </button>
        </header>

        <div className="space-y-8">
          {modules.map((mod) => (
            <div key={mod.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden transition-all">
              <div className="bg-slate-800 p-6 flex justify-between items-center">
                <input 
                  className="bg-transparent text-white text-2xl font-bold outline-none border-b-2 border-transparent focus:border-blue-400 w-full transition-colors"
                  placeholder="Name des Moduls..."
                  value={mod.name}
                  onChange={(e) => setModules(modules.map(m => m.id === mod.id ? {...m, name: e.target.value} : m))}
                />
                <button onClick={() => setModules(modules.filter(m => m.id !== mod.id))} className="text-slate-500 hover:text-red-400 ml-4 p-2 transition">
                  <Trash2 size={24} />
                </button>
              </div>
              
              <div className="p-8">
                <div className="flex gap-3 mb-10 items-center">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mr-2">Akzentfarbe:</span>
                  {PRESET_COLORS.map(c => (
                    <button 
                      key={c.name} 
                      onClick={() => setModules(modules.map(m => m.id === mod.id ? {...m, color: c} : m))} 
                      className={`w-9 h-9 rounded-full ${c.bg} ${c.border} border-2 transition-all ${mod.color?.name === c.name ? 'ring-4 ring-blue-100 scale-110' : 'opacity-30 hover:opacity-100'}`} 
                    />
                  ))}
                </div>

                <div className="grid md:grid-cols-3 gap-12">
                  <TimeSlotList 
                    title="Vorlesungen" 
                    icon={<BookOpen size={20} className="text-blue-500"/>} 
                    slots={mod.lectures || []} 
                    onChange={(newSlots: any[]) => setModules(modules.map(m => m.id === mod.id ? {...m, lectures: newSlots} : m))} 
                  />

                  <TimeSlotList 
                    title="Labs / Übungen" 
                    icon={<Calendar size={20} className="text-indigo-500"/>} 
                    slots={mod.labs || []} 
                    onChange={(newSlots: any[]) => setModules(modules.map(m => m.id === mod.id ? {...m, labs: newSlots} : m))} 
                  />

                  <div className="space-y-5">
                    <h3 className="font-bold flex items-center gap-2 text-slate-800 border-b pb-3 uppercase text-xs tracking-widest">
                      <Clock size={18} className="text-emerald-500"/> Tutorien-Gruppen
                    </h3>
                    {(mod.tutorials || []).map((group: any[], gIdx: number) => (
                       <div key={gIdx} className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-200 relative group/tut">
                         <button 
                            className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover/tut:opacity-100 transition" 
                            onClick={() => {
                              const newTuts = [...mod.tutorials]; 
                              newTuts.splice(gIdx, 1);
                              setModules(modules.map(m => m.id === mod.id ? {...m, tutorials: newTuts} : m));
                            }}
                          >
                            <Trash2 size={16}/>
                          </button>
                         <TimeSlotList 
                            title={`Gruppe ${gIdx+1}`} 
                            slots={group} 
                            onChange={(newGroupSlots: any[]) => {
                              const newTuts = [...mod.tutorials]; 
                              newTuts[gIdx] = newGroupSlots;
                              setModules(modules.map(m => m.id === mod.id ? {...m, tutorials: newTuts} : m));
                            }} 
                          />
                       </div>
                    ))}
                    <button 
                      onClick={() => setModules(modules.map(m => m.id === mod.id ? {...m, tutorials: [...(m.tutorials || []), []]} : m))} 
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:border-blue-200 hover:bg-blue-50/30 hover:text-blue-500 transition-all"
                    >
                      + Optionale Gruppe hinzufügen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {modules.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
               <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Plus className="text-slate-400" size={32} />
               </div>
               <p className="text-slate-400 font-bold">Noch keine Module hinzugefügt.</p>
               <button onClick={addModule} className="mt-4 text-blue-600 font-black hover:underline">Erstes Modul erstellen</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimeSlotList({ title, slots = [], onChange, icon }: any) {
  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return (
    <div className="space-y-3">
      {title && <h3 className="font-bold flex items-center gap-2 text-slate-700 uppercase text-[10px] tracking-widest border-b pb-2">{icon} {title}</h3>}
      {slots.map((s: any, i: number) => (
        <div key={i} className="flex gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm items-center transition-all hover:border-blue-100">
          <select 
            value={s.day} 
            onChange={(e) => { const n = [...slots]; n[i].day = e.target.value; onChange(n); }} 
            className="text-xs font-black bg-transparent outline-none border-r border-slate-100 pr-1 cursor-pointer text-slate-700"
          >
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="flex flex-1 items-center gap-1">
            <input type="time" value={s.start} onChange={(e) => { const n = [...slots]; n[i].start = e.target.value; onChange(n); }} className="text-[10px] w-full bg-transparent outline-none font-bold text-slate-600" />
            <span className="text-slate-300 font-bold">-</span>
            <input type="time" value={s.end} onChange={(e) => { const n = [...slots]; n[i].end = e.target.value; onChange(n); }} className="text-[10px] w-full bg-transparent outline-none font-bold text-slate-600" />
          </div>
          <button onClick={() => onChange(slots.filter((_:any, j:any) => i !== j))} className="text-slate-200 hover:text-red-500 transition-colors">
            <Trash2 size={14}/>
          </button>
        </div>
      ))}
      <button 
        onClick={() => onChange([...slots, { day: 'Mo', start: '08:00', end: '10:00' }])} 
        className="text-[10px] font-black text-blue-600 uppercase hover:text-blue-800 p-1 flex items-center gap-1"
      >
        <Plus size={12}/> Termin hinzufügen
      </button>
    </div>
  );
}