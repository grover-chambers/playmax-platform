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
} from "lucide-react";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import FilterPill from "@/components/ui/filter-pill";

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
  const [filter, setFilter] = useState<"all" | "shift" | "offline">("all");
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const zones = useMemo(() => {
    const s = new Set<string>();
    reps.forEach((r) => { if (r.zone) s.add(r.zone); });
    return [...s].sort();
  }, [reps]);

  const filtered = reps.filter((r) => {
    if (filter === "shift" && !r.onShift) return false;
    if (filter === "offline" && r.onShift) return false;
    if (zoneFilter && r.zone !== zoneFilter) return false;
    if (q && !`${r.name} ${r.email} ${r.zone ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  if (loading && !data) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;
  }

  const onShiftCount = reps.filter((r) => r.onShift).length;
  const withVersion = reps.filter((r) => r.appVersion).length;
  const lagging = reps.filter((r) => r.onShift && (!r.lastSyncAt || now - new Date(r.lastSyncAt).getTime() > 3600000)).length;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
          <Users size={14} /> Team — field reps
          <span className="ml-auto text-[11px] font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">{reps.length} reps</span>
        </h2>
        <p className="text-[11px] text-slate-500 mt-1">Live status · installed app version · device · today&apos;s output — from Kanini Field `reps`, `rep_access_events`, `visits` and live GPS pings.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-slate-800">{reps.length}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Total reps</div>
          <div className="text-[11px] text-slate-400 mt-1">Across zones</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-emerald-600">{onShiftCount}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">On shift</div>
          <div className="text-[11px] text-slate-400 mt-1">Active now</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-slate-500">{reps.length - onShiftCount}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">Offline</div>
          <div className="text-[11px] text-slate-400 mt-1">{lagging > 0 ? `${lagging} lagging >1h` : "No lag"}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <div className="text-[20px] font-bold text-indigo-600">{withVersion} / {reps.length}</div>
          <div className="text-[11px] tracking-wider uppercase font-semibold text-slate-500">App version</div>
          <div className="text-[11px] text-slate-400 mt-1">Events reported</div>
        </div>
      </div>

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
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>All</FilterPill>
          <FilterPill active={filter === "shift"} onClick={() => setFilter("shift")}>On shift</FilterPill>
          <FilterPill active={filter === "offline"} onClick={() => setFilter("offline")}>Offline</FilterPill>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          {zones.slice(0, 8).map((z) => (
            <FilterPill key={z} active={zoneFilter === z} onClick={() => setZoneFilter(zoneFilter === z ? null : z)}>{z}</FilterPill>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              <span className={`w-2 h-2 rounded-full ${sseConnected ? "bg-green-500 animate-pulse" : "bg-amber-400"}`} />
              {sseConnected ? "SSE live" : "polling"}
            </span>
            <Button variant="secondary" size="sm" onClick={() => fetchMonitoring()} disabled={refreshing} className="px-3">
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-12 items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50 text-[10px] font-bold tracking-wider uppercase text-slate-500">
          <div className="col-span-4">Rep</div>
          <div className="col-span-2">Zone</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-center">App</div>
          <div className="col-span-1 text-center">Today</div>
          <div className="col-span-1 text-right">Last seen</div>
        </div>
        <div className="max-h-[560px] overflow-y-auto divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-slate-400">No reps match this view.</div>
          ) : (
            filtered.map((r) => {
              const isLagging = r.onShift && (!r.lastSyncAt || now - new Date(r.lastSyncAt).getTime() > 3600000);
              return (
                <Link
                  key={r.id}
                  href={`/app/kanini-field/team/${r.id}`}
                  className="block md:grid grid-cols-12 items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <Avatar initials={initials(r.name)} variant={r.onShift ? "yellow" : "dark"} size="sm" />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-800 truncate flex items-center gap-1.5">
                        {r.name}
                        {r.onRoute && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">ON ROUTE</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{r.email}</div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">{r.zone || "—"}</span>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    {r.onShift ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {isLagging ? <SignalLow size={10} className="text-amber-500" /> : <Signal size={10} className="text-emerald-600" />}
                        {isLagging ? "SYNC LAG" : "ON SHIFT"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        <WifiOff size={10} /> OFFLINE
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 flex justify-center">
                    {r.appVersion ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Smartphone size={10} /> v{r.appVersion}{r.versionCode != null ? ` (${r.versionCode})` : ""}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400">—</span>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <div className="text-[13px] font-bold text-slate-800">{r.todayVisits}</div>
                    <div className="text-[10px] text-slate-400">{r.todayOrders > 0 ? `${r.todayOrders} orders` : "no orders"}</div>
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-1.5">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500">{timeAgo(r.lastSyncAt, now)}</div>
                      <div className="text-[9px] text-slate-400">{(r.lastOutcome || "idle").toLowerCase()}</div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[12px] font-semibold text-slate-800 flex items-center gap-2"><Activity size={14} className="text-teal-600" /> App version coverage</div>
          <div className="mt-3 space-y-2">
            {(() => {
              const byVersion = new Map<string, number>();
              reps.forEach((r) => { const k = r.appVersion ? `v${r.appVersion}` : "no version"; byVersion.set(k, (byVersion.get(k) || 0) + 1); });
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
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[12px] font-semibold text-slate-800 flex items-center gap-2"><MapPin size={14} className="text-teal-600" /> Live GPS pings</div>
          <div className="mt-3 space-y-2">
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
  );
}