const { createClient } = require("@supabase/supabase-js");

const NICE_CLIENT_ID = "e2f9301b-e1ea-4026-886f-7f44e55770b5";
const NICE_SUPPLIER_ID = "b2fba4d1-4df1-472e-9f5b-387561cae77b";

async function fetchAll(admin, periodIds, categoryId) {
  const all = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data } = await admin
      .from("analytics_fact_sales")
      .select("id, quantity, total_amount, supplier_id, branch_id, product_id")
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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing env vars");
  const admin = createClient(url, key);

  const { data: client } = await admin.from("clients").select("id, name, company").eq("id", NICE_CLIENT_ID).single();
  if (!client) { console.error("Client not found"); return; }
  console.log("Client:", client.company || client.name);

  const { data: sharing } = await admin
    .from("portal_analytics_sharing")
    .select("period_id, category_id")
    .eq("client_id", NICE_CLIENT_ID)
    .eq("visible", true);
  if (!sharing || sharing.length === 0) { console.error("No sharing"); return; }
  const periodIds = [...new Set(sharing.map(s => s.period_id))];
  const categoryIds = [...new Set(sharing.map(s => s.category_id).filter(Boolean))];
  console.log(`Categories: ${categoryIds.length}, Periods: ${periodIds.length}`);

  const { data: catRows } = await admin.from("analytics_categories").select("id, name").in("id", categoryIds);
  const catMap = new Map((catRows ?? []).map(c => [c.id, c.name]));
  const { data: supRows } = await admin.from("analytics_suppliers").select("id, name");
  const supMap = new Map((supRows ?? []).map(s => [s.id, s.name]));
  const { data: brRows } = await admin.from("analytics_branches").select("id, name");
  const brMap = new Map((brRows ?? []).map(b => [b.id, b.name]));
  const { data: prodRows } = await admin.from("analytics_products").select("id, name");
  const prodMap = new Map((prodRows ?? []).map(p => [p.id, p.name]));

  for (const catId of categoryIds) {
    const catName = catMap.get(catId) || `Category-${catId}`;
    console.log(`\n--- ${catName} ---`);

    const rows = await fetchAll(admin, periodIds, catId);
    console.log(`  Rows: ${rows.length}`);

    if (rows.length === 0) continue;

    // Compute aggregates from all rows
    const categoryTotal = rows.reduce((s, r) => s + Number(r.total_amount), 0);
    const categoryUnits = rows.reduce((s, r) => s + Number(r.quantity), 0);
    const niceRows = rows.filter(r => r.supplier_id === NICE_SUPPLIER_ID);
    const niceTotal = niceRows.reduce((s, r) => s + Number(r.total_amount), 0);
    const niceUnits = niceRows.reduce((s, r) => s + Number(r.quantity), 0);
    const niceShare = categoryTotal > 0 ? (niceTotal / categoryTotal) * 100 : 0;

    // Supplier ranking
    const supAgg = new Map();
    for (const r of rows) {
      if (!r.supplier_id) continue;
      const prev = supAgg.get(r.supplier_id) || { revenue: 0, units: 0 };
      prev.revenue += Number(r.total_amount) || 0;
      prev.units += Number(r.quantity) || 0;
      supAgg.set(r.supplier_id, prev);
    }
    const supplierRank = Array.from(supAgg.entries())
      .map(([sid, d]) => ({
        rank: 0, name: supMap.get(sid) || sid.slice(0, 8),
        revenue: d.revenue, units: d.units,
        share: categoryTotal > 0 ? (d.revenue / categoryTotal) * 100 : 0,
        isClient: sid === NICE_SUPPLIER_ID,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .map((item, i) => ({ ...item, rank: i + 1 }));
    const clientRank = supplierRank.find(s => s.isClient);
    console.log(`  NICE: KES ${niceTotal.toFixed(0)}, Share: ${niceShare.toFixed(1)}%, Rank: ${clientRank?.rank || "N/A"}/${supplierRank.length}`);

    // Per-branch supplier breakdown
    const brSup = new Map();
    for (const r of rows) {
      if (!r.supplier_id || !r.branch_id) continue;
      const bName = brMap.get(r.branch_id) || r.branch_id.slice(0, 8);
      if (!brSup.has(bName)) brSup.set(bName, new Map());
      const sm = brSup.get(bName);
      const prev = sm.get(r.supplier_id) || { revenue: 0, units: 0 };
      prev.revenue += Number(r.total_amount) || 0;
      prev.units += Number(r.quantity) || 0;
      sm.set(r.supplier_id, prev);
    }
    const branchMarketShare = Array.from(brSup.entries())
      .map(([bName, sups]) => {
        const bTotal = Array.from(sups.values()).reduce((s, v) => s + v.revenue, 0);
        const suppliers = Array.from(sups.entries())
          .map(([sid, d]) => ({
            name: supMap.get(sid) || sid.slice(0, 8),
            revenue: d.revenue, units: d.units,
            share: bTotal > 0 ? (d.revenue / bTotal) * 100 : 0,
            isClient: sid === NICE_SUPPLIER_ID,
          }))
          .sort((a, b) => b.revenue - a.revenue);
        return { branch: bName, suppliers };
      })
      .sort((a, b) => b.suppliers.reduce((s, v) => s + v.revenue, 0) - a.suppliers.reduce((s, v) => s + v.revenue, 0));

    // Supplier competition per product
    const supProd = new Map();
    for (const r of rows) {
      if (!r.supplier_id || !r.product_id) continue;
      const sName = supMap.get(r.supplier_id) || r.supplier_id.slice(0, 8);
      if (!supProd.has(sName)) supProd.set(sName, new Map());
      const pm = supProd.get(sName);
      const pName = prodMap.get(r.product_id) || r.product_id.slice(0, 8);
      const prev = pm.get(pName) || { revenue: 0, units: 0 };
      prev.revenue += Number(r.total_amount) || 0;
      prev.units += Number(r.quantity) || 0;
      pm.set(pName, prev);
    }
    const supplierCompetition = Array.from(supProd.entries())
      .map(([sName, prods]) => {
        const products = Array.from(prods.entries())
          .map(([pName, d]) => ({ product: pName, revenue: d.revenue, units: d.units }))
          .sort((a, b) => b.revenue - a.revenue);
        return {
          supplier: sName,
          isClient: sName.toLowerCase().includes("nice"),
          totalRevenue: products.reduce((s, p) => s + p.revenue, 0),
          totalUnits: products.reduce((s, p) => s + p.units, 0),
          products,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Branch analysis
    const brAgg = new Map();
    for (const r of rows) {
      if (!r.branch_id) continue;
      const bName = brMap.get(r.branch_id) || r.branch_id.slice(0, 8);
      const prev = brAgg.get(bName) || { revenue: 0, units: 0, transactions: 0 };
      prev.revenue += Number(r.total_amount) || 0;
      prev.units += Number(r.quantity) || 0;
      prev.transactions += 1;
      brAgg.set(bName, prev);
    }
    const niceBrAgg = new Map();
    for (const r of niceRows) {
      if (!r.branch_id) continue;
      const bName = brMap.get(r.branch_id) || r.branch_id.slice(0, 8);
      const prev = niceBrAgg.get(bName) || { revenue: 0, units: 0, transactions: 0 };
      prev.revenue += Number(r.total_amount) || 0;
      prev.units += Number(r.quantity) || 0;
      prev.transactions += 1;
      niceBrAgg.set(bName, prev);
    }
    const branchAnalysis = Array.from(brAgg.entries())
      .map(([bName, d]) => {
        const n = niceBrAgg.get(bName);
        return {
          branch: bName,
          totalRevenue: d.revenue,
          totalUnits: d.units,
          totalTransactions: d.transactions,
          clientRevenue: n?.revenue || 0,
          clientUnits: n?.units || 0,
          clientShare: d.revenue > 0 ? ((n?.revenue || 0) / d.revenue) * 100 : 0,
          avgRevenuePerTransaction: d.transactions > 0 ? d.revenue / d.transactions : 0,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
    const bestBranch = branchAnalysis.reduce((a, b) => a.clientRevenue > b.clientRevenue ? a : b, branchAnalysis[0]);
    const worstBranch = branchAnalysis.reduce((a, b) => a.clientRevenue < b.clientRevenue ? a : b, branchAnalysis[0]);

    // Insert report row
    const { data: reportRow } = await admin
      .from("reports")
      .insert({
        project_id: null,
        client_id: NICE_CLIENT_ID,
        title: `${catName} — Market Analysis`,
        type: "category_analysis",
        kind: "ai_summary",
        content: JSON.stringify({
          category: catName, categoryTotal, categoryUnits,
          clientTotal: niceTotal, clientUnits: niceUnits, clientShare: niceShare,
          clientRank: clientRank?.rank || 0,
          totalSuppliers: supplierRank.length, categorySupplierRank: supplierRank,
          branchMarketShare, supplierCompetition, branchAnalysis, bestBranch, worstBranch,
        }),
        visible_to_client: false,
      })
      .select()
      .single();
    if (!reportRow) { console.error("  Failed to create report"); continue; }
    console.log(`  Report: ${reportRow.id}`);

    // Insert documents
    const docs = [
      {
        project_id: null, client_id: NICE_CLIENT_ID,
        name: `${catName} — Market Share Report`,
        type: "pdf",
        url: `data:application/json,${encodeURIComponent(JSON.stringify({ category: catName, categorySupplierRank: supplierRank, branchMarketShare, clientShare: niceShare, clientRank: clientRank?.rank }))}`,
        visible_to_client: true, source_report_id: reportRow.id,
      },
      {
        project_id: null, client_id: NICE_CLIENT_ID,
        name: `${catName} — Supplier Competition Report`,
        type: "pdf",
        url: `data:application/json,${encodeURIComponent(JSON.stringify({ category: catName, supplierCompetition }))}`,
        visible_to_client: true, source_report_id: reportRow.id,
      },
      {
        project_id: null, client_id: NICE_CLIENT_ID,
        name: `${catName} — Branch Performance Report`,
        type: "pdf",
        url: `data:application/json,${encodeURIComponent(JSON.stringify({ category: catName, branchAnalysis, bestBranch, worstBranch }))}`,
        visible_to_client: true, source_report_id: reportRow.id,
      },
    ];
    const { data: ins } = await admin.from("documents").insert(docs).select();
    console.log(`  Created ${ins?.length || 0} documents`);
  }
  console.log("\n✅ Done");
}

main().catch(err => { console.error(err); process.exit(1); });
