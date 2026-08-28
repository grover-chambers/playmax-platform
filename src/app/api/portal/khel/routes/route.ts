import { NextResponse } from "next/server";
import { createCensusClient } from "@/lib/supabase/census";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const group = searchParams.get("group"); // A-G filter

    const db = await createCensusClient();

    // ── Routes (real routes_master schema) ─────────────────────
    let routesQ = db
      .from("routes_master")
      .select("id,name,group_name,rep_email,lead_email,driver,vehicle,delivery_days,order_days,travel_km,tonnage_target,source_rep,source_contact,active")
      .eq("active", true)
      .order("group_name", { ascending: true })
      .order("name", { ascending: true });

    if (group) routesQ = routesQ.eq("group_name", group);

    const { data: routes } = await routesQ;

    // ── Reps + profiles (to resolve rep/lead emails to names) ──
    const { data: reps } = await db
      .from("reps")
      .select("id,name,email");
    const { data: profiles } = await db
      .from("profiles")
      .select("email,full_name");

    const nameByEmail: Record<string, string> = {};
    for (const r of reps || []) {
      if (r.email) nameByEmail[r.email] = r.name;
    }
    for (const p of profiles || []) {
      if (p.email && !nameByEmail[p.email]) nameByEmail[p.email] = p.full_name;
    }

    // ── Outlets with GPS (for map pins) ────────────────────────
    const { data: outlets } = await db
      .from("outlets")
      .select("id,business_name,channel,outlet_type,gps_lat,gps_lng,ward,constituency,county,size_tier,created_by")
      .is("deleted_at", null)
      .not("gps_lat", "is", null);

    // ── Group stats (display-ready fields the dashboard expects) ─
    const groupStats: Record<string, { routeCount: number; repName: string; leadName: string }> = {};
    for (const r of routes || []) {
      if (!groupStats[r.group_name]) {
        groupStats[r.group_name] = {
          routeCount: 0,
          repName: nameByEmail[r.rep_email] || r.rep_email || "Unassigned",
          leadName: nameByEmail[r.lead_email] || r.lead_email || "Unassigned",
        };
      }
      groupStats[r.group_name].routeCount++;
    }

    const routeItems = (routes || []).map((r) => ({
      id: r.id,
      group_name: r.group_name,
      route_name: r.name,
      route_id: r.id,
      route_category: r.source_rep || "Wholesale route",
      vehicle_type: r.vehicle || "N/A",
      rep_email: r.rep_email,
      lead_email: r.lead_email,
    }));

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
      routes: routeItems,
      groupStats,
      outletPins,
      totalRoutes: routeItems.length,
      totalOutlets: outletPins.length,
    });
  } catch (err) {
    console.error("Routes API error:", err);
    return NextResponse.json({ error: "Failed to load routes data" }, { status: 500 });
  }
}