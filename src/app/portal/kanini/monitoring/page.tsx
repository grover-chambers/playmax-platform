"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ArrowRight
} from "lucide-react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/layout/page-header";

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

interface MonitoringData {
  today: string;
  total: number;
  onShift: number;
  offShift: number;
  reps: RepStatus[];
  visits: Visit[];
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
  const [selectedRep, setSelectedRep] = useState<RepStatus | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const fetchMonitoring = async () => {
      try {
        const res = await fetch("/api/portal/khel/monitoring");
        const json = await res.json();
        setData(json);
        setCurrentTime(Date.now());
      } catch (err) {
        console.error("Monitoring fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMonitoring();
    const interval = setInterval(fetchMonitoring, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const pins = useMemo(() => {
    if (!data) return [];
    return data.reps
      .filter(r => r.lastGps)
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
        size: r.status
      })) as MapPinData[];
  }, [data]);

  const tickerEvents = useMemo(() => {
    if (!data) return [];
    return data.visits.slice(0, 10).map(v => {
      const rep = data.reps.find(r => r.id === v.rep_id);
      return {
        id: v.id,
        repName: rep?.name || "Unknown",
        action: v.outcome === "order" ? "placed an order" : "completed a visit",
        time: new Date(v.check_in_at || v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: v.order_value,
        status: v.status
      };
    });
  }, [data]);

  if (loading && !data) {
    return <div className="p-20 text-center"><Activity className="animate-spin inline mr-2"/> Loading War Room...</div>;
  }

  return (
    <div className="page-content space-y-6">
      <PageHeader
        title="Live Field Monitoring"
        subtitle="Real-time &apos;War Room&apos; for rep tracking and sync health"
        actions={
          <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
              <span className="text-[11px] font-bold text-slate-700">{data?.onShift} ON SHIFT</span>
            </div>
            <div className="w-px h-4 bg-slate-200"/>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-300"/>
              <span className="text-[11px] font-bold text-slate-500">{data?.offShift} OFFLINE</span>
            </div>
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
                  <button className="w-full mt-2 py-2 bg-teal-600 text-white text-[11px] font-bold rounded-lg hover:bg-teal-700 transition-colors">
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
              <div className="text-[10px] text-slate-400">Updates every 30s</div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {tickerEvents.map(event => (
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
          <div className="pm-dash-card p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <h3 className="text-[14px] font-bold mb-4 flex items-center gap-2">
              <Bell size={16} className="text-amber-400"/> Critical Alerts
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                <div className="text-[11px] font-bold text-amber-400 mb-1">Route Deviation</div>
                <div className="text-[10px] text-slate-300">Truck G-04 is currently 2km off-route in Gatundu North.</div>
              </div>
              <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                <div className="text-[11px] font-bold text-teal-400 mb-1">Batch Quota Met</div>
                <div className="text-[10px] text-slate-300">Group A has completed 95% of target outlets for this shift.</div>
              </div>
            </div>
          </div>

          <div className="pm-dash-card p-5">
            <h3 className="text-[13px] font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-teal-600"/> Distribution Summary
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-slate-500">Thika Nampak DC</span>
                  <span className="text-green-600 font-bold">STABLE</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-green-500"/>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-3">Top Performing Zones</div>
                <div className="space-y-2">
                  {['Thika CBD', 'Ruiru', 'Juja'].map(zone => (
                    <div key={zone} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-700">{zone}</span>
                      <div className="flex items-center gap-1 text-green-600 font-bold">
                        <TrendingUp size={10}/> 12%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button className="w-full p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors group">
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
