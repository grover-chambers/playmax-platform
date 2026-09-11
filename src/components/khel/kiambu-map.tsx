"use client";
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface OutletPin { accuracy_tier?: string|null; gps_final_lat?: number|null; gps_final_lng?: number|null; id:string; name:string; channel:string; type:string; lat:number; lng:number; ward:string; constituency:string; county:string; size:string; color?:string; }
interface TruckRoute { id:string; name:string; group:string; vehicle:string; points:[number,number][]; color:string; }
const GROUP_COLORS: Record<string,string>={A:"#047857",B:"#0369a1",C:"#7c3aed",D:"#c2410c",E:"#be185d",F:"#15803d",G:"#a16207"};
const NAMPAK:[number,number]=[-1.0423,37.0684];
const KIAMBU_BOUNDS:L.LatLngBoundsExpression=[[-1.35,36.5],[-0.75,37.55]];

export default function KiambuMap({pins,truckRoutes,selectedGroup,showWards,onSelectPin,onSelectRoute}:{pins:OutletPin[];truckRoutes:TruckRoute[];selectedGroup:string;showWards:boolean;onSelectPin:(p:OutletPin)=>void;onSelectRoute?:(r:TruckRoute)=>void;}){
  const mapRef=useRef<HTMLDivElement>(null);
  const mapInstanceRef=useRef<L.Map|null>(null);
  const markersLayerRef=useRef<L.LayerGroup|null>(null);
  const polylinesRef=useRef<L.Polyline[]>([]);
  const wardsLayerRef=useRef<L.GeoJSON|null>(null);
  const baseLayersRef=useRef<{street:L.TileLayer;sat:L.TileLayer}|null>(null);
  const firstLoadRef=useRef(true);

  useEffect(()=>{
    if(!mapRef.current||mapInstanceRef.current) return;
    const map=L.map(mapRef.current,{zoomControl:true,maxBounds:KIAMBU_BOUNDS,maxBoundsViscosity:0.8}).setView(NAMPAK,13);
    L.control.scale({position:"bottomleft"}).addTo(map);
    const street=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"&copy; OpenStreetMap",maxZoom:19});
    const sat=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{attribution:"&copy; Esri",maxZoom:19});
    street.addTo(map);
    baseLayersRef.current={street,sat};
    L.control.layers({Street:street,Satellite:sat},{},{position:"topright"}).addTo(map);

    // Fullscreen toggle
    const FullscreenControl=L.Control.extend({
      onAdd:function(){const b=L.DomUtil.create("a","leaflet-control-zoom-in");b.innerHTML="⛶";b.title="Fullscreen";b.style.display="flex";b.style.alignItems="center";b.style.justifyContent="center";b.style.fontSize="16px";b.style.cursor="pointer";L.DomEvent.on(b,"click",(e:L.DomEvent)=>{L.DomEvent.stop(e);const el=mapRef.current!;if(!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.();});const c=L.DomUtil.create("div","leaflet-control leaflet-bar");c.appendChild(b);return c;}
    });
    (new (FullscreenControl as unknown as {new(o:Record<string,string>):L.Control})({position:"topleft"})).addTo(map);

    // Locate button
    const LocateControl=L.Control.extend({
      onAdd:function(){const b=L.DomUtil.create("a","leaflet-control-zoom-in");b.innerHTML="◎";b.title="Locate me";b.style.display="flex";b.style.alignItems="center";b.style.justifyContent="center";b.style.fontSize="16px";b.style.cursor="pointer";L.DomEvent.on(b,"click",(e:L.DomEvent)=>{L.DomEvent.stop(e);if(!navigator.geolocation) return;navigator.geolocation.getCurrentPosition(p=>map.flyTo([p.coords.latitude,p.coords.longitude],14),()=>{}, {enableHighAccuracy:true});});const c=L.DomUtil.create("div","leaflet-control leaflet-bar");c.appendChild(b);return c;}
    });
    (new (LocateControl as unknown as {new(o:Record<string,string>):L.Control})({position:"topleft"})).addTo(map);

    const warehouseIcon=L.divIcon({className:"",html:`<div style="width:36px;height:36px;background:#1e293b;border:3px solid #fff;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:20px;">🏭</div>`,iconSize:[36,36],iconAnchor:[18,18]});
    L.marker(NAMPAK,{icon:warehouseIcon}).addTo(map).bindTooltip("Nampak Thika DC (Origin)",{permanent:true,direction:"bottom",offset:[0,10]});
    markersLayerRef.current=L.layerGroup().addTo(map);
    mapInstanceRef.current=map;
    setTimeout(()=>map.invalidateSize(),100);
    return()=>{map.remove();mapInstanceRef.current=null;};
  },[]);

  // Expose flyTo on pin select via custom event — keep flyTo in caller, but ensure default not overridden
  useEffect(()=>{
    const map=mapInstanceRef.current; if(!map) return;
    if(firstLoadRef.current){ map.setView(NAMPAK,13); firstLoadRef.current=false; }
  },[pins]);

  useEffect(()=>{
    const map=mapInstanceRef.current; if(!map) return;
    if(wardsLayerRef.current){wardsLayerRef.current.remove();wardsLayerRef.current=null;}
    if(!showWards) return;
    const candidates=["/wards.geojson","/geo/wards.geojson","/geo/territory_wards.json","/assets/geo/wards.geojson"];
    (async()=>{
      let geojson:GeoJSON.FeatureCollection|null=null;
      for(const url of candidates){ try{const r=await fetch(url); if(!r.ok) continue; geojson=await r.json(); break;}catch{/* try next */} }
      if(!geojson||!mapInstanceRef.current) return;
      const feats=(geojson.features as Array<{properties?:Record<string,string>}>);
      const kiambu=feats.filter(f=>(f.properties?.zone||"").toLowerCase()==="kiambu"||(f.properties?.county||"").toLowerCase()==="kiambu");
      const data={...geojson,features:kiambu.length?kiambu:feats} as GeoJSON.GeoJsonObject;
      const activeColor=GROUP_COLORS[selectedGroup]||"#0f766e";
      const isFiltered=selectedGroup!=="All";
      const layer=L.geoJSON(data,{style:()=>({color:isFiltered?activeColor:"#0f766e",weight:isFiltered?2:1,opacity:isFiltered?0.6:0.35,fillColor:isFiltered?activeColor:"#ccfbf1",fillOpacity:isFiltered?0.18:0.08}),onEachFeature:(feature,lyr)=>{const p=(feature.properties as Record<string,string>);const label=`${p?.ward??"?"} · ${p?.constituency??""} · ${p?.zone??"Kiambu"}`;lyr.bindTooltip(label,{sticky:true,opacity:0.9});}}).addTo(map);
      wardsLayerRef.current=layer;
    })().catch(e=>console.error("[KiambuMap] wards",e));
  },[showWards,selectedGroup]);

  useEffect(()=>{
    const map=mapInstanceRef.current; const layer=markersLayerRef.current; if(!map||!layer) return;
    layer.clearLayers(); polylinesRef.current.forEach(l=>l.remove()); polylinesRef.current=[];
    const visibleRoutes=truckRoutes.filter(r=>r.points.length>=2&&(selectedGroup==="All"||r.group===selectedGroup));
    visibleRoutes.forEach(route=>{
      const color=GROUP_COLORS[route.group]||route.color||"#047857";
      const line=L.polyline(route.points,{color,weight:4.5,opacity:0.85,lineCap:"round",interactive:true}).addTo(map);
      line.bindTooltip(`<div style="font-family:system-ui;font-size:11px;"><div style="font-weight:700">${route.name}</div><div style="color:#666">${route.group} · ${route.vehicle}</div></div>`,{sticky:true});
      line.on("click",(e:L.LeafletEvent)=>{L.DomEvent.stopPropagation(e as unknown as Event);onSelectRoute?.(route);line.setStyle({weight:7,opacity:1});setTimeout(()=>line.setStyle({weight:4.5,opacity:0.85}),2000);});
      const last=route.points[route.points.length-1];
      const headIcon=L.divIcon({className:"",html:`<div style="width:28px;height:28px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;">🚚</div>`,iconSize:[28,28],iconAnchor:[14,14]});
      L.marker(last,{icon:headIcon}).addTo(layer).on("click",(e:L.LeafletEvent)=>{L.DomEvent.stopPropagation(e as unknown as Event);onSelectRoute?.(route);});
      polylinesRef.current.push(line);
    });

    // Cluster: simple debounce + layerGroup already; for >200 create lightweight clustering via grid
    const useCluster=pins.length>200;
    const grid=new Map<string,OutletPin[]>();
    const keyFor=(lat:number,lng:number)=>`${Math.round(lat*50)/50}:${Math.round(lng*50)/50}`;
    if(useCluster){pins.forEach(p=>{const k=keyFor(p.lat,p.lng);const a=grid.get(k);if(a) a.push(p); else grid.set(k,[p]);});}
    const toRender: Array<OutletPin & {count?:number}> = useCluster ? [...grid.entries()].map(([,arr])=> arr.length===1?arr[0]:{...arr[0],count:arr.length,name:`${arr.length} outlets`}):pins;

    toRender.forEach(pin=>{
      const isCluster=(pin as {count?:number}).count!==undefined;
      const isRep=pin.channel==="Field Rep";
      let color=(pin as OutletPin).color||"#047857";
      if(!isRep&&!isCluster){const t=(pin as OutletPin).accuracy_tier; color=t==="high"?"#16a34a":t==="medium"?"#f59e0b":t==="manual"?"#ca8a04":color;}
      if(isCluster){
        const c=(pin as {count?:number}).count!;
        const icon=L.divIcon({className:"",html:`<div style="width:32px;height:32px;background:#0f766e;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:12px;">${c}</div>`,iconSize:[32,32],iconAnchor:[16,16]});
        L.marker([pin.lat,pin.lng],{icon}).addTo(layer).on("click",()=>{map.flyTo([pin.lat,pin.lng],Math.min(map.getZoom()+2,16));});
        return;
      }
      if(isRep){
        const icon=L.divIcon({className:"",html:`<div style="position:relative;width:16px;height:16px;"><span style="position:absolute;inset:0;background:${color};border-radius:50%;opacity:0.35;animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></span><span style="position:absolute;inset:2px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(0,0,0,0.35);"></span></div><style>@keyframes ping{75%,100%{transform:scale(2);opacity:0}}</style>`,iconSize:[16,16],iconAnchor:[8,8]});
        L.marker([pin.lat,pin.lng],{icon}).addTo(layer).bindPopup(`<div style="font-family:system-ui;min-width:160px;"><div style="font-weight:700;font-size:13px;">${pin.name}</div><div style="font-size:11px;color:#666;">${pin.channel} · ${pin.type}</div></div>`).on("click",()=>{map.flyTo([pin.lat,pin.lng],14);onSelectPin(pin);});
      } else {
        const icon=L.divIcon({className:"",html:`<div style="width:12px;height:12px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,iconSize:[12,12],iconAnchor:[6,6]});
        L.marker([pin.lat,pin.lng],{icon}).addTo(layer).bindPopup(`<div style="font-family:system-ui;min-width:160px;"><div style="font-weight:700;font-size:13px;">${pin.name}</div><div style="font-size:11px;color:#666;">${pin.channel} · ${pin.type}</div><div style="font-size:11px;color:#666;">${pin.ward}, ${pin.county}</div></div>`).on("click",()=>{map.flyTo([pin.lat,pin.lng],14);onSelectPin(pin);});
      }
    });

    // Do NOT auto-fitBounds on every update — preserve Thika default; only fit if caller explicitly expects it via first load with no user interaction
    setTimeout(()=>map.invalidateSize(),50);
  },[pins,truckRoutes,selectedGroup,onSelectPin,onSelectRoute]);

  return <div ref={mapRef} className="w-full h-full rounded-xl overflow-hidden border border-slate-200" style={{minHeight:520,background:"#f8fafc"}}/>;
}
