import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { REPORT_CATEGORIES } from "@/lib/report-types";
import type { ChartType } from "@/lib/report-types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, subtype, category, sub_category, branch, period_start, period_end, compare_start, compare_end } = body;

    // Subtype dispatch (new 34-report-type system)
    if (subtype) {
      const result = await queryBySubtype(supabase, body);
      return NextResponse.json(result);
    }

    if (!type) {
      return NextResponse.json(
        { error: "type is required" },
        { status: 400 },
      );
    }

    const mainPeriods = await findPeriods(supabase, period_start, period_end);
    const comparePeriods = compare_start && compare_end
      ? await findPeriods(supabase, compare_start, compare_end)
      : [];

    switch (type) {
      case "market_share":
        return NextResponse.json(
          await queryMarketShare(supabase, mainPeriods, comparePeriods, category, sub_category, branch),
        );
      case "category_performance":
        return NextResponse.json(
          await queryCategoryPerformance(supabase, mainPeriods, comparePeriods, category, sub_category, branch),
        );
      case "competitor_comparison":
        return NextResponse.json(
          await queryCompetitorComparison(supabase, mainPeriods, category, sub_category, branch),
        );
      case "inventory_summary":
        return NextResponse.json(
          await queryInventorySummary(supabase, category, sub_category, branch),
        );
      case "pricing_analysis":
        return NextResponse.json(
          await queryPricingAnalysis(supabase, mainPeriods, category, sub_category, branch),
        );
      case "stock_movements":
        return NextResponse.json(
          await queryStockMovements(supabase, category, sub_category, branch),
        );
      case "supplier_performance":
        return NextResponse.json(
          await querySupplierPerformance(supabase, category, sub_category, branch),
        );
      case "custom_query":
        return NextResponse.json(
          await executeCustomQuery(supabase, body),
        );
      default:
        return NextResponse.json(
          { error: `Unknown query type: ${type}` },
          { status: 400 },
        );
    }
  } catch (err) {
      console.error("analytics/query failed:", err);
      return NextResponse.json(
        { error: "Failed to execute query" },
        { status: 500 },
      );
    }
}

const subtypeTypeMap: Record<string, string> = {
  market_share: "market_share",
  category_perf: "category_performance",
  competitor: "competitor_comparison",
  inventory: "inventory_summary",
  pricing: "pricing_analysis",
  stock: "stock_movements",
  supplier: "supplier_performance",
};

const subtypeChartMap: Record<string, ChartType> = {
  cat_market_share_donut: "doughnut",
  supplier_dominance: "bar_h",
  sku_share_breakdown: "bar_h",
  share_trend_mom: "line_multi",
  competitive_share_shift: "bar_div",
  cat_revenue_leaderboard: "bar_h",
  cat_growth_matrix: "heatmap",
  subcategory_drilldown: "bar",
  top_skus_per_category: "table_bar",
  cat_volume_vs_revenue: "scatter",
  cat_seasonality: "line_multi",
  h2h_supplier: "bar_grouped",
  price_gap: "bar_div",
  competitive_displacement: "area_stack",
  similar_product_matrix: "table",
  competitor_volume_ratio: "radar",
  supply_demand_gap: "bar_div",
  stock_shortage_alerts: "table_flag",
  overstock_risk: "table_flag",
  inventory_health_gauge: "bar_h",
  reorder_recommendations: "table",
  price_distribution: "bar_h",
  margin_heatmap: "heatmap",
  price_vs_volume: "scatter",
  price_change_tracker: "line",
  economy_vs_premium: "doughnut",
  product_velocity: "bar_h",
  trend_direction: "table_trend",
  weekly_movement: "line",
  movement_by_branch_heatmap: "heatmap",
  supplier_scorecard: "radar",
  supplier_revenue_timeline: "line",
  supplier_portfolio: "bar_h",
  top_suppliers_by_branch: "bar_grouped",
};

