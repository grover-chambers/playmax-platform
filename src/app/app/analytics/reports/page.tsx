"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Save,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  PieChart,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import type {
  AnalyticsCategory,
  MarketShareResponse,
  CategoryPerformanceRow,
  CompetitorRow,
} from "@/lib/analytics-types";

type ReportTab = "market_share" | "category_performance" | "competitor_comparison";

const reportTabs: { key: ReportTab; label: string; icon: React.ElementType }[] = [
  { key: "market_share", label: "Market Share", icon: TrendingUp },
  { key: "category_performance", label: "Category Performance", icon: BarChart3 },
  { key: "competitor_comparison", label: "Competitor Comparison", icon: PieChart },
];

function formatKES(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${n.toLocaleString()}`;
}

function growthBadge(current: number, prev: number) {
  if (prev === 0) return { icon: Minus, color: "text-gray-5", label: "n/a" };
  const pct = ((current - prev) / prev) * 100;
  if (pct > 3) return { icon: TrendingUp, color: "text-green", label: `+${pct.toFixed(1)}%` };
  if (pct < -3) return { icon: TrendingDown, color: "text-red", label: `${pct.toFixed(1)}%` };
  return { icon: Minus, color: "text-gray-5", label: `${pct.toFixed(1)}%` };
}

export default function MarketShareReport() {
  const router = useRouter();

  // Dimension data for selectors
  const [categories, setCategories] = useState<AnalyticsCategory[]>([]);

  // Filter state
  const [activeTab, setActiveTab] = useState<ReportTab>("market_share");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [compareStart, setCompareStart] = useState("");
  const [compareEnd, setCompareEnd] = useState("");

  // Query state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketShareResponse | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryPerformanceRow[]>([]);
  const [competitorData, setCompetitorData] = useState<CompetitorRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Load dimensions for selectors
  useEffect(() => {
    fetch("/api/analytics/dimensions")
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories ?? []);
      })
      .catch(() => {});
  }, []);

  const runQuery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { type: activeTab };
      if (selectedCategory) body.category = selectedCategory;
      if (periodStart) body.period_start = periodStart;
      if (periodEnd) body.period_end = periodEnd;
      if (compareStart) body.compare_start = compareStart;
      if (compareEnd) body.compare_end = compareEnd;

      const res = await fetch("/api/analytics/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Query failed" }));
        throw new Error(err.error ?? "Query failed");
      }

      const data = await res.json();
      switch (activeTab) {
        case "market_share":
          setMarketData(data);
          break;
        case "category_performance":
          setCategoryData(data.categories ?? []);
          break;
        case "competitor_comparison":
          setCompetitorData(data.manufacturers ?? []);
          break;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to run query");
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, periodStart, periodEnd, compareStart, compareEnd]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const config: Record<string, unknown> = {};
      if (selectedCategory) config.category = selectedCategory;
      if (periodStart) config.period_start = periodStart;
      if (periodEnd) config.period_end = periodEnd;
      if (compareStart) config.compare_start = compareStart;
      if (compareEnd) config.compare_end = compareEnd;

      const label =
        activeTab === "market_share"
          ? `Market Share — ${selectedCategory || "All categories"}`
          : activeTab === "category_performance"
            ? `Category Performance — ${selectedCategory || "All categories"}`
            : `Competitor Comparison — ${selectedCategory || "All categories"}`;

      const res = await fetch("/api/analytics/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: label, report_type: activeTab, config }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(err.error ?? "Save failed");
      }

      setSaveMsg("Report saved!");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: unknown) {
      setSaveMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };



  const maxShare = marketData
    ? Math.max(...marketData.branches.map((r) => r.share), 1)
    : 1;

  return (
    <div className="page-content">
      <PageHeader
        title="Reports"
        subtitle="Build and view market analysis reports"
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.push("/app/analytics/reports/saved")}>
            <Download className="w-3.5 h-3.5" />
            Saved reports
          </Button>
        }
      />

      {/* ── Report type tabs ── */}
      <div className="flex gap-1 mt-5 border-b border-[#252525]">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-[11px] font-medium border-b-2 transition-all cursor-pointer ${
                isActive
                  ? "border-yellow text-white"
                  : "border-transparent text-gray-5 hover:text-gray-3"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Parameter strip ── */}
      <div className="flex items-center gap-3 mt-5 pb-4 border-b border-[#252525] flex-wrap">
        {activeTab === "market_share" && (
          <div>
            <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-black-3 border border-[#252525] rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
            Period start
          </label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="bg-black-3 border border-[#252525] rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
          />
        </div>
        <div>
          <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
            Period end
          </label>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="bg-black-3 border border-[#252525] rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
          />
        </div>
        <div>
          <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
            Compare start
          </label>
          <input
            type="date"
            value={compareStart}
            onChange={(e) => setCompareStart(e.target.value)}
            className="bg-black-3 border border-[#252525] rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
          />
        </div>
        <div>
          <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
            Compare end
          </label>
          <input
            type="date"
            value={compareEnd}
            onChange={(e) => setCompareEnd(e.target.value)}
            className="bg-black-3 border border-[#252525] rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
          />
        </div>
        <div className="flex items-end gap-2 ml-auto">
          {saveMsg && (
            <span className={`text-[11px] mr-2 ${saveMsg === "Report saved!" ? "text-green" : "text-red"}`}>
              {saveMsg}
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={runQuery} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Running...
              </span>
            ) : (
              "Run query"
            )}
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                <Save className="w-3 h-3" />
                Save report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg bg-red/10 border border-red/20 text-red text-[12px]">
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 text-gray-5 animate-spin" />
          <span className="ml-2 text-[12px] text-gray-5">Running query...</span>
        </div>
      )}

      {/* ══════ MARKET SHARE ══════ */}
      {!loading && activeTab === "market_share" && marketData && (
        <>
          <div className="mt-5 mb-4">
            <h2 className="font-display text-[18px] font-bold text-white">
              Market Share by Branch — {marketData.category || "All Categories"}
            </h2>
            <p className="text-[11px] text-gray-5 mt-1">
              {marketData.period.label} · Total market: {formatKES(marketData.total_sales)}
              {marketData.compare_period && (
                <> · vs {marketData.compare_period.label}</>
              )}
            </p>
          </div>

          {/* Bar chart */}
          <div className="bg-black-3 border border-[#252525] rounded-lg p-5 mb-5">
            <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-4">
              Branch market share
            </h3>
            <div className="space-y-2.5">
              {marketData.branches
                .sort((a, b) => b.share - a.share)
                .map((r) => {
                  const pct = (r.share / maxShare) * 100;
                  const barColor = r.rank <= 3 ? "bg-yellow" : "bg-white/10";
                  const barBorder = r.rank <= 3 ? "" : "border border-white/5";

                  return (
                    <div key={r.branch_code} className="flex items-center gap-3">
                      <span className="w-[160px] text-[11px] text-gray-3 text-right truncate flex-shrink-0">
                        {r.branch}
                      </span>
                      <div className="flex-1 h-5 bg-black-2 rounded-sm overflow-hidden relative">
                        <div
                          className={`h-full rounded-sm transition-all ${barColor} ${barBorder}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-[60px] text-[11px] text-white font-mono text-right flex-shrink-0">
                        {r.share.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Data table */}
          <div className="bg-black-3 border border-[#252525] rounded-lg overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-5 font-mono border-b border-[#252525]">
                  <th className="text-left px-4 py-3 font-normal">Rank</th>
                  <th className="text-left px-4 py-3 font-normal">Branch</th>
                  <th className="text-right px-4 py-3 font-normal">Sales (KES)</th>
                  <th className="text-right px-4 py-3 font-normal">Share %</th>
                  <th className="text-right px-4 py-3 font-normal">vs Previous</th>
                </tr>
              </thead>
              <tbody>
                {marketData.branches
                  .sort((a, b) => a.rank - b.rank)
                  .map((r) => {
                    const badge = growthBadge(r.sales, r.prev_sales);
                    const BadgeIcon = badge.icon;
                    return (
                      <tr key={r.branch_code} className="border-b border-[#1E1E1E] last:border-0">
                        <td className="px-4 py-3">
                          <span className={`font-mono font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            r.rank === 1
                              ? "bg-yellow/10 text-yellow"
                              : r.rank <= 3
                                ? "bg-gray-4/10 text-gray-3"
                                : "text-gray-5"
                          }`}>
                            #{r.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white font-medium">{r.branch}</td>
                        <td className="px-4 py-3 text-right text-white font-mono">
                          {formatKES(r.sales)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <div className="relative h-4 w-full inline-block align-middle">
                            <div
                              className="absolute right-0 top-1/2 -translate-y-1/2 h-3 rounded-sm bg-yellow/30"
                              style={{ width: `${(r.share / maxShare) * 60}px` }}
                            />
                            <span className="relative z-10 px-2 text-white">{r.share.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 font-mono ${badge.color}`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="border-t border-[#252525] bg-black-2">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 text-white font-semibold">Total</td>
                  <td className="px-4 py-3 text-right text-white font-semibold font-mono">
                    {formatKES(marketData.total_sales)}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-semibold font-mono">
                    100%
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* ══════ CATEGORY PERFORMANCE ══════ */}
      {!loading && activeTab === "category_performance" && (
        <>
          <div className="mt-5 mb-4">
            <h2 className="font-display text-[18px] font-bold text-white">Category Performance</h2>
            <p className="text-[11px] text-gray-5 mt-1">
              Sales breakdown by product category
            </p>
          </div>

          {/* Bar chart */}
          <div className="bg-black-3 border border-[#252525] rounded-lg p-5 mb-5">
            <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-4">
              Category sales
            </h3>
            <div className="space-y-2.5">
              {categoryData
                .sort((a, b) => b.total_sales - a.total_sales)
                .map((r) => {
                  const maxCat = Math.max(...categoryData.map((c) => c.total_sales), 1);
                  const pct = (r.total_sales / maxCat) * 100;
                  return (
                    <div key={r.category} className="flex items-center gap-3">
                      <span className="w-[160px] text-[11px] text-gray-3 text-right truncate flex-shrink-0">
                        {r.category}
                      </span>
                      <div className="flex-1 h-5 bg-black-2 rounded-sm overflow-hidden relative">
                        <div
                          className="h-full rounded-sm bg-yellow transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-[80px] text-[11px] text-white font-mono text-right flex-shrink-0">
                        {formatKES(r.total_sales)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Data table */}
          <div className="bg-black-3 border border-[#252525] rounded-lg overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-5 font-mono border-b border-[#252525]">
                  <th className="text-left px-4 py-3 font-normal">Category</th>
                  <th className="text-right px-4 py-3 font-normal">Sales (KES)</th>
                  <th className="text-right px-4 py-3 font-normal">Units</th>
                  <th className="text-right px-4 py-3 font-normal">Avg Price</th>
                  <th className="text-right px-4 py-3 font-normal">Products</th>
                  <th className="text-right px-4 py-3 font-normal">vs Previous</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-5">No data available.</td>
                  </tr>
                )}
                {categoryData
                  .sort((a, b) => b.total_sales - a.total_sales)
                  .map((r) => {
                    const badge = growthBadge(r.total_sales, r.prev_total_sales);
                    const BadgeIcon = badge.icon;
                    return (
                      <tr key={r.category} className="border-b border-[#1E1E1E] last:border-0">
                        <td className="px-4 py-3 text-white font-medium">{r.category}</td>
                        <td className="px-4 py-3 text-right text-white font-mono">{formatKES(r.total_sales)}</td>
                        <td className="px-4 py-3 text-right text-gray-4 font-mono">{r.total_units.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-4 font-mono">{formatKES(r.avg_unit_price)}</td>
                        <td className="px-4 py-3 text-right text-gray-4 font-mono">{r.product_count}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 font-mono ${badge.color}`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ══════ COMPETITOR COMPARISON ══════ */}
      {!loading && activeTab === "competitor_comparison" && (
        <>
          <div className="mt-5 mb-4">
            <h2 className="font-display text-[18px] font-bold text-white">Competitor Comparison</h2>
            <p className="text-[11px] text-gray-5 mt-1">
              Sales by manufacturer — market position analysis
            </p>
          </div>

          {/* Bar chart */}
          <div className="bg-black-3 border border-[#252525] rounded-lg p-5 mb-5">
            <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-4">
              Manufacturer market share
            </h3>
            <div className="space-y-2.5">
              {competitorData
                .sort((a, b) => b.share - a.share)
                .map((r) => {
                  const maxComp = Math.max(...competitorData.map((c) => c.share), 1);
                  const pct = (r.share / maxComp) * 100;
                  return (
                    <div key={r.manufacturer} className="flex items-center gap-3">
                      <span className="w-[160px] text-[11px] text-gray-3 text-right truncate flex-shrink-0">
                        {r.manufacturer}
                      </span>
                      <div className="flex-1 h-5 bg-black-2 rounded-sm overflow-hidden relative">
                        <div
                          className="h-full rounded-sm bg-yellow transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-[60px] text-[11px] text-white font-mono text-right flex-shrink-0">
                        {r.share.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Data table */}
          <div className="bg-black-3 border border-[#252525] rounded-lg overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-5 font-mono border-b border-[#252525]">
                  <th className="text-left px-4 py-3 font-normal">Manufacturer</th>
                  <th className="text-right px-4 py-3 font-normal">Sales (KES)</th>
                  <th className="text-right px-4 py-3 font-normal">Units</th>
                  <th className="text-right px-4 py-3 font-normal">Share %</th>
                  <th className="text-right px-4 py-3 font-normal">Products</th>
                  <th className="text-right px-4 py-3 font-normal">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {competitorData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-5">No data available.</td>
                  </tr>
                )}
                {competitorData
                  .sort((a, b) => b.total_sales - a.total_sales)
                  .map((r) => (
                    <tr key={r.manufacturer} className="border-b border-[#1E1E1E] last:border-0">
                      <td className="px-4 py-3 text-white font-medium">{r.manufacturer}</td>
                      <td className="px-4 py-3 text-right text-white font-mono">{formatKES(r.total_sales)}</td>
                      <td className="px-4 py-3 text-right text-gray-4 font-mono">{r.total_units.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-4 font-mono">{r.share.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right text-gray-4 font-mono">{r.product_count}</td>
                      <td className="px-4 py-3 text-right text-gray-4 font-mono">{formatKES(r.avg_unit_price)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Empty state (no data loaded yet) */}
      {!loading && !error && !marketData && activeTab === "market_share" && (
        <div className="flex items-center justify-center py-16 text-gray-5 text-[12px]">
          Click &quot;Run query&quot; to fetch data.
        </div>
      )}
    </div>
  );
}
