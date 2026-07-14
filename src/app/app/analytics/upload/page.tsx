"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Settings,
  Table2,
} from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import * as XLSX from "xlsx";

type UploadFormat = "per_store_sales" | "chain_wide_sales" | "inventory";
type UploadStep = "select" | "raw_preview" | "column_mapping" | "mapped_preview" | "importing" | "done";

const formatOptions: { value: UploadFormat; label: string; desc: string }[] = [
  { value: "per_store_sales", label: "Per-store sales report", desc: "Single category × single store (e.g. Maize Flour — Nakuru)" },
  { value: "chain_wide_sales", label: "Chain-wide summary", desc: "All products, all stores aggregated (e.g. sales_of_products_by_date)" },
  { value: "inventory", label: "Product inventory", desc: "Product master with stock levels (e.g. inventory-items)" },
];

// Required fields per format
const REQUIRED_FIELDS: Record<UploadFormat, string[]> = {
  per_store_sales: ["stock_code", "quantity", "total"],
  chain_wide_sales: ["stock_code", "quantity", "total"],
  inventory: ["stock_code", "quantity"],
};

// All possible field definitions
const FIELD_DEFINITIONS: Record<string, { label: string; required: boolean; description: string }> = {
  stock_code: { label: "Stock Code / SKU", required: true, description: "Unique product identifier" },
  product_name: { label: "Product Name", required: false, description: "Product description/name" },
  quantity: { label: "Quantity", required: true, description: "Units sold or in stock" },
  total: { label: "Total Amount (KES)", required: true, description: "Total sales value or cost" },
  unit_price: { label: "Unit Price", required: false, description: "Price per unit" },
  unit_cost: { label: "Unit Cost", required: false, description: "Cost per unit" },
  weight_tonnes: { label: "Weight (tonnes)", required: false, description: "Weight in tonnes" },
  sub_category: { label: "Sub Category", required: false, description: "Product sub-category" },
};