async function queryBySubtype(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  body: Record<string, unknown>,
): Promise<{ data: Record<string, unknown>[]; chart_type: ChartType | null; error?: string }> {
  const { subtype, category, sub_category, branch, period_start, period_end } = body as Record<string, any>;
  if (!subtype) return { data: [], chart_type: null, error: "subtype required" };

  // Lookup subtype across all categories to find which category it belongs to
  const cat = REPORT_CATEGORIES.find((c) =>
    c.subtypes.some((s) => s.id === subtype),
  );
  if (!cat) return { data: [], chart_type: null, error: `Unknown subtype: ${subtype}` };

  const oldType = subtypeTypeMap[cat.id];
  if (!oldType) return { data: [], chart_type: null, error: `No old-type mapping for category: ${cat.id}` };

  const chartType = subtypeChartMap[subtype] ?? "table";

  try {
    const mainPeriods = await findPeriods(supabase, period_start, period_end);
    const raw = await executeOldType(supabase, oldType, mainPeriods, category, sub_category, branch);
    return { data: flattenForSubtype(raw), chart_type: chartType };
  } catch (e: any) {
    return { data: [], chart_type: null, error: e?.message ?? "Query failed" };
  }
}

async function executeOldType(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  type: string,
  periods: { id: string; label: string; start_date: string; end_date: string }[],
  category?: string,
  sub_category?: string,
  branch?: string,
): Promise<any> {
  switch (type) {
    case "market_share":
      return queryMarketShare(supabase, periods, [], category, sub_category, branch);
    case "category_performance":
      return queryCategoryPerformance(supabase, periods, [], category, sub_category, branch);
    case "competitor_comparison":
      return queryCompetitorComparison(supabase, periods, category, sub_category, branch);
    case "inventory_summary":
      return queryInventorySummary(supabase, category, sub_category, branch);
    case "pricing_analysis":
      return queryPricingAnalysis(supabase, periods, category, sub_category, branch);
    case "stock_movements":
      return queryStockMovements(supabase, periods, category, sub_category, branch);
    case "supplier_performance":
      return querySupplierPerformance(supabase, periods, category, sub_category, branch);
    default:
      return {};
  }
}

function flattenForSubtype(raw: any): Record<string, unknown>[] {
  // Extract the first array property from the response
  const arr = Object.values(raw).find((v: any) => Array.isArray(v) && v.length > 0) as Record<string, unknown>[] ?? [];
  if (arr.length > 0) return arr;

  // Fallback: look for nested arrays
  for (const val of Object.values(raw)) {
    if (typeof val === "object" && val !== null) {
      const nested = Object.values(val).find((v: any) => Array.isArray(v) && v.length > 0);
      if (nested) return nested as Record<string, unknown>[];
    }
  }
  return [];
}

async function findPeriods(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  start?: string,
  end?: string,
) {
  let query = supabase.from("analytics_periods").select("id, label, start_date, end_date");
  if (start) query = query.gte("end_date", start);
  if (end) query = query.lte("start_date", end);
  const { data } = await query;
  return data ?? [];
}

async function resolveCategoryFilters(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  category?: string,
  sub_category?: string,
): Promise<{ productIds: string[] | null; categoryIds: string[] | null; subCategoryFilter: string | null }> {
  if (!category && !sub_category) return { productIds: null, categoryIds: null, subCategoryFilter: null };

  let categoryId: string | null = null;
  let subCategoryId: string | null = null;

  if (category) {
    const { data: catRows } = await supabase
      .from("analytics_categories")
      .select("id")
      .ilike("name", `%${category}%`);
    if (catRows && catRows.length > 0) {
      categoryId = catRows[0].id;
    }
  }

  if (sub_category) {
    let subQuery = supabase
      .from("analytics_subcategories")
      .select("id, category_id")
      .ilike("name", `%${sub_category}%`);
    if (categoryId) subQuery = subQuery.eq("category_id", categoryId);
    const { data: subRows } = await subQuery;
    if (subRows && subRows.length > 0) {
      subCategoryId = subRows[0].id;
      if (!categoryId) categoryId = subRows[0].category_id;
    }
  }

  // Get product IDs matching the resolved filters
  let prodQuery = supabase.from("analytics_products").select("id");
  if (subCategoryId) {
    prodQuery = prodQuery.eq("sub_category_id", subCategoryId);
  } else if (categoryId) {
    prodQuery = prodQuery.eq("category_id", categoryId);
  }
  const { data: prods } = await prodQuery;
  const productIds = prods && prods.length > 0 ? prods.map(p => p.id) : [];
  
  return {
    productIds: productIds.length > 0 ? productIds : null,
    categoryIds: categoryId ? [categoryId] : null,
    subCategoryFilter: subCategoryId,
  };
}

