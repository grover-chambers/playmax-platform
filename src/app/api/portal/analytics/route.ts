import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getAdminClient } from "@/lib/supabase/admin";
import { isAnalyticsSubscriptionAllowed } from "@/lib/portal";
import { requirePortalClient, subscriptionRequiredResponse } from "@/lib/portal-guard";
import {
  getSharingRecords,
  fetchAllSalesWithJoinsFallback,
  fetchInventoryFallback,
  fetchPricingFallback,
  getSuppliersByIds,
  getClientColorPg,
  withPgFallback,
  getAllBranchesFallback,
  getPeriodsByIds,
  getClientProductCategoryIds,
  getCategoriesByIds,
} from "@/lib/db-fallback";

export const dynamic = "force-dynamic";

interface BranchSales {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  total_amount: number;
  quantity: number;
}

interface CompetitorRank {
  manufacturer: string;
  total_sales: number;
  total_units: number;
  share: number;
  is_client: boolean;
  rank: number;
}

interface CategoryPerf {
  category: string;
  total_sales: number;
  total_units: number;
  avg_unit_price: number;
  product_count: number;
}

interface ProductPerformance {
  name: string;
  stock_code: string;
  category: string;
  total_revenue: number;
  total_qty: number;
  avg_price: number;
}

interface PricingPoint {
  product: string;
  stock_code: string;
  branch: string;
  selling_price: number;
  standard_cost: number;
  margin_pct: number;
}

interface RawSalesRow {
  id: string;
  quantity: number;
  total_amount: number;
  cost_amount: number;
  weight_tonnes: number;
  unit_price: number | null;
  product_id: string;
  branch_id: string;
  period_id: string;
  category_id: string;
  supplier_id: string | null;
  product: { name: string; stock_code: string };
  period: { label: string; year: number; quarter: number; month: number };
  branch: { name: string; code: string };
  category: { name: string };
}

interface RawInvRow {
  id: string;
  period: { end_date: string };
  closing_stock: number;
  stock_value: number;
  product: { name: string; stock_code: string };
  branch: { name: string; code: string };
}

interface RawPricingRow {
  id: string;
  standard_cost: number;
  selling_price: number;
  effective_date: string;
  product: { name: string; stock_code: string };
  branch: { name: string; code: string };
}

