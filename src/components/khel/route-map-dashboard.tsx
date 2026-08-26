"use client";

import React, { useState, useEffect, use, startTransition, useRef, useEffect as useEff } from "react";
import { Loader2, MapPin, Route, Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

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
const GROUP_COLORS: Record<string, string> = {
  A: "#047857",
  B: "#0369a1",
  C: "#7c3aed",
  D: "#c2410c",
  E: "#be185d",
  F: "#15803d",
  G: "#a16207",
};

function LeafletMap({
  pins,
  selectedGroup,
  onSelectPin,
}: {
  pins: OutletPin[];
  selectedGroup: string;
  onSelectPin: (pin: OutletPin) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);

  useEff(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const L = require("leaflet");
    const map = L.map(mapRef.current, { zoomControl: false }).setView([-1.29, 36.82], 6);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);
    mapInstanceRef.current = map;
  }, []);

  useEff(() => {
    const L = require("leaflet");
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m: any) => m.remove());
    markersRef.current = [];

    if (pins.length === 0) return;

    const bounds: any[] = [];

    pins.forEach((pin) => {
      const color = GROUP_COLORS[selectedGroup] || "#047857";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:12px;height:12px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui;min-width:160px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${pin.name}</div>
            <div style="font-size:11px;color:#666;">${pin.channel || "N/A"} &middot; ${pin.type || "N/A"}</div>
            <div style="font-size:11px;color:#666;margin-top:2px;">${pin.ward || ""}, ${pin.county || ""}</div>
            <div style="font-size:10px;color:#999;margin-top:4px;">Size: ${pin.size || "N/A"}</div>
          </div>`,
        )
        .on("click", () => onSelectPin(pin));

      markersRef.current.push(marker);
      bounds.push([pin.lat, pin.lng]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [pins, selectedGroup, onSelectPin]);

  return <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: 500 }} />;
}

export default function RouteMapDashboard({ projectId }: { projectId: string }) {
  const [data, setData] = useState<RoutesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<string>("All");
  const [selectedPin, setSelectedPin] = useState<OutletPin | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const fetchData = async (g: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (g !== "All") params.set("group", g);
      const res = await fetch(`/api/portal/khel/routes?${params}`);
      const json = await res.json();
      startTransition(() => {
        setData(json);
        setLoading(false);
      });
    } catch {
      startTransition(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchData(group);
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

  const displayPins = group === "All" ? data.outletPins : data.outletPins;
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
          <LeafletMap pins={displayPins} selectedGroup={group} onSelectPin={setSelectedPin} />
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
