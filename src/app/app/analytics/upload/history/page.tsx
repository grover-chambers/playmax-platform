"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, AlertCircle, Trash2, Loader2 } from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import Pagination, { usePagination } from "@/components/ui/pagination";
import type { AnalyticsStagingUpload } from "@/lib/analytics-types";

export default function UploadHistoryPage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<AnalyticsStagingUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/uploads")
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUploads(data.uploads ?? []))
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);



  const { paginated, total } = usePagination(uploads, page, 20);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this upload record?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/analytics/uploads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setUploads((prev) => prev.filter((u) => u.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Upload History"
        subtitle="All XLSX files ingested into the analytics engine"
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.push("/app/analytics/upload")}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to upload
          </Button>
        }
      />

      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg bg-red/10 border border-red/20 text-red text-[12px]">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline cursor-pointer">dismiss</button>
        </div>
      )}

      <div className="mt-5 border border-[#252525] rounded-lg bg-black-3 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-4 h-4 text-gray-5 animate-spin" />
            <span className="ml-2 text-[11px] text-gray-5">Loading uploads...</span>
          </div>
        ) : (
          <><table className="w-full text-[11px]">
            <thead>
              <tr className="text-gray-5 font-mono border-b border-[#252525]">
                <th className="text-left px-4 py-3 font-normal">File</th>
                <th className="text-left px-4 py-3 font-normal">Date</th>
                <th className="text-left px-4 py-3 font-normal">Period</th>
                <th className="text-left px-4 py-3 font-normal">Branch</th>
                <th className="text-right px-4 py-3 font-normal">Rows</th>
                <th className="text-right px-4 py-3 font-normal">Errors</th>
                <th className="text-center px-4 py-3 font-normal">Status</th>
                <th className="text-center px-4 py-3 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {uploads.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-5">
                    No uploads yet.
                  </td>
                </tr>
              )}
              {paginated.map((u) => (
                <tr key={u.id} className="border-b border-[#1E1E1E] last:border-0">
                  <td className="px-4 py-2.5 text-white font-medium truncate max-w-[200px]">{u.filename}</td>
                  <td className="px-4 py-2.5 text-gray-4">
                    {new Date(u.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-2.5 text-gray-4">{u.period_label ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-4">{u.branch_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-gray-4 font-mono">{u.total_rows.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-gray-4 font-mono">{u.error_rows}</td>
                  <td className="px-4 py-2.5 text-center">
                    {u.status === "imported" ? (
                      <CheckCircle className="w-3.5 h-3.5 inline text-green" />
                    ) : u.status === "failed" ? (
                      <AlertCircle className="w-3.5 h-3.5 inline text-red" />
                    ) : (
                      <span className="text-gray-5 font-mono">{u.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {(u.status === "failed" || u.status === "uploaded") && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={deleting === u.id}
                        className="p-1.5 hover:bg-white/5 rounded cursor-pointer disabled:opacity-50"
                        title="Delete upload"
                      >
                        {deleting === u.id ? (
                          <Loader2 className="w-3.5 h-3.5 text-gray-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-gray-5 hover:text-red" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
