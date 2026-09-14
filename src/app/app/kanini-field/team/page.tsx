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
  Activity,
  Radio,
} from "lucide-react";
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
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
          <Users size={14} /> Team — field reps
          <span className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              <span className={`w-2 h-2 rounded-full ${sseConnected ? "bg-green-500 animate-pulse" : "bg-amber-400"}`} />
              {sseConnected ? "SSE live" : "polling"}
            </span>
            <Button variant="secondary" size="sm" onClick={() => fetchMonitoring()} disabled={refreshing} className="px-3">
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
            </Button>
          </span>
        </h2>
        <p className="text-[11px] text-slate-500 mt-1">Live status · installed app version · device · today&apos;s output — from Kanini Field `reps`, `rep_access_events`, `visits` and live GPS pings.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 border-t-2 border-t-teal-600 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-slate-800">{reps.length}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Total reps</div>
          <div className="text-[11px] text-slate-400 mt-1">Across zones</div>
        </div>
        <div className="bg-white border border-slate-200 border-t-2 border-t-emerald-500 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-emerald-600">{onShiftCount}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">On shift</div>
          <div className="text-[11px] text-slate-400 mt-1">Active now</div>
        </div>
        <div className="bg-white border border-slate-200 border-t-2 border-t-slate-300 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-slate-500">{offlineCount}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Offline</div>
          <div className="text-[11px] text-slate-400 mt-1">{laggingCount > 0 ? `${laggingCount} lagging >1h` : "No lag"}</div>
        </div>
        <div className="bg-white border border-slate-200 border-t-2 border-t-indigo-500 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-indigo-600">{hasVersionCount} / {reps.length}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">App version</div>
          <div className="text-[11px] text-slate-400 mt-1">Events reported</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] gap-4 items-start">
        <div className="lg:sticky lg:top-4">
          <SlicerPanel
            sections={slicerSections}
            onClearAll={() => { setSelectedZones([]); setStatusSel([]); setVersionSel([]); }}
            className="shadow-sm"
          />
        </div>

        <div className="space-y-4 min-w-0">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Users size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search rep, email, zone…"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[12px] placeholder:text-slate-400 focus:bg-white focus:border-teal-300 outline-none"
                />
              </div>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                {filtered.length} / {reps.length} reps
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center gap-2">
              <Radio size={12} className="text-teal-600" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-600">Rep drill-through</span>
              <span className="text-[10px] font-mono text-slate-400">click a card to open the rep profile</span>
              <span className="ml-auto text-[10px] font-mono text-slate-400">{filtered.length} of {reps.length}</span>
            </div>
            <div className="p-3">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-[13px] text-slate-400">No reps match this view — adjust the slicers or search.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filtered.map((r) => {
                    const isLagging = r.onShift && (!r.lastSyncAt || now - new Date(r.lastSyncAt).getTime() > 3600000);
                    return (
                      <Link
                        key={r.id}
                        href={`/app/kanini-field/team/${r.id}`}
                        className="group bg-slate-50/60 border border-slate-200 rounded-xl p-3 hover:border-teal-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar initials={initials(r.name)} variant={r.onShift ? "yellow" : "dark"} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold text-slate-800 truncate flex items-center gap-1.5">
                              {r.name}
                              {r.onRoute && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">ON ROUTE</span>}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{r.email}</div>
                          </div>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-teal-600 transition-colors shrink-0" />
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">{zoneLabel(r.zone)}</span>
                          {r.onShift ? (
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-full border ${isLagging ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                              {isLagging ? <SignalLow size={10} className="text-amber-500" /> : <Signal size={10} className="text-emerald-600" />}
                              {isLagging ? "SYNC LAG" : "ON SHIFT"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                              <WifiOff size={10} /> OFFLINE
                            </span>
                          )}
                          {r.appVersion ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Smartphone size={10} /> v{r.appVersion}{r.versionCode != null ? ` (${r.versionCode})` : ""}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400">no version</span>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/70 pt-2.5">
                          <div>
                            <div className="text-[14px] font-bold text-slate-800">{r.todayVisits}</div>
                            <div className="text-[9px] tracking-wider uppercase font-semibold text-slate-400">Visits</div>
                          </div>
                          <div>
                            <div className="text-[14px] font-bold text-amber-600">{r.todayOrders}</div>
                            <div className="text-[9px] tracking-wider uppercase font-semibold text-slate-400">Orders</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] text-slate-600">{timeAgo(r.lastSyncAt, now)}</div>
                            <div className="text-[9px] tracking-wider uppercase font-semibold text-slate-400">Last seen</div>
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
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center gap-2">
                <Activity size={12} className="text-teal-600" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-600">App version coverage</span>
              </div>
              <div className="p-3 space-y-2">
                {(() => {
                  const byVersion = new Map<string, number>();
                  reps.forEach((r) => {
                    const k = r.appVersion ? `v${r.appVersion}` : "no version";
                    byVersion.set(k, (byVersion.get(k) || 0) + 1);
                  });
                  const rows = [...byVersion.entries()].sort((a, b) => b[1] - a[1]);
                  return rows.length ? rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[12px] font-medium text-slate-700">{k}</span>
                      <span className="text-[12px] font-mono font-bold">{v}</span>
                    </div>
                  )) : <div className="text-[12px] text-slate-400">No app events yet — reps will report on next open/sync.</div>;
                })()}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center gap-2">
                <MapPin size={12} className="text-teal-600" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-600">Live GPS pings</span>
              </div>
              <div className="p-3 space-y-2">
                {reps.filter((r) => r.lastGps).slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[12px] font-medium text-slate-700">{r.name}</span>
                    <span className="text-[11px] font-mono text-slate-500">
                      <MapPin size={11} className="inline mr-1" />
                      {r.lastGps!.lat.toFixed(4)}, {r.lastGps!.lng.toFixed(4)}
                      <span className="ml-2 text-slate-400">{timeAgo(r.lastGpsAt, now)}</span>
                    </span>
                  </div>
                ))}
                {reps.filter((r) => r.lastGps).length === 0 && <div className="text-[12px] text-slate-400">No live GPS pings yet.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}