async function queryMarketShare(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  mainPeriods: { id: string; label: string; start_date: string; end_date: string }[],
  comparePeriods: { id: string; label: string; start_date: string; end_date: string }[],
  category?: string,
  sub_category?: string,
  branch?: string,
) {
  const periodIds = mainPeriods.map((p) => p.id);
  const compareIds = comparePeriods.map((p) => p.id);

  const mainSales = await getSalesByBranch(supabase, periodIds, category, sub_category, branch);
  const prevSales = compareIds.length > 0
    ? await getSalesByBranch(supabase, compareIds, category, sub_category, branch)
    : [];

  const { data: branches } = await supabase
    .from("analytics_branches")
    .select("id, name, code");

  const branchMap = new Map((branches ?? []).map((b) => [b.id, { name: b.name, code: b.code }]));

  const totalSales = mainSales.reduce((sum, r) => sum + ((r.total_amount as number) ?? 0), 0);
  const totalPrevSales = prevSales.reduce((sum, r) => sum + ((r.total_amount as number) ?? 0), 0);

  const prevMap = new Map(prevSales.map((r) => [r.branch_id, (r.total_amount as number) ?? 0]));

    // Include branches that had sales in compare period but not main period
    const allBranchIds = new Set([
      ...mainSales.map((r) => r.branch_id),
      ...prevSales.map((r) => r.branch_id),
    ]);

    const branches_data = Array.from(allBranchIds)
      .map((branchId) => {
        const info = branchMap.get(branchId as string) ?? { name: "Unknown", code: "???" };
        const mainSale = mainSales.find((r) => r.branch_id === branchId);
        const sales = (mainSale?.total_amount as number) ?? 0;
        return {
          branch: info.name,
          branch_code: info.code,
          sales,
          prev_sales: prevMap.get(branchId as string) ?? 0,
          share: totalSales > 0 ? (sales / totalSales) * 100 : 0,
          rank: 0,
        };
      })
      .sort((a: { sales: number }, b: { sales: number }) => b.sales - a.sales)
      .map((r, i) => ({ ...r, rank: i + 1 }));

  return {
    branches: branches_data,
    total_sales: totalSales,
    total_prev_sales: totalPrevSales,
    period: {
      label: mainPeriods.map((p) => p.label).join(", ") || "All time",
      start: mainPeriods[0]?.start_date ?? "",
      end: mainPeriods[mainPeriods.length - 1]?.end_date ?? "",
    },
    compare_period: comparePeriods.length > 0
      ? {
          label: comparePeriods.map((p) => p.label).join(", "),
          start: comparePeriods[0]?.start_date ?? "",
          end: comparePeriods[comparePeriods.length - 1]?.end_date ?? "",
        }
      : null,
    category: category || "All categories",
  };
}

async function getSalesByBranch(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  periodIds: string[],
  category?: string,
  sub_category?: string,
  branch?: string,
) {
  const filters = await resolveCategoryFilters(supabase, category, sub_category);

  let query = supabase
    .from("analytics_fact_sales")
    .select("branch_id, total_amount, product_id")
    .in("period_id", periodIds);

  if (branch) query = query.eq("branch_id", branch);
  if (filters.productIds) {
    query = query.in("product_id", filters.productIds);
  }

  const { data: salesRows } = await query;

  if (!salesRows || salesRows.length === 0) return [];

  const filteredRows = salesRows;

  const grouped = new Map<string, number>();
  for (const row of filteredRows) {
    const bid = row.branch_id as string;
    grouped.set(bid, (grouped.get(bid) ?? 0) + ((row.total_amount as number) ?? 0));
  }

  return Array.from(grouped.entries()).map(([branch_id, total_amount]) => ({
    branch_id,
    total_amount,
  }));
}

