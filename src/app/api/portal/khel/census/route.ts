import { NextResponse } from "next/server";
import { createCensusClient } from "@/lib/supabase/census";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getAuthenticatedClient, getCurrentUser, isStaff } from "@/lib/supabase/api";
import { hasValidGps } from "@/lib/geo";

export async function GET(req: Request) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const group = searchParams.get("group"); // A-G filter
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const aggregate = searchParams.get("aggregate");

    // ?aggregate=cube fast path: read MVs when present, fallback to live query
    if (aggregate === "cube") {
      try {
        const db2 = await createCensusClient();
        const mvCensus = await db2.from("mv_census_cube").select("*").limit(5000);
        const mvVisit = await db2.from("mv_visit_cube").select("*").limit(5000);
        if (!mvCensus.error && !mvVisit.error && mvCensus.data && mvVisit.data) {
          // honour from/to on day
          let cRows = mvCensus.data as { county: string; ward: string; channel: string; outlet_type: string; day: string; outlet_count: number }[];
          let vRows = mvVisit.data as { rep_id: string; zone: string; outcome: string; status: string; day: string; visit_count: number; order_count: number; order_value_sum: number }[];
          if (from) { cRows = cRows.filter((r) => r.day >= from.slice(0,10)); vRows = vRows.filter((r) => r.day >= from.slice(0,10)); }
          if (to) { cRows = cRows.filter((r) => r.day <= to.slice(0,10)); vRows = vRows.filter((r) => r.day <= to.slice(0,10)); }
          const byChannel: Record<string, number> = {};
          const byType: Record<string, number> = {};
          const byCounty: Record<string, number> = {};
          const byWard: Record<string, number> = {};
          let totalOutlets = 0;
          for (const r of cRows) { byChannel[r.channel]=(byChannel[r.channel]||0)+r.outlet_count; byType[r.outlet_type]=(byType[r.outlet_type]||0)+r.outlet_count; byCounty[r.county]=(byCounty[r.county]||0)+r.outlet_count; byWard[r.ward]=(byWard[r.ward]||0)+r.outlet_count; totalOutlets+=r.outlet_count; }
          const byVisitStatus: Record<string, number> = {};
          const byOutcome: Record<string, number> = {};
          let totalVisits=0, totalOrders=0, totalOrderValue=0;
          const timeline: Record<string, number> = {};
          for (const r of vRows) { byVisitStatus[r.status]=(byVisitStatus[r.status]||0)+r.visit_count; byOutcome[r.outcome]=(byOutcome[r.outcome]||0)+r.visit_count; totalVisits+=r.visit_count; totalOrders+=r.order_count; totalOrderValue+=Number(r.order_value_sum||0); timeline[r.day]=(timeline[r.day]||0)+r.visit_count; }
          return NextResponse.json({
            outlets: { total: totalOutlets, byChannel, byType, byCounty, byWard, mapPins: [] },
            visits: { total: totalVisits, byStatus: byVisitStatus, byOutcome, totalOrders, totalOrderValue, timeline: Object.entries(timeline).sort(([a],[b])=>a.localeCompare(b)).map(([date,count])=>({date,count})) },
            submissions: { total: 0 },
            reps: { total: 0, byGroup: [] },
            _cube: true,
          });
        }
      } catch {}
      // fall through to live query
    }

    const db = await createCensusClient();

    // ── Outlets ────────────────────────────────────────────────
    const { data: outlets } = await db
      .from("outlets")
      .select("id,business_name,channel,outlet_type,gps_lat,gps_lng,county,constituency,ward,beat,size_tier,created_at,created_by,batch_id")
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
      .select("id,enumerator_id,submission_date,outlet_count,visit_count,status,created_at");

    // ── Reps (for name resolution) ─────────────────────────────
    const { data: reps } = await db
      .from("reps")
      .select("id,name,phone,email,zone");

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

    const fOutlets = filteredRepIds
      ? (outlets || []).filter((o) => filteredRepIds!.has(o.created_by))
      : outlets || [];
    const fVisits = filteredRepIds
      ? (visits || []).filter((v) => filteredRepIds!.has(v.rep_id))
      : visits || [];
    const fSubs = filteredRepIds
      ? (submissions || []).filter((s) => filteredRepIds!.has(s.enumerator_id))
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

    // Outlets with GPS (for map) — Kenya band only, never (0,0) or null
    const mapPins = fOutlets
      .filter(hasValidGps)
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
        batchId: o.batch_id || null,
      }));

    // Reps per route group (A-G), counted by distinct rep emails in routes_master
    const { data: routesAll } = await db
      .from("routes_master")
      .select("group_name,rep_email")
      .eq("active", true);

    const perGroup: Record<string, Set<string>> = {};
    for (const r of routesAll || []) {
      if (!r.rep_email) continue;
      perGroup[r.group_name] = perGroup[r.group_name] || new Set();
      perGroup[r.group_name].add(r.rep_email);
    }

    const repsByGroup = Object.entries(perGroup)
      .map(([groupName, emails]) => ({ group: groupName, count: emails.size }))
      .sort((x, y) => x.group.localeCompare(y.group));

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
        byGroup: repsByGroup,
      },
    });
  } catch (err) {
    console.error("Census API error:", err);
    return NextResponse.json({ error: "Failed to load census data" }, { status: 500 });
  }
}