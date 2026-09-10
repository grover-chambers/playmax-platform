import { NextResponse } from "next/server";
import { createCensusClient } from "@/lib/supabase/census";
import { getAuthenticatedClient, getCurrentUser, isStaff } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const db = await createCensusClient();
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: reps }, { data: visits }, { data: liveLocs }, batchesRes, interceptsRes] = await Promise.all([
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
        .from("v_rep_latest_location")
        .select("rep_id,lat,lng,accuracy_m,captured_at")
        .order("captured_at", { ascending: false }),
      db.from("census_batches").select("id,rep_id,status,record_count,started_at,submitted_at").order("started_at", { ascending: false }).limit(200).then(r=>r, ()=>({data:[]} as never)),
      db.from("consumer_intercepts").select("id,rep_id,ward,channel,captured_at,created_at").order("captured_at", { ascending: false }).limit(50).then(r=>r, ()=>({data:[]} as never)),
    ]);
    const batches = (batchesRes as {data:unknown[]})?.data as {id:string;rep_id:string;status:string;record_count:number;started_at:string;submitted_at:string|null}[] || [];
    const intercepts = (interceptsRes as {data:unknown[]})?.data as {id:string;rep_id:string;ward:string|null;channel:string|null;captured_at:string;created_at:string}[] || [];

    // group visits by rep
    const byRep = new Map<string, typeof visits>();
    for (const v of visits || []) {
      const arr = byRep.get(v.rep_id) || [];
      arr.push(v);
      byRep.set(v.rep_id, arr);
    }

    // latest live location per rep (from background pinging)
    const liveLocByRep = new Map<string, { lat: number; lng: number; accuracy_m: number | null; captured_at: string }>();
    for (const loc of liveLocs || []) {
      if (!liveLocByRep.has(loc.rep_id)) {
        liveLocByRep.set(loc.rep_id, loc);
      }
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
      const liveLoc = liveLocByRep.get(r.id);
      const lastGps = liveLoc
        ? { lat: liveLoc.lat, lng: liveLoc.lng }
        : last
          ? { lat: last.gps_lat, lng: last.gps_lng }
          : null;
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
        lastGps,
        lastGpsSource: liveLoc ? "live" : "visit",
        lastGpsAt: liveLoc?.captured_at || last?.check_in_at || last?.created_at || null,
        lastOutcome: last?.outcome || last?.status || null,
      };
    });

    const onShiftCount = items.filter((i) => i.onShift).length;
    return NextResponse.json({ today, total: items.length, onShift: onShiftCount, offShift: items.length - onShiftCount, reps: items, visits: visits || [], batches, intercepts });
  } catch (err) {
    console.error("Monitoring API error:", err);
    return NextResponse.json({ error: "Failed to load monitoring" }, { status: 500 });
  }
}
