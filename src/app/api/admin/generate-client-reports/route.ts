import { NextResponse } from "next/server";
import { getAuthenticatedClient, getCurrentUser, isAdmin } from "@/lib/supabase/api";
import { getAdminClient } from "@/lib/supabase/admin";
import { sanitizeError } from "@/lib/errors";
import { query } from "@/lib/db";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { withLogging } from "@/lib/request-log";
import {
  generateEnrichedMarketShareReport,
  generateEnrichedSupplierCompetitionReport,
  generateEnrichedBranchAnalysisReport,
  type EnrichedReportData,
} from "@/lib/pdf-reports";
import {
  getClientById,
  findSupplierByName,
  getSharingRecords,
  getCategoriesByIds,
  getAllBranchesPg,
  getAllProductsPg,
  getAllSuppliersPg,
  fetchAllSalesFallback,
  insertReportPg,
  insertDocumentPg,
  insertNotificationsPg,
} from "@/lib/db-fallback";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const POST = withLogging(async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isAdmin(currentUser.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit + per-user concurrency guard keyed on the admin user id.
    const rl = await rateLimit(
      "admin-generate-client-reports",
      request,
      { windowSec: 300, maxRequests: 5 },
      currentUser.id,
    );
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

    try {
      await query("INSERT INTO report_generation_locks (client_id) VALUES ($1)", [currentUser.id]);
    } catch (lockErr) {
      if ((lockErr as { code?: string })?.code === "23505") {
        return NextResponse.json(
          {
            error: {
              code: "already_generating",
              message:
                "Report generation is already in progress for this user. Please wait.",
            },
          },
          { status: 429 },
        );
      }
      throw lockErr;
    }

    try {
      const { client_id } = await request.json();
    if (!client_id) {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. Fetch client info and sharing records (with pg fallback)
    const client = await getClientById(admin, client_id);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    // Find matching supplier — all clients are suppliers
    const clientCompany = (client.company || client.name || "").trim();
    const matchingSupplier = await findSupplierByName(admin, clientCompany);
    const clientSupplierId = matchingSupplier?.id || null;
    if (!clientSupplierId) {
      return NextResponse.json({ error: `No supplier found matching "${clientCompany}". Add them to analytics_suppliers first.` }, { status: 400 });
    }

    const sharing = await getSharingRecords(admin, client_id);

    if (!sharing || sharing.length === 0) {
      return NextResponse.json({ error: "No analytics sharing configured for this client" }, { status: 400 });
    }

    const periodIds = [...new Set(sharing.map((s) => s.period_id))];
    const categoryIds = [...new Set(sharing.map((s) => s.category_id).filter(Boolean))] as string[];

    // 2. Fetch reference data (with pg fallback)
    const catRows = await getCategoriesByIds(admin, categoryIds);
    const catMap = new Map((catRows ?? []).map((c) => [c.id, c.name]));
    const supRows = await getAllSuppliersPg();
    const supMap = new Map((supRows ?? []).map((s) => [s.id, s.name]));
    const brRows = await getAllBranchesPg();
    const brMap = new Map((brRows ?? []).map((b) => [b.id, b.name]));
    const prodRows = await getAllProductsPg();
    const prodMap = new Map((prodRows ?? []).map((p) => [p.id, p.name]));

    const createdDocs: { id: string; name: string; category: string }[] = [];
    const generatedReports: Record<string, unknown>[] = [];

    for (const catId of categoryIds) {
      const catName = catMap.get(catId) || `Category-${catId}`;
      const rows = await fetchAllSalesFallback(admin, periodIds, catId);
      if (rows.length === 0) continue;

      // Compute aggregates
      const categoryTotal = rows.reduce((s, r) => s + Number(r.total_amount), 0);
      const categoryUnits = rows.reduce((s, r) => s + Number(r.quantity), 0);
      const niceRows = rows.filter((r) => r.supplier_id === clientSupplierId);
      const niceTotal = niceRows.reduce((s, r) => s + Number(r.total_amount), 0);
      const niceUnits = niceRows.reduce((s, r) => s + Number(r.quantity), 0);
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
      const categorySupplierRank = Array.from(supAgg.entries())
        .map(([sid, d]) => ({
          rank: 0,
          name: supMap.get(sid) || sid.slice(0, 8),
          revenue: d.revenue,
          units: d.units,
          share: categoryTotal > 0 ? (d.revenue / categoryTotal) * 100 : 0,
          isClient: sid === clientSupplierId,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .map((item, i) => ({ ...item, rank: i + 1 }));

      const clientRank = categorySupplierRank.find((s) => s.isClient);

      // Per-branch supplier breakdown
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
          const bTotal = Array.from(sups.values()).reduce((s, v) => s + v.revenue, 0);
          const suppliers = Array.from(sups.entries())
            .map(([sid, d]) => ({
              name: supMap.get(sid) || sid.slice(0, 8),
              revenue: d.revenue, units: d.units,
              share: bTotal > 0 ? (d.revenue / bTotal) * 100 : 0,
              isClient: sid === clientSupplierId,
            }))
            .sort((a, b) => b.revenue - a.revenue);
          return { branch: bName, suppliers };
        })
        .sort((a, b) => b.suppliers.reduce((s, v) => s + v.revenue, 0) - a.suppliers.reduce((s, v) => s + v.revenue, 0));

      // Supplier competition per product
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
        .map(([sName, prods]) => {
          const products = Array.from(prods.entries())
            .map(([pName, d]) => ({ product: pName, revenue: d.revenue, units: d.units }))
            .sort((a, b) => b.revenue - a.revenue);
          return {
            supplier: sName,
            isClient: sName.toLowerCase().includes(clientCompany.toLowerCase().slice(0, 8)),
            totalRevenue: products.reduce((s, p) => s + p.revenue, 0),
            totalUnits: products.reduce((s, p) => s + p.units, 0),
            products,
          };
        })
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Branch analysis
      const brAgg = new Map<string, { revenue: number; units: number; transactions: number }>();
      for (const r of rows) {
        if (!r.branch_id) continue;
        const bName = brMap.get(r.branch_id) || r.branch_id.slice(0, 8);
        const prev = brAgg.get(bName) || { revenue: 0, units: 0, transactions: 0 };
        prev.revenue += Number(r.total_amount) || 0;
        prev.units += Number(r.quantity) || 0;
        prev.transactions += 1;
        brAgg.set(bName, prev);
      }
      const niceBrAgg = new Map<string, { revenue: number; units: number; transactions: number }>();
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
      const bestBranch = branchAnalysis.length > 0 ? branchAnalysis.reduce((a, b) => a.clientRevenue > b.clientRevenue ? a : b) : null;
      const worstBranch = branchAnalysis.length > 0 ? branchAnalysis.reduce((a, b) => a.clientRevenue < b.clientRevenue ? a : b) : null;

      const analysis = {
        category: catName,
        categoryTotal,
        categoryUnits,
        clientTotal: niceTotal,
        clientUnits: niceUnits,
        clientShare: niceShare,
        clientRank: clientRank?.rank || 0,
        totalSuppliers: categorySupplierRank.length,
        categorySupplierRank,
        branchMarketShare,
        supplierCompetition,
        branchAnalysis,
        bestBranch,
        worstBranch,
      };
      generatedReports.push(analysis);

      // 6. Create reports row (with pg fallback)
      const reportRow = await insertReportPg({
        client_id,
        title: `${catName} — Market Analysis`,
        type: "category_analysis",
        kind: "ai_summary",
        content: JSON.stringify(analysis),
        visible_to_client: false,
      });

      if (!reportRow) continue;

      // 7. Generate PDFs and upload to storage
      const enrichedData: EnrichedReportData = {
        categoryName: catName,
        clientName: client.company || client.name || "Client",
        categoryTotal,
        categoryUnits,
        clientTotal: niceTotal,
        clientUnits: niceUnits,
        clientShare: niceShare,
        clientRank: clientRank?.rank || 0,
        totalSuppliers: categorySupplierRank.length,
        supplierRank: categorySupplierRank.map((s) => ({
          rank: s.rank,
          name: s.name,
          revenue: s.revenue,
          units: s.units,
          share: s.share,
          isClient: s.isClient,
        })),
        branchMarketShare: branchMarketShare.map((b) => ({
          branch: b.branch,
          suppliers: b.suppliers.map((s) => ({
            name: s.name,
            revenue: s.revenue,
            units: s.units,
            share: s.share,
            isClient: s.isClient,
          })),
        })),
        supplierCompetition: supplierCompetition.map((s) => ({
          supplier: s.supplier,
          isClient: s.isClient,
          totalRevenue: s.totalRevenue,
          totalUnits: s.totalUnits,
          products: s.products,
        })),
        branchAnalysis: branchAnalysis.map((b) => ({
          branch: b.branch,
          totalRevenue: b.totalRevenue,
          totalUnits: b.totalUnits,
          totalTransactions: b.totalTransactions,
          clientRevenue: b.clientRevenue,
          clientUnits: b.clientUnits,
          clientShare: b.clientShare,
          avgRevenuePerTransaction: b.avgRevenuePerTransaction,
        })),
        bestBranch: bestBranch ? {
          branch: bestBranch.branch,
          totalRevenue: bestBranch.totalRevenue,
          totalUnits: bestBranch.totalUnits,
          totalTransactions: bestBranch.totalTransactions,
          clientRevenue: bestBranch.clientRevenue,
          clientUnits: bestBranch.clientUnits,
          clientShare: bestBranch.clientShare,
          avgRevenuePerTransaction: bestBranch.avgRevenuePerTransaction,
        } : null,
        worstBranch: worstBranch ? {
          branch: worstBranch.branch,
          totalRevenue: worstBranch.totalRevenue,
          totalUnits: worstBranch.totalUnits,
          totalTransactions: worstBranch.totalTransactions,
          clientRevenue: worstBranch.clientRevenue,
          clientUnits: worstBranch.clientUnits,
          clientShare: worstBranch.clientShare,
          avgRevenuePerTransaction: worstBranch.avgRevenuePerTransaction,
        } : null,
      };

      const docSpecs = [
        { name: `${catName} — Market Share Report`, gen: () => generateEnrichedMarketShareReport(enrichedData) },
        { name: `${catName} — Supplier Competition Report`, gen: () => generateEnrichedSupplierCompetitionReport(enrichedData) },
        { name: `${catName} — Branch Performance Report`, gen: () => generateEnrichedBranchAnalysisReport(enrichedData) },
      ];

      const bucket = process.env.STORAGE_BUCKET || "research-reports";
      const createdDocsForCategory: { id: string; name: string }[] = [];
      const notifsData: { client_id: string; user_id: null; type: string; title: string; message: string; link: string; read: boolean }[] = [];

      for (const spec of docSpecs) {
        const pdfDoc = spec.gen();
        const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));
        const filename = `client-${client_id.slice(0, 8)}-${spec.name.replace(/[^a-zA-Z0-9]/g, "_")}-${Date.now()}.pdf`;

        const { error: uploadErr } = await admin.storage
          .from(bucket)
          .upload(filename, pdfBuffer, { contentType: "application/pdf", upsert: true });

        if (uploadErr) {
          console.error(`Upload failed for ${spec.name}: ${uploadErr.message}`);
          continue;
        }
        const publicUrl = admin.storage.from(bucket).getPublicUrl(filename).data.publicUrl;

        const doc = await insertDocumentPg({
          client_id,
          name: spec.name,
          type: "pdf",
          url: publicUrl,
          visible_to_client: true,
          source_report_id: reportRow.id,
        });

        if (doc) {
          createdDocsForCategory.push({ id: doc.id, name: doc.name });
          notifsData.push({
            client_id,
            user_id: null,
            type: "deliverable",
            title: "New report available",
            message: doc.name,
            link: "/portal/deliverables",
            read: false,
          });
        }
      }

      if (notifsData.length > 0) {
        await insertNotificationsPg(notifsData);
      }
      for (const d of createdDocsForCategory) {
        createdDocs.push({ id: d.id, name: d.name, category: catName });
      }
    }

    return NextResponse.json({
      success: true,
      clientName: client.company || client.name,
      supplierId: clientSupplierId,
      categoriesProcessed: generatedReports.length,
      documentsCreated: createdDocs.length,
      documents: createdDocs,
      reports: generatedReports,
    });
    } finally {
      await query(
        "DELETE FROM report_generation_locks WHERE client_id = $1",
        [currentUser.id],
      ).catch((lockErr) =>
        console.error(
          "[generate-client-reports] failed to release lock:",
          lockErr,
        ),
      );
    }
  } catch (e) {
    return NextResponse.json({ error: sanitizeError(e) }, { status: 500 });
  }
});
