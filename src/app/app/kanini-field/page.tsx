"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Store, Users, MapPin, Flag, AlertTriangle, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";

interface CensusData {
  outlets: { total: number; byChannel: Record<string, number>; byType: Record<string, number>; mapPins: any[] };
  visits: { total: number; totalOrders: number; totalOrderValue: number; byStatus: Record<string, number> };
  submissions: { total: number };
  reps: { total: number; byGroup: { group: string; count: number }[] };
}

export default function KaniniFieldOverviewPage() {
  const [census, setCensus] = useState<CensusData | null>(null);
  const [monitor, setMonitor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [c, m] = await Promise.all([
          fetch("/api/portal/khel/census").then((r) => r.json()),
          fetch("/api/app/kanini-field/monitoring").then((r) => r.json()).catch(() => null),
        ]);
        if (!cancel) {
          if (c.error) setSyncError(c.error);
          else setCensus(c);
          if (m && !m.error) setMonitor(m);
        }
      } catch (e) {
        if (!cancel) setSyncError(e instanceof Error ? e.message : "Failed to load field data");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center py-16">
        <Loader2 className="w-4 h-4 text-gray-5 animate-spin" />
        <span className="ml-2 text-[11px] text-gray-5">Loading Kanini Field…</span>
      </div>
    );
  }

  const todayOutlets = census?.outlets.total ?? 0;
  const todayVisits = census?.visits.total ?? 0;
  const pendingSync = census?.submissions.total ?? 0;

  const kpis = [
    { icon: Store, value: todayOutlets.toLocaleString(), label: "Outlets", sub: "Total census", color: "text-teal" },
    { icon: Users, value: todayVisits.toLocaleString(), label: "Visits", sub: `${census?.visits.totalOrders ?? 0} orders`, color: "text-blue" },
    { icon: Flag, value: pendingSync.toLocaleString(), label: "To sync", sub: "Submissions", color: "text-amber-600" },
  ];

  return (
    <div className="page-content space-y-5">
      <PageHeader
        title="Kanini Field"
        subtitle="Live field operations — outlets, visits and rep activity"
        actions={
          <>
            <span className="hidden sm:inline-flex items-center px-2 py-1 rounded bg-[var(--ws-surface)] border border-[var(--ws-border)] text-[10px] font-mono text-gray-4">MarketLink × Kanini Field</span>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
          </>
        }
      />

      {syncError && (
        <div className="px-4 py-3 rounded-lg bg-red/10 border border-red/20 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red shrink-0" />
          <div className="flex-1 text-[12px] text-red"><span className="font-semibold">Sync failed:</span> {syncError}</div>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}

      {/* KPI row — platform ws-stat-card */}
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

      {/* Tasks — pm-dash-card */}
      <div className="pm-dash-card">
        <div className="pm-dash-card-h"><span className="pm-dash-card-t">Tasks</span><span className="text-[11px] text-gray-5">Tap to open</span></div>
        <div className="pm-dash-card-b flex flex-col gap-2">
          {[
            { href: "/app/kanini-field/census", icon: Store, title: "Census outlets", sub: `${todayOutlets} captured · Ward + GPS`, badge: "Now" },
            { href: "/app/kanini-field/visits", icon: Users, title: "Run visits", sub: `${todayVisits} visits · ${census?.reps.total ?? 0} reps`, badge: "Now" },
            { href: "/app/kanini-field/map", icon: MapPin, title: "Territory map", sub: "Ward boundaries · GPS pins" },
            { href: "/app/kanini-field/submissions", icon: Flag, title: "Close day & submit", sub: `${pendingSync} submissions pending sync` },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.href} href={t.href} className="pm-dash-qa-btn w-full justify-between">
                <span className="flex items-center gap-3"><Icon className="w-4 h-4 text-gray-4" /> {t.title} <span className="hidden sm:inline text-gray-5 font-normal">— {t.sub}</span></span>
                {t.badge && <span className="pm-dash-bdg">{t.badge}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Live rep monitoring — pm-dash-card + table */}
      <div className="pm-dash-card">
        <div className="pm-dash-card-h">
          <span className="pm-dash-card-t">Rep monitoring · live</span>
          <span className="text-[11px] font-mono text-gray-5">{monitor ? `${monitor.onShift} on shift · ${monitor.offShift} off · ${monitor.total} active reps` : "—"}</span>
        </div>
        <div className="pm-dash-card-b">
          {!monitor ? (
            <div className="flex items-center gap-2 py-4"><Loader2 className="w-3 h-3 text-gray-5 animate-spin" /><span className="text-[11px] text-gray-5">Loading rep status…</span></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="text-gray-5 font-mono"><th className="text-left pb-2 font-normal">Rep</th><th className="text-left pb-2 font-normal">Shift</th><th className="text-left pb-2 font-normal">Where</th><th className="text-center pb-2 font-normal">Today</th><th className="text-right pb-2 font-normal">Last seen</th></tr></thead>
                <tbody>
                  {(monitor.reps || []).map((r: any) => (
                    <tr key={r.id} className="border-t border-[var(--ws-border)]">
                      <td className="py-2.5"><div className="font-medium text-[var(--ws-text)] flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color || "var(--ws-accent)" }} />{r.name}</div><div className="text-gray-5 font-mono text-[10px]">{r.email}</div></td>
                      <td className="py-2.5"><span className={`inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full border ${r.onShift ? "bg-green/10 text-green border-green/20" : "bg-[var(--ws-surface)] text-gray-5 border-[var(--ws-border)]"}`}>{r.onShift ? "ON SHIFT" : "OFF"}</span><div className="text-gray-5 text-[10px] mt-1">{r.zone} · {r.status}</div></td>
                      <td className="py-2.5">{r.lastGps?.lat ? <a href={`https://www.google.com/maps?q=${r.lastGps.lat},${r.lastGps.lng}`} target="_blank" rel="noreferrer" className="text-teal hover:underline font-mono text-[11px]">{r.lastGps.lat.toFixed(4)}, {r.lastGps.lng.toFixed(4)}</a> : <span className="text-gray-5">—</span>}<div className="text-gray-4 text-[11px]">{r.lastOutcome || "—"}</div></td>
                      <td className="py-2.5 text-center"><span className="font-semibold text-[var(--ws-text)]">{r.todayVisits}</span><span className="text-gray-4"> visits</span><div className="text-gray-5 text-[10px]">{r.todayOrders} orders · {r.totalVisits} total</div></td>
                      <td className="py-2.5 text-right font-mono text-[11px] text-gray-5">{r.lastSyncAt ? new Date(r.lastSyncAt).toLocaleString() : r.lastVisitAt ? new Date(r.lastVisitAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* App version & login activity — pm-dash-card */}
      <div className="pm-dash-card">
        <div className="pm-dash-card-h">
          <span className="pm-dash-card-t">App &amp; login activity</span>
          <span className="text-[11px] text-gray-5">Last login · app version · device</span>
        </div>
        <div className="pm-dash-card-b">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="text-gray-5 font-mono"><th className="text-left pb-2 font-normal">Rep</th><th className="text-left pb-2 font-normal">App version</th><th className="text-left pb-2 font-normal">Last login</th><th className="text-left pb-2 font-normal">Last open</th><th className="text-left pb-2 font-normal">Device</th></tr></thead>
              <tbody>
                {(monitor?.reps || []).map((r: any) => (
                  <tr key={r.id} className="border-t border-[var(--ws-border)]">
                    <td className="py-2.5 font-medium text-[var(--ws-text)]">{r.name}</td>
                    <td className="py-2.5">
                      {r.appVersion ? <span className="inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full border bg-[var(--ws-surface)] border-[var(--ws-border)] text-gray-4">v{r.appVersion}{r.appVersionCode ? ` (${r.appVersionCode})` : ""}</span> : <span className="text-gray-5">—</span>}
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-gray-5">{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString() : "—"}</td>
                    <td className="py-2.5 font-mono text-[11px] text-gray-5">{r.lastOpenAt ? new Date(r.lastOpenAt).toLocaleString() : "—"}</td>
                    <td className="py-2.5 font-mono text-[10px] text-gray-5">{r.accessDevice ? String(r.accessDevice).slice(0, 8) : (r.device ? String(r.device).slice(0, 8) : "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Access event history — pm-dash-card */}
      <div className="pm-dash-card">
        <div className="pm-dash-card-h">
          <span className="pm-dash-card-t">Recent activity</span>
          <span className="text-[11px] font-mono text-gray-5">{monitor?.accessLog?.length ?? 0} events</span>
        </div>
        <div className="pm-dash-card-b">
          {(monitor?.accessLog?.length ?? 0) === 0 ? (
            <div className="text-[11px] text-gray-5 py-2">No access events yet — events appear after reps sign in / sync with v1.3.0+.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="text-gray-5 font-mono"><th className="text-left pb-2 font-normal">When</th><th className="text-left pb-2 font-normal">Rep</th><th className="text-left pb-2 font-normal">Event</th><th className="text-left pb-2 font-normal">Version</th><th className="text-left pb-2 font-normal">Device</th></tr></thead>
                <tbody>
                  {(monitor.accessLog || []).slice(0, 40).map((e: any, i: number) => (
                    <tr key={e.id || i} className="border-t border-[var(--ws-border)]">
                      <td className="py-2 font-mono text-[11px] text-gray-5">{new Date(e.created_at).toLocaleString()}</td>
                      <td className="py-2 text-[var(--ws-text)]">{e.rep_email}</td>
                      <td className="py-2"><span className={`inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full border ${e.event_type === "login" ? "bg-teal/10 text-teal border-teal/20" : e.event_type === "sync" ? "bg-blue/10 text-blue border-blue/20" : "bg-[var(--ws-surface)] text-gray-5 border-[var(--ws-border)]"}`}>{e.event_type}</span></td>
                      <td className="py-2 font-mono text-[11px] text-gray-5">{e.app_version ? `v${e.app_version}${e.version_code ? ` (${e.version_code})` : ""}` : "—"}</td>
                      <td className="py-2 font-mono text-[10px] text-gray-5">{e.device_id ? String(e.device_id).slice(0, 8) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-gray-5">
        <span>Wired:</span><span className="font-mono bg-[var(--ws-surface)] px-1.5 py-0.5 rounded border border-[var(--ws-border)]">/api/portal/khel/census</span><span className="font-mono bg-[var(--ws-surface)] px-1.5 py-0.5 rounded border border-[var(--ws-border)]">/api/portal/khel/monitoring</span>
      </div>
    </div>
  );
}
