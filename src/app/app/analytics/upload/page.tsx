"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";

type UploadFormat = "per_store_sales" | "chain_wide_sales" | "inventory";

interface PreviewRow {
  row: number;
  stock_code: string;
  product_name: string;
  quantity: string;
  total: string;
  status: "ok" | "new" | "error";
  message?: string;
}

const formatOptions: { value: UploadFormat; label: string; desc: string }[] = [
  {
    value: "per_store_sales",
    label: "Per-store sales report",
    desc: "Single category × single store (e.g. Maize Flour — Nakuru)",
  },
  {
    value: "chain_wide_sales",
    label: "Chain-wide summary",
    desc: "All products, all stores aggregated (e.g. sales_of_products_by_date)",
  },
  {
    value: "inventory",
    label: "Product inventory",
    desc: "Product master with stock levels (e.g. inventory-items)",
  },
];

export default function AnalyticsUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<UploadFormat | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) {
      setFile(f);
      setPreview(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(null);
    }
  };

  const handleParse = async () => {
    if (!file || !format) return;
    setUploading(true);
    // Simulate parsing — will be replaced with XLSX reader + API call
    await new Promise((r) => setTimeout(r, 1000));
    setPreview([
      { row: 1, stock_code: "JLM01B", product_name: "RAHA PREMIUM MAIZE MEAL", quantity: "11507.75", total: "26,528,657", status: "ok" },
      { row: 2, stock_code: "JAM01B", product_name: "UWEZO FLOUR", quantity: "7139.25", total: "12,336,821", status: "ok" },
      { row: 3, stock_code: "TRF46C", product_name: "SUNFRESH TOMATO SAUCE", quantity: "482.00", total: "1,248,000", status: "new", message: "New product will be created" },
      { row: 4, stock_code: "XYZ999", product_name: "UNKNOWN ITEM", quantity: "100.00", total: "50,000", status: "error", message: "Unknown stock code" },
    ]);
    setUploading(false);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Data Upload"
        subtitle="Import XLSX files from the retailer — parsed into the analytics engine"
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.push("/app/analytics/upload/history")}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Upload history
          </Button>
        }
      />

      <div className="mt-5 max-w-3xl">
        {/* ── Format selector ── */}
        <div className="mb-5">
          <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-2.5">
            Step 1: Select format
          </label>
          <div className="grid grid-cols-3 gap-3">
            {formatOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFormat(opt.value)}
                className={`text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                  format === opt.value
                    ? "border-yellow bg-yellow/5"
                    : "border-[#252525] bg-black-3 hover:border-[#3A3A3A]"
                }`}
              >
                <div className="font-display text-[12px] font-semibold text-white">{opt.label}</div>
                <div className="text-[10px] text-gray-5 mt-1 leading-relaxed">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Drop zone ── */}
        <div className="mb-5">
          <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-2.5">
            Step 2: Choose file
          </label>
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-yellow bg-yellow/5"
                  : "border-[#252525] bg-black-3 hover:border-[#3A3A3A]"
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-gray-5" />
              <p className="text-[13px] text-gray-4">
                Drag &amp; drop your <strong className="text-white">.xlsx</strong> file here
              </p>
              <p className="text-[10px] text-gray-5 mt-1">or click to browse</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between bg-black-3 border border-[#252525] rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-green" />
                <div>
                  <div className="text-[12px] font-semibold text-white">{file.name}</div>
                  <div className="text-[10px] text-gray-5">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
              <button onClick={clearFile} className="p-1 hover:bg-white/5 rounded cursor-pointer">
                <X className="w-4 h-4 text-gray-5" />
              </button>
            </div>
          )}
        </div>

        {/* ── Parse button ── */}
        {file && format && !preview && (
          <Button
            variant="primary"
            size="md"
            onClick={handleParse}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? "Parsing..." : "Parse file"}
          </Button>
        )}

        {/* ── Preview ── */}
        {preview && (
          <div className="border border-[#252525] rounded-lg bg-black-3 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#252525] flex items-center justify-between">
              <div>
                <span className="font-display text-[13px] font-semibold text-white">Preview</span>
                <span className="text-[10px] text-gray-5 ml-2">
                  {preview.filter((r) => r.status === "ok").length} ok ·{" "}
                  {preview.filter((r) => r.status === "new").length} new ·{" "}
                  {preview.filter((r) => r.status === "error").length} errors
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={clearFile}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm">
                  Import to DB
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-gray-5 font-mono border-b border-[#252525]">
                    <th className="text-left px-4 py-2.5 font-normal">#</th>
                    <th className="text-left px-4 py-2.5 font-normal">Stock Code</th>
                    <th className="text-left px-4 py-2.5 font-normal">Product</th>
                    <th className="text-right px-4 py-2.5 font-normal">Quantity</th>
                    <th className="text-right px-4 py-2.5 font-normal">Total (KES)</th>
                    <th className="text-center px-4 py-2.5 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r) => (
                    <tr key={r.row} className="border-b border-[#1E1E1E] last:border-0">
                      <td className="px-4 py-2.5 text-gray-5 font-mono">{r.row}</td>
                      <td className="px-4 py-2.5 text-white font-mono">{r.stock_code}</td>
                      <td className="px-4 py-2.5 text-gray-3">{r.product_name}</td>
                      <td className="px-4 py-2.5 text-right text-gray-3 font-mono">{r.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-gray-3 font-mono">{r.total}</td>
                      <td className="px-4 py-2.5 text-center">
                        {r.status === "ok" && <CheckCircle className="w-3.5 h-3.5 inline text-green" />}
                        {r.status === "new" && <AlertCircle className="w-3.5 h-3.5 inline text-yellow" />}
                        {r.status === "error" && <X className="w-3.5 h-3.5 inline text-red" />}
                        {r.message && (
                          <span className="text-[9px] ml-1 text-gray-5">{r.message}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
