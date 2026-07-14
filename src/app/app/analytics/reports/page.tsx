"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Save,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";

const sampleData = [
  { branch: "Naivasha Branch", sales: 14250000, prevSales: 13100000, share: 18.2, rank: 2 },
  { branch: "Nakuru Branch", sales: 18700000, prevSales: 17200000, share: 23.9, rank: 1 },
  { branch: "Narok Branch", sales: 5200000, prevSales: 4800000, share: 6.6, rank: 8 },
  { branch: "Nampark Makongeni", sales: 11300000, prevSales: 10800000, share: 14.4, rank: 3 },
  { branch: "Nyahururu Branch", sales: 3800000, prevSales: 4100000, share: 4.9, rank: 9 },
  { branch: "Meru Branch", sales: 8900000, prevSales: 8200000, share: 11.4, rank: 4 },
  { branch: "Maua Branch", sales: 6100000, prevSales: 5700000, share: 7.8, rank: 7 },
  { branch: "Karatina Branch", sales: 7600000, prevSales: 7100000, share: 9.7, rank: 5 },
  { branch: "Thika Branch", sales: 7200000, prevSales: 6900000, share: 9.2, rank: 6 },
  { branch: "Engineer Branch", sales: 1800000, prevSales: 1600000, share: 2.3, rank: 10 },
];

const totalSales = sampleData.reduce((s, r) => s + r.sales, 0);
const maxShare = Math.max(...sampleData.map((r) => r.share));

export default function MarketShareReport() {
  const router = useRouter();
  const [category, setCategory] = useState("Maize Flour");
  const [period, setPeriod] = useState("Jan–Jul 2026");
  const [comparePeriod, setComparePeriod] = useState("Jul–Dec 2025");

  const formatKES = (n: number) => {
    if (n >= 1000000) return `KES ${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `KES ${(n / 1000).toFixed(0)}K`;
    return `KES ${n.toLocaleString()}`;
  };

  const growthBadge = (current: number, prev: number) => {
    const pct = ((current - prev) / prev) * 100;
    if (pct > 3) {
      return { icon: TrendingUp, color: "text-green", label: `+${pct.toFixed(1)}%` };
    } else if (pct < -3) {
      return { icon: TrendingDown, color: "text-red", label: `${pct.toFixed(1)}%` };
    }
    return { icon: Minus, color: "text-gray-5", label: `${pct.toFixed(1)}%` };
  };

  return (
    <div className="p-6">
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

      {/* ── Parameter strip ── */}
      <div className="flex items-center gap-3 mt-5 pb-4 border-b border-[#252525] flex-wrap">
        <div>
          <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-black-3 border border-[#252525] rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
          >
            <option>Maize Flour</option>
            <option>Wheat Flour</option>
            <option>Cooking Oil</option>
            <option>Rice</option>
            <option>Sugar</option>
          </select>
        </div>
        <div>
          <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
            Period
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-black-3 border border-[#252525] rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
          >
            <option>Jan–Jul 2026</option>
            <option>Jul–Dec 2025</option>
            <option>Jan–Jun 2025</option>
          </select>
        </div>
        <div>
          <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
            Compare
          </label>
          <select
            value={comparePeriod}
            onChange={(e) => setComparePeriod(e.target.value)}
            className="bg-black-3 border border-[#252525] rounded-md px-3 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
          >
            <option>Jul–Dec 2025</option>
            <option>Jan–Jun 2025</option>
            <option>None</option>
          </select>
        </div>
        <div className="flex items-end gap-2 ml-auto">
          <Button variant="secondary" size="sm">
            <Download className="w-3 h-3" />
            Export PDF
          </Button>
          <Button variant="secondary" size="sm">
            <Download className="w-3 h-3" />
            Export Excel
          </Button>
          <Button variant="primary" size="sm">
            <Save className="w-3 h-3" />
            Save report
          </Button>
        </div>
      </div>

      {/* ── Report title ── */}
      <div className="mt-5 mb-4">
        <h2 className="font-display text-[18px] font-bold text-white">
          Market Share by Branch — {category}
        </h2>
        <p className="text-[11px] text-gray-5 mt-1">
          {period} · Total market: {formatKES(totalSales)}
        </p>
      </div>

      {/* ── Horizontal bar chart ── */}
      <div className="bg-black-3 border border-[#252525] rounded-lg p-5 mb-5">
        <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-4">
          Branch market share
        </h3>
        <div className="space-y-2.5">
          {sampleData
            .sort((a, b) => b.share - a.share)
            .map((r) => {
              const pct = (r.share / maxShare) * 100;
              const barColor = r.rank <= 3
                ? "bg-yellow"
                : "bg-white/10";
              const barBorder = r.rank <= 3
                ? ""
                : "border border-white/5";

              return (
                <div key={r.branch} className="flex items-center gap-3">
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

      {/* ── Data table ── */}
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
            {sampleData
              .sort((a, b) => a.rank - b.rank)
              .map((r) => {
                const badge = growthBadge(r.sales, r.prevSales);
                const BadgeIcon = badge.icon;
                return (
                  <tr key={r.branch} className="border-b border-[#1E1E1E] last:border-0">
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
                {formatKES(totalSales)}
              </td>
              <td className="px-4 py-3 text-right text-white font-semibold font-mono">
                100%
              </td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
