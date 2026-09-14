"use client";

import React from "react";
import { SlidersHorizontal, Check, X } from "lucide-react";

export interface SlicerOption {
  value: string;
  label: string;
  count: number;
}

export interface SlicerSection {
  id: string;
  title: string;
  options: SlicerOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear?: () => void;
}

interface SlicerPanelProps {
  title?: string;
  sections: SlicerSection[];
  onClearAll?: () => void;
  className?: string;
}

function SlicerSectionList({ section }: { section: SlicerSection }) {
  return (
    <div className="space-y-0.5">
      {section.options.map((o) => {
        const active = section.selected.includes(o.value);
        return (
          <button
            key={o.value}
            onClick={() => section.onToggle(o.value)}
            aria-pressed={active}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors border ${active ? "bg-teal-50 border-teal-200" : "border-transparent hover:bg-slate-50"}`}
          >
            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-colors ${active ? "bg-teal-600 border-teal-600 text-white" : "border-slate-300 bg-white text-transparent"}`}>
              <Check size={10} strokeWidth={3.5} />
            </span>
            <span className="flex-1 min-w-0 text-[12px] text-slate-700 truncate">{o.label}</span>
            <span className={`text-[9px] font-mono tabular-nums ${active ? "text-teal-700" : "text-slate-400"}`}>{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function SlicerSectionPills({ section }: { section: SlicerSection }) {
  return (
    <div className="flex gap-1.5 pb-1 -mx-1 px-1 overflow-x-auto">
      {section.options.map((o) => {
        const active = section.selected.includes(o.value);
        return (
          <button
            key={o.value}
            onClick={() => section.onToggle(o.value)}
            aria-pressed={active}
            className={`whitespace-nowrap inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-1.5 rounded-full border transition-colors ${active ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
          >
            {o.label}
            <span className={`tabular-nums ${active ? "text-teal-600" : "text-slate-400"}`}>{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function SlicerPanel({ title = "Slicers", sections, onClearAll, className = "" }: SlicerPanelProps) {
  const totalSelected = sections.reduce((n, s) => n + s.selected.length, 0);
  return (
    <aside className={`bg-white border border-slate-200 rounded-xl overflow-hidden ${className}`}>
      <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center gap-2">
        <SlidersHorizontal size={13} className="text-teal-600" />
        <span className="text-[10px] font-bold tracking-wider uppercase text-slate-600">{title}</span>
        {totalSelected > 0 && (
          <button
            onClick={onClearAll}
            className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-teal-700 hover:text-teal-900"
          >
            <X size={10} /> reset
          </button>
        )}
      </div>

      <div className="lg:hidden p-3 space-y-2.5">
        {sections.map((s) => (
          <div key={s.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400">{s.title}</span>
              {s.selected.length > 0 && s.onClear && (
                <button onClick={s.onClear} className="text-[9px] font-mono text-teal-700 hover:text-teal-900">reset</button>
              )}
            </div>
            <SlicerSectionPills section={s} />
          </div>
        ))}
      </div>

      <div className="hidden lg:block divide-y divide-slate-100">
        {sections.map((s) => (
          <div key={s.id} className="p-2.5">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400">{s.title}</span>
              {s.selected.length > 0 && s.onClear && (
                <button onClick={s.onClear} className="text-[9px] font-mono text-teal-700 hover:text-teal-900">reset</button>
              )}
            </div>
            <SlicerSectionList section={s} />
          </div>
        ))}
      </div>
    </aside>
  );
}

export default SlicerPanel;