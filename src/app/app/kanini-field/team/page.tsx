"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import { Users, MapPin, Loader2 } from "lucide-react";

export default function KaniniTeamTabPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/khel/census")
      .then((r) => r.json())
      .then((j) => setData(j))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-2"><Users size={14}/> Team — Field reps <span className="ml-auto text-[11px] font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">{data?.reps?.total ?? 0} reps</span></h2>
        <p className="text-[11px] text-slate-500 mt-1">From Kanini Field `reps` + `route_groups` — zone, lead, outlets/day. MarketLink view.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-slate-800">{data?.reps?.total ?? 0}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Total reps</div>
          <div className="text-[11px] text-slate-400 mt-1">Across groups</div>
        </div>
        {(data?.reps?.byGroup ?? []).map((g:any)=> (
          <div key={g.group} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-[18px] font-bold text-teal-700">Group {g.group}</div>
            <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">{g.count} reps</div>
            <div className="text-[11px] text-slate-400 mt-1">Zone {g.group}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-[12px] font-semibold text-slate-800 flex items-center gap-2"><MapPin size={14}/> Reps by Group (Kanini Field clusters)</div>
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
          {(data?.reps?.byGroup ?? []).map((g:any)=> (
            <div key={g.group} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[12px] font-medium text-slate-700">Group {g.group}</span>
              <span className="text-[11px] font-mono bg-white border border-slate-200 px-2 py-0.5 rounded">{g.count} reps</span>
            </div>
          ))}
          {(data?.reps?.byGroup ?? []).length===0 && <div className="text-[12px] text-slate-400">No team data</div>}
        </div>
      </div>
    </div>
  );
}
