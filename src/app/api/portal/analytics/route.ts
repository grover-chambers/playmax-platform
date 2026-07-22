import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";

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

// Raw Supabase join result types
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

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    // Fetch sharing records for this client
    const { data: sharing, error: shareErr } = await supabase
      .from("portal_analytics_sharing")
      .select("id, period_id, branch_id, category_id")
      .eq("client_id", client.id)
      .eq("visible", true);

    if (shareErr) {
      return NextResponse.json({ error: shareErr.message }, { status: 500 });
    }

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
      });
    }

    const periodIds = [...new Set(sharing.map((s) => s.period_id))];
    const branchIds = [...new Set(sharing.map((s) => s.branch_id).filter(Boolean))] as string[];
    const categoryIds = [...new Set(sharing.map((s) => s.category_id).filter(Boolean))] as string[];

    // Get client's supplier name for competitor comparison (suppliers-as-manufacturers, Option B)
    const clientName = client.company || client.name || "";

    // ── Sales data (paginated to avoid 1000-row limit) ──────────
    const allSales: Record<string, unknown>[] = [];
    const PAGE = 1000;
    let from = 0;
    let salesErr: { message: string } | null = null;
    while (true) {
      let q = supabase
        .from("analytics_fact_sales")
        .select("id, quantity, total_amount, cost_amount, weight_tonnes, unit_price, product_id, branch_id, period_id, category_id, supplier_id, product:analytics_products(name, stock_code), period:analytics_periods(label, year, quarter, month), branch:analytics_branches(name, code), category:analytics_categories(name)")
        .in("period_id", periodIds)
        .range(from, from + PAGE - 1);
      if (branchIds.length > 0) q = q.in("branch_id", branchIds);
      if (categoryIds.length > 0) q = q.in("category_id", categoryIds);
      const { data, error } = await q;
      if (error) { salesErr = error; break; }
      if (!data || data.length === 0) break;
      allSales.push(...data);
      from += PAGE;
      if (data.length < PAGE) break;
    }
    const sales = salesErr ? null : allSales;

    // ── Inventory data ──────────────────────────────────────────
    let invQuery = supabase
      .from("analytics_fact_inventory")
      .select("id, closing_stock, stock_value, product:analytics_products(name, stock_code), branch:analytics_branches(name, code), period:analytics_periods(end_date)")
      .order("period_id", { ascending: false })
      .limit(500);

    if (branchIds.length > 0) invQuery = invQuery.in("branch_id", branchIds);

    const { data: inventory, error: invErr } = await invQuery;

    // ── Pricing data ────────────────────────────────────────────
    let pricingQuery = supabase
      .from("analytics_fact_pricing")
      .select("id, standard_cost, selling_price, effective_date, product:analytics_products(name, stock_code), branch:analytics_branches(name, code)")
      .order("effective_date", { ascending: false })
      .limit(200);

    if (branchIds.length > 0) pricingQuery = pricingQuery.in("branch_id", branchIds);

    const { data: pricingRaw } = await pricingQuery;

    if (salesErr || invErr) {
      return NextResponse.json({
        error: salesErr?.message || invErr?.message || "Query failed",
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
      });
    }

    // ── Process sales into visualizations ───────────────────────
    const salesRows = (sales || []) as unknown as RawSalesRow[];

    // Competitor comparison: group sales by supplier (Option B — suppliers ARE manufacturers)
    // Build supplier_id → name lookup first
    const supplierIds = [...new Set(salesRows.map((r) => r.supplier_id).filter(Boolean))] as string[];
    let supplierNameMap = new Map<string, string>();
    if (supplierIds.length > 0) {
      const { data: supplierRows } = await supabase
        .from("analytics_suppliers")
        .select("id, name")
        .in("id", supplierIds);
      supplierNameMap = new Map((supplierRows ?? []).map((s) => [s.id as string, s.name as string]));
    }

    const supGrouped = new Map<string, { total: number; units: number; products: Set<string> }>();
    for (const row of salesRows) {
      const supName = row.supplier_id ? (supplierNameMap.get(row.supplier_id) || "Unknown") : "Unknown";
      const existing = supGrouped.get(supName) || { total: 0, units: 0, products: new Set() };
      existing.total += Number(row.total_amount) || 0;
      existing.units += Number(row.quantity) || 0;
      if (row.product_id) existing.products.add(row.product_id);
      supGrouped.set(supName, existing);
    }

    const grandTotal = Array.from(supGrouped.values()).reduce((s, g) => s + g.total, 0);
    const competitors: CompetitorRank[] = Array.from(supGrouped.entries())
      .map(([name, data]) => ({
        manufacturer: name,
        total_sales: data.total,
        total_units: data.units,
        share: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
        is_client: name.toLowerCase() === clientName.toLowerCase(),
        rank: 0,
      }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Category performance: group sales by category
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

    // Branch breakdown: group sales by branch
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

    const topProducts = allProducts.slice(0, 5);
    const bottomProducts = allProducts.slice(-5).reverse();

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

    // Dashboard color
    const { data: clientRow } = await supabase
      .from("clients")
      .select("dashboard_color")
      .eq("id", client.id)
      .single();

    return NextResponse.json({
      sharing,
      sales: salesRows,
      inventory: inventory || [],
      competitors,
      categories,
      branches,
      topProducts,
      bottomProducts,
      pricing,
      dashboardColor: (clientRow as { dashboard_color?: string } | null)?.dashboard_color || "#0F6E56",
      summary: {
        totalSales: grandTotal,
        totalUnits: Array.from(supGrouped.values()).reduce((s, g) => s + g.units, 0),
        totalInventoryValue: ((inventory || []) as unknown as RawInvRow[]).reduce((s, i) => s + (Number(i.stock_value) || 0), 0),
        totalProducts: prodGrouped.size,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
