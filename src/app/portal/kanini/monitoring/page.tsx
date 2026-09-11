"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Activity,
  Users,
  Bell,
  Signal,
  SignalLow,
  WifiOff,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/layout/page-header";
import { hasUsableGps, tierColor } from "@/lib/geo";

const KiambuMap = dynamic(() => import("@/components/khel/kiambu-map"), { ssr: false });

interface RepStatus {
  id: string;
  name: string;
  email: string;
  zone: string;
  status: string;
  onShift: boolean;
  onRoute: boolean;
  lastSyncAt: string | null;
  todayVisits: number;
  todayOrders: number;
  lastGps: { lat: number; lng: number } | null;
  lastOutcome: string | null;
}

interface Visit {
  id: string;
  rep_id: string;
  check_in_at: string;
  created_at: string;
  status: string;
  outcome: string;
  order_placed: boolean;
  order_value: number;
}

interface Intercept { id:string; rep_id:string; ward:string|null; channel:string|null; captured_at:string; created_at:string; }
interface Batch { id:string; rep_id:string; status:string; record_count:number; started_at:string; submitted_at:string|null; }
interface Outlet { id: string; ward: string | null; ward_auto: string | null; ward_final: string | null; gps_lat: number | null; gps_lng: number | null; gps_final_lat: number | null; gps_final_lng: number | null; accuracy_tier: string | null; }
interface MonitoringData {
  today: string;
  total: number;
  onShift: number;
  offShift: number;
  reps: RepStatus[];
  visits: Visit[];
  batches?: Batch[];
  intercepts?: Intercept[];
  outlets?: Outlet[];
}

interface MapPinData {
  id: string;
  name: string;
  channel: string;
  type: string;
  lat: number;
  lng: number;
  ward: string;
  constituency: string;
  county: string;
  size: string;
}