async function queryCategoryPerformance(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  mainPeriods: { id: string }[],
  comparePeriods: { id: string }[],
  category?: string,
  sub_category?: string,
  branch?: string,
) {
  const periodIds = mainPeriods.map((p) => p.id);
  const compareIds = comparePeriods.map((p) => p.id);

  const filters = await resolveCategoryFilters(supabase, category, sub_category);

  const salesQuery = supabase
        .from("analytics_fact_sales")
        .select("category_id, product_id, total_amount, quantity, unit_price")
        .in("period_id", periodIds);

  let finalSalesQuery = salesQuery;
  if (branch) {
    finalSalesQuery = finalSalesQuery.eq("branch_id", branch);
  }
  if (filters.productIds) {
    finalSalesQuery = finalSalesQuery.in("product_id", filters.productIds);
  }

  const { data: sales } = await finalSalesQuery;

  let compareSales: { category_id: string | null; total_amount: number | null }[] = [];
  if (compareIds.length > 0) {
    let cmpQuery = supabase
      .from("analytics_fact_sales")
      .select("category_id, total_amount")
      .in("period_id", compareIds);
    if (branch) {
      cmpQuery = cmpQuery.eq("branch_id", branch);
    }
    if (filters.productIds) {
      cmpQuery = cmpQuery.in("product_id", filters.productIds);
    }
    const { data } = await cmpQuery;
    compareSales = data ?? [];
  }

  const grouped = new Map<string, { total: number; units: number; prices: number[]; products: Set<string> }>();
    for (const row of sales ?? []) {
      const catId = row.category_id as string ?? "unknown";
      const existing = grouped.get(catId) ?? { total: 0, units: 0, prices: [], products: new Set() };
      existing.total += (row.total_amount as number) ?? 0;
      existing.units += (row.quantity as number) ?? 0;
      if (row.unit_price) existing.prices.push(row.unit_price as number);
      if (row.product_id) existing.products.add(row.product_id as string);
      grouped.set(catId, existing);
    }

  const prevGrouped = new Map<string, number>();
    for (const row of compareSales) {
      const catId = row.category_id as string ?? "unknown";
      prevGrouped.set(catId, (prevGrouped.get(catId) ?? 0) + ((row.total_amount as number) ?? 0));
    }

    // Include categories from compare period that may not be in main period
    const allCatIds = new Set([
      ...grouped.keys(),
      ...prevGrouped.keys(),
    ]);

    const catIds = Array.from(allCatIds);
    const { data: cats } = await supabase
      .from("analytics_categories")
      .select("id, name")
      .in("id", catIds);

    const catMap = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]));

    const categories = Array.from(allCatIds)
      .map((catId) => {
        const data = grouped.get(catId);
        const total = data?.total ?? 0;
        const units = data?.units ?? 0;
        const prices = data?.prices ?? [];
        const products = data?.products ?? new Set();
        return {
          category: catMap.get(catId) ?? "Unknown",
          total_sales: total,
          total_units: units,
          avg_unit_price: prices.length > 0
            ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length
            : 0,
          product_count: products.size,
          prev_total_sales: prevGrouped.get(catId) ?? 0,
        };
      })

  return { categories };
}

