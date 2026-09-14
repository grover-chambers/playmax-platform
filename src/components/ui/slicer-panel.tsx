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
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors border ${active ? "bg-teal/10 border-teal/20" : "border-transparent hover:bg-[var(--ws-bg)]"}`}
          >
            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-colors ${active ? "bg-[var(--ws-accent)] border-[var(--ws-accent)] text-white" : "border-[var(--ws-border)] bg-[var(--ws-surface)] text-transparent"}`}>
              <Check size={10} strokeWidth={3.5} />
            </span>
            <span className={`flex-1 min-w-0 text-[12px] truncate ${active ? "text-[var(--ws-text)] font-medium" : "text-[var(--ws-text-muted)]"}`}>{o.label}</span>
            <span className={`text-[9px] font-mono tabular-nums ${active ? "text-teal" : "text-gray-4"}`}>{o.count}</span>
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
            className={`whitespace-nowrap inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-1.5 rounded-full border transition-colors ${active ? "bg-teal/10 text-teal border-teal/20" : "bg-[var(--ws-surface)] text-gray-5 border-[var(--ws-border)] hover:border-[var(--ws-accent)] hover:text-[var(--ws-text)]"}`}
          >
            {o.label}
            <span className={`tabular-nums ${active ? "text-teal" : "text-gray-4"}`}>{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function SlicerPanel({ title = "Slicers", sections, onClearAll, className = "" }: SlicerPanelProps) {
  const totalSelected = sections.reduce((n, s) => n + s.selected.length, 0);
  return (
    <aside className={`bg-[var(--ws-surface)] border border-[var(--ws-border)] rounded-xl overflow-hidden shadow-[var(--ws-shadow)] ${className}`}>
      <div className="px-3 py-2.5 border-b border-[var(--ws-border)] flex items-center gap-2 bg-[var(--ws-bg)]">
        <SlidersHorizontal size={13} className="text-[var(--ws-accent)]" />
        <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--ws-text-muted)]">{title}</span>
        {totalSelected > 0 && (
          <button
            onClick={onClearAll}
            className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-[var(--ws-accent)] hover:text-[var(--ws-accent-hover)]"
          >
            <X size={10} /> reset
          </button>
        )}
      </div>

      <div className="lg:hidden p-3 space-y-2.5">
        {sections.map((s) => (
          <div key={s.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold tracking-wider uppercase text-gray-4">{s.title}</span>
              {s.selected.length > 0 && s.onClear && (
                <button onClick={s.onClear} className="text-[9px] font-mono text-[var(--ws-accent)] hover:text-[var(--ws-accent-hover)]">reset</button>
              )}
            </div>
            <SlicerSectionPills section={s} />
          </div>
        ))}
      </div>

      <div className="hidden lg:block divide-y divide-[var(--ws-border)]">
        {sections.map((s) => (
          <div key={s.id} className="p-2.5">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-[9px] font-bold tracking-wider uppercase text-gray-4">{s.title}</span>
              {s.selected.length > 0 && s.onClear && (
                <button onClick={s.onClear} className="text-[9px] font-mono text-[var(--ws-accent)] hover:text-[var(--ws-accent-hover)]">reset</button>
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