function processSalesIntoVisualizations(
  salesRows: RawSalesRow[],
  linkedSupplierId: string | null,
  clientCompany: string | null,
  clientName: string | null,
  pricingRaw: unknown[],
) {
  // Competitor comparison
  const supGrouped = new Map<string, { total: number; units: number; products: Set<string>; supplierIds: Set<string> }>();
  for (const row of salesRows) {
    const supName = row.supplier_id || "Unknown";
    const existing = supGrouped.get(supName) || { total: 0, units: 0, products: new Set(), supplierIds: new Set() };
    existing.total += Number(row.total_amount) || 0;
    existing.units += Number(row.quantity) || 0;
    if (row.product_id) existing.products.add(row.product_id);
    if (row.supplier_id) existing.supplierIds.add(row.supplier_id);
    supGrouped.set(supName, existing);
  }

  const grandTotal = Array.from(supGrouped.values()).reduce((s, g) => s + g.total, 0);

  // Category performance
  const catGrouped = new Map<string, { total: number; units: number; prices: number[]; products: Set<string> }>();
  for (const row of salesRows) {
    const catName = row.category?.name || "Uncategorized";
    const existing = catGrouped.get(catName) || { total: 0, units: 0, prices: [], products: new Set() };
    existing.total += Number(row.total_amount) || 0;
    existing.units += Number(row.quantity) || 0;
    if (row.unit_price) existing.prices.push(Number(row.unit_price));
    if (row.product_id) existing.products.add(row.product_id);
    catGrouped.set(catName, existing);
  }

  const categories: CategoryPerf[] = Array.from(catGrouped.entries())
    .map(([name, data]) => ({
      category: name,
      total_sales: data.total,
      total_units: data.units,
      avg_unit_price: data.prices.length > 0 ? data.prices.reduce((a, b) => a + b, 0) / data.prices.length : 0,
      product_count: data.products.size,
    }))
    .sort((a, b) => b.total_sales - a.total_sales);

  // Branch breakdown
  const branchGrouped = new Map<string, { name: string; code: string; total: number; units: number }>();
  for (const row of salesRows) {
    const bName = row.branch?.name || "Unknown";
    const bCode = row.branch?.code || "";
    const key = row.branch_id || bName;
    const existing = branchGrouped.get(key) || { name: bName, code: bCode, total: 0, units: 0 };
    existing.total += Number(row.total_amount) || 0;
    existing.units += Number(row.quantity) || 0;
    branchGrouped.set(key, existing);
  }

  const branches: BranchSales[] = Array.from(branchGrouped.entries())
    .map(([, data]) => ({
      branch_id: data.code || data.name,
      branch_name: data.name,
      branch_code: data.code,
      total_amount: data.total,
      quantity: data.units,
    }))
    .sort((a, b) => b.total_amount - a.total_amount);

  // Top/bottom products
  const prodGrouped = new Map<string, { name: string; code: string; category: string; total: number; qty: number }>();
  for (const row of salesRows) {
    const key = row.product_id || row.product?.stock_code || "unknown";
    const existing = prodGrouped.get(key) || {
      name: row.product?.name || key,
      code: row.product?.stock_code || "",
      category: row.category?.name || "",
      total: 0,
      qty: 0,
    };
    existing.total += Number(row.total_amount) || 0;
    existing.qty += Number(row.quantity) || 0;
    prodGrouped.set(key, existing);
  }

  const allProducts: ProductPerformance[] = Array.from(prodGrouped.values())
    .map((p) => ({
      name: p.name,
      stock_code: p.code,
      category: p.category,
      total_revenue: p.total,
      total_qty: p.qty,
      avg_price: p.qty > 0 ? p.total / p.qty : 0,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue);

  // Pricing
  const pricing: PricingPoint[] = ((pricingRaw || []) as unknown as RawPricingRow[]).map((p) => ({
    product: p.product?.name || "",
    stock_code: p.product?.stock_code || "",
    branch: p.branch?.name || "",
    selling_price: Number(p.selling_price) || 0,
    standard_cost: Number(p.standard_cost) || 0,
    margin_pct: p.standard_cost && p.selling_price
      ? ((Number(p.selling_price) - Number(p.standard_cost)) / Number(p.selling_price)) * 100
      : 0,
  }));

  return { categories, branches, allProducts, pricing, grandTotal };
}

/* ── Share-over-time trend + branch matrix builders ─────────── */

interface SalesTrendPoint {
  period_id: string;
  label: string;
  totalSales: number;
  totalUnits: number;
  clientSales: number;
  clientShare: number;
}

interface BranchMatrixRow {
  branch_id: string;
  branch_name: string;
  branch_code: string;
  suppliers: {
    name: string;
    total_sales: number;
    share: number;
    is_client: boolean;
  }[];
}

/**
 * Build the share-over-time series from the (allowlist-scoped) sales rows.
 * Each shared period becomes one point: total market revenue, the client's
 * own revenue, and the client's share of that period. Uses the same
 * linked-supplier matching as the competitor ranking so the trend cannot
 * attribute another supplier's revenue to the client.
 */
function buildSalesTrend(
  salesRows: RawSalesRow[],
  linkedSupplierId: string | null,
  nameToUuids: Map<string, Set<string>>,
  clientCompany: string,
): SalesTrendPoint[] {
  const byPeriod = new Map<string, SalesTrendPoint>();
  for (const row of salesRows) {
    const pid = row.period_id || "unknown";
    const label = row.period?.label || pid;
    const point = byPeriod.get(pid) || { period_id: pid, label, totalSales: 0, totalUnits: 0, clientSales: 0, clientShare: 0 };
    const amount = Number(row.total_amount) || 0;
    point.totalSales += amount;
    point.totalUnits += Number(row.quantity) || 0;
    if (row.supplier_id) {
      const isClient = linkedSupplierId
        ? nameToUuids.get(row.supplier_id)?.has(linkedSupplierId)
        : row.supplier_id.trim().toLowerCase() === clientCompany;
      if (isClient) point.clientSales += amount;
    }
    byPeriod.set(pid, point);
  }
  return Array.from(byPeriod.values())
    .map((p) => ({ ...p, clientShare: p.totalSales > 0 ? (p.clientSales / p.totalSales) * 100 : 0 }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

/**
 * Branch × supplier matrix within the client's scope: each branch lists its
 * top suppliers (top 6 by revenue) with the supplier's share of that branch,
 * flagging the client itself. Backs the branch-level competitor deep-dive.
 */
function buildBranchMatrix(
  salesRows: RawSalesRow[],
  linkedSupplierId: string | null,
  nameToUuids: Map<string, Set<string>>,
  clientCompany: string,
): BranchMatrixRow[] {
  const byBranch = new Map<string, { name: string; code: string; suppliers: Map<string, number> }>();
  for (const row of salesRows) {
    const bKey = row.branch_id || row.branch?.name || "unknown";
    const entry = byBranch.get(bKey) || { name: row.branch?.name || bKey, code: row.branch?.code || "", suppliers: new Map() };
    const sup = row.supplier_id || "Unknown";
    entry.suppliers.set(sup, (entry.suppliers.get(sup) || 0) + (Number(row.total_amount) || 0));
    byBranch.set(bKey, entry);
  }
  return Array.from(byBranch.entries()).map(([branch_id, entry]) => {
    const branchTotal = Array.from(entry.suppliers.values()).reduce((s, v) => s + v, 0);
    const suppliers = Array.from(entry.suppliers.entries())
      .map(([name, total_sales]) => ({
        name,
        total_sales,
        share: branchTotal > 0 ? (total_sales / branchTotal) * 100 : 0,
        is_client: linkedSupplierId
          ? nameToUuids.get(name)?.has(linkedSupplierId) === true
          : name.trim().toLowerCase() === clientCompany,
      }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, 6);
    return { branch_id, branch_name: entry.name, branch_code: entry.code, suppliers };
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);

    const portal = await requirePortalClient(supabase, currentUser);
    if (portal.response) return portal.response;
    const client = portal.client;

    // Paid market-analytics gate: free tier cannot read market analytics.
    if (!isAnalyticsSubscriptionAllowed(client.subscription_tier)) {
      return subscriptionRequiredResponse();
    }

    const { searchParams } = new URL(request.url);
    const filterPeriodId = searchParams.get("period_id");
    const filterBranchIds = searchParams.get("branch_ids")?.split(",").filter(Boolean);
    const filterCategoryIds = searchParams.get("category_ids")?.split(",").filter(Boolean);

    // Fetch all sharing records for this client
    const sharing = await getSharingRecords(supabase, client.id);

    if (!sharing || sharing.length === 0) {
      return NextResponse.json({
        sharing: [],
        sales: [],
        inventory: [],
        competitors: [],
        categories: [],
        branches: [],
        pricing: [],
        topProducts: [],
        bottomProducts: [],
        dashboardColor: "#0F6E56",
        periods: [],
        allBranches: [],
        summary: { totalSales: 0, totalUnits: 0, totalInventoryValue: 0, totalProducts: 0 },
      });
    }

    // Filter sharing by period if specified
    const filteredSharing = filterPeriodId
      ? sharing.filter((s) => s.period_id === filterPeriodId)
      : sharing;

    const periodIds = [...new Set(filteredSharing.map((s) => s.period_id))];

    // ── Allowlist-derived scope (SECURITY) ──────────────────────────────
    // portal_analytics_sharing rows are the ONLY source of truth for what
    // this client may see. A NULL branch_id/category_id on a row means "ALL
    // branches/categories for that row's period". Resolution is CONSERVATIVE:
    // the effective sets are the union of explicitly-shared values; an empty
    // set means the dimension is unrestricted (NULL row present). Multiple
    // rows are applied as a JOIN (branch set ∩ category set) so the NULL
    // cross-product can never widen a client's view.
    const allowedBranchIds: string[] = [...new Set(filteredSharing.map((s) => s.branch_id).filter((b): b is string => Boolean(b)))];
    const allowedCategoryIds: string[] = [...new Set(filteredSharing.map((s) => s.category_id).filter((c): c is string => Boolean(c)))];

    // client-category scope
    const clientCategoryIds = client.linked_supplier_id ? await getClientProductCategoryIds(getAdminClient(), client.linked_supplier_id) : [];
    const hasClientCategoryScope = clientCategoryIds.length > 0;
    const effectiveCategoryIds = hasClientCategoryScope
      ? (allowedCategoryIds.length === 0 ? clientCategoryIds : clientCategoryIds.filter((c) => allowedCategoryIds.includes(c)))
      : allowedCategoryIds;

    if (hasClientCategoryScope && effectiveCategoryIds.length === 0) {
      const periods = await getPeriodsByIds(supabase, periodIds);
      const allBranches = await getAllBranchesFallback(supabase, allowedBranchIds.length > 0 ? allowedBranchIds : undefined);
      const clientCategories = await getCategoriesByIds(supabase, clientCategoryIds);

      return NextResponse.json({
        sharing: filteredSharing,
        sales: [],
        inventory: [],
        competitors: [],
        categories: [],
        branches: [],
        topProducts: [],
        bottomProducts: [],
        pricing: [],
        dashboardColor: "#0F6E56",
        periods,
        allBranches,
        allCategories: [],
        clientCategories,
        salesTrend: [],
        branchMatrix: [],
        scope: {
          sharedCategoryIds: allowedCategoryIds,
          clientCategoryIds,
          hasClientCategoryScope,
          mismatch: allowedCategoryIds.length > 0 && !allowedCategoryIds.some((c) => clientCategoryIds.includes(c)),
        },
        summary: { totalSales: 0, totalUnits: 0, totalInventoryValue: 0, totalProducts: 0, prevTotalSales: 0, prevTotalUnits: 0 },
      });
    }

    // Intersect any client-requested filters with the allowlist so a client
    // can never read data that was not shared with them.
    const branchIds = filterBranchIds && filterBranchIds.length > 0
      ? (allowedBranchIds.length === 0 ? filterBranchIds : filterBranchIds.filter((b) => allowedBranchIds.includes(b)))
      : allowedBranchIds;
    const categoryIds = filterCategoryIds && filterCategoryIds.length > 0
      ? (effectiveCategoryIds.length === 0 ? filterCategoryIds : filterCategoryIds.filter((c) => effectiveCategoryIds.includes(c)))
      : effectiveCategoryIds;

    // Fetch current period sales
    const allSales = await fetchAllSalesWithJoinsFallback(
      supabase, periodIds,
      branchIds.length > 0 ? branchIds : undefined,
      categoryIds.length > 0 ? categoryIds : undefined,
    );

    // If sales query returned empty (not an error — just no matching data), return empty analytics
    if (!allSales || allSales.length === 0) {
      // Still try to return useful metadata (periods, branches, categories)
      const periods = await getPeriodsByIds(supabase, periodIds);
      const allBranches = await getAllBranchesFallback(supabase, allowedBranchIds.length > 0 ? allowedBranchIds : undefined);
      const clientCategories = await getCategoriesByIds(supabase, clientCategoryIds);

      return NextResponse.json({
        sharing: filteredSharing,
        sales: [],
        inventory: [],
        competitors: [],
        categories: [],
        branches: [],
        topProducts: [],
        bottomProducts: [],
        pricing: [],
        dashboardColor: "#0F6E56",
        periods,
        allBranches,
        allCategories: [],
        clientCategories,
        salesTrend: [],
        branchMatrix: [],
        scope: {
          sharedCategoryIds: allowedCategoryIds,
          clientCategoryIds,
          hasClientCategoryScope,
          mismatch: false,
        },
        summary: { totalSales: 0, totalUnits: 0, totalInventoryValue: 0, totalProducts: 0, prevTotalSales: 0, prevTotalUnits: 0 },
      });
    }

    const sales = allSales;

    // ── Trend data: fetch previous period's sales ──
    let prevTotalSales = 0;
    let prevTotalUnits = 0;
    if (periodIds.length === 1) {
      // The comparison period must come from THIS client's sharing allowlist,
      // never the global latest period across all clients' data.
      const sharedPeriodIds = [...new Set(sharing.map((s) => s.period_id))];
      const allPeriods = await withPgFallback(
        async () => {
          const { data, error } = await supabase
            .from("analytics_periods")
            .select("id")
            .in("id", sharedPeriodIds)
            .not("id", "in", periodIds)
            .order("year", { ascending: false })
            .order("month", { ascending: false })
            .order("quarter", { ascending: false })
            .limit(1);
          if (error) throw error;
          return data ?? [];
        },
        async () => {
          const result = await import("@/lib/db").then((m) =>
            m.query<{ id: string }>(
              `SELECT id FROM analytics_periods WHERE id = ANY($1) AND id != ALL($2) ORDER BY year DESC, month DESC, quarter DESC LIMIT 1`,
              [sharedPeriodIds, periodIds],
            ),
          );
          return result.rows;
        },
        "prevPeriodId",
      );
      if (allPeriods.length > 0) {
        const prevPeriodId = allPeriods[0].id;
        // Apply the same allowlist-derived branch/category scope as the
        // current-period query so the trend comparison cannot leak data
        // the client was not shared.
        const prevSharing = sharing.filter((s) => s.period_id === prevPeriodId);
        const prevBranchIds = [...new Set(prevSharing.map((s) => s.branch_id).filter((b): b is string => Boolean(b)))];
        const prevCategoryIds = hasClientCategoryScope
          ? effectiveCategoryIds
          : [...new Set(prevSharing.map((s) => s.category_id).filter((c): c is string => Boolean(c)))];
        const prevSales = await fetchAllSalesWithJoinsFallback(
          supabase,
          [prevPeriodId],
          prevBranchIds.length > 0 ? prevBranchIds : undefined,
          prevCategoryIds.length > 0 ? prevCategoryIds : undefined,
        );
        const prevRows = (prevSales || []) as unknown as RawSalesRow[];
        prevTotalSales = prevRows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
        prevTotalUnits = prevRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
      }
    }

    // Inventory data
    const inventory = await fetchInventoryFallback(supabase, branchIds.length > 0 ? branchIds : undefined, categoryIds.length > 0 ? categoryIds : undefined, periodIds.length > 0 ? periodIds : undefined);

    // Pricing data
    const pricingRaw = await fetchPricingFallback(supabase, branchIds.length > 0 ? branchIds : undefined, categoryIds.length > 0 ? categoryIds : undefined, periodIds.length > 0 ? periodIds : undefined);

    // Fetch supplier names
    const salesRows = sales as unknown as RawSalesRow[];
    let supplierNameMap = new Map<string, string>();
    {
      const supplierIds = [...new Set(salesRows.map((r) => r.supplier_id).filter(Boolean))] as string[];
      if (supplierIds.length > 0) {
        const supRows = await getSuppliersByIds(supabase, supplierIds);
        supplierNameMap = new Map((supRows ?? []).map((s) => [s.id, s.name]));
      }
    }

    // Map supplier IDs to names in salesRows
    const resolvedSalesRows = salesRows.map((r) => ({
      ...r,
      supplier_id: r.supplier_id ? (supplierNameMap.get(r.supplier_id) || r.supplier_id) : null,
    }));

    const linkedSupplierId = client.linked_supplier_id;
    const { categories, branches, allProducts, pricing, grandTotal } = processSalesIntoVisualizations(
      resolvedSalesRows, linkedSupplierId, client.company, client.name, pricingRaw,
    );

    // Rebuild supplier grouping with resolved names, preserving original supplier UUIDs for is_client matching
    const resolvedSupGrouped = new Map<string, { total: number; units: number; products: Set<string>; supplierIds: Set<string> }>();
    for (const row of resolvedSalesRows) {
      const supName = row.supplier_id || "Unknown";
      const existing = resolvedSupGrouped.get(supName) || { total: 0, units: 0, products: new Set(), supplierIds: new Set() };
      existing.total += Number(row.total_amount) || 0;
      existing.units += Number(row.quantity) || 0;
      if (row.product_id) existing.products.add(row.product_id);
      resolvedSupGrouped.set(supName, existing);
    }

    // Build a reverse map: supplier name → original UUID(s) for linked_supplier_id matching
    const nameToUuids = new Map<string, Set<string>>();
    for (const row of salesRows) {
      if (row.supplier_id) {
        const name = supplierNameMap.get(row.supplier_id) || row.supplier_id;
        if (!nameToUuids.has(name)) nameToUuids.set(name, new Set());
        nameToUuids.get(name)!.add(row.supplier_id);
      }
    }

    const clientCompany = (client.company || client.name || "").trim().toLowerCase();

    const competitors: CompetitorRank[] = Array.from(resolvedSupGrouped.entries())
      .map(([name, data]) => {
        // Determine is_client: try linked_supplier_id UUID match first, then fallback to name match
        let isClient = false;
        if (linkedSupplierId) {
          const uuids = nameToUuids.get(name);
          if (uuids && uuids.has(linkedSupplierId)) {
            isClient = true;
          }
        }
        // Fallback: name-based match
        if (!isClient) {
          isClient = name.trim().toLowerCase() === clientCompany;
        }
        return {
          manufacturer: name,
          total_sales: data.total,
          total_units: data.units,
          share: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
          is_client: isClient,
          rank: 0,
        };
      })
      .sort((a, b) => b.total_sales - a.total_sales)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    const topProducts = allProducts.slice(0, 5);
    const bottomProducts = allProducts.slice(-5).reverse();

    // Dashboard color
    const dashboardColor = await withPgFallback(
      async () => {
        const { data } = await supabase
          .from("clients")
          .select("dashboard_color")
          .eq("id", client.id)
          .single();
        return (data as { dashboard_color?: string } | null)?.dashboard_color || "#0F6E56";
      },
      () => getClientColorPg(client.id).then((c) => c || "#0F6E56"),
      "getClientColor",
    );

    // Fetch filter options (all periods, all branches)
    const allSharing = await getSharingRecords(supabase, client.id);
    const allPeriodIds = [...new Set((allSharing || []).map((s) => s.period_id))];
    const allBranchIds = [...new Set((allSharing || []).map((s) => s.branch_id).filter(Boolean))] as string[];

    // Periods
    const periods = await getPeriodsByIds(supabase, allPeriodIds);

    // Branches (scoped to the client's sharing allowlist; NULL = all)
    const allBranches = await getAllBranchesFallback(supabase, allBranchIds.length > 0 ? allBranchIds : undefined);

    // Categories — real category UUIDs derived from the client's scoped sales
    // rows (not synthetic indexes, which made category filtering send bogus ids).
    const catMap = new Map<string, string>();
    for (const r of salesRows) {
      if (r.category_id && r.category?.name) catMap.set(r.category_id, r.category.name);
    }
    const allCategories = Array.from(catMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Client-owned categories (resolved from linked_supplier_id → products).
    const clientCategories = clientCategoryIds.length > 0 ? await getCategoriesByIds(supabase, clientCategoryIds) : [];

    // Share-over-time + branch matrix from the scoped sales rows.
    const salesTrend = buildSalesTrend(resolvedSalesRows, linkedSupplierId, nameToUuids, clientCompany);
    const branchMatrix = buildBranchMatrix(resolvedSalesRows, linkedSupplierId, nameToUuids, clientCompany);

    // Scope marker — lets the UI distinguish "shared but not your category"
    // (allowlist has categories the client doesn't sell) from no data at all.
    const scope = {
      sharedCategoryIds: allowedCategoryIds,
      clientCategoryIds,
      hasClientCategoryScope,
      mismatch:
        allowedCategoryIds.length > 0 && clientCategoryIds.length > 0
          ? allowedCategoryIds.some((c) => !clientCategoryIds.includes(c))
          : false,
    };

    return NextResponse.json({
      sharing: filteredSharing,
      sales: resolvedSalesRows,
      inventory: inventory || [],
      competitors,
      categories,
      branches,
      topProducts,
      bottomProducts,
      pricing,
      dashboardColor,
      periods,
      allBranches,
      allCategories,
      clientCategories,
      salesTrend,
      branchMatrix,
      scope,
      summary: {
        totalSales: grandTotal,
        totalUnits: Array.from(resolvedSupGrouped.values()).reduce((s, g) => s + g.units, 0),
        totalInventoryValue: ((inventory || []) as unknown as RawInvRow[]).reduce((s, i) => s + (Number(i.stock_value) || 0), 0),
        totalProducts: allProducts.length,
        prevTotalSales,
        prevTotalUnits,
      },
    });
  } catch (err) {
    console.error("[portal/analytics] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
