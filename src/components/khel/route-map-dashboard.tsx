"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Route, Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import dynamic from "next/dynamic";

const LeafletMapInner = dynamic(() => import("./leaflet-map-inner"), { ssr: false });

interface RouteItem {
  id: string;
  route_id: string;
  route_name: string;
  group_name: string;
  rep_email: string;
  lead_email: string;
  rep_name: string;
  lead_name: string;
  vehicle_type: string;
  driver_name: string;
  driver_phone: string;
  contact_person: string;
  contact_phone: string;
  route_category: string;
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

export default function RouteMapDashboard({ projectId }: { projectId: string }) {
  void projectId; // used for future scoping
  const [data, setData] = useState<RoutesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<string>("All");
  const [selectedPin, setSelectedPin] = useState<OutletPin | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (group !== "All") params.set("group", group);
        const res = await fetch(`/api/portal/khel/routes?${params}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [group]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-teal" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pm-dash-card p-8 text-center">
        <div className="text-[13px] text-gray-4">No route data available</div>
      </div>
    );
  }

  const displayRoutes = group === "All" ? data.routes : data.routes.filter((r) => r.group_name === group);
  const groupedRoutes: Record<string, RouteItem[]> = {};
  for (const r of displayRoutes) {
    if (!groupedRoutes[r.group_name]) groupedRoutes[r.group_name] = [];
    groupedRoutes[r.group_name].push(r);
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={14} className="text-gray-4" />
        <span className="text-[11px] text-gray-5 font-mono uppercase tracking-wider">Group</span>
        <div className="flex gap-1.5">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                group === g
                  ? "bg-[#047857] text-white"
                  : "bg-[var(--ws-bg)] border border-[var(--ws-border)] text-gray-4 hover:text-[var(--ws-text)]"
              }`}
            >
              {g === "All" ? "All Groups" : `Group ${g}`}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4 text-[11px] text-gray-4 font-mono">
          <span>{data.totalRoutes} routes</span>
          <span>{data.totalOutlets} outlets</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 pm-dash-card p-3 overflow-hidden">
          <LeafletMapInner
            pins={data.outletPins}
            selectedGroup={group}
            onSelectPin={setSelectedPin}
          />
        </div>

        {/* Route list sidebar */}
        <div className="pm-dash-card p-4 max-h-[600px] overflow-y-auto">
          <div className="font-display text-[13px] font-semibold mb-4">
            {group === "All" ? "All Routes" : `Group ${group} Routes`}
          </div>
          <div className="space-y-2">
            {Object.entries(groupedRoutes)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([g, routes]) => {
                const stats = data.groupStats[g];
                const isExpanded = expandedGroup === g;
                return (
                  <div key={g} className="border border-[var(--ws-border)] rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedGroup(isExpanded ? null : g)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--ws-bg)] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ background: GROUP_COLORS[g] || "#666" }}
                        />
                        <span className="text-[12px] font-semibold text-[var(--ws-text)]">
                          Group {g}
                        </span>
                        <span className="text-[10px] text-gray-5 font-mono">
                          {routes.length} routes
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp size={14} className="text-gray-5" /> : <ChevronDown size={14} className="text-gray-5" />}
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-1.5">
                        {stats && (
                          <div className="text-[10px] text-gray-5 mb-2">
                            Rep: {stats.repName} &middot; Lead: {stats.leadName}
                          </div>
                        )}
                        {routes.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-start gap-2 px-2 py-1.5 rounded bg-[var(--ws-bg)]"
                          >
                            <Route size={11} className="text-gray-5 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-[11px] font-medium text-[var(--ws-text)]">
                                {r.route_name}
                              </div>
                              <div className="text-[10px] text-gray-5">
                                {r.route_category || r.route_id} &middot; {r.vehicle_type || "N/A"}
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

      {/* Selected pin detail */}
      {selectedPin && (
        <div className="pm-dash-card p-5 border-l-4 border-l-[#047857]">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-display text-[14px] font-semibold">{selectedPin.name}</div>
              <div className="text-[12px] text-gray-4 mt-1">
                {selectedPin.channel || "N/A"} &middot; {selectedPin.type || "N/A"} &middot; {selectedPin.size || "N/A"}
              </div>
              <div className="text-[11px] text-gray-5 mt-1">
                {selectedPin.ward || ""}, {selectedPin.constituency || ""}, {selectedPin.county || ""}
              </div>
              <div className="text-[10px] text-gray-5 font-mono mt-2">
                GPS: {selectedPin.lat.toFixed(6)}, {selectedPin.lng.toFixed(6)}
              </div>
            </div>
            <button
              onClick={() => setSelectedPin(null)}
              className="text-gray-4 hover:text-[var(--ws-text)] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const GROUP_COLORS: Record<string, string> = {
  A: "#047857",
  B: "#0369a1",
  C: "#7c3aed",
  D: "#c2410c",
  E: "#be185d",
  F: "#15803d",
  G: "#a16207",
};
