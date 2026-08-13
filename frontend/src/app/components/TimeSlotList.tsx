"use client";
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TimeSlot, Weekday } from '@/types';

const DAYS: Weekday[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

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
        <h3 className="font-bold flex items-center gap-2 text-slate-700 uppercase text-[10px] tracking-widest border-b pb-2">
          {icon} {title}
        </h3>
      )}
      {slots.map((s, i) => (
        <div key={i} className="flex gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm items-center transition-all hover:border-blue-100">
          <select
            value={s.day}
            onChange={(e) => {
              const n = [...slots];
              n[i] = { ...n[i], day: e.target.value as Weekday };
              onChange(n);
            }}
            className="text-xs font-black bg-transparent outline-none border-r border-slate-100 pr-1 cursor-pointer text-slate-700"
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
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
              className="text-[10px] w-full bg-transparent outline-none font-bold text-slate-600"
            />
            <span className="text-slate-300 font-bold">-</span>
            <input
              type="time"
              value={s.end}
              onChange={(e) => {
                const n = [...slots];
                n[i] = { ...n[i], end: e.target.value };
                onChange(n);
              }}
              className="text-[10px] w-full bg-transparent outline-none font-bold text-slate-600"
            />
          </div>
          <button onClick={() => onChange(slots.filter((_, j) => i !== j))} className="text-slate-200 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...slots, { day: 'Mo', start: '08:00', end: '10:00' }])}
        className="text-[10px] font-black text-blue-600 uppercase hover:text-blue-800 p-1 flex items-center gap-1"
      >
        <Plus size={12} /> Termin hinzufügen
      </button>
    </div>
  );
}
