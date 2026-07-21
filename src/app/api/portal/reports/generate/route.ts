import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import {
  generateMarketShareReport,
  generateCategoryAnalysisReport,
  generateNicePerformanceReport,
  generateSupplierCompetitionReport,
  generateBranchBreakdownReport,
  generateKaniniNetworkReport,
  type ReportData,
  type SupplierData,
  type BranchData,
  type ClientBranchData,
} from "@/lib/pdf-reports";

export const dynamic = "force-dynamic";

interface RawSalesRow {
  id: string;
  quantity: number;
  total_amount: number;
  cost_amount: number;
  unit_price: number | null;
  product_id: string;
  branch_id: string;
  period_id: string;
  category_id: string;
  supplier_id: string | null;
  product: { name: string; stock_code: string }[];
  period: { label: string; year: number; quarter: number; month: number }[];
  branch: { name: string; code: string }[];
  category: { name: string }[];
}

export async function POST() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!svcKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, svcKey);

    const clientDisplayName = client.company || client.name || "Client";
    const clientNameLower = clientDisplayName.toLowerCase();

    // Fetch sharing records
    const { data: sharing } = await supabase
      .from("portal_analytics_sharing")
      .select("period_id, branch_id, category_id")
      .eq("client_id", client.id)
      .eq("visible", true);

    if (!sharing || sharing.length === 0) {
      return NextResponse.json({ error: "No analytics data shared" }, { status: 404 });
    }

    const periodIds = [...new Set(sharing.map((s) => s.period_id))];
    const branchIds = [...new Set(sharing.map((s) => s.branch_id).filter(Boolean))] as string[];
    const categoryIds = [...new Set(sharing.map((s) => s.category_id).filter(Boolean))] as string[];

    // Fetch category name
    let categoryName = "Product";
    if (categoryIds.length > 0) {
      const { data: catRow } = await admin
        .from("analytics_categories")
        .select("name")
        .in("id", categoryIds)
        .limit(1)
        .single();
      if (catRow) categoryName = catRow.name;
    }

    // Fetch period label
    let periodLabel = "Review Period";
    if (periodIds.length > 0) {
      const { data: periodRows } = await admin
        .from("analytics_periods")
        .select("label")
        .in("id", periodIds)
        .order("year", { ascending: true })
        .order("month", { ascending: true });
      if (periodRows && periodRows.length > 0) {
        const labels = periodRows.map((p) => p.label).filter(Boolean);
        periodLabel = labels.length > 1 ? `${labels[0]}–${labels[labels.length - 1]}` : labels[0] || "Review Period";
      }
    }

    // Fetch sales
    let salesQuery = supabase
      .from("analytics_fact_sales")
      .select("id, quantity, total_amount, cost_amount, unit_price, product_id, branch_id, period_id, category_id, supplier_id, product:analytics_products(name, stock_code), period:analytics_periods(label, year, quarter, month), branch:analytics_branches(name, code), category:analytics_categories(name)")
      .in("period_id", periodIds);
    if (branchIds.length > 0) salesQuery = salesQuery.in("branch_id", branchIds);
    if (categoryIds.length > 0) salesQuery = salesQuery.in("category_id", categoryIds);

    const { data: sales, error: salesErr } = await salesQuery;
    if (salesErr) return NextResponse.json({ error: salesErr.message }, { status: 500 });

    const salesRows = (sales || []) as unknown as RawSalesRow[];

    // Build supplier lookup
    const supplierIds = [...new Set(salesRows.map((r) => r.supplier_id).filter(Boolean))] as string[];
    let supplierNameMap = new Map<string, string>();
    if (supplierIds.length > 0) {
      const { data: supplierRows } = await admin
        .from("analytics_suppliers")
        .select("id, name")
        .in("id", supplierIds);
      supplierNameMap = new Map((supplierRows ?? []).map((s) => [s.id as string, s.name as string]));
    }

    // Group by supplier
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
    const grandQty = Array.from(supGrouped.values()).reduce((s, g) => s + g.units, 0);

    const supplierDetails: SupplierData[] = Array.from(supGrouped.entries())
      .map(([name, data]) => ({
        id: name.toLowerCase() === clientNameLower ? "client" : name,
        name,
        revenue: data.total,
        units: data.units,
        share: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
        avgPrice: data.units > 0 ? data.total / data.units : 0,
        isClient: name.toLowerCase() === clientNameLower,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Group by branch
    const branchGrouped = new Map<string, { name: string; total: number; units: number }>();
    for (const row of salesRows) {
      const bName = row.branch?.[0]?.name || "Unknown";
      const key = row.branch_id || bName;
      const existing = branchGrouped.get(key) || { name: bName, total: 0, units: 0 };
      existing.total += Number(row.total_amount) || 0;
      existing.units += Number(row.quantity) || 0;
      branchGrouped.set(key, existing);
    }

    const branchDetails: BranchData[] = Array.from(branchGrouped.values())
      .map((b) => ({
        name: b.name,
        revenue: b.total,
        units: b.units,
        share: grandTotal > 0 ? (b.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Client branch breakdown
    const clientBranchGrouped = new Map<string, { name: string; total: number; units: number }>();
    for (const row of salesRows) {
      const supName = row.supplier_id ? (supplierNameMap.get(row.supplier_id) || "Unknown") : "Unknown";
      if (supName.toLowerCase() !== clientNameLower) continue;
      const bName = row.branch?.[0]?.name || "Unknown";
      const key = row.branch_id || bName;
      const existing = clientBranchGrouped.get(key) || { name: bName, total: 0, units: 0 };
      existing.total += Number(row.total_amount) || 0;
      existing.units += Number(row.quantity) || 0;
      clientBranchGrouped.set(key, existing);
    }

    const clientBranchDetails: ClientBranchData[] = Array.from(clientBranchGrouped.values())
      .map((b) => ({ name: b.name, revenue: b.total, units: b.units }))
      .sort((a, b) => b.revenue - a.revenue);

    const clientData = supplierDetails.find((s) => s.isClient);
    const clientRank = supplierDetails.findIndex((s) => s.isClient) + 1;

    const distinctProducts = new Set(salesRows.map((r) => r.product_id)).size;
    const distinctBranches = new Set(salesRows.map((r) => r.branch_id)).size;

    const reportData: ReportData = {
      grandTotal,
      grandQty,
      supplierDetails,
      branchDetails,
      clientTotal: { total: clientData?.revenue || 0, units: clientData?.units || 0 },
      clientRank,
      clientShare: clientData?.share || 0,
      clientBranchDetails,
      totalSuppliers: supplierDetails.filter((s) => s.id !== "unknown").length,
      totalProducts: distinctProducts,
      totalBranches: distinctBranches,
      categoryName,
      clientName: clientDisplayName,
      clientDisplayName,
      periodLabel,
    };

    // Delete previously generated reports for this client
    const { data: existingDels } = await admin
      .from("deliverables")
      .select("id")
      .eq("client_id", client.id)
      .eq("file_type", "pdf")
      .like("title", `%${categoryName}%`);

    if (existingDels && existingDels.length > 0) {
      await admin.from("deliverables").delete().in("id", existingDels.map((d) => d.id));
    }

    // Generate 6 PDFs with dynamic titles
    const generators = [
      { suffix: "Market Share Intelligence", fn: generateMarketShareReport },
      { suffix: "Category Performance Analysis", fn: generateCategoryAnalysisReport },
      { suffix: `${clientDisplayName} Performance`, fn: generateNicePerformanceReport },
      { suffix: "Supplier Competition Analysis", fn: generateSupplierCompetitionReport },
      { suffix: "Branch Performance Breakdown", fn: generateBranchBreakdownReport },
      { suffix: "Kanini Network Sales Performance", fn: generateKaniniNetworkReport },
    ];

    const createdDeliverables = [];

    for (let i = 0; i < generators.length; i++) {
      const { suffix, fn } = generators[i];
      const title = `${suffix} — ${categoryName}`;
      const doc = fn(reportData);
      const pdfBase64 = doc.output("datauristring").split(",")[1] || "";

      const { data: del, error: insErr } = await admin
        .from("deliverables")
        .insert({
          project_id: null,
          client_id: client.id,
          title,
          description: `Auto-generated analytics report for ${clientDisplayName} — ${categoryName} Category (${periodLabel})`,
          file_type: "pdf",
          file_size: String(Math.round((pdfBase64.length * 3) / 4)),
          visible_to_client: true,
          approval_status: "pending",
          pdf_base64: pdfBase64,
        })
        .select("id, title, file_type, file_size, created_at")
        .single();

      if (!insErr && del) {
        createdDeliverables.push(del);
      }
    }

    return NextResponse.json({
      success: true,
      count: createdDeliverables.length,
      deliverables: createdDeliverables,
    });
  } catch (err) {
    console.error("[reports/generate]", err);
    return NextResponse.json({ error: "Failed to generate reports" }, { status: 500 });
  }
}
