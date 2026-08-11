import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSharingRecords,
  fetchCategorySalesFallback,
  getSuppliersByIds,
  fetchPricingByCategoryFallback,
  getClientProductCategoryIds,
  getClientProfileCategoryIds,
  getAllBranchesFallback,
  getPeriodsByIds,
} from "@/lib/db-fallback";
import { getAdminClient } from "@/lib/supabase/admin";
import type { PortalClient } from "@/lib/portal";

export const dynamic = "force-dynamic";

interface CategoryCompetitor {
  supplier: string;
  total_sales: number;
  total_units: number;
  products_count: number;
  share: number;
  is_client: boolean;
  rank: number;
}

interface CategoryProduct {
  name: string;
  code: string;
  total: number;
  qty: number;
  category: string;
}

interface CategoryBranch {
  name: string;
  total: number;
  units: number;
  branch_code: string;
}

interface CategoryPricing {
  product: string;
  stock_code: string;
  branch: string;
  selling_price: number;
  standard_cost: number;
  margin_pct: number;
}

interface TrendPoint {
  period_id: string;
  label: string;
  totalSales: number;
  clientSales: number;
  clientShare: number;
}

/**
 * Shared handler for /api/portal/analytics/category/[id] and the legacy
 * /maizze route. Security model is identical to the main analytics route:
 *  1. The requested category must be granted by the sharing allowlist
 *     (portal_analytics_sharing: category_id === NULL = all categories).
 *  2. If the client has product categories (linked_supplier_id → products),
 *     the category must ALSO be one the client actually sells. A category
 *     that is shared but not part of the client's product mix is refused.
 *  3. period_id / branch_ids query params are intersected with the allowlist.
 */
