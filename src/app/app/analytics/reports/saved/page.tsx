"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Trash2, Loader2 } from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import Pagination, { usePagination } from "@/components/ui/pagination";
import type { AnalyticsSavedReport } from "@/lib/analytics-types";

export default function SavedReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<AnalyticsSavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/analytics/reports");
        if (!res.ok) throw new Error("Failed to load reports");
        const data = await res.json();
        setReports(data.reports ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => { startTransition(() => { setPage(1); }); }, [reports.length]);

  const { paginated, total } = usePagination(reports, page, 20);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this report?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/analytics/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="page-content space-y-5">
      <PageHeader
        title="Saved Reports"
        subtitle="Previously generated and saved reports"
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.push("/app/analytics/reports")}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to reports
          </Button>
        }
      />

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red/10 border border-red/20 text-red text-[12px]">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline cursor-pointer">dismiss</button>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-4 h-4 text-gray-5 animate-spin" />
            <span className="ml-2 text-[11px] text-gray-5">Loading reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="ws-panel p-10 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-5" />
            <p className="text-[13px] text-gray-5">No saved reports yet.</p>
            <p className="text-[11px] text-gray-5 mt-1">Generate a report and save it to see it here.</p>
          </div>
        ) : (
          paginated.map((r) => (
            <div
              key={r.id}
              className="ws-panel flex items-center justify-between px-5 py-4"
            >
              <div className="flex-1 min-w-0">
                <div className="font-display text-[13px] font-semibold text-[var(--ws-text)] truncate">{r.name}</div>
                <div className="text-[10px] text-gray-5 mt-1">
                  {r.report_type} · {Object.keys(r.config).length > 0 ? JSON.stringify(r.config) : "no parameters"} ·{" "}
                  Generated {new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={deleting === r.id}
                  className="p-2 hover:bg-[var(--ws-bg)] rounded cursor-pointer disabled:opacity-50"
                  title="Delete report"
                >
                  {deleting === r.id ? (
                    <Loader2 className="w-3.5 h-3.5 text-gray-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-gray-5 hover:text-red" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
        {reports.length > 0 && (
          <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
