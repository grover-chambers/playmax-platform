import { NextResponse } from "next/server";
import { createCensusClient } from "@/lib/supabase/census";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const group = searchParams.get("group");
    const status = searchParams.get("status");
    const repId = searchParams.get("rep_id");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 500);

    const db = await createCensusClient();

    // ── Batches ─────────────────────────────────────────────────
    let batchesQ = db
      .from("census_batches")
      .select("id,rep_id,device_id,batch_number,started_at,submitted_at,synced_at,record_count,quality_flags,status,created_at")
      .order("started_at", { ascending: false })
      .limit(limit);

    if (status) batchesQ = batchesQ.eq("status", status);
    if (repId) batchesQ = batchesQ.eq("rep_id", repId);

    const { data: batches, error: batchesErr } = await batchesQ;
    if (batchesErr) {
      console.error("Batches query error:", batchesErr);
      // Table may not exist yet — return empty rather than 500
      return NextResponse.json({ batches: [], reps: [], total: 0 });
    }

    // ── Reps (name resolution) ──────────────────────────────────
    const { data: reps } = await db
      .from("reps")
      .select("id,name,email,zone");

    const nameById: Record<string, string> = {};
    for (const r of reps || []) {
      nameById[r.id] = r.name;
    }

    // ── Group filter: route groups map to reps via routes_master ──
    let filteredRepIds: Set<string> | null = null;
    if (group) {
      const { data: groupRoutes } = await db
        .from("routes_master")
        .select("rep_email")
        .eq("group_name", group)
        .eq("active", true);

      const emails = new Set(
        (groupRoutes || []).map((r) => r.rep_email).filter(Boolean) as string[],
      );
      filteredRepIds = new Set(
        (reps || []).filter((r) => emails.has(r.email)).map((r) => r.id),
      );
    }

    const filteredBatches = filteredRepIds
      ? (batches || []).filter((b) => filteredRepIds!.has(b.rep_id))
      : batches || [];

    // ── Enrich with rep name + per-batch outlet/visit counts ────
    const enriched = await Promise.all(
      filteredBatches.map(async (b) => {
        const [outletCount, visitCount] = await Promise.all([
          db.from("outlets").select("id", { count: "exact", head: true }).eq("batch_id", b.id),
          db.from("visits").select("id", { count: "exact", head: true }).eq("batch_id", b.id),
        ]);
        return {
          ...b,
          rep_name: nameById[b.rep_id] || "Unknown",
          outlet_count: outletCount.count ?? 0,
          visit_count: visitCount.count ?? 0,
        };
      }),
    );

    // ── Aggregate stats ─────────────────────────────────────────
    const totalBatches = enriched.length;
    const byStatus: Record<string, number> = {};
    let totalOutlets = 0;
    let totalVisits = 0;
    for (const b of enriched) {
      byStatus[b.status || "draft"] = (byStatus[b.status || "draft"] || 0) + 1;
      totalOutlets += b.outlet_count;
      totalVisits += b.visit_count;
    }

    return NextResponse.json({
      batches: enriched,
      reps: reps || [],
      total: totalBatches,
      stats: { totalBatches, byStatus, totalOutlets, totalVisits },
    });
  } catch (err) {
    console.error("Batches API error:", err);
    return NextResponse.json({ error: "Failed to load batches" }, { status: 500 });
  }
}
