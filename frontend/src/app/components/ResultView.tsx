"use client";
import React from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, Clock, AlertTriangle, Star } from 'lucide-react';

interface ResultsViewProps {
  plans: any[]; // Hier kommen jetzt Objekte rein: { score: 100, slots: [] }
  currentIdx: number;
  setIdx: (idx: number) => void;
  onBack: () => void;
}

const getMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export default function ResultsView({ plans, currentIdx, setIdx, onBack }: ResultsViewProps) {
  if (!plans || plans.length === 0) return (
    <div className="p-10 text-center font-bold">Keine Pläne gefunden.</div>
  );

  // WICHTIG: Hier entpacken wir das Objekt vom Backend
  const currentPlanData = plans[currentIdx];
  const currentPlan = currentPlanData.slots || []; 
  const currentScore = currentPlanData.score;

  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);

  const renderDaySlots = (day: string) => {
    // Sicherstellen, dass wir auf dem Array filtern
    const daySlots = currentPlan
      .filter((s: any) => s.day === day)
      .sort((a: any, b: any) => getMinutes(a.start) - getMinutes(b.start));

    if (daySlots.length === 0) return null;

    const groups: any[][] = [];
    let currentGroup: any[] = [];

    daySlots.forEach((slot: any) => {
      if (currentGroup.length === 0) {
        currentGroup.push(slot);
      } else {
        const overlaps = currentGroup.some(gSlot => {
          const s1Start = getMinutes(slot.start);
          const s1End = getMinutes(slot.end);
          const s2Start = getMinutes(gSlot.start);
          const s2End = getMinutes(gSlot.end);
          return s1Start < s2End && s2Start < s1End;
        });
        if (overlaps) currentGroup.push(slot);
        else {
          groups.push(currentGroup);
          currentGroup = [slot];
        }
      }
    });
    if (currentGroup.length > 0) groups.push(currentGroup);

    return groups.map((group, gIdx) => {
      const groupSize = group.length;
      const widthPercent = 100 / groupSize;

      return group.map((slot, sIdx) => {
        const start = getMinutes(slot.start);
        const end = getMinutes(slot.end);
        const top = (start - 8 * 60) * (850 / (14 * 60));
        const height = (end - start) * (850 / (14 * 60));
        const left = sIdx * widthPercent;
        
        const color = slot.color || { bg: 'bg-blue-100', border: 'border-blue-600', text: 'text-blue-900' };

        return (
          <div 
            key={`${gIdx}-${sIdx}`}
            className={`absolute rounded-xl p-2 text-[10px] font-bold shadow-md border-l-4 transition-all z-10 hover:z-50 overflow-hidden ${color.bg} ${color.border} ${color.text}`}
            style={{ 
              top: `${top}px`, 
              height: `${height}px`, 
              left: `${left}%`, 
              width: `${widthPercent - 0.5}%` 
            }}
          >
            <div className="flex justify-between items-center opacity-70 mb-1">
               <span>{slot.start}</span>
               {groupSize > 1 && <AlertTriangle size={10} className="text-amber-600" />}
            </div>
            <div className="leading-tight uppercase">{slot.name}</div>
          </div>
        );
      });
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-600 font-bold hover:text-black transition">
            <ArrowLeft size={20} /> Editor
          </button>
          
          <div className="flex items-center gap-6 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
            <button disabled={currentIdx === 0} onClick={() => setIdx(currentIdx - 1)} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-10"><ChevronLeft /></button>
            <div className="text-center min-w-[120px]">
              <span className="block font-black text-slate-800 text-lg">Option {currentIdx + 1}</span>
              <div className="flex items-center justify-center gap-1 text-blue-600 font-bold text-[10px] uppercase">
                <Star size={10} fill="currentColor" /> Score: {currentScore}
              </div>
            </div>
            <button disabled={currentIdx === plans.length - 1} onClick={() => setIdx(currentIdx + 1)} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-10"><ChevronRight /></button>
          </div>
        </header>

        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-6 border-b bg-slate-50/50">
            <div className="p-4 text-slate-400 font-bold text-[10px] uppercase text-center border-r">Zeit</div>
            {days.map(day => <div key={day} className="p-4 text-center font-black text-slate-700 border-r last:border-0">{day}</div>)}
          </div>
          <div className="relative grid grid-cols-6" style={{ height: '850px' }}>
            <div className="border-r bg-slate-50/20">
              {hours.map(h => (
                <div key={h} className="h-[60.71px] border-b border-slate-100 px-2 py-1 text-[10px] font-bold text-slate-400 text-right pr-3">{h}:00</div>
              ))}
            </div>
            {days.map(day => (
              <div key={day} className="relative border-r last:border-0 h-full bg-[linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[length:100%_30.35px]">
                {renderDaySlots(day)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}