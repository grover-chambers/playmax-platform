import { NextResponse } from "next/server";
import { createCensusClient } from "@/lib/supabase/census";
import { getAuthenticatedClient, getCurrentUser, isStaff } from "@/lib/supabase/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ repId: string }> }) {
  try {
    const supabase = await getAuthenticatedClient();
    const currentUser = await getCurrentUser(supabase);
    if (!currentUser || !isStaff(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { repId } = await params;
    const db = await createCensusClient();

    const repRes = await db.from("reps").select("id,name,email,phone,zone,status,on_route,device,last_sync_at,target_visits_month,actual_visits_month,wards,color,created_at").eq("id", repId).maybeSingle().then(r=>r,(e)=>{console.warn("rep fetch failed:",(e as Error)?.message||e); return {data:null} as never;});
    const rep = repRes?.data ?? null;
    if (!rep) {
      return NextResponse.json({ error: "Rep not found" }, { status: 404 });
    }

    const [eventsRes, visitsRes, outletsRes, interceptsRes, subsRes, batchesRes, locationsRes, liveLocRes] = await Promise.all([
      db.from("rep_access_events").select("id,rep_email,device_id,event_type,app_version,version_code,created_at").eq("rep_email", rep.email).order("created_at",{ascending:false}).limit(200).then(r=>r,(e)=>{console.warn("access events fetch failed:",(e as Error)?.message||e); return {data:[]} as never;}),
      db.from("visits").select("id,rep_id,retailer_id,outlet_id,batch_id,status,outcome,order_placed,order_value,check_in_at,check_out_at,duration_min,gps_lat,gps_lng,notes,photo_count,created_at").eq("rep_id", repId).is("deleted_at", null).order("check_in_at",{ascending:false}).limit(200).then(r=>r,(e)=>{console.warn("rep visits fetch failed:",(e as Error)?.message||e); return {data:[]} as never;}),
      db.from("outlets").select("id,business_name,channel,outlet_type,ward,ward_auto,ward_final,county,constituency,gps_lat,gps_lng,gps_final_lat,gps_final_lng,accuracy_m,accuracy_tier,source,snapped,distance_m,size_tier,created_at,created_by,batch_id").eq("created_by", repId).is("deleted_at", null).order("created_at",{ascending:false}).limit(200).then(r=>r,(e)=>{console.warn("rep outlets fetch failed:",(e as Error)?.message||e); return {data:[]} as never;}),
      db.from("consumer_intercepts").select("id,enumerator_id,ward,ward_auto,ward_final,channel,gps_lat,gps_lng,gps_final_lat,gps_final_lng,accuracy_m,accuracy_tier,source,snapped,created_at,captured_at").eq("enumerator_id", repId).order("captured_at",{ascending:false}).limit(200).then(r=>r,(e)=>{console.warn("rep intercepts fetch failed:",(e as Error)?.message||e); return {data:[]} as never;}),
      db.from("daily_submissions").select("id,enumerator_id,submission_date,outlet_count,visit_count,status,created_at").eq("enumerator_id", repId).order("submission_date",{ascending:false}).limit(200).then(r=>r,(e)=>{console.warn("rep submissions fetch failed:",(e as Error)?.message||e); return {data:[]} as never;}),
      db.from("census_batches").select("id,rep_id,device_id,batch_number,started_at,submitted_at,synced_at,record_count,status,created_at,updated_at").eq("rep_id", repId).order("started_at",{ascending:false}).limit(100).then(r=>r,(e)=>{console.warn("rep batches fetch failed:",(e as Error)?.message||e); return {data:[]} as never;}),
      db.from("rep_locations").select("id,rep_id,lat,lng,accuracy_m,altitude_m,speed_kmh,heading_deg,battery_pct,is_charging,source,captured_at").eq("rep_id", repId).order("captured_at",{ascending:false}).limit(400).then(r=>r,(e)=>{console.warn("rep locations fetch failed:",(e as Error)?.message||e); return {data:[]} as never;}),
      db.from("v_rep_latest_location").select("rep_id,lat,lng,accuracy_m,captured_at").eq("rep_id", repId).maybeSingle().then(r=>r,(e)=>{console.warn("rep latest location fetch failed:",(e as Error)?.message||e); return {data:null} as never;}),
    ]);

    const accessEvents = (eventsRes as {data:unknown[]} | undefined)?.data as { id: string; rep_email: string; device_id: string | null; event_type: string; app_version: string | null; version_code: number | null; created_at: string }[] || [];
    const visits = (visitsRes as {data:unknown[]}|undefined)?.data as unknown[] || [];
    const outlets = (outletsRes as {data:unknown[]}|undefined)?.data as unknown[] || [];
    const intercepts = (interceptsRes as {data:unknown[]}|undefined)?.data as unknown[] || [];
    const submissions = (subsRes as {data:unknown[]}|undefined)?.data as unknown[] || [];
    const batches = (batchesRes as {data:unknown[]}|undefined)?.data as unknown[] || [];
    const locations = (locationsRes as {data:unknown[]}|undefined)?.data as unknown[] || [];
    const liveLoc = liveLocRes?.data ?? null;

    const today = new Date().toISOString().slice(0,10);
    const todayVisits = visits.filter((v: unknown)=>((v as {check_in_at?:string;created_at?:string}).check_in_at || (v as {created_at?:string}).created_at || "").slice(0,10)===today).length;
    const todayOrders = visits.filter((v: unknown)=>(v as {order_placed?:boolean}).order_placed && ((v as {check_in_at?:string;created_at?:string}).check_in_at || (v as {created_at?:string}).created_at || "").slice(0,10)===today).length;

    return NextResponse.json({
      profile: {
        id: rep.id,
        name: rep.name,
        email: rep.email,
        phone: rep.phone,
        zone: rep.zone,
        status: rep.status,
        onRoute: !!rep.on_route,
        device: rep.device,
        lastSyncAt: rep.last_sync_at,
        wards: rep.wards,
        color: rep.color,
        target: rep.target_visits_month,
        actual: rep.actual_visits_month,
        createdAt: rep.created_at,
      },
      today: {
        date: today,
        visits: todayVisits,
        orders: todayOrders,
        orderValue: visits.filter((v: unknown)=>(v as {order_placed?:boolean}).order_placed && ((v as {check_in_at?:string;created_at?:string}).check_in_at || "").slice(0,10)===today).reduce((s:number, v: unknown)=> s + Number((v as {order_value?:number}).order_value || 0), 0),
        syncAt: rep.last_sync_at,
        latestGps: liveLoc ? { lat: liveLoc.lat, lng: liveLoc.lng, accuracy_m: liveLoc.accuracy_m, captured_at: liveLoc.captured_at } : null,
      },
      access_events: accessEvents,
      visits,
      outlets,
      intercepts,
      submissions,
      batches,
      locations,
      totals: {
        visits: visits.length,
        outlets: outlets.length,
        intercepts: intercepts.length,
        submissions: submissions.length,
        batches: batches.length,
        accessEvents: accessEvents.length,
      },
    });
  } catch (err) {
    console.error("Rep detail API error:", err);
    return NextResponse.json({ error: "Failed to load rep detail" }, { status: 500 });
  }
}