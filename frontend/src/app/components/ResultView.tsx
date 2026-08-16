"use client";
import React from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft, AlertTriangle, Star } from 'lucide-react';
import type { Plan, Weekday } from '@/types';
import { getMinutesFromTimeString, slotsForDay } from '@/lib/schedule';

interface ResultsViewProps {
  plans: Plan[];
  currentIdx: number;
  setIdx: (idx: number) => void;
  onBack: () => void;
}

const DAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
const DEFAULT_COLOR = { bg: 'bg-blue-100', border: 'border-blue-600', text: 'text-blue-900' };

export default function ResultsView({ plans, currentIdx, setIdx, onBack }: ResultsViewProps) {
  if (!plans || plans.length === 0) return (
    <div className="p-10 text-center font-bold bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">No plans found.</div>
  );

  const currentPlan = plans[currentIdx];
  const currentSlots = currentPlan.slots || [];
  const currentScore = currentPlan.score;

  const renderDaySlots = (day: Weekday) => {
    const groups = slotsForDay(currentSlots, day);

    return groups.map((group, gIdx) => {
      const groupSize = group.length;
      const widthPercent = 100 / groupSize;

      return group.map((slot, sIdx) => {
        const start = getMinutesFromTimeString(slot.start);
        const end = getMinutesFromTimeString(slot.end);
        const top = (start - 8 * 60) * (850 / (14 * 60));
        const height = (end - start) * (850 / (14 * 60));
        const left = sIdx * widthPercent;

        const color = slot.color || DEFAULT_COLOR;

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold hover:text-black dark:hover:text-white transition">
            <ArrowLeft size={20} /> Editor
          </button>

          <div className="flex items-center gap-6 bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <button disabled={currentIdx === 0} onClick={() => setIdx(currentIdx - 1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-10 text-slate-700 dark:text-slate-300"><ChevronLeft /></button>
            <div className="text-center min-w-[120px]">
              <span className="block font-black text-slate-800 dark:text-slate-100 text-lg">Option {currentIdx + 1}</span>
              <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase">
                <Star size={10} fill="currentColor" /> Score: {currentScore}
              </div>
            </div>
            <button disabled={currentIdx === plans.length - 1} onClick={() => setIdx(currentIdx + 1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-10 text-slate-700 dark:text-slate-300"><ChevronRight /></button>
          </div>
        </header>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-6 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="p-4 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase text-center border-r dark:border-slate-800">Time</div>
            {DAYS.map(day => <div key={day} className="p-4 text-center font-black text-slate-700 dark:text-slate-200 border-r dark:border-slate-800 last:border-0">{day}</div>)}
          </div>
          <div className="relative grid grid-cols-6" style={{ height: '850px' }}>
            <div className="border-r dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20">
              {HOURS.map(h => (
                <div key={h} className="h-[60.71px] border-b border-slate-100 dark:border-slate-800 px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 text-right pr-3">{h}:00</div>
              ))}
            </div>
            {DAYS.map(day => (
              <div key={day} className="relative border-r dark:border-slate-800 last:border-0 h-full bg-[linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] dark:bg-[linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[length:100%_30.35px]">
                {renderDaySlots(day)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
