import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";

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
    const { type, category, branch, period_start, period_end, compare_start, compare_end } = body;

    if (!type) {
      return NextResponse.json(
        { error: "type is required (market_share | category_performance | competitor_comparison)" },
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
          await queryMarketShare(supabase, mainPeriods, comparePeriods, category, branch),
        );
      case "category_performance":
        return NextResponse.json(
          await queryCategoryPerformance(supabase, mainPeriods, comparePeriods, category),
        );
      case "competitor_comparison":
        return NextResponse.json(
          await queryCompetitorComparison(supabase, mainPeriods, category),
        );
      default:
        return NextResponse.json(
          { error: `Unknown query type: ${type}` },
          { status: 400 },
        );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to execute query" },
      { status: 500 },
    );
  }
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

async function queryMarketShare(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  mainPeriods: { id: string; label: string; start_date: string; end_date: string }[],
  comparePeriods: { id: string; label: string; start_date: string; end_date: string }[],
  category?: string,
  branch?: string,
) {
  const periodIds = mainPeriods.map((p) => p.id);
  const compareIds = comparePeriods.map((p) => p.id);

  const mainSales = await getSalesByBranch(supabase, periodIds, category, branch);
  const prevSales = compareIds.length > 0
    ? await getSalesByBranch(supabase, compareIds, category, branch)
    : [];

  const { data: branches } = await supabase
    .from("analytics_branches")
    .select("id, name, code");

  const branchMap = new Map((branches ?? []).map((b) => [b.id, { name: b.name, code: b.code }]));

  const totalSales = mainSales.reduce((sum, r) => sum + ((r.total_amount as number) ?? 0), 0);
  const totalPrevSales = prevSales.reduce((sum, r) => sum + ((r.total_amount as number) ?? 0), 0);

  const prevMap = new Map(prevSales.map((r) => [r.branch_id, (r.total_amount as number) ?? 0]));

  const branches_data = mainSales
      .map((r) => {
        const info = branchMap.get(r.branch_id) ?? { name: "Unknown", code: "???" };
        const sales = (r.total_amount as number) ?? 0;
      return {
        branch: info.name,
        branch_code: info.code,
        sales,
        prev_sales: prevMap.get(r.branch_id as string) ?? 0,
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
  branch?: string,
) {
  let query = supabase
    .from("analytics_fact_sales")
    .select("branch_id, total_amount, product_id")
    .in("period_id", periodIds);

  if (branch) query = query.eq("branch_id", branch);

  const { data: salesRows } = await query;

  if (!salesRows || salesRows.length === 0) return [];

  let filteredRows = salesRows;
  if (category) {
    const { data: catRows } = await supabase
      .from("analytics_categories")
      .select("id")
      .ilike("name", `%${category}%`);

    if (catRows && catRows.length > 0) {
      const catId = catRows[0].id;
      const { data: prodIds } = await supabase
        .from("analytics_products")
        .select("id")
        .eq("category_id", catId);

      if (prodIds && prodIds.length > 0) {
        const pIds = prodIds.map((p: { id: string }) => p.id);
        filteredRows = salesRows.filter((r) => pIds.includes(r.product_id as string));
      }
    }
  }

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
) {
  const periodIds = mainPeriods.map((p) => p.id);
  const compareIds = comparePeriods.map((p) => p.id);

  const salesQuery = supabase
      .from("analytics_fact_sales")
      .select("category_id, total_amount, quantity, unit_price")
      .in("period_id", periodIds);

  let finalSalesQuery = salesQuery;
    if (category) {
    const { data: catRows } = await supabase
      .from("analytics_categories")
      .select("id")
      .ilike("name", `%${category}%`);
    if (catRows && catRows.length > 0) {
      finalSalesQuery = salesQuery.eq("category_id", catRows[0].id);
    }
  }

  const { data: sales } = await finalSalesQuery;

  let compareSales: { category_id: string | null; total_amount: number | null }[] = [];
  if (compareIds.length > 0) {
    let cmpQuery = supabase
      .from("analytics_fact_sales")
      .select("category_id, total_amount")
      .in("period_id", compareIds);
    if (category) {
      const { data: catRows } = await supabase
        .from("analytics_categories")
        .select("id")
        .ilike("name", `%${category}%`);
      if (catRows && catRows.length > 0) {
        cmpQuery = cmpQuery.eq("category_id", catRows[0].id);
      }
    }
    const { data } = await cmpQuery;
    compareSales = data ?? [];
  }

  const grouped = new Map<string, { total: number; units: number; prices: number[] }>();
  for (const row of sales ?? []) {
    const catId = row.category_id as string ?? "unknown";
    const existing = grouped.get(catId) ?? { total: 0, units: 0, prices: [] };
    existing.total += (row.total_amount as number) ?? 0;
    existing.units += (row.quantity as number) ?? 0;
    if (row.unit_price) existing.prices.push(row.unit_price as number);
    grouped.set(catId, existing);
  }

  const prevGrouped = new Map<string, number>();
  for (const row of compareSales) {
    const catId = row.category_id as string ?? "unknown";
    prevGrouped.set(catId, (prevGrouped.get(catId) ?? 0) + ((row.total_amount as number) ?? 0));
  }

  const catIds = Array.from(grouped.keys());
  const { data: cats } = await supabase
    .from("analytics_categories")
    .select("id, name")
    .in("id", catIds);

  const catMap = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]));

  const categories = Array.from(grouped.entries()).map(([catId, data]) => ({
    category: catMap.get(catId) ?? "Unknown",
    total_sales: data.total,
    total_units: data.units,
    avg_unit_price: data.prices.length > 0
      ? data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length
      : 0,
    product_count: 0,
    prev_total_sales: prevGrouped.get(catId) ?? 0,
  }));

  return { categories };
}

