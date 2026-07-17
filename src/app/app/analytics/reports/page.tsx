"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Save,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  PieChart,
  Package,
  DollarSign,
  ArrowUpDown,
  Truck,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import Pagination, { usePagination } from "@/components/ui/pagination";
import type {
  AnalyticsCategory,
  MarketShareResponse,
  CategoryPerformanceRow,
  CompetitorRow,
} from "@/lib/analytics-types";

/* ── Types ──────────────────────────────────────────────────── */

type ReportTab =
  | "market_share"
  | "category_performance"
  | "competitor_comparison"
  | "inventory_summary"
  | "pricing_analysis"
  | "stock_movements"
  | "supplier_performance";

interface InventoryItem {
  product: string;
  stock_code: string;
  category: string;
  sub_category: string;
  quantity_on_hand: number;
  unit_cost: number;
  total_value: number;
  last_updated: string;
}

interface PricingItem {
  product: string;
  stock_code: string;
  category: string;
  standard_cost: number;
  selling_price: number;
  margin_pct: number;
  tier: string;
  discount_pct: number;
  effective_date: string;
}

interface StockMovement {
  date: string;
  product: string;
  stock_code: string;
  supplier: string;
  type: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  reference: string;
  batch: string;
}

interface SupplierRow {
  name: string;
  code: string;
  payment_terms: string;
  lead_time_days: number;
  product_count: number;
  avg_cost: number;
  total_inbound_quantity: number;
  total_inbound_value: number;
  total_movements: number;
}

interface AnalyticsSubcategory {
  id: string;
  category_id: string;
  name: string;
}

interface AnalyticsBranch {
  id: string;
  code: string;
  name: string;
  city: string | null;
  region: string | null;
  tier: string;
}

/* ── Tab config ─────────────────────────────────────────────── */

const reportTabs: { key: ReportTab; label: string; icon: React.ElementType }[] = [
  { key: "market_share", label: "Market Share", icon: TrendingUp },
  { key: "category_performance", label: "Category Performance", icon: BarChart3 },
  { key: "competitor_comparison", label: "Competitor Comparison", icon: PieChart },
  { key: "inventory_summary", label: "Inventory Summary", icon: Package },
  { key: "pricing_analysis", label: "Pricing Analysis", icon: DollarSign },
  { key: "stock_movements", label: "Stock Movements", icon: ArrowUpDown },
  { key: "supplier_performance", label: "Supplier Performance", icon: Truck },
];

const tabsNeedingPeriod: ReportTab[] = [
  "market_share",
  "category_performance",
  "competitor_comparison",
  "pricing_analysis",
];

const tabsWithCategory: ReportTab[] = [
  "market_share",
  "category_performance",
  "competitor_comparison",
  "inventory_summary",
  "pricing_analysis",
  "stock_movements",
  "supplier_performance",
];

/* ── Helpers ────────────────────────────────────────────────── */

