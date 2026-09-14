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
    const readWarnings: string[] = [];
    const guard = (tbl: string) => (e: unknown) => {
      const msg = `${tbl}: ${(e as Error)?.message || e}`;
      console.warn(`monitoring fetch failed — ${msg}`);
      readWarnings.push(msg);
      return { data: [] } as never;
    };

    const [{ data: reps }, { data: visits }, { data: liveLocs }, batchesRes, interceptsRes, outletsRes, retailersRes, accessEventsRes, liveLocsTrailRes] = await Promise.all([
      db
        .from("reps")
        .select("id,name,email,zone,status,on_route,last_sync_at,device,target_visits_month,actual_visits_month,wards,color")
        .order("name")
        .then(r => r, guard("reps")),
      db
        .from("visits")
        .select("id,rep_id,check_in_at,created_at,status,outcome,gps_lat,gps_lng,duration_min,order_placed,order_value")
        .is("deleted_at", null)
        .order("check_in_at", { ascending: false })
        .limit(500)
        .then(r => r, guard("visits")),
      db
        .from("v_rep_latest_location")
        .select("rep_id,lat,lng,accuracy_m,captured_at")
        .order("captured_at", { ascending: false })
        .then(r => r, guard("v_rep_latest_location")),
      db.from("census_batches").select("id,rep_id,status,record_count,started_at,submitted_at").order("started_at", { ascending: false }).limit(200).then(r=>r, guard("census_batches")),
      db.from("consumer_intercepts").select("id,rep_id,ward,ward_auto,ward_final,channel,captured_at,created_at,gps_lat,gps_lng,gps_raw_lat,gps_raw_lng,gps_final_lat,gps_final_lng,accuracy_m,accuracy_tier,source,snapped,distance_m").order("captured_at", { ascending: false }).limit(50).then(r=>r, guard("consumer_intercepts")),
      db.from("outlets").select("id,ward,ward_auto,ward_final,gps_lat,gps_lng,gps_raw_lat,gps_raw_lng,gps_final_lat,gps_final_lng,accuracy_m,accuracy_tier,source,snapped,distance_m,created_at").order("created_at",{ascending:false}).limit(200).then(r=>r, guard("outlets")),
      db.from("retailers").select("id,name,zone,channel,ward,gps_lat,gps_lng,updated_at").order("updated_at",{ascending:false}).limit(200).then(r=>r, guard("retailers")),
      db.from("rep_access_events").select("rep_email,device_id,event_type,app_version,version_code,created_at").order("created_at",{ascending:false}).limit(500).then(r=>r, guard("rep_access_events")),
      db.from("rep_locations").select("rep_id,captured_at").order("captured_at",{ascending:false}).limit(50).then(r=>r, guard("rep_locations")),
    ]);
    const batches = (batchesRes as {data:unknown[]})?.data as {id:string;rep_id:string;status:string;record_count:number;started_at:string;submitted_at:string|null}[] || [];
    const intercepts = (interceptsRes as {data:unknown[]})?.data as unknown[] || [];
    const outlets = (outletsRes as {data:unknown[]})?.data as unknown[] || [];
    const retailers = (retailersRes as {data:unknown[]})?.data as unknown[] || [];
    const accessEvents = (accessEventsRes as {data:unknown[]})?.data as { rep_email: string; device_id: string | null; event_type: string; app_version: string | null; version_code: number | null; created_at: string }[] || [];
    const liveLocTrail = (liveLocsTrailRes as {data:unknown[]})?.data as { rep_id: string; captured_at: string }[] || [];

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

    // latest app access per rep (login/sync/open from rep_access_events)
    const accessByRep = new Map<string, { device_id: string | null; app_version: string | null; version_code: number | null; last_login_at: string | null; last_open_at: string | null; last_sync_event_at: string | null; event_count: number }>();
    for (const ev of accessEvents) {
      const email = (ev.rep_email || "").toLowerCase();
      const cur = accessByRep.get(email) || { device_id: null, app_version: null, version_code: null, last_login_at: null, last_open_at: null, last_sync_event_at: null, event_count: 0 };
      cur.event_count++;
      if (!cur.device_id && ev.device_id) cur.device_id = ev.device_id;
      if (!cur.app_version && ev.app_version) cur.app_version = ev.app_version;
      if (cur.version_code == null && ev.version_code != null) cur.version_code = ev.version_code;
      if (ev.event_type === "login" && !cur.last_login_at) cur.last_login_at = ev.created_at;
      if (ev.event_type === "open" && !cur.last_open_at) cur.last_open_at = ev.created_at;
      if (ev.event_type === "sync" && !cur.last_sync_event_at) cur.last_sync_event_at = ev.created_at;
      accessByRep.set(email, cur);
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
      const access = accessByRep.get((r.email || "").toLowerCase());
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
        appVersion: access?.app_version || null,
        versionCode: access?.version_code ?? null,
        lastLoginAt: access?.last_login_at || null,
        lastOpenAt: access?.last_open_at || null,
        lastAppSyncAt: access?.last_sync_event_at || null,
        accessEventCount: access?.event_count || 0,
        accessDeviceId: access?.device_id || null,
        lastPingAt: liveLocTrail.find((l) => l.rep_id === r.id)?.captured_at || null,
      };
    });

    const onShiftCount = items.filter((i) => i.onShift).length;
    return NextResponse.json({ today, total: items.length, onShift: onShiftCount, offShift: items.length - onShiftCount, reps: items, visits: visits || [], batches, intercepts, outlets, retailers, readWarnings });
  } catch (err) {
    console.error("Monitoring API error:", err);
    return NextResponse.json({ error: "Failed to load monitoring" }, { status: 500 });
  }
}