async function queryCompetitorComparison(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  mainPeriods: { id: string }[],
  category?: string,
  sub_category?: string,
  branch?: string,
) {
  const periodIds = mainPeriods.map((p) => p.id);

  let salesQuery = supabase
      .from("analytics_fact_sales")
      .select("product_id, total_amount, quantity, unit_price, supplier_id")
      .in("period_id", periodIds);
  if (branch) {
    salesQuery = salesQuery.eq("branch_id", branch);
  }

  const { data: sales } = await salesQuery;
  if (!sales || sales.length === 0) return { manufacturers: [] };

  const productIds = [...new Set(sales.map((r) => r.product_id as string))];
  const { data: products } = await supabase
    .from("analytics_products")
    .select("id, category_id")
    .in("id", productIds);

  const filters = await resolveCategoryFilters(supabase, category, sub_category);
  let filteredProducts = products ?? [];
  if (filters.productIds) {
    filteredProducts = filteredProducts.filter((p) => filters.productIds!.includes(p.id));
  }

  const productMap = new Map(filteredProducts.map((p) => [p.id as string, p]));
  const filteredSales = sales.filter((r) => productMap.has(r.product_id as string));

  // Option B: group by supplier_id directly from fact_sales (set via the supplier_products junction at ingest)
  const supIds = [...new Set(filteredSales.map((r) => r.supplier_id as string).filter(Boolean))] as string[];
  let supMap = new Map<string, string>();
  if (supIds.length > 0) {
    const { data: supRows } = await supabase
      .from("analytics_suppliers")
      .select("id, name")
      .in("id", supIds);
    supMap = new Map((supRows ?? []).map((s) => [s.id as string, s.name as string]));
  }

  const grouped = new Map<string, { total: number; units: number; prices: number[]; products: Set<string> }>();
  for (const row of filteredSales) {
    const supId = (row.supplier_id as string) ?? "unknown";
    const existing = grouped.get(supId) ?? { total: 0, units: 0, prices: [], products: new Set() };
    existing.total += (row.total_amount as number) ?? 0;
    existing.units += (row.quantity as number) ?? 0;
    if (row.unit_price) existing.prices.push(row.unit_price as number);
    existing.products.add(row.product_id as string);
    grouped.set(supId, existing);
  }

  const grandTotal = Array.from(grouped.values()).reduce((sum, g) => sum + g.total, 0);

  const manufacturers = Array.from(grouped.entries())
    .map(([supId, data]) => ({
      manufacturer: supMap.get(supId) ?? "Unknown",
      total_sales: data.total,
      total_units: data.units,
      share: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      product_count: data.products.size,
      avg_unit_price: data.prices.length > 0
        ? data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length
        : 0,
    }))
    .sort((a: { total_sales: number }, b: { total_sales: number }) => b.total_sales - a.total_sales);

  return { manufacturers };
}

// ── Inventory Summary ──────────────────────────────────────────
async function queryInventorySummary(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  category?: string,
  sub_category?: string,
  branch?: string,
) {
  let query = supabase
    .from("analytics_fact_inventory")
    .select("product_id, branch_id, quantity_on_hand, unit_cost, total_value, snapshot_date")
    .order("snapshot_date", { ascending: false });

  if (branch) query = query.eq("branch_id", branch);

  const { data: invRows } = await query;
  if (!invRows || invRows.length === 0) return { items: [], totals: { total_value: 0, total_units: 0, product_count: 0 } };

  // Get latest snapshot per product PER BRANCH (composite key)
  const latestByKey = new Map<string, typeof invRows[0]>();
  for (const row of invRows) {
    const key = `${row.product_id}::${row.branch_id}`;
    if (!latestByKey.has(key)) latestByKey.set(key, row);
  }

  const productIds = [...new Set([...latestByKey.values()].map((r) => r.product_id as string))];
  const { data: products } = await supabase
    .from("analytics_products")
    .select("id, stock_code, name, category_id, sub_category")
    .in("id", productIds);

  const filters = await resolveCategoryFilters(supabase, category, sub_category);
  let filteredProducts = products ?? [];
  if (filters.productIds) {
    filteredProducts = filteredProducts.filter((p) => filters.productIds!.includes(p.id));
  }

  const catIds = [...new Set(filteredProducts.map((p) => p.category_id as string).filter(Boolean))];
  const { data: cats } = catIds.length > 0
    ? await supabase.from("analytics_categories").select("id, name").in("id", catIds)
    : { data: [] };
  const catMap = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]));

  // Branch names for display
  const branchIds = [...new Set([...latestByKey.values()].map((r) => r.branch_id as string))];
  const { data: branches } = branchIds.length > 0
    ? await supabase.from("analytics_branches").select("id, name, code").in("id", branchIds)
    : { data: [] };
  const branchMap = new Map((branches ?? []).map((b) => [b.id as string, { name: b.name, code: b.code }]));

  const items = filteredProducts
    .flatMap((prod) => {
      // Find all branch snapshots for this product
      const productRows = [...latestByKey.values()].filter((r) => r.product_id === prod.id);
      return productRows.map((inv) => ({
        product: prod.name,
        stock_code: prod.stock_code,
        category: catMap.get(prod.category_id as string) ?? "Unknown",
        sub_category: prod.sub_category || "",
        branch: branchMap.get(inv.branch_id as string)?.name ?? "Unknown",
        branch_code: branchMap.get(inv.branch_id as string)?.code ?? "??",
        quantity_on_hand: inv.quantity_on_hand,
        unit_cost: inv.unit_cost,
        total_value: inv.total_value,
        last_updated: inv.snapshot_date,
      }));
    })
    .filter(Boolean);

  const totals = {
    total_value: items.reduce((s, i) => s + ((i?.total_value as number) ?? 0), 0),
    total_units: items.reduce((s, i) => s + ((i?.quantity_on_hand as number) ?? 0), 0),
    product_count: new Set(items.map((i) => i?.product)).size,
  };

  return { items, totals };
}

