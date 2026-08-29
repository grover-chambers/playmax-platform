"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Route as RouteIcon, Filter, ArrowLeft, MapPin, Users, Layers, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import dynamic from "next/dynamic";

const LeafletMapInner = dynamic(() => import("@/components/khel/leaflet-map-inner"), { ssr: false });

interface RouteItem {
  id: string;
  group_name: string;
  route_name: string;
  route_id: string;
  route_category: string;
  vehicle_type: string;
  rep_email: string;
  lead_email: string;
}

interface OutletPin {
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

interface RoutesData {
  routes: RouteItem[];
  groupStats: Record<string, { routeCount: number; repName: string; leadName: string }>;
  outletPins: OutletPin[];
  totalRoutes: number;
  totalOutlets: number;
}

const GROUPS = ["All", "A", "B", "C", "D", "E", "F", "G"];
const GROUP_COLORS: Record<string, string> = {
  A: "#047857",
  B: "#0369a1",
  C: "#7c3aed",
  D: "#c2410c",
  E: "#be185d",
  F: "#15803d",
  G: "#a16207",
};

export default function RoutesView() {
  const [group, setGroup] = useState("All");
  const [data, setData] = useState<RoutesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<OutletPin | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams();
        if (group !== "All") p.set("group", group);
        const res = await fetch(`/api/portal/khel/routes?${p}`);
        const j = await res.json();
        if (!cancel) setData(j);
      } catch {}
      if (!cancel) setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [group]);

  const grouped = useMemo(() => {
    if (!data) return {};
    const m: Record<string, RouteItem[]> = {};
    const routes = group === "All" ? data.routes : data.routes.filter((r) => r.group_name === group);
    for (const r of routes) {
      if (!m[r.group_name]) m[r.group_name] = [];
      m[r.group_name].push(r);
    }
    return m;
  }, [data, group]);

  if (loading && !data) return <div className="py-16 text-center text-[12px] text-gray-5">Loading routes…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-[11px] text-gray-5">
        <Link href="/portal/kanini" className="flex items-center gap-1 hover:text-teal">
          <ArrowLeft size={12} /> Level 0
        </Link>
        <span>›</span>
        <Link href="/portal/kanini/fleet" className="hover:text-teal">
          Level 1 Fleet
        </Link>
        <span>›</span>
        <span className="font-semibold text-teal flex items-center gap-1">
          <RouteIcon size={12} /> Level 2 Routes
        </span>
      </div>

      <div>
        <h1 className="font-display text-[18px] font-bold text-slate-800 flex items-center gap-2">
          <RouteIcon size={18} className="text-teal" /> Route Intelligence — Level 2
        </h1>
        <p className="text-[11px] text-gray-5 mt-1 max-w-3xl">
          Mirrors Nampark Level 2: route master + territory coverage. Source{" "}
          <span className="font-mono bg-slate-50 border px-1 rounded">routes_master</span> ×{" "}
          <span className="font-mono bg-slate-50 border px-1 rounded">outlets GPS</span> ward logic. Drill to{" "}
          <Link href="/portal/kanini/deliveries" className="text-teal hover:underline">
            Level 3 Deliveries
          </Link>{" "}
          for execution.
        </p>
      </div>

      <div className="pm-dash-card p-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-gray-5">
          <Filter size={12} /> Group
        </span>
        <div className="flex gap-1">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-pointer transition-colors ${
                group === g ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {g === "All" ? "All" : g}
            </button>
          ))}
        </div>
        <div className="ml-auto text-[11px] text-gray-5 font-mono">
          {data?.totalRoutes ?? 0} routes · {data?.totalOutlets ?? 0} pins
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1">
            <RouteIcon size={14} className="text-teal" />
            <span className="pm-dash-kl">Routes</span>
          </div>
          <div className="pm-dash-kn">{data?.totalRoutes ?? "—"}</div>
          <div className="pm-dash-ksub">{Object.keys(data?.groupStats ?? {}).length} groups</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1">
            <Layers size={14} className="text-amber-600" />
            <span className="pm-dash-kl">Outlets Mapped</span>
          </div>
          <div className="pm-dash-kn">{data?.totalOutlets?.toLocaleString() ?? "—"}</div>
          <div className="pm-dash-ksub">GPS-pinned</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-emerald-700" />
            <span className="pm-dash-kl">Crews</span>
          </div>
          <div className="pm-dash-kn">{data ? Object.keys(data.groupStats).length : "—"}</div>
          <div className="pm-dash-ksub">active groups</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={14} className="text-slate-600" />
            <span className="pm-dash-kl">Coverage</span>
          </div>
          <div className="pm-dash-kn">{data?.outletPins?.length ? `${Math.min(data.outletPins.length, 500)}` : "—"}</div>
          <div className="pm-dash-ksub">pins on map</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 pm-dash-card p-3 overflow-hidden">
          <div className="font-display text-[12px] font-semibold mb-2 flex items-center gap-1.5">
            <MapPin size={12} /> Territory Map
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white" style={{ height: 420 }}>
            {data?.outletPins?.length ? (
              <LeafletMapInner
                pins={data.outletPins.slice(0, 500).map((p) => ({
                  id: p.id,
                  name: p.name,
                  channel: p.channel ?? "",
                  type: p.type ?? "",
                  lat: Number(p.lat),
                  lng: Number(p.lng),
                  ward: p.ward ?? "",
                  constituency: p.constituency ?? "",
                  county: p.county ?? "",
                  size: p.size ?? "",
                }))}
                selectedGroup={group}
                onSelectPin={setSelectedPin as unknown as (pin: { id: string; name: string; channel: string; type: string; lat: number; lng: number; ward: string; constituency: string; county: string; size: string }) => void}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[12px] text-gray-5">No GPS pins for this group.</div>
            )}
          </div>
          <div className="mt-2 text-[10px] text-gray-5 font-mono">ward logic via assets/geo/territory_wards.json — as in Nice_OS TerritoryMap.</div>
        </div>
        <div className="pm-dash-card p-4 max-h-[460px] overflow-y-auto">
          <div className="font-display text-[13px] font-semibold mb-3">
            {group === "All" ? "All Routes" : `Group ${group} Routes`}
          </div>
          <div className="space-y-2">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([g, routes]) => {
                const stats = data?.groupStats[g];
                const isExp = expanded === g;
                return (
                  <div key={g} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpanded(isExp ? null : g)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: GROUP_COLORS[g] || "#666" }} />
                        <span className="text-[12px] font-semibold text-slate-800">Group {g}</span>
                        <span className="text-[10px] text-gray-5 font-mono">{routes.length} routes</span>
                      </div>
                      {isExp ? <ChevronUp size={14} className="text-gray-5" /> : <ChevronDown size={14} className="text-gray-5" />}
                    </button>
                    {isExp && (
                      <div className="px-3 pb-3 space-y-1.5">
                        {stats && (
                          <div className="text-[10px] text-gray-5 mb-2">
                            Rep: {stats.repName} · Lead: {stats.leadName}
                          </div>
                        )}
                        {routes.map((r) => (
                          <div key={r.id} className="flex items-start gap-2 px-2 py-1.5 rounded bg-slate-50">
                            <RouteIcon size={11} className="text-gray-5 mt-0.5" />
                            <div>
                              <div className="text-[11px] font-medium text-slate-800">{r.route_name}</div>
                              <div className="text-[10px] text-gray-5">
                                {r.route_category || r.route_id} · {r.vehicle_type || "N/A"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {selectedPin && (
        <div className="pm-dash-card p-5 border-l-4 border-l-teal-600">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display text-[14px] font-semibold">{selectedPin.name}</div>
              <div className="text-[12px] text-gray-5 mt-1">
                {selectedPin.channel || "N/A"} · {selectedPin.type || "N/A"} · {selectedPin.size || "N/A"}
              </div>
              <div className="text-[11px] text-gray-5">
                {selectedPin.ward}, {selectedPin.constituency}, {selectedPin.county}
              </div>
              <div className="text-[10px] text-gray-5 font-mono mt-1">
                GPS {Number(selectedPin.lat).toFixed(6)}, {Number(selectedPin.lng).toFixed(6)}
              </div>
            </div>
            <button onClick={() => setSelectedPin(null)} className="text-gray-5 hover:text-slate-800 cursor-pointer">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="pm-dash-card p-3 flex flex-wrap items-center justify-between gap-3 text-[11px]">
        <div className="text-gray-5">
          Drill:{" "}
          <Link href="/portal/kanini" className="text-teal hover:underline">
            Level 0
          </Link>{" "}
          ·{" "}
          <Link href="/portal/kanini/fleet" className="text-teal hover:underline">
            Level 1 Fleet
          </Link>{" "}
          · <span className="font-semibold text-teal">Level 2 Routes</span> ·{" "}
          <Link href="/portal/kanini/deliveries" className="text-teal hover:underline">
            Level 3 Deliveries →
          </Link>
        </div>
        <a
          href="https://nampark-rms-3cbt.vercel.app/performance"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal hover:underline flex items-center gap-1"
        >
          Nampark Performance <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
