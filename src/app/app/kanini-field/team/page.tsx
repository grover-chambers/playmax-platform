"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  MapPin,
  Loader2,
  Signal,
  SignalLow,
  WifiOff,
  RefreshCw,
  Smartphone,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import SlicerPanel from "@/components/ui/slicer-panel";

interface RepItem {
  id: string;
  name: string;
  email: string;
  zone: string | null;
  status: string;
  onShift: boolean;
  onRoute: boolean;
  device: string | null;
  lastSyncAt: string | null;
  wards: unknown;
  color: string | null;
  target: number | null;
  actual: number | null;
  todayVisits: number;
  todayOrders: number;
  totalVisits: number;
  lastVisitAt: string | null;
  lastGps: { lat: number; lng: number } | null;
  lastGpsSource: string;
  lastGpsAt: string | null;
  lastOutcome: string | null;
  appVersion: string | null;
  versionCode: number | null;
  lastLoginAt: string | null;
  lastOpenAt: string | null;
  lastAppSyncAt: string | null;
  accessEventCount: number;
  accessDeviceId: string | null;
  lastPingAt: string | null;
}

const UNASSIGNED_ZONE = "__none__";

function zoneKey(zone: string | null): string {
  return zone ?? UNASSIGNED_ZONE;
}

function zoneLabel(zone: string | null): string {
  return zone ?? "Unassigned";
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function timeAgo(ts: string | null | undefined, now: number): string {
  if (!ts) return "never";
  const diff = now - new Date(ts).getTime();
  if (diff < 0) return "just now";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function KaniniTeamTabPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [q, setQ] = useState("");
  const [now, setNow] = useState(0);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [statusSel, setStatusSel] = useState<string[]>([]);
  const [versionSel, setVersionSel] = useState<string[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggle = useCallback((arr: string[], v: string) => {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }, []);

  const fetchMonitoring = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/portal/khel/monitoring");
      const json = await res.json();
      if (json && !json.error) {
        setData(json);
        setNow(Date.now());
      }
    } catch (err) {
      console.error("Monitoring fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchMonitoring(), 400);
  }, [fetchMonitoring]);

  useEffect(() => {
    void fetchMonitoring(); // eslint-disable-line react-hooks/set-state-in-effect -- initial load + realtime is best-effort
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/portal/khel/monitoring/stream");
      es.onopen = () => setSseConnected(true);
      es.addEventListener("change", debouncedFetch);
      es.onerror = () => setSseConnected(false);
    } catch {
      setSseConnected(false);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (es) { try { es.close(); } catch {} }
    };
  }, [fetchMonitoring, debouncedFetch]);

  const reps = useMemo<RepItem[]>(() => data?.reps ?? [], [data]);

  const zoneOptions = useMemo(() => {
    const m = new Map<string, number>();
    reps.forEach((r) => {
      const k = zoneKey(r.zone);
      m.set(k, (m.get(k) || 0) + 1);
    });
    return [...m.entries()]
      .sort((a, b) => (a[0] === UNASSIGNED_ZONE ? 1 : b[0] === UNASSIGNED_ZONE ? -1 : a[0].localeCompare(b[0])))
      .map(([value, count]) => ({ value, count, label: zoneLabel(value === UNASSIGNED_ZONE ? null : value) }));
  }, [reps]);

  const onShiftCount = reps.filter((r) => r.onShift).length;
  const offlineCount = reps.length - onShiftCount;
  const hasVersionCount = reps.filter((r) => r.appVersion).length;
  const laggingCount = reps.filter((r) => r.onShift && (!r.lastSyncAt || now - new Date(r.lastSyncAt).getTime() > 3600000)).length;

  const slicerSections = [
    {
      id: "zone",
      title: "Zone",
      options: zoneOptions,
      selected: selectedZones,
      onToggle: (v: string) => setSelectedZones((prev) => toggle(prev, v)),
      onClear: () => setSelectedZones([]),
    },
    {
      id: "status",
      title: "Status",
      options: [
        { value: "onshift", label: "On shift", count: onShiftCount },
        { value: "offline", label: "Offline", count: offlineCount },
      ],
      selected: statusSel,
      onToggle: (v: string) => setStatusSel((prev) => toggle(prev, v)),
      onClear: () => setStatusSel([]),
    },
    {
      id: "version",
      title: "App version",
      options: [
        { value: "has", label: "Versioned", count: hasVersionCount },
        { value: "none", label: "No version", count: reps.length - hasVersionCount },
      ],
      selected: versionSel,
      onToggle: (v: string) => setVersionSel((prev) => toggle(prev, v)),
      onClear: () => setVersionSel([]),
    },
  ];

  const filtered = useMemo(() => {
    return reps.filter((r) => {
      if (q && !`${r.name} ${r.email} ${r.zone ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (selectedZones.length > 0 && !selectedZones.includes(zoneKey(r.zone))) return false;
      if (statusSel.length > 0 && !statusSel.some((s) => (s === "onshift" ? r.onShift : !r.onShift))) return false;
      if (versionSel.length > 0 && !versionSel.some((s) => (s === "has" ? !!r.appVersion : !r.appVersion))) return false;
      return true;
    });
  }, [reps, q, selectedZones, statusSel, versionSel]);

  if (loading && !data) {
    return (
      <div className="page-content flex items-center justify-center py-16">
        <Loader2 className="w-4 h-4 text-gray-5 animate-spin" />
        <span className="ml-2 text-[11px] text-gray-5">Loading team…</span>
      </div>
    );
  }

  return (
    <div className="page-content space-y-5">
      <PageHeader
        title="Team — field reps"
        subtitle="Live status · installed app version · device · today&apos;s output — from Kanini Field `reps`, `rep_access_events`, `visits` and live GPS pings."
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-gray-4">
              <span className={`w-2 h-2 rounded-full ${sseConnected ? "bg-green-500 animate-pulse" : "bg-amber-400"}`} />
              {sseConnected ? "SSE live" : "polling"}
            </span>
            <Button variant="secondary" size="sm" onClick={() => fetchMonitoring()} disabled={refreshing} className="px-3">
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>
        }
      />

      {(data?.readWarnings && data.readWarnings.length > 0) && (
        <div className="flex items-start gap-2 pm-dash-card p-3 border-amber-300 bg-amber-50 text-[12px] text-amber-800">
          <AlertCircle size={14} className="shrink-0 mt-px"/> <span>Some census reads were blocked or failed and are shown empty: <span className="font-mono text-[11px]">{data.readWarnings.join(" · ")}</span></span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { icon: Users, value: reps.length.toLocaleString(), label: "Total reps", sub: "Across zones", color: "text-teal" },
          { icon: Signal, value: onShiftCount.toLocaleString(), label: "On shift", sub: "Active now", color: "text-green" },
          { icon: WifiOff, value: offlineCount.toLocaleString(), label: "Offline", sub: laggingCount > 0 ? `${laggingCount} lagging >1h` : "No lag", color: "text-gray-5" },
          { icon: Smartphone, value: `${hasVersionCount} / ${reps.length}`, label: "App version", sub: "Events reported", color: "text-blue" },
        ].map((k) => {
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

      <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] gap-5 items-start">
        <div className="lg:sticky lg:top-4">
          <SlicerPanel
            sections={slicerSections}
            onClearAll={() => { setSelectedZones([]); setStatusSel([]); setVersionSel([]); }}
          />
        </div>

        <div className="space-y-5 min-w-0">
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">Drill-through — rep cards</span>
              <span className="text-[11px] font-mono text-gray-5">{filtered.length} of {reps.length} · click a card to open profile</span>
            </div>
            <div className="pm-dash-card-b">
              <div className="mb-3 max-w-sm">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search rep, email, zone…"
                  className="w-full px-3 py-2 rounded-[var(--ws-radius-sm)] border border-[var(--ws-border)] bg-[var(--ws-surface)] text-[12px] placeholder:text-gray-4 focus:border-[var(--ws-accent)] outline-none"
                />
              </div>
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-gray-4">No reps match this view — adjust the slicers or search.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filtered.map((r) => {
                    const isLagging = r.onShift && (!r.lastSyncAt || now - new Date(r.lastSyncAt).getTime() > 3600000);
                    return (
                      <Link
                        key={r.id}
                        href={`/app/kanini-field/team/${r.id}`}
                        className="group bg-[var(--ws-surface)] border border-[var(--ws-border)] rounded-xl p-3 hover:border-[var(--ws-accent)] hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={initials(r.name)} variant={r.onShift ? "yellow" : "dark"} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold text-[var(--ws-text)] truncate flex items-center gap-1.5">
                              {r.name}
                              {r.onRoute && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber/10 text-amber border border-amber/20">ON ROUTE</span>}
                            </div>
                            <div className="text-[10px] text-gray-5 truncate">{r.email}</div>
                          </div>
                          <ChevronRight size={14} className="text-gray-3 group-hover:text-[var(--ws-accent)] transition-colors shrink-0" />
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--ws-border)] bg-[var(--ws-bg)] text-gray-5">{zoneLabel(r.zone)}</span>
                          {r.onShift ? (
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-full border ${isLagging ? "bg-amber/10 text-amber border-amber/20" : "bg-green/10 text-green border-green/20"}`}>
                              {isLagging ? <SignalLow size={10} className="text-amber" /> : <Signal size={10} className="text-green" />}
                              {isLagging ? "SYNC LAG" : "ON SHIFT"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-full bg-[var(--ws-surface)] text-gray-5 border border-[var(--ws-border)]">
                              <WifiOff size={10} /> OFFLINE
                            </span>
                          )}
                          {r.appVersion ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full bg-blue/10 text-blue border border-blue/20">
                              <Smartphone size={10} /> v{r.appVersion}{r.versionCode != null ? ` (${r.versionCode})` : ""}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-gray-4">no version</span>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--ws-border)] pt-2.5">
                          <div>
                            <div className="text-[14px] font-bold text-[var(--ws-text)]">{r.todayVisits}</div>
                            <div className="text-[9px] tracking-wider uppercase font-semibold text-gray-4">Visits</div>
                          </div>
                          <div>
                            <div className="text-[14px] font-bold text-amber-600">{r.todayOrders}</div>
                            <div className="text-[9px] tracking-wider uppercase font-semibold text-gray-4">Orders</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] text-gray-5">{timeAgo(r.lastSyncAt, now)}</div>
                            <div className="text-[9px] tracking-wider uppercase font-semibold text-gray-4">Last seen</div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="pm-dash-card">
              <div className="pm-dash-card-h">
                <span className="pm-dash-card-t flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue" />
                  App version coverage
                </span>
              </div>
              <div className="pm-dash-card-b space-y-1.5">
                {(() => {
                  const byVersion = new Map<string, number>();
                  reps.forEach((r) => {
                    const k = r.appVersion ? `v${r.appVersion}` : "no version";
                    byVersion.set(k, (byVersion.get(k) || 0) + 1);
                  });
                  const rows = [...byVersion.entries()].sort((a, b) => b[1] - a[1]);
                  return rows.length ? rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--ws-bg)] border border-[var(--ws-border)]">
                      <span className="text-[12px] text-[var(--ws-text)]">{k}</span>
                      <span className="text-[12px] font-mono font-semibold text-[var(--ws-text)]">{v}</span>
                    </div>
                  )) : <div className="text-[12px] text-gray-4 px-3 py-2">No app events yet — reps will report on next open/sync.</div>;
                })()}
              </div>
            </div>
            <div className="pm-dash-card">
              <div className="pm-dash-card-h">
                <span className="pm-dash-card-t flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green" />
                  Live GPS pings
                </span>
              </div>
              <div className="pm-dash-card-b space-y-1.5">
                {reps.filter((r) => r.lastGps).slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--ws-bg)] border border-[var(--ws-border)]">
                    <span className="text-[12px] text-[var(--ws-text)]">{r.name}</span>
                    <span className="text-[11px] font-mono text-gray-5">
                      <MapPin size={11} className="inline mr-1" />
                      {r.lastGps!.lat.toFixed(4)}, {r.lastGps!.lng.toFixed(4)}
                      <span className="ml-2 text-gray-4">{timeAgo(r.lastGpsAt, now)}</span>
                    </span>
                  </div>
                ))}
                {reps.filter((r) => r.lastGps).length === 0 && <div className="text-[12px] text-gray-4 px-3 py-2">No live GPS pings yet.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}