// ── Pricing Analysis ──────────────────────────────────────────
async function queryPricingAnalysis(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  mainPeriods: { id: string }[],
  category?: string,
  sub_category?: string,
  branch?: string,
) {
  const periodIds = mainPeriods.map((p) => p.id);

  let query = supabase
    .from("analytics_fact_pricing")
    .select("product_id, branch_id, standard_cost, selling_price, unit_cost, unit_price, effective_date, tier, discount_pct")
    .order("effective_date", { ascending: false });

  if (branch) query = query.eq("branch_id", branch);
  if (periodIds.length > 0) query = query.in("period_id", periodIds);

  const { data: pricingRows } = await query;
  if (!pricingRows || pricingRows.length === 0) return { items: [], summary: {} };

  const productIds = [...new Set(pricingRows.map((r) => r.product_id as string))];
  const { data: products } = await supabase
    .from("analytics_products")
    .select("id, stock_code, name, category_id")
    .in("id", productIds);

  const filters = await resolveCategoryFilters(supabase, category, sub_category);
  let filteredProducts = products ?? [];
  if (filters.productIds) {
    filteredProducts = filteredProducts.filter((p) => filters.productIds!.includes(p.id));
  }

  const prodMap = new Map(filteredProducts.map((p) => [p.id as string, p]));
  const catIds = [...new Set(filteredProducts.map((p) => p.category_id as string).filter(Boolean))];
  const { data: cats } = catIds.length > 0
    ? await supabase.from("analytics_categories").select("id, name").in("id", catIds)
    : { data: [] };
  const catMap = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]));

  const items = pricingRows
    .filter((r) => prodMap.has(r.product_id as string))
    .map((r) => {
      const prod = prodMap.get(r.product_id as string)!;
      const cost = (r.standard_cost as number) ?? (r.unit_cost as number) ?? 0;
      const price = (r.selling_price as number) ?? (r.unit_price as number) ?? 0;
      const margin = cost > 0 && price > 0 ? ((price - cost) / price) * 100 : 0;
      return {
        product: prod.name,
        stock_code: prod.stock_code,
        category: catMap.get(prod.category_id as string) ?? "Unknown",
        standard_cost: cost,
        selling_price: price,
        margin_pct: Math.round(margin * 100) / 100,
        tier: r.tier,
        discount_pct: r.discount_pct,
        effective_date: r.effective_date,
      };
    });

  const avgMargin = items.length > 0
    ? items.reduce((s, i) => s + i.margin_pct, 0) / items.length
    : 0;

  return {
    items,
    summary: {
      total_products: items.length,
      avg_margin: Math.round(avgMargin * 100) / 100,
      avg_cost: items.length > 0 ? items.reduce((s, i) => s + i.standard_cost, 0) / items.length : 0,
      avg_price: items.length > 0 ? items.reduce((s, i) => s + i.selling_price, 0) / items.length : 0,
    },
  };
}