export async function categoryAnalyticsHandler(
  supabase: SupabaseClient,
  client: PortalClient,
  categoryId: string,
  categoryName: string,
  filterPeriodId: string | null,
  filterBranchIds: string[],
) {
  const sharing = await getSharingRecords(supabase, client.id);
  if (!sharing || sharing.length === 0) {
    return NextResponse.json({ category: null, summary: "No analytics sharing configured" });
  }

  // 1. Allowlist scope for the requested category (NULL category_id = all).
  const categorySharing = sharing.filter((s) => s.category_id === null || s.category_id === categoryId);
  if (categorySharing.length === 0) {
    return NextResponse.json({ category: null, summary: "This category is not shared with your account" });
  }

  // 2. Client-category scope: the category must be part of the client's
  // profile (clients.category_id / client_categories). When a profile exists
  // it wins over the supplier product mix so a freshly onboarded client with
  // no linked products can already access their assigned category.
  const profileCategoryIds = await getClientProfileCategoryIds(getAdminClient(), client.id);
  if (profileCategoryIds.length > 0 && !profileCategoryIds.includes(categoryId)) {
    return NextResponse.json({
      category: null,
      summary: "This category is not assigned to your account",
      scope: { requestedCategoryId: categoryId, profileCategoryIds },
    });
  }

  // Supplier product mix is a consistency check, not the gate: it is ignored
  // when the profile already grants the category.
  const clientCategoryIds = client.linked_supplier_id && profileCategoryIds.length === 0
    ? await getClientProductCategoryIds(getAdminClient(), client.linked_supplier_id)
    : [];
  if (clientCategoryIds.length > 0 && !clientCategoryIds.includes(categoryId)) {
    return NextResponse.json({
      category: null,
      summary: "This category is not part of your product mix",
      scope: { requestedCategoryId: categoryId, clientCategoryIds },
    });
  }

  const allowedPeriodIds = [...new Set(categorySharing.map((s) => s.period_id))];
  const allowedBranchIds = [...new Set(categorySharing.map((s) => s.branch_id).filter((b): b is string => Boolean(b)))] as string[];

  const periodIds = filterPeriodId ? (allowedPeriodIds.includes(filterPeriodId) ? [filterPeriodId] : []) : allowedPeriodIds;
  if (periodIds.length === 0) {
    return NextResponse.json({ category: categoryName, category_id: categoryId, summary: "No shared data for the selected period" });
  }

  // 3. Branch filter intersected with the allowlist.
  const branchIds = filterBranchIds.length > 0
    ? (allowedBranchIds.length === 0 ? filterBranchIds : filterBranchIds.filter((b) => allowedBranchIds.includes(b)))
    : allowedBranchIds;

  const salesRows = await fetchCategorySalesFallback(supabase, periodIds, categoryId, branchIds.length > 0 ? branchIds : undefined);

  const supplierIds = [...new Set(salesRows.map((r) => (r as Record<string, unknown>).supplier_id).filter(Boolean))] as string[];
  let supplierNameMap = new Map<string, string>();
  if (supplierIds.length > 0) {
    const supRows = await getSuppliersByIds(supabase, supplierIds);
    supplierNameMap = new Map((supRows ?? []).map((s) => [s.id, s.name]));
  }

  const linkedSupplierId = client.linked_supplier_id;
  const clientCompany = (client.company || client.name || "").trim().toLowerCase();

  const supGrouped = new Map<string, { total: number; units: number; products: Set<string>; supplierIds: Set<string> }>();
  for (const row of salesRows) {
    const r = row as Record<string, unknown>;
    const supId = r.supplier_id ? (r.supplier_id as string) : null;
    const supName = supId ? (supplierNameMap.get(supId) || "Unknown") : "Unknown";
    const existing = supGrouped.get(supName) || { total: 0, units: 0, products: new Set(), supplierIds: new Set() };
    existing.total += Number(r.total_amount) || 0;
    existing.units += Number(r.quantity) || 0;
    if (r.product_id) existing.products.add(r.product_id as string);
    if (supId) existing.supplierIds.add(supId);
    supGrouped.set(supName, existing);
  }

  const grandTotal = Array.from(supGrouped.values()).reduce((s, g) => s + g.total, 0);
  const competitors: CategoryCompetitor[] = Array.from(supGrouped.entries())
    .map(([name, data]) => ({
      supplier: name,
      total_sales: data.total,
      total_units: data.units,
      products_count: data.products.size,
      share: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      is_client: linkedSupplierId ? data.supplierIds.has(linkedSupplierId) : name.trim().toLowerCase() === clientCompany,
      rank: 0,
    }))
    .sort((a, b) => b.total_sales - a.total_sales)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const prodGrouped = new Map<string, { name: string; code: string; total: number; qty: number }>();
  for (const row of salesRows) {
    const r = row as Record<string, unknown>;
    const prod = r.product as { name: string; stock_code: string } | undefined;
    const key = (r.product_id as string) || prod?.stock_code || "unknown";
    const existing = prodGrouped.get(key) || { name: prod?.name || key, code: prod?.stock_code || "", total: 0, qty: 0 };
    existing.total += Number(r.total_amount) || 0;
    existing.qty += Number(r.quantity) || 0;
    prodGrouped.set(key, existing);
  }
  const products: CategoryProduct[] = Array.from(prodGrouped.values())
    .map((p) => ({ ...p, category: categoryName }))
    .sort((a, b) => b.total - a.total);

  const branchGrouped = new Map<string, { name: string; code: string; total: number; units: number }>();
  for (const row of salesRows) {
    const r = row as Record<string, unknown>;
    const branch = r.branch as { name: string; code: string } | undefined;
    const key = (r.branch_id as string) || branch?.name || "Unknown";
    const existing = branchGrouped.get(key) || { name: branch?.name || key, code: branch?.code || "", total: 0, units: 0 };
    existing.total += Number(r.total_amount) || 0;
    existing.units += Number(r.quantity) || 0;
    branchGrouped.set(key, existing);
  }
  const branches: CategoryBranch[] = Array.from(branchGrouped.values())
    .map((b) => ({ name: b.name, total: b.total, units: b.units, branch_code: b.code }))
    .sort((a, b) => b.total - a.total);

  // Share-over-time within this category, grouped per shared period.
  const trendByPeriod = new Map<string, TrendPoint>();
  for (const row of salesRows) {
    const r = row as Record<string, unknown>;
    const pid = r.period_id ? (r.period_id as string) : "unknown";
    const label = (r.period as { label?: string } | undefined)?.label || pid;
    const point = trendByPeriod.get(pid) || { period_id: pid, label, totalSales: 0, clientSales: 0, clientShare: 0 };
    const amount = Number(r.total_amount) || 0;
    point.totalSales += amount;
    const supId = r.supplier_id ? (r.supplier_id as string) : null;
    if (supId && (linkedSupplierId ? supplierNameMap.get(supId) && supGrouped.get(supplierNameMap.get(supId)!)?.supplierIds.has(linkedSupplierId) : false)) {
      point.clientSales += amount;
    }
    trendByPeriod.set(pid, point);
  }
  const salesTrend: TrendPoint[] = Array.from(trendByPeriod.values())
    .map((p) => ({ ...p, clientShare: p.totalSales > 0 ? (p.clientSales / p.totalSales) * 100 : 0 }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  const pricingRaw = await fetchPricingByCategoryFallback(supabase, categoryId, branchIds.length > 0 ? branchIds : undefined);
  const pricing: CategoryPricing[] = pricingRaw.map((p) => {
    const prod = p.product as { name: string; stock_code: string } | undefined;
    const branch = p.branch as { name: string; code: string } | undefined;
    const sp = Number(p.selling_price) || 0;
    const sc = Number(p.standard_cost) || 0;
    return {
      product: prod?.name || "", stock_code: prod?.stock_code || "",
      branch: branch?.name || "", selling_price: sp, standard_cost: sc,
      margin_pct: sp > 0 ? ((sp - sc) / sp) * 100 : 0,
    };
  });

  // Period + branch filter options (scoped to this category's sharing).
  const periods = await getPeriodsByIds(supabase, allowedPeriodIds);
  const allBranches = await getAllBranchesFallback(supabase, allowedBranchIds.length > 0 ? allowedBranchIds : undefined);

  return NextResponse.json({
    category: categoryName,
    category_id: categoryId,
    competitors,
    products,
    branches,
    pricing,
    salesTrend,
    periods,
    allBranches,
    scope: {
      sharedCategoryIds: sharing.filter((s) => s.category_id !== null).map((s) => s.category_id as string),
      clientCategoryIds,
      requestedCategoryId: categoryId,
    },
    summary: {
      totalSales: grandTotal,
      totalUnits: Array.from(supGrouped.values()).reduce((s, g) => s + g.units, 0),
      totalProducts: prodGrouped.size,
      totalSuppliers: supGrouped.size,
      avgMargin: pricing.length > 0
        ? pricing.reduce((s, p) => s + p.margin_pct, 0) / pricing.length
        : 0,
    },
  });
}
