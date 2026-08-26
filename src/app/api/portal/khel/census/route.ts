import { NextResponse } from "next/server";
import { createCensusClient } from "@/lib/supabase/census";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const group = searchParams.get("group"); // A-G filter
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const db = createCensusClient();

    // ── Outlets ────────────────────────────────────────────────
    const { data: outlets } = await db
      .from("outlets")
      .select("id,business_name,channel,outlet_type,gps_lat,gps_lng,county,constituency,ward,beat,size_tier,created_at,created_by")
      .is("deleted_at", null);

    // ── Visits ─────────────────────────────────────────────────
    let visitsQ = db
      .from("visits")
      .select("id,retailer_id,rep_id,check_in_at,status,outcome,order_placed,order_value,gps_lat,gps_lng,duration_min,photo_count,notes,created_at")
      .is("deleted_at", null);

    if (from) visitsQ = visitsQ.gte("check_in_at", from);
    if (to) visitsQ = visitsQ.lte("check_in_at", to);

    const { data: visits } = await visitsQ;

    // ── Daily submissions ──────────────────────────────────────
    const { data: submissions } = await db
      .from("daily_submissions")
      .select("id,rep_id,outlet_id,created_at")
      .is("deleted_at", null);

    // ── Reps (for name resolution) ─────────────────────────────
    const { data: reps } = await db
      .from("reps")
      .select("id,full_name,phone,group_name");

    // ── Group filter: find reps in group, then filter outlets/visits ──
    let filteredOutletIds: Set<string> | null = null;
    let filteredRepIds: Set<string> | null = null;

    if (group) {
      const groupReps = (reps || []).filter((r) => r.group_name === group);
      filteredRepIds = new Set(groupReps.map((r) => r.id));
      // Outlets created by group reps
      filteredOutletIds = new Set(
        (outlets || [])
          .filter((o) => filteredRepIds!.has(o.created_by))
          .map((o) => o.id),
      );
    }

    const fOutlets = filteredOutletIds
      ? (outlets || []).filter((o) => filteredOutletIds!.has(o.id))
      : outlets || [];
    const fVisits = filteredRepIds
      ? (visits || []).filter((v) => filteredRepIds!.has(v.rep_id))
      : visits || [];
    const fSubs = filteredRepIds
      ? (submissions || []).filter((s) => filteredRepIds!.has(s.rep_id))
      : submissions || [];

    // ── Aggregate ──────────────────────────────────────────────
    const byChannel: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byCounty: Record<string, number> = {};
    const byWard: Record<string, number> = {};
    for (const o of fOutlets) {
      byChannel[o.channel || "Unknown"] = (byChannel[o.channel || "Unknown"] || 0) + 1;
      byType[o.outlet_type || "Unknown"] = (byType[o.outlet_type || "Unknown"] || 0) + 1;
      byCounty[o.county || "Unknown"] = (byCounty[o.county || "Unknown"] || 0) + 1;
      byWard[o.ward || "Unknown"] = (byWard[o.ward || "Unknown"] || 0) + 1;
    }

    const byVisitStatus: Record<string, number> = {};
    const byOutcome: Record<string, number> = {};
    let totalOrders = 0;
    let totalOrderValue = 0;
    for (const v of fVisits) {
      byVisitStatus[v.status || "Unknown"] = (byVisitStatus[v.status || "Unknown"] || 0) + 1;
      if (v.outcome) byOutcome[v.outcome] = (byOutcome[v.outcome] || 0) + 1;
      if (v.order_placed) {
        totalOrders++;
        totalOrderValue += Number(v.order_value || 0);
      }
    }

    // Timeline: visits per day
    const timeline: Record<string, number> = {};
    for (const v of fVisits) {
      const day = v.check_in_at ? v.check_in_at.slice(0, 10) : v.created_at?.slice(0, 10);
      if (day) timeline[day] = (timeline[day] || 0) + 1;
    }

    // Outlets with GPS (for map)
    const mapPins = fOutlets
      .filter((o) => o.gps_lat && o.gps_lng)
      .map((o) => ({
        id: o.id,
        name: o.business_name,
        channel: o.channel,
        type: o.outlet_type,
        lat: o.gps_lat,
        lng: o.gps_lng,
        ward: o.ward,
        county: o.county,
        size: o.size_tier,
      }));

    return NextResponse.json({
      outlets: {
        total: fOutlets.length,
        byChannel,
        byType,
        byCounty,
        byWard,
        mapPins,
      },
      visits: {
        total: fVisits.length,
        byStatus: byVisitStatus,
        byOutcome,
        totalOrders,
        totalOrderValue,
        timeline: Object.entries(timeline)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count })),
      },
      submissions: {
        total: fSubs.length,
      },
      reps: {
        total: (reps || []).length,
        byGroup: Object.entries(
          (reps || []).reduce((acc: Record<string, number>, r) => {
            acc[r.group_name || "Unassigned"] = (acc[r.group_name || "Unassigned"] || 0) + 1;
            return acc;
          }, {}),
        )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([group, count]) => ({ group, count })),
      },
    });
  } catch (err) {
    console.error("Census API error:", err);
    return NextResponse.json({ error: "Failed to load census data" }, { status: 500 });
  }
}