export default function AnalyticsUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<UploadFormat | null>(null);
  const [step, setStep] = useState<UploadStep>("select");
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Raw parsed data
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);

  // Column mapping
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});

  interface MappedRow {
    row: number;
    stock_code: string;
    product_name: string;
    quantity: string;
    total: string;
    unit_price: string;
    unit_cost: string;
    weight_tonnes: string;
    sub_category: string;
    status: "ok" | "error";
    message: string;
    raw: Record<string, unknown>;
  }

  const requiredFields = useMemo(() => format ? REQUIRED_FIELDS[format] : [], [format]);

  // Build mapped rows from raw data and column map
  const buildMappedRows = useCallback(() => {
    if (!rawRows.length || !format) return [];

    return rawRows.map((raw, idx) => {
      const mapped: MappedRow = {
        row: idx + 1,
        stock_code: "",
        product_name: "",
        quantity: "0",
        total: "0",
        unit_price: "",
        unit_cost: "",
        weight_tonnes: "",
        sub_category: "",
        status: "error",
        message: "",
        raw: raw,
      };

      // Apply column mapping
      Object.entries(columnMap).forEach(([sourceCol, targetField]) => {
        const value = raw[sourceCol];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          (mapped as unknown as Record<string, unknown>)[targetField] = String(value);
        }
      });

      // Validate required fields
      const missing = requiredFields.filter(f => !mapped[f as keyof MappedRow] || String(mapped[f as keyof MappedRow]).trim() === "");
      if (missing.length > 0) {
        mapped.status = "error";
        mapped.message = `Missing required: ${missing.join(", ")}`;
      } else {
        mapped.status = "ok";
      }

      return mapped;
    });
  }, [rawRows, columnMap, format, requiredFields]);

  // Update mapped rows when mapping changes
  const mappedRowsComputed = useMemo(() => buildMappedRows(), [buildMappedRows]);

  const resetState = () => {
    setRawRows([]);
    setRawHeaders([]);
    setColumnMap({});
    setUploadId(null);
    setImportResult(null);
    setStep("select");
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) {
      setFile(f);
      resetState();
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      resetState();
    }
  };

  const clearFile = () => {
    setFile(null);
    resetState();
  };

  const handleParse = async () => {
      if (!file || !format) return;
      setUploading(true);

      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

        // Create upload record first
        const uploadRes = await fetch("/api/analytics/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            file_type: format,
          }),
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error ?? "Failed to create upload record");
        }

        const { upload } = await uploadRes.json();
        setUploadId(upload.id);

        setRawRows(rows);
        setRawHeaders(headers);

      // Auto-map common column names
      const autoMap: Record<string, string> = {};
      headers.forEach(h => {
        const lower = h.toLowerCase().trim();
        if (["stock code", "stock_code", "sku", "code", "item code"].includes(lower)) autoMap[h] = "stock_code";
        else if (["product name", "product_name", "product", "description", "item name"].includes(lower)) autoMap[h] = "product_name";
        else if (["quantity", "qty", "units", "unit cost"].includes(lower)) autoMap[h] = "quantity";
        else if (["total amount", "total_amount", "total", "sales", "total sales", "amount"].includes(lower)) autoMap[h] = "total";
        else if (["unit price", "unit_price", "price", "selling price"].includes(lower)) autoMap[h] = "unit_price";
        else if (["unit cost", "unit_cost", "cost", "cost price"].includes(lower)) autoMap[h] = "unit_cost";
        else if (["weight", "weight_tonnes", "tonnes", "weight (tonnes)"].includes(lower)) autoMap[h] = "weight_tonnes";
        else if (["sub category", "sub_category", "subcategory", "category"].includes(lower)) autoMap[h] = "sub_category";
      });

      setColumnMap(autoMap);
      setStep("raw_preview");
    } catch (e: unknown) {
      console.error("Parse error:", e);
      alert(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setUploading(false);
    }
  };

  const goToMapping = () => {
    setStep("column_mapping");
  };

  const goBackToRaw = () => {
    setStep("raw_preview");
  };

  const applyMapping = async () => {
      // POST mapped rows to staging API
      if (!uploadId) return;
    
      const res = await fetch(`/api/analytics/uploads/${uploadId}/staging-rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRowsComputed }),
      });
    
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to store staging rows" }));
        alert(err.error ?? "Failed to store staging rows");
        return;
      }
    
      setStep("mapped_preview");
    };

  const handleImport = async () => {
    if (!uploadId) return;
    setImporting(true);

    try {
      // Send mapped rows to staging
      const validRows = mappedRowsComputed.filter(r => r.status === "ok");
      if (validRows.length === 0) {
        alert("No valid rows to import");
        return;
      }

      const res = await fetch(`/api/analytics/uploads/${uploadId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Import failed" }));
        throw new Error(err.error ?? "Failed to import");
      }

      const result = await res.json();
      setImportResult(result);
      setStep("done");
    } catch (e: unknown) {
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: [e instanceof Error ? e.message : "Import failed"],
      });
      setStep("done");
    } finally {
      setImporting(false);
    }
  };

  const okCount = mappedRowsComputed.filter(r => r.status === "ok").length;
  const errorCount = mappedRowsComputed.filter(r => r.status === "error").length;

  // Progress indicator
  const steps: { key: UploadStep; label: string }[] = [
    { key: "select", label: "Select File" },
    { key: "raw_preview", label: "Raw Preview" },
    { key: "column_mapping", label: "Map Columns" },
    { key: "mapped_preview", label: "Review Data" },
    { key: "importing", label: "Import" },
    { key: "done", label: "Complete" },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="p-6">
      <PageHeader
        title="Data Upload"
        subtitle="Import XLSX files — parse, map columns, review, then import"
        actions={
          <Button variant="secondary" size="sm" onClick={() => router.push("/app/analytics/upload/history")}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Upload history
          </Button>
        }
      />

      {/* Progress Steps */}
      <div className="mb-6 flex items-center justify-between">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-mono font-bold transition-colors ${
                i < currentStepIndex ? "bg-green text-white" :
                i === currentStepIndex ? "bg-yellow text-black" :
                "bg-black-3 border border-[#252525] text-gray-5"
              }`}>
                {i < currentStepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`ml-2 text-[11px] font-medium ${i <= currentStepIndex ? "text-white" : "text-gray-5"}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`ml-2 flex-1 h-1 mx-2 rounded ${i < currentStepIndex ? "bg-green" : "bg-[#1E1E1E]"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="max-w-4xl">
        {/* ── Step 1: Format + File Selection ── */}
        {(step === "select" || step === "raw_preview" || step === "column_mapping" || step === "mapped_preview") && (
          <div className="mb-6 p-4 bg-black-3 border border-[#252525] rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-2">Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {formatOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setFormat(opt.value); if (step === "select") setStep("select"); }}
                      className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                        format === opt.value
                          ? "border-yellow bg-yellow/5"
                          : "border-[#252525] bg-black-3 hover:border-[#3A3A3A]"
                      }`}
                    >
                      <div className="font-display text-[11px] font-semibold text-white">{opt.label}</div>
                      <div className="text-[9px] text-gray-5 mt-0.5 leading-relaxed">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-2">
                  File {step !== "select" && <span className="text-yellow ml-1">✓</span>}
                </label>
                {!file ? (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                      dragOver ? "border-yellow bg-yellow/5" : "border-[#252525] bg-black-3 hover:border-[#3A3A3A]"
                    }`}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-3 text-gray-5" />
                    <p className="text-[13px] text-gray-4">Drag & drop <strong className="text-white">.xlsx</strong> or click</p>
                    <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-black-3 border border-[#252525] rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-green" />
                      <div>
                        <div className="text-[12px] font-semibold text-white">{file.name}</div>
                        <div className="text-[10px] text-gray-5">{(file.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                    <button onClick={clearFile} className="p-1 hover:bg-white/5 rounded"><X className="w-4 h-4 text-gray-5" /></button>
                  </div>
                )}
              </div>
            </div>

            {file && format && step === "select" && (
              <Button variant="primary" size="md" onClick={handleParse} disabled={uploading} className="w-full">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Parsing...</> : <><Table2 className="w-4 h-4 mr-2" />Parse File</>}
              </Button>
            )}
          </div>
        )}

        {/* ── Step 2: Raw Preview ── */}
        {step === "raw_preview" && rawRows.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-display text-[13px] font-semibold text-white">Raw Data Preview</span>
                <span className="text-[10px] text-gray-5 ml-2">{rawRows.length} rows × {rawHeaders.length} columns</span>
              </div>
              <Button variant="primary" size="sm" onClick={goToMapping}>
                <ArrowRight className="w-3.5 h-3.5 mr-1" /> Map Columns
              </Button>
            </div>
            <div className="border border-[#252525] rounded-lg bg-black-3 overflow-hidden max-h-96 overflow-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-gray-5 font-mono border-b border-[#252525] sticky top-0 bg-black-3">
                    <th className="text-left px-3 py-2 font-normal w-8">#</th>
                    {rawHeaders.map(h => (
                      <th key={h} className="text-left px-3 py-2 font-normal min-w-[120px] max-w-[200px] truncate">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-b border-[#1E1E1E]">
                      <td className="px-3 py-2 text-gray-5 font-mono">{i + 1}</td>
                      {rawHeaders.map(h => (
                        <td key={h} className="px-3 py-2 text-gray-3 truncate max-w-[200px]">
                          {String(r[h] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rawRows.length > 20 && (
                    <tr>
                      <td colSpan={rawHeaders.length + 1} className="text-center py-4 text-gray-5 text-[11px]">
                        Showing first 20 of {rawRows.length} rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Step 3: Column Mapping ── */}
        {step === "column_mapping" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-display text-[13px] font-semibold text-white">Map Columns</span>
                <span className="text-[10px] text-gray-5 ml-2">Match your columns to required fields</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={goBackToRaw}><ArrowLeft className="w-3.5 h-3.5 mr-1" />Back</Button>
                <Button variant="primary" size="sm" onClick={applyMapping}><ArrowRight className="w-3.5 h-3.5 mr-1" />Apply & Review</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Source columns */}
              <div className="border border-[#252525] rounded-lg bg-black-3 p-4 max-h-96 overflow-auto">
                <h4 className="font-display text-[12px] font-semibold text-white mb-3">Your Columns ({rawHeaders.length})</h4>
                <div className="space-y-2">
                  {rawHeaders.map(h => (
                    <div key={h} className="flex items-center gap-3 p-2 bg-black-2 rounded border border-[#1E1E1E]">
                      <span className="font-mono text-[11px] text-white min-w-[150px] truncate">{h}</span>
                      <span className="text-[10px] text-gray-5 flex-1">Sample: {String(rawRows[0]?.[h] ?? "—").slice(0, 40)}</span>
                      <select
                        value={columnMap[h] || ""}
                        onChange={e => setColumnMap(prev => ({ ...prev, [h]: e.target.value }))}
                        className="bg-black-3 border border-[#252525] rounded px-2 py-1 text-[11px] text-white w-48"
                      >
                        <option value="">— Not mapped —</option>
                        {Object.entries(FIELD_DEFINITIONS).map(([key, def]) => (
                          <option key={key} value={key} className={requiredFields.includes(key) ? "font-medium" : ""}>
                            {def.label} {requiredFields.includes(key) && "(required)"}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required fields checklist */}
              <div className="border border-[#252525] rounded-lg bg-black-3 p-4 max-h-96 overflow-auto">
                <h4 className="font-display text-[12px] font-semibold text-white mb-3">Required Fields Checklist</h4>
                <div className="space-y-2">
                  {requiredFields.map(f => {
                    const def = FIELD_DEFINITIONS[f];
                    const mappedSource = Object.entries(columnMap).find(([, v]) => v === f)?.[0];
                    const isMapped = !!mappedSource;
                    return (
                      <div key={f} className={`flex items-center gap-3 p-2 rounded ${isMapped ? "bg-green/10 border border-green/30" : "bg-red/10 border border-red/30"}`}>
                        <div className={isMapped ? "text-green" : "text-red"}><CheckCircle className="w-5 h-5" /></div>
                        <div className="flex-1">
                          <div className="font-medium text-[11px] text-white">{def.label}</div>
                          <div className="text-[9px] text-gray-5">{def.description}</div>
                          {isMapped && <div className="text-[9px] text-green">Mapped from: <span className="font-mono">{mappedSource}</span></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!requiredFields.every(f => Object.values(columnMap).includes(f)) && (
                  <div className="mt-4 p-3 bg-yellow/10 border border-yellow/30 rounded text-yellow text-[10px]">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1" /> Some required fields are not mapped. Import will fail for those rows.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Mapped Preview ── */}
        {step === "mapped_preview" && mappedRowsComputed.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-display text-[13px] font-semibold text-white">Mapped Data Review</span>
                <span className="text-[10px] text-gray-5 ml-2">{okCount} ok · {errorCount} errors · {mappedRowsComputed.length} total</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setStep("column_mapping")}><ArrowLeft className="w-3.5 h-3.5 mr-1" />Remap</Button>
                <Button variant="primary" size="sm" onClick={handleImport} disabled={importing || okCount === 0}>
                  {importing ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Importing...</> : <><Upload className="w-3.5 h-3.5 mr-1" />Import {okCount} Rows</>}
                </Button>
              </div>
            </div>

            <div className="border border-[#252525] rounded-lg bg-black-3 overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-gray-5 font-mono border-b border-[#252525] sticky top-0 bg-black-3">
                      <th className="text-left px-3 py-2 font-normal w-8">#</th>
                      <th className="text-left px-3 py-2 font-normal"><Settings className="w-3.5 h-3.5 inline mr-1" />Stock Code</th>
                      <th className="text-left px-3 py-2 font-normal">Product</th>
                      <th className="text-right px-3 py-2 font-normal">Qty</th>
                      <th className="text-right px-3 py-2 font-normal">Total</th>
                      <th className="text-right px-3 py-2 font-normal">Unit Price</th>
                      <th className="text-right px-3 py-2 font-normal">Unit Cost</th>
                      <th className="text-center px-3 py-2 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedRowsComputed.slice(0, 100).map(r => (
                      <tr key={r.row} className={`border-b border-[#1E1E1E] ${r.status === "error" ? "bg-red/5" : ""}`}>
                        <td className="px-3 py-2 text-gray-5 font-mono">{r.row}</td>
                        <td className="px-3 py-2 text-white font-mono">{r.stock_code || <span className="text-red">—</span>}</td>
                        <td className="px-3 py-2 text-gray-3 truncate max-w-[200px]">{r.product_name || "—"}</td>
                        <td className="px-3 py-2 text-right text-gray-3 font-mono">{r.quantity}</td>
                        <td className="px-3 py-2 text-right text-gray-3 font-mono">{r.total}</td>
                        <td className="px-3 py-2 text-right text-gray-4 font-mono">{r.unit_price || "—"}</td>
                        <td className="px-3 py-2 text-right text-gray-4 font-mono">{r.unit_cost || "—"}</td>
                        <td className="px-3 py-2 text-center">
                          {r.status === "ok" ? <CheckCircle className="w-3.5 h-3.5 inline text-green" /> : <X className="w-3.5 h-3.5 inline text-red" />}
                          {r.message && <span className="text-[8px] ml-1 text-gray-5 block">{r.message}</span>}
                        </td>
                      </tr>
                    ))}
                    {mappedRowsComputed.length > 100 && (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-gray-5 text-[10px]">Showing first 100 of {mappedRowsComputed.length} rows</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5: Import Result ── */}
        {step === "done" && importResult && (
          <div className="border border-[#252525] rounded-lg bg-black-3 p-6">
            {importResult.errors.length === 0 ? (
              <div className="flex items-center gap-3 text-green">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <div className="font-display text-[14px] font-semibold">Import Successful</div>
                  <div className="text-[12px] text-gray-4">Imported <strong>{importResult.imported}</strong> rows {importResult.skipped > 0 ? `, ${importResult.skipped} skipped` : ""}</div>
                </div>
              </div>
            ) : (
              <div className="text-red">
                <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-5 h-5" /> Import completed with errors</div>
                {importResult.errors.map((err, i) => <p key={i} className="text-[11px] text-gray-5 ml-6">{err}</p>)}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => router.push("/app/analytics/upload/history")}>View History</Button>
              <Button variant="primary" size="sm" onClick={clearFile}><Upload className="w-3.5 h-3.5 mr-1" />Upload Another</Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {(!file || step === "select") && (
          <div className="text-center py-12 text-gray-5">
            <Upload className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-[13px]">Select a format and upload an .xlsx file to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}