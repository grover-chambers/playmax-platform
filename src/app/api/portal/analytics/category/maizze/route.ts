import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    const { data: sharing } = await supabase
      .from("portal_analytics_sharing")
      .select("period_id, branch_id, category_id")
      .eq("client_id", client.id)
      .eq("visible", true);

    if (!sharing || sharing.length === 0) {
      return NextResponse.json({ maize: null, summary: "No analytics sharing configured" });
    }

    const periodIds = [...new Set(sharing.map((s) => s.period_id))];
    const branchIds = [...new Set(sharing.map((s) => s.branch_id).filter(Boolean))] as string[];

    // Find the Maize category — try exact match first, then fuzzy
    let catId: string | null = null;

    const { data: exactMatch } = await supabase
      .from("analytics_categories")
      .select("id, name")
      .or("name.ilike.%maize%,name.ilike.%maizze%,name.ilike.%maize flour%")
      .limit(5);

    if (exactMatch && exactMatch.length > 0) {
      // Prefer the most specific match (Maize Flour over just "Maize" if it's a biscuit)
      const sorted = exactMatch.sort((a, b) => {
        const aScore = a.name.toLowerCase().includes("flour") ? 2 : a.name.toLowerCase().includes("maize") ? 1 : 0;
        const bScore = b.name.toLowerCase().includes("flour") ? 2 : b.name.toLowerCase().includes("maize") ? 1 : 0;
        return bScore - aScore;
      });
      catId = sorted[0].id;
    }

    if (!catId) {
      return NextResponse.json({ maize: null, summary: "Maize/maizze category not found in analytics_categories" });
    }
    if (!catId) {
      return NextResponse.json({ maize: null, summary: "Maize category not found" });
    }

    // Fetch sales filtered by this category
    let salesQuery = supabase
      .from("analytics_fact_sales")
      .select("id, quantity, total_amount, cost_amount, unit_price, product_id, branch_id, period_id, supplier_id, product:analytics_products(name, stock_code), period:analytics_periods(label, year, quarter, month), branch:analytics_branches(name, code)")
      .in("period_id", periodIds)
      .eq("category_id", catId);

    if (branchIds.length > 0) salesQuery = salesQuery.in("branch_id", branchIds);
    const { data: sales } = await salesQuery;

    const salesRows = (sales || []) as unknown as Record<string, unknown>[];

    // Supplier breakdown within Maize category
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
      const supName = row.supplier_id ? (supplierNameMap.get(row.supplier_id as string) || "Unknown") : "Unknown";
      const existing = supGrouped.get(supName) || { total: 0, units: 0, products: new Set() };
      existing.total += Number(row.total_amount) || 0;
      existing.units += Number(row.quantity) || 0;
      if (row.product_id) existing.products.add(row.product_id as string);
      supGrouped.set(supName, existing);
    }

    const grandTotal = Array.from(supGrouped.values()).reduce((s, g) => s + g.total, 0);
    const clientName = client.company || client.name || "";
    const competitors = Array.from(supGrouped.entries())
      .map(([name, data]) => ({
        supplier: name,
        total_sales: data.total,
        total_units: data.units,
        products_count: data.products.size,
        share: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
        is_client: name.toLowerCase() === clientName.toLowerCase(),
        rank: 0,
      }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Product breakdown within Maize
    const prodGrouped = new Map<string, { name: string; code: string; total: number; qty: number }>();
    for (const row of salesRows) {
      const prod = row.product as { name: string; stock_code: string } | undefined;
      const key = row.product_id as string || prod?.stock_code || "unknown";
      const existing = prodGrouped.get(key) || {
        name: prod?.name || key, code: prod?.stock_code || "", total: 0, qty: 0,
      };
      existing.total += Number(row.total_amount) || 0;
      existing.qty += Number(row.quantity) || 0;
      prodGrouped.set(key, existing);
    }
    const products = Array.from(prodGrouped.values())
      .sort((a, b) => b.total - a.total);

    // Branch breakdown within Maize
    const branchGrouped = new Map<string, { name: string; total: number; units: number }>();
    for (const row of salesRows) {
      const branch = row.branch as { name: string; code: string } | undefined;
      const key = row.branch_id as string || branch?.name || "Unknown";
      const existing = branchGrouped.get(key) || { name: branch?.name || key, total: 0, units: 0 };
      existing.total += Number(row.total_amount) || 0;
      existing.units += Number(row.quantity) || 0;
      branchGrouped.set(key, existing);
    }
    const branches = Array.from(branchGrouped.values()).sort((a, b) => b.total - a.total);

    // Pricing within Maize
    const pricingQuery = supabase
      .from("analytics_fact_pricing")
      .select("id, standard_cost, selling_price, effective_date, product:analytics_products(name, stock_code), branch:analytics_branches(name, code)")
      .eq("product.category_id", catId)
      .order("effective_date", { ascending: false })
      .limit(100);

    const { data: pricingRaw } = await pricingQuery;
    const pricing = ((pricingRaw || []) as unknown as Record<string, unknown>[]).map((p) => {
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

    return NextResponse.json({
      category: "Maize Flour",
      competitors,
      products,
      branches,
      pricing,
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
  } catch {
    return NextResponse.json({ error: "Failed to fetch Maize analytics" }, { status: 500 });
  }
}
