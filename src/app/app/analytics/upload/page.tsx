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

// ── Types ────────────────────────────────────────────────────────
type UploadFormat = "per_store_sales" | "chain_wide_sales" | "inventory" | "sales_transactions" | "stock_movements" | "supplier_details" | "pricing" | "product_master" | "supplier_products";
type UploadStep =
  | "select"
  | "confirm_details"
  | "raw_preview"
  | "column_mapping"
  | "mapped_preview"
  | "importing"
  | "done";

interface DetectedMetadata {
  period: string | null;
  store: string | null;
  category: string | null;
}

interface Branch {
  id: string;
  code: string;
  name: string;
  city: string | null;
  region: string | null;
  tier: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Period {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  year: number;
  quarter: number;
  month: number;
}

// Store name → branch code lookup (client-side)
const STORE_NAME_TO_BRANCH: Record<string, string> = {
  "NAIVASHA": "NVS",
  "NAKURU": "NKR",
  "NAROK": "NRK",
  "THIKA STORE(NAMPAK)": "NPM",
  "THIKA STORE(Nampak)": "NPM",
  "NYAHURURU": "NYH",
  "MERU": "MER",
  "MAUA": "MUA",
  "KARATINA": "KRT",
  "THIKA CBD": "HQ",
  "HQ": "HQ",
  "ENGINEER": "ENG",
};
const formatOptions: { value: UploadFormat; label: string; desc: string; periodRequired: boolean }[] = [
  {
    value: "per_store_sales",
    label: "Per-store sales report",
    desc: "Single category × single store (e.g. Maize Flour — Nakuru)",
    periodRequired: true,
  },
  {
    value: "chain_wide_sales",
    label: "Chain-wide summary",
    desc: "All products, all stores aggregated (e.g. sales_of_products_by_date)",
    periodRequired: true,
  },
  {
    value: "sales_transactions",
    label: "Detailed sales transactions",
    desc: "Line-item sales with customer, discount, tax details",
    periodRequired: true,
  },
  {
    value: "inventory",
    label: "Product inventory",
    desc: "Product master with stock levels (e.g. inventory-items)",
    periodRequired: false,
  },
  {
    value: "stock_movements",
    label: "Stock movements",
    desc: "Stock in/out/adjustment records with dates and references",
    periodRequired: false,
  },
  {
    value: "supplier_details",
    label: "Supplier details",
    desc: "Supplier master data — names, contacts, payment terms",
    periodRequired: false,
  },
  {
    value: "pricing",
    label: "Price list",
    desc: "Product pricing tiers, costs, and discount schedules",
    periodRequired: false,
  },
  {
    value: "product_master",
    label: "Product master catalog",
    desc: "Stock codes, names, categories — auto-creates missing categories",
    periodRequired: false,
  },
  {
    value: "supplier_products",
    label: "Supplier-product allocations",
    desc: "Links suppliers to their products — auto-creates missing suppliers",
    periodRequired: false,
  },
];

const REQUIRED_FIELDS: Record<UploadFormat, string[]> = {
  per_store_sales: ["stock_code", "quantity", "total"],
  chain_wide_sales: ["stock_code", "quantity", "total"],
  sales_transactions: ["stock_code", "quantity", "total"],
  inventory: ["stock_code", "quantity"],
  stock_movements: ["stock_code", "quantity"],
  supplier_details: ["supplier_name"],
  pricing: ["stock_code", "unit_price"],
  product_master: ["stock_code", "product_name"],
  supplier_products: ["stock_code", "supplier_name"],
};

const FIELD_DEFINITIONS: Record<
  string,
  { label: string; required: boolean; description: string }
> = {
  stock_code: {
    label: "Stock Code / SKU",
    required: true,
    description: "Unique product identifier",
  },
  product_name: {
    label: "Product Name",
    required: false,
    description: "Product description/name",
  },
  quantity: {
    label: "Quantity",
    required: true,
    description: "Units sold or in stock",
  },
  total: {
    label: "Total Amount (KES)",
    required: true,
    description: "Total sales value or cost",
  },
  unit_price: {
    label: "Unit Price",
    required: false,
    description: "Price per unit",
  },
  unit_cost: {
    label: "Unit Cost",
    required: false,
    description: "Cost per unit",
  },
  weight_tonnes: {
    label: "Weight (tonnes)",
    required: false,
    description: "Weight in tonnes",
  },
  sub_category: {
    label: "Sub Category",
    required: false,
    description: "Product sub-category",
  },
  supplier_name: {
    label: "Supplier Name",
    required: true,
    description: "Supplier company name",
  },
  supplier_code: {
    label: "Supplier Code",
    required: false,
    description: "Internal supplier reference",
  },
  contact_person: {
    label: "Contact Person",
    required: false,
    description: "Primary contact name",
  },
  phone: {
    label: "Phone",
    required: false,
    description: "Contact phone number",
  },
  email: {
    label: "Email",
    required: false,
    description: "Contact email address",
  },
  payment_terms: {
    label: "Payment Terms",
    required: false,
    description: "Payment terms (e.g. Net 30, COD)",
  },
  lead_time_days: {
    label: "Lead Time (days)",
    required: false,
    description: "Average delivery lead time in days",
  },
  movement_type: {
    label: "Movement Type",
    required: false,
    description: "in, out, adjustment, transfer, or return",
  },
  movement_date: {
    label: "Movement Date",
    required: false,
    description: "Date of stock movement",
  },
  reference_number: {
    label: "Reference Number",
    required: false,
    description: "PO, GRN, or internal reference",
  },
  batch_number: {
    label: "Batch Number",
    required: false,
    description: "Batch or lot number",
  },
  expiry_date: {
    label: "Expiry Date",
    required: false,
    description: "Product expiry date",
  },
  tier: {
    label: "Pricing Tier",
    required: false,
    description: "standard, wholesale, retail, etc.",
  },
  effective_date: {
    label: "Effective Date",
    required: false,
    description: "Date when price takes effect",
  },
  discount_pct: {
    label: "Discount %",
    required: false,
    description: "Discount percentage",
  },
  sale_date: {
    label: "Sale Date",
    required: false,
    description: "Date of the transaction",
  },
  customer: {
    label: "Customer",
    required: false,
    description: "Customer or buyer name",
  },
  tax: {
    label: "Tax (KES)",
    required: false,
    description: "Tax amount",
  },
  payment_method: {
    label: "Payment Method",
    required: false,
    description: "Cash, M-Pesa, Card, etc.",
  },
};

const KNOWN_COLUMN_SIGNALS = [
  "item code",
  "stock code",
  "sku",
  "code",
  "description",
  "product name",
  "product",
  "quantity",
  "qty",
  "units",
  "qty sold",
  "total",
  "amount",
  "sales",
  "total amount",
  "unit price",
  "price",
  "unit cost",
  "cost",
  "standard cost",
  "weight",
  "tonnes",
  "weight (t)",
  "sub category",
  "subcategory",
  "supplier",
  "vendor",
  "contact",
  "phone",
  "email",
  "payment terms",
  "lead time",
  "movement type",
  "movement date",
  "reference",
  "batch",
  "expiry",
  "tier",
  "effective date",
  "discount",
  "customer",
  "tax",
  "vat",
  "payment method",
];

// ── Sheet parsing helpers ────────────────────────────────────────

function parseSheetWithMetadata(sheet: XLSX.WorkSheet): {
  metadata: DetectedMetadata;
  headers: string[];
  rows: Record<string, unknown>[];
} {
  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  const metadata: DetectedMetadata = { period: null, store: null, category: null };

  // Scan first 20 rows for metadata labels
  const scanLimit = Math.min(grid.length, 20);
  for (let i = 0; i < scanLimit; i++) {
    const row = grid[i];
    for (let j = 0; j < row.length; j++) {
      const raw = String(row[j] ?? "");
      const cell = raw.toLowerCase().trim();

      // Period
      if (
        !metadata.period &&
        /period|date\s*range|reporting\s*period/.test(cell)
      ) {
        const colonMatch = raw.match(/:\s*(.+)/i);
        if (colonMatch) {
          metadata.period = colonMatch[1].trim();
        } else if (j + 1 < row.length && String(row[j + 1]).trim()) {
          metadata.period = String(row[j + 1]).trim();
        }
      }

      // Store / Branch
      if (!metadata.store && /store|branch|outlet|location/.test(cell)) {
        const colonMatch = raw.match(/:\s*(.+)/i);
        if (colonMatch) {
          metadata.store = colonMatch[1].trim();
        } else if (j + 1 < row.length && String(row[j + 1]).trim()) {
          metadata.store = String(row[j + 1]).trim();
        }
      }

      // Category
      if (
        !metadata.category &&
        /category|product\s*group|product\s*class/.test(cell)
      ) {
        const colonMatch = raw.match(/:\s*(.+)/i);
        if (colonMatch) {
          metadata.category = colonMatch[1].trim();
        } else if (j + 1 < row.length && String(row[j + 1]).trim()) {
          metadata.category = String(row[j + 1]).trim();
        }
      }
    }
  }

  // Detect header row by counting known column-name matches
  let headerRowIndex = 0;
  let bestMatches = 0;
  const scanHeaders = Math.min(grid.length, 30);

  for (let i = 0; i < scanHeaders; i++) {
    const row = grid[i];
    let matches = 0;
    for (const cell of row) {
      const lower = String(cell ?? "")
        .toLowerCase()
        .trim();
      if (KNOWN_COLUMN_SIGNALS.some((s) => lower.includes(s))) {
        matches++;
      }
    }
    if (matches > bestMatches && matches >= 2) {
      bestMatches = matches;
      headerRowIndex = i;
    }
  }

  // Extract headers
  const headers = grid[headerRowIndex]
    .map((h) => String(h ?? "").trim())
    .filter((h) => h !== "");

  // Extract data rows (after header, skip empty rows)
  const rows: Record<string, unknown>[] = [];
  for (let i = headerRowIndex + 1; i < grid.length; i++) {
    const row = grid[i];
    const allEmpty = row.every((cell) => String(cell ?? "").trim() === "");
    if (allEmpty) continue;

    const obj: Record<string, unknown> = {};
    headers.forEach((h, j) => {
      obj[h] = row[j] ?? "";
    });
    rows.push(obj);
  }

  return { metadata, headers, rows };
}

function matchBranch(storeText: string, branches: Branch[]): Branch | null {
  const lower = storeText.toLowerCase();
  // Exact city
  for (const b of branches) {
    if (b.city && lower === b.city.toLowerCase()) return b;
  }
  // Exact code
  for (const b of branches) {
    if (lower === b.code.toLowerCase()) return b;
  }
  // Substring against city
  for (const b of branches) {
    if (b.city && lower.includes(b.city.toLowerCase())) return b;
  }
  // Substring against name
  for (const b of branches) {
    if (lower.includes(b.name.toLowerCase())) return b;
  }
  return null;
}

function matchCategory(catText: string, categories: Category[]): Category | null {
  const lower = catText.toLowerCase();
  // Exact match
  for (const c of categories) {
    if (lower === c.name.toLowerCase()) return c;
  }
  // Substring
  for (const c of categories) {
    if (
      lower.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(lower)
    )
      return c;
  }
  return null;
}

// ── Component ────────────────────────────────────────────────────

export default function AnalyticsUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<UploadFormat | null>(null);
  const [step, setStep] = useState<UploadStep>("select");
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Raw parsed data
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);

  // Per-store metadata (extracted from first rows)
  const [storeMetadata, setStoreMetadata] = useState<{
    period: string;
    store: string;
    category: string;
    branchCode: string;
  } | null>(null);

  // Column mapping
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});

  // Dimensions (lazy-loaded)
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [dimensionsLoaded, setDimensionsLoaded] = useState(false);
  const [dimensionsLoading, setDimensionsLoading] = useState(false);
  const [dimensionsError, setDimensionsError] = useState<string | null>(null);

  // Detected metadata from file
  const [detectedMeta, setDetectedMeta] = useState<DetectedMetadata | null>(null);
  const detectedHeadersRef = useRef<string[]>([]);
  const detectedRowsRef = useRef<Record<string, unknown>[]>([]);

  // Selections for confirm_details
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const currentFormat = formatOptions.find((f) => f.value === format);
  const periodRequired = currentFormat?.periodRequired ?? false;

  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  const requiredFields = useMemo(
    () => (format ? REQUIRED_FIELDS[format] : []),
    [format],
  );

  const needsBranch =
    format === "per_store_sales" ||
    format === "inventory" ||
    format === "stock_movements" ||
    format === "sales_transactions";

  // ── Dimensions loading ────────────────────────────────────────

  const ensureDimensions = async (metadata?: DetectedMetadata) => {
    if (dimensionsLoaded) {
      if (metadata) autoMatchDimensions(metadata, branches, categories);
      return;
    }

    setDimensionsLoading(true);
    setDimensionsError(null);

    try {
      const [dimRes, perRes] = await Promise.all([
        fetch("/api/analytics/dimensions"),
        fetch("/api/analytics/periods"),
      ]);

      if (!dimRes.ok) {
        const err = await dimRes.json().catch(() => ({ error: "Dimensions request failed" }));
        throw new Error(err.error || `Dimensions API returned ${dimRes.status}`);
      }
      if (!perRes.ok) {
        const err = await perRes.json().catch(() => ({ error: "Periods request failed" }));
        throw new Error(err.error || `Periods API returned ${perRes.status}`);
      }

      const dimData = await dimRes.json();
      const perData = await perRes.json();
      const brs: Branch[] = dimData.branches ?? [];
      const cats: Category[] = dimData.categories ?? [];
      const pers: Period[] = perData.periods ?? [];

      setBranches(brs);
      setCategories(cats);
      setPeriods(pers);
      setDimensionsLoaded(true);

      if (pers.length === 0) {
        setDimensionsError("No periods found. You can select 'No period' for reference data, or create periods in Analytics Settings.");
      }

      if (metadata) autoMatchDimensions(metadata, brs, cats);
    } catch (e) {
      console.error("Failed to load dimensions:", e);
      setDimensionsError(e instanceof Error ? e.message : "Failed to load dimensions");
    } finally {
      setDimensionsLoading(false);
    }
  };

  const retryDimensions = async () => {
    setDimensionsLoaded(false);
    await ensureDimensions(detectedMeta ?? undefined);
  };

  const autoMatchDimensions = (
    metadata: DetectedMetadata,
    brs: Branch[],
    cats: Category[],
  ) => {
    if (metadata.store) {
      const match = matchBranch(metadata.store, brs);
      if (match) setSelectedBranchId(match.id);
    }
    if (metadata.category) {
      const match = matchCategory(metadata.category, cats);
      if (match) setSelectedCategoryId(match.id);
    }
  };

  // ── Mapped row interface ──────────────────────────────────────

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
    supplier_name: string;
    supplier_code: string;
    contact_person: string;
    phone: string;
    email: string;
    payment_terms: string;
    lead_time_days: string;
    movement_type: string;
    movement_date: string;
    reference_number: string;
    batch_number: string;
    expiry_date: string;
    tier: string;
    effective_date: string;
    discount_pct: string;
    sale_date: string;
    customer: string;
    tax: string;
    payment_method: string;
    status: "ok" | "error";
    message: string;
    raw: Record<string, unknown>;
  }

  // ── Build mapped rows ─────────────────────────────────────────

  const buildMappedRows = useCallback(() => {
    if (!rawRows.length || !format) return [];

    return rawRows.map((raw, idx) => {
      const mapped: MappedRow = {
        row: idx + 1,
        stock_code: "",
        product_name: "",
        quantity: "",
        total: "",
        unit_price: "",
        unit_cost: "",
        weight_tonnes: "",
        sub_category: "",
        supplier_name: "",
        supplier_code: "",
        contact_person: "",
        phone: "",
        email: "",
        payment_terms: "",
        lead_time_days: "",
        movement_type: "",
        movement_date: "",
        reference_number: "",
        batch_number: "",
        expiry_date: "",
        tier: "",
        effective_date: "",
        discount_pct: "",
        sale_date: "",
        customer: "",
        tax: "",
        payment_method: "",
        status: "error",
        message: "",
        raw: raw,
      };

      Object.entries(columnMap).forEach(([sourceCol, targetField]) => {
        const value = raw[sourceCol];
        if (
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
        ) {
          (
            mapped as unknown as Record<string, unknown>
          )[targetField] = String(value);
        }
      });

      const missing = requiredFields.filter(
        (f) =>
          !mapped[f as keyof MappedRow] ||
          String(mapped[f as keyof MappedRow]).trim() === "",
      );
      if (missing.length > 0) {
        mapped.status = "error";
        mapped.message = `Missing required: ${missing.join(", ")}`;
      } else {
        mapped.status = "ok";
      }

      return mapped;
    });
  }, [rawRows, columnMap, format, requiredFields]);

  const mappedRowsComputed = useMemo(
    () => buildMappedRows(),
    [buildMappedRows],
  );

  // ── State resets ──────────────────────────────────────────────

  const resetState = () => {
    setRawRows([]);
    setRawHeaders([]);
    setColumnMap({});
    setUploadId(null);
    setImportResult(null);
    setSelectedBranchId("");
    setSelectedCategoryId("");
    setSelectedPeriodId("");
    setDetectedMeta(null);
    detectedHeadersRef.current = [];
    detectedRowsRef.current = [];
    setStoreMetadata(null);
    setStep("select");
  };

  // ── File handling ─────────────────────────────────────────────

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f && (f.name.endsWith(".xlsx") || f.name.endsWith(".xls"))) {
        setFile(f);
        resetState();
      }
    },
    [],
  );

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

  // ── Parse XLSX locally and extract metadata ───────────────────

  const handleParseLocal = async () => {
    if (!file || !format) return;
    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const { metadata, headers, rows } = parseSheetWithMetadata(sheet);

      if (headers.length === 0 || rows.length === 0) {
        throw new Error(
          "No data found in the spreadsheet. Check that the file has a header row and data rows.",
        );
      }

      setDetectedMeta(metadata);

      // For per-store sales, also extract structured metadata with branch code lookup
      if (format === "per_store_sales") {
        try {
          const rawArrays = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
          const metaPeriod = String(rawArrays[1]?.[1] ?? "").trim();
          const metaStore = String(rawArrays[2]?.[1] ?? "").trim();
          const metaCategory = String(rawArrays[3]?.[1] ?? "").trim();
          const cleanStore = metaStore.toUpperCase().replace(/\s+/g, " ");
          const branchCode =
            STORE_NAME_TO_BRANCH[cleanStore] ||
            STORE_NAME_TO_BRANCH[metaStore.toUpperCase().trim()] ||
            "";
          setStoreMetadata({
            period: metaPeriod,
            store: metaStore,
            category: metaCategory,
            branchCode,
          });
        } catch {
          // Fallback: generic metadata already set via parseSheetWithMetadata
        }
      }

      detectedHeadersRef.current = headers;
      detectedRowsRef.current = rows;

      // Load dimensions and auto-match
      await ensureDimensions(metadata);

      setStep("confirm_details");
    } catch (e: unknown) {
      console.error("Parse error:", e);
      alert(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setUploading(false);
    }
  };

  // ── Confirm details and create upload record ──────────────────

  const confirmDetailsAndCreateUpload = async () => {
    if (!file || !format) return;

    if (needsBranch && !selectedBranchId) {
      alert(
        `Branch is required for ${
          format === "per_store_sales" ? "per-store sales" : "inventory"
        } uploads.`,
      );
      return;
    }
    if (periodRequired && !selectedPeriodId) {
      alert("Period is required for sales data. Please select or create a period.");
      return;
    }

    setConfirming(true);

    try {
      // If period is "no_period", send null
      const effectivePeriodId = selectedPeriodId === "no_period" ? null : selectedPeriodId || null;
      const uploadRes = await fetch("/api/analytics/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          file_type: format,
          period_id: effectivePeriodId,
          branch_id: selectedBranchId || null,
          category_id: selectedCategoryId || null,
        }),
      });

      if (!uploadRes.ok) {
        const err = await uploadRes
          .json()
          .catch(() => ({ error: "Failed to create upload" }));
        throw new Error(err.error ?? "Failed to create upload record");
      }

      const { upload } = await uploadRes.json();
      setUploadId(upload.id);

      // Set raw data from detected results
      const hdrs = detectedHeadersRef.current;
      const dataRows = detectedRowsRef.current;

      setRawHeaders(hdrs);
      setRawRows(dataRows);

      // Auto-map columns
      const autoMap: Record<string, string> = {};
      hdrs.forEach((h) => {
        const lower = h.toLowerCase().trim();
        if (
          ["stock code", "stock_code", "sku", "code", "item code"].includes(
            lower,
          )
        )
          autoMap[h] = "stock_code";
        else if (
          [
            "product name",
            "product_name",
            "product",
            "description",
            "item name",
          ].includes(lower)
        )
          autoMap[h] = "product_name";
        else if (
          ["quantity", "qty", "units", "qty sold"].includes(lower)
        )
          autoMap[h] = "quantity";
        else if (
          [
            "total amount",
            "total_amount",
            "total",
            "sales",
            "total sales",
            "amount",
          ].includes(lower)
        )
          autoMap[h] = "total";
        else if (
          ["unit price", "unit_price", "price", "selling price"].includes(
            lower,
          )
        )
          autoMap[h] = "unit_price";
        else if (
          [
            "unit cost",
            "unit_cost",
            "cost",
            "cost price",
            "standard cost",
          ].includes(lower)
        )
          autoMap[h] = "unit_cost";
        else if (
          [
            "weight",
            "weight_tonnes",
            "tonnes",
            "weight (tonnes)",
            "weight (t)",
            "wt",
          ].includes(lower)
        )
          autoMap[h] = "weight_tonnes";
        else if (
          ["sub category", "sub_category", "subcategory", "category"].includes(
            lower,
          )
        )
          autoMap[h] = "sub_category";
        else if (
          ["stock id code", "stock_id_code", "stock id"].includes(lower)
        )
          autoMap[h] = "stock_code";
        else if (
          ["title", "item description", "item_description"].includes(lower)
        )
          autoMap[h] = "product_name";
        else if (
          ["supplier code", "supplier_code"].includes(lower)
        )
          autoMap[h] = "supplier_code";
        else if (
          ["supplier name", "supplier_name", "supplier"].includes(lower)
        )
          autoMap[h] = "supplier_name";
        else if (
          ["supplier", "supplier name", "supplier_name", "vendor", "vendor name"].includes(
            lower,
          )
        )
          autoMap[h] = "supplier_name";
        else if (
          ["supplier code", "supplier_code", "vendor code"].includes(lower)
        )
          autoMap[h] = "supplier_code";
        else if (
          ["contact", "contact person", "contact_name", "contact_person"].includes(
            lower,
          )
        )
          autoMap[h] = "contact_person";
        else if (
          ["phone", "telephone", "mobile", "tel"].includes(lower)
        )
          autoMap[h] = "phone";
        else if (
          ["email", "e-mail", "mail"].includes(lower)
        )
          autoMap[h] = "email";
        else if (
          ["payment terms", "payment_terms", "terms", "pay terms"].includes(
            lower,
          )
        )
          autoMap[h] = "payment_terms";
        else if (
          ["lead time", "lead_time", "lead time days", "lead_time_days", "delivery days"].includes(
            lower,
          )
        )
          autoMap[h] = "lead_time_days";
        else if (
          ["movement type", "movement_type", "type", "txn type", "transaction type"].includes(
            lower,
          )
        )
          autoMap[h] = "movement_type";
        else if (
          ["movement date", "movement_date", "date", "txn date", "transaction date"].includes(
            lower,
          )
        )
          autoMap[h] = "movement_date";
        else if (
          ["reference", "reference number", "reference_number", "ref no", "grn", "po number", "po"].includes(
            lower,
          )
        )
          autoMap[h] = "reference_number";
        else if (
          ["batch", "batch number", "batch_number", "lot", "lot number"].includes(
            lower,
          )
        )
          autoMap[h] = "batch_number";
        else if (
          ["expiry", "expiry date", "expiry_date", "exp date", "exp"].includes(
            lower,
          )
        )
          autoMap[h] = "expiry_date";
        else if (
          ["tier", "pricing tier", "price tier", "level"].includes(lower)
        )
          autoMap[h] = "tier";
        else if (
          ["effective date", "effective_date", "valid from", "start date", "valid_from"].includes(
            lower,
          )
        )
          autoMap[h] = "effective_date";
        else if (
          ["discount", "discount %", "discount_pct", "disc %", "reduction"].includes(
            lower,
          )
        )
          autoMap[h] = "discount_pct";
        else if (
          ["sale date", "sale_date", "transaction date", "txn date"].includes(
            lower,
          )
        )
          autoMap[h] = "sale_date";
        else if (
          ["customer", "client", "buyer", "customer name", "customer_name"].includes(
            lower,
          )
        )
          autoMap[h] = "customer";
        else if (
          ["tax", "vat", "tax amount", "tax_amount", "vat amount"].includes(
            lower,
          )
        )
          autoMap[h] = "tax";
        else if (
          ["payment method", "payment_method", "pay method", "payment type"].includes(
            lower,
          )
        )
          autoMap[h] = "payment_method";
      });

      setColumnMap(autoMap);
      setStep("raw_preview");
    } catch (e: unknown) {
      console.error("Upload creation error:", e);
      alert(e instanceof Error ? e.message : "Failed to create upload");
    } finally {
      setConfirming(false);
    }
  };

  // ── Navigation ────────────────────────────────────────────────

  const goToMapping = () => setStep("column_mapping");
  const goBackToRaw = () => setStep("raw_preview");

  // ── Number parsing ────────────────────────────────────────────

  const parseNum = (v: string): number | null => {
    if (!v || v.trim() === "") return null;
    const cleaned = v.replace(/[KES,kes\s]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  // ── Apply mapping → staging rows ──────────────────────────────

  const applyMapping = async () => {
    if (!uploadId) return;

    const validRows = mappedRowsComputed.filter((r) => r.status === "ok");

    if (validRows.length === 0) {
      alert(
        `No valid rows to stage. ${mappedRowsComputed.length} row(s) are missing required fields — go back and check your column mapping.`,
      );
      return;
    }

    const rowsToStore = validRows.map((r) => ({
      row_number: r.row,
      stock_code: r.stock_code || null,
      product_name: r.product_name || null,
      sub_category: r.sub_category || null,
      unit_cost: parseNum(r.unit_cost),
      unit_price: parseNum(r.unit_price),
      quantity: parseNum(r.quantity),
      weight_tonnes: parseNum(r.weight_tonnes),
      total_amount: parseNum(r.total),
      raw_data: r.raw,
    }));

    const res = await fetch(`/api/analytics/uploads/${uploadId}/staging-rows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: rowsToStore }),
    });

    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ error: "Failed to store staging rows" }));
      alert(err.error ?? "Failed to store staging rows");
      return;
    }

    if (validRows.length < mappedRowsComputed.length) {
      alert(
        `Note: ${mappedRowsComputed.length - validRows.length} row(s) were skipped due to missing required fields and will not be imported.`,
      );
    }

    setStep("mapped_preview");
  };

  // ── Import ────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!uploadId) return;
    setImporting(true);
    setStep("importing");

    try {
      const validRows = mappedRowsComputed.filter((r) => r.status === "ok");
      if (validRows.length === 0) {
        alert("No valid rows to import");
        setStep("mapped_preview");
        return;
      }

      const res = await fetch(`/api/analytics/uploads/${uploadId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Import failed" }));
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

  // ── Computed counts ───────────────────────────────────────────

  const okCount = mappedRowsComputed.filter((r) => r.status === "ok").length;
  const errorCount = mappedRowsComputed.filter(
    (r) => r.status === "error",
  ).length;

  // ── Step definitions ──────────────────────────────────────────

  const steps: { key: UploadStep; label: string }[] = [
    { key: "select", label: "Select File" },
    { key: "confirm_details", label: "Confirm Details" },
    { key: "raw_preview", label: "Raw Preview" },
    { key: "column_mapping", label: "Map Columns" },
    { key: "mapped_preview", label: "Review Data" },
    { key: "importing", label: "Import" },
    { key: "done", label: "Complete" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="page-content">
      <PageHeader
        title="Data Upload"
        subtitle="Import XLSX files — parse, map columns, review, then import"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/app/analytics/upload/history")}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Upload history
          </Button>
        }
      />

      {/* ── Progress Steps ────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-mono font-bold transition-colors ${
                  i < currentStepIndex
                    ? "bg-green text-white"
                    : i === currentStepIndex
                      ? "bg-yellow text-black"
                      : "bg-black-3 border border-[#252525] text-gray-5"
                }`}
              >
                {i < currentStepIndex ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`ml-2 text-[11px] font-medium ${i <= currentStepIndex ? "text-white" : "text-gray-5"}`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`ml-2 flex-1 h-1 mx-2 rounded ${i < currentStepIndex ? "bg-green" : "bg-[#1E1E1E]"}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="max-w-4xl">
        {/* ════════════════════════════════════════════════════════ */}
        {/* Step 1: Format + File Selection                        */}
        {/* ════════════════════════════════════════════════════════ */}
        {(step === "select" || step === "confirm_details") && (
          <div className="mb-6 p-4 bg-black-3 border border-[#252525] rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-2">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {formatOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (step === "select") setFormat(opt.value);
                      }}
                      className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                        format === opt.value
                          ? "border-yellow bg-yellow/5"
                          : "border-[#252525] bg-black-3 hover:border-[#3A3A3A]"
                      }`}
                      disabled={step === "confirm_details"}
                    >
                      <div className="font-display text-[11px] font-semibold text-white">
                        {opt.label}
                      </div>
                      <div className="text-[9px] text-gray-5 mt-0.5 leading-relaxed">
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-2">
                  File{" "}
                  {file && <span className="text-yellow ml-1">✓</span>}
                </label>
                {!file ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                      dragOver
                        ? "border-yellow bg-yellow/5"
                        : "border-[#252525] bg-black-3 hover:border-[#3A3A3A]"
                    }`}
                  >
                    <Upload className="w-8 h-8 mx-auto mb-3 text-gray-5" />
                    <p className="text-[13px] text-gray-4">
                      Drag & drop <strong className="text-white">.xlsx</strong>{" "}
                      or click
                    </p>
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
                        <div className="text-[12px] font-semibold text-white">
                          {file.name}
                        </div>
                        <div className="text-[10px] text-gray-5">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    {step === "select" && (
                      <button
                        onClick={clearFile}
                        className="p-1 hover:bg-white/5 rounded"
                      >
                        <X className="w-4 h-4 text-gray-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {file && format && step === "select" && (
              <Button
                variant="primary"
                size="md"
                onClick={handleParseLocal}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Table2 className="w-4 h-4 mr-2" />
                    Parse File
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* Step 2: Confirm Details                                */}
        {/* ════════════════════════════════════════════════════════ */}
        {step === "confirm_details" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-display text-[13px] font-semibold text-white">
                  Confirm Upload Details
                </span>
                <span className="text-[10px] text-gray-5 ml-2">
                  Review detected metadata before creating the upload
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    resetState();
                  }}
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={confirmDetailsAndCreateUpload}
                  disabled={(periodRequired && !selectedPeriodId) || confirming}
                >
                  {confirming ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-3.5 h-3.5 mr-1" />
                      Confirm &amp; Continue
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Detected metadata */}
            {detectedMeta && (
              <div className="p-4 bg-black-3 border border-[#252525] rounded-lg mb-4">
                <h4 className="font-display text-[11px] font-semibold text-white mb-3">
                  Detected from File
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-[9px] text-gray-5 uppercase">
                      Store
                    </span>
                    <div className="text-[12px] text-white mt-1">
                      {detectedMeta.store || "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-5 uppercase">
                      Category
                    </span>
                    <div className="text-[12px] text-white mt-1">
                      {detectedMeta.category || "—"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-5 uppercase">
                      Date Range
                    </span>
                    <div className="text-[12px] text-white mt-1">
                      {detectedMeta.period || "—"}
                    </div>
                  </div>
                </div>
                {detectedMeta.period && (
                  <div className="mt-3 text-[10px] text-yellow">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Date range is for reference only — select the actual
                    reporting period below.
                  </div>
                )}
              </div>
            )}

            {/* Dimension selections */}
            <div className="p-4 bg-black-3 border border-[#252525] rounded-lg">
              <h4 className="font-display text-[11px] font-semibold text-white mb-3">
                Assign Dimensions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Branch */}
                <div>
                  <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-2">
                    Branch{' '}
                    {needsBranch && (
                      <span className="text-red">*</span>
                    )}
                  </label>
                  {dimensionsLoading ? (
                    <div className="w-full bg-black-3 border border-[#252525] rounded px-3 py-2 text-[11px] text-gray-5 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                    </div>
                  ) : (
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full bg-black-3 border border-[#252525] rounded px-3 py-2 text-[11px] text-white"
                    >
                      <option value="">— Select branch —</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} — {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-2">
                    Category
                  </label>
                  {dimensionsLoading ? (
                    <div className="w-full bg-black-3 border border-[#252525] rounded px-3 py-2 text-[11px] text-gray-5 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                    </div>
                  ) : (
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="w-full bg-black-3 border border-[#252525] rounded px-3 py-2 text-[11px] text-white"
                    >
                      <option value="">— Select category —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Period */}
                <div>
                  <label className="font-mono text-[10px] text-gray-5 uppercase tracking-wider block mb-2">
                    Period <span className="text-red">*</span>
                  </label>
                  {dimensionsLoading ? (
                    <div className="w-full bg-black-3 border border-[#252525] rounded px-3 py-2 text-[11px] text-gray-5 flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading periods...
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedPeriodId}
                        onChange={(e) => setSelectedPeriodId(e.target.value)}
                        className="w-full bg-black-3 border border-[#252525] rounded px-3 py-2 text-[11px] text-white"
                      >
                        <option value="">— Select period —</option>
                        {!periodRequired && (
                          <option value="no_period">No period — reference data</option>
                        )}
                        {periods.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label} ({p.start_date} — {p.end_date})
                          </option>
                        ))}
                      </select>
                      {periods.length === 0 && dimensionsLoaded && !dimensionsError && (
                        <p className="text-[10px] text-gray-5 mt-1">
                          No periods found. <button onClick={retryDimensions} className="text-teal underline cursor-pointer">Retry</button>
                        </p>
                      )}
                    </>
                  )}
                  {dimensionsError && (
                    <div className="mt-2 p-2 bg-red/10 border border-red/30 rounded text-[10px] text-red flex items-start gap-2">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div>{dimensionsError}</div>
                        <button onClick={retryDimensions} className="text-teal underline mt-1 cursor-pointer">Retry loading</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {format === "chain_wide_sales" && (
                <p className="text-[10px] text-gray-5 mt-2">
                  Branch is optional for chain-wide sales (data is aggregated
                  across all stores).
                </p>
              )}
              {!periodRequired && !selectedPeriodId && (
                <p className="text-[10px] text-gray-5 mt-2">
                  <AlertCircle className="w-3 h-3 inline mr-1" /> This format
                  doesn&apos;t require a period — select &quot;No period&quot; if this is
                  reference data.
                </p>
              )}
              {periodRequired && !selectedPeriodId && (
                <p className="text-[10px] text-yellow mt-2">
                  <AlertCircle className="w-3 h-3 inline mr-1" /> Period is
                  required for sales data — select a period or create one below.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* Step 3: Raw Preview                                    */}
        {/* ════════════════════════════════════════════════════════ */}
        {step === "raw_preview" && rawRows.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-display text-[13px] font-semibold text-white">
                  Raw Data Preview
                </span>
                <span className="text-[10px] text-gray-5 ml-2">
                  {rawRows.length} rows × {rawHeaders.length} columns
                </span>
              </div>

              {/* Per-store metadata badge */}
              {storeMetadata && (
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-gray-5">Period:</span>
                  <span className="text-white font-medium">{storeMetadata.period}</span>
                  <span className="text-gray-5">Store:</span>
                  <span className="text-white font-medium">{storeMetadata.store}</span>
                  {storeMetadata.branchCode && (
                    <span className="px-2 py-0.5 rounded bg-green/10 text-green border border-green/30 text-[9px] font-mono">
                      → {storeMetadata.branchCode}
                    </span>
                  )}
                  <span className="text-gray-5">Category:</span>
                  <span className="text-white font-medium">{storeMetadata.category}</span>
                </div>
              )}
              <Button variant="primary" size="sm" onClick={goToMapping}>
                <ArrowRight className="w-3.5 h-3.5 mr-1" /> Map Columns
              </Button>
            </div>
            <div className="border border-[#252525] rounded-lg bg-black-3 overflow-hidden max-h-96 overflow-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-gray-5 font-mono border-b border-[#252525] sticky top-0 bg-black-3">
                    <th className="text-left px-3 py-2 font-normal w-8">#</th>
                    {rawHeaders.map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-2 font-normal min-w-[120px] max-w-[200px] truncate"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-b border-[#1E1E1E]">
                      <td className="px-3 py-2 text-gray-5 font-mono">
                        {i + 1}
                      </td>
                      {rawHeaders.map((h) => (
                        <td
                          key={h}
                          className="px-3 py-2 text-gray-3 truncate max-w-[200px]"
                        >
                          {String(r[h] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rawRows.length > 20 && (
                    <tr>
                      <td
                        colSpan={rawHeaders.length + 1}
                        className="text-center py-4 text-gray-5 text-[11px]"
                      >
                        Showing first 20 of {rawRows.length} rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* Step 4: Column Mapping                                 */}
        {/* ════════════════════════════════════════════════════════ */}
        {step === "column_mapping" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-display text-[13px] font-semibold text-white">
                  Map Columns
                </span>
                <span className="text-[10px] text-gray-5 ml-2">
                  Match your columns to required fields
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={goBackToRaw}>
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back
                </Button>
                <Button variant="primary" size="sm" onClick={applyMapping}>
                  <ArrowRight className="w-3.5 h-3.5 mr-1" />
                  Apply &amp; Review
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Source columns */}
              <div className="border border-[#252525] rounded-lg bg-black-3 p-4 max-h-96 overflow-auto">
                <h4 className="font-display text-[12px] font-semibold text-white mb-3">
                  Your Columns ({rawHeaders.length})
                </h4>
                <div className="space-y-2">
                  {rawHeaders.map((h) => (
                    <div
                      key={h}
                      className="flex items-center gap-3 p-2 bg-black-2 rounded border border-[#1E1E1E]"
                    >
                      <span className="font-mono text-[11px] text-white min-w-[150px] truncate">
                        {h}
                      </span>
                      <span className="text-[10px] text-gray-5 flex-1">
                        Sample:{" "}
                        {String(rawRows[0]?.[h] ?? "—").slice(0, 40)}
                      </span>
                      <select
                        value={columnMap[h] || ""}
                        onChange={(e) =>
                          setColumnMap((prev) => ({
                            ...prev,
                            [h]: e.target.value,
                          }))
                        }
                        className="bg-black-3 border border-[#252525] rounded px-2 py-1 text-[11px] text-white w-48"
                      >
                        <option value="">— Not mapped —</option>
                        {Object.entries(FIELD_DEFINITIONS).map(([key, def]) => (
                          <option
                            key={key}
                            value={key}
                            className={
                              requiredFields.includes(key) ? "font-medium" : ""
                            }
                          >
                            {def.label}{" "}
                            {requiredFields.includes(key) && "(required)"}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required fields checklist */}
              <div className="border border-[#252525] rounded-lg bg-black-3 p-4 max-h-96 overflow-auto">
                <h4 className="font-display text-[12px] font-semibold text-white mb-3">
                  Required Fields Checklist
                </h4>
                <div className="space-y-2">
                  {requiredFields.map((f) => {
                    const def = FIELD_DEFINITIONS[f];
                    const mappedSource = Object.entries(columnMap).find(
                      ([, v]) => v === f,
                    )?.[0];
                    const isMapped = !!mappedSource;
                    return (
                      <div
                        key={f}
                        className={`flex items-center gap-3 p-2 rounded ${
                          isMapped
                            ? "bg-green/10 border border-green/30"
                            : "bg-red/10 border border-red/30"
                        }`}
                      >
                        <div
                          className={isMapped ? "text-green" : "text-red"}
                        >
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[11px] text-white">
                            {def.label}
                          </div>
                          <div className="text-[9px] text-gray-5">
                            {def.description}
                          </div>
                          {isMapped && (
                            <div className="text-[9px] text-green">
                              Mapped from:{" "}
                              <span className="font-mono">
                                {mappedSource}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!requiredFields.every((f) =>
                  Object.values(columnMap).includes(f),
                ) && (
                  <div className="mt-4 p-3 bg-yellow/10 border border-yellow/30 rounded text-yellow text-[10px]">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1" /> Some
                    required fields are not mapped. Import will fail for those
                    rows.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* Step 5: Mapped Preview                                 */}
        {/* ════════════════════════════════════════════════════════ */}
        {step === "mapped_preview" && mappedRowsComputed.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-display text-[13px] font-semibold text-white">
                  Mapped Data Review
                </span>
                <span className="text-[10px] text-gray-5 ml-2">
                  {okCount} ok · {errorCount} errors ·{" "}
                  {mappedRowsComputed.length} total
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setStep("column_mapping")}
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Remap
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleImport}
                  disabled={importing || okCount === 0}
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      Import {okCount} Rows
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="border border-[#252525] rounded-lg bg-black-3 overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-gray-5 font-mono border-b border-[#252525] sticky top-0 bg-black-3">
                      <th className="text-left px-3 py-2 font-normal w-8">
                        #
                      </th>
                      <th className="text-left px-3 py-2 font-normal">
                        <Settings className="w-3.5 h-3.5 inline mr-1" />
                        Stock Code
                      </th>
                      <th className="text-left px-3 py-2 font-normal">
                        Product
                      </th>
                      <th className="text-right px-3 py-2 font-normal">
                        Qty
                      </th>
                      <th className="text-right px-3 py-2 font-normal">
                        Total
                      </th>
                      <th className="text-right px-3 py-2 font-normal">
                        Unit Price
                      </th>
                      <th className="text-right px-3 py-2 font-normal">
                        Unit Cost
                      </th>
                      <th className="text-center px-3 py-2 font-normal">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedRowsComputed.slice(0, 100).map((r) => (
                      <tr
                        key={r.row}
                        className={`border-b border-[#1E1E1E] ${r.status === "error" ? "bg-red/5" : ""}`}
                      >
                        <td className="px-3 py-2 text-gray-5 font-mono">
                          {r.row}
                        </td>
                        <td className="px-3 py-2 text-white font-mono">
                          {r.stock_code || (
                            <span className="text-red">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-3 truncate max-w-[200px]">
                          {r.product_name || "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-3 font-mono">
                          {r.quantity}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-3 font-mono">
                          {r.total}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-4 font-mono">
                          {r.unit_price || "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-4 font-mono">
                          {r.unit_cost || "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.status === "ok" ? (
                            <CheckCircle className="w-3.5 h-3.5 inline text-green" />
                          ) : (
                            <X className="w-3.5 h-3.5 inline text-red" />
                          )}
                          {r.message && (
                            <span className="text-[8px] ml-1 text-gray-5 block">
                              {r.message}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {mappedRowsComputed.length > 100 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-4 text-gray-5 text-[10px]"
                        >
                          Showing first 100 of {mappedRowsComputed.length}{" "}
                          rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════ */}
        {/* Step 6: Import Result                                  */}
        {/* ════════════════════════════════════════════════════════ */}
        {step === "done" && importResult && (
          <div className="border border-[#252525] rounded-lg bg-black-3 p-6">
            {importResult.errors.length === 0 ? (
              <div className="flex items-center gap-3 text-green">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <div className="font-display text-[14px] font-semibold">
                    Import Successful
                  </div>
                  <div className="text-[12px] text-gray-4">
                    Imported <strong>{importResult.imported}</strong> rows
                    {importResult.skipped > 0
                      ? `, ${importResult.skipped} skipped`
                      : ""}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-red">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5" /> Import completed with
                  errors
                </div>
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-[11px] text-gray-5 ml-6">
                    {err}
                  </p>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  router.push("/app/analytics/upload/history")
                }
              >
                View History
              </Button>
              <Button variant="primary" size="sm" onClick={clearFile}>
                <Upload className="w-3.5 h-3.5 mr-1" />
                Upload Another
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {(!file || step === "select") && (
          <div className="text-center py-12 text-gray-5">
            <Upload className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-[13px]">
              Select a format and upload an .xlsx file to begin
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