// ── Stock Movements ───────────────────────────────────────────
async function queryStockMovements(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  mainPeriods: { id: string; start_date: string; end_date: string }[],
  category?: string,
  sub_category?: string,
  branch?: string,
) {
  const startDate = mainPeriods.length > 0 ? mainPeriods.reduce((earliest, p) => p.start_date < earliest ? p.start_date : earliest, mainPeriods[0].start_date) : undefined;
  const endDate = mainPeriods.length > 0 ? mainPeriods.reduce((latest, p) => p.end_date > latest ? p.end_date : latest, mainPeriods[0].end_date) : undefined;

  let query = supabase
    .from("analytics_fact_stock_movements")
    .select("id, movement_date, product_id, branch_id, supplier_id, movement_type, quantity, unit_cost, total_cost, reference_number, batch_number")
    .order("movement_date", { ascending: false })
    .limit(500);

  if (branch) query = query.eq("branch_id", branch);
  if (startDate) query = query.gte("movement_date", startDate);
  if (endDate) query = query.lte("movement_date", endDate);

  const { data: movements } = await query;
  if (!movements || movements.length === 0) return { movements: [], summary: {} };

  const productIds = [...new Set(movements.map((m) => m.product_id as string))];
  const { data: products } = await supabase
    .from("analytics_products")
    .select("id, stock_code, name, category_id")
    .in("id", productIds);

  const filters = await resolveCategoryFilters(supabase, category, sub_category);
  let filteredProducts = products ?? [];
  if (filters.productIds) {
    filteredProducts = filteredProducts.filter((p) => filters.productIds!.includes(p.id));
  }

  const prodMap = new Map(filteredProducts.map((p) => [p.id as string, p]));
  const supplierIds = [...new Set(movements.map((m) => m.supplier_id as string).filter(Boolean))];
  const { data: suppliers } = supplierIds.length > 0
    ? await supabase.from("analytics_suppliers").select("id, name").in("id", supplierIds)
    : { data: [] };
  const supMap = new Map((suppliers ?? []).map((s) => [s.id as string, s.name as string]));

  const enriched = movements
    .filter((m) => prodMap.has(m.product_id as string))
    .map((m) => {
      const prod = prodMap.get(m.product_id as string)!;
      return {
        date: m.movement_date,
        product: prod.name,
        stock_code: prod.stock_code,
        supplier: supMap.get(m.supplier_id as string) || "—",
        type: m.movement_type,
        quantity: m.quantity,
        unit_cost: m.unit_cost,
        total_cost: m.total_cost,
        reference: m.reference_number,
        batch: m.batch_number,
      };
    });

  // Summary by movement type
  const byType = new Map<string, { count: number; quantity: number; cost: number }>();
  for (const m of enriched) {
    const existing = byType.get(m.type) ?? { count: 0, quantity: 0, cost: 0 };
    existing.count += 1;
    existing.quantity += (m.quantity as number) ?? 0;
    existing.cost += (m.total_cost as number) ?? 0;
    byType.set(m.type, existing);
  }

  return {
    movements: enriched,
    summary: {
      total_movements: enriched.length,
      by_type: Object.fromEntries(byType),
    },
  };
}

// ── Supplier Performance ───────────────────────────────────────
async function querySupplierPerformance(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  mainPeriods: { id: string; start_date: string; end_date: string }[],
  category?: string,
  sub_category?: string,
  branch?: string,
) {
  const periodIds = mainPeriods.map((p) => p.id);
  const startDate = mainPeriods.length > 0 ? mainPeriods.reduce((earliest, p) => p.start_date < earliest ? p.start_date : earliest, mainPeriods[0].start_date) : undefined;
  const endDate = mainPeriods.length > 0 ? mainPeriods.reduce((latest, p) => p.end_date > latest ? p.end_date : latest, mainPeriods[0].end_date) : undefined;

  const filters = await resolveCategoryFilters(supabase, category, sub_category);

  // Get suppliers with their product counts and sales
  const { data: suppliers } = await supabase
    .from("analytics_suppliers")
    .select("id, name, code, payment_terms, lead_time_days, active")
    .eq("active", true)
    .order("name");

  if (!suppliers || suppliers.length === 0) return { suppliers: [] };

  const supIds = suppliers.map((s) => s.id as string);

  // Get pricing data per supplier (to count products and compute avg cost)
  let pricingQuery = supabase
    .from("analytics_fact_pricing")
    .select("supplier_id, product_id, unit_cost, selling_price")
    .in("supplier_id", supIds);
  if (filters.productIds) {
    pricingQuery = pricingQuery.in("product_id", filters.productIds);
  }
  if (periodIds.length > 0) {
    pricingQuery = pricingQuery.in("period_id", periodIds);
  }
  const { data: pricingRows } = await pricingQuery;

  // Get stock movements per supplier
  let movementsQuery = supabase
    .from("analytics_fact_stock_movements")
    .select("supplier_id, movement_type, quantity, total_cost, product_id, branch_id")
    .in("supplier_id", supIds);
  if (filters.productIds) {
    movementsQuery = movementsQuery.in("product_id", filters.productIds);
  }
  if (branch) {
    movementsQuery = movementsQuery.eq("branch_id", branch);
  }
  if (startDate) movementsQuery = movementsQuery.gte("movement_date", startDate);
  if (endDate) movementsQuery = movementsQuery.lte("movement_date", endDate);
  const { data: movements } = await movementsQuery;

  const supData = suppliers.map((sup) => {
    const sid = sup.id as string;
    const pricing = (pricingRows ?? []).filter((r) => r.supplier_id === sid);
    const mvs = (movements ?? []).filter((m) => m.supplier_id === sid);
    const productIds = [...new Set(pricing.map((p) => p.product_id as string))];
    const avgCost = pricing.length > 0
      ? pricing.reduce((s, p) => s + ((p.unit_cost as number) ?? 0), 0) / pricing.length
      : 0;
    const totalInbound = mvs
      .filter((m) => m.movement_type === "in")
      .reduce((s, m) => s + ((m.quantity as number) ?? 0), 0);
    const totalValue = mvs
      .filter((m) => m.movement_type === "in")
      .reduce((s, m) => s + ((m.total_cost as number) ?? 0), 0);

    return {
      name: sup.name,
      code: sup.code,
      payment_terms: sup.payment_terms,
      lead_time_days: sup.lead_time_days,
      product_count: productIds.length,
      avg_cost: Math.round(avgCost * 100) / 100,
      total_inbound_quantity: totalInbound,
      total_inbound_value: totalValue,
      total_movements: mvs.length,
    };
  });

  return { suppliers: supData };
}

