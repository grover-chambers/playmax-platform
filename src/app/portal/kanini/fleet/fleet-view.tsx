"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Truck, Layers, Filter, ArrowLeft, Package, Scale, Users, AlertTriangle } from "lucide-react";

interface RouteItem {
  id: string;
  group_name: string;
  route_name: string;
  vehicle_type: string;
}

interface RoutesData {
  routes: RouteItem[];
  groupStats: Record<string, { routeCount: number; repName: string; leadName: string }>;
  totalRoutes: number;
  totalOutlets: number;
}

const GROUPS = ["All", "A", "B", "C", "D", "E", "F", "G"];

function formatN(n: number) {
  return n.toLocaleString();
}

export default function FleetView() {
  const [group, setGroup] = useState("All");
  const [data, setData] = useState<RoutesData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const byVehicle = useMemo(() => {
    if (!data) return {};
    const m: Record<string, number> = {};
    for (const r of data.routes) {
      const v = r.vehicle_type || "Unknown";
      m[v] = (m[v] || 0) + 1;
    }
    return m;
  }, [data]);

  const byGroup = useMemo(() => {
    if (!data) return {};
    const m: Record<string, number> = {};
    for (const r of data.routes) m[r.group_name] = (m[r.group_name] || 0) + 1;
    return m;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-5 text-[12px]">
        Loading fleet…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-[11px] text-gray-5">
        <Link href="/portal/kanini" className="flex items-center gap-1 hover:text-teal">
          <ArrowLeft size={12} /> Level 0 Overview
        </Link>
        <span>›</span>
        <span className="font-semibold text-teal flex items-center gap-1">
          <Truck size={12} /> Level 1 Fleet &amp; Assets
        </span>
      </div>

      <div>
        <h1 className="font-display text-[18px] font-bold text-slate-800 flex items-center gap-2">
          <Truck size={18} className="text-teal" /> Fleet &amp; Assets — Level 1
        </h1>
        <p className="text-[11px] text-gray-5 mt-1 max-w-3xl">
          Mirrors Nampark drill-down Level 1: vehicle &amp; tonnage capacity by route group. Source{" "}
          <span className="font-mono bg-slate-50 border px-1 rounded">routes_master.vehicle</span> ×{" "}
          <span className="font-mono bg-slate-50 border px-1 rounded">routes_master.tonnage_target</span>. Further drill:{" "}
          <Link href="/portal/kanini/routes" className="text-teal hover:underline">
            Level 2 Routes
          </Link>
          .
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
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                group === g
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {g === "All" ? "All" : g}
            </button>
          ))}
        </div>
        <div className="ml-auto text-[11px] text-gray-5 font-mono">
          {data?.totalRoutes ?? 0} routes · {data?.totalOutlets ?? 0} outlets
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1">
            <Truck size={14} className="text-teal" />
            <span className="pm-dash-kl">Fleet Size</span>
          </div>
          <div className="pm-dash-kn">{data ? formatN(data.totalRoutes) : "—"}</div>
          <div className="pm-dash-ksub">active routes = vehicles</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1">
            <Layers size={14} className="text-amber-600" />
            <span className="pm-dash-kl">Groups Covered</span>
          </div>
          <div className="pm-dash-kn">{data ? Object.keys(byGroup).length : "—"}</div>
          <div className="pm-dash-ksub">{Object.entries(byGroup).map(([k, v]) => `G${k}:${v}`).join(" · ") || "—"}</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1">
            <Scale size={14} className="text-emerald-700" />
            <span className="pm-dash-kl">Vehicle Types</span>
          </div>
          <div className="pm-dash-kn">{data ? Object.keys(byVehicle).length : "—"}</div>
          <div className="pm-dash-ksub">{Object.entries(byVehicle).slice(0, 2).map(([k, v]) => `${k}:${v}`).join(" · ") || "—"}</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-slate-600" />
            <span className="pm-dash-kl">Crews</span>
          </div>
          <div className="pm-dash-kn">{data ? Object.keys(data.groupStats).length : "—"}</div>
          <div className="pm-dash-ksub">rep + lead per group</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pm-dash-card p-5">
          <div className="font-display text-[13px] font-semibold mb-3 flex items-center gap-1.5">
            <Truck size={14} /> Fleet by Vehicle Type
          </div>
          {data && Object.keys(byVehicle).length ? (
            <div className="space-y-2">
              {Object.entries(byVehicle)
                .sort((a, b) => b[1] - a[1])
                .map(([veh, cnt]) => (
                  <div
                    key={veh}
                    className="flex items-center justify-between text-[12px] px-3 py-2 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <span className="font-medium text-slate-700">{veh}</span>
                    <span className="font-mono text-slate-600">
                      {cnt} routes · {data ? ((cnt / data.totalRoutes) * 100).toFixed(1) : "0"}%
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-[12px] text-gray-5">No vehicle data.</div>
          )}
        </div>
        <div className="pm-dash-card p-5">
          <div className="font-display text-[13px] font-semibold mb-3 flex items-center gap-1.5">
            <Package size={14} /> Fleet by Group (Nampark alignment)
          </div>
          {data ? (
            <div className="space-y-2">
              {Object.entries(byGroup)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([g, cnt]) => {
                  const s = data.groupStats[g];
                  return (
                    <div key={g} className="flex items-center justify-between text-[12px] px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                      <div>
                        <span className="font-semibold text-slate-700">Group {g}</span>
                        <span className="text-gray-5 ml-2 text-[11px]">
                          {s?.repName?.split(" ")[0] ?? ""} · {s?.leadName?.split(" ")[0] ?? ""}
                        </span>
                      </div>
                      <span className="font-mono text-slate-600">{cnt} vehicles</span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-[12px] text-gray-5">No group data.</div>
          )}
        </div>
      </div>

      <div className="pm-dash-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-gray-5">
          Drill:{" "}
          <Link href="/portal/kanini" className="text-teal hover:underline">
            Level 0
          </Link>{" "}
          · <span className="font-semibold text-teal">Level 1 Fleet</span> ·{" "}
          <Link href="/portal/kanini/routes" className="text-teal hover:underline">
            Level 2 Routes →
          </Link>{" "}
          ·{" "}
          <Link href="/portal/kanini/deliveries" className="text-teal hover:underline">
            Level 3 Deliveries
          </Link>{" "}
          ·{" "}
          <Link href="/portal/kanini/profitability" className="text-teal hover:underline">
            Level 4 Profit
          </Link>
        </div>
        <div className="text-[10px] text-gray-5 font-mono">Nampark Level 1 pattern: Assets underpin route economics.</div>
      </div>

      {!data?.totalRoutes && (
        <div className="pm-dash-card p-5 flex items-center gap-2 text-[12px] text-amber-700 bg-amber-50 border-amber-200">
          <AlertTriangle size={14} /> No routes for this group — try All.
        </div>
      )}
    </div>
  );
}
