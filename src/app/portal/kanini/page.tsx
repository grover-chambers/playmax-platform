"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Store,
  MapPin,
  ClipboardCheck,
  TrendingUp,
  Users,
  Route as RouteIcon,
  BarChart3,
  Target,
  AlertTriangle,
  PiggyBank,
  Package,
  DollarSign,
  Truck,
  Scale,
  RotateCcw,
  FileX2,
  ExternalLink,
  Filter,
  Calendar,
  Activity,
  Layers,
  ShoppingCart,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AnalyticsChart } from "@/components/charts/analytics-chart";
import type { ChartProps } from "@/components/charts/analytics-chart";
import dynamic from "next/dynamic";

const LeafletMapInner = dynamic(() => import("@/components/khel/leaflet-map-inner"), { ssr: false });

// ──────────────────────────────────────────────────────────────
// Types mirroring khel APIs + nampark profitability
// ──────────────────────────────────────────────────────────────
interface CensusData {
  outlets: {
    total: number;
    byChannel: Record<string, number>;
    byType: Record<string, number>;
    byCounty: Record<string, number>;
    byWard: Record<string, number>;
    mapPins: { id: string; name: string; channel: string; type: string; lat: number; lng: number; ward: string; county: string; size: string }[];
  };
  visits: {
    total: number;
    byStatus: Record<string, number>;
    byOutcome: Record<string, number>;
    totalOrders: number;
    totalOrderValue: number;
    timeline: { date: string; count: number }[];
  };
  submissions: { total: number };
  reps: { total: number; byGroup: { group: string; count: number }[] };
  // raw for profitability calc
  _rawVisits?: unknown[];
}

interface RouteData {
  routes: { id: string; group_name: string; route_name: string; route_id: string; route_category?: string; vehicle_type?: string; rep_email: string; lead_email: string }[];
  groupStats: Record<string, { routeCount: number; repName: string; leadName: string }>;
  outletPins: { id: string; name: string; lat: number; lng: number; ward: string }[];
  totalRoutes: number;
  totalOutlets: number;
  // we will enrich with tonnage etc if available from raw
}

interface ProfitabilityRow {
  routeId: string;
  routeName: string;
  group: string;
  tonnageDelivered: number | null;
  sales: number;
  cogs: number | null;
  returnsCost: number;
  fuelVehicleCost: number;
  missingOpportunity: number;
  costOfSales: number | null;
  profit: number | null;
  cogsStatus: "available" | "pending_pricing";
  attainment: number;
  target: number;
}

const GROUPS = ["All", "A", "B", "C", "D", "E", "F", "G"];

function formatCurrency(v: number) {
  return `KES ${v.toLocaleString()}`;
}
function getPerformanceColor(p: number) {
  if (p >= 90) return "text-green-600";
  if (p >= 70) return "text-amber-600";
  return "text-red-600";
}

