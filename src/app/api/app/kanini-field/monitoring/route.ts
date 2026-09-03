import { NextResponse } from "next/server";
import { createCensusClient } from "@/lib/supabase/census";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await createCensusClient();
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: reps }, { data: visits }, { data: accessLog }] = await Promise.all([
      db
        .from("reps")
        .select("id,name,email,zone,status,on_route,last_sync_at,device,target_visits_month,actual_visits_month,wards,color")
        .order("name"),
      db
        .from("visits")
        .select("id,rep_id,check_in_at,created_at,status,outcome,gps_lat,gps_lng,duration_min,order_placed,order_value")
        .is("deleted_at", null)
        .order("check_in_at", { ascending: false })
        .limit(500),
      db
        .from("rep_access_events")
        .select("id,rep_email,device_id,event_type,app_version,version_code,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    // group visits by rep
    const byRep = new Map<string, typeof visits>();
    for (const v of visits || []) {
      const arr = byRep.get(v.rep_id) || [];
      arr.push(v);
      byRep.set(v.rep_id, arr);
    }

    // group access events by rep email, tracking latest login / latest open and version
    const byRepAccess = new Map<string, Array<{
      id: unknown; rep_email: string; device_id: string | null;
      event_type: string | null; app_version: string | null;
      version_code: number | null; created_at: string;
    }>>();
    for (const ev of (accessLog || []) as Array<{
      id: unknown; rep_email: string; device_id: string | null;
      event_type: string | null; app_version: string | null;
      version_code: number | null; created_at: string;
    }>) {
      const arr = byRepAccess.get(ev.rep_email) || [];
      arr.push(ev);
      byRepAccess.set(ev.rep_email, arr);
    }

    const now = Date.now();
    const SHIFT_WINDOW_MS = 4 * 3600 * 1000; // last_sync within 4h = on shift
    const items = (reps || []).map((r) => {
      const vlist = byRep.get(r.id) || [];
      const last = vlist[0] || null;
      const todayVisits = vlist.filter((v) => (v.check_in_at || v.created_at || "").slice(0, 10) === today).length;
      const todayOrders = vlist.filter((v) => v.order_placed && (v.check_in_at || v.created_at || "").slice(0, 10) === today).length;
      const lastSyncAt = r.last_sync_at ? new Date(r.last_sync_at).getTime() : 0;
      const onShift = r.status === "active" && (r.on_route || (lastSyncAt && now - lastSyncAt < SHIFT_WINDOW_MS) || todayVisits > 0);
      const access = (byRepAccess.get(r.email) || []).slice(0, 200);
      const lastLogin = access.find((a) => a.event_type === "login");
      const lastOpen = access.find((a) => a.event_type === "open");
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        zone: r.zone,
        status: r.status,
        onShift,
        onRoute: !!r.on_route,
        device: r.device,
        lastSyncAt: r.last_sync_at,
        wards: r.wards,
        color: r.color,
        target: r.target_visits_month,
        actual: r.actual_visits_month,
        todayVisits,
        todayOrders,
        totalVisits: vlist.length,
        lastVisitAt: last?.check_in_at || last?.created_at || null,
        lastGps: last ? { lat: last.gps_lat, lng: last.gps_lng } : null,
        lastOutcome: last?.outcome || last?.status || null,
        lastLoginAt: lastLogin?.created_at ?? null,
        lastOpenAt: lastOpen?.created_at ?? null,
        appVersion: access.find((a) => a.app_version)?.app_version ?? null,
        appVersionCode: access.find((a) => a.version_code)?.version_code ?? null,
        accessDevice: lastLogin?.device_id ?? null,
      };
    });

    const onShiftCount = items.filter((i) => i.onShift).length;
    return NextResponse.json({
      today,
      total: items.length,
      onShift: onShiftCount,
      offShift: items.length - onShiftCount,
      reps: items,
      visits: visits || [],
      accessLog: accessLog || [],
    });
  } catch (err) {
    console.error("Monitoring API error:", err);
    return NextResponse.json({ error: "Failed to load monitoring" }, { status: 500 });
  }
}
