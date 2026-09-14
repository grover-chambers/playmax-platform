"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import { Activity, Loader2, CheckCircle, Clock, Flag } from "lucide-react";
import PageHeader from "@/components/layout/page-header";

export default function KaniniSubmissionsTabPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/khel/census")
      .then((r) => r.json())
      .then((j) => setData(j))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center py-16">
        <Loader2 className="w-4 h-4 text-gray-5 animate-spin" />
        <span className="ml-2 text-[11px] text-gray-5">Loading submissions…</span>
      </div>
    );
  }

  const submissions = data?.submissions?.total ?? 0;
  const visits = data?.visits?.total ?? 0;
  const reps = data?.reps?.total ?? 0;

  const kpis = [
    { icon: Flag, value: submissions.toLocaleString(), label: "Total submissions", sub: "Daily closes synced", color: "text-teal" },
    { icon: Activity, value: visits.toLocaleString(), label: "Visits", sub: "All time", color: "text-blue" },
    { icon: Clock, value: reps.toLocaleString(), label: "Reps", sub: "Active field team", color: "text-amber-600" },
  ];

  return (
    <div className="page-content space-y-5">
      <PageHeader
        title="Submissions — Daily close"
        subtitle="From Kanini Field `daily_submissions` — reps close day &amp; submit. Superadmin sees pending sync + submissions."
        actions={<span className="px-2.5 py-1.5 rounded-full bg-amber/10 text-amber border border-amber/20 text-[11px] font-mono">{submissions} total</span>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="ws-stat-card">
              <div className="flex items-center gap-3">
                <div className="ws-stat-icon"><Icon className={`w-4 h-4 ${k.color}`} /></div>
                <div>
                  <div className="ws-stat-value">{k.value}</div>
                  <div className="ws-stat-label">{k.label}</div>
                  <div className="text-[11px] text-gray-5">{k.sub}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pm-dash-card">
        {submissions > 0 ? (
          <>
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t flex items-center gap-2"><CheckCircle size={14} className="text-teal" /> Submissions synced</span>
            </div>
            <div className="pm-dash-card-b flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0">
                <CheckCircle size={22} className="text-teal" />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-[var(--ws-text)]">{submissions} submissions synced</div>
                <div className="text-[12px] text-gray-5 mt-0.5">Field reps have closed their day. {reps} reps active across {visits} visits.</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t flex items-center gap-2"><Clock size={14} className="text-amber-600" /> No submissions yet</span>
            </div>
            <div className="pm-dash-card-b flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center shrink-0">
                <Clock size={22} className="text-amber-600" />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-[var(--ws-text)]">Awaiting field submissions</div>
                <div className="text-[12px] text-gray-5 mt-0.5">Submissions appear after field reps close their day in the app.</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}