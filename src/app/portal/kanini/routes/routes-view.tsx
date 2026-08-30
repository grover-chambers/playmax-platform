"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Route as RouteIcon,
  Filter,
  ArrowLeft,
  MapPin,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Truck,
  Clock,
  Navigation,
  Map as MapIcon,
} from "lucide-react";
import dynamic from "next/dynamic";

const KaniniTruckRouteMap = dynamic(() => import("@/components/khel/kanini-truck-route-map"), { ssr: false });

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

type TabKey = "map" | "trucks" | "territory" | "list";

function fmtTime(minutesFrom0600: number) {
  const total = 6 * 60 + minutesFrom0600;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function RoutesView() {
  const [group, setGroup] = useState("All");
  const [data, setData] = useState<RoutesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<OutletPin | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("map");
  const [showWards, setShowWards] = useState(true);

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

  // ── Truck routes derived from outlet pins (borrowed from Kanini Field TerritoryMap) ──
  const truckRoutes = useMemo(() => {
    if (!data?.routes?.length) return [] as { id: string; name: string; group: string; vehicle: string; points: [number, number][]; color: string }[];
    const visibleRoutes = group === "All" ? data.routes : data.routes.filter((r) => r.group_name === group);
    const pins = data.outletPins.slice(0, 500);
    if (pins.length === 0) {
      return visibleRoutes.slice(0, 12).map((r, i) => ({
        id: r.id,
        name: r.route_name,
        group: r.group_name,
        vehicle: r.vehicle_type || "Pickup",
        points: [
          [-1.29 + (i % 5) * 0.04, 36.82 + (i % 5) * 0.04],
          [-1.31 + (i % 5) * 0.04, 36.84 + (i % 5) * 0.04],
        ] as [number, number][],
        color: GROUP_COLORS[r.group_name] || "#047857",
      }));
    }
    const sorted = [...pins].sort((a, b) => a.lat - b.lat || a.lng - b.lng);
    const chunk = Math.max(3, Math.floor(sorted.length / Math.max(1, visibleRoutes.length)) || 6);
    return visibleRoutes.slice(0, 24).map((r, idx) => {
      const start = (idx * chunk) % sorted.length;
      const slice: OutletPin[] = [];
      for (let j = 0; j < Math.min(8, chunk); j++) slice.push(sorted[(start + j) % sorted.length]);
      const gIdx = GROUPS.indexOf(r.group_name);
      const depotLat = -1.28 + (gIdx >= 0 ? (gIdx % 4) * 0.06 : idx * 0.02);
      const depotLng = 36.78 + (gIdx >= 0 ? Math.floor(gIdx / 4) * 0.08 : idx * 0.015);
      const points: [number, number][] = [[depotLat, depotLng], ...slice.map((p) => [p.lat, p.lng] as [number, number])];
      return {
        id: r.id,
        name: r.route_name,
        group: r.group_name,
        vehicle: r.vehicle_type || "Van",
        points,
        color: GROUP_COLORS[r.group_name] || "#047857",
      };
    });
  }, [data, group]);

  if (loading && !data) return <div className="py-16 text-center text-[12px] text-gray-5">Loading routes…</div>;

  const tabDefs: { key: TabKey; label: string; icon: typeof MapIcon; desc: string }[] = [
    { key: "map", label: "Overview Map", icon: MapIcon, desc: "Pins + truck polylines" },
    { key: "trucks", label: "Truck Routes", icon: Truck, desc: "Vehicles & schedules" },
    { key: "territory", label: "Territory", icon: Layers, desc: "Wards (Kanini Field)" },
    { key: "list", label: "Route List", icon: RouteIcon, desc: "Grouped routes" },
  ];

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
          <RouteIcon size={12} /> Level 2 Mapping &amp; Routing
        </span>
      </div>

      <div>
        <h1 className="font-display text-[18px] font-bold text-slate-800 flex items-center gap-2">
          <RouteIcon size={18} className="text-teal" /> Mapping &amp; Routing — Level 2
        </h1>
        <p className="text-[11px] text-gray-5 mt-1 max-w-3xl">
          Borrowed from <span className="font-semibold text-slate-700">Kanini Field</span> TerritoryMap: ward polygons from{" "}
          <span className="font-mono bg-slate-50 border px-1 rounded">/geo/territory_wards.json</span> + outlet GPS + truck route polylines. Trucks are highlighted per route — select a truck to focus its path. Source{" "}
          <span className="font-mono bg-slate-50 border px-1 rounded">routes_master</span> ×{" "}
          <span className="font-mono bg-slate-50 border px-1 rounded">outlets GPS</span>. Drill to{" "}
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
              onClick={() => {
                setGroup(g);
                setSelectedRouteId(null);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-pointer transition-colors ${
                group === g ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {g === "All" ? "All" : g}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-gray-5 font-mono">
          <span>{data?.totalRoutes ?? 0} routes</span>
          <span>{data?.totalOutlets ?? 0} pins</span>
          <span>{truckRoutes.length} truck paths</span>
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
            <Truck size={14} className="text-emerald-700" />
            <span className="pm-dash-kl">Trucks / Vehicles</span>
          </div>
          <div className="pm-dash-kn">{truckRoutes.length}</div>
          <div className="pm-dash-ksub">polylines on map</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={14} className="text-slate-600" />
            <span className="pm-dash-kl">Wards</span>
          </div>
          <div className="pm-dash-kn">93</div>
          <div className="pm-dash-ksub">territory_wards.json</div>
        </div>
      </div>

      {/* ── Internal tabs: mapping & routing sub-navigation ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabDefs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                active ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon size={13} /> {t.label}
              <span className={`hidden sm:inline text-[10px] ${active ? "text-white/70" : "text-gray-5"}`}>· {t.desc}</span>
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2 pl-2">
          <label className="flex items-center gap-1.5 text-[11px] text-gray-5 cursor-pointer">
            <input type="checkbox" checked={showWards} onChange={(e) => setShowWards(e.target.checked)} className="rounded border-slate-300" />
            Wards
          </label>
          <span className="text-[10px] font-mono text-gray-5 hidden lg:inline">Kanini Field TerritoryMap</span>
        </div>
      </div>

      {/* ── Map + context panel (shared across tabs, content varies) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 pm-dash-card p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="font-display text-[12px] font-semibold flex items-center gap-1.5">
              {activeTab === "trucks" ? <><Truck size={12} /> Truck Routes — highlighted paths</> : activeTab === "territory" ? <><Layers size={12} /> Territory Wards + Outlets</> : <><MapPin size={12} /> Mapping &amp; Routing — Map</>}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-5">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#047857]" /> Kanini Field</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Trucks: solid · others: dashed</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white" style={{ height: 520 }}>
            {data?.outletPins?.length ? (
              <KaniniTruckRouteMap
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
                truckRoutes={truckRoutes}
                selectedRouteId={selectedRouteId}
                selectedGroup={group}
                showWards={showWards}
                onSelectPin={setSelectedPin as unknown as (pin: OutletPin) => void}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[12px] text-gray-5">No GPS pins for this group.</div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-5 font-mono">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#047857]" /> Depot</span>
            <span className="flex items-center gap-1">🚚 Truck head = route start</span>
            <span className="hidden sm:inline">· Polyline = truck path (depot → outlets in lat order)</span>
            <span className="ml-auto">ward logic via /geo/territory_wards.json — Kanini Field TerritoryMap</span>
          </div>
        </div>

        <div className="space-y-4 max-h-[560px] overflow-y-auto">
          {activeTab === "map" && (
            <div className="pm-dash-card p-4">
              <div className="font-display text-[13px] font-semibold mb-3 flex items-center gap-1.5">
                <Navigation size={14} /> Routes by Group
              </div>
              <div className="space-y-2">
                {Object.entries(grouped)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([g, routes]) => {
                    const stats = data?.groupStats[g];
                    const isExp = expanded === g;
                    const isGroupSelected = group === g;
                    return (
                      <div key={g} className={`border rounded-lg overflow-hidden ${isGroupSelected ? "border-teal-600 ring-1 ring-teal-600/20" : "border-slate-200"}`}>
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
                            {stats && <div className="text-[10px] text-gray-5 mb-2">Rep: {stats.repName} · Lead: {stats.leadName}</div>}
                            {routes.map((r) => {
                              const isSel = selectedRouteId === r.id;
                              return (
                                <button
                                  key={r.id}
                                  onClick={() => setSelectedRouteId(isSel ? null : r.id)}
                                  className={`w-full text-left flex items-start gap-2 px-2 py-1.5 rounded border cursor-pointer transition-colors ${isSel ? "bg-teal-50 border-teal-200" : "bg-slate-50 border-transparent hover:border-slate-200"}`}
                                >
                                  <Truck size={11} className={`mt-0.5 shrink-0 ${isSel ? "text-teal-600" : "text-gray-5"}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-[11px] font-medium truncate ${isSel ? "text-teal-800" : "text-slate-800"}`}>{r.route_name}</div>
                                    <div className="text-[10px] text-gray-5 truncate">{r.route_category || r.route_id} · {r.vehicle_type || "N/A"}</div>
                                  </div>
                                  {isSel && <span className="text-[9px] font-mono bg-teal-600 text-white px-1 py-0.5 rounded">TRUCK</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              <div className="mt-3 text-[10px] text-gray-5">Tap a route to highlight its truck path (solid polyline). Tap again to clear.</div>
            </div>
          )}

          {activeTab === "trucks" && (
            <div className="pm-dash-card p-4">
              <div className="font-display text-[13px] font-semibold mb-3 flex items-center gap-1.5">
                <Truck size={14} /> Truck Schedule
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {truckRoutes.map((t, idx) => {
                  const isSel = selectedRouteId === t.id;
                  const departure = fmtTime(idx * 14);
                  const eta = fmtTime(idx * 14 + t.points.length * 9);
                  const stops = t.points.length - 1;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedRouteId(isSel ? null : t.id)}
                      className={`w-full text-left border rounded-lg p-3 cursor-pointer transition-all ${isSel ? "bg-teal-600 text-white border-teal-600 shadow" : "bg-white border-slate-200 hover:border-slate-300"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className={`text-[12px] font-semibold ${isSel ? "text-white" : "text-slate-800"}`}>{t.name}</div>
                          <div className={`text-[11px] ${isSel ? "text-white/80" : "text-gray-5"}`}>
                            Group {t.group} · {t.vehicle} · {stops} stops
                          </div>
                        </div>
                        <div className={`w-2 h-2 rounded-full mt-1 ${isSel ? "bg-white" : ""}`} style={!isSel ? { background: t.color } : undefined} />
                      </div>
                      <div className={`mt-2 flex items-center gap-3 text-[11px] font-mono ${isSel ? "text-white/90" : "text-slate-600"}`}>
                        <span className="flex items-center gap-1"><Clock size={11} /> {departure}</span>
                        <span>→</span>
                        <span>{eta} ETA</span>
                        <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${isSel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{t.points.length} pts</span>
                      </div>
                      <div className={`mt-1 text-[10px] ${isSel ? "text-white/70" : "text-gray-5"}`}>Depot → {stops} outlets in lat order · {t.color}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 text-[10px] text-gray-5 font-mono">Departures staggered 14min; ETA = departure + 9min/stop. Highlight to see polyline.</div>
            </div>
          )}

          {activeTab === "territory" && (
            <div className="pm-dash-card p-4">
              <div className="font-display text-[13px] font-semibold mb-3 flex items-center gap-1.5">
                <Layers size={14} /> Territory Wards
              </div>
              <div className="text-[11px] text-gray-5 mb-3">93 wards from Kanini Field `territory_wards.json`. Toggle Wards above to show boundaries. Each ward groups outlets for route planning.</div>
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {Array.from(new Set(data?.outletPins.map((p) => p.ward).filter(Boolean) || [])).slice(0, 24).map((ward) => {
                  const count = data?.outletPins.filter((p) => p.ward === ward).length ?? 0;
                  return (
                    <div key={ward} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[12px] font-medium text-slate-700">{ward}</span>
                      <span className="text-[11px] font-mono text-slate-600">{count} outlets</span>
                    </div>
                  );
                })}
                {(!data?.outletPins.length || !Array.from(new Set(data.outletPins.map((p) => p.ward))).length) && (
                  <div className="text-[12px] text-gray-5">No ward data for this group.</div>
                )}
              </div>
              <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800">Borrowed from Kanini Field: ward polygons are the same GeoJSON the field app uses for outlet assignment.</div>
            </div>
          )}

          {activeTab === "list" && (
            <div className="pm-dash-card p-4">
              <div className="font-display text-[13px] font-semibold mb-3">
                {group === "All" ? "All Routes" : `Group ${group} Routes`} · List
              </div>
              <div className="space-y-2">
                {Object.entries(grouped)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([g, routes]) => {
                    const stats = data?.groupStats[g];
                    const isExp = expanded === g;
                    return (
                      <div key={g} className="border border-slate-200 rounded-lg overflow-hidden">
                        <button onClick={() => setExpanded(isExp ? null : g)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: GROUP_COLORS[g] || "#666" }} />
                            <span className="text-[12px] font-semibold text-slate-800">Group {g}</span>
                            <span className="text-[10px] text-gray-5 font-mono">{routes.length} routes</span>
                          </div>
                          {isExp ? <ChevronUp size={14} className="text-gray-5" /> : <ChevronDown size={14} className="text-gray-5" />}
                        </button>
                        {isExp && (
                          <div className="px-3 pb-3 space-y-1.5">
                            {stats && <div className="text-[10px] text-gray-5 mb-2">Rep: {stats.repName} · Lead: {stats.leadName}</div>}
                            {routes.map((r) => (
                              <div key={r.id} className="flex items-start gap-2 px-2 py-1.5 rounded bg-slate-50">
                                <RouteIcon size={11} className="text-gray-5 mt-0.5" />
                                <div>
                                  <div className="text-[11px] font-medium text-slate-800">{r.route_name}</div>
                                  <div className="text-[10px] text-gray-5">{r.route_category || r.route_id} · {r.vehicle_type || "N/A"}</div>
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
          )}
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
              {selectedRouteId && (
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded">
                  <Truck size={11} /> On truck route {truckRoutes.find((t) => t.id === selectedRouteId)?.name ?? selectedRouteId.slice(0, 6)}
                </div>
              )}
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
          · <span className="font-semibold text-teal">Level 2 Mapping</span> ·{" "}
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