async function queryCompetitorComparison(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  mainPeriods: { id: string }[],
  category?: string,
) {
  const periodIds = mainPeriods.map((p) => p.id);

  const salesQuery = supabase
      .from("analytics_fact_sales")
      .select("product_id, total_amount, quantity, unit_price")
      .in("period_id", periodIds);

    const { data: sales } = await salesQuery;
  if (!sales || sales.length === 0) return { manufacturers: [] };

  const productIds = [...new Set(sales.map((r) => r.product_id as string))];
  const { data: products } = await supabase
    .from("analytics_products")
    .select("id, manufacturer_id, category_id")
    .in("id", productIds);

  let filteredProducts = products ?? [];
  if (category) {
    const { data: catRows } = await supabase
      .from("analytics_categories")
      .select("id")
      .ilike("name", `%${category}%`);
    if (catRows && catRows.length > 0) {
      filteredProducts = filteredProducts.filter((p) => p.category_id === catRows[0].id);
    }
  }

  const productMap = new Map(filteredProducts.map((p) => [p.id as string, p]));
  const filteredSales = sales.filter((r) => productMap.has(r.product_id as string));

  const mfgIds = [...new Set(filteredProducts.map((p) => p.manufacturer_id as string).filter(Boolean))];
  const { data: mfgs } = mfgIds.length > 0
    ? await supabase
        .from("analytics_manufacturers")
        .select("id, name")
        .in("id", mfgIds)
    : { data: [] };

  const mfgMap = new Map((mfgs ?? []).map((m) => [m.id as string, m.name as string]));

  const grouped = new Map<string, { total: number; units: number; prices: number[]; products: Set<string> }>();
  for (const row of filteredSales) {
      const prod = productMap.get(row.product_id as string);
      const mfgId = prod?.manufacturer_id ?? "unknown";
    const existing = grouped.get(mfgId) ?? { total: 0, units: 0, prices: [], products: new Set() };
    existing.total += (row.total_amount as number) ?? 0;
    existing.units += (row.quantity as number) ?? 0;
    if (row.unit_price) existing.prices.push(row.unit_price as number);
    existing.products.add(row.product_id as string);
    grouped.set(mfgId, existing);
  }

  const grandTotal = Array.from(grouped.values()).reduce((sum, g) => sum + g.total, 0);

  const manufacturers = Array.from(grouped.entries())
    .map(([mfgId, data]) => ({
      manufacturer: mfgMap.get(mfgId) ?? "Unknown",
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
