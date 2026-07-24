import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import {
  getSharingRecords,
  fetchAllSalesWithJoinsFallback,
  fetchInventoryFallback,
  fetchPricingFallback,
  getSuppliersByIds,
  getClientColorPg,
  withPgFallback,
  getAllBranchesPg,
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

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
    const branchIds = filterBranchIds && filterBranchIds.length > 0
      ? filterBranchIds
      : [...new Set(filteredSharing.map((s) => s.branch_id).filter(Boolean))] as string[];
    const categoryIds = filterCategoryIds && filterCategoryIds.length > 0
      ? filterCategoryIds
      : [...new Set(filteredSharing.map((s) => s.category_id).filter(Boolean))] as string[];

    // Fetch current period sales
    const allSales = await fetchAllSalesWithJoinsFallback(
      supabase, periodIds,
      branchIds.length > 0 ? branchIds : undefined,
      categoryIds.length > 0 ? categoryIds : undefined,
    );
    const sales = allSales.length > 0 ? allSales : null;

    // ── Trend data: fetch previous period's sales ──
    let prevTotalSales = 0;
    let prevTotalUnits = 0;
    if (periodIds.length === 1) {
      // Find a period that comes before the current one
      const { rows: allPeriods } = await import("@/lib/db").then((m) =>
        m.query<{ id: string }>(
          `SELECT id FROM analytics_periods WHERE id != ALL($1) ORDER BY year DESC, month DESC, quarter DESC LIMIT 1`,
          [periodIds],
        ),
      );
      if (allPeriods.length > 0) {
        const prevPeriodId = allPeriods[0].id;
        const prevSales = await fetchAllSalesWithJoinsFallback(supabase, [prevPeriodId]);
        const prevRows = (prevSales || []) as unknown as RawSalesRow[];
        prevTotalSales = prevRows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
        prevTotalUnits = prevRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
      }
    }

    // Inventory data
    const inventory = await fetchInventoryFallback(supabase, branchIds.length > 0 ? branchIds : undefined);

    // Pricing data
    const pricingRaw = await fetchPricingFallback(supabase, branchIds.length > 0 ? branchIds : undefined);

    // Fetch supplier names
    let supplierNameMap = new Map<string, string>();
    if (sales) {
      const salesRows = sales as unknown as RawSalesRow[];
      const supplierIds = [...new Set(salesRows.map((r) => r.supplier_id).filter(Boolean))] as string[];
      if (supplierIds.length > 0) {
        const supRows = await getSuppliersByIds(supabase, supplierIds);
        supplierNameMap = new Map((supRows ?? []).map((s) => [s.id, s.name]));
      }
    }

    if (!sales) {
      return NextResponse.json({
        error: "Sales query failed",
        sharing,
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
        summary: { totalSales: 0, totalUnits: 0, totalInventoryValue: 0, totalProducts: 0, prevTotalSales: 0, prevTotalUnits: 0 },
      });
    }

    const salesRows = (sales || []) as unknown as RawSalesRow[];

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
    let periods: { id: string; label: string }[] = [];
    if (allPeriodIds.length > 0) {
      const { rows: periodRows } = await import("@/lib/db").then((m) =>
        m.query<{ id: string; label: string }>(
          `SELECT id, label FROM analytics_periods WHERE id = ANY($1) ORDER BY year DESC, month DESC, quarter DESC`,
          [allPeriodIds],
        ),
      );
      periods = periodRows;
    }

    // Branches
    let allBranches: { id: string; name: string }[] = [];
    if (allBranchIds.length > 0) {
      allBranches = await getAllBranchesPg();
    }

    // Categories
    const uniqueCats = [...new Set(salesRows.map((r) => r.category?.name).filter(Boolean))];
    const allCategories = uniqueCats.map((name, i) => ({ id: String(i), name: name! }));

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
