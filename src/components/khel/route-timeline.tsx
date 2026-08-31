"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useRef, useEffect } from "react";

type Rep = { id: string; name: string; color?: string | null };
type Visit = { id: string; rep_id: string; check_in_at?: string | null; created_at?: string | null; outcome?: string | null; status?: string | null; gps_lat?: number | null; gps_lng?: number | null; order_placed?: boolean };

const START_MIN = 7 * 60; // 07:00
const END_MIN = 18 * 60; // 18:00
const PX_PER_MIN = 2.2; // ~1450px lane for 11h

function toMin(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export default function RouteTimeline({
  reps,
  visits,
  selectedId,
  onSelect,
}: {
  reps: Rep[];
  visits: Visit[];
  selectedId: string | null;
  onSelect: (v: Visit) => void;
}) {
  const byRep = useMemo(() => {
    const m = new Map<string, Visit[]>();
    for (const v of visits) {
      const a = m.get(v.rep_id) || [];
      a.push(v);
      m.set(v.rep_id, a);
    }
    return m;
  }, [visits]);

  const laneWidth = (END_MIN - START_MIN) * PX_PER_MIN;
  const ticks: { min: number; label: string; major: boolean }[] = [];
  for (let h = 7; h <= 18; h++) {
    ticks.push({ min: h * 60, label: `${h}:00`, major: true });
    if (h < 18) ticks.push({ min: h * 60 + 30, label: "", major: false });
  }
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const showNow = nowMin >= START_MIN && nowMin <= END_MIN;

  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showNow || !viewportRef.current) return;
    const el = viewportRef.current.querySelector(".stop-strip") as HTMLElement | null;
    if (el) el.scrollLeft = Math.max(0, (nowMin - START_MIN) * PX_PER_MIN - el.clientWidth / 2);
  }, [showNow, nowMin]);

  return (
    <div className="pm-dash-card">
      <div className="pm-dash-card-h">
        <span className="pm-dash-card-t">Route timeline</span>
        <span className="text-[11px] font-mono text-gray-5">07:00 — 18:00 · {visits.length} visits</span>
      </div>
      <div className="pm-dash-card-b p-0">
        {/* ruler */}
        <div className="grid gap-2 px-3 pt-3" style={{ gridTemplateColumns: "220px 1fr" }}>
          <div className="text-[10px] tracking-widest uppercase text-gray-5 font-mono flex items-center">Rep</div>
          <div className="overflow-x-auto scrollbar-none" ref={viewportRef as unknown as React.RefObject<HTMLDivElement>}>
            <div className="relative h-[18px]" style={{ width: laneWidth }}>
              {ticks.map((t) => (
                <div key={t.min} className={`absolute top-0 bottom-0 border-l ${t.major ? "border-[var(--ws-border)]" : "border-[var(--ws-border)]/60"}`} style={{ left: (t.min - START_MIN) * PX_PER_MIN }}>
                  {t.label && <span className="absolute -top-0.5 left-[4px] text-[10px] font-mono text-gray-5">{t.label}</span>}
                </div>
              ))}
              {showNow && <div className="absolute top-0 bottom-0 w-[2px] bg-red rounded-full" style={{ left: (nowMin - START_MIN) * PX_PER_MIN }} />}
            </div>
          </div>
        </div>

        <div className="mt-2 px-3 pb-3 space-y-2 max-h-[42vh] min-h-[180px] overflow-y-auto">
          {reps.map((r) => {
            const list = (byRep.get(r.id) || []).slice().sort((a, b) => (toMin(a.check_in_at || a.created_at) || 0) - (toMin(b.check_in_at || b.created_at) || 0));
            return (
              <div key={r.id} className="grid gap-2 p-1.5 rounded-lg border border-[var(--ws-border)] bg-white" style={{ gridTemplateColumns: "220px 1fr" }}>
                <div className="flex items-center justify-between gap-2 pr-2 border-r border-[var(--ws-border)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color || "var(--ws-accent)" }} />
                    <span className="text-[12px] font-semibold text-[var(--ws-text)] truncate">{r.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-5">{list.length} stops</span>
                </div>
                <div className="stop-strip overflow-x-auto scrollbar-none">
                  <div className="relative h-[44px]" style={{ width: laneWidth }}>
                    {showNow && <div className="absolute top-0 bottom-0 w-[2px] bg-red/50" style={{ left: (nowMin - START_MIN) * PX_PER_MIN }} />}
                    {list.map((v) => {
                      const m = toMin(v.check_in_at || v.created_at);
                      if (m === null) return null;
                      const left = (m - START_MIN) * PX_PER_MIN;
                      if (left < 0 || left > laneWidth - 122) return null;
                      const active = v.id === selectedId;
                      const done = v.outcome === "completed" || v.status === "completed";
                      return (
                        <button
                          key={v.id}
                          onClick={() => onSelect(v)}
                          className={`absolute top-0 w-[122px] h-[42px] rounded-lg border px-2 py-1 text-left flex flex-col justify-between transition-all ${active ? "bg-[var(--ws-text)] text-white border-[var(--ws-text)] shadow" : done ? "bg-green/10 border-green/20 hover:border-green/30" : "bg-[var(--ws-surface)] border-[var(--ws-border)] hover:border-[var(--ws-accent)]"}`}
                          style={{ left }}
                          title={`${v.outcome || v.status || "visit"} ${v.check_in_at || ""}`}
                        >
                          <span className="flex items-center justify-between text-[10px] font-bold truncate">{(v.outcome || v.status || "visit").slice(0, 14)} {done && <span className="w-3 h-3 rounded-full bg-green text-white grid place-items-center text-[8px]">✓</span>}</span>
                          <span className={`text-[11px] font-mono truncate ${active ? "text-white/80" : "text-gray-5"}`}>{new Date(v.check_in_at || v.created_at || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </button>
                      );
                    })}
                    {list.length === 0 && <span className="absolute left-2 top-2 text-[11px] text-gray-5">No visits today</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
