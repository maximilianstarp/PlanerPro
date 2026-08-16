"use client";
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TimeSlot, Weekday } from '@/types';

const DAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface TimeSlotListProps {
  title?: string;
  icon?: React.ReactNode;
  slots: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
}

export default function TimeSlotList({ title, icon, slots = [], onChange }: TimeSlotListProps) {
  return (
    <div className="space-y-3">
      {title && (
        <h3 className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-widest border-b dark:border-slate-800 pb-2">
          {icon} {title}
        </h3>
      )}
      {slots.map((s, i) => (
        <div key={i} className="flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm items-center transition-all hover:border-blue-100 dark:hover:border-blue-900">
          <select
            value={s.day}
            onChange={(e) => {
              const n = [...slots];
              n[i] = { ...n[i], day: e.target.value as Weekday };
              onChange(n);
            }}
            className="text-xs font-black bg-transparent outline-none border-r border-slate-100 dark:border-slate-800 pr-1 cursor-pointer text-slate-700 dark:text-slate-300"
          >
            {DAYS.map((d) => (
              <option key={d} value={d} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">{d}</option>
            ))}
          </select>
          <div className="flex flex-1 items-center gap-1">
            <input
              type="time"
              value={s.start}
              onChange={(e) => {
                const n = [...slots];
                n[i] = { ...n[i], start: e.target.value };
                onChange(n);
              }}
              className="text-[10px] w-full bg-transparent outline-none font-bold text-slate-600 dark:text-slate-300"
            />
            <span className="text-slate-300 dark:text-slate-600 font-bold">-</span>
            <input
              type="time"
              value={s.end}
              onChange={(e) => {
                const n = [...slots];
                n[i] = { ...n[i], end: e.target.value };
                onChange(n);
              }}
              className="text-[10px] w-full bg-transparent outline-none font-bold text-slate-600 dark:text-slate-300"
            />
          </div>
          <button onClick={() => onChange(slots.filter((_, j) => i !== j))} className="text-slate-200 dark:text-slate-700 hover:text-red-500 dark:hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...slots, { day: 'Mon', start: '08:00', end: '10:00' }])}
        className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase hover:text-blue-800 dark:hover:text-blue-300 p-1 flex items-center gap-1"
      >
        <Plus size={12} /> Add time slot
      </button>
    </div>
  );
}
