"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import RouteTimeline from "@/components/khel/route-timeline";

const KiambuMap = dynamic(() => import("@/components/khel/kiambu-map"), { ssr: false });

export default function KaniniMapTabPage() {
  const [data, setData] = useState<any>(null);
  const [monitor, setMonitor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState("All");
  const [showWards, setShowWards] = useState(true);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/portal/khel/routes").then((r) => r.json()),
      fetch("/api/app/kanini-field/monitoring").then((r) => r.json()).catch(() => null),
    ])
      .then(([r, m]) => {
        setData(r);
        if (m && !m.error) setMonitor(m);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-content flex items-center justify-center py-16"><Loader2 className="w-4 h-4 text-gray-5 animate-spin" /><span className="ml-2 text-[11px] text-gray-5">Loading map…</span></div>;

  const pins = (data?.outletPins ?? []).slice(0, 500).map((p: any) => ({
    id: p.id, name: p.name, channel: p.channel ?? "", type: p.type ?? "", lat: Number(p.lat), lng: Number(p.lng), ward: p.ward ?? "", constituency: p.constituency ?? "", county: p.county ?? "", size: p.size ?? ""
  }));
  // Kiambu-trained depots (match territory_wards subcounty offsets) + real pins if any
  const KIAMBU_DEPOTS: Record<string, [number, number]> = {
    A: [-1.03, 37.07], // Thika Town
    B: [-1.10, 37.01], // Juja
    C: [-1.17, 36.82], // Kiambu
    D: [-0.98, 36.88], // Gatundu North
    E: [-1.14, 36.64], // Limuru
    F: [-1.08, 36.62], // Lari
    G: [-1.25, 36.73], // Kabete
  };
  const truckRoutes = (data?.routes ?? []).slice(0, 12).map((r: any, idx: number) => {
    const depot = KIAMBU_DEPOTS[r.group_name] || ([-1.03, 37.07] as [number, number]);
    // Use real pins if present, else synthesize 5 stops radiating around depot in Kiambu
    const slice = pins.slice(idx * 3, idx * 3 + 6).map((p: any) => [p.lat, p.lng] as [number, number]);
    const synthetic: [number, number][] = slice.length >= 2 ? slice : Array.from({ length: 5 }, (_, i) => [depot[0] + (Math.sin((idx * 5 + i) * 1.1) * 0.03), depot[1] + (Math.cos((idx * 5 + i) * 1.1) * 0.04)] as [number, number]);
    const pts: [number, number][] = [depot, ...synthetic];
    return { id: r.id, name: r.route_name, group: r.group_name, vehicle: r.vehicle_type || "Van", points: pts, color: "#047857" };
  });
  const reps = (monitor?.reps || []).map((r: any) => ({ id: r.id, name: r.name, color: r.color, zone: r.zone }));
  const visits = (monitor?.visits || []) as any[];

  return (
    <div className="page-content space-y-5">
      <PageHeader title="Territory map — Kiambu" subtitle="Kiambu county first — Thika cluster trained view, zones allocated by route group (A-G) per rep" actions={
        <>
          <div className="hidden sm:flex items-center gap-1.5">
            {["All", "A", "B", "C", "D", "E", "F", "G"].map((g) => (
              <Button key={g} variant={group === g ? "primary" : "secondary"} size="sm" onClick={() => setGroup(g)} className="px-2.5">{g}</Button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-gray-5 cursor-pointer"><input type="checkbox" checked={showWards} onChange={(e) => setShowWards(e.target.checked)} className="rounded border-[var(--ws-border)]" /> Wards</label>
        </>
      } />
      <div className="pm-dash-card">
        <div className="pm-dash-card-h"><span className="pm-dash-card-t">Map — Kiambu · Outlets + Wards + Truck Routes</span><span className="text-[11px] font-mono text-gray-5">15 Kiambu wards · {pins.length} pins {group !== "All" && `· Group ${group} highlight`}</span></div>
        <div className="pm-dash-card-b p-0">
          <div className="rounded-lg border border-[var(--ws-border)] overflow-hidden bg-white m-3" style={{ height: 520 }}>
            <KiambuMap pins={pins} truckRoutes={truckRoutes} selectedGroup={group} showWards={showWards} onSelectPin={() => {}} />
          </div>
        </div>
      </div>
      <RouteTimeline reps={reps} visits={visits} selectedId={selectedVisitId} onSelect={(v: any) => setSelectedVisitId(v.id)} />
    </div>
  );
}
