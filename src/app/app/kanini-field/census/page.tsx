"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import { Store, MapPin, Search, Loader2 } from "lucide-react";

export default function KaniniCensusTabPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/portal/khel/census")
      .then((r) => r.json())
      .then((j) => setData(j))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;

  const outlets = (data?.outlets?.mapPins ?? []) as any[];
  const filtered = q ? outlets.filter((o: any) => `${o.name} ${o.ward} ${o.channel}`.toLowerCase().includes(q.toLowerCase())) : outlets;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-2"><Store size={14} /> Census — Captured Outlets <span className="ml-auto text-[11px] font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">{outlets.length} total</span></h2>
        <p className="text-[11px] text-slate-500 mt-1">From Kanini Field `census_provider` — `capturedOutlets` list. MarketLink view, same data as field app.</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search outlet, ward, channel…" className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[12px] placeholder:text-slate-400 focus:bg-white focus:border-teal-300 outline-none" />
          </div>
          <div className="text-[11px] font-mono text-slate-500">{filtered.length} shown</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <Store size={14} className="text-teal-600" />
          <span className="text-[12px] font-bold">Captured outlets</span>
          <span className="ml-auto text-[11px] text-slate-400">{filtered.length} / {outlets.length}</span>
        </div>
        <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-slate-400">No outlets captured yet. Field reps tap “Start a new census” in the app.</div>
          ) : (
            filtered.slice(0, 80).map((o: any) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center">
                  <Store size={14} className="text-teal-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-slate-800 truncate">{o.name}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin size={11} /> {o.ward || "—"} · {o.channel || "—"} · {o.type || "—"}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Saved</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">By Channel</div>
          <div className="mt-2 space-y-1">
            {Object.entries(data?.outlets?.byChannel ?? {}).slice(0,6).map(([k,v])=> (
              <div key={k} className="flex justify-between text-[12px]"><span className="text-slate-600">{k}</span><span className="font-mono font-bold">{v as number}</span></div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">By Type</div>
          <div className="mt-2 space-y-1">
            {Object.entries(data?.outlets?.byType ?? {}).slice(0,6).map(([k,v])=> (
              <div key={k} className="flex justify-between text-[12px]"><span className="text-slate-600">{k}</span><span className="font-mono font-bold">{v as number}</span></div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">By County</div>
          <div className="mt-2 space-y-1">
            {Object.entries(data?.outlets?.byCounty ?? {}).slice(0,6).map(([k,v])=> (
              <div key={k} className="flex justify-between text-[12px]"><span className="text-slate-600">{k}</span><span className="font-mono font-bold">{v as number}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
