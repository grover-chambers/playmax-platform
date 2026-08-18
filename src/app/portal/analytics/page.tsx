"use client";

import React, { useState, useEffect, startTransition } from "react";
import {
  BarChart3,
  TrendingDown,
  Award,
  Tag,
  MapPin,
  DollarSign,
  Trophy,
  AlertTriangle,
  Loader2,
  FileText,
  Eye,
  ShoppingBag,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import { AnalyticsChart } from "@/components/charts/analytics-chart";
import type { ChartProps } from "@/components/charts/analytics-chart";
import { transformChartData } from "@/lib/analytics-transform";
import { findCategory } from "@/lib/report-types";
import type { ChartType } from "@/lib/report-types";
import { ANALYTICS_COLORS, CHART_COLORS } from "@/lib/analytics-colors";
import { competitorLabel, competitorColor } from "@/lib/competitor-utils";
import { KpiSkeleton, CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Modal from "@/components/ui/modal";

/* ── Types ────────────────────────────────────────────────────── */

interface CompetitorRank {
  manufacturer: string;
  total_sales: number;
  total_units: number;
  share: number;
  is_client: boolean;
  rank: number;
}

interface CategoryPerf {
  category: string;
  total_sales: number;
  total_units: number;
  avg_unit_price: number;
  product_count: number;
}

interface BranchSales {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  total_amount: number;
  quantity: number;
}

interface ProductPerf {
  name: string;
  stock_code: string;
  category: string;
  total_revenue: number;
  total_qty: number;
  avg_price: number;
}

interface PricingPoint {
  product: string;
  stock_code: string;
  branch: string;
  selling_price: number;
  standard_cost: number;
  margin_pct: number;
}

interface SavedReport {
  id: string;
  name: string;
  report_type: string;
  config: Record<string, unknown>;
  generated_data: Record<string, unknown>;
  visible_to_client: boolean;
  created_at: string;
  updated_at: string;
}

interface SalesTrendPoint {
  period_id: string;
  label: string;
  totalSales: number;
  totalUnits: number;
  clientSales: number;
  clientShare: number;
}

interface BranchMatrixRow {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  suppliers: {
    name: string;
    total_sales: number;
    share: number;
    is_client: boolean;
  }[];
}

interface AnalyticsResponse {
  competitors: CompetitorRank[];
  categories: CategoryPerf[];
  branches: BranchSales[];
  topProducts: ProductPerf[];
  bottomProducts: ProductPerf[];
  pricing: PricingPoint[];
  dashboardColor: string;
  summary: {
    totalSales: number;
    totalUnits: number;
    totalInventoryValue: number;
    totalProducts: number;
    prevTotalSales: number;
    prevTotalUnits: number;
  };
  periods: { id: string; label: string }[];
  allBranches: { id: string; name: string }[];
  allCategories: { id: string; name: string }[];
  clientCategories: { id: string; name: string }[];
  salesTrend: SalesTrendPoint[];
  branchMatrix: BranchMatrixRow[];
  scope?: {
    sharedCategoryIds: string[];
    clientCategoryIds: string[];
    hasClientCategoryScope: boolean;
    mismatch: boolean;
  };
  error?: string;
}

/* ── Helpers ──────────────────────────────────────────────────── */

function fmt(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `KES ${(v / 1_000).toFixed(0)}K`;
  return `KES ${Math.round(v).toLocaleString()}`;
}

function fmtNum(n: number | null | undefined): string {
  return Math.round(n ?? 0).toLocaleString("en-GB");
}

function fmtExact(n: number | null | undefined): string {
  return `KES ${Math.round(n ?? 0).toLocaleString("en-GB")}`;
}

function fmtPrice(n: number | null | undefined): string {
  return `KES ${Number(n ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | null | undefined): string {
  return `${(n ?? 0).toFixed(1)}%`;
}

function TrendArrow({ value, label }: { value: number | null; label?: string }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono ${up ? "text-green" : "text-red"}`}>
      <span>{up ? "▲" : "▼"}</span>
      {Math.abs(value).toFixed(1)}%
      {label && <span className="text-gray-5 ml-0.5">{label}</span>}
    </span>
  );
}

/* ── SVG Bar Chart Components ─────────────────────────────────── */

