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
  Wheat,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import { AnalyticsChart } from "@/components/charts/analytics-chart";
import type { ChartProps } from "@/components/charts/analytics-chart";
import { transformChartData } from "@/lib/analytics-transform";
import { findCategory } from "@/lib/report-types";
import type { ChartType } from "@/lib/report-types";
import { ANALYTICS_COLORS, CHART_COLORS } from "@/lib/analytics-colors";

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
  };
  error?: string;
}

/* ── Color system ──────────────────────────────────────────────── */

const RANK_COLORS = {
  gold:   ANALYTICS_COLORS.yellow,
  silver: ANALYTICS_COLORS.gray,
  bronze: ANALYTICS_COLORS.orange,
  gray:   ANALYTICS_COLORS.purple,
  faded:  ANALYTICS_COLORS.blue,
};

function competitorColor(rank: number, isClient: boolean, clientColor: string): string {
  if (isClient) return clientColor;
  if (rank === 1) return RANK_COLORS.gold;
  if (rank === 2) return RANK_COLORS.silver;
  if (rank === 3) return RANK_COLORS.bronze;
  return RANK_COLORS.faded;
}

function competitorLabel(name: string, isClient: boolean, rank: number): string {
  if (isClient) return name;
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `Competitor ${letters[(rank - 1) % 26]}`;
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

function fmtPct(n: number | null | undefined): string {
  return `${(n ?? 0).toFixed(1)}%`;
}

/* ── SVG Bar Chart Components ─────────────────────────────────── */

function HorizontalBar({ value, max, color, height = 18 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full rounded overflow-hidden" style={{ height, background: "#1A1A1A" }}>
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

/* ── Report Viewer Component ──────────────────────────────────── */

function ReportViewer({ report }: { report: SavedReport }) {
  const reportCategory = findCategory(report.report_type);

  const gd = report.generated_data as { data?: Record<string, unknown>[]; chart_type?: string } | undefined;
  const rawData = gd?.data ?? [];
  const chartProps: ChartProps | null = gd?.data && gd?.chart_type
    ? transformChartData(gd.chart_type as ChartType, gd.data)
    : null;

  return (
    <div className="pm-dash-card p-5">
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
            <summary className="text-[11px] text-gray-5 cursor-pointer hover:text-white transition-colors select-none">
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
                    <tr key={i} className="border-b border-[var(--ws-border,#e5e5e5)] hover:bg-white/2">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className={`px-2 py-1.5 ${typeof v === "number" ? "font-mono text-right" : ""}`}
                          style={{ color: typeof v === "number" ? "#ccc" : "#999" }}>
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
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */

export default function PortalAnalyticsPage() {
  const [tab, setTab] = useState<"overview" | "maize" | "reports">("overview");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [maizeData, setMaizeData] = useState<Record<string, unknown> | null>(null);
  const [maizeLoading, setMaizeLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, reportsRes, maizeRes] = await Promise.all([
          fetch("/api/portal/analytics"),
          fetch("/api/portal/analytics/reports"),
          fetch("/api/portal/analytics/category/maizze"),
        ]);
        const analyticsData = await analyticsRes.json();
        const reportsData = await reportsRes.json();
        const maize = await maizeRes.json();

        startTransition(() => {
          if (analyticsData.error) {
            setError(analyticsData.error);
          } else {
            setData(analyticsData);
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
    };
    fetchData();
  }, []);

  /* ── Loading / Error states ───────────────────────────────── */
  if (loading) {
    return (
      <div className="page-content">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-teal" />
        </div>
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
        
        <div className="pm-dash-alert pm-dash-alert-b mb-6">
          <BarChart3 size={14} />
          <span>Analytics data will appear here once your account manager uploads supplier performance data and approves it for your view.</span>
        </div>

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

  const activeReport = selectedReport ? reports.find((r) => r.id === selectedReport) : null;

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
        {data && data.categories.some((c) => c.category.toLowerCase().includes("maize")) && (
        <button
          onClick={() => setTab("maize")}
          className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
            tab === "maize"
              ? "bg-teal text-white"
              : "bg-[var(--ws-surface,#fff)] border border-[var(--ws-border,#e5e5e5)] hover:text-[var(--ws-text,#1A1C23)]"
          }`}
        >
          <Wheat size={13} className="inline mr-1.5" />
          Maize Flour
          </button>
        )}
      </div>

      {/* ═══ LIVE ANALYTICS TAB ═══════════════════════════════ */}
      {tab === "overview" && (
        <>
          {/* ── KPI Summary Row ─────────────────────────── */}
          <div className="pm-dash-krow pm-dash-krow-4 mb-6">
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn">{fmt(s.totalSales)}</div>
              <div className="pm-dash-kl">Total Revenue</div>
              <div className="pm-dash-ksub">{fmtNum(s.totalUnits)} units sold</div>
            </div>
              <div className="pm-dash-kcard grn">
              <div className="pm-dash-kn grn">{clientComp ? fmtPct(displayShare) : "—"}</div>
              <div className="pm-dash-kl">Maize Flour Share</div>
              <div className="pm-dash-ksub">
                {clientComp ? `Rank #${displayRank} of ${displayTotal} maize suppliers` : "Not ranked"}
              </div>
            </div>
            <div className="pm-dash-kcard blu">
              <div className="pm-dash-kn blu">{fmtNum(s.totalProducts)}</div>
              <div className="pm-dash-kl">Products</div>
              <div className="pm-dash-ksub">{categories.length} categories</div>
            </div>
            <div className="pm-dash-kcard red">
              <div className="pm-dash-kn red">{fmtPct(avgMargin)}</div>
              <div className="pm-dash-kl">Avg Margin</div>
              <div className="pm-dash-ksub">{pricing.length} price points</div>
            </div>
          </div>

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
                      Ranked #{displayRank} of {displayTotal} maize suppliers · {fmt(displayRevenue)} revenue · {fmtNum(displayUnits)} units
                    </div>
                  </div>
                </div>
                <div className="hidden md:flex flex-col items-end gap-1">
                  <div className="text-[10px] uppercase tracking-widest font-mono" style={{ color: "var(--ws-text-muted,#70716C)" }}>Category</div>
                  <div className="text-[14px] font-display font-semibold" style={{ color: "var(--ws-text,#1A1C23)" }}>Maize Flour</div>
                  <div className="text-[10px] font-mono" style={{ color: "var(--ws-text-muted,#70716C)" }}>Jan — Jul 2026</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Competitor Leaderboard + Category Share ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            {/* Leaderboard - 3 cols */}
            <div className="lg:col-span-3 pm-dash-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-yellow" />
                  <span className="font-display text-[13px] font-semibold">Maize Flour Leaderboard</span>
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
                  const displayName = competitorLabel(comp.manufacturer, comp.is_client, comp.rank);
                  return (
                    <div key={comp.manufacturer} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-gray-5 w-4 text-right shrink-0">
                        {comp.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-[12px] truncate font-medium"
                            style={{ color: comp.is_client ? clientColor : "#e5e5e5" }}
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
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RANK_COLORS.gold }} />
                  1st
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RANK_COLORS.silver }} />
                  2nd
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RANK_COLORS.bronze }} />
                  3rd
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: clientColor }} />
                  You
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RANK_COLORS.faded }} />
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
                    <span className="text-[18px] font-display font-bold text-white">
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

          {/* ── Branch Performance + Pricing ────────────── */}
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

          {/* ── Top / Bottom Products ───────────────────── */}
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

          {/* ── Category Performance Detail ─────────────── */}
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
                      <tr key={cat.category} className="border-b border-[var(--ws-border,#e5e5e5)] hover:bg-white/2 transition-colors">
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
        </>
      )}

      {/* ═══ MAIZE FLOUR TAB ═══════════════════════════════════ */}
      {tab === "maize" && (
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
                  <div className="pm-dash-kl">Maize Revenue</div>
                  <div className="pm-dash-ksub">total market</div>
                </div>
                <div className="pm-dash-kcard grn">
                  <div className="pm-dash-kn grn">
                    {(maizeData.competitors as Array<Record<string, unknown>>)?.find((c) => c.is_client)
                      ? `${Number((maizeData.competitors as Array<Record<string, unknown>>).find((c) => c.is_client)?.share).toFixed(1)}%`
                      : "—"}
                  </div>
                  <div className="pm-dash-kl">NICE Market Share</div>
                  <div className="pm-dash-ksub">in Maize Flour</div>
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
                  <span className="font-display text-[13px] font-semibold">Maize Supplier Leaderboard</span>
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
                            {competitorLabel(String(comp.supplier), isClient, Number(comp.rank))}
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

              {/* Branch performance within Maize */}
              {(maizeData.branches as Array<Record<string, unknown>>)?.length > 0 && (
                <div className="pm-dash-card p-5 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={14} className="text-teal" />
                    <span className="font-display text-[13px] font-semibold">Maize Branch Performance</span>
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
                    <span className="font-display text-[13px] font-semibold">Top Maize Products</span>
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
                    <span className="font-display text-[13px] font-semibold">Maize Pricing Analysis</span>
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
                            <tr key={i} className="border-b border-[var(--ws-border,#e5e5e5)]">
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
              <div className="font-display text-[14px] font-semibold mb-2">Maize Data Not Available</div>
              <div className="text-[12px] text-gray-4">No maize category data has been shared yet. Contact your account manager to set up Maize Flour category analytics.</div>
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
    </div>
  );
}