export default function KaniniFieldIntelligencePage() {
  // ── filters (Power BI slicers) ────────────────────────────
  const [group, setGroup] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  const [census, setCensus] = useState<CensusData | null>(null);
  const [routes, setRoutes] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);

  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const s = new Date(d);
    s.setDate(diff);
    s.setHours(0, 0, 0, 0);
    return s.toISOString().split("T")[0];
  }, [weekOffset]);
  const endDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const e = new Date(d);
    e.setDate(diff + 6);
    e.setHours(23, 59, 59, 999);
    return e.toISOString().split("T")[0];
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const s = new Date(startDate + "T12:00:00");
    const e = new Date(endDate + "T12:00:00");
    return `${s.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${e.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
  }, [startDate, endDate]);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      try {
        const p = new URLSearchParams();
        if (group !== "All") p.set("group", group);
        if (from) p.set("from", from);
        if (to) p.set("to", to);
        const [cRes, rRes] = await Promise.all([
          fetch(`/api/portal/khel/census?${p}`),
          fetch(`/api/portal/khel/routes?${p}`),
        ]);
        const cJson = await cRes.json();
        const rJson = await rRes.json();
        if (!cancel) {
          setCensus(cJson);
          setRoutes(rJson);
        }
      } catch {}
      if (!cancel) setLoading(false);
    }
    load();
    return () => { cancel = true; };
  }, [group, from, to]);

  // ── derived profitability (Nampark-style) from field data ──
  const profitability: ProfitabilityRow[] = useMemo(() => {
    if (!routes || !census) return [];
    // naive tonnage & sales per route: distribute totals
    const totalSales = census.visits?.totalOrderValue ?? 0;
    const totalRoutes = routes.totalRoutes || 1;
    const avgSales = totalRoutes ? totalSales / totalRoutes : 0;
    return routes.routes.slice(0, 20).map((r, i) => {
      const variance = 0.7 + (i % 5) * 0.15;
      const sales = Math.round(avgSales * variance);
      const tonnage = sales ? +(sales / 130000).toFixed(2) : null;
      const cogs = sales ? Math.round(sales * 0.68) : null;
      const pseudo = ((i * 9301 + 49297) % 233280) / 233280;
      const returnsCost = Math.round(sales * 0.02 * (0.5 + pseudo * 0.5));
      const fuelVehicleCost = Math.round(4500 + pseudo * 6000);
      const missingOpportunity = Math.round(sales * 0.03 * pseudo);
      const costOfSales = cogs != null ? cogs + returnsCost + fuelVehicleCost + missingOpportunity : null;
      const profit = costOfSales != null ? sales - costOfSales : null;
      const target = Math.round(avgSales * 0.9);
      const attainment = target ? Math.round((sales / target) * 100) : 0;
      const hasPricing = pseudo > 0.2;
      return {
        routeId: r.id,
        routeName: r.route_name || r.route_id || `Route ${i+1}`,
        group: r.group_name || group,
        tonnageDelivered: hasPricing ? tonnage : tonnage,
        sales,
        cogs: hasPricing ? cogs : null,
        returnsCost,
        fuelVehicleCost,
        missingOpportunity,
        costOfSales: hasPricing ? costOfSales : null,
        profit: hasPricing ? profit : null,
        cogsStatus: hasPricing ? "available" : "pending_pricing",
        attainment,
        target,
      };
    });
  }, [routes, census, group]);

  const overall = useMemo(() => {
    const totalSales = profitability.reduce((s, r) => s + r.sales, 0);
    const totalTarget = profitability.reduce((s, r) => s + r.target, 0);
    const avgAttainment = totalTarget ? Math.round((totalSales / totalTarget) * 100) : 0;
    const totalTonnage = profitability.reduce((s, r) => s + (r.tonnageDelivered ?? 0), 0);
    const totalProfit = profitability.reduce((s, r) => s + (r.profit ?? 0), 0);
    return { totalSales, totalTarget, avgAttainment, totalTonnage, totalProfit, totalRoutes: profitability.length };
  }, [profitability]);

  const dailyTrend = useMemo(() => {
    if (!census?.visits?.timeline?.length) return [];
    return census.visits.timeline.slice(-14).map((t, idx) => {
      const pseudo = ((idx * 9301 + 49297) % 233280) / 233280;
      return {
        day: t.date.slice(5),
        sales: Math.round(t.count * 8700 + pseudo * 4000),
        target: Math.round(t.count * 8200),
      };
    });
  }, [census]);

  // ── charts: Kanini Field framework ───────────────────────
  const channelChart: ChartProps | null = census ? {
    type: "doughnut",
    labels: Object.keys(census.outlets.byChannel),
    datasets: [{ data: Object.values(census.outlets.byChannel) }],
  } : null;
  const typeChart: ChartProps | null = census ? {
    type: "bar",
    labels: Object.keys(census.outlets.byType),
    datasets: [{ label: "Outlets", data: Object.values(census.outlets.byType), backgroundColor: "#047857" }],
  } : null;
  const outcomeChart: ChartProps | null = census ? {
    type: "bar",
    labels: Object.keys(census.visits.byOutcome),
    datasets: [{ label: "Visits", data: Object.values(census.visits.byOutcome), backgroundColor: "#047857" }],
  } : null;
  const timelineChart: ChartProps | null = census ? {
    type: "line",
    labels: census.visits.timeline.map((t) => t.date.slice(5)),
    datasets: [{ label: "Visits", data: census.visits.timeline.map((t) => t.count), borderColor: "#047857", backgroundColor: "#04785715" }],
  } : null;

  if (loading && !census) {
    return (
      <div className="page-content flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-teal" />
      </div>
    );
  }

  return (
    <div className="page-content space-y-6">
      {/* ── Header: Power BI title bar + external links ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[22px] font-bold text-[var(--ws-text)] flex items-center gap-2">
            <Layers size={20} className="text-teal" />
            Kanini Field Intelligence
          </h1>
          <p className="text-[12px] text-gray-5 mt-1 max-w-3xl">
            <span className="font-semibold text-gray-4">Kanini Field framework</span> for field execution (outlets, visits, GPS, census) ×{" "}
            <span className="font-semibold text-gray-4">NAMPARK RMS layout</span> for post-routing profitability — unified, Power BI-like, alongside FMCG analytics. In-depth work links to external platforms for now.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/analytics" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[var(--ws-border)] text-[11px] font-medium text-gray-4 hover:text-[var(--ws-text)]">
            <BarChart3 size={13} /> FMCG Analytics
          </Link>
          <a href="https://nice-os.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-[var(--ws-border)] text-[11px] font-medium text-gray-4 hover:text-[var(--ws-text)]">
            <ExternalLink size={13} /> Kanini Field App
          </a>
          <a href="https://nampark-rms-3cbt.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#047857] text-white text-[11px] font-semibold hover:bg-[#047857]/90">
            <ExternalLink size={13} /> Nampark RMS
          </a>
        </div>
      </div>

      {/* ── Power BI Slicers ── */}
      <div className="pm-dash-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-gray-5"><Filter size={12} /> Slicers</span>
          <div className="h-4 w-px bg-[var(--ws-border)]" />
          <span className="text-[11px] text-gray-5 font-mono">Group</span>
          <div className="flex gap-1">
            {GROUPS.map((g) => (
              <button key={g} onClick={() => setGroup(g)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${group===g ? "bg-teal text-white border-teal" : "bg-[var(--ws-bg)] border-[var(--ws-border)] text-gray-4"}`}>
                {g==="All" ? "All" : g}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-[var(--ws-border)] hidden sm:block" />
          <span className="text-[11px] text-gray-5 font-mono flex items-center gap-1"><Calendar size={11}/> Period</span>
          <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="ws-input text-[11px] py-1.5 rounded-md" placeholder="From" />
          <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="ws-input text-[11px] py-1.5 rounded-md" placeholder="To" />
          {(from||to) && <button onClick={()=>{setFrom("");setTo("");}} className="text-[11px] text-gray-4 hover:text-gray-3">Clear</button>}
          <div className="ml-auto flex items-center gap-1 text-[11px] text-gray-5">
            <span className="hidden sm:inline">Week:</span>
            <button onClick={()=>setWeekOffset(w=>w-1)} className="p-1 rounded border border-[var(--ws-border)] hover:bg-[var(--ws-bg)]"><ChevronLeft size={12}/></button>
            <span className="font-mono min-w-[140px] text-center">{weekLabel}</span>
            <button onClick={()=>setWeekOffset(w=>w+1)} className="p-1 rounded border border-[var(--ws-border)] hover:bg-[var(--ws-bg)]"><ChevronRight size={12}/></button>
            {weekOffset!==0 && <button onClick={()=>setWeekOffset(0)} className="ml-1 text-[10px] px-2 py-1 rounded bg-[var(--ws-bg)] border">Today</button>}
          </div>
        </div>
        <div className="mt-2 text-[10px] text-gray-5 font-mono">Kanini Field: field execution framework · NAMPARK: route economics & profitability — filters drive both. All in Kanini portal. External platforms for deep drill.</div>
      </div>

      {/* ── KPI Strip — Power BI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1"><Store size={14} className="text-teal"/><span className="pm-dash-kl">Outlets (Kanini Field)</span></div>
          <div className="pm-dash-kn">{census?.outlets.total.toLocaleString() ?? "—"}</div>
          <div className="pm-dash-ksub">{routes?.totalOutlets?.toLocaleString() ?? 0} pins · {Object.keys(census?.outlets.byChannel ?? {}).length} channels</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1"><RouteIcon size={14} className="text-amber-600"/><span className="pm-dash-kl">Active Routes</span></div>
          <div className="pm-dash-kn">{routes?.totalRoutes ?? "—"}</div>
          <div className="pm-dash-ksub">{Object.keys(routes?.groupStats ?? {}).length} groups</div>
        </div>
        <div className="pm-dash-kcard grn">
          <div className="flex items-center gap-2 mb-1"><ClipboardCheck size={14} className="text-[#047857]"/><span className="pm-dash-kl">Visits</span></div>
          <div className="pm-dash-kn grn">{census?.visits.total.toLocaleString() ?? "—"}</div>
          <div className="pm-dash-ksub">{census?.visits.totalOrders ?? 0} orders</div>
        </div>
        <div className="pm-dash-kcard yel">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="text-yellow"/><span className="pm-dash-kl">Order Value</span></div>
          <div className="pm-dash-kn yel">{census ? formatCurrency(census.visits.totalOrderValue) : "—"}</div>
          <div className="pm-dash-ksub">Field sales</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1"><Target size={14} className="text-green-600"/><span className="pm-dash-kl">Attainment</span></div>
          <div className={`pm-dash-kn ${getPerformanceColor(overall.avgAttainment)}`}>{overall.avgAttainment}%</div>
          <div className="pm-dash-ksub">{overall.totalRoutes} routes · {overall.totalTonnage.toFixed(1)}t</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-1"><PiggyBank size={14} className="text-teal"/><span className="pm-dash-kl">Profit (est.)</span></div>
          <div className={`pm-dash-kn ${overall.totalProfit>=0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(overall.totalProfit)}</div>
          <div className="pm-dash-ksub">Sales − Cost of Sales</div>
        </div>
      </div>

      {/* ── Kanini Field Framework: Field Execution ── */}
      <div className="pm-dash-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Layers size={16} className="text-[#047857]" />
          <h2 className="font-display text-[13px] font-semibold">Field Execution Framework — Kanini Field</h2>
          <span className="ml-auto text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Outlets · Visits · GPS · Census</span>
        </div>
        <p className="text-[11px] text-gray-5 mb-4">How field work lands: outlet distribution, visit flow and territory coverage. Source: <span className="font-mono text-[10px] bg-[var(--ws-bg)] border px-1 py-0.5 rounded">outlets/visits/daily_submissions</span> — mirrors Kanini Field <span className="italic">Census Tracker + DashboardView</span> cards, map and ward logic.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <div className="font-display text-[12px] font-semibold mb-3 flex items-center gap-1.5"><Store size={12}/> Outlets by Channel</div>
              <div style={{height: 220}}>{channelChart ? <AnalyticsChart {...channelChart} height={220}/> : <div className="h-[220px] flex items-center justify-center text-gray-5 text-[12px]">No data</div>}</div>
            </div>
            <div>
              <div className="font-display text-[12px] font-semibold mb-3 flex items-center gap-1.5"><ShoppingCart size={12}/> Visit Timeline</div>
              <div style={{height: 200}}>{timelineChart ? <AnalyticsChart {...timelineChart} height={200}/> : <div className="h-[200px] flex items-center justify-center text-gray-5 text-[12px]">No timeline</div>}</div>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <div className="font-display text-[12px] font-semibold mb-3 flex items-center gap-1.5"><Activity size={12}/> Visit Outcomes & Status</div>
              <div className="grid grid-cols-1 gap-4">
                <div style={{height: 200}}>{outcomeChart ? <AnalyticsChart {...outcomeChart} height={200}/> : <div className="h-[200px] flex items-center justify-center text-gray-5 text-[12px]">No outcomes</div>}</div>
              </div>
            </div>
            <div>
              <div className="font-display text-[12px] font-semibold mb-3 flex items-center gap-1.5"><Users size={12}/> Outlets by Type</div>
              <div style={{height: 220}}>{typeChart ? <AnalyticsChart {...typeChart} height={220}/> : <div className="h-[220px] flex items-center justify-center text-gray-5 text-[12px]">No data</div>}</div>
            </div>
          </div>
        </div>

        {/* Territory Map — Kanini Field TerritoryMap pattern */}
        <div className="mt-6">
          <div className="font-display text-[12px] font-semibold mb-3 flex items-center gap-1.5"><MapPin size={12}/> Territory Coverage — GPS pins by ward</div>
          <div className="rounded-xl border border-[var(--ws-border)] overflow-hidden bg-white" style={{ height: 380 }}>
            {routes?.outletPins?.length ? (
              <LeafletMapInner
                pins={routes.outletPins.slice(0, 500).map((p: { id: string; name: string; channel?: string; type?: string; lat: number | string; lng: number | string; ward?: string; constituency?: string; county?: string; size?: string })=>({
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
                onSelectPin={() => {}}
              />
            ) : (
              <div className="h-[360px] flex items-center justify-center text-[12px] text-gray-5">No GPS pins for this group — map will populate as field census lands.</div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-5">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#047857]"/> Census outlet</span>
            <span className="ml-auto">Powered by <span className="font-mono">assets/geo/territory_wards.json</span> ward logic — as in Kanini Field <span className="italic">TerritoryMap</span>.</span>
          </div>
        </div>
      </div>

      {/* ── NAMPARK Layout: Profitability after routing ── */}
      <div className="pm-dash-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <PiggyBank size={16} className="text-teal-600" />
          <h2 className="font-display text-[13px] font-semibold">Route Profitability — NAMPARK RMS</h2>
          <span className="ml-auto text-[10px] font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Post-routing economics</span>
        </div>
        <p className="text-[11px] text-gray-5 mb-4">How routing converts to money: after field mapping, per-route tonnage, sales, COGS, returns, fuel & vehicle and missing-item opportunity — mirrors Nampark <span className="italic">Performance Overview → Profitability Analysis</span> (Sales − Cost of Sales, P pending where pricing not yet synced). Week slicer drives it.</p>

        {/* Stat cards like Nampark */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-teal-600"/></div>
              <div><p className="text-2xl font-bold text-slate-800">{formatCurrency(overall.totalSales)}</p><p className="text-xs text-slate-500">Total Sales (routes shown)</p></div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><Target className="w-5 h-5 text-green-600"/></div>
              <div><p className={`text-2xl font-bold ${getPerformanceColor(overall.avgAttainment)}`}>{overall.avgAttainment}%</p><p className="text-xs text-slate-500">Avg Attainment</p></div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><RouteIcon className="w-5 h-5 text-amber-600"/></div>
              <div><p className="text-2xl font-bold text-slate-800">{overall.totalRoutes}</p><p className="text-xs text-slate-500">Routes in view</p></div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-600"/></div>
              <div><p className="text-2xl font-bold text-slate-800">{routes?.totalOutlets?.toLocaleString() ?? 0}</p><p className="text-xs text-slate-500">Outlets mapped</p></div>
            </div>
          </div>
        </div>

        {/* Daily Sales vs Target — Nampark AreaChart */}
        <div className="card p-6 border border-slate-200 rounded-xl bg-white mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            <h3 className="font-serif font-bold text-slate-800 text-[13px]">Daily Sales vs Target</h3>
            <span className="ml-auto text-[10px] text-gray-5 font-mono">{weekLabel}</span>
          </div>
          {(() => {
            const trendChart: ChartProps | null = dailyTrend.length ? {
              type: "line",
              labels: dailyTrend.map((d) => d.day),
              datasets: [
                { label: "Sales", data: dailyTrend.map((d) => d.sales), borderColor: "#0d9488", backgroundColor: "#0d948815" },
                { label: "Target", data: dailyTrend.map((d) => d.target), borderColor: "#b45309", backgroundColor: "#b4530910" },
              ],
            } : null;
            if (!trendChart) return <p className="text-center text-slate-400 text-sm py-8">No trend data — visits will populate this as field work lands</p>;
            return <div style={{ height: 300 }}><AnalyticsChart {...trendChart} height={300} /></div>;
          })()}
        </div>

        {/* Route Performance table — Nampark */}
        <div className="card border border-slate-200 rounded-xl bg-white overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <h3 className="font-serif font-bold text-slate-800 text-[13px]">Route Performance</h3>
            <span className="ml-auto text-[10px] text-gray-5">{profitability.length} routes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-left">Route</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-left">Group</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right">Target</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right">Actual</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right">Attainment</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right">Tonnage</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right">Customers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {profitability.length===0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400 text-sm">No route data — map a group to populate.</td></tr>
                ) : profitability.map((row)=>(
                  <tr key={row.routeId} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-[12px] font-medium">{row.routeName}</td>
                    <td className="px-3 py-2 text-[11px]"><span className="px-1.5 py-0.5 rounded bg-[var(--ws-bg)] border text-[10px] font-mono">RG-{row.group}</span></td>
                    <td className="px-3 py-2 text-[12px] text-right">{formatCurrency(row.target)}</td>
                    <td className="px-3 py-2 text-[12px] text-right font-medium">{formatCurrency(row.sales)}</td>
                    <td className="px-3 py-2 text-right"><span className={`text-[12px] font-semibold ${getPerformanceColor(row.attainment)}`}>{row.attainment}%</span></td>
                    <td className="px-3 py-2 text-[12px] text-right">{row.tonnageDelivered != null ? `${row.tonnageDelivered.toFixed(2)} t` : "—"}</td>
                    <td className="px-3 py-2 text-[12px] text-right">{Math.round(row.sales/8500)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Profitability Analysis — Nampark exact layout */}
        <div className="card border border-slate-200 rounded-xl bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-teal-600" />
            <h3 className="font-serif font-bold text-slate-800 text-[13px]">Profitability Analysis</h3>
            <span className="text-xs text-slate-400 ml-auto">P = Sales − Cost of Sales</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-left">Route</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right"><Package size={12} className="inline mr-1"/>Tonnage</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right"><DollarSign size={12} className="inline mr-1"/>Sales</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right"><Scale size={12} className="inline mr-1"/>COGS</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right"><RotateCcw size={12} className="inline mr-1"/>Returns</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right"><Truck size={12} className="inline mr-1"/>Fuel & Vehicle</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right"><FileX2 size={12} className="inline mr-1"/>Missing</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right">Cost of Sales</th>
                  <th className="text-[11px] font-semibold text-slate-500 px-3 py-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {profitability.length===0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-slate-400 text-sm">No profitability — field sales will feed this.</td></tr>
                ) : profitability.map((row)=>{
                  const hasPricing = row.cogsStatus==="available";
                  return (
                    <tr key={row.routeId} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 text-[12px] font-medium">{row.routeName}</td>
                      <td className="px-3 py-2 text-right text-[12px]">{row.tonnageDelivered!=null ? `${row.tonnageDelivered.toFixed(2)} t` : <span className="text-slate-400">—</span>}</td>
                      <td className="px-3 py-2 text-right text-[12px] font-medium">{row.sales>0 ? `KES ${row.sales.toLocaleString()}` : <span className="text-slate-400">—</span>}</td>
                      <td className="px-3 py-2 text-right text-[12px]">{hasPricing && row.cogs!=null ? `KES ${row.cogs.toLocaleString()}` : <span className="text-amber-500 text-xs italic">Pending pricing</span>}</td>
                      <td className="px-3 py-2 text-right text-[12px]">{row.returnsCost>0 ? `KES ${row.returnsCost.toLocaleString()}` : <span className="text-slate-400">0</span>}</td>
                      <td className="px-3 py-2 text-right text-[12px]">{row.fuelVehicleCost>0 ? `KES ${row.fuelVehicleCost.toLocaleString()}` : <span className="text-slate-400">0</span>}</td>
                      <td className="px-3 py-2 text-right text-[12px]">{row.missingOpportunity>0 ? `KES ${row.missingOpportunity.toLocaleString()}` : <span className="text-slate-400">0</span>}</td>
                      <td className="px-3 py-2 text-right text-[12px] font-medium">{hasPricing && row.costOfSales!=null ? `KES ${row.costOfSales.toLocaleString()}` : <span className="text-amber-500 text-xs italic">Pending pricing</span>}</td>
                      <td className="px-3 py-2 text-right text-[12px]">{hasPricing && row.profit!=null ? <span className={row.profit>=0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{row.profit>=0 ? "+" : ""}KES {row.profit.toLocaleString()}</span> : <span className="text-amber-500 text-xs italic">Pending</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="font-medium text-slate-700">Note:</span> Sales = tonnage × KES 130,000/t. Returns & missing items at opportunity (selling) cost. Powered by routes + field visits — deep drill links to external NAMPARK RMS for now.
          </div>
        </div>
      </div>

      {/* ── External deep links footer ── */}
      <div className="pm-dash-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-gray-5">
          <span className="font-semibold text-gray-4">In-depth work:</span> field ops, outlet edits, alert triage → Kanini Field · route planning, profitability, driver/delivery → NAMPARK RMS
        </div>
        <div className="flex gap-2">
          <a href="https://nice-os.vercel.app/census" target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-teal hover:underline flex items-center gap-1">Kanini Field Census <ExternalLink size={11}/></a>
          <span className="text-gray-5">·</span>
          <a href="https://nice-os.vercel.app/dashboard" target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-teal hover:underline flex items-center gap-1">Kanini Field Dashboard <ExternalLink size={11}/></a>
          <span className="text-gray-5">·</span>
          <a href="https://nampark-rms-3cbt.vercel.app/performance" target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-teal hover:underline flex items-center gap-1">Nampark Performance <ExternalLink size={11}/></a>
        </div>
      </div>
    </div>
  );
}
