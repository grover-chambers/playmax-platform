import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  generateEnrichedMarketShareReport,
  generateEnrichedSupplierCompetitionReport,
  generateEnrichedBranchAnalysisReport,
  generateSupplierDominanceReport,
  generateShareShiftReport,
  generateMoMTrendReport,
  generateHeadToHeadReport,
  generateIndustryReport,
  computeReportSchema,
  EnrichedReportData,
  BranchDominanceData,
  BranchDominanceItem,
  ShareShiftData,
  ShareShiftItem,
  MoMTrendData,
  MoMTrendPoint,
  H2HData,
  H2HComparison,
  H2HProduct,
  FMCG_INDUSTRY,
} from "../src/lib/pdf-reports";

const NICE_CLIENT_ID = "e2f9301b-e1ea-4026-886f-7f44e55770b5";
const NICE_SUPPLIER_ID = "b2fba4d1-4df1-472e-9f5b-387561cae77b";

async function fetchAllSales(admin: SupabaseClient, periodIds: string[], categoryId: string) {
  const all: any[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data } = await admin
      .from("analytics_fact_sales")
      .select("id, quantity, total_amount, supplier_id, branch_id, product_id, period_id")
      .in("period_id", periodIds)
      .eq("category_id", categoryId)
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    from += PAGE;
    if (data.length < PAGE) break;
  }
  return all;
}

