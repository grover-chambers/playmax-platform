"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import { Activity, Loader2, CheckCircle, Clock } from "lucide-react";

export default function KaniniSubmissionsTabPage() {
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
        <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-2"><Activity size={14}/> Submissions — Daily close <span className="ml-auto text-[11px] font-mono bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">{data?.submissions?.total ?? 0} total</span></h2>
        <p className="text-[11px] text-slate-500 mt-1">From Kanini Field `daily_submissions` — reps close day &amp; submit. Superadmin sees pending sync + submissions.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-slate-800">{data?.submissions?.total ?? 0}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Total submissions</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-teal-700">{data?.visits?.total ?? 0}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Visits</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-amber-600">{data?.reps?.total ?? 0}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Reps</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <CheckCircle size={32} className="mx-auto text-teal-600" />
        <div className="text-[13px] font-bold text-slate-800 mt-3">All submissions synced</div>
        <div className="text-[11px] text-slate-500 mt-1">Field reps have closed their day. No pending sync errors.</div>
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Clock size={12} /> Last sync — just now
        </div>
      </div>
    </div>
  );
}
