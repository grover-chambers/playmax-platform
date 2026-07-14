"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  TrendingUp,
  BarChart3,
  PieChart,
  Store,
  Package,
  Calendar,
  Building2,
} from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";

const kpis = [
  { icon: Store, value: "10", label: "Branches", color: "var(--pm-blue)" },
  { icon: Package, value: "13,377", label: "Products", color: "var(--pm-green)" },
  { icon: Upload, value: "0", label: "Uploads", color: "var(--pm-yellow)" },
  { icon: Calendar, value: "0", label: "Periods", color: "var(--pm-purple)" },
];

const recentUploads = [
  { file: "inventory-items.xlsx", store: "—", period: "—", rows: "13,377", errors: 0, status: "✅" },
];

export default function AnalyticsDashboard() {
  const router = useRouter();

  return (
    <div className="p-6">
      <PageHeader
        title="Analytics Dashboard"
        subtitle="FMCG market analysis engine — overview"
        actions={
          <Button variant="primary" size="sm" onClick={() => router.push("/app/analytics/upload")}>
            <Upload className="w-3.5 h-3.5" />
            Upload data
          </Button>
        }
      />

      {/* KPI Row */}
      <div className="pm-dash-krow pm-dash-krow-4 mt-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="pm-dash-kcard">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" style={{ color: kpi.color }} />
                <div>
                  <div className="pm-dash-kn">{kpi.value}</div>
                  <div className="pm-dash-kl">{kpi.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-[2fr_1fr] gap-5 mt-5">
        {/* Left: Recent uploads */}
        <div className="pm-dash-card">
          <div className="pm-dash-card-h">
            <span className="pm-dash-card-t">Recent uploads</span>
            <button className="btn-sm" onClick={() => router.push("/app/analytics/upload")}>
              View all
            </button>
          </div>
          <div className="pm-dash-card-b">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-5 font-mono">
                  <th className="text-left pb-2 font-normal">File</th>
                  <th className="text-left pb-2 font-normal">Store</th>
                  <th className="text-left pb-2 font-normal">Period</th>
                  <th className="text-right pb-2 font-normal">Rows</th>
                  <th className="text-center pb-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentUploads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-5">
                      No data uploaded yet.
                    </td>
                  </tr>
                )}
                {recentUploads.map((u) => (
                  <tr key={u.file} className="border-t border-[#1E1E1E]">
                    <td className="py-2.5 text-white font-medium">{u.file}</td>
                    <td className="py-2.5 text-gray-4">{u.store}</td>
                    <td className="py-2.5 text-gray-4">{u.period}</td>
                    <td className="py-2.5 text-right text-gray-4 font-mono">{u.rows}</td>
                    <td className="py-2.5 text-center">{u.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Quick actions */}
        <div className="flex flex-col gap-4">
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">Quick actions</span>
            </div>
            <div className="pm-dash-card-b flex flex-col gap-2">
              <button
                className="pm-dash-qa-btn w-full justify-start"
                onClick={() => router.push("/app/analytics/upload")}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload XLSX file
              </button>
              <button className="pm-dash-qa-btn w-full justify-start" disabled>
                <TrendingUp className="w-3.5 h-3.5" />
                Market share report
              </button>
              <button className="pm-dash-qa-btn w-full justify-start" disabled>
                <BarChart3 className="w-3.5 h-3.5" />
                Category performance
              </button>
              <button className="pm-dash-qa-btn w-full justify-start" disabled>
                <PieChart className="w-3.5 h-3.5" />
                Competitor comparison
              </button>
              <button
                className="pm-dash-qa-btn w-full justify-start"
                onClick={() => router.push("/app/analytics/dimensions")}
              >
                <Building2 className="w-3.5 h-3.5" />
                Manage dimensions
              </button>
            </div>
          </div>

          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">Data freshness</span>
            </div>
            <div className="pm-dash-card-b">
              <p className="text-[11px] text-gray-4">
                Product master loaded from <strong className="text-white">inventory-items.xlsx</strong>.
                Upload per-store sales reports to begin analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
