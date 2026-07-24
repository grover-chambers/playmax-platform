import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser } from "@/lib/supabase/api";
import { getPortalClient } from "@/lib/portal";
import { getAdminClient } from "@/lib/supabase/admin";
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
import {
  getSharingRecords,
  getCategoriesByIds,
  getPeriodLabelsPg,
  getSuppliersByIds,
  fetchAllSalesWithJoinsFallback,
  getDeliverablesByCategoryPg,
  deleteDeliverablesPg,
  insertDeliverablePg,
} from "@/lib/db-fallback";

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
  product: { name: string; stock_code: string };
  period: { label: string; year: number; quarter: number; month: number };
  branch: { name: string; code: string };
  category: { name: string };
}

export async function POST() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await getPortalClient(supabase, currentUser.id);
    if (!client) return NextResponse.json({ error: "No client account linked" }, { status: 404 });

    const admin = getAdminClient();

    const clientDisplayName = client.company || client.name || "Client";
    const clientNameLower = clientDisplayName.toLowerCase();

    // Fetch sharing records (with pg fallback)
    const sharing = await getSharingRecords(supabase, client.id);

    if (!sharing || sharing.length === 0) {
      return NextResponse.json({ error: "No analytics data shared" }, { status: 404 });
    }

    const periodIds = [...new Set(sharing.map((s) => s.period_id))];
    const branchIds = [...new Set(sharing.map((s) => s.branch_id).filter(Boolean))] as string[];
    const categoryIds = [...new Set(sharing.map((s) => s.category_id).filter(Boolean))] as string[];

    // Fetch category name (with pg fallback)
    let categoryName = "Product";
    if (categoryIds.length > 0) {
      const cats = await getCategoriesByIds(admin, categoryIds);
      if (cats && cats.length > 0) categoryName = cats[0].name;
    }

    // Fetch period label (pg fallback)
    let periodLabel = "Review Period";
    if (periodIds.length > 0) {
      const periodRows = await getPeriodLabelsPg(periodIds);
      if (periodRows && periodRows.length > 0) {
        const labels = periodRows.map((p) => p.label).filter(Boolean);
        periodLabel = labels.length > 1 ? `${labels[0]}–${labels[labels.length - 1]}` : labels[0] || "Review Period";
      }
    }

    // Fetch sales (with pg fallback for joins)
    const salesRows = await fetchAllSalesWithJoinsFallback(supabase, periodIds, branchIds.length > 0 ? branchIds : undefined, categoryIds.length > 0 ? categoryIds : undefined) as unknown as RawSalesRow[];

    // Build supplier lookup (with pg fallback)
    const supplierIds = [...new Set(salesRows.map((r) => r.supplier_id).filter(Boolean))] as string[];
    let supplierNameMap = new Map<string, string>();
    if (supplierIds.length > 0) {
      const supRows = await getSuppliersByIds(admin, supplierIds);
      supplierNameMap = new Map((supRows ?? []).map((s) => [s.id, s.name]));
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
      const bName = row.branch?.name || "Unknown";
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
      const bName = row.branch?.name || "Unknown";
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

    // Delete previously generated reports for this client (with pg fallback)
    const existingDels = await getDeliverablesByCategoryPg(client.id, categoryName.replace(/[%_]/g, ''));

    if (existingDels && existingDels.length > 0) {
      await deleteDeliverablesPg(existingDels.map((d) => d.id));
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

      const del = await insertDeliverablePg({
        client_id: client.id,
        title,
        description: `Auto-generated analytics report for ${clientDisplayName} — ${categoryName} Category (${periodLabel})`,
        file_type: "pdf",
        file_size: Math.round((pdfBase64.length * 3) / 4),
        visible_to_client: true,
        approval_status: "pending",
        pdf_base64: pdfBase64,
      });

      if (del) {
        createdDeliverables.push(del);
      }
    }

    // Create notification for client
    await supabase.from("notifications").insert({
      client_id: client.id,
      type: "report",
      title: "New Reports Available",
      message: `${createdDeliverables.length} analytics reports for ${categoryName} have been generated and are ready for review.`,
      link: "/portal/deliverables",
    });

    // Send email notification if enabled
    const prefs = client.notification_prefs as Record<string, boolean> | undefined;
    if (prefs?.email !== false && client.email) {
      try {
        const { NotificationEmail } = await import("@/emails/notification");
        const { sendEmail } = await import("@/lib/email");
        await sendEmail({
          to: client.email,
          subject: `New Analytics Reports — ${categoryName}`,
          react: NotificationEmail({
            name: "New Reports Available",
            message: `${createdDeliverables.length} analytics reports for ${categoryName} have been generated and are ready for review in your portal.`,
          }),
        });
      } catch (emailErr) {
        console.error("[reports/generate] email notification failed:", emailErr);
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
