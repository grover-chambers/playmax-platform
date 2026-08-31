"use client";

import React, { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface OutletPin {
  id: string; name: string; channel: string; type: string; lat: number; lng: number; ward: string; constituency: string; county: string; size: string;
}
interface TruckRoute { id: string; name: string; group: string; vehicle: string; points: [number, number][]; color: string; }

const GROUP_COLORS: Record<string, string> = { A:"#047857", B:"#0369a1", C:"#7c3aed", D:"#c2410c", E:"#be185d", F:"#15803d", G:"#a16207" };

function bearing(a:[number,number], b:[number,number]) {
  const toRad=(d:number)=>d*Math.PI/180, toDeg=(r:number)=>r*180/Math.PI;
  const dLng=toRad(b[1]-a[1]); const lat1=toRad(a[0]), lat2=toRad(b[0]);
  const y=Math.sin(dLng)*Math.cos(lat2), x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLng);
  return (toDeg(Math.atan2(y,x))+360)%360;
}

export default function KiambuMap({ pins, truckRoutes, selectedGroup, showWards, onSelectPin }: {
  pins: OutletPin[]; truckRoutes: TruckRoute[]; selectedGroup: string; showWards: boolean; onSelectPin: (p: OutletPin)=>void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const popupRef = useRef<any>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [37.07, -1.033],
      zoom: 10,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Wards + routes + pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onLoad = async () => {
      // Clean
      markersRef.current.forEach((m)=>m.remove()); markersRef.current=[];
      if (popupRef.current) { popupRef.current.remove(); popupRef.current=null; }
      // Remove old sources/layers
      const toRemove = ["kiambu-wards-fill","kiambu-wards-line","truck-routes","truck-heads","outlet-pins"];
      toRemove.forEach((id)=>{ if(map.getLayer(id)) map.removeLayer(id); if(map.getSource(id)) map.removeSource(id); });

      // Wards GeoJSON
      if (showWards) {
        try {
          const geo = await fetch("/geo/territory_wards.json").then((r)=>r.json());
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const feats=(geo.features as any[]).filter((f)=> (f.properties?.zone||"").toLowerCase()==="kiambu" || (f.properties?.county||"").toLowerCase()==="kiambu");
          const filtered = feats.length ? { type:"FeatureCollection" as const, features: feats } : geo;
          const activeColor = GROUP_COLORS[selectedGroup] || "#0f766e";
          const isFiltered = selectedGroup !== "All";
          map.addSource("kiambu-wards-fill", { type:"geojson", data: filtered as unknown as GeoJSON.FeatureCollection });
          map.addLayer({ id:"kiambu-wards-fill", type:"fill", source:"kiambu-wards-fill", paint:{ "fill-color": isFiltered ? activeColor : "#0f766e", "fill-opacity": isFiltered ? 0.18 : 0.06 }});
          map.addLayer({ id:"kiambu-wards-line", type:"line", source:"kiambu-wards-fill", paint:{ "line-color": isFiltered ? activeColor : "#0f766e", "line-width": isFiltered ? 2 : 1, "line-opacity": isFiltered ? 0.8 : 0.35 }});
          // Fit to Kiambu bounds
          const bounds = new maplibregl.LngLatBounds();
          feats.forEach((f: { geometry: { coordinates: number[][][] } })=> {
            const coords = f.geometry?.coordinates?.[0] || [];
            coords.forEach((c: number[])=> bounds.extend([c[0], c[1]]));
          });
          if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, maxZoom: 11, duration: 600 });
        } catch {}
      }

      // Truck routes as GeoJSON LineString + truck head markers (Uber/Bolt style)
      const routeFeatures = truckRoutes.filter((r)=> r.points.length >=2 && (selectedGroup==="All" || r.group===selectedGroup)).map((r)=> ({
        type:"Feature" as const, properties:{ id:r.id, name:r.name, group:r.group, color: GROUP_COLORS[r.group]||r.color }, geometry:{ type:"LineString" as const, coordinates: r.points.map(([lat,lng])=>[lng,lat]) }
      }));
      if (routeFeatures.length) {
        map.addSource("truck-routes", { type:"geojson", data:{ type:"FeatureCollection", features: routeFeatures } as unknown as GeoJSON.FeatureCollection });
        map.addLayer({ id:"truck-routes", type:"line", source:"truck-routes", paint:{ "line-color":["get","color"], "line-width":4, "line-opacity":0.85 }, layout:{ "line-join":"round", "line-cap":"round" }});
        // Truck heads — Uber/Bolt style: white ring + color fill + heading
        routeFeatures.forEach((f)=>{
          const coords = f.geometry.coordinates as [number,number][];
          const start = coords[0]; const next = coords[1] || coords[0];
          const headLatLng: [number,number]= [start[1], start[0]];
          const nextLatLng: [number,number]= [next[1], next[0]];
          const rot = bearing(headLatLng, nextLatLng);
          const el=document.createElement("div");
          el.style.width="34px"; el.style.height="34px"; el.style.borderRadius="999px"; el.style.background=(f.properties as {color:string}).color; el.style.border="3px solid white"; el.style.boxShadow="0 3px 10px rgba(0,0,0,0.35)"; el.style.display="grid"; el.style.placeItems="center"; el.style.transform=`rotate(${rot}deg)`;
          el.innerHTML=`<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M7 18V6l10 6z"/></svg>`; // heading triangle
          const m=new maplibregl.Marker({ element: el, anchor:"center" }).setLngLat(start).addTo(map);
          (m.getElement() as HTMLElement).title=`${(f.properties as {name:string}).name} · ${(f.properties as {group:string}).group}`;
          markersRef.current.push(m);
        });
      }

      // Outlet pins — 10px dot colored by group
      pins.forEach((p)=>{
        const color = GROUP_COLORS[selectedGroup] || "#047857";
        const el=document.createElement("div");
        el.style.width="11px"; el.style.height="11px"; el.style.borderRadius="999px"; el.style.background=color; el.style.border="2px solid white"; el.style.boxShadow="0 1px 4px rgba(0,0,0,0.3)";
        const m=new maplibregl.Marker({ element: el, anchor:"center" }).setLngLat([p.lng, p.lat]).addTo(map);
        m.getElement().addEventListener("click", ()=> {
          onSelectPin(p);
          new maplibregl.Popup({ closeButton:false, offset:12 }).setLngLat([p.lng,p.lat])
            .setHTML(`<div style="font:11px system-ui"><b>${p.name}</b><br/>${p.channel||"N/A"} · ${p.type||""}<br/>${p.ward}, ${p.county}</div>`)
            .addTo(map);
        });
        markersRef.current.push(m);
      });

      if (!showWards && pins.length===0 && routeFeatures.length===0) map.flyTo({ center:[37.07,-1.033], zoom:10 });
    };
    if (map.loaded()) onLoad(); else map.once("load", onLoad);
  }, [pins, truckRoutes, selectedGroup, showWards, onSelectPin]);

  return <div ref={ref} className="w-full h-full" style={{ minHeight:520, background:"#f8fafc" }} />;
}
