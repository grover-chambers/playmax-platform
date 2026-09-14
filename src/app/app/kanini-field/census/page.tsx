"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import { Store, MapPin, Search, Loader2, Layers } from "lucide-react";
import PageHeader from "@/components/layout/page-header";

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

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center py-16">
        <Loader2 className="w-4 h-4 text-gray-5 animate-spin" />
        <span className="ml-2 text-[11px] text-gray-5">Loading census…</span>
      </div>
    );
  }

  const outlets = (data?.outlets?.mapPins ?? []) as any[];
  const filtered = q ? outlets.filter((o: any) => `${o.name} ${o.ward} ${o.channel}`.toLowerCase().includes(q.toLowerCase())) : outlets;
  const byChannel = Object.entries(data?.outlets?.byChannel ?? {});
  const byType = Object.entries(data?.outlets?.byType ?? {});
  const byCounty = Object.entries(data?.outlets?.byCounty ?? {});

  const kpis = [
    { icon: Store, value: outlets.length.toLocaleString(), label: "Outlets", sub: "Captured census", color: "text-teal" },
    { icon: Layers, value: byChannel.length.toLocaleString(), label: "Channels", sub: "Distinct outlets", color: "text-blue" },
    { icon: MapPin, value: byCounty.length.toLocaleString(), label: "Counties", sub: "Mapped territory", color: "text-amber-600" },
  ];

  return (
    <div className="page-content space-y-5">
      <PageHeader
        title="Census — Captured Outlets"
        subtitle="From Kanini Field `census_provider` — `capturedOutlets` list. MarketLink view, same data as field app."
        actions={<span className="px-2.5 py-1.5 rounded-full bg-teal/10 text-teal border border-teal/20 text-[11px] font-mono">{outlets.length} total</span>}
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
        <div className="pm-dash-card-h">
          <span className="pm-dash-card-t">Captured outlets</span>
          <span className="text-[11px] font-mono text-gray-5">{filtered.length} / {outlets.length} shown</span>
        </div>
        <div className="pm-dash-card-b">
          <div className="relative mb-3 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-4" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search outlet, ward, channel…"
              className="w-full pl-8 pr-3 py-2 rounded-[var(--ws-radius-sm)] border border-[var(--ws-border)] bg-[var(--ws-surface)] text-[12px] placeholder:text-gray-4 focus:border-[var(--ws-accent)] outline-none"
            />
          </div>
          <div className="max-h-[440px] overflow-y-auto border border-[var(--ws-border)] rounded-[var(--ws-radius)] divide-y divide-[var(--ws-border)]">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-[12px] text-gray-4">No outlets captured yet. Field reps tap “Start a new census” in the app.</div>
            ) : (
              filtered.slice(0, 80).map((o: any) => (
                <div key={o.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--ws-bg)] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-teal/10 border border-teal/20 flex items-center justify-center shrink-0">
                    <Store size={14} className="text-teal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[var(--ws-text)] truncate">{o.name}</div>
                    <div className="text-[11px] text-gray-5 flex items-center gap-1">
                      <MapPin size={11} /> {o.ward || "—"} · {o.channel || "—"} · {o.type || "—"}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-green/10 text-green border border-green/20 shrink-0">Saved</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "By Channel", rows: byChannel },
          { title: "By Type", rows: byType },
          { title: "By County", rows: byCounty },
        ].map((b) => (
          <div key={b.title} className="pm-dash-card">
            <div className="pm-dash-card-h"><span className="pm-dash-card-t">{b.title}</span></div>
            <div className="pm-dash-card-b space-y-1.5">
              {(b.rows as [string, number][]).slice(0, 6).map(([k, v]) => (
                <div key={k} className="flex justify-between px-3 py-2 rounded-lg bg-[var(--ws-bg)] border border-[var(--ws-border)]">
                  <span className="text-[12px] text-[var(--ws-text)]">{k}</span>
                  <span className="text-[12px] font-mono font-semibold text-[var(--ws-text)]">{v}</span>
                </div>
              ))}
              {b.rows.length === 0 && <div className="text-[12px] text-gray-4 px-3 py-2">No data yet</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}