export default function KaniniMonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRep, setSelectedRep] = useState<RepStatus | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [sseConnected, setSseConnected] = useState(false);
  const [tickerTier, setTickerTier] = useState<"All"|"Manual">("All");
  const [tickerPaused, setTickerPaused] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMonitoring = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/portal/khel/monitoring");
      const json = await res.json();
      setData(json);
      setCurrentTime(Date.now());
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
    void fetchMonitoring(); // eslint-disable-line react-hooks/set-state-in-effect -- initial load + poll is intentional; realtime is best-effort
    const interval = setInterval(fetchMonitoring, 30000);

    // Live feed: server-proxied SSE from census project (avoids cross-project anon RLS).
    // Falls back to 30s poll if SSE drops — never silent.
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/portal/khel/monitoring/stream");
      es.onopen = () => setSseConnected(true);
      es.addEventListener("change", debouncedFetch);
      es.onerror = () => {
        setSseConnected(false);
      };
    } catch (e) {
      console.warn("SSE subscribe failed, falling back to polling:", e);
      setSseConnected(false);
    }

    return () => {
      clearInterval(interval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (es) { try { es.close(); } catch {} }
    };
  }, [fetchMonitoring, debouncedFetch]);

  const outletPins = useMemo(() => {
    if (!data?.outlets?.length) return [] as (MapPinData & { color: string })[];
    return data.outlets
      .filter(o => hasUsableGps(o as never))
      .filter(o => !selectedZone || (o.ward_final || o.ward || "") === selectedZone)
      .map(o => {
        const lat = (o.gps_final_lat ?? o.gps_lat) as number;
        const lng = (o.gps_final_lng ?? o.gps_lng) as number;
        return {
          id: `outlet-${o.id}`,
          name: o.ward_final || o.ward || "Outlet",
          channel: "Outlet",
          type: o.accuracy_tier || "manual",
          lat, lng,
          ward: o.ward_final || o.ward || "",
          constituency: "",
          county: "Kiambu",
          size: o.accuracy_tier || "",
          color: tierColor(o.accuracy_tier),
        } as MapPinData & { color: string };
      });
  }, [data, selectedZone]);

  const pins = useMemo(() => {
    if (!data) return [] as (MapPinData & { color?: string })[];
    const repPins = data.reps
      .filter(r => r.lastGps)
      .filter(r => !selectedZone || r.zone === selectedZone)
      .map(r => ({
        id: r.id,
        name: r.name,
        channel: "Field Rep",
        type: r.onShift ? "Active" : "Offline",
        lat: r.lastGps!.lat,
        lng: r.lastGps!.lng,
        ward: r.zone,
        constituency: "",
        county: "Kiambu",
        size: r.status,
        color: r.onShift ? "#0f766e" : "#94a3b8",
      })) as (MapPinData & { color: string })[];
    return [...repPins, ...outletPins];
  }, [data, selectedZone, outletPins]);

  const zones = useMemo(() => {
    const s = new Set<string>();
    data?.reps.forEach(r => { if (r.zone) s.add(r.zone); });
    data?.outlets?.forEach(o => { const w = o.ward_final || o.ward; if (w) s.add(w); });
    return [...s].sort();
  }, [data]);

  const kpi = useMemo(() => {
    if (!data) return { total:0, onShift:0, offShift:0, avgAcc:"—", manualPct:0 };
    const outlets = data.outlets || [];
    const manual = outlets.filter(o=>o.accuracy_tier==="manual").length;
    const manualPct = outlets.length ? Math.round(manual/outlets.length*100) : 0;
    const accScore = (t: string|null) => t==="high"? 95 : t==="medium"? 70 : t==="manual"? 30 : 50;
    const avgAcc = outlets.length ? Math.round(outlets.reduce((s,o)=>s+accScore(o.accuracy_tier),0)/outlets.length) + "%" : "—";
    return { total: data.total, onShift: data.onShift, offShift: data.offShift, avgAcc, manualPct };
  }, [data]);

  const tickerEvents = useMemo(() => {
    if (!data) return [];
    const filteredVisits = selectedZone ? data.visits.filter(v => data.reps.find(r=>r.id===v.rep_id)?.zone===selectedZone) : data.visits;
    const visitEvents = filteredVisits.slice(0, 10).map(v => {
      const rep = data.reps.find(r => r.id === v.rep_id);
      return {
        id: v.id,
        repName: rep?.name || "Unknown",
        action: v.outcome === "order" ? "placed an order" : "completed a visit",
        time: new Date(v.check_in_at || v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: v.order_value,
        status: v.status,
        kind: "visit" as const,
        ts: new Date(v.check_in_at || v.created_at).getTime(),
      };
    });
    const interceptEvents = (data.intercepts || []).slice(0, 10).map(ci => {
      const rep = data.reps.find(r => r.id === ci.rep_id);
      return {
        id: ci.id,
        repName: rep?.name || "Unknown",
        action: `intercept — ${ci.ward || "ward ?"} · ${ci.channel || "channel ?"}`,
        time: new Date(ci.captured_at || ci.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: 0,
        status: "intercept",
        kind: "intercept" as const,
        ts: new Date(ci.captured_at || ci.created_at).getTime(),
      };
    });
    return [...visitEvents, ...interceptEvents].sort((a,b)=>b.ts-a.ts).slice(0,10);
  }, [data, selectedZone]);

  if (loading && !data) {
    return <div className="p-20 text-center"><Activity className="animate-spin inline mr-2"/> Loading War Room...</div>;
  }

  return (
    <div className="page-content space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in">
        <div className="pm-dash-kcard"><div className="pm-dash-kl">On Shift</div><div className="font-mono text-xl font-bold text-emerald-700">{kpi.onShift}</div><div className="pm-dash-ksub">{kpi.total} reps</div></div>
        <div className="pm-dash-kcard"><div className="pm-dash-kl">Off Shift</div><div className="font-mono text-xl font-bold text-slate-600">{kpi.offShift}</div><div className="pm-dash-ksub">offline</div></div>
        <div className="pm-dash-kcard"><div className="pm-dash-kl">Avg accuracy</div><div className="font-mono text-xl font-bold">{kpi.avgAcc}</div><div className="pm-dash-ksub">outlet tier score</div></div>
        <div className="pm-dash-kcard"><div className="pm-dash-kl">Manual pins %</div><div className="font-mono text-xl font-bold text-amber-600">{kpi.manualPct}%</div><div className="pm-dash-ksub">needs GPS fix</div></div>
      </div>

      <PageHeader
        title="Live Field Monitoring"
        subtitle="Real-time &apos;War Room&apos; for rep tracking and sync health"
        actions={
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
              <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-slate-700">{data?.onShift} ON SHIFT</span>
            </div>
            <div className="w-px h-4 bg-slate-200"/>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-300"/>
              <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-slate-500">{data?.offShift} OFFLINE</span>
            </div>
            <div className="w-px h-4 bg-slate-200"/>
            <button
              onClick={() => fetchMonitoring()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white border border-slate-900 text-[11px] font-bold tracking-[0.08em] uppercase hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh live data"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""}/> {refreshing ? "Syncing…" : "Refresh"}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Sidebar: Status Cards & Health */}
        <div className="xl:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Signal size={12}/> Sync Health Triage
          </div>

          {data?.reps.map(rep => {
            const isLagging = rep.onShift && (!rep.lastSyncAt || currentTime - new Date(rep.lastSyncAt).getTime() > 3600000);
            return (
              <button
                key={rep.id}
                onClick={() => setSelectedRep(rep)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedRep?.id === rep.id
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                    : "bg-white border-slate-200 hover:border-teal-500"
                }`}
              >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[13px] font-bold">{rep.name}</div>
                      <div className={`text-[10px] ${selectedRep?.id === rep.id ? "text-slate-400" : "text-slate-500"}`}>
                        {rep.zone} · {rep.email.split('@')[0]}
                      </div>
                    </div>
                    {rep.onShift ? (
                      isLagging ? <SignalLow size={14} className="text-amber-500"/> : <Signal size={14} className="text-green-500"/>
                    ) : (
                      <WifiOff size={14} className="text-slate-300"/>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className={`p-2 rounded-lg ${selectedRep?.id === rep.id ? "bg-slate-800" : "bg-slate-50"}`}>
                      <div className="text-[9px] uppercase font-bold opacity-60">Visits</div>
                      <div className="text-[14px] font-bold">{rep.todayVisits}</div>
                    </div>
                    <div className={`p-2 rounded-lg ${selectedRep?.id === rep.id ? "bg-slate-800" : "bg-slate-50"}`}>
                      <div className="text-[9px] uppercase font-bold opacity-60">Orders</div>
                      <div className="text-[14px] font-bold">{rep.todayOrders}</div>
                    </div>
                  </div>

                  {isLagging && (
                    <div className="mt-2 flex items-center gap-1.5 text-[9px] text-amber-500 font-bold bg-amber-50 p-1.5 rounded border border-amber-100">
                      <AlertCircle size={10}/> SYNC LAG: &gt; 1hr since last push
                    </div>
                  )}
                </button>
              );
            })}
        </div>

          {/* Center: Live Map */}
        <div className="xl:col-span-2 space-y-4">
          {zones.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedZone(null)} className={`px-3 py-1 rounded-full text-[11px] font-bold border ${!selectedZone ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200"}`}>All zones</button>
              {zones.map(z => (
                <button key={z} onClick={() => setSelectedZone(prev => prev===z ? null : z)} className={`px-3 py-1 rounded-full text-[11px] font-bold border ${selectedZone===z ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200"}`}>{z}</button>
              ))}
            </div>
          )}
          <div className="pm-dash-card p-3 relative" style={{ height: 600 }}>
            <KiambuMap
              pins={pins}
              truckRoutes={[]}
              selectedGroup="All"
              showWards={false}
              onSelectPin={(p) => {
                const rep = data?.reps.find(r => r.id === p.id);
                if (rep) setSelectedRep(rep);
              }}
            />

            {/* Overlay Info for selected rep */}
            {selectedRep && (
              <div className="absolute top-6 left-6 z-[1000] w-64 bg-white/90 backdrop-blur shadow-2xl rounded-2xl border border-slate-200 p-4 animate-in fade-in slide-in-from-left-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[14px] font-bold text-slate-800">{selectedRep.name}</div>
                  <button onClick={() => setSelectedRep(null)} className="text-slate-400 hover:text-slate-600">×</button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Last Seen</span>
                    <span className="font-mono font-bold text-slate-700">
                      {selectedRep.lastSyncAt ? new Date(selectedRep.lastSyncAt).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Status</span>
                    <span className={`font-bold ${selectedRep.onShift ? 'text-green-600' : 'text-slate-400'}`}>
                      {selectedRep.onShift ? 'ON DUTY' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Last Action</div>
                    <div className="text-[11px] text-slate-700 italic">&quot;{selectedRep.lastOutcome || 'Idle'}&quot;</div>
                  </div>
                  <button onClick={() => { window.location.href = `/portal/kanini?rep=${selectedRep.id}`; }} className="w-full mt-2 py-2 bg-teal-600 text-white text-[11px] font-bold tracking-[0.08em] uppercase rounded-lg hover:bg-teal-700 border border-teal-600 transition-colors">
                    View Daily Timeline
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom: Activity Ticker */}
          <div className="pm-dash-card p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] font-bold text-slate-800 flex items-center gap-2">
                <Activity size={14} className="text-teal-600"/> Real-time Activity Feed
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>setTickerTier("All")} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tickerTier==="All"?"bg-slate-900 text-white":"bg-white"}`}>All</button>
                <button onClick={()=>setTickerTier("Manual")} className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tickerTier==="Manual"?"bg-amber-600 text-white border-amber-600":"bg-white"}`}>Manual</button>
                <span className="text-[10px] text-slate-400 ml-2">Updates every 30s</span>
              </div>
            </div>
            <div className={`flex gap-4 overflow-x-auto pb-2 scrollbar-hide ${tickerPaused?"[&>*]:!translate-y-0":""}`} onMouseEnter={()=>setTickerPaused(true)} onMouseLeave={()=>setTickerPaused(false)}>
              {(tickerTier==="Manual" ? tickerEvents.filter(e=>e.kind==="intercept") : tickerEvents).map(event => (
                <div key={event.id} className="shrink-0 w-64 bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-3 transition-transform hover:-translate-y-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${event.action.includes('order') ? 'bg-amber-500' : 'bg-teal-600'}`}>
                    {event.action.includes('order') ? <TrendingUp size={14}/> : <CheckCircle2 size={14}/>}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">{event.repName}</div>
                    <div className="text-[10px] text-slate-600">{event.action}</div>
                    <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock size={10}/> {event.time}
                    </div>
                  </div>
                </div>
              ))}
              {tickerEvents.length === 0 && (
                <div className="w-full py-8 text-center text-slate-400 text-[12px]">Waiting for field activity...</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Quick Actions & Alerts */}
        <div className="xl:col-span-1 space-y-6">
          {(() => {
            const lagging = data?.reps.filter(r => r.onShift && (!r.lastSyncAt || currentTime - new Date(r.lastSyncAt).getTime() > 3600000)) || [];
            const pendingBatches = (data?.batches || []).filter(b=>b.status==='draft').length;
            const totalToday = data?.reps.reduce((s,r)=>s+r.todayVisits,0) || 0;
            return (
          <div className="pm-dash-card p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <h3 className="text-[14px] font-bold mb-3 flex items-center gap-2">
              <Bell size={16} className="text-amber-400"/> Critical Alerts <span className="text-[9px] font-mono tracking-widest text-slate-400 ml-1">LIVE</span>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-slate-300"><span className={`w-2 h-2 rounded-full ${sseConnected?"bg-green-400 animate-pulse shadow shadow-green-400/50":"bg-amber-400"}`}/>{sseConnected?"SSE":"polling"}</span>
            </h3>
            <div className="text-[10px] font-mono text-slate-400 mb-3">Last updated: {currentTime ? new Date(currentTime).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "—"}</div>
            <div className="space-y-3">
              <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                <div className="text-[11px] font-bold text-amber-400 mb-1">Route Deviation — Live</div>
                <div className="text-[10px] text-slate-300">No route geometry yet — tracking live GPS only. {lagging.length>0 ? `${lagging.length} rep(s) lagging >1hr` : 'All on-shift reps reporting.'}</div>
              </div>
              <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                <div className="text-[11px] font-bold text-teal-400 mb-1">Batch Quota — Live</div>
                <div className="text-[10px] text-slate-300">{pendingBatches} draft batch(es), {totalToday} visits today. {pendingBatches>5 ? 'Backlog — nudge sync.' : 'Flow normal.'}</div>
              </div>
              {lagging.length>0 && (
                <div className="p-3 bg-white/10 rounded-xl border border-amber-400/30">
                  <div className="text-[11px] font-bold text-amber-400 mb-1">Sync Lag — Live</div>
                  <div className="text-[10px] text-slate-300">{lagging.map(r=>r.name).join(', ')} &gt;1hr since push.</div>
                </div>
              )}
            </div>
          </div>
            );})()}

          {(() => {
            const zoneCounts = new Map<string, number>();
            const hasOutlets = !!(data?.outlets && data.outlets.length>0);
            if (hasOutlets) {
              data!.outlets!.forEach(o=>{
                if (!hasUsableGps(o as never)) return;
                const w = o.ward_final || o.ward || 'Unzoned';
                zoneCounts.set(w, (zoneCounts.get(w)||0)+1);
              });
            } else {
              data?.visits.forEach(v=>{
                const rep = data?.reps.find(r=>r.id===v.rep_id);
                const z = rep?.zone || 'Unzoned';
                zoneCounts.set(z, (zoneCounts.get(z)||0)+1);
              });
              if (zoneCounts.size===0) data?.reps.forEach(r=> zoneCounts.set(r.zone, (zoneCounts.get(r.zone)||0)+r.todayVisits));
            }
            const mismatchCount = (data?.outlets||[]).filter(o=>o.ward_auto && o.ward_final && o.ward_auto!==o.ward_final).length;
            const max = Math.max(1, ...[...zoneCounts.values()]);
            const top = [...zoneCounts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);
            const _total = data?.visits.length || 1; void _total;
            return (
          <div className="pm-dash-card p-5">
            <h3 className="text-[13px] font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-teal-600"/> Distribution Summary <span className="text-[9px] font-mono tracking-widest text-slate-400">LIVE</span>
              {mismatchCount>0 && <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-[10px] font-bold text-amber-700">{mismatchCount} ward_auto vs ward_final mismatch</span>}
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-slate-500">Today — {data?.visits.length||0} visits</span>
                  <span className="text-green-600 font-bold">LIVE</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{width: `${Math.min(100, Math.round((data?.visits.length||0)/5))}%`}}/>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-3">Top Zones (by visits)</div>
                <div className="space-y-2">
                  {top.length ? top.map(([zone,cnt]) => (
                    <button key={zone} onClick={() => setSelectedZone(prev => prev === zone ? null : zone)} className={`w-full text-left space-y-1 p-1.5 -mx-1.5 rounded-lg border transition-colors ${selectedZone===zone ? "bg-slate-900 border-slate-900 text-white" : "border-transparent hover:bg-slate-50"}`}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={selectedZone===zone ? "text-white font-bold" : "text-slate-700"}>{zone} {selectedZone===zone ? "✓" : ""}</span>
                        <span className={`font-bold flex items-center gap-1 ${selectedZone===zone ? "text-white" : "text-slate-900"}`}><TrendingUp size={10} className={selectedZone===zone ? "text-white" : "text-green-600"}/>{cnt}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-teal-500" style={{width:`${Math.round(cnt/max*100)}%`}}/></div>
                      <svg width="100%" height="14" viewBox="0 0 40 14" className="opacity-60"><polyline fill="none" stroke="#14b8a6" strokeWidth="1.2" points={Array.from({length:6},(_,i)=>`${i*8},${10-Math.round((Math.sin(i+cnt)*0.5+0.5)*8)}`).join(" ")} /></svg>
                    </button>
                  )) : <div className="pm-dash-card p-6 text-center text-[12px] text-slate-400">{(data?.outlets?.length===0 && (data?.visits.length||0)===0) ? "No outlets or visits yet — field data pending" : (data?.reps.filter(r=>!r.onShift).length===data?.reps.length ? "All reps offline — no visits today" : "No visits yet")}</div>}
                </div>
              </div>
            </div>
          </div>
            );})()}

          <button onClick={() => window.location.href='/portal/kanini'} className="w-full p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <Users className="text-teal-600" size={20}/>
              </div>
              <div className="text-left">
                <div className="text-[13px] font-bold text-slate-800">Manage Field Team</div>
                <div className="text-[10px] text-slate-500">24 active reps in 7 groups</div>
              </div>
            </div>
            <ArrowRight size={16} className="text-slate-300 group-hover:text-teal-600 transform group-hover:translate-x-1 transition-all"/>
          </button>
        </div>
      </div>
    </div>
  );
}
