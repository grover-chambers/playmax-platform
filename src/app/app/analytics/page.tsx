"use client";

import React, { useState, useEffect, startTransition } from "react";
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
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import Pagination, { usePagination } from "@/components/ui/pagination";
import type {
  AnalyticsBranch,
  AnalyticsStagingUpload,
} from "@/lib/analytics-types";

export default function AnalyticsDashboard() {
  const router = useRouter();

  const [branches, setBranches] = useState<AnalyticsBranch[]>([]);
  const [uploads, setUploads] = useState<AnalyticsStagingUpload[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [dimRes, upRes] = await Promise.all([
          fetch("/api/analytics/dimensions"),
          fetch("/api/analytics/uploads"),
        ]);

        if (!dimRes.ok) throw new Error("Failed to load dimensions");
        if (!upRes.ok) throw new Error("Failed to load uploads");

        const dim = await dimRes.json();
        const up = await upRes.json();

        setBranches(dim.branches ?? []);
        setProductCount(dim.productCount ?? 0);
        setUploads(up.uploads ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activePeriods = new Set(
    uploads.filter((u) => u.period_id).map((u) => u.period_id)
  ).size;

  const kpis = [
    { icon: Store, value: loading ? "—" : String(branches.length), label: "Branches", color: "text-teal" },
    { icon: Package, value: loading ? "—" : productCount.toLocaleString(), label: "Products", color: "text-blue" },
    { icon: Upload, value: loading ? "—" : String(uploads.length), label: "Uploads", color: "text-green" },
    { icon: Calendar, value: loading ? "—" : String(activePeriods), label: "Periods", color: "text-red" },
  ];

  useEffect(() => { startTransition(() => { setPage(1); }); }, [uploads.length]);

  const { paginated: recentUploads, total } = usePagination(uploads, page, 5);

  return (
    <div className="page-content space-y-5">
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

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red/10 border border-red/20 text-red text-[12px]">
          {error}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="ws-stat-card">
              <div className="flex items-center gap-3">
                <div className="ws-stat-icon">
                  {loading ? (
                    <Loader2 className="w-4 h-4 text-gray-5 animate-spin" />
                  ) : (
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                  )}
                </div>
                <div>
                  <div className="ws-stat-value">{kpi.value}</div>
                  <div className="ws-stat-label">{kpi.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-[2fr_1fr] gap-5">
        {/* Left: Recent uploads */}
        <div className="pm-dash-card">
          <div className="pm-dash-card-h">
            <span className="pm-dash-card-t">Recent uploads</span>
            <button className="btn-sm" onClick={() => router.push("/app/analytics/upload/history")}>
              View all
            </button>
          </div>
          <div className="pm-dash-card-b">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 text-gray-5 animate-spin" />
                <span className="ml-2 text-[11px] text-gray-5">Loading...</span>
              </div>
            ) : (
              <><table className="w-full text-[11px]">
                <thead>
                  <tr className="text-gray-5 font-mono">
                    <th className="text-left pb-2 font-normal">File</th>
                    <th className="text-left pb-2 font-normal">Branch</th>
                    <th className="text-left pb-2 font-normal">Period</th>
                    <th className="text-right pb-2 font-normal">Rows</th>
                    <th className="text-center pb-2 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                   {uploads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-5">
                        No data uploaded yet.
                      </td>
                    </tr>
                  )}
                  {recentUploads.map((u) => (
                    <tr key={u.id} className="border-t border-[var(--ws-border)]">
                      <td className="py-2.5 text-[var(--ws-text)] font-medium truncate max-w-45">{u.filename}</td>
                      <td className="py-2.5 text-gray-4">{u.branch_name ?? "—"}</td>
                      <td className="py-2.5 text-gray-4">{u.period_label ?? "—"}</td>
                      <td className="py-2.5 text-right text-gray-4 font-mono">{u.total_rows.toLocaleString()}</td>
                      <td className="py-2.5 text-center">
                        {u.status === "imported" ? "✅" : u.status === "failed" ? "❌" : "⏳"}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={5} total={total} onPageChange={setPage} />
          </>
        )}
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
              <button
                className="pm-dash-qa-btn w-full justify-start"
                onClick={() => router.push("/app/analytics/reports")}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Market share report
              </button>
              <button
                className="pm-dash-qa-btn w-full justify-start"
                onClick={() => router.push("/app/analytics/reports")}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Category performance
              </button>
              <button
                className="pm-dash-qa-btn w-full justify-start"
                onClick={() => router.push("/app/analytics/reports")}
              >
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
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-gray-5 animate-spin" />
                  <span className="text-[11px] text-gray-5">Loading...</span>
                </div>
              ) : uploads.length > 0 ? (
                <p className="text-[11px] text-gray-4">
                  <strong className="text-[var(--ws-text)]">{uploads.length}</strong> file{uploads.length !== 1 && "s"} uploaded.
                  {uploads.some((u) => u.status === "imported") && " Data is ready for analysis."}
                  {uploads.some((u) => u.status === "failed") && (
                    <span className="text-red ml-1">{uploads.filter((u) => u.status === "failed").length} failed.</span>
                  )}
                </p>
              ) : (
                <p className="text-[11px] text-gray-4">
                  No data uploaded yet. Upload per-store sales reports to begin analysis.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
