"use client";

import React from "react";
import { Trophy, TrendingUp, BarChart3 } from "lucide-react";
import { AnalyticsChart } from "@/components/charts/analytics-chart";
import type { ChartProps } from "@/components/charts/analytics-chart";
import { ANALYTICS_COLORS, chartColor } from "@/lib/analytics-colors";

/* ── Mock Data ───────────────────────────────────────────── */

const MOCK_COMPETITORS = [
  { manufacturer: "Premium Mills", total_sales: 15_800_000, total_units: 42_500, share: 24.2, is_client: false, rank: 1 },
  { manufacturer: "DemoBrand Ltd", total_sales: 12_400_000, total_units: 31_200, share: 18.7, is_client: true, rank: 2 },
  { manufacturer: "Golden Grains", total_sales: 10_100_000, total_units: 28_900, share: 15.3, is_client: false, rank: 3 },
  { manufacturer: "FreshBake Kenya", total_sales: 8_600_000, total_units: 22_100, share: 13.0, is_client: false, rank: 4 },
  { manufacturer: "Harvest Foods", total_sales: 6_200_000, total_units: 17_800, share: 9.4, is_client: false, rank: 5 },
  { manufacturer: "Nature's Best", total_sales: 4_100_000, total_units: 11_500, share: 6.2, is_client: false, rank: 6 },
];

const MOCK_CATEGORIES = [
  { name: "Maize Flour", sales: 12_400_000, share: 35 },
  { name: "Wheat Flour", sales: 7_200_000, share: 20 },
  { name: "Cooking Oil", sales: 6_800_000, share: 19 },
  { name: "Rice", sales: 5_100_000, share: 14 },
  { name: "Sugar", sales: 4_300_000, share: 12 },
];

const MOCK_BRANCHES = [
  { name: "Nairobi CBD", sales: 4_200_000, code: "NBO" },
  { name: "Mombasa Road", sales: 3_100_000, code: "MSA" },
  { name: "Kisumu", sales: 2_600_000, code: "KSM" },
  { name: "Nakuru", sales: 2_100_000, code: "NKR" },
  { name: "Thika", sales: 1_800_000, code: "THK" },
];

const MOCK_PRICING = [
  { product: "Maize Flour 2kg", branch: "Nairobi CBD", selling_price: 185, standard_cost: 152, margin_pct: 17.8 },
  { product: "Maize Flour 1kg", branch: "Mombasa Road", selling_price: 98, standard_cost: 78, margin_pct: 20.4 },
  { product: "Maize Flour 5kg", branch: "Kisumu", selling_price: 420, standard_cost: 360, margin_pct: 14.3 },
  { product: "Maize Flour 2kg", branch: "Nakuru", selling_price: 180, standard_cost: 152, margin_pct: 15.6 },
  { product: "Maize Flour 10kg", branch: "Thika", selling_price: 780, standard_cost: 680, margin_pct: 12.8 },
];

const CLIENT_COLOR = "#F4C300";
const TOTAL_REVENUE = MOCK_COMPETITORS.reduce((s, c) => s + c.total_sales, 0);
const CLIENT = MOCK_COMPETITORS.find((c) => c.is_client)!;

/* ── Colors ──────────────────────────────────────────────── */

const RANK_COLORS = {
  gold: ANALYTICS_COLORS.yellow,
  silver: ANALYTICS_COLORS.gray,
  bronze: ANALYTICS_COLORS.orange,
  faded: ANALYTICS_COLORS.blue,
};

function competitorColor(rank: number, isClient: boolean): string {
  if (isClient) return CLIENT_COLOR;
  if (rank === 1) return RANK_COLORS.gold;
  if (rank === 2) return RANK_COLORS.silver;
  if (rank === 3) return RANK_COLORS.bronze;
  return RANK_COLORS.faded;
}

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

