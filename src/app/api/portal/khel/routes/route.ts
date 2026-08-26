import { NextResponse } from "next/server";
import { createCensusClient } from "@/lib/supabase/census";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const group = searchParams.get("group"); // A-G filter

    const db = createCensusClient();

    // ── Routes ─────────────────────────────────────────────────
    let routesQ = db
      .from("routes_master")
      .select("id,route_id,route_name,group_name,rep_email,lead_email,rep_name,lead_name,vehicle_type,driver_name,driver_phone,contact_person,contact_phone,route_category")
      .order("group_name", { ascending: true })
      .order("route_name", { ascending: true });

    if (group) routesQ = routesQ.eq("group_name", group);

    const { data: routes } = await routesQ;

    // ── Outlets with GPS (for map pins) ────────────────────────
    const { data: outlets } = await db
      .from("outlets")
      .select("id,business_name,channel,outlet_type,gps_lat,gps_lng,ward,constituency,county,size_tier,created_by")
      .is("deleted_at", null)
      .not("gps_lat", "is", null);

    // ── Reps (for group mapping) ───────────────────────────────
    const { data: reps } = await db
      .from("reps")
      .select("id,full_name,group_name");

    // ── Group stats ────────────────────────────────────────────
    const groupStats = (routes || []).reduce(
      (acc: Record<string, { routeCount: number; repName: string; leadName: string }>, r) => {
        if (!acc[r.group_name]) {
          acc[r.group_name] = { routeCount: 0, repName: r.rep_name, leadName: r.lead_name };
        }
        acc[r.group_name].routeCount++;
        return acc;
      },
      {},
    );

    // ── Outlet pins per group ──────────────────────────────────
    const groupRepsMap: Record<string, Set<string>> = {};
    for (const r of reps || []) {
      const g = r.group_name;
      if (!groupRepsMap[g]) groupRepsMap[g] = new Set();
      groupRepsMap[g].add(r.id);
    }

    const outletPins = (outlets || []).map((o) => ({
      id: o.id,
      name: o.business_name,
      channel: o.channel,
      type: o.outlet_type,
      lat: o.gps_lat,
      lng: o.gps_lng,
      ward: o.ward,
      constituency: o.constituency,
      county: o.county,
      size: o.size_tier,
    }));

    return NextResponse.json({
      routes: routes || [],
      groupStats,
      outletPins,
      totalRoutes: (routes || []).length,
      totalOutlets: outletPins.length,
    });
  } catch (err) {
    console.error("Routes API error:", err);
    return NextResponse.json({ error: "Failed to load routes data" }, { status: 500 });
  }
}
