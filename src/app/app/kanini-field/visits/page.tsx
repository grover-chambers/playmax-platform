"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import { ClipboardCheck, Clock, Loader2, TrendingUp } from "lucide-react";

export default function KaniniVisitsTabPage() {
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
        <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-2"><ClipboardCheck size={14} /> Visits — Daily check-ins <span className="ml-auto text-[11px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">{data?.visits?.total ?? 0} total</span></h2>
        <p className="text-[11px] text-slate-500 mt-1">From Kanini Field `visits` — status/outcome, order value. Mirrors field app visits flow.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-slate-800">{data?.visits?.total ?? 0}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Total visits</div>
          <div className="text-[11px] text-slate-400 mt-1">All time</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-teal-700">{data?.visits?.totalOrders ?? 0}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Orders</div>
          <div className="text-[11px] text-slate-400 mt-1">Converted</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-amber-600">KES {(data?.visits?.totalOrderValue ?? 0).toLocaleString()}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Order value</div>
          <div className="text-[11px] text-slate-400 mt-1">Field sales</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[12px] font-semibold text-slate-800 flex items-center gap-2"><Clock size={14}/> By Status</div>
          <div className="mt-3 space-y-2">
            {Object.entries(data?.visits?.byStatus ?? {}).map(([k,v])=> (
              <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[12px] font-medium text-slate-700">{k}</span>
                <span className="text-[12px] font-mono font-bold">{v as number}</span>
              </div>
            ))}
            {Object.keys(data?.visits?.byStatus ?? {}).length===0 && <div className="text-[12px] text-slate-400">No status data</div>}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[12px] font-semibold text-slate-800 flex items-center gap-2"><TrendingUp size={14}/> By Outcome</div>
          <div className="mt-3 space-y-2">
            {Object.entries(data?.visits?.byOutcome ?? {}).map(([k,v])=> (
              <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[12px] font-medium text-slate-700">{k}</span>
                <span className="text-[12px] font-mono font-bold">{v as number}</span>
              </div>
            ))}
            {Object.keys(data?.visits?.byOutcome ?? {}).length===0 && <div className="text-[12px] text-slate-400">No outcome data</div>}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-[12px] font-semibold text-slate-800">Visit timeline (last 14 days)</div>
        <div className="mt-3 flex items-end gap-1 h-24">
          {(data?.visits?.timeline ?? []).slice(-14).map((t:any)=> {
            const h = Math.min(96, 12 + t.count * 8);
            return (
              <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-teal-600 rounded-t" style={{ height: h }} title={`${t.date}: ${t.count}`} />
                <span className="text-[9px] font-mono text-slate-500">{t.date.slice(5)}</span>
              </div>
            );
          })}
          {(data?.visits?.timeline ?? []).length===0 && <div className="text-[12px] text-slate-400">No timeline</div>}
        </div>
      </div>
    </div>
  );
}
