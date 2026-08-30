"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MapPin, Loader2, Layers } from "lucide-react";

const KaniniTruckRouteMap = dynamic(() => import("@/components/khel/kanini-truck-route-map"), { ssr: false });

export default function KaniniMapTabPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState("All");
  const [showWards, setShowWards] = useState(true);

  useEffect(() => {
    fetch("/api/portal/khel/routes")
      .then((r) => r.json())
      .then((j) => setData(j))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>;

  const pins = (data?.outletPins ?? []).slice(0, 500).map((p:any)=> ({
    id: p.id, name: p.name, channel: p.channel ?? "", type: p.type ?? "", lat: Number(p.lat), lng: Number(p.lng), ward: p.ward ?? "", constituency: p.constituency ?? "", county: p.county ?? "", size: p.size ?? ""
  }));

  // Synthetic truck routes from pins (same as portal mapping)
  const truckRoutes = (data?.routes ?? []).slice(0, 12).map((r:any, idx:number)=>{
    const gIdx = ["A","B","C","D","E","F","G"].indexOf(r.group_name);
    const depotLat = -1.28 + (gIdx>=0 ? (gIdx%4)*0.06 : idx*0.02);
    const depotLng = 36.78 + (gIdx>=0 ? Math.floor(gIdx/4)*0.08 : idx*0.015);
    const slice = pins.slice(idx*3, idx*3+6).map((p:any)=> [p.lat, p.lng] as [number,number]);
    const pts: [number,number][] = [[depotLat, depotLng], ...slice];
    return { id: r.id, name: r.route_name, group: r.group_name, vehicle: r.vehicle_type || "Van", points: pts, color: "#047857" };
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-[13px] font-bold text-slate-800 flex items-center gap-2"><MapPin size={14}/> Territory Map — Kanini Field <span className="ml-auto text-[10px] font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">MarketLink</span></h2>
        <p className="text-[11px] text-slate-500 mt-1">Borrowed from Kanini Field `TerritoryMap` — ward polygons + GPS pins + truck polylines. Same `territory_wards.json` as field app.</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500">Group</span>
          {["All","A","B","C","D","E","F","G"].map((g)=>(
            <button key={g} onClick={()=>setGroup(g)} className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${group===g ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200 text-slate-600"}`}>{g==="All"?"All":g}</button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
            <input type="checkbox" checked={showWards} onChange={(e)=>setShowWards(e.target.checked)} className="rounded border-slate-300" /> Wards
          </label>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Layers size={14} className="text-teal-600" />
          <span className="text-[12px] font-semibold">Map — Outlets + Wards + Truck Routes</span>
          <span className="ml-auto text-[10px] font-mono text-slate-400">93 wards</span>
        </div>
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white" style={{ height: 520 }}>
          <KaniniTruckRouteMap pins={pins} truckRoutes={truckRoutes} selectedRouteId={null} selectedGroup={group} showWards={showWards} onSelectPin={()=>{}} />
        </div>
        <div className="mt-2 text-[10px] text-slate-400 font-mono">MarketLink superadmin view — same wards + truck polylines as client portal, now tabbed.</div>
      </div>
    </div>
  );
}