function HorizontalBar({ value, max, color, height = 18 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full rounded overflow-hidden" style={{ height, background: "var(--ws-border,#e5e5e5)" }}>
      <div
        className="h-full rounded transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function DonutChart({ segments, size = 140, strokeWidth = 16 }: {
  segments: { value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Pre-compute offsets outside of render mapping
  const offsets = segments.reduce<number[]>((acc, seg) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
    acc.push(prev + seg.value);
    return acc;
  }, []);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = circumference * pct;
        const dashOffset = circumference * (1 - offsets[i] / total);
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
}

/* ── Share Over Time (inline SVG — no canvas/SSR issues) ─────── */

function ShareTrendChart({ trend, color }: { trend: SalesTrendPoint[]; color: string }) {
  const width = 600;
  const height = 220;
  const padL = 44;
  const padR = 18;
  const padT = 18;
  const padB = 30;

  const points = trend.map((p) => ({
    label: String(p.label ?? ""),
    share: Math.max(0, Math.min(100, Number(p.clientShare) || 0)),
  }));

  if (points.length === 0) {
    return (
      <div className="text-center py-10 text-[12px] text-gray-5" role="status">
        Trend data not yet available
      </div>
    );
  }

  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const n = points.length;
  const step = n > 1 ? innerW / (n - 1) : 0;
  const xAt = (i: number) => padL + (n > 1 ? i * step : innerW / 2);
  const yAt = (share: number) => padT + (1 - share / 100) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.share).toFixed(1)}`)
    .join(" ");
  const areaPath =
    n > 1
      ? `${linePath} L${xAt(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${xAt(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`
      : "";

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Your share of category sales over time"
        style={{ minWidth: 480 }}
      >
        {/* Y-axis gridlines */}
        {gridLines.map((g) => (
          <g key={g}>
            <line
              x1={padL}
              x2={width - padR}
              y1={yAt(g)}
              y2={yAt(g)}
              stroke="var(--ws-border,#e5e5e5)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={padL - 8}
              y={yAt(g) + 3}
              textAnchor="end"
              fontSize={10}
              fill="var(--ws-text-muted,#70716C)"
              fontFamily="monospace"
            >
              {g}%
            </text>
          </g>
        ))}

        {/* Filled area + line */}
        {areaPath && <path d={areaPath} fill={color} fillOpacity={0.15} />}
        <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points (title acts as the tooltip) */}
        {points.map((p, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(p.share)} r={4} fill={color} stroke="#fff" strokeWidth={1.5}>
            <title>{`${p.label}: ${p.share.toFixed(1)}%`}</title>
          </circle>
        ))}

        {/* X-axis period labels (abbreviated to last 6 chars) */}
        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={xAt(i)}
            y={height - 8}
            textAnchor="middle"
            fontSize={10}
            fill="var(--ws-text-muted,#70716C)"
            fontFamily="monospace"
          >
            {p.label.slice(-6)}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ── Report Viewer Component ──────────────────────────────────── */

function ReportViewer({ report }: { report: SavedReport }) {
  const reportCategory = findCategory(report.report_type);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);

  const gd = report.generated_data as { data?: Record<string, unknown>[]; chart_type?: string } | undefined;
  const rawData = gd?.data ?? [];
  const chartProps: ChartProps | null = gd?.data && gd?.chart_type
    ? transformChartData(gd.chart_type as ChartType, gd.data)
    : null;

  return (
    <div className="pm-dash-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-display text-[15px] font-semibold">{report.name}</div>
          <div className="text-[11px] text-gray-5 capitalize mt-0.5 flex items-center gap-2">
            {reportCategory && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5">{reportCategory.label}</span>
            )}
            <span>{report.report_type.replace(/_/g, " ")}</span>
            <span>·</span>
            <span>Generated {new Date(report.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report.visible_to_client && <Eye size={14} className="text-teal" />}
          <span className="text-[10px] text-gray-5">{rawData.length} data points</span>
        </div>
      </div>

      {rawData.length > 0 && chartProps ? (
        <>
          <div className="mb-4" style={{ height: 300 }}>
            <AnalyticsChart {...chartProps} height={300} />
          </div>
          {/* Data table */}
          <details className="group">
            <summary className="text-[11px] text-gray-5 cursor-pointer hover:text-[var(--ws-text)] transition-colors select-none">
              View raw data ({rawData.length} rows)
            </summary>
            <div className="mt-3 overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--ws-border,#e5e5e5)]">
                    {rawData.length > 0 && Object.keys(rawData[0]).map((k) => (
                      <th key={k} className="font-mono text-[9px] text-gray-5 uppercase tracking-widest text-left px-2 py-1.5">
                        {k.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawData.slice(0, 25).map((row, i) => (
                    <tr
                      key={i}
                      onClick={() => setSelectedRow(row)}
                      className="border-b border-[var(--ws-border,#e5e5e5)] hover:bg-[var(--ws-bg)] transition-colors cursor-pointer"
                    >
                      {Object.values(row).map((v, j) => (
                        <td key={j} className={`px-2 py-1.5 ${typeof v === "number" ? "font-mono text-right" : ""}`}
                          style={{ color: typeof v === "number" ? "var(--ws-text,#1A1C23)" : "var(--ws-text-muted,#70716C)" }}>
                          {typeof v === "number"
                            ? v >= 1000000
                              ? `KES ${(v / 1000000).toFixed(1)}M`
                              : v >= 1000
                                ? `KES ${(v / 1000).toFixed(0)}K`
                                : String(v).includes(".")
                                  ? v.toFixed(2)
                                  : v.toLocaleString()
                            : String(v ?? "")
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rawData.length > 25 && (
                <div className="text-center text-[10px] text-gray-5 py-2">
                  Showing 25 of {rawData.length} rows
                </div>
              )}
            </div>
          </details>
        </>
      ) : (
        <div className="text-center py-8 text-[12px] text-gray-5">
          {report.generated_data && Object.keys(report.generated_data).length > 0
            ? "This report contains data in a format that cannot be previewed here."
            : "This report has been saved but does not yet contain generated data."}
        </div>
      )}

      {/* Row detail modal */}
      <Modal open={!!selectedRow} onClose={() => setSelectedRow(null)} title="Row Details">
        {selectedRow && (
          <div className="space-y-2.5">
            {Object.entries(selectedRow).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-4 border-b border-[var(--ws-border,#e5e5e5)] pb-2.5 last:border-0 last:pb-0"
              >
                <span className="text-[10px] uppercase tracking-wider text-gray-5 font-mono">
                  {k.replace(/_/g, " ")}
                </span>
                <span
                  className={`text-[13px] font-medium text-right max-w-[60%] break-words ${
                    typeof v === "number" ? "font-mono text-[var(--ws-text,#1A1C23)]" : "text-gray-3"
                  }`}
                >
                  {typeof v === "number"
                    ? Number.isInteger(v)
                      ? v.toLocaleString("en-GB")
                      : v.toFixed(2)
                    : String(v ?? "—")}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */

export default function PortalAnalyticsPage() {
  const [tab, setTab] = useState<string>("overview");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [maizeData, setMaizeData] = useState<Record<string, unknown> | null>(null);
  const [maizeLoading, setMaizeLoading] = useState(true);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterBranches, setFilterBranches] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [periods, setPeriods] = useState<{ id: string; label: string }[]>([]);
  const [allBranches, setAllBranches] = useState<{ id: string; name: string }[]>([]);
  const [allCategories, setAllCategories] = useState<{ id: string; name: string }[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<CategoryPerf | null>(null);
  const [selectedPricing, setSelectedPricing] = useState<PricingPoint | null>(null);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filterPeriod !== "all") params.set("period_id", filterPeriod);
      if (filterBranches.length > 0) params.set("branch_ids", filterBranches.join(","));
      if (filterCategories.length > 0) params.set("category_ids", filterCategories.join(","));
      const qs = params.toString();

      // Category endpoint params (it reads period_id + branch_ids only).
      const catParams = new URLSearchParams();
      if (filterPeriod !== "all") catParams.set("period_id", filterPeriod);
      if (filterBranches.length > 0) catParams.set("branch_ids", filterBranches.join(","));
      const catQs = catParams.toString();
      // Overview/reports use the client's primary assigned category snapshot;
      // category tabs use their own id. Legacy fallback resolves "maizze".
      const primaryCategoryId = data?.clientCategories?.[0]?.id ?? null;
      const hasLegacyMaize = (data?.categories as Array<{ category: string }> | undefined)?.some(
        (c) => String(c.category).toLowerCase().includes("maize"),
      ) ?? false;
      const categoryPath =
        tab === "overview" || tab === "reports"
          ? (primaryCategoryId ?? (hasLegacyMaize ? "maizze" : null))
          : tab;

      const [analyticsRes, reportsRes, maizeRes] = await Promise.all([
        fetch(`/api/portal/analytics${qs ? `?${qs}` : ""}`),
        fetch("/api/portal/analytics/reports"),
        categoryPath
          ? fetch(`/api/portal/analytics/category/${categoryPath}${catQs ? `?${catQs}` : ""}`)
          : Promise.resolve({ status: 200, json: async () => ({ category: null }) } as Response),
      ]);

      // Paid tier gate: 402 means the analytics payload is locked, not an error.
      if (analyticsRes.status === 402) {
        const reportsData = await reportsRes.json();
        startTransition(() => {
          setReports(reportsData.reports || []);
          setUpgradeRequired(true);
          setData(null);
          setMaizeData(null);
          setError(null);
          setLoading(false);
          setMaizeLoading(false);
        });
        setLastRefresh(new Date());
        return;
      }

      const analyticsData = await analyticsRes.json();
      const reportsData = await reportsRes.json();
      const maize = await maizeRes.json();

      startTransition(() => {
        if (analyticsData.error) {
          setError(analyticsData.error);
        } else {
          setUpgradeRequired(false);
          setData(analyticsData);
          if (analyticsData.periods) setPeriods(analyticsData.periods);
          if (analyticsData.allBranches) setAllBranches(analyticsData.allBranches);
          if (analyticsData.allCategories) setAllCategories(analyticsData.allCategories);
        }
        setReports(reportsData.reports || []);
        if (maize && maize.category) setMaizeData(maize);
        setMaizeLoading(false);
        setLoading(false);
      });
    } catch {
      startTransition(() => {
        setError("Failed to load analytics data");
        setLoading(false);
        setMaizeLoading(false);
      });
    }
    setLastRefresh(new Date());
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchData();
      if (!cancelled) setLastRefresh(new Date());
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterPeriod, filterBranches.join(","), filterCategories.join(",")]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { fetchData(); }, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  // Refetch the active category whenever a category tab is selected so the
  // category view always reflects the current tab (filter changes are already
  // re-applied by fetchData via the shared filter state).
  useEffect(() => {
    if (tab === "overview" || tab === "reports") return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show spinner immediately on tab switch
    setMaizeLoading(true);
    const params = new URLSearchParams();
    if (filterPeriod !== "all") params.set("period_id", filterPeriod);
    if (filterBranches.length > 0) params.set("branch_ids", filterBranches.join(","));
    const qs = params.toString();
    const path = tab === "maize" ? "maizze" : tab;
    fetch(`/api/portal/analytics/category/${path}${qs ? `?${qs}` : ""}`)
      .then((res) => {
        if (res.status === 402) {
          startTransition(() => {
            setUpgradeRequired(true);
            setMaizeLoading(false);
          });
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (cancelled || !json) return;
        startTransition(() => {
          if (json.category) setMaizeData(json);
          setMaizeLoading(false);
        });
      })
      .catch(() => {
        if (cancelled) return;
        startTransition(() => setMaizeLoading(false));
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const activeReport = selectedReport ? reports.find((r) => r.id === selectedReport) : null;

  const reportsContent = (
    <>
      {reports.length === 0 ? (
        <div className="pm-dash-card p-8 text-center">
          <FileText size={40} className="mx-auto mb-4 text-gray-5 opacity-30" />
          <div className="font-display text-[14px] font-semibold mb-2">No Reports Published</div>
          <div className="text-[12px] text-gray-4 max-w-md mx-auto">
            Your account manager will publish analytics reports here once they are ready for your review.
          </div>
        </div>
      ) : (
        <>
          {/* Report selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(selectedReport === report.id ? null : report.id)}
                className={`pm-dash-card p-4 text-left transition-all cursor-pointer ${
                  selectedReport === report.id
                    ? "border-teal ring-1 ring-teal/30"
                    : "hover:border-[var(--ws-border,#e5e5e5)]"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <FileText size={16} className="text-teal shrink-0" />
                  <Eye size={12} className="text-gray-5" />
                </div>
                <div className="font-display text-[13px] font-semibold mb-1">{report.name}</div>
                <div className="text-[11px] text-gray-5 capitalize">
                  {report.report_type.replace(/_/g, " ")}
                </div>
                <div className="text-[10px] text-gray-5 mt-2">
                  Updated {new Date(report.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>

          {/* Selected report detail */}
          {activeReport && <ReportViewer report={activeReport} />}
        </>
      )}
    </>
  );

  const handleUpgrade = async () => {
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO;
    if (!priceId) {
      window.location.href = "/portal/settings";
      return;
    }
    setUpgrading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } catch {
      window.location.href = "/portal/settings";
    } finally {
      setUpgrading(false);
    }
  };

  /* ── Loading / Error states ───────────────────────────────── */
  if (loading) {
    return (
      <div className="page-content">
        <PageHeader title="Analytics" subtitle="Loading market intelligence data..." />
        <div className="pm-dash-krow pm-dash-krow-4 mb-6">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          <div className="lg:col-span-3"><TableSkeleton rows={5} /></div>
          <div className="lg:col-span-2"><CardSkeleton height={250} /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <CardSkeleton height={180} />
          <CardSkeleton height={180} />
        </div>
      </div>
    );
  }

  /* ── Free-tier upgrade panel (analytics gated, reports still work) ── */
  if (upgradeRequired) {
    return (
      <div className="page-content">
        <PageHeader title="Analytics" subtitle="Market intelligence and performance insights" />

        {/* ── Tab bar (only overview/reports are known without analytics) ── */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("overview")}
            className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
              tab === "overview"
                ? "bg-teal text-white"
                : "bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] hover:text-[var(--ws-text,#1A1C23)]"
            }`}
          >
            <BarChart3 size={13} className="inline mr-1.5" />
            Live Analytics
          </button>
          <button
            onClick={() => setTab("reports")}
            className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
              tab === "reports"
                ? "bg-teal text-white"
                : "bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] hover:text-[var(--ws-text,#1A1C23)]"
            }`}
          >
            <FileText size={13} className="inline mr-1.5" />
            Reports
            {reports.length > 0 && (
              <span className="ml-1.5 bg-white/10 text-[10px] px-1.5 py-0.5 rounded-full">{reports.length}</span>
            )}
          </button>
        </div>

        {tab === "reports" ? (
          reportsContent
        ) : (
          <div className="pm-dash-card p-8">
            <div className="max-w-lg mx-auto text-center">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "var(--ws-bg,#f5f5f2)", border: "1px solid var(--ws-border,#e5e5e5)" }}
              >
                <Trophy size={22} className="text-yellow" />
              </div>
              <div className="font-display text-[20px] font-bold mb-2">Unlock Market Intelligence</div>
              <div className="text-[13px] text-gray-4 leading-relaxed mb-6">
                Upgrade to PRO to get live market analytics for your categories — share, rank, pricing, and trends
                across branches.
              </div>
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal text-white text-[13px] font-medium transition-colors cursor-pointer hover:opacity-90 disabled:opacity-60"
              >
                {upgrading && <Loader2 size={13} className="animate-spin" />}
                Upgrade now
              </button>
              <div className="text-[11px] text-gray-5 mt-4">
                Your projects, documents, and reports remain accessible on the free tier.
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <PageHeader title="Analytics" subtitle="Market intelligence and performance insights" />
        <div className="pm-dash-card p-6">
          <div className="flex items-center gap-3 text-red">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <div className="font-display text-[14px] font-semibold">Unable to load analytics</div>
              <div className="text-[12px] text-gray-4 mt-1">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasData = data && (data.competitors.length > 0 || data.categories.length > 0);
  const clientColor = data?.dashboardColor || "#0F6E56";

  /* ── Empty state ──────────────────────────────────────────── */
  if (!hasData) {
    return (
      <div className="page-content">
        <PageHeader title="Analytics" subtitle="Market intelligence and performance insights" />
        
        {data?.scope?.mismatch ? (
          <div className="pm-dash-alert pm-dash-alert-b mb-6">
            <BarChart3 size={14} />
            <span>Some shared categories are not part of your product mix</span>
          </div>
        ) : (
          <div className="pm-dash-alert pm-dash-alert-b mb-6">
            <BarChart3 size={14} />
            <span>Analytics data will appear here once your account manager uploads supplier performance data and approves it for your view.</span>
          </div>
        )}
        {data?.scope?.mismatch && (
          <div className="mb-6 text-[12px] text-gray-4">
            The categories shared with your account don&apos;t match the categories your supplier sells. Ask your
            account manager to align what&apos;s shared with your product mix, then check back here.
          </div>
        )}

        {/* ── Placeholder KPI row ────────────────────────── */}
        <div className="pm-dash-krow pm-dash-krow-4 mb-6">
          {[
            { label: "Total Revenue", sub: "from supplier sales data", color: "" },
            { label: "Market Share", sub: "your competitive position", color: "grn" },
            { label: "Products", sub: "tracked across categories", color: "blu" },
            { label: "Avg Margin", sub: "pricing intelligence", color: "red" },
          ].map((kpi) => (
            <div key={kpi.label} className="pm-dash-kcard" style={{ opacity: 0.5 }}>
              <div className={`pm-dash-kn ${kpi.color}`}>—</div>
              <div className="pm-dash-kl">{kpi.label}</div>
              <div className="pm-dash-ksub">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Placeholder chart cards ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Leaderboard placeholder */}
          <div className="lg:col-span-3 pm-dash-card p-5" style={{ opacity: 0.5 }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={14} className="text-yellow" />
              <span className="font-display text-[13px] font-semibold">Market Share Leaderboard</span>
            </div>
            <div className="space-y-3">
              {["Rank 1 — competitor", "Rank 2 — competitor", "Rank 3 — you", "Rank 4 — competitor", "Rank 5 — competitor"].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-gray-5 w-4 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="h-2 w-full rounded bg-[var(--ws-border,#e5e5e5)] overflow-hidden">
                      <div className="h-full rounded bg-gray-5" style={{ width: `${90 - i * 15}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center text-[11px] text-gray-5">Waiting for competitor sales data</div>
          </div>

          {/* Category share placeholder */}
          <div className="lg:col-span-2 pm-dash-card p-5" style={{ opacity: 0.5 }}>
            <div className="flex items-center gap-2 mb-4">
              <Tag size={14} className="text-teal" />
              <span className="font-display text-[13px] font-semibold">Category Share</span>
            </div>
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-24 h-24 rounded-full border-4 border-[var(--ws-border,#e5e5e5)] border-t-gray-5" />
              <div className="mt-3 text-center text-[11px] text-gray-5">Waiting for category data</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Branch performance placeholder */}
          <div className="pm-dash-card p-5" style={{ opacity: 0.5 }}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={14} className="text-orange" />
              <span className="font-display text-[13px] font-semibold">Branch Performance</span>
            </div>
            <div className="space-y-2">
              {["Branch A", "Branch B", "Branch C"].map((b) => (
                <div key={b} className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-5 w-16">{b}</span>
                  <div className="flex-1 h-2 rounded bg-[var(--ws-border,#e5e5e5)]">
                    <div className="h-full rounded bg-gray-5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center text-[11px] text-gray-5">Waiting for branch sales data</div>
          </div>

          {/* Pricing placeholder */}
          <div className="pm-dash-card p-5" style={{ opacity: 0.5 }}>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={14} className="text-yellow" />
              <span className="font-display text-[13px] font-semibold">Price Positioning</span>
            </div>
            <div className="space-y-2">
              {["Product A", "Product B", "Product C"].map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-5 w-16">{p}</span>
                  <div className="flex-1 h-2 rounded bg-[var(--ws-border,#e5e5e5)]">
                    <div className="h-full rounded bg-gray-5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center text-[11px] text-gray-5">Waiting for pricing data</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top products placeholder */}
          <div className="pm-dash-card p-5" style={{ opacity: 0.5 }}>
            <div className="flex items-center gap-2 mb-4">
              <Award size={14} className="text-emerald-400" />
              <span className="font-display text-[13px] font-semibold">Top Products</span>
            </div>
            <div className="space-y-2">
              {["Product A — KES 1.2M", "Product B — KES 890K", "Product C — KES 640K"].map((p) => (
                <div key={p} className="text-[12px] text-gray-5">{p}</div>
              ))}
            </div>
            <div className="mt-3 text-center text-[11px] text-gray-5">Waiting for product performance data</div>
          </div>

          {/* Underperforming placeholder */}
          <div className="pm-dash-card p-5" style={{ opacity: 0.5 }}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={14} className="text-orange" />
              <span className="font-display text-[13px] font-semibold">Underperforming Products</span>
            </div>
            <div className="space-y-2">
              {["Product X — KES 45K", "Product Y — KES 22K", "Product Z — KES 12K"].map((p) => (
                <div key={p} className="text-[12px] text-gray-5">{p}</div>
              ))}
            </div>
            <div className="mt-3 text-center text-[11px] text-gray-5">Waiting for product performance data</div>
          </div>
        </div>

        {/* ── What you'll get ──────────────────────────── */}
        <div className="pm-dash-card p-5">
          <div className="font-display text-[13px] font-semibold mb-3">What Analytics Will Show</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: <Trophy size={14} className="text-yellow" />, title: "Market Share", desc: "Your competitive position across all branches" },
              { icon: <Tag size={14} className="text-teal" />, title: "Category Performance", desc: "Revenue and volume breakdown by product category" },
              { icon: <MapPin size={14} className="text-orange" />, title: "Branch Analysis", desc: "Sales performance by location" },
              { icon: <DollarSign size={14} className="text-yellow" />, title: "Price Positioning", desc: "Margin analysis across your product range" },
              { icon: <Award size={14} className="text-emerald-400" />, title: "Product Rankings", desc: "Top and underperforming products" },
              { icon: <BarChart3 size={14} className="text-teal" />, title: "Trend Analysis", desc: "Period-over-period growth tracking" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)]">
                <div className="mt-0.5">{item.icon}</div>
                <div>
                  <div className="text-[12px] font-semibold text-gray-3">{item.title}</div>
                  <div className="text-[10px] text-gray-5 mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const s = data!.summary;
  const competitors = data!.competitors;
  const categories = data!.categories;
  const branches = data!.branches;
  const topProducts = data!.topProducts;
  const bottomProducts = data!.bottomProducts;
  const pricing = data!.pricing;

  const clientComp = competitors.find((c) => c.is_client);
  const maxBranchSales = Math.max(...branches.map((b) => b.total_amount), 1);
  const avgMargin = pricing.length > 0
    ? pricing.reduce((sum, p) => sum + p.margin_pct, 0) / pricing.length
    : 0;

  // Prefer maize-specific rank for consistency with overview page
  const maizeCompetitors = (maizeData?.competitors as Array<Record<string, unknown>> | undefined) || [];
  const maizeClient = maizeCompetitors.find((c) => c.is_client);
  const displayRank = maizeClient ? Number(maizeClient.rank) : clientComp?.rank;
  const displayShare = maizeClient ? Number(maizeClient.share) : clientComp?.share;
  const displayRevenue = maizeClient ? Number(maizeClient.total_sales) : clientComp?.total_sales;
  const displayUnits = maizeClient ? Number(maizeClient.total_units) : clientComp?.total_units;
  const displayTotal = maizeClient ? maizeCompetitors.length : competitors.length;

  // Use maize competitors for the leaderboard when available, so rank numbers are consistent
  const leaderboardCompetitors = maizeCompetitors.length > 0
    ? maizeCompetitors.map((c) => ({
        manufacturer: String(c.supplier || c.manufacturer || ""),
        total_sales: Number(c.total_sales),
        total_units: Number(c.total_units),
        share: Number(c.share),
        is_client: Boolean(c.is_client),
        rank: Number(c.rank),
      }))
    : competitors;
  const maxLeaderboardSales = Math.max(...leaderboardCompetitors.map((c) => c.total_sales), 1);

  // Category-view display name (generalized for any category tab).
  const categoryViewName =
    maizeData && typeof maizeData.category === "string"
      ? maizeData.category
      : data.clientCategories.find((c) => c.id === tab)?.name ||
        (tab === "maize" ? "Maize Flour" : "Category");
  const categoryClientComp = (maizeData?.competitors as Array<Record<string, unknown>> | undefined)?.find((c) => c.is_client);
  const categoryClientShortName =
    categoryClientComp && String(categoryClientComp.supplier || "").trim()
      ? String(categoryClientComp.supplier).trim().split(" ")[0]
      : "Your";

  // Branch × supplier share matrix: union of supplier names across branches,
  // ordered by peak share (max 6 columns). The client's supplier column is
  // always kept visible and highlighted.
  const matrixRows = data.branchMatrix || [];
  const matrixSuppliers = (() => {
    const byName = new Map<string, { name: string; maxShare: number; isClient: boolean }>();
    matrixRows.forEach((row) =>
      row.suppliers.forEach((sup) => {
        const share = Number(sup.share) || 0;
        const existing = byName.get(sup.name);
        if (!existing || share > existing.maxShare) {
          byName.set(sup.name, { name: sup.name, maxShare: share, isClient: Boolean(sup.is_client) });
        }
      }),
    );
    const sorted = Array.from(byName.values())
      .sort((a, b) => b.maxShare - a.maxShare)
      .slice(0, 6);
    const clientCol = Array.from(byName.values()).find((s) => s.isClient);
    if (clientCol && !sorted.some((s) => s.name === clientCol.name)) {
      if (sorted.length < 6) sorted.push(clientCol);
      else sorted[sorted.length - 1] = clientCol;
    }
    return sorted;
  })();

  const catShare = (cat: CategoryPerf) => (s.totalSales > 0 ? (cat.total_sales / s.totalSales) * 100 : 0);
  const catRank = (cat: CategoryPerf) => categories.findIndex((c) => c.category === cat.category) + 1;
  const marginHealth = (m: number) => (m >= 15 ? "text-green" : m >= 8 ? "text-yellow" : "text-red");
  const marginLabel = (m: number) => (m >= 15 ? "Healthy" : m >= 8 ? "Moderate" : "Low margin");
  const marginHex = (m: number) => (m >= 15 ? "#22C55E" : m >= 8 ? "#F4C300" : "#EF4444");

  return (
    <div className="page-content">
      <PageHeader
        title="Analytics"
        subtitle={`${competitors.length} competitors tracked · ${categories.length} categories · ${branches.length} branches`}
      />

      {/* ── Tab bar ──────────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("overview")}
          className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
            tab === "overview"
              ? "bg-teal text-white"
              : "bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] hover:text-[var(--ws-text,#1A1C23)]"
          }`}
        >
          <BarChart3 size={13} className="inline mr-1.5" />
          Live Analytics
        </button>
        <button
          onClick={() => setTab("reports")}
          className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
            tab === "reports"
              ? "bg-teal text-white"
              : "bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] hover:text-[var(--ws-text,#1A1C23)]"
          }`}
        >
          <FileText size={13} className="inline mr-1.5" />
          Reports
          {reports.length > 0 && (
            <span className="ml-1.5 bg-white/10 text-[10px] px-1.5 py-0.5 rounded-full">{reports.length}</span>
          )}
        </button>
        {data && data.clientCategories.length > 0
          ? data.clientCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setTab(cat.id)}
                className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                  tab === cat.id
                    ? "bg-teal text-white"
                    : "bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] hover:text-[var(--ws-text,#1A1C23)]"
                }`}
              >
                <ShoppingBag size={13} className="inline mr-1.5" />
                {cat.name}
              </button>
            ))
          : data && data.categories.some((c) => c.category.toLowerCase().includes("maize")) && (
              <button
                onClick={() => setTab("maize")}
                className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                  tab === "maize"
                    ? "bg-teal text-white"
                    : "bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] hover:text-[var(--ws-text,#1A1C23)]"
                }`}
              >
                <ShoppingBag size={13} className="inline mr-1.5" />
                Maize Flour
              </button>
            )}
      </div>

      {/* ═══ LIVE ANALYTICS TAB ═══════════════════════════════ */}
      {tab === "overview" && (
        <>
          {/* ── Filter Bar ─────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-5">Filters</span>
              {/* Period filter */}
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--ws-text,#1A1C23)] cursor-pointer"
              >
                <option value="all">All periods</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              {/* Branch filter */}
              <select
                value={filterBranches[0] || "all"}
                onChange={(e) => setFilterBranches(e.target.value === "all" ? [] : [e.target.value])}
                className="bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--ws-text,#1A1C23)] cursor-pointer"
              >
                <option value="all">All branches</option>
                {allBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {/* Category filter */}
              <select
                value={filterCategories[0] || "all"}
                onChange={(e) => setFilterCategories(e.target.value === "all" ? [] : [e.target.value])}
                className="bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--ws-text,#1A1C23)] cursor-pointer"
              >
                <option value="all">All categories</option>
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {/* Active filter count */}
              {(filterPeriod !== "all" || filterBranches.length > 0 || filterCategories.length > 0) && (
                <button
                  onClick={() => { setFilterPeriod("all"); setFilterBranches([]); setFilterCategories([]); }}
                  className="text-[10px] text-red hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  autoRefresh
                    ? "border-teal bg-teal/10 text-teal"
                    : "border-[var(--ws-border,#e5e5e5)] hover:bg-[var(--ws-bg)] text-[var(--ws-text,#1A1C23)]"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-teal animate-pulse" : "bg-gray-5"}`} />
                {autoRefresh ? "Auto" : "Manual"}
              </button>
              <button
                onClick={fetchData}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--ws-border,#e5e5e5)] hover:bg-[var(--ws-bg)] transition-colors cursor-pointer flex items-center gap-1.5 text-[var(--ws-text,#1A1C23)]"
              >
                <Loader2 size={12} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <span className="text-[10px] text-gray-5 hidden md:inline">
                {lastRefresh.toLocaleTimeString()}
              </span>
              <button
                onClick={() => {
                  let csv = "Metric,Value\n";
                  csv += `Total Revenue,${s.totalSales}\n`;
                  csv += `Total Units,${s.totalUnits}\n`;
                  csv += `Products,${s.totalProducts}\n`;
                  csv += `Avg Margin,${avgMargin.toFixed(1)}%\n\n`;
                  csv += "Competitor,Rank,Revenue,Share\n";
                  leaderboardCompetitors.forEach((c) => {
                    csv += `${c.manufacturer},${c.rank},${c.total_sales},${c.share.toFixed(1)}%\n`;
                  });
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "analytics-export.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--ws-border,#e5e5e5)] hover:bg-[var(--ws-bg)] transition-colors cursor-pointer flex items-center gap-1.5 text-[var(--ws-text,#1A1C23)]"
              >
                <FileText size={12} />
                CSV
              </button>
              <button
                onClick={() => {
                  // PDF export via browser print
                  window.print();
                }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-[var(--ws-border,#e5e5e5)] hover:bg-[var(--ws-bg)] transition-colors cursor-pointer flex items-center gap-1.5 text-[var(--ws-text,#1A1C23)]"
              >
                PDF
              </button>
            </div>
          </div>

          {/* ── KPI Summary Row ─────────────────────────── */}
          <ErrorBoundary fallbackTitle="KPI data unavailable">
          <div className="pm-dash-krow pm-dash-krow-4 mb-6">
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn">{fmt(s.totalSales)}</div>
              <div className="pm-dash-kl">Total Revenue</div>
              <div className="pm-dash-ksub flex items-center gap-2">
                {fmtNum(s.totalUnits)} units sold
                {s.prevTotalSales > 0 && (
                  <TrendArrow value={((s.totalSales - s.prevTotalSales) / s.prevTotalSales) * 100} label="vs prev" />
                )}
              </div>
            </div>
              <div className="pm-dash-kcard grn">
              <div className="pm-dash-kn grn">{clientComp ? fmtPct(displayShare) : "—"}</div>
              <div className="pm-dash-kl">{categoryViewName} Share</div>
              <div className="pm-dash-ksub flex items-center gap-2">
                {clientComp ? `Rank #${displayRank} of ${displayTotal}` : "Not ranked"}
                {clientComp && displayRank === 1 && <TrendArrow value={0} label="leader" />}
              </div>
            </div>
            <div className="pm-dash-kcard blu">
              <div className="pm-dash-kn blu">{fmtNum(s.totalProducts)}</div>
              <div className="pm-dash-kl">Products</div>
              <div className="pm-dash-ksub flex items-center gap-2">
                {categories.length} categories
              </div>
            </div>
            <div className="pm-dash-kcard red">
              <div className="pm-dash-kn red">{fmtPct(avgMargin)}</div>
              <div className="pm-dash-kl">Avg Margin</div>
              <div className="pm-dash-ksub flex items-center gap-2">
                {pricing.length} price points
              </div>
            </div>
          </div>
          </ErrorBoundary>

          {/* ── NICE Position Banner ──────────────────────── */}
          {clientComp && (
            <div className="mb-6 p-5 rounded-xl border-2 border-[#F4C300]/30 bg-[var(--ws-surface,#fff)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: `${clientColor}15`, border: `2px solid ${clientColor}33` }}>
                    <span className="text-2xl font-display font-bold" style={{ color: clientColor }}>#{displayRank}</span>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-widest font-mono" style={{ color: "var(--ws-text-muted,#70716C)" }}>Your Market Position</div>
                    <div className="text-[22px] font-display font-bold mt-0.5" style={{ color: clientColor }}>
                      {fmtPct(displayShare)} market share
                    </div>
                    <div className="text-[12px] mt-1" style={{ color: "var(--ws-text-muted,#70716C)" }}>
                      Ranked #{displayRank} of {displayTotal} {String(categoryViewName).toLowerCase()} suppliers · {fmt(displayRevenue)} revenue · {fmtNum(displayUnits)} units
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex flex-col items-end gap-1">
                  <div className="text-[10px] uppercase tracking-widest font-mono" style={{ color: "var(--ws-text-muted,#70716C)" }}>Category</div>
                  <div className="text-[14px] font-display font-semibold" style={{ color: "var(--ws-text,#1A1C23)" }}>{categoryViewName}</div>
                  <div className="text-[10px] font-mono" style={{ color: "var(--ws-text-muted,#70716C)" }}>Jan — Jul 2026</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Competitor Leaderboard + Category Share ─── */}
          <ErrorBoundary fallbackTitle="Leaderboard data unavailable">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            {/* Leaderboard - 3 cols */}
            <div className="lg:col-span-3 pm-dash-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-yellow" />
                  <span className="font-display text-[13px] font-semibold">{categoryViewName} Leaderboard</span>
                </div>
                {clientComp && (
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: `${clientColor}15`, color: clientColor }}
                  >
                    You: #{displayRank}
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {leaderboardCompetitors.slice(0, 8).map((comp) => {
                  const color = competitorColor(comp.rank, comp.is_client, clientColor);
                  const displayName = competitorLabel(comp.manufacturer, comp.is_client);
                  return (
                    <div key={comp.manufacturer} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-gray-5 w-4 text-right shrink-0">
                        {comp.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-[12px] truncate font-medium"
                            style={{ color: comp.is_client ? clientColor : "var(--ws-text,#1A1C23)" }}
                          >
                            {displayName}
                            {comp.is_client && (
                              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${clientColor}22`, color: clientColor }}>you</span>
                            )}
                          </span>
                          <span className="text-[11px] text-gray-4 shrink-0 ml-2">
                            {fmt(comp.total_sales)} · {fmtPct(comp.share)}
                          </span>
                        </div>
                        <HorizontalBar value={comp.total_sales} max={maxLeaderboardSales} color={color} height={14} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-[var(--ws-border,#e5e5e5)] text-[10px] text-gray-5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ANALYTICS_COLORS.yellow }} />
                  1st
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ANALYTICS_COLORS.gray }} />
                  2nd
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ANALYTICS_COLORS.orange }} />
                  3rd
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: clientColor }} />
                  You
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ANALYTICS_COLORS.blue }} />
                  Others
                </span>
              </div>
            </div>

            {/* Category Share Donut - 2 cols */}
            <div className="lg:col-span-2 pm-dash-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Tag size={14} className="text-teal" />
                <span className="font-display text-[13px] font-semibold">Category Share</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative">
                  <DonutChart
                    segments={categories.map((cat, i) => ({
                      value: cat.total_sales,
                      color: CHART_COLORS[i % CHART_COLORS.length],
                    }))}
                    size={150}
                    strokeWidth={20}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[18px] font-display font-bold text-[var(--ws-text)]">
                      {categories.length}
                    </span>
                    <span className="text-[10px] text-gray-5">categories</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 mt-4">
                {categories.slice(0, 6).map((cat, i) => {
                  const color = CHART_COLORS[i % CHART_COLORS.length];
                  return (
                    <div key={cat.category} className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
                        <span className="truncate text-gray-3">{cat.category}</span>
                      </span>
                      <span className="text-gray-5 shrink-0 ml-2">
                        {fmt(cat.total_sales)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </ErrorBoundary>

          {/* ── Branch Performance + Pricing ────────────── */}
          <ErrorBoundary fallbackTitle="Branch/pricing data unavailable">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Branch breakdown */}
            <div className="pm-dash-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={14} className="text-teal" />
                <span className="font-display text-[13px] font-semibold">Branch Performance</span>
              </div>

              <div className="space-y-2">
                {branches.slice(0, 10).map((branch, i) => (
                  <div key={branch.branch_id} className="flex items-center gap-3">
                    <div className="w-20 min-w-0 shrink-0">
                      <span className="text-[11px] text-gray-4 truncate block">{branch.branch_name}</span>
                    </div>
                    <div className="flex-1">
                      <HorizontalBar
                        value={branch.total_amount}
                        max={maxBranchSales}
                        color={CHART_COLORS[i % CHART_COLORS.length]}
                        height={14}
                      />
                    </div>
                    <span className="text-[11px] text-gray-4 shrink-0 w-16 text-right">
                      {fmt(branch.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price positioning */}
            <div className="pm-dash-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={14} className="text-yellow" />
                <span className="font-display text-[13px] font-semibold">Price Positioning</span>
              </div>

              <div className="space-y-2">
                {pricing.slice(0, 10).map((p, i) => {
                  const maxPrice = Math.max(...pricing.map((x) => x.selling_price), 1);
                  const marginColor = p.margin_pct > avgMargin
                    ? ANALYTICS_COLORS.green : p.margin_pct < avgMargin * 0.5
                    ? ANALYTICS_COLORS.red : ANALYTICS_COLORS.yellow;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-24 min-w-0 shrink-0">
                        <span className="text-[11px] text-gray-4 truncate block">{p.product}</span>
                        <span className="text-[9px] text-gray-5 font-mono">{p.branch}</span>
                      </div>
                      <div className="flex-1">
                        <HorizontalBar
                          value={p.selling_price}
                          max={maxPrice}
                          color={marginColor}
                          height={10}
                        />
                      </div>
                      <div className="text-right shrink-0 w-20">
                        <span className="text-[11px] text-gray-3 block">{fmt(p.selling_price)}</span>
                        <span className="text-[9px] block" style={{ color: marginColor }}>
                          {fmtPct(p.margin_pct)} margin
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Avg margin reference */}
              <div className="mt-3 pt-3 border-t border-[var(--ws-border,#e5e5e5)] flex items-center gap-2 text-[10px] text-gray-5">
                <span className="w-3 h-0.5 rounded" style={{ background: ANALYTICS_COLORS.yellow }} />
                Category avg margin: {fmtPct(avgMargin)}
              </div>
            </div>
          </div>
          </ErrorBoundary>

          {/* ── Branch × Supplier Share Matrix ───────────── */}
          <ErrorBoundary fallbackTitle="Branch share matrix unavailable">
          <div className="pm-dash-card p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={14} className="text-teal" />
              <span className="font-display text-[13px] font-semibold">Branch Share Matrix</span>
            </div>

            {matrixRows.length === 0 || matrixSuppliers.length === 0 ? (
              <div className="text-center py-8 text-[12px] text-gray-5" role="status">
                Branch share data not yet available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-[var(--ws-border,#e5e5e5)]">
                      <th className="font-mono text-[9px] text-gray-5 uppercase tracking-widest text-left px-2 py-2">
                        Branch
                      </th>
                      {matrixSuppliers.map((s) => (
                        <th
                          key={s.name}
                          className="font-mono text-[9px] uppercase tracking-widest text-right px-2 py-2 whitespace-nowrap"
                          style={s.isClient ? { color: clientColor } : { color: "var(--ws-text-muted,#70716C)" }}
                        >
                          {s.name}
                          {s.isClient && (
                            <span className="ml-1 text-[9px] font-medium">(you)</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((row) => (
                      <tr
                        key={row.branch_id || row.branch_name}
                        className="border-b border-[var(--ws-border,#e5e5e5)] last:border-0"
                      >
                        <td className="px-2 py-2 text-gray-4 whitespace-nowrap">{row.branch_name}</td>
                        {matrixSuppliers.map((s) => {
                          const sup = row.suppliers.find((x) => x.name === s.name);
                          const share = sup ? Number(sup.share) || 0 : 0;
                          return (
                            <td
                              key={s.name}
                              className="px-2 py-2 font-mono text-right whitespace-nowrap"
                              style={
                                s.isClient
                                  ? { background: `${clientColor}14`, color: clientColor }
                                  : { color: "var(--ws-text-muted,#70716C)" }
                              }
                            >
                              {share.toFixed(1)}%
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </ErrorBoundary>

          {/* ── Top / Bottom Products ───────────────────── */}
          <ErrorBoundary fallbackTitle="Product data unavailable">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top products */}
            <div className="pm-dash-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award size={14} className="text-emerald-400" />
                <span className="font-display text-[13px] font-semibold">Top Products</span>
              </div>

              <div className="space-y-2">
                {topProducts.map((prod, i) => (
                  <div key={prod.stock_code || i} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-5 w-4 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-gray-3 truncate font-medium">{prod.name}</span>
                        <span className="text-[11px] text-gray-4 shrink-0 ml-2">{fmt(prod.total_revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-5">
                        <span>{fmtNum(prod.total_qty)} units</span>
                        <span>·</span>
                        <span>{prod.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom products */}
            <div className="pm-dash-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown size={14} className="text-orange" />
                <span className="font-display text-[13px] font-semibold">Underperforming Products</span>
              </div>

              <div className="space-y-2">
                {bottomProducts.map((prod, i) => (
                  <div key={prod.stock_code || i} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-5 w-4 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-gray-3 truncate font-medium">{prod.name}</span>
                        <span className="text-[11px] text-gray-4 shrink-0 ml-2">{fmt(prod.total_revenue)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-5">
                        <span>{fmtNum(prod.total_qty)} units</span>
                        <span>·</span>
                        <span>{prod.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {bottomProducts.length === 0 && (
                  <div className="text-center py-4 text-[12px] text-gray-5">No underperforming products</div>
                )}
              </div>
            </div>
          </div>
          </ErrorBoundary>

          {/* ── Your Share Over Time ────────────────────── */}
          <ErrorBoundary fallbackTitle="Share trend data unavailable">
          <div className="pm-dash-card p-5 mb-6">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-teal" />
                <span className="font-display text-[13px] font-semibold">Your Share Over Time</span>
              </div>
              <div className="text-[10px] text-gray-5 mt-1">
                Percentage of category sales captured by your supplier
              </div>
            </div>
            <ShareTrendChart trend={data.salesTrend || []} color={clientColor} />
          </div>
          </ErrorBoundary>

          {/* ── Category Performance Detail ─────────────── */}
          <ErrorBoundary fallbackTitle="Category data unavailable">
          <div className="pm-dash-card p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} className="text-teal" />
              <span className="font-display text-[13px] font-semibold">Category Performance</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--ws-border,#e5e5e5)]">
                    {["Category", "Revenue", "Units", "Avg Price", "Products", "Share"].map((h) => (
                      <th key={h} className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-3 py-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const share = s.totalSales > 0 ? (cat.total_sales / s.totalSales) * 100 : 0;
                    return (
                      <tr
                        key={cat.category}
                        onClick={() => setSelectedCategory(cat)}
                        className="border-b border-[var(--ws-border,#e5e5e5)] hover:bg-[var(--ws-bg)] transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-2.5 text-[12px] font-semibold text-gray-3">{cat.category}</td>
                        <td className="px-3 py-2.5 text-[12px] font-display font-bold" style={{ color: clientColor }}>
                          {fmt(cat.total_sales)}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-gray-4">{fmtNum(cat.total_units)}</td>
                        <td className="px-3 py-2.5 text-[12px] text-gray-4">{fmt(cat.avg_unit_price)}</td>
                        <td className="px-3 py-2.5 text-[12px] text-gray-4">{cat.product_count}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded bg-[var(--ws-border,#e5e5e5)] overflow-hidden">
                              <div
                                className="h-full rounded"
                                style={{ width: `${share}%`, background: ANALYTICS_COLORS.yellow }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-4">{fmtPct(share)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </ErrorBoundary>
        </>
      )}

      {/* ═══ CATEGORY TAB (any client category) ═══════════════ */}
      {tab !== "overview" && tab !== "reports" && (
        <>
          {maizeLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-yellow" />
            </div>
          ) : maizeData ? (
            <>
              {/* KPI row */}
              <div className="pm-dash-krow pm-dash-krow-4 mb-6">
                <div className="pm-dash-kcard yel">
                  <div className="pm-dash-kn yel">
                    KES {(Number((maizeData.summary as Record<string, unknown>).totalSales) / 1000000).toFixed(1)}M
                  </div>
                  <div className="pm-dash-kl">{categoryViewName} Revenue</div>
                  <div className="pm-dash-ksub">total market</div>
                </div>
                <div className="pm-dash-kcard grn">
                  <div className="pm-dash-kn grn">
                    {(maizeData.competitors as Array<Record<string, unknown>>)?.find((c) => c.is_client)
                      ? `${Number((maizeData.competitors as Array<Record<string, unknown>>).find((c) => c.is_client)?.share).toFixed(1)}%`
                      : "—"}
                  </div>
                  <div className="pm-dash-kl">{categoryClientShortName} Market Share</div>
                  <div className="pm-dash-ksub">in {categoryViewName}</div>
                </div>
                <div className="pm-dash-kcard blu">
                  <div className="pm-dash-kn blu">{String((maizeData.summary as Record<string, unknown>).totalProducts)}</div>
                  <div className="pm-dash-kl">Products</div>
                  <div className="pm-dash-ksub">{(maizeData.products as Array<Record<string, unknown>>)?.length || 0} SKUs</div>
                </div>
                <div className="pm-dash-kcard red">
                  <div className="pm-dash-kn red">{Number((maizeData.summary as Record<string, unknown>).avgMargin).toFixed(1)}%</div>
                  <div className="pm-dash-kl">Avg Margin</div>
                  <div className="pm-dash-ksub">across branches</div>
                </div>
              </div>

              {/* Supplier leaderboard */}
              <div className="pm-dash-card p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={14} className="text-yellow" />
                  <span className="font-display text-[13px] font-semibold">{categoryViewName} Supplier Leaderboard</span>
                </div>
                <div className="space-y-2.5">
                  {(maizeData.competitors as Array<Record<string, unknown>>).map((comp) => {
                    const isClient = Boolean(comp.is_client);
                    return (
                    <div key={String(comp.supplier)} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-gray-5 w-4 shrink-0">{String(comp.rank)}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[12px] font-medium ${isClient ? "text-yellow" : "text-gray-3"}`}>
                            {competitorLabel(String(comp.supplier), isClient)}
                            {isClient && <span className="ml-1.5 text-[9px] text-yellow">(you)</span>}
                          </span>
                          <span className="text-[11px] text-gray-4">
                            KES {(Number(comp.total_sales) / 1000000).toFixed(1)}M · {Number(comp.share).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded bg-[var(--ws-border,#e5e5e5)] overflow-hidden">
                          <div className="h-full rounded" style={{
                            width: `${(Number(comp.total_sales) / Math.max(...(maizeData.competitors as Array<Record<string, unknown>>).map(c => Number(c.total_sales)))) * 100}%`,
                            background: isClient ? "#F4C300" : "#3B82F6",
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>

              {/* Branch performance within the category */}
              {(maizeData.branches as Array<Record<string, unknown>>)?.length > 0 && (
                <div className="pm-dash-card p-5 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={14} className="text-teal" />
                    <span className="font-display text-[13px] font-semibold">{categoryViewName} Branch Performance</span>
                  </div>
                  <div className="space-y-2">
                    {(maizeData.branches as Array<Record<string, unknown>>).slice(0, 8).map((b, i) => {
                      const maxVal = Math.max(...(maizeData.branches as Array<Record<string, unknown>>).slice(0, 8).map(x => Number(x.total)), 1);
                      return (
                        <div key={String(b.name) || i} className="flex items-center gap-3">
                          <span className="text-[11px] text-gray-4 w-20 truncate">{String(b.name)}</span>
                          <div className="flex-1 h-2 rounded bg-[var(--ws-border,#e5e5e5)] overflow-hidden">
                            <div className="h-full rounded" style={{
                              width: `${(Number(b.total) / maxVal) * 100}%`,
                              background: ["#F4C300", "#22C55E", "#3B82F6", "#EC4899", "#F97316"][i % 5],
                            }} />
                          </div>
                          <span className="text-[11px] text-gray-4 shrink-0 w-16 text-right">
                            KES {(Number(b.total) / 1000).toFixed(0)}K
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top Maize Products */}
              {(maizeData.products as Array<Record<string, unknown>>)?.length > 0 && (
                <div className="pm-dash-card p-5 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Award size={14} className="text-emerald-400" />
                    <span className="font-display text-[13px] font-semibold">Top {categoryViewName} Products</span>
                  </div>
                  <div className="space-y-2">
                    {(maizeData.products as Array<Record<string, unknown>>).slice(0, 8).map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-gray-5 w-4">{i + 1}</span>
                          <span className="text-gray-3 truncate">{String(p.name)}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-gray-5 text-[11px]">{Number(p.qty).toLocaleString()} units</span>
                          <span className="text-gray-3 font-mono font-medium w-20 text-right">
                            KES {(Number(p.total) / 1000).toFixed(0)}K
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Maize Pricing */}
              {(maizeData.pricing as Array<Record<string, unknown>>)?.length > 0 && (
                <div className="pm-dash-card p-5 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign size={14} className="text-yellow" />
                    <span className="font-display text-[13px] font-semibold">{categoryViewName} Pricing Analysis</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-[var(--ws-border,#e5e5e5)]">
                          {["Product", "Branch", "Selling Price", "Cost", "Margin"].map((h) => (
                            <th key={h} className="font-mono text-[9px] text-gray-5 uppercase tracking-widest text-left px-2 py-2">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(maizeData.pricing as Array<Record<string, unknown>>).slice(0, 10).map((p, i) => {
                          const margin = Number(p.margin_pct);
                          return (
                            <tr
                              key={i}
                              onClick={() =>
                                setSelectedPricing({
                                  product: String(p.product),
                                  stock_code: String(p.stock_code ?? ""),
                                  branch: String(p.branch ?? ""),
                                  selling_price: Number(p.selling_price),
                                  standard_cost: Number(p.standard_cost),
                                  margin_pct: margin,
                                })
                              }
                              className="border-b border-[var(--ws-border,#e5e5e5)] hover:bg-[var(--ws-bg)] transition-colors cursor-pointer"
                            >
                              <td className="px-2 py-2 text-gray-3">{String(p.product)}</td>
                              <td className="px-2 py-2 text-gray-5">{String(p.branch)}</td>
                              <td className="px-2 py-2 font-mono text-gray-3">KES {Number(p.selling_price).toFixed(0)}</td>
                              <td className="px-2 py-2 font-mono text-gray-5">KES {Number(p.standard_cost).toFixed(0)}</td>
                              <td className={`px-2 py-2 font-mono font-bold ${margin >= 15 ? "text-green" : margin >= 8 ? "text-yellow" : "text-red"}`}>
                                {margin.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[var(--ws-border,#e5e5e5)] flex items-center gap-2 text-[10px]" style={{ color: "var(--ws-text-muted,#70716C)" }}>
                    <span className="w-3 h-0.5 rounded bg-green" /> Healthy (≥15%)
                    <span className="w-3 h-0.5 rounded bg-yellow ml-2" /> Moderate (8-15%)
                    <span className="w-3 h-0.5 rounded bg-red ml-2" /> Low (&lt;8%)
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="pm-dash-card p-8 text-center">
              <ShoppingBag size={40} className="mx-auto mb-4 text-gray-5 opacity-30" />
              <div className="font-display text-[14px] font-semibold mb-2">{categoryViewName} Data Not Available</div>
              <div className="text-[12px] text-gray-4">No {categoryViewName} category data has been shared yet. Contact your account manager to set up {categoryViewName} category analytics.</div>
            </div>
          )}
        </>
      )}

      {/* ═══ REPORTS TAB ═══════════════════════════════════════ */}
      {tab === "reports" && (
        <>
          {reports.length === 0 ? (
            <div className="pm-dash-card p-8 text-center">
              <FileText size={40} className="mx-auto mb-4 text-gray-5 opacity-30" />
              <div className="font-display text-[14px] font-semibold mb-2">No Reports Published</div>
              <div className="text-[12px] text-gray-4 max-w-md mx-auto">
                Your account manager will publish analytics reports here once they are ready for your review.
              </div>
            </div>
          ) : (
            <>
              {/* Report selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(selectedReport === report.id ? null : report.id)}
                    className={`pm-dash-card p-4 text-left transition-all cursor-pointer ${
                      selectedReport === report.id
                        ? "border-teal ring-1 ring-teal/30"
                        : "hover:border-[var(--ws-border,#e5e5e5)]"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <FileText size={16} className="text-teal shrink-0" />
                      <Eye size={12} className="text-gray-5" />
                    </div>
                    <div className="font-display text-[13px] font-semibold mb-1">{report.name}</div>
                    <div className="text-[11px] text-gray-5 capitalize">
                      {report.report_type.replace(/_/g, " ")}
                    </div>
                    <div className="text-[10px] text-gray-5 mt-2">
                      Updated {new Date(report.updated_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected report detail */}
              {activeReport && <ReportViewer report={activeReport} />}
            </>
          )}
        </>
      )}

      {/* ── Category detail modal ───────────────────────────── */}
      <Modal open={!!selectedCategory} onClose={() => setSelectedCategory(null)} title="Category Details">
        {selectedCategory && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-[16px] font-bold">{selectedCategory.category}</div>
                <div className="text-[11px] text-gray-5 mt-0.5">Revenue share of all tracked sales</div>
              </div>
              <span
                className="text-[10px] font-mono px-2.5 py-1 rounded-full shrink-0"
                style={{ background: `${clientColor}15`, color: clientColor }}
              >
                #{catRank(selectedCategory)} of {categories.length} categories
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--ws-border,#e5e5e5)] bg-[var(--ws-bg,#f5f5f2)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-5 font-mono">Revenue</div>
                <div className="text-[17px] font-display font-bold mt-1" style={{ color: clientColor }}>
                  {fmtExact(selectedCategory.total_sales)}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--ws-border,#e5e5e5)] bg-[var(--ws-bg,#f5f5f2)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-5 font-mono">Units Sold</div>
                <div className="text-[17px] font-display font-bold mt-1">{fmtNum(selectedCategory.total_units)}</div>
              </div>
              <div className="rounded-xl border border-[var(--ws-border,#e5e5e5)] bg-[var(--ws-bg,#f5f5f2)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-5 font-mono">Avg Unit Price</div>
                <div className="text-[17px] font-display font-bold mt-1">{fmtPrice(selectedCategory.avg_unit_price)}</div>
              </div>
              <div className="rounded-xl border border-[var(--ws-border,#e5e5e5)] bg-[var(--ws-bg,#f5f5f2)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-5 font-mono">Products</div>
                <div className="text-[17px] font-display font-bold mt-1">{selectedCategory.product_count}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <span className="text-gray-5">Revenue share</span>
                <span className="font-mono font-semibold">{fmtPct(catShare(selectedCategory))}</span>
              </div>
              <div className="w-full h-2.5 rounded bg-[var(--ws-border,#e5e5e5)] overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{ width: `${Math.min(100, catShare(selectedCategory))}%`, background: clientColor }}
                />
              </div>
            </div>

            <div className="text-[12px] text-gray-5 leading-relaxed border-t border-[var(--ws-border,#e5e5e5)] pt-3">
              {selectedCategory.category} generated {fmtExact(selectedCategory.total_sales)} from{" "}
              {fmtNum(selectedCategory.total_units)} units across {selectedCategory.product_count} products —{" "}
              {fmtPct(catShare(selectedCategory))} of all portal-tracked revenue.
            </div>
          </div>
        )}
      </Modal>

      {/* ── Pricing detail modal ────────────────────────────── */}
      <Modal open={!!selectedPricing} onClose={() => setSelectedPricing(null)} title="Pricing Details">
        {selectedPricing && (
          <div className="space-y-5">
            <div>
              <div className="font-display text-[16px] font-bold">{selectedPricing.product}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {selectedPricing.stock_code && (
                  <span className="text-[11px] font-mono text-gray-5">{selectedPricing.stock_code}</span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--ws-border,#e5e5e5)] text-gray-5">
                  {selectedPricing.branch || "All branches"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--ws-border,#e5e5e5)] bg-[var(--ws-bg,#f5f5f2)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-5 font-mono">Selling Price</div>
                <div className="text-[17px] font-display font-bold mt-1">{fmtPrice(selectedPricing.selling_price)}</div>
              </div>
              <div className="rounded-xl border border-[var(--ws-border,#e5e5e5)] bg-[var(--ws-bg,#f5f5f2)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-5 font-mono">Standard Cost</div>
                <div className="text-[17px] font-display font-bold mt-1">{fmtPrice(selectedPricing.standard_cost)}</div>
              </div>
              <div className="rounded-xl border border-[var(--ws-border,#e5e5e5)] bg-[var(--ws-bg,#f5f5f2)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-5 font-mono">Profit / Unit</div>
                <div className="text-[17px] font-display font-bold mt-1 text-green">
                  {fmtPrice(selectedPricing.selling_price - selectedPricing.standard_cost)}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--ws-border,#e5e5e5)] bg-[var(--ws-bg,#f5f5f2)] p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-5 font-mono">Margin</div>
                <div className={`text-[17px] font-display font-bold mt-1 ${marginHealth(selectedPricing.margin_pct)}`}>
                  {fmtPct(selectedPricing.margin_pct)}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <span className="text-gray-5">Margin level</span>
                <span className={`font-mono font-semibold ${marginHealth(selectedPricing.margin_pct)}`}>
                  {marginLabel(selectedPricing.margin_pct)}
                </span>
              </div>
              <div className="w-full h-2.5 rounded bg-[var(--ws-border,#e5e5e5)] overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: `${Math.min(100, selectedPricing.margin_pct)}%`,
                    background: marginHex(selectedPricing.margin_pct),
                  }}
                />
              </div>
            </div>

            <div className="text-[12px] text-gray-5 leading-relaxed border-t border-[var(--ws-border,#e5e5e5)] pt-3">
              Sold at {fmtPrice(selectedPricing.selling_price)} against a standard cost of{" "}
              {fmtPrice(selectedPricing.standard_cost)} leaves {fmtPrice(selectedPricing.selling_price - selectedPricing.standard_cost)}{" "}
              per unit — {marginLabel(selectedPricing.margin_pct).toLowerCase()} margin.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
