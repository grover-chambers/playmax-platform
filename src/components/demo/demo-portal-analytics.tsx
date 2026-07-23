"use client";

import React from "react";
import { Wheat, TrendingDown, Award, DollarSign } from "lucide-react";
import { AnalyticsChart } from "@/components/charts/analytics-chart";
import type { ChartProps } from "@/components/charts/analytics-chart";
import { ANALYTICS_COLORS, chartColor } from "@/lib/analytics-colors";

/* ── Mock Data ───────────────────────────────────────────── */

const MOCK_COMPETITORS = [
  { supplier: "Premium Mills", total_sales: 15_800_000, total_units: 42_500, share: 24.2, is_client: false, rank: 1, products_count: 18 },
  { supplier: "DemoBrand Ltd", total_sales: 12_400_000, total_units: 31_200, share: 18.7, is_client: true, rank: 2, products_count: 24 },
  { supplier: "Golden Grains", total_sales: 10_100_000, total_units: 28_900, share: 15.3, is_client: false, rank: 3, products_count: 15 },
  { supplier: "FreshBake Kenya", total_sales: 8_600_000, total_units: 22_100, share: 13.0, is_client: false, rank: 4, products_count: 12 },
  { supplier: "Harvest Foods", total_sales: 6_200_000, total_units: 17_800, share: 9.4, is_client: false, rank: 5, products_count: 10 },
  { supplier: "Nature's Best", total_sales: 4_100_000, total_units: 11_500, share: 6.2, is_client: false, rank: 6, products_count: 8 },
];

const MOCK_PRODUCTS = [
  { name: "Maize Flour — Premium 2kg", stock_code: "MF-PRE-2", total_revenue: 3_200_000, total_qty: 17_300, avg_price: 185 },
  { name: "Maize Flour — Standard 1kg", stock_code: "MF-STD-1", total_revenue: 2_800_000, total_qty: 28_600, avg_price: 98 },
  { name: "Maize Flour — Family 5kg", stock_code: "MF-FAM-5", total_revenue: 2_100_000, total_qty: 5_000, avg_price: 420 },
  { name: "Maize Flour — Economy 10kg", stock_code: "MF-ECO-10", total_revenue: 1_600_000, total_qty: 2_050, avg_price: 780 },
  { name: "Maize Flour — Organic 1kg", stock_code: "MF-ORG-1", total_revenue: 950_000, total_qty: 6_800, avg_price: 140 },
  { name: "Maize Meal — Sifted 2kg", stock_code: "MM-SFT-2", total_revenue: 740_000, total_qty: 5_300, avg_price: 140 },
];

const MOCK_BRANCHES = [
  { name: "Nairobi CBD", total: 4_200_000, units: 11_200 },
  { name: "Mombasa Road", total: 3_100_000, units: 8_400 },
  { name: "Kisumu", total: 2_600_000, units: 7_100 },
  { name: "Nakuru", total: 2_100_000, units: 5_800 },
  { name: "Thika", total: 1_800_000, units: 4_700 },
];

const MOCK_PRICING = [
  { product: "Maize Flour 2kg", branch: "Nairobi CBD", selling_price: 185, standard_cost: 152, margin_pct: 17.8 },
  { product: "Maize Flour 1kg", branch: "Mombasa Road", selling_price: 98, standard_cost: 78, margin_pct: 20.4 },
  { product: "Maize Flour 5kg", branch: "Kisumu", selling_price: 420, standard_cost: 360, margin_pct: 14.3 },
  { product: "Maize Flour 2kg", branch: "Nakuru", selling_price: 180, standard_cost: 152, margin_pct: 15.6 },
  { product: "Maize Flour 10kg", branch: "Thika", selling_price: 780, standard_cost: 680, margin_pct: 12.8 },
  { product: "Maize Flour 1kg", branch: "Nairobi CBD", selling_price: 100, standard_cost: 78, margin_pct: 22.0 },
  { product: "Maize Flour 2kg", branch: "Mombasa Road", selling_price: 190, standard_cost: 152, margin_pct: 20.0 },
  { product: "Organic Maize 1kg", branch: "Kisumu", selling_price: 145, standard_cost: 118, margin_pct: 18.6 },
];

const CLIENT_COLOR = "#F4C300";
const CLIENT = MOCK_COMPETITORS.find((c) => c.is_client)!;
const MAX_SALES = Math.max(...MOCK_COMPETITORS.map((c) => c.total_sales), 1);

/* ── Helpers ─────────────────────────────────────────────── */

