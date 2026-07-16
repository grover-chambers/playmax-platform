"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Trash2,
  Loader2,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import Pagination, { usePagination } from "@/components/ui/pagination";

interface UploadDetail {
  id: string;
  filename: string;
  file_type: string;
  status: string;
  total_rows: number;
  error_rows: number;
  created_at: string;
  period_id: string | null;
  branch_id: string | null;
  category_id: string | null;
  branch_name: string | null;
  period_label: string | null;
}

interface StagingRow {
  id: string;
  row_number: number;
  stock_code: string | null;
  product_name: string | null;
  sub_category: string | null;
  quantity: number | null;
  total_amount: number | null;
  unit_price: number | null;
  unit_cost: number | null;
  weight_tonnes: number | null;
  raw_data: Record<string, unknown> | null;
}

const FILE_TYPE_LABELS: Record<string, string> = {
  per_store_sales: "Per-store sales",
  chain_wide_sales: "Chain-wide sales",
  inventory: "Inventory",
  sales_transactions: "Sales transactions",
  stock_movements: "Stock movements",
  supplier_details: "Supplier details",
  pricing: "Pricing",
  product_master: "Product master",
  supplier_products: "Supplier products",
};

export default function UploadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [upload, setUpload] = useState<UploadDetail | null>(null);
  const [rows, setRows] = useState<StagingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reimporting, setReimporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [page, setPage] = useState(1);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/analytics/uploads/${id}`);
        if (!res.ok) throw new Error("Upload not found");
        const data = await res.json();
        setUpload(data.upload);
        setRows(data.rows ?? []);
      } catch {
        setError("Failed to load upload details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const { paginated, total } = usePagination(rows, page, 25);

  const handleDelete = async () => {
    if (!confirm("Delete this upload and all its staging rows?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/analytics/uploads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/app/analytics/upload/history");
    } catch {
      setError("Failed to delete upload");
      setDeleting(false);
    }
  };

  const handleReimport = async () => {
    if (!upload) return;
    if (upload.status === "imported") {
      if (!confirm("This upload was already imported. Re-importing will overwrite existing data. Continue?")) return;
    }
    setReimporting(true);
    setImportResult(null);
    try {
      const res = await fetch(`/api/analytics/uploads/${id}/import`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportResult({
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      });
      // Refresh upload status
      const detailRes = await fetch(`/api/analytics/uploads/${id}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setUpload(detailData.upload);
      }
    } catch (e: unknown) {
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: [e instanceof Error ? e.message : "Import failed"],
      });
    } finally {
      setReimporting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-gray-5 animate-spin" />
          <span className="ml-3 text-[12px] text-gray-5">Loading upload details...</span>
        </div>
      </div>
    );
  }

  if (error || !upload) {
    return (
      <div className="page-content">
        <PageHeader
          title="Upload Detail"
          actions={
            <Button variant="secondary" size="sm" onClick={() => router.push("/app/analytics/upload/history")}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to history
            </Button>
          }
        />
        <div className="mt-4 px-4 py-3 rounded-lg bg-red/10 border border-red/20 text-red text-[12px]">
          {error || "Upload not found"}
        </div>
      </div>
    );
  }

  const okRows = rows.filter((r) => r.stock_code);
  const emptyRows = rows.filter((r) => !r.stock_code);

  return (
    <div className="page-content">
      <PageHeader
        title={upload.filename}
        subtitle={`${FILE_TYPE_LABELS[upload.file_type] ?? upload.file_type} — uploaded ${new Date(upload.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push("/app/analytics/upload/history")}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>
            {(upload.status === "uploaded" || upload.status === "parsed" || upload.status === "failed") && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleReimport}
                disabled={reimporting || rows.length === 0}
              >
                {reimporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                )}
                {upload.status === "imported" ? "Re-import" : "Import to Fact Tables"}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 mr-1" />
              )}
              Delete
            </Button>
          </div>
        }
      />

      {/* Import result */}
      {importResult && (
        <div className={`mt-4 p-4 rounded-lg border ${
          importResult.errors.length === 0
            ? "bg-green/5 border-green/20 text-green"
            : "bg-yellow/5 border-yellow/20 text-yellow"
        }`}>
          {importResult.errors.length === 0 ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-[12px] font-medium">
                Import successful — {importResult.imported} rows imported
                {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
              </span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[12px] font-medium">
                  Import completed with errors — {importResult.imported} imported, {importResult.errors.length} errors
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-[11px] text-gray-5 ml-6 font-mono">{err}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload metadata */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 bg-black-3 border border-[#252525] rounded-lg">
          <div className="text-[9px] text-gray-5 uppercase font-mono">Status</div>
          <div className="text-[12px] text-white mt-1 flex items-center gap-1.5">
            {upload.status === "imported" ? (
              <CheckCircle className="w-3 h-3 text-green" />
            ) : upload.status === "failed" ? (
              <AlertCircle className="w-3 h-3 text-red" />
            ) : null}
            {upload.status}
          </div>
        </div>
        <div className="p-3 bg-black-3 border border-[#252525] rounded-lg">
          <div className="text-[9px] text-gray-5 uppercase font-mono">Period</div>
          <div className="text-[12px] text-white mt-1">{upload.period_label ?? "—"}</div>
        </div>
        <div className="p-3 bg-black-3 border border-[#252525] rounded-lg">
          <div className="text-[9px] text-gray-5 uppercase font-mono">Branch</div>
          <div className="text-[12px] text-white mt-1">{upload.branch_name ?? "—"}</div>
        </div>
        <div className="p-3 bg-black-3 border border-[#252525] rounded-lg">
          <div className="text-[9px] text-gray-5 uppercase font-mono">Total Rows</div>
          <div className="text-[12px] text-white mt-1 font-mono">{upload.total_rows.toLocaleString()}</div>
        </div>
        <div className="p-3 bg-black-3 border border-[#252525] rounded-lg">
          <div className="text-[9px] text-gray-5 uppercase font-mono">Errors</div>
          <div className={`text-[12px] mt-1 font-mono ${upload.error_rows > 0 ? "text-red" : "text-white"}`}>
            {upload.error_rows}
          </div>
        </div>
      </div>

      {/* Row stats */}
      <div className="mt-4 flex items-center gap-4 text-[11px] text-gray-5">
        <span>{rows.length.toLocaleString()} staging rows</span>
        <span>•</span>
        <span className="text-green">{okRows.length} with stock code</span>
        {emptyRows.length > 0 && (
          <>
            <span>•</span>
            <span className="text-yellow">{emptyRows.length} missing stock code</span>
          </>
        )}
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="ml-auto text-teal hover:underline cursor-pointer"
        >
          {showRaw ? "Hide raw data" : "Show raw data"}
        </button>
      </div>

      {/* Staging rows table */}
      <div className="mt-3 border border-[#252525] rounded-lg bg-black-3 overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-gray-5 font-mono border-b border-[#252525]">
              <th className="text-left px-4 py-2.5 font-normal w-12">#</th>
              <th className="text-left px-4 py-2.5 font-normal">Stock Code</th>
              <th className="text-left px-4 py-2.5 font-normal">Product Name</th>
              <th className="text-left px-4 py-2.5 font-normal">Category</th>
              <th className="text-right px-4 py-2.5 font-normal">Qty</th>
              <th className="text-right px-4 py-2.5 font-normal">Unit Price</th>
              <th className="text-right px-4 py-2.5 font-normal">Total</th>
              {showRaw && <th className="text-left px-4 py-2.5 font-normal">Raw Data</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr
                key={r.id}
                className={`border-b border-[#1E1E1E] last:border-0 ${
                  !r.stock_code ? "bg-yellow/5" : ""
                }`}
              >
                <td className="px-4 py-2 text-gray-5 font-mono">{r.row_number}</td>
                <td className={`px-4 py-2 font-mono ${r.stock_code ? "text-white" : "text-red"}`}>
                  {r.stock_code ?? "—"}
                </td>
                <td className="px-4 py-2 text-gray-4 truncate max-w-[200px]">{r.product_name ?? "—"}</td>
                <td className="px-4 py-2 text-gray-4">{r.sub_category ?? "—"}</td>
                <td className="px-4 py-2 text-right text-gray-4 font-mono">{r.quantity ?? "—"}</td>
                <td className="px-4 py-2 text-right text-gray-4 font-mono">
                  {r.unit_price != null ? Number(r.unit_price).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2 text-right text-gray-4 font-mono">
                  {r.total_amount != null ? Number(r.total_amount).toLocaleString() : "—"}
                </td>
                {showRaw && (
                  <td className="px-4 py-2 text-gray-5 font-mono text-[9px] max-w-[300px] truncate">
                    {r.raw_data ? JSON.stringify(r.raw_data).substring(0, 80) + "..." : "—"}
                  </td>
                )}
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={showRaw ? 8 : 7} className="text-center py-8 text-gray-5">
                  <FileSpreadsheet className="w-4 h-4 mx-auto mb-2 text-gray-5" />
                  No staging rows found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 25 && (
          <div className="px-4 py-2 border-t border-[#252525]">
            <Pagination page={page} pageSize={25} total={total} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
