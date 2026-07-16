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
      case "inventory_summary":
        return NextResponse.json(
          await queryInventorySummary(supabase, category, branch),
        );
      case "pricing_analysis":
        return NextResponse.json(
          await queryPricingAnalysis(supabase, mainPeriods, category, branch),
        );
      case "stock_movements":
        return NextResponse.json(
          await queryStockMovements(supabase, category, branch),
        );
      case "supplier_performance":
        return NextResponse.json(
          await querySupplierPerformance(supabase),
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

// ── Inventory Summary ──────────────────────────────────────────
async function queryInventorySummary(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  category?: string,
  branch?: string,
) {
  let query = supabase
    .from("analytics_fact_inventory")
    .select("product_id, branch_id, quantity_on_hand, unit_cost, total_value, snapshot_date")
    .order("snapshot_date", { ascending: false });

  if (branch) query = query.eq("branch_id", branch);

  const { data: invRows } = await query;
  if (!invRows || invRows.length === 0) return { items: [], totals: { total_value: 0, total_units: 0, product_count: 0 } };

  // Get latest snapshot per product
  const latestByProduct = new Map<string, typeof invRows[0]>();
  for (const row of invRows) {
    const pid = row.product_id as string;
    if (!latestByProduct.has(pid)) latestByProduct.set(pid, row);
  }

  const productIds = [...latestByProduct.keys()];
  const { data: products } = await supabase
    .from("analytics_products")
    .select("id, stock_code, name, category_id, sub_category")
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

  const catIds = [...new Set(filteredProducts.map((p) => p.category_id as string).filter(Boolean))];
  const { data: cats } = catIds.length > 0
    ? await supabase.from("analytics_categories").select("id, name").in("id", catIds)
    : { data: [] };
  const catMap = new Map((cats ?? []).map((c) => [c.id as string, c.name as string]));

  const items = filteredProducts
    .map((prod) => {
      const inv = latestByProduct.get(prod.id as string);
      if (!inv) return null;
      return {
        product: prod.name,
        stock_code: prod.stock_code,
        category: catMap.get(prod.category_id as string) ?? "Unknown",
        sub_category: prod.sub_category || "",
        quantity_on_hand: inv.quantity_on_hand,
        unit_cost: inv.unit_cost,
        total_value: inv.total_value,
        last_updated: inv.snapshot_date,
      };
    })
    .filter(Boolean);

  const totals = {
    total_value: items.reduce((s, i) => s + ((i?.total_value as number) ?? 0), 0),
    total_units: items.reduce((s, i) => s + ((i?.quantity_on_hand as number) ?? 0), 0),
    product_count: items.length,
  };

  return { items, totals };
}

// ── Pricing Analysis ──────────────────────────────────────────
async function queryPricingAnalysis(
  supabase: Awaited<ReturnType<typeof getAuthenticatedClient>>,
  mainPeriods: { id: string }[],
  category?: string,
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
  category?: string,
  branch?: string,
) {
  let query = supabase
    .from("analytics_fact_stock_movements")
    .select("id, movement_date, product_id, branch_id, supplier_id, movement_type, quantity, unit_cost, total_cost, reference_number, batch_number")
    .order("movement_date", { ascending: false })
    .limit(500);

  if (branch) query = query.eq("branch_id", branch);

  const { data: movements } = await query;
  if (!movements || movements.length === 0) return { movements: [], summary: {} };

  const productIds = [...new Set(movements.map((m) => m.product_id as string))];
  const { data: products } = await supabase
    .from("analytics_products")
    .select("id, stock_code, name, category_id")
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
) {
  // Get suppliers with their product counts and sales
  const { data: suppliers } = await supabase
    .from("analytics_suppliers")
    .select("id, name, code, payment_terms, lead_time_days, active")
    .eq("active", true)
    .order("name");

  if (!suppliers || suppliers.length === 0) return { suppliers: [] };

  const supIds = suppliers.map((s) => s.id as string);

  // Get pricing data per supplier (to count products and compute avg cost)
  const { data: pricingRows } = await supabase
    .from("analytics_fact_pricing")
    .select("supplier_id, product_id, unit_cost, selling_price")
    .in("supplier_id", supIds);

  // Get stock movements per supplier
  const { data: movements } = await supabase
    .from("analytics_fact_stock_movements")
    .select("supplier_id, movement_type, quantity, total_cost")
    .in("supplier_id", supIds);

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

  const table = allowedTables[body.fact_table ?? ""];
  if (!table) {
    return { error: `Invalid fact_table. Allowed: ${Object.keys(allowedTables).join(", ")}` };
  }

  const fields = body.fields?.length ? body.fields.join(", ") : "*";
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