function HorizontalBar({ value, max, color, height = 14 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full rounded overflow-hidden" style={{ height, background: "#1A1A1A" }}>
      <div className="h-full rounded transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ── Component ───────────────────────────────────────────── */

export default function DemoPortalOverview() {
  const maxSales = Math.max(...MOCK_COMPETITORS.map((c) => c.total_sales), 1);
  const maxBranch = Math.max(...MOCK_BRANCHES.map((b) => b.sales), 1);
  const avgMargin = MOCK_PRICING.length > 0
    ? MOCK_PRICING.reduce((s, p) => s + p.margin_pct, 0) / MOCK_PRICING.length
    : 0;

  const categoryChart: ChartProps = {
    type: "bar_h",
    labels: MOCK_CATEGORIES.map((c) => c.name),
    datasets: [{
      label: "Revenue (KES)",
      data: MOCK_CATEGORIES.map((c) => c.sales),
      backgroundColor: MOCK_CATEGORIES.map((_, i) => chartColor(i)),
    }],
  };

  return (
    <div className="space-y-4">
      {/* ── KPI Summary Row ─────────────────────────── */}
      <div className="pm-dash-krow pm-dash-krow-4 mb-4">
        <div className="pm-dash-kcard">
          <div className="pm-dash-kn">{fmt(TOTAL_REVENUE)}</div>
          <div className="pm-dash-kl">Total Revenue</div>
          <div className="pm-dash-ksub">{fmtNum(CLIENT.total_units)} units sold</div>
        </div>
        <div className="pm-dash-kcard grn">
          <div className="pm-dash-kn grn">{fmtPct(CLIENT.share)}</div>
          <div className="pm-dash-kl">Market Share</div>
          <div className="pm-dash-ksub">Rank #{CLIENT.rank} of {MOCK_COMPETITORS.length} suppliers</div>
        </div>
        <div className="pm-dash-kcard blu">
          <div className="pm-dash-kn blu">24</div>
          <div className="pm-dash-kl">Products</div>
          <div className="pm-dash-ksub">{MOCK_CATEGORIES.length} categories</div>
        </div>
        <div className="pm-dash-kcard red">
          <div className="pm-dash-kn red">{fmtPct(avgMargin)}</div>
          <div className="pm-dash-kl">Avg Margin</div>
          <div className="pm-dash-ksub">{MOCK_PRICING.length} price points</div>
        </div>
      </div>

      {/* ── Position Banner ──────────────────────── */}
      <div className="mb-4 p-5 rounded-xl border-2 border-[#F4C300]/30" style={{ background: "linear-gradient(135deg, #1a1a0a 0%, #0a0a0a 100%)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: `${CLIENT_COLOR}22`, border: `2px solid ${CLIENT_COLOR}44` }}>
              <span className="text-2xl font-display font-bold" style={{ color: CLIENT_COLOR }}>#{CLIENT.rank}</span>
            </div>
            <div>
              <div className="text-[11px] text-gray-5 uppercase tracking-widest font-mono">Your Market Position</div>
              <div className="text-[22px] font-display font-bold mt-0.5" style={{ color: CLIENT_COLOR }}>
                {fmtPct(CLIENT.share)} market share
              </div>
              <div className="text-[12px] text-gray-4 mt-1">
                Ranked #{CLIENT.rank} of {MOCK_COMPETITORS.length} suppliers · {fmt(CLIENT.total_sales)} revenue · {fmtNum(CLIENT.total_units)} units
              </div>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1">
            <div className="text-[10px] text-gray-5 font-mono uppercase tracking-widest">Category</div>
            <div className="text-[14px] font-display font-semibold text-white">Maize Flour</div>
            <div className="text-[10px] text-gray-5 font-mono">Jan — Jul 2026</div>
          </div>
        </div>
      </div>

      {/* ── Leaderboard + Category Share ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        {/* Leaderboard - 3 cols */}
        <div className="lg:col-span-3 pm-dash-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-yellow" />
              <span className="font-display text-[13px] font-semibold">Market Share Leaderboard</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${CLIENT_COLOR}22`, color: CLIENT_COLOR }}>
              You: #{CLIENT.rank}
            </span>
          </div>

          <div className="space-y-2.5">
            {MOCK_COMPETITORS.map((comp) => {
              const color = competitorColor(comp.rank, comp.is_client);
              const displayName = comp.is_client ? "DemoBrand Ltd (you)" : comp.manufacturer;
              return (
                <div key={comp.manufacturer} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-gray-5 w-4 text-right shrink-0">{comp.rank}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] truncate font-medium" style={{ color: comp.is_client ? CLIENT_COLOR : "#e5e5e5" }}>
                        {displayName}
                      </span>
                      <span className="text-[11px] text-gray-4 shrink-0 ml-2">
                        {fmt(comp.total_sales)} · {fmtPct(comp.share)}
                      </span>
                    </div>
                    <HorizontalBar value={comp.total_sales} max={maxSales} color={color} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-[#1A1A1A] text-[10px] text-gray-5">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RANK_COLORS.gold }} /> 1st
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RANK_COLORS.silver }} /> 2nd
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RANK_COLORS.bronze }} /> 3rd
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: CLIENT_COLOR }} /> You
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RANK_COLORS.faded }} /> Others
            </span>
          </div>
        </div>

        {/* Category Share - 2 cols */}
        <div className="lg:col-span-2 pm-dash-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-yellow" />
            <span className="font-display text-[13px] font-semibold">Revenue by Category</span>
          </div>
          <div style={{ height: 200 }}>
            <AnalyticsChart {...categoryChart} height={200} />
          </div>
          <div className="mt-3 pt-3 border-t border-[#1A1A1A] text-[10px] text-gray-5">
            <span className="w-3 h-0.5 rounded inline-block mr-1" style={{ background: ANALYTICS_COLORS.yellow }} />
            Maize Flour is your top category
          </div>
        </div>
      </div>

      {/* ── Branch Performance ─────────────── */}
      <div className="pm-dash-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-yellow" />
          <span className="font-display text-[13px] font-semibold">Branch Performance</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {MOCK_BRANCHES.map((b, i) => (
            <div key={b.name} className="flex flex-col gap-2">
              <span className="text-[11px] text-gray-4 truncate">{b.name}</span>
              <div className="h-20 rounded overflow-hidden flex items-end" style={{ background: "#1A1A1A" }}>
                <div
                  className="w-full rounded transition-all duration-500"
                  style={{
                    height: `${(b.sales / maxBranch) * 100}%`,
                    background: [ANALYTICS_COLORS.yellow, ANALYTICS_COLORS.green, ANALYTICS_COLORS.blue, ANALYTICS_COLORS.pink, ANALYTICS_COLORS.orange][i % 5],
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-gray-5">{fmt(b.sales)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Note ── */}
      <div className="text-center py-3 text-[11px] text-gray-5 italic">
        This is a demo with sample data. Your actual dashboard will show your real market data.
      </div>
    </div>
  );
}