function fmt(n: number): string {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${Math.round(n).toLocaleString()}`;
}

function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

/* ── Component ───────────────────────────────────────────── */

export default function DemoPortalAnalytics() {
  const avgMargin = MOCK_PRICING.length > 0
    ? MOCK_PRICING.reduce((s, p) => s + p.margin_pct, 0) / MOCK_PRICING.length
    : 0;

  const compChart: ChartProps = {
    type: "bar",
    labels: MOCK_COMPETITORS.map((c) => c.is_client ? "You" : c.supplier.split(" ")[0]),
    datasets: [{
      label: "Total Sales (KES)",
      data: MOCK_COMPETITORS.map((c) => c.total_sales),
      backgroundColor: MOCK_COMPETITORS.map((c) => c.is_client ? CLIENT_COLOR : chartColor(c.rank - 1)),
    }],
  };

  return (
    <div className="space-y-4">
      {/* ── KPI Summary Row ─────────────────────────── */}
      <div className="pm-dash-krow pm-dash-krow-4 mb-4">
        <div className="pm-dash-kcard">
          <div className="pm-dash-kn">{fmt(CLIENT.total_sales)}</div>
          <div className="pm-dash-kl">Your Revenue</div>
          <div className="pm-dash-ksub">{fmtNum(CLIENT.total_units)} units sold</div>
        </div>
        <div className="pm-dash-kcard grn">
          <div className="pm-dash-kn grn">{fmtPct(CLIENT.share)}</div>
          <div className="pm-dash-kl">Maize Flour Share</div>
          <div className="pm-dash-ksub">Rank #{CLIENT.rank} of {MOCK_COMPETITORS.length} suppliers</div>
        </div>
        <div className="pm-dash-kcard blu">
          <div className="pm-dash-kn blu">{CLIENT.products_count}</div>
          <div className="pm-dash-kl">Products</div>
          <div className="pm-dash-ksub">{MOCK_PRODUCTS.length} SKUs tracked</div>
        </div>
        <div className="pm-dash-kcard red">
          <div className="pm-dash-kn red">{fmtPct(avgMargin)}</div>
          <div className="pm-dash-kl">Avg Margin</div>
          <div className="pm-dash-ksub">{MOCK_PRICING.length} price points</div>
        </div>
      </div>

      {/* ── Competitor Comparison Chart ─────────── */}
      <div className="pm-dash-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award size={14} className="text-yellow" />
          <span className="font-display text-[13px] font-semibold">Supplier Competition — Maize Flour</span>
        </div>
        <div style={{ height: 220 }}>
          <AnalyticsChart {...compChart} height={220} />
        </div>
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#1A1A1A] text-[10px] text-gray-5">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CLIENT_COLOR }} /> You (DemoBrand)
          </span>
          {MOCK_COMPETITORS.filter((c) => !c.is_client).slice(0, 4).map((c) => (
            <span key={c.supplier} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: chartColor(c.rank - 1) }} /> {c.supplier}
            </span>
          ))}
        </div>
      </div>

      {/* ── Product + Branch Grid ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Top Products - 3 cols */}
        <div className="lg:col-span-3 pm-dash-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wheat size={14} className="text-yellow" />
            <span className="font-display text-[13px] font-semibold">Top Products — Maize Flour</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#1A1A1A]">
                  {["Product", "Revenue", "Units", "Avg Price"].map((h) => (
                    <th key={h} className="font-mono text-[9px] text-gray-5 uppercase tracking-widest text-left px-2 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_PRODUCTS.map((p, i) => (
                  <tr key={p.stock_code} className="border-b border-[#1A1A1A]">
                    <td className="px-2 py-2 text-gray-3 font-medium">{p.name}</td>
                    <td className="px-2 py-2 font-display font-semibold" style={{ color: i === 0 ? CLIENT_COLOR : "#ccc" }}>{fmt(p.total_revenue)}</td>
                    <td className="px-2 py-2 text-gray-4">{fmtNum(p.total_qty)}</td>
                    <td className="px-2 py-2 text-gray-4">KES {p.avg_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Branch Breakdown - 2 cols */}
        <div className="lg:col-span-2 pm-dash-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={14} className="text-yellow" />
            <span className="font-display text-[13px] font-semibold">Branch Sales</span>
          </div>
          <div className="space-y-3">
            {MOCK_BRANCHES.map((b, i) => {
              const pct = MAX_SALES > 0 ? (b.total / MAX_SALES) * 100 : 0;
              const colors = [ANALYTICS_COLORS.yellow, ANALYTICS_COLORS.green, ANALYTICS_COLORS.blue, ANALYTICS_COLORS.pink, ANALYTICS_COLORS.orange];
              return (
                <div key={b.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-gray-4">{b.name}</span>
                    <span className="text-[10px] font-mono text-gray-5">{fmt(b.total)}</span>
                  </div>
                  <div className="w-full h-2 rounded overflow-hidden" style={{ background: "#1A1A1A" }}>
                    <div className="h-full rounded transition-all duration-500" style={{ width: `${Math.min(100, pct)}%`, background: colors[i % colors.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Pricing Table ───────────────────── */}
      <div className="pm-dash-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={14} className="text-yellow" />
          <span className="font-display text-[13px] font-semibold">Pricing Comparison — Maize Flour</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#1A1A1A]">
                {["Product", "Branch", "Selling Price", "Cost", "Margin"].map((h) => (
                  <th key={h} className="font-mono text-[9px] text-gray-5 uppercase tracking-widest text-left px-2 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_PRICING.map((p, i) => (
                <tr key={i} className="border-b border-[#1A1A1A]">
                  <td className="px-2 py-2 text-gray-3">{p.product}</td>
                  <td className="px-2 py-2 text-gray-5">{p.branch}</td>
                  <td className="px-2 py-2 font-mono text-gray-3">KES {p.selling_price}</td>
                  <td className="px-2 py-2 font-mono text-gray-4">KES {p.standard_cost}</td>
                  <td className="px-2 py-2 font-mono" style={{ color: p.margin_pct >= 15 ? ANALYTICS_COLORS.green : p.margin_pct >= 8 ? ANALYTICS_COLORS.yellow : ANALYTICS_COLORS.red }}>
                    {fmtPct(p.margin_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 pt-3 border-t border-[#1A1A1A] flex items-center gap-2 text-[10px] text-gray-5">
          <span className="w-3 h-0.5 rounded" style={{ background: ANALYTICS_COLORS.green }} /> Healthy (&ge;15%)
          <span className="w-3 h-0.5 rounded" style={{ background: ANALYTICS_COLORS.yellow }} /> Moderate (8-15%)
          <span className="w-3 h-0.5 rounded" style={{ background: ANALYTICS_COLORS.red }} /> Low (&lt;8%)
        </div>
      </div>

      {/* ── Note ── */}
      <div className="text-center py-3 text-[11px] text-gray-5 italic">
        Sample data shown. Upgrade to unlock real competitor intelligence.
      </div>
    </div>
  );
}
