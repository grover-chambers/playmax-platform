import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import {
  getSharingRecords,
  getCategoriesByNamePg,
  fetchMaizzeSalesPg,
  getSuppliersByIds,
  fetchPricingByCategoryPg,
  withPgFallback,
} from "@/lib/db-fallback";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    // Sharing records (with pg fallback)
    const sharing = await getSharingRecords(supabase, client.id);

    if (!sharing || sharing.length === 0) {
      return NextResponse.json({ maize: null, summary: "No analytics sharing configured" });
    }

    const periodIds = [...new Set(sharing.map((s) => s.period_id))];
    const branchIds = [...new Set(sharing.map((s) => s.branch_id).filter(Boolean))] as string[];

    // Find the Maize category (with pg fallback)
    let catId: string | null = null;
    const cats = await withPgFallback(
      async () => {
        const { data } = await supabase
          .from("analytics_categories")
          .select("id, name")
          .or("name.ilike.%maize%,name.ilike.%maizze%,name.ilike.%maize flour%")
          .limit(5);
        return data ?? [];
      },
      () => getCategoriesByNamePg("maize"),
      "getCategoriesByName",
    );

    if (cats && cats.length > 0) {
      const sorted = cats.sort((a: { name: string }, b: { name: string }) => {
        const aScore = a.name.toLowerCase().includes("flour") ? 2 : a.name.toLowerCase().includes("maize") ? 1 : 0;
        const bScore = b.name.toLowerCase().includes("flour") ? 2 : b.name.toLowerCase().includes("maize") ? 1 : 0;
        return bScore - aScore;
      });
      catId = sorted[0].id;
    }

    if (!catId) {
      return NextResponse.json({ maize: null, summary: "Maize/maizze category not found in analytics_categories" });
    }

    // Fetch sales (pg fallback — joins done in SQL)
    const salesRows = await fetchMaizzeSalesPg(periodIds, catId, branchIds.length > 0 ? branchIds : undefined);

    // Supplier breakdown (with pg fallback)
    const supplierIds = [...new Set(salesRows.map((r) => (r as Record<string, unknown>).supplier_id).filter(Boolean))] as string[];
    let supplierNameMap = new Map<string, string>();
    if (supplierIds.length > 0) {
      const supRows = await getSuppliersByIds(supabase, supplierIds);
      supplierNameMap = new Map((supRows ?? []).map((s) => [s.id, s.name]));
    }

    const supGrouped = new Map<string, { total: number; units: number; products: Set<string>; supplierIds: Set<string> }>();
    for (const row of salesRows) {
      const r = row as Record<string, unknown>;
      const supName = r.supplier_id ? (supplierNameMap.get(r.supplier_id as string) || "Unknown") : "Unknown";
      const existing = supGrouped.get(supName) || { total: 0, units: 0, products: new Set(), supplierIds: new Set() };
      existing.total += Number(r.total_amount) || 0;
      existing.units += Number(r.quantity) || 0;
      if (r.product_id) existing.products.add(r.product_id as string);
      if (r.supplier_id) existing.supplierIds.add(r.supplier_id as string);
      supGrouped.set(supName, existing);
    }

    const linkedSupplierId = client.linked_supplier_id;
    const grandTotal = Array.from(supGrouped.values()).reduce((s, g) => s + g.total, 0);
    const competitors = Array.from(supGrouped.entries())
      .map(([name, data]) => ({
        supplier: name,
        total_sales: data.total,
        total_units: data.units,
        products_count: data.products.size,
        share: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
        is_client: linkedSupplierId ? data.supplierIds.has(linkedSupplierId) : name.trim().toLowerCase() === (client.company || client.name || "").trim().toLowerCase(),
        rank: 0,
      }))
      .sort((a, b) => b.total_sales - a.total_sales)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Product breakdown within Maize
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
    const products = Array.from(prodGrouped.values()).sort((a, b) => b.total - a.total);

    // Branch breakdown within Maize
    const branchGrouped = new Map<string, { name: string; total: number; units: number }>();
    for (const row of salesRows) {
      const r = row as Record<string, unknown>;
      const branch = r.branch as { name: string; code: string } | undefined;
      const key = (r.branch_id as string) || branch?.name || "Unknown";
      const existing = branchGrouped.get(key) || { name: branch?.name || key, total: 0, units: 0 };
      existing.total += Number(r.total_amount) || 0;
      existing.units += Number(r.quantity) || 0;
      branchGrouped.set(key, existing);
    }
    const branches = Array.from(branchGrouped.values()).sort((a, b) => b.total - a.total);

    // Pricing within Maize (pg fallback)
    const pricingRaw = await fetchPricingByCategoryPg(catId);
    const pricing = pricingRaw.map((p) => {
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