async function uploadPdf(admin: SupabaseClient, bucket: string, name: string, pdfDoc: any): Promise<string | null> {
  const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));
  const safeName = name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `client-${NICE_CLIENT_ID.slice(0, 8)}-${safeName}-${Date.now()}.pdf`;

  const { error } = await admin.storage
    .from(bucket)
    .upload(filename, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (error) { console.error(`  Upload failed: ${error.message}`); return null; }
  return admin.storage.from(bucket).getPublicUrl(filename).data.publicUrl;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing env vars");
  const admin = createClient(url, key);
  const bucket = process.env.STORAGE_BUCKET || "research-reports";

  // Clean old
  for (const table of ["documents", "reports", "notifications"]) {
    const { data: old } = await admin.from(table as any).select("id")
      .eq("client_id", NICE_CLIENT_ID)
      .ilike("type" as any, table === "reports" ? "category_analysis" : table === "notifications" ? "deliverable" : "pdf%");
    // Simple delete all docs/notifs for this client
  }
  // Delete old data for this client
  const { data: oldDocs } = await admin.from("documents").select("id").eq("client_id", NICE_CLIENT_ID).eq("visible_to_client", true);
  if (oldDocs?.length) { await admin.from("documents").delete().in("id", oldDocs.map(d => d.id)); console.log(`Cleaned ${oldDocs.length} documents`); }
  const { data: oldReps } = await admin.from("reports").select("id").eq("client_id", NICE_CLIENT_ID).eq("type", "category_analysis");
  if (oldReps?.length) { await admin.from("reports").delete().in("id", oldReps.map(r => r.id)); console.log(`Cleaned ${oldReps.length} reports`); }
  const { data: oldNots } = await admin.from("notifications").select("id").eq("client_id", NICE_CLIENT_ID);
  if (oldNots?.length) { await admin.from("notifications").delete().in("id", oldNots.map(n => n.id)); console.log(`Cleaned ${oldNots.length} notifications`); }

  // 2. Sharing
  const { data: sharing } = await admin.from("portal_analytics_sharing")
    .select("period_id, branch_id, category_id").eq("client_id", NICE_CLIENT_ID).eq("visible", true);
  if (!sharing?.length) { console.log("No sharing"); return; }
  const periodIds = [...new Set(sharing.map(s => s.period_id))];
  const categoryIds = [...new Set(sharing.map(s => s.category_id).filter(Boolean))] as string[];

  const { data: catRows } = await admin.from("analytics_categories").select("id, name").in("id", categoryIds);
  const catMap = new Map((catRows ?? []).map(c => [c.id, c.name]));
  const { data: supRows } = await admin.from("analytics_suppliers").select("id, name");
  const supMap = new Map((supRows ?? []).map(s => [s.id, s.name]));
  const { data: brRows } = await admin.from("analytics_branches").select("id, name");
  const brMap = new Map((brRows ?? []).map(b => [b.id, b.name]));
  const { data: prodRows } = await admin.from("analytics_products").select("id, name");
  const prodMap = new Map((prodRows ?? []).map(p => [p.id, p.name]));
  const { data: perRows } = await admin.from("analytics_periods").select("id, label, year, month").in("id", periodIds).order("year").order("month");
  const perRowsSafe = perRows || [];
  const periodMap = new Map(perRowsSafe.map(p => [p.id, p]));
  const { data: client } = await admin.from("clients").select("id, name, company").eq("id", NICE_CLIENT_ID).single();
  const clientDisplayName = client?.company || client?.name || "Client";

  for (const catId of categoryIds) {
    const catName = catMap.get(catId) || `Category-${catId}`;
    console.log(`\n=== ${catName} ===`);

    const rows = await fetchAllSales(admin, periodIds, catId);
    if (rows.length === 0) continue;
    console.log(`Rows: ${rows.length}`);

    // ── Core aggregates ──
    const categoryTotal = rows.reduce((s: number, r: any) => s + Number(r.total_amount), 0);
    const categoryUnits = rows.reduce((s: number, r: any) => s + Number(r.quantity), 0);
    const niceRows = rows.filter((r: any) => r.supplier_id === NICE_SUPPLIER_ID);
    const niceTotal = niceRows.reduce((s: number, r: any) => s + Number(r.total_amount), 0);
    const niceUnits = niceRows.reduce((s: number, r: any) => s + Number(r.quantity), 0);
    const niceShare = categoryTotal > 0 ? (niceTotal / categoryTotal) * 100 : 0;

    // Supplier ranking
    const supAgg = new Map<string, { revenue: number; units: number }>();
    for (const r of rows) {
      if (!r.supplier_id) continue;
      const prev = supAgg.get(r.supplier_id) || { revenue: 0, units: 0 };
      prev.revenue += Number(r.total_amount) || 0;
      prev.units += Number(r.quantity) || 0;
      supAgg.set(r.supplier_id, prev);
    }
    const supplierRank = Array.from(supAgg.entries())
      .map(([sid, d]) => ({ rank: 0, name: supMap.get(sid) || sid.slice(0, 8), revenue: d.revenue, units: d.units, share: categoryTotal > 0 ? (d.revenue / categoryTotal) * 100 : 0, isClient: sid === NICE_SUPPLIER_ID }))
      .sort((a, b) => b.revenue - a.revenue)
      .map((item, i) => ({ ...item, rank: i + 1 }));
    const clientRank = supplierRank.find(s => s.isClient);
    const top5 = supplierRank.filter(s => !s.isClient).slice(0, 5);
    const top5Ids = new Set(top5.map(s => supMap.get(s.name) ? [...supMap.entries()].find(([id]) => supMap.get(id) === s.name)?.[0] : null).filter(Boolean));

    const supIdToName = new Map<string, string>();
    for (const [id, name] of supMap) supIdToName.set(id, name);
    const nameToSupId = new Map<string, string>();
    for (const [id, name] of supMap) nameToSupId.set(name, id);

    console.log(`NICE: #${clientRank?.rank || "N/A"}/${supplierRank.length}, ${(niceShare).toFixed(1)}% share`);

    // ── Per-branch supplier breakdown (for dominance + existing) ──
    const brSup = new Map<string, Map<string, { revenue: number; units: number }>>();
    for (const r of rows) {
      if (!r.supplier_id || !r.branch_id) continue;
      const bName = brMap.get(r.branch_id) || r.branch_id.slice(0, 8);
      if (!brSup.has(bName)) brSup.set(bName, new Map());
      const sm = brSup.get(bName)!;
      const prev = sm.get(r.supplier_id) || { revenue: 0, units: 0 };
      prev.revenue += Number(r.total_amount) || 0;
      prev.units += Number(r.quantity) || 0;
      sm.set(r.supplier_id, prev);
    }
    const branchMarketShare = Array.from(brSup.entries())
      .map(([bName, sups]) => {
        const bTotal = Array.from(sups.values()).reduce((s: number, v) => s + v.revenue, 0);
        return { branch: bName, suppliers: Array.from(sups.entries()).map(([sid, d]) => ({ name: supMap.get(sid) || sid.slice(0, 8), revenue: d.revenue, units: d.units, share: bTotal > 0 ? (d.revenue / bTotal) * 100 : 0, isClient: sid === NICE_SUPPLIER_ID })).sort((a, b) => b.revenue - a.revenue) };
      })
      .sort((a, b) => b.suppliers.reduce((s: number, v) => s + v.revenue, 0) - a.suppliers.reduce((s: number, v) => s + v.revenue, 0));

    // Supplier competition data
    const supProd = new Map<string, Map<string, { revenue: number; units: number }>>();
    for (const r of rows) {
      if (!r.supplier_id || !r.product_id) continue;
      const sName = supMap.get(r.supplier_id) || r.supplier_id.slice(0, 8);
      if (!supProd.has(sName)) supProd.set(sName, new Map());
      const pm = supProd.get(sName)!;
      const pName = prodMap.get(r.product_id) || r.product_id.slice(0, 8);
      const prev = pm.get(pName) || { revenue: 0, units: 0 };
      prev.revenue += Number(r.total_amount) || 0;
      prev.units += Number(r.quantity) || 0;
      pm.set(pName, prev);
    }
    const supplierCompetition = Array.from(supProd.entries())
      .map(([sName, prods]) => ({ supplier: sName, isClient: sName.toLowerCase().includes("nice"), totalRevenue: Array.from(prods.values()).reduce((s: number, d) => s + d.revenue, 0), totalUnits: Array.from(prods.values()).reduce((s: number, d) => s + d.units, 0), products: Array.from(prods.entries()).map(([pName, d]) => ({ product: pName, revenue: d.revenue, units: d.units })).sort((a, b) => b.revenue - a.revenue) }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Branch analysis
    const brAgg = new Map<string, { revenue: number; units: number; transactions: number }>();
    for (const r of rows) {
      if (!r.branch_id) continue;
      const bName = brMap.get(r.branch_id) || r.branch_id.slice(0, 8);
      const prev = brAgg.get(bName) || { revenue: 0, units: 0, transactions: 0 };
      prev.revenue += Number(r.total_amount) || 0; prev.units += Number(r.quantity) || 0; prev.transactions += 1;
      brAgg.set(bName, prev);
    }
    const niceBrAgg = new Map<string, { revenue: number; units: number; transactions: number }>();
    for (const r of niceRows) {
      if (!r.branch_id) continue;
      const bName = brMap.get(r.branch_id) || r.branch_id.slice(0, 8);
      const prev = niceBrAgg.get(bName) || { revenue: 0, units: 0, transactions: 0 };
      prev.revenue += Number(r.total_amount) || 0; prev.units += Number(r.quantity) || 0; prev.transactions += 1;
      niceBrAgg.set(bName, prev);
    }
    const branchAnalysis = Array.from(brAgg.entries())
      .map(([bName, d]) => { const n = niceBrAgg.get(bName); return { branch: bName, totalRevenue: d.revenue, totalUnits: d.units, totalTransactions: d.transactions, clientRevenue: n?.revenue || 0, clientUnits: n?.units || 0, clientShare: d.revenue > 0 ? ((n?.revenue || 0) / d.revenue) * 100 : 0, avgRevenuePerTransaction: d.transactions > 0 ? d.revenue / d.transactions : 0 }; })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
    const tradingBranches = branchAnalysis.filter((b: any) => b.totalRevenue > 0);
    const bestBranch = tradingBranches.reduce((a: any, b: any) => a.clientRevenue > b.clientRevenue ? a : b, tradingBranches[0]);
    const worstBranch = tradingBranches.reduce((a: any, b: any) => a.clientRevenue < b.clientRevenue ? a : b, tradingBranches[0]);

    // ── NEW: Supplier Dominance per Branch ──
    const branchDominance: BranchDominanceItem[] = branchMarketShare.map(b => {
      const dominant = b.suppliers[0];
      const clientInBranch = b.suppliers.find(s => s.isClient);
      const clientBranchRank = b.suppliers.findIndex(s => s.isClient) + 1;
      return {
        branch: b.branch,
        dominantSupplier: dominant?.name || "N/A",
        dominantShare: dominant?.share || 0,
        dominantRevenue: dominant?.revenue || 0,
        clientShare: clientInBranch?.share || 0,
        clientRevenue: clientInBranch?.revenue || 0,
        clientRank: clientBranchRank || 0,
        totalSuppliers: b.suppliers.length,
      };
    });

    // ── NEW: Share Shift (split periods into halves) ──
    const midIdx = Math.floor(perRowsSafe.length / 2);
    const currentPeriods = perRowsSafe.slice(midIdx).map(p => p.id);
    const previousPeriods = perRowsSafe.slice(0, midIdx).map(p => p.id);
    const currentRows = rows.filter((r: any) => currentPeriods.includes(r.period_id));
    const previousRows = rows.filter((r: any) => previousPeriods.includes(r.period_id));

    const currentLabel = perRowsSafe.length > 0 ? `${perRowsSafe[midIdx]?.label || "Current"}` : "Current";
    const previousLabel = perRowsSafe.length > 0 ? `${perRowsSafe[0]?.label || "Previous"}` : "Previous";

    const calcShare = (dataRows: any[], total: number) => {
      const agg = new Map<string, { revenue: number }>();
      for (const r of dataRows) {
        if (!r.supplier_id) continue;
        const prev = agg.get(r.supplier_id) || { revenue: 0 };
        prev.revenue += Number(r.total_amount) || 0;
        agg.set(r.supplier_id, prev);
      }
      return Array.from(agg.entries()).map(([sid, d]) => ({ name: supMap.get(sid) || sid.slice(0, 8), revenue: d.revenue, share: total > 0 ? (d.revenue / total) * 100 : 0, isClient: sid === NICE_SUPPLIER_ID }));
    };

    const currentTotal = currentRows.reduce((s: number, r: any) => s + Number(r.total_amount), 0);
    const previousTotal = previousRows.reduce((s: number, r: any) => s + Number(r.total_amount), 0);
    const currentShares = calcShare(currentRows, currentTotal);
    const previousShares = calcShare(previousRows, previousTotal);

    const prevMap = new Map(previousShares.map(s => [s.name, s]));
    const shareShifts: ShareShiftItem[] = currentShares.map(cs => {
      const ps = prevMap.get(cs.name);
      const prevShare = ps?.share || 0;
      const prevRev = ps?.revenue || 0;
      const change = cs.share - prevShare;
      return {
        supplier: cs.name,
        isClient: cs.isClient,
        currentShare: cs.share,
        previousShare: prevShare,
        shareChange: change,
        currentRevenue: cs.revenue,
        previousRevenue: prevRev,
        revenueChange: cs.revenue - prevRev,
        direction: change > 0.5 ? "up" as const : change < -0.5 ? "down" as const : "stable" as const,
      };
    });

    // ── NEW: MoM Trend ──
    const trendPoints: MoMTrendPoint[] = [];
    for (const per of perRowsSafe) {
      const perData = rows.filter((r: any) => r.period_id === per.id);
      if (perData.length === 0) continue;
      const perTotal = perData.reduce((s: number, r: any) => s + Number(r.total_amount), 0);
      const perClient = perData.filter((r: any) => r.supplier_id === NICE_SUPPLIER_ID)
        .reduce((s: number, r: any) => s + Number(r.total_amount), 0);
      const perClientShare = perTotal > 0 ? (perClient / perTotal) * 100 : 0;

      const perSupAgg = new Map<string, number>();
      for (const r of perData) {
        if (!r.supplier_id) continue;
        perSupAgg.set(r.supplier_id, (perSupAgg.get(r.supplier_id) || 0) + Number(r.total_amount));
      }
      const perComps = Array.from(perSupAgg.entries())
        .map(([sid, rev]) => ({ name: supMap.get(sid) || sid.slice(0, 8), revenue: rev, share: perTotal > 0 ? (rev / perTotal) * 100 : 0 }))
        .filter(c => !c.name.toLowerCase().includes("nice"))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      trendPoints.push({ period: per.label, clientRevenue: perClient, clientShare: perClientShare, competitors: perComps });
    }

    // ── NEW: Head-to-Head ──
    const niceProdMap = new Map<string, { revenue: number; units: number }>();
    for (const r of niceRows) {
      if (!r.product_id) continue;
      const pName = prodMap.get(r.product_id) || r.product_id.slice(0, 8);
      const prev = niceProdMap.get(pName) || { revenue: 0, units: 0 };
      prev.revenue += Number(r.total_amount) || 0;
      prev.units += Number(r.quantity) || 0;
      niceProdMap.set(pName, prev);
    }

    const h2hComparisons: H2HComparison[] = [];
    for (const comp of top5) {
      const compId = nameToSupId.get(comp.name);
      if (!compId) continue;
      const compRows2 = rows.filter((r: any) => r.supplier_id === compId);
      const compTotal = compRows2.reduce((s: number, r: any) => s + Number(r.total_amount), 0);
      const compProdMap = new Map<string, { revenue: number; units: number }>();
      for (const r of compRows2) {
        if (!r.product_id) continue;
        const pName = prodMap.get(r.product_id) || r.product_id.slice(0, 8);
        const prev = compProdMap.get(pName) || { revenue: 0, units: 0 };
        prev.revenue += Number(r.total_amount) || 0;
        prev.units += Number(r.quantity) || 0;
        compProdMap.set(pName, prev);
      }

      const allProducts = new Set([...niceProdMap.keys(), ...compProdMap.keys()]);
      const products: H2HProduct[] = Array.from(allProducts).map(pName => {
        const cr = niceProdMap.get(pName)?.revenue || 0;
        const cv = compProdMap.get(pName)?.revenue || 0;
        const cu = niceProdMap.get(pName)?.units || 0;
        const cvu = compProdMap.get(pName)?.units || 0;
        return { name: pName, clientRevenue: cr, competitorRevenue: cv, clientUnits: cu, competitorUnits: cvu, winner: cr > cv ? "client" as const : cv > cr ? "competitor" as const : "tie" as const };
      });

      const h2hTotal = niceTotal + compTotal;
      h2hComparisons.push({
        competitorName: comp.name,
        clientRevenue: niceTotal,
        competitorRevenue: compTotal,
        clientShare: h2hTotal > 0 ? (niceTotal / h2hTotal) * 100 : 0,
        competitorShare: h2hTotal > 0 ? (compTotal / h2hTotal) * 100 : 0,
        clientSKUs: niceProdMap.size,
        competitorSKUs: compProdMap.size,
        winningProducts: products.filter(p => p.winner === "client").length,
        totalProducts: products.length,
        products,
      });
    }

    // ── Create report row in DB ──
    const { data: reportRow } = await admin.from("reports").insert({
      project_id: null, client_id: NICE_CLIENT_ID, title: `${catName} — Full Market Analysis`,
      type: "category_analysis", kind: "ai_summary",
      content: JSON.stringify({ category: catName, totalSuppliers: supplierRank.length }),
      visible_to_client: false,
    }).select().single();
    if (!reportRow) { console.error("  Failed to create report"); continue; }
    console.log(`  Report: ${reportRow.id}`);

    // ── Build enriched data ──
    const mapSupplierRank = (s: any) => ({ rank: s.rank, name: s.name, revenue: s.revenue, units: s.units, share: s.share, isClient: s.isClient });
    const mapBranchMS = (b: any) => ({ branch: b.branch, suppliers: b.suppliers.map((s: any) => ({ name: s.name, revenue: s.revenue, units: s.units, share: s.share, isClient: s.isClient })) });
    const mapSupplierComp = (s: any) => ({ supplier: s.supplier, isClient: s.isClient, totalRevenue: s.totalRevenue, totalUnits: s.totalUnits, products: s.products.map((p: any) => ({ product: p.product, revenue: p.revenue, units: p.units })) });
    const mapBranchAn = (b: any) => ({ branch: b.branch, totalRevenue: b.totalRevenue, totalUnits: b.totalUnits, totalTransactions: b.totalTransactions, clientRevenue: b.clientRevenue, clientUnits: b.clientUnits, clientShare: b.clientShare, avgRevenuePerTransaction: b.avgRevenuePerTransaction });

    const enrichedData: EnrichedReportData = {
      categoryName: catName, clientName: clientDisplayName,
      categoryTotal, categoryUnits, clientTotal: niceTotal, clientUnits: niceUnits, clientShare: niceShare,
      clientRank: clientRank?.rank || 0, totalSuppliers: supplierRank.length,
      supplierRank: supplierRank.map(mapSupplierRank),
      branchMarketShare: branchMarketShare.map(mapBranchMS),
      supplierCompetition: supplierCompetition.map(mapSupplierComp),
      branchAnalysis: branchAnalysis.map(mapBranchAn),
      bestBranch: bestBranch ? mapBranchAn(bestBranch) : null,
      worstBranch: worstBranch ? mapBranchAn(worstBranch) : null,
    };

    const dominanceData: BranchDominanceData = { categoryName: catName, clientName: clientDisplayName, branches: branchDominance };
    const trendData: MoMTrendData = { categoryName: catName, clientName: clientDisplayName, trendPoints };
    const h2hData: H2HData = { categoryName: catName, clientName: clientDisplayName, comparisons: h2hComparisons };
    const shiftData: ShareShiftData = {
      categoryName: catName, clientName: clientDisplayName,
      currentPeriodLabel: currentLabel, previousPeriodLabel: previousLabel, shifts: shareShifts,
    };

    // ── Industry report schema for report #8 ──
    const enrichedInput = {
      categoryName: catName,
      clientName: clientDisplayName,
      categoryTotal,
      categoryUnits,
      clientTotal: niceTotal,
      clientUnits: niceUnits,
      clientShare: niceShare,
      clientRank: clientRank?.rank || 0,
      totalSuppliers: supplierRank.length,
      supplierRank: supplierRank.map(mapSupplierRank),
      branchAnalysis: branchAnalysis.map((b: any) => ({
        branch: b.branch, totalRevenue: b.totalRevenue, clientRevenue: b.clientRevenue, clientShare: b.clientShare,
      })),
      branchMarketShare: branchMarketShare.map(mapBranchMS),
      supplierCompetition: supplierCompetition.map(mapSupplierComp),
    };
    const reportSchema = computeReportSchema(enrichedInput, FMCG_INDUSTRY, perRowsSafe.map(p => p.label).join(", "));

    // ── All 8 reports ──
    const allReports: { name: string; gen: () => any }[] = [
      { name: `${catName} — Market Share Report`, gen: () => generateEnrichedMarketShareReport(enrichedData) },
      { name: `${catName} — Supplier Competition Report`, gen: () => generateEnrichedSupplierCompetitionReport(enrichedData) },
      { name: `${catName} — Branch Performance Report`, gen: () => generateEnrichedBranchAnalysisReport(enrichedData) },
      { name: `${catName} — Supplier Dominance by Branch`, gen: () => generateSupplierDominanceReport(dominanceData) },
      { name: `${catName} — Share Shift Analysis`, gen: () => generateShareShiftReport(shiftData) },
      { name: `${catName} — MoM Trend Analysis`, gen: () => generateMoMTrendReport(trendData) },
      { name: `${catName} — Head-to-Head Comparison`, gen: () => generateHeadToHeadReport(h2hData) },
      { name: `${catName} — Market Analysis (uniform schema)`, gen: () => generateIndustryReport(reportSchema) },
    ];

    const createdDocs: { id: string; name: string }[] = [];
    for (const spec of allReports) {
      const pdfDoc = spec.gen();
      const publicUrl = await uploadPdf(admin, bucket, spec.name, pdfDoc);
      if (!publicUrl) continue;
      console.log(`  PDF: ${spec.name}`);

      const { data: doc } = await admin.from("documents").insert({
        project_id: null, client_id: NICE_CLIENT_ID,
        name: spec.name, type: "pdf", url: publicUrl,
        visible_to_client: true, source_report_id: reportRow.id,
      }).select().single();
      if (doc) createdDocs.push({ id: doc.id, name: doc.name });
    }

    // ── Notifications ──
    if (createdDocs.length > 0) {
      await admin.from("notifications").insert(createdDocs.map(d => ({
        client_id: NICE_CLIENT_ID, user_id: null, type: "deliverable",
        title: "New report available", message: d.name,
        link: "/portal/deliverables", read: false,
      })));
    }
    console.log(`  Created ${createdDocs.length}/8 documents`);
  }
  console.log("\n✅ All done");
}

main().catch(err => { console.error(err); process.exit(1); });
