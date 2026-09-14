"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import { ClipboardCheck, Clock, Loader2, TrendingUp, Store } from "lucide-react";
import PageHeader from "@/components/layout/page-header";

export default function KaniniVisitsTabPage() {
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
        <span className="ml-2 text-[11px] text-gray-5">Loading visits…</span>
      </div>
    );
  }

  const total = data?.visits?.total ?? 0;
  const orders = data?.visits?.totalOrders ?? 0;
  const orderValue = data?.visits?.totalOrderValue ?? 0;

  const kpis = [
    { icon: ClipboardCheck, value: total.toLocaleString(), label: "Total visits", sub: "All time", color: "text-teal" },
    { icon: Store, value: orders.toLocaleString(), label: "Orders", sub: "Converted", color: "text-blue" },
    { icon: TrendingUp, value: `KES ${orderValue.toLocaleString()}`, label: "Order value", sub: "Field sales", color: "text-amber-600" },
  ];

  const timeline = (data?.visits?.timeline ?? []) as any[];

  return (
    <div className="page-content space-y-5">
      <PageHeader
        title="Visits — Daily check-ins"
        subtitle="From Kanini Field `visits` — status/outcome, order value. Mirrors field app visits flow."
        actions={<span className="px-2.5 py-1.5 rounded-full bg-amber/10 text-amber border border-amber/20 text-[11px] font-mono">{total} total</span>}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="pm-dash-card">
          <div className="pm-dash-card-h">
            <span className="pm-dash-card-t flex items-center gap-2"><Clock size={14} className="text-teal" /> By Status</span>
          </div>
          <div className="pm-dash-card-b space-y-1.5">
            {Object.entries(data?.visits?.byStatus ?? {}).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--ws-bg)] border border-[var(--ws-border)]">
                <span className="text-[12px] text-[var(--ws-text)] capitalize">{k}</span>
                <span className="text-[12px] font-mono font-semibold text-[var(--ws-text)]">{v as number}</span>
              </div>
            ))}
            {Object.keys(data?.visits?.byStatus ?? {}).length === 0 && <div className="text-[12px] text-gray-4 px-3 py-2">No status data</div>}
          </div>
        </div>
        <div className="pm-dash-card">
          <div className="pm-dash-card-h">
            <span className="pm-dash-card-t flex items-center gap-2"><TrendingUp size={14} className="text-teal" /> By Outcome</span>
          </div>
          <div className="pm-dash-card-b space-y-1.5">
            {Object.entries(data?.visits?.byOutcome ?? {}).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--ws-bg)] border border-[var(--ws-border)]">
                <span className="text-[12px] text-[var(--ws-text)] capitalize">{k}</span>
                <span className="text-[12px] font-mono font-semibold text-[var(--ws-text)]">{v as number}</span>
              </div>
            ))}
            {Object.keys(data?.visits?.byOutcome ?? {}).length === 0 && <div className="text-[12px] text-gray-4 px-3 py-2">No outcome data</div>}
          </div>
        </div>
      </div>

      <div className="pm-dash-card">
        <div className="pm-dash-card-h">
          <span className="pm-dash-card-t">Visit timeline</span>
          <span className="text-[11px] font-mono text-gray-5">Last 14 days</span>
        </div>
        <div className="pm-dash-card-b">
          {timeline.length === 0 ? (
            <div className="text-[12px] text-gray-4 py-2">No timeline data yet.</div>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {timeline.slice(-14).map((t: any) => {
                const h = Math.min(96, 12 + t.count * 8);
                return (
                  <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-[var(--ws-accent)] rounded-t" style={{ height: h }} title={`${t.date}: ${t.count}`} />
                    <span className="text-[9px] font-mono text-gray-5">{t.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}