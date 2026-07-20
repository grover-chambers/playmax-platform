/* ── Analytics Engine Types ─────────────────────────────── */

export type UploadFileType = "per_store_sales" | "chain_wide_sales" | "inventory" | "sales_transactions" | "stock_movements" | "supplier_details" | "pricing" | "product_master" | "supplier_products" | "item_list_master";
export type UploadStatus = "uploaded" | "parsed" | "validated" | "imported" | "failed";
export type BranchTier = "standard" | "flagship" | "express";

/* ── Dimensions ──────────────────────────────────────── */

export interface AnalyticsBranch {
  id: string;
  code: string;
  name: string;
  city: string | null;
  region: string | null;
  tier: BranchTier;
  active: boolean;
  created_at: string;
}

export interface AnalyticsPeriod {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  year: number;
  quarter: number;
  month: number;
  created_at: string;
}

export interface AnalyticsCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface AnalyticsManufacturer {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
}

export interface AnalyticsSupplier {
  id: string;
  name: string;
  code: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsProduct {
  id: string;
  stock_code: string;
  name: string;
  category_id: string | null;
  manufacturer_id: string | null;
  sub_category: string | null;
  unit_of_measure: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsProductWithJoins extends AnalyticsProduct {
  category_name?: string;
  manufacturer_name?: string;
}

/* ── Staging ─────────────────────────────────────────── */

export interface AnalyticsStagingUpload {
  id: string;
  filename: string;
  file_type: UploadFileType;
  status: UploadStatus;
  period_id: string | null;
  branch_id: string | null;
  category_id: string | null;
  total_rows: number;
  error_rows: number;
  metadata: Record<string, unknown>;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  branch_name?: string;
  period_label?: string;
}

export interface AnalyticsStagingRow {
  id: string;
  upload_id: string;
  row_number: number;
  stock_code: string | null;
  product_name: string | null;
  sub_category: string | null;
  unit_cost: number | null;
  unit_price: number | null;
  quantity: number | null;
  weight_tonnes: number | null;
  total_amount: number | null;
  raw_data: Record<string, unknown> | null;
  errors: Record<string, unknown>;
  created_at: string;
}

/* ── Facts ───────────────────────────────────────────── */

export interface AnalyticsFactSales {
  id: string;
  period_id: string;
  branch_id: string;
  category_id: string | null;
  product_id: string;
  quantity: number;
  weight_tonnes: number;
  unit_price: number | null;
  total_amount: number;
  cost_amount: number;
  vat_amount: number;
  created_at: string;
}

export interface AnalyticsFactInventory {
  id: string;
  snapshot_date: string;
  product_id: string;
  branch_id: string | null;
  quantity_on_hand: number;
  unit_cost: number | null;
  total_value: number;
  created_at: string;
}

/* ── Saved Reports ───────────────────────────────────── */

export interface AnalyticsSavedReport {
  id: string;
  name: string;
  report_type: string;
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/* ── Query Response Shapes ───────────────────────────── */

export interface BranchSalesRow {
  branch: string;
  branch_code: string;
  sales: number;
  prev_sales: number;
  share: number;
  rank: number;
}

export interface MarketShareResponse {
  branches: BranchSalesRow[];
  total_sales: number;
  total_prev_sales: number;
  period: { label: string; start: string; end: string };
  compare_period: { label: string; start: string; end: string } | null;
  category: string;
}

export interface CategoryPerformanceRow {
  category: string;
  total_sales: number;
  total_units: number;
  avg_unit_price: number;
  product_count: number;
  prev_total_sales: number;
}

export interface CompetitorRow {
  manufacturer: string;
  total_sales: number;
  total_units: number;
  share: number;
  product_count: number;
  avg_unit_price: number;
}