function formatKES(n: number | null | undefined) {
  const num = n ?? 0;
  if (num >= 1_000_000) return `KES ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `KES ${(num / 1_000).toFixed(0)}K`;
  return `KES ${num.toLocaleString()}`;
}

function growthBadge(current: number | null | undefined, prev: number | null | undefined) {
  const c = current ?? 0;
  const p = prev ?? 0;
  if (p === 0) return { icon: Minus, bdg: "pm-dash-bdg-n", label: "n/a" };
  const pct = ((c - p) / p) * 100;
  if (pct > 3) return { icon: TrendingUp, bdg: "pm-dash-bdg-g", label: `+${(pct ?? 0).toFixed(1)}%` };
  if (pct < -3) return { icon: TrendingDown, bdg: "pm-dash-bdg-r", label: `${(pct ?? 0).toFixed(1)}%` };
  return { icon: Minus, bdg: "pm-dash-bdg-y", label: `${(pct ?? 0).toFixed(1)}%` };
}

function movementBadge(type: string) {
  switch (type) {
    case "in": return "pm-dash-bdg-g";
    case "out": return "pm-dash-bdg-r";
    case "adjust": return "pm-dash-bdg-y";
    default: return "pm-dash-bdg-n";
  }
}

/* ══════════════════════════════════════════════════════════════ */

export default function MarketShareReport() {
  const router = useRouter();

  /* ── Dimension data ── */
  const [categories, setCategories] = useState<AnalyticsCategory[]>([]);

  /* ── Filter state ── */
  const [activeTab, setActiveTab] = useState<ReportTab>("market_share");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [subcategories, setSubcategories] = useState<AnalyticsSubcategory[]>([]);
  const [branches, setBranches] = useState<AnalyticsBranch[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [compareStart, setCompareStart] = useState("");
  const [compareEnd, setCompareEnd] = useState("");

  /* ── Query state ── */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [marketData, setMarketData] = useState<MarketShareResponse | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryPerformanceRow[]>([]);
  const [competitorData, setCompetitorData] = useState<CompetitorRow[]>([]);
  const [inventoryData, setInventoryData] = useState<{ items: InventoryItem[]; totals: { total_value: number; total_units: number; product_count: number } } | null>(null);
  const [pricingData, setPricingData] = useState<{ items: PricingItem[]; summary: { total_products: number; avg_margin: number; avg_cost: number; avg_price: number } } | null>(null);
  const [stockData, setStockData] = useState<{ movements: StockMovement[]; summary: { total_movements: number; by_type: Record<string, { count: number; quantity: number; cost: number }> } } | null>(null);
  const [supplierData, setSupplierData] = useState<{ suppliers: SupplierRow[] } | null>(null);

  const [marketPage, setMarketPage] = useState(1);
  const [categoryPage, setCategoryPage] = useState(1);
  const [competitorPage, setCompetitorPage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [pricingPage, setPricingPage] = useState(1);
  const [stockPage, setStockPage] = useState(1);
  const [supplierPage, setSupplierPage] = useState(1);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  /* ── Load dimensions ── */
  useEffect(() => {
    fetch("/api/analytics/dimensions")
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories ?? []);
        setSubcategories(d.subcategories ?? []);
        setBranches(d.branches ?? []);
      })
      .catch(() => {});
  }, []);

  /* ── Filtered sub-categories ── */
  const filteredSubcategories = useMemo(() => {
    if (!selectedCategory) return subcategories;
    const cat = categories.find((c) => c.name === selectedCategory);
    if (!cat) return subcategories;
    return subcategories.filter((sc) => sc.category_id === cat.id);
  }, [selectedCategory, categories, subcategories]);

  /* ── Run query ── */
  const runQuery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { type: activeTab };
      if (selectedCategory && tabsWithCategory.includes(activeTab)) {
        body.category = selectedCategory;
      }
      if (selectedSubCategory) body.sub_category = selectedSubCategory;
      if (selectedBranch) body.branch = selectedBranch;
      if (periodStart && tabsNeedingPeriod.includes(activeTab)) body.period_start = periodStart;
      if (periodEnd && tabsNeedingPeriod.includes(activeTab)) body.period_end = periodEnd;
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
          setMarketPage(1);
          break;
        case "category_performance":
          setCategoryData(data.categories ?? []);
          setCategoryPage(1);
          break;
        case "competitor_comparison":
          setCompetitorData(data.manufacturers ?? []);
          setCompetitorPage(1);
          break;
        case "inventory_summary":
          setInventoryData(data);
          setInventoryPage(1);
          break;
        case "pricing_analysis":
          setPricingData(data);
          setPricingPage(1);
          break;
        case "stock_movements":
          setStockData(data);
          setStockPage(1);
          break;
        case "supplier_performance":
          setSupplierData(data);
          setSupplierPage(1);
          break;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to run query");
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, selectedSubCategory, selectedBranch, periodStart, periodEnd, compareStart, compareEnd]);

  /* ── Pagination ── */
  const branchesForTable = marketData ? [...marketData.branches].sort((a, b) => a.rank - b.rank) : [];
  const { paginated: paginatedMarket, total: totalMarket } = usePagination(branchesForTable, marketPage, 20);
  const sortedCategoryData = [...categoryData].sort((a, b) => b.total_sales - a.total_sales);
  const { paginated: paginatedCategory, total: totalCategory } = usePagination(sortedCategoryData, categoryPage, 20);
  const sortedCompetitorData = [...competitorData].sort((a, b) => b.total_sales - a.total_sales);
  const { paginated: paginatedCompetitor, total: totalCompetitor } = usePagination(sortedCompetitorData, competitorPage, 20);
  const sortedInventory = [...(inventoryData?.items ?? [])].sort((a, b) => b.total_value - a.total_value);
  const { paginated: paginatedInventory, total: totalInventory } = usePagination(sortedInventory, inventoryPage, 20);
  const sortedPricing = [...(pricingData?.items ?? [])].sort((a, b) => b.margin_pct - a.margin_pct);
  const { paginated: paginatedPricing, total: totalPricing } = usePagination(sortedPricing, pricingPage, 20);
  const { paginated: paginatedStock, total: totalStock } = usePagination(stockData?.movements ?? [], stockPage, 20);
  const { paginated: paginatedSupplier, total: totalSupplier } = usePagination(supplierData?.suppliers ?? [], supplierPage, 20);

  /* ── Save report ── */
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const config: Record<string, unknown> = {};
      if (selectedCategory) config.category = selectedCategory;
      if (selectedSubCategory) config.sub_category = selectedSubCategory;
      if (selectedBranch) config.branch = selectedBranch;
      if (periodStart) config.period_start = periodStart;
      if (periodEnd) config.period_end = periodEnd;
      if (compareStart) config.compare_start = compareStart;
      if (compareEnd) config.compare_end = compareEnd;

      const label =
        activeTab === "market_share"
          ? `Market Share — ${selectedCategory || "All categories"}`
          : activeTab === "category_performance"
            ? `Category Performance — ${selectedCategory || "All categories"}`
            : activeTab === "competitor_comparison"
              ? `Competitor Comparison — ${selectedCategory || "All categories"}`
              : activeTab === "inventory_summary"
                ? `Inventory Summary`
                : activeTab === "pricing_analysis"
                  ? `Pricing Analysis`
                  : activeTab === "stock_movements"
                    ? `Stock Movements`
                    : `Supplier Performance`;

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
      <div className="pm-dash-qa-strip">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pm-dash-qa-btn ${isActive ? "text-yellow border-yellow/40" : ""}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Parameter strip ── */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/6 flex-wrap">
        {/* Category selector */}
        {tabsWithCategory.includes(activeTab) && (
          <div>
            <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory(""); }}
              className="bg-black-3 border border-white/6 rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sub-Category selector — only when category is selected */}
        {tabsWithCategory.includes(activeTab) && selectedCategory && filteredSubcategories.length > 0 && (
          <div>
            <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
              Sub-Category
            </label>
            <select
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              className="bg-black-3 border border-white/6 rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
            >
              <option value="">All sub-categories</option>
              {filteredSubcategories.map((sc) => (
                <option key={sc.id} value={sc.name}>{sc.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Branch selector */}
        <div>
          <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
            Branch
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-black-3 border border-white/6 rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
            ))}
          </select>
        </div>

        {/* Period dates — only for reports that need them */}
        {tabsNeedingPeriod.includes(activeTab) && (
          <>
            <div>
              <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
                Period start
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="bg-black-3 border border-white/6 rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
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
                className="bg-black-3 border border-white/6 rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
              />
            </div>
          </>
        )}

        {/* Compare dates — only for original 3 report types */}
        {(activeTab === "market_share" || activeTab === "category_performance") && (
          <>
            <div>
              <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
                Compare start
              </label>
              <input
                type="date"
                value={compareStart}
                onChange={(e) => setCompareStart(e.target.value)}
                className="bg-black-3 border border-white/6 rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
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
                className="bg-black-3 border border-white/6 rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
              />
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex items-end gap-2 ml-auto">
          {saveMsg && (
            <span className={`text-[11px] mr-2 ${saveMsg === "Report saved!" ? "pm-dash-bdg pm-dash-bdg-g" : "pm-dash-bdg pm-dash-bdg-r"}`}>
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

      {/* ── Error ── */}
      {error && (
        <div className="pm-dash-alert pm-dash-alert-r mt-4">
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

      {/* ══════════════════════════════════════════════════════════════
          MARKET SHARE
         ══════════════════════════════════════════════════════════════ */}
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
          <div className="pm-dash-card mb-5">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Branch market share</span>
            </div>
            <div className="pm-dash-card-b">
              <div className="space-y-2.5">
                {marketData.branches
                  .sort((a, b) => b.share - a.share)
                  .map((r) => {
                    const pct = (r.share / maxShare) * 100;
                    return (
                      <div key={r.branch_code} className="flex items-center gap-3">
                        <span className="w-[160px] text-[11px] text-gray-3 text-right truncate flex-shrink-0">
                          {r.branch}
                        </span>
                        <div className="pm-dash-pipe-bar-track h-5">
                          <div
                            className={`h-full rounded-sm transition-all ${r.rank <= 3 ? "bg-yellow" : "bg-white/10"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-[60px] text-[11px] text-white font-mono text-right flex-shrink-0">
                          {(r.share ?? 0).toFixed(1)}%
                        </span>

                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Data table */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>
                  <tr>
                    <th className="pm-dash-tbl-th">Rank</th>
                    <th className="pm-dash-tbl-th">Branch</th>
                    <th className="pm-dash-tbl-th text-right">Sales (KES)</th>
                    <th className="pm-dash-tbl-th text-right">Share %</th>
                    <th className="pm-dash-tbl-th text-right">vs Previous</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMarket.map((r) => {

                    const badge = growthBadge(r.sales, r.prev_sales);
                    const BadgeIcon = badge.icon;
                    return (
                      <tr key={r.branch_code}>
                        <td className="pm-dash-tbl-td">
                          <span className={`pm-dash-bdg ${
                            r.rank === 1 ? "pm-dash-bdg-y" : r.rank <= 3 ? "pm-dash-bdg-n" : "pm-dash-bdg-n"
                          }`}>
                            #{r.rank}
                          </span>
                        </td>
                        <td className="pm-dash-tbl-td text-white font-medium">{r.branch}</td>
                        <td className="pm-dash-tbl-td text-right text-white font-mono">
                          {formatKES(r.sales)}
                        </td>
                        <td className="pm-dash-tbl-td text-right font-mono">
                          <div className="relative h-4 w-full inline-block align-middle">
                            <div
                              className="absolute right-0 top-1/2 -translate-y-1/2 h-3 rounded-sm bg-yellow/30"
                              style={{ width: `${(r.share / maxShare) * 60}px` }}
                            />
                            <span className="relative z-10 px-2 text-white">{(r.share ?? 0).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="pm-dash-tbl-td text-right">
                          <span className={`pm-dash-bdg ${badge.bdg}`}>
                            <BadgeIcon className="w-3 h-3 inline mr-1" />
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pm-dash-tbl-td" />
                    <td className="pm-dash-tbl-td text-white font-semibold">Total</td>
                    <td className="pm-dash-tbl-td text-right text-white font-semibold font-mono">
                      {formatKES(marketData.total_sales)}
                    </td>
                    <td className="pm-dash-tbl-td text-right text-white font-semibold font-mono">100%</td>
                    <td className="pm-dash-tbl-td" />
                  </tr>
                </tfoot>
              </table>
            </div>
            <Pagination page={marketPage} pageSize={20} total={totalMarket} onPageChange={setMarketPage} />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CATEGORY PERFORMANCE
         ══════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === "category_performance" && (
        <>
          <div className="mt-5 mb-4">
            <h2 className="font-display text-[18px] font-bold text-white">Category Performance</h2>
            <p className="text-[11px] text-gray-5 mt-1">Sales breakdown by product category</p>
          </div>

          {/* Bar chart */}
          <div className="pm-dash-card mb-5">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Category sales</span>
            </div>
            <div className="pm-dash-card-b">
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
                        <div className="pm-dash-pipe-bar-track h-5">
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
          </div>

          {/* Data table */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>
                  <tr>
                    <th className="pm-dash-tbl-th">Category</th>
                    <th className="pm-dash-tbl-th text-right">Sales (KES)</th>
                    <th className="pm-dash-tbl-th text-right">Units</th>
                    <th className="pm-dash-tbl-th text-right">Avg Price</th>
                    <th className="pm-dash-tbl-th text-right">Products</th>
                    <th className="pm-dash-tbl-th text-right">vs Previous</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.length === 0 && (
                    <tr><td colSpan={6} className="pm-dash-tbl-td text-center py-8">No data available.</td></tr>
                  )}
                  {paginatedCategory.map((r) => {
                    const badge = growthBadge(r.total_sales, r.prev_total_sales);
                    const BadgeIcon = badge.icon;
                    return (
                      <tr key={r.category}>
                        <td className="pm-dash-tbl-td text-white font-medium">{r.category}</td>
                        <td className="pm-dash-tbl-td text-right text-white font-mono">{formatKES(r.total_sales)}</td>
                        <td className="pm-dash-tbl-td text-right font-mono">{r.total_units.toLocaleString()}</td>
                        <td className="pm-dash-tbl-td text-right font-mono">{formatKES(r.avg_unit_price)}</td>
                        <td className="pm-dash-tbl-td text-right font-mono">{r.product_count}</td>
                        <td className="pm-dash-tbl-td text-right">
                          <span className={`pm-dash-bdg ${badge.bdg}`}>
                            <BadgeIcon className="w-3 h-3 inline mr-1" />
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={categoryPage} pageSize={20} total={totalCategory} onPageChange={setCategoryPage} />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          COMPETITOR COMPARISON
         ══════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === "competitor_comparison" && (
        <>
          <div className="mt-5 mb-4">
            <h2 className="font-display text-[18px] font-bold text-white">Competitor Comparison</h2>
            <p className="text-[11px] text-gray-5 mt-1">Sales by manufacturer — market position analysis</p>
          </div>

          {/* Bar chart */}
          <div className="pm-dash-card mb-5">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Manufacturer market share</span>
            </div>
            <div className="pm-dash-card-b">
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
                        <div className="pm-dash-pipe-bar-track h-5">
                          <div
                            className="h-full rounded-sm bg-yellow transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-[60px] text-[11px] text-white font-mono text-right flex-shrink-0">
                          {(r.share ?? 0).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Data table */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>
                  <tr>
                    <th className="pm-dash-tbl-th">Manufacturer</th>
                    <th className="pm-dash-tbl-th text-right">Sales (KES)</th>
                    <th className="pm-dash-tbl-th text-right">Units</th>
                    <th className="pm-dash-tbl-th text-right">Share %</th>
                    <th className="pm-dash-tbl-th text-right">Products</th>
                    <th className="pm-dash-tbl-th text-right">Avg Price</th>
                  </tr>
                </thead>
                <tbody>
                  {competitorData.length === 0 && (
                    <tr><td colSpan={6} className="pm-dash-tbl-td text-center py-8">No data available.</td></tr>
                  )}
                  {paginatedCompetitor.map((r) => (
                    <tr key={r.manufacturer}>
                      <td className="pm-dash-tbl-td text-white font-medium">{r.manufacturer}</td>
                      <td className="pm-dash-tbl-td text-right text-white font-mono">{formatKES(r.total_sales)}</td>
                      <td className="pm-dash-tbl-td text-right font-mono">{r.total_units.toLocaleString()}</td>
                      <td className="pm-dash-tbl-td text-right font-mono">{(r.share ?? 0).toFixed(1)}%</td>
                      <td className="pm-dash-tbl-td text-right font-mono">{r.product_count}</td>
                      <td className="pm-dash-tbl-td text-right font-mono">{formatKES(r.avg_unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={competitorPage} pageSize={20} total={totalCompetitor} onPageChange={setCompetitorPage} />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          INVENTORY SUMMARY
         ══════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === "inventory_summary" && inventoryData && (
        <>
          <div className="mt-5 mb-4">
            <h2 className="font-display text-[18px] font-bold text-white">Inventory Summary</h2>
            <p className="text-[11px] text-gray-5 mt-1">Current stock levels by product</p>
          </div>

          {/* KPI row */}
          <div className="pm-dash-krow pm-dash-krow-3">
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn">{inventoryData.totals.product_count}</div>
              <div className="pm-dash-kl">Products in stock</div>
            </div>
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn">{inventoryData.totals.total_units.toLocaleString()}</div>
              <div className="pm-dash-kl">Total units</div>
            </div>
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn">{formatKES(inventoryData.totals.total_value)}</div>
              <div className="pm-dash-kl">Total value</div>
            </div>
          </div>

          {/* Value bar chart by category */}
          <div className="pm-dash-card mb-5">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Stock value by product</span>
            </div>
            <div className="pm-dash-card-b">
              <div className="space-y-2.5">
                {sortedInventory.slice(0, 15).map((r) => {
                  const maxVal = Math.max(...sortedInventory.map((i) => i.total_value), 1);
                  const pct = (r.total_value / maxVal) * 100;

                  return (
                    <div key={r.stock_code} className="flex items-center gap-3">
                      <span className="w-[160px] text-[11px] text-gray-3 text-right truncate flex-shrink-0">
                        {r.product}
                      </span>
                      <div className="pm-dash-pipe-bar-track h-5">
                        <div
                          className="h-full rounded-sm bg-yellow transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-[80px] text-[11px] text-white font-mono text-right flex-shrink-0">
                        {formatKES(r.total_value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Data table */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>

                  <tr>
                    <th className="pm-dash-tbl-th">Stock Code</th>
                    <th className="pm-dash-tbl-th">Product</th>
                    <th className="pm-dash-tbl-th">Category</th>
                    <th className="pm-dash-tbl-th text-right">Qty on Hand</th>
                    <th className="pm-dash-tbl-th text-right">Unit Cost</th>
                    <th className="pm-dash-tbl-th text-right">Total Value</th>
                    <th className="pm-dash-tbl-th">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInventory.length === 0 && (
                    <tr><td colSpan={7} className="pm-dash-tbl-td text-center py-8">No inventory data available.</td></tr>
                  )}
                  {paginatedInventory.map((r) => (
                    <tr key={r.stock_code}>
                      <td className="pm-dash-tbl-td font-mono text-white">{r.stock_code}</td>
                      <td className="pm-dash-tbl-td text-white font-medium">{r.product}</td>
                      <td className="pm-dash-tbl-td">
                        <span className="pm-dash-bdg pm-dash-bdg-n">{r.category}</span>
                      </td>
                      <td className="pm-dash-tbl-td text-right font-mono">
                        {r.quantity_on_hand.toLocaleString()}
                      </td>
                      <td className="pm-dash-tbl-td text-right font-mono">{formatKES(r.unit_cost)}</td>
                      <td className="pm-dash-tbl-td text-right text-white font-mono font-semibold">
                        {formatKES(r.total_value)}
                      </td>
                      <td className="pm-dash-tbl-td text-[10px]">
                        {r.last_updated ? new Date(r.last_updated).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={inventoryPage} pageSize={20} total={totalInventory} onPageChange={setInventoryPage} />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PRICING ANALYSIS
         ══════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === "pricing_analysis" && pricingData && (
        <>
          <div className="mt-5 mb-4">
            <h2 className="font-display text-[18px] font-bold text-white">Pricing Analysis</h2>
            <p className="text-[11px] text-gray-5 mt-1">Cost, price, and margin data per product</p>
          </div>

          {/* KPI row */}
          <div className="pm-dash-krow pm-dash-krow-4">
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn">{pricingData.summary.total_products}</div>
              <div className="pm-dash-kl">Products priced</div>
            </div>
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn grn">{(pricingData?.summary?.avg_margin ?? 0).toFixed(1)}%</div>
              <div className="pm-dash-kl">Avg margin</div>
            </div>
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn">{formatKES(pricingData.summary.avg_cost)}</div>
              <div className="pm-dash-kl">Avg cost</div>
            </div>
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn blu">{formatKES(pricingData.summary.avg_price)}</div>
              <div className="pm-dash-kl">Avg price</div>
            </div>
          </div>

          {/* Margin bar chart */}
          <div className="pm-dash-card mb-5">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Margin by product</span>
            </div>
            <div className="pm-dash-card-b">
              <div className="space-y-2.5">
                {sortedPricing.slice(0, 15).map((r) => {
                  const maxMargin = Math.max(...sortedPricing.map((p) => Math.abs(p.margin_pct)), 1);
                  const pct = (Math.abs(r.margin_pct) / maxMargin) * 100;

                  return (
                    <div key={r.stock_code} className="flex items-center gap-3">
                      <span className="w-[160px] text-[11px] text-gray-3 text-right truncate flex-shrink-0">
                        {r.product}
                      </span>
                      <div className="pm-dash-pipe-bar-track h-5">
                        <div
                          className={`h-full rounded-sm transition-all ${r.margin_pct >= 0 ? "bg-yellow" : "bg-red"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`w-[60px] text-[11px] font-mono text-right flex-shrink-0 ${r.margin_pct >= 0 ? "text-white" : "text-red"}`}>
                        {(r.margin_pct ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Data table */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>

                  <tr>
                    <th className="pm-dash-tbl-th">Stock Code</th>
                    <th className="pm-dash-tbl-th">Product</th>
                    <th className="pm-dash-tbl-th">Category</th>
                    <th className="pm-dash-tbl-th text-right">Cost</th>
                    <th className="pm-dash-tbl-th text-right">Price</th>
                    <th className="pm-dash-tbl-th text-right">Margin %</th>
                    <th className="pm-dash-tbl-th text-right">Discount</th>
                    <th className="pm-dash-tbl-th">Effective</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPricing.length === 0 && (
                    <tr><td colSpan={8} className="pm-dash-tbl-td text-center py-8">No pricing data available.</td></tr>
                  )}
                  {paginatedPricing.map((r) => (
                    <tr key={r.stock_code}>
                      <td className="pm-dash-tbl-td font-mono text-white">{r.stock_code}</td>
                      <td className="pm-dash-tbl-td text-white font-medium">{r.product}</td>
                      <td className="pm-dash-tbl-td">
                        <span className="pm-dash-bdg pm-dash-bdg-n">{r.category}</span>
                      </td>
                      <td className="pm-dash-tbl-td text-right font-mono">{formatKES(r.standard_cost)}</td>
                      <td className="pm-dash-tbl-td text-right text-white font-mono font-semibold">
                        {formatKES(r.selling_price)}
                      </td>
                      <td className="pm-dash-tbl-td text-right">
                        <span className={`pm-dash-bdg ${
                          r.margin_pct >= 20 ? "pm-dash-bdg-g" : r.margin_pct >= 10 ? "pm-dash-bdg-y" : "pm-dash-bdg-r"
                        }`}>
                          {(r.margin_pct ?? 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="pm-dash-tbl-td text-right font-mono">
                        {r.discount_pct ? `${r.discount_pct}%` : "—"}
                      </td>
                      <td className="pm-dash-tbl-td text-[10px]">
                        {r.effective_date ? new Date(r.effective_date).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pricingPage} pageSize={20} total={totalPricing} onPageChange={setPricingPage} />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STOCK MOVEMENTS
         ══════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === "stock_movements" && stockData && (
        <>
          <div className="mt-5 mb-4">
            <h2 className="font-display text-[18px] font-bold text-white">Stock Movements</h2>
            <p className="text-[11px] text-gray-5 mt-1">Recent inbound, outbound, and adjustment movements</p>
          </div>

          {/* KPI row */}
          <div className="pm-dash-krow pm-dash-krow-3">
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn">{stockData.summary.total_movements}</div>
              <div className="pm-dash-kl">Total movements</div>
            </div>
            {Object.entries(stockData.summary.by_type ?? {}).map(([type, data]) => (
              <div className="pm-dash-kcard" key={type}>
                <div className={`pm-dash-kn ${type === "in" ? "grn" : type === "out" ? "red" : ""}`}>
                  {data.quantity.toLocaleString()}
                </div>
                <div className="pm-dash-kl">
                  <span className={`pm-dash-bdg ${movementBadge(type)} mr-2`}>{type.toUpperCase()}</span>
                  {data.count} records · {formatKES(data.cost)}
                </div>
              </div>
            ))}
          </div>

          {/* Movement type bar chart */}
          <div className="pm-dash-card mb-5">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Movement volume by type</span>
            </div>
            <div className="pm-dash-card-b">
              <div className="space-y-2.5">
                {Object.entries(stockData.summary.by_type ?? {}).map(([type, data]) => {
                  const maxQty = Math.max(...Object.values(stockData.summary.by_type ?? {}).map((d) => d.quantity), 1);
                  const pct = (data.quantity / maxQty) * 100;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="w-[160px] text-[11px] text-gray-3 text-right truncate flex-shrink-0">
                        <span className={`pm-dash-bdg ${movementBadge(type)} mr-2`}>{type.toUpperCase()}</span>
                        {data.count} records
                      </span>
                      <div className="pm-dash-pipe-bar-track h-5">
                        <div
                          className={`h-full rounded-sm transition-all ${type === "in" ? "bg-green" : type === "out" ? "bg-red" : "bg-yellow"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-[80px] text-[11px] text-white font-mono text-right flex-shrink-0">
                        {data.quantity.toLocaleString()} units
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Data table */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>
                  <tr>
                    <th className="pm-dash-tbl-th">Date</th>
                    <th className="pm-dash-tbl-th">Stock Code</th>
                    <th className="pm-dash-tbl-th">Product</th>
                    <th className="pm-dash-tbl-th">Type</th>
                    <th className="pm-dash-tbl-th">Supplier</th>
                    <th className="pm-dash-tbl-th text-right">Qty</th>
                    <th className="pm-dash-tbl-th text-right">Unit Cost</th>
                    <th className="pm-dash-tbl-th text-right">Total Cost</th>
                    <th className="pm-dash-tbl-th">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.movements.length === 0 && (
                    <tr><td colSpan={9} className="pm-dash-tbl-td text-center py-8">No stock movements available.</td></tr>
                  )}
                  {paginatedStock.map((r, i) => (
                    <tr key={`${r.reference}-${i}`}>
                      <td className="pm-dash-tbl-td text-[10px]">
                        {r.date ? new Date(r.date).toLocaleDateString() : "—"}
                      </td>
                      <td className="pm-dash-tbl-td font-mono text-white">{r.stock_code}</td>
                      <td className="pm-dash-tbl-td text-white font-medium">{r.product}</td>
                      <td className="pm-dash-tbl-td">
                        <span className={`pm-dash-bdg ${movementBadge(r.type)}`}>{r.type}</span>
                      </td>
                      <td className="pm-dash-tbl-td">{r.supplier}</td>
                      <td className="pm-dash-tbl-td text-right font-mono">{r.quantity.toLocaleString()}</td>
                      <td className="pm-dash-tbl-td text-right font-mono">{formatKES(r.unit_cost)}</td>
                      <td className="pm-dash-tbl-td text-right text-white font-mono font-semibold">
                        {formatKES(r.total_cost)}
                      </td>
                      <td className="pm-dash-tbl-td font-mono text-[10px]">{r.reference ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={stockPage} pageSize={20} total={totalStock} onPageChange={setStockPage} />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SUPPLIER PERFORMANCE
         ══════════════════════════════════════════════════════════════ */}
      {!loading && activeTab === "supplier_performance" && supplierData && (
        <>
          <div className="mt-5 mb-4">
            <h2 className="font-display text-[18px] font-bold text-white">Supplier Performance</h2>
            <p className="text-[11px] text-gray-5 mt-1">Supplier metrics — product count, cost, and inbound volume</p>
          </div>

          {/* KPI row */}
          <div className="pm-dash-krow pm-dash-krow-3">
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn">{supplierData.suppliers.length}</div>
              <div className="pm-dash-kl">Active suppliers</div>
            </div>
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn">
                {formatKES(supplierData.suppliers.reduce((s, r) => s + r.total_inbound_value, 0))}
              </div>
              <div className="pm-dash-kl">Total inbound value</div>
            </div>
            <div className="pm-dash-kcard">
              <div className="pm-dash-kn">
                {supplierData.suppliers.reduce((s, r) => s + r.total_inbound_quantity, 0).toLocaleString()}
              </div>
              <div className="pm-dash-kl">Total units received</div>
            </div>
          </div>

          {/* Inbound value bar chart */}
          <div className="pm-dash-card mb-5">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[14px]">Inbound value by supplier</span>
            </div>
            <div className="pm-dash-card-b">
              <div className="space-y-2.5">
                {[...supplierData.suppliers]
                  .sort((a, b) => b.total_inbound_value - a.total_inbound_value)
                  .map((r) => {
                    const maxVal = Math.max(...supplierData.suppliers.map((s) => s.total_inbound_value), 1);
                    const pct = (r.total_inbound_value / maxVal) * 100;
                    return (
                      <div key={r.code ?? r.name} className="flex items-center gap-3">
                        <span className="w-[160px] text-[11px] text-gray-3 text-right truncate flex-shrink-0">
                          {r.name}
                        </span>
                        <div className="pm-dash-pipe-bar-track h-5">
                          <div
                            className="h-full rounded-sm bg-yellow transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-[80px] text-[11px] text-white font-mono text-right flex-shrink-0">
                          {formatKES(r.total_inbound_value)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Data table */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-b-0 overflow-x-auto">
              <table className="pm-dash-tbl">
                <thead>
                  <tr>
                    <th className="pm-dash-tbl-th">Supplier</th>
                    <th className="pm-dash-tbl-th">Code</th>
                    <th className="pm-dash-tbl-th text-right">Products</th>
                    <th className="pm-dash-tbl-th text-right">Avg Cost</th>
                    <th className="pm-dash-tbl-th text-right">Inbound Qty</th>
                    <th className="pm-dash-tbl-th text-right">Inbound Value</th>
                    <th className="pm-dash-tbl-th text-right">Movements</th>
                    <th className="pm-dash-tbl-th">Payment Terms</th>
                    <th className="pm-dash-tbl-th text-right">Lead Time</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierData.suppliers.length === 0 && (
                    <tr><td colSpan={9} className="pm-dash-tbl-td text-center py-8">No supplier data available.</td></tr>
                  )}
                  {paginatedSupplier.map((r) => (
                    <tr key={r.code ?? r.name}>
                      <td className="pm-dash-tbl-td text-white font-medium">{r.name}</td>
                      <td className="pm-dash-tbl-td font-mono">{r.code ?? "—"}</td>
                      <td className="pm-dash-tbl-td text-right font-mono">{r.product_count}</td>
                      <td className="pm-dash-tbl-td text-right font-mono">{formatKES(r.avg_cost)}</td>
                      <td className="pm-dash-tbl-td text-right font-mono">{r.total_inbound_quantity.toLocaleString()}</td>
                      <td className="pm-dash-tbl-td text-right text-white font-mono font-semibold">
                        {formatKES(r.total_inbound_value)}
                      </td>
                      <td className="pm-dash-tbl-td text-right font-mono">{r.total_movements}</td>
                      <td className="pm-dash-tbl-td">
                        <span className="pm-dash-bdg pm-dash-bdg-n">{r.payment_terms ?? "—"}</span>
                      </td>
                      <td className="pm-dash-tbl-td text-right">
                        <span className={`pm-dash-bdg ${
                          (r.lead_time_days ?? 0) <= 7 ? "pm-dash-bdg-g" : (r.lead_time_days ?? 0) <= 14 ? "pm-dash-bdg-y" : "pm-dash-bdg-r"
                        }`}>
                          {r.lead_time_days ?? "—"}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={supplierPage} pageSize={20} total={totalSupplier} onPageChange={setSupplierPage} />
          </div>
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && (() => {
        const hasData =
          (activeTab === "market_share" && marketData) ||
          (activeTab === "category_performance" && categoryData.length > 0) ||
          (activeTab === "competitor_comparison" && competitorData.length > 0) ||
          (activeTab === "inventory_summary" && inventoryData) ||
          (activeTab === "pricing_analysis" && pricingData) ||
          (activeTab === "stock_movements" && stockData) ||
          (activeTab === "supplier_performance" && supplierData);
        if (hasData) return null;
        return (
          <div className="flex items-center justify-center py-16 text-gray-5 text-[12px]">
            Click &quot;Run query&quot; to fetch data.
          </div>
        );
      })()}
    </div>
  );
}