// ── Custom Query ───────────────────────────────────────────────
// Allows admin to select fields, filters, grouping from a flexible config
async function executeCustomQuery(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  body: {
    fact_table?: string;
    fields?: string[];
    filters?: Record<string, unknown>;
    group_by?: string;
    order_by?: string;
    limit?: number;
  },
) {
  const allowedTables: Record<string, string> = {
    sales: "analytics_fact_sales",
    inventory: "analytics_fact_inventory",
    pricing: "analytics_fact_pricing",
    stock_movements: "analytics_fact_stock_movements",
  };

  const allowedFields: Record<string, string[]> = {
    sales: [
      "id", "period_id", "branch_id", "category_id", "sub_category_id",
      "product_id", "quantity", "weight_tonnes", "unit_price",
      "total_amount", "cost_amount", "vat_amount", "created_at"
    ],
    inventory: [
      "id", "snapshot_date", "product_id", "branch_id",
      "quantity_on_hand", "unit_cost", "total_value", "created_at"
    ],
    pricing: [
      "id", "period_id", "product_id", "branch_id", "supplier_id",
      "standard_cost", "selling_price", "unit_cost", "unit_price",
      "effective_date", "tier", "discount_pct", "created_at"
    ],
    stock_movements: [
      "id", "movement_date", "product_id", "branch_id", "supplier_id",
      "movement_type", "quantity", "unit_cost", "total_cost",
      "reference_number", "batch_number", "created_at"
    ],
  };

  const table = allowedTables[body.fact_table ?? ""];
  if (!table) {
    return { error: `Invalid fact_table. Allowed: ${Object.keys(allowedTables).join(", ")}` };
  }

  const tableFields = allowedFields[body.fact_table ?? ""] ?? [];
  const requested = body.fields?.length ? body.fields : tableFields;
  const fields = requested
    .filter((f) => tableFields.includes(f))
    .join(", ");
  if (!fields) {
    return { error: "No valid fields selected for this fact table" };
  }

  const limit = Math.min(body.limit ?? 100, 500);

  let query = supabase.from(table).select(fields).limit(limit);

  // Apply simple equality filters
  if (body.filters) {
    for (const [key, value] of Object.entries(body.filters)) {
      if (value !== null && value !== undefined && value !== "") {
        query = query.eq(key, value);
      }
    }
  }

  if (body.order_by) {
    const desc = body.order_by.startsWith("-");
    const col = desc ? body.order_by.slice(1) : body.order_by;
    query = query.order(col, { ascending: !desc });
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { rows: data ?? [], count: (data ?? []).length, table };
}
