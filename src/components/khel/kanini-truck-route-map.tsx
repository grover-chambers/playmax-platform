"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";

interface OutletPin {
  id: string;
  name: string;
  channel: string;
  type: string;
  lat: number;
  lng: number;
  ward: string;
  constituency: string;
  county: string;
  size: string;
}

interface TruckRoute {
  id: string;
  name: string;
  group: string;
  vehicle: string;
  points: [number, number][];
  color: string;
}

const GROUP_COLORS: Record<string, string> = {
  A: "#047857",
  B: "#0369a1",
  C: "#7c3aed",
  D: "#c2410c",
  E: "#be185d",
  F: "#15803d",
  G: "#a16207",
};

export default function KaniniTruckRouteMap({
  pins,
  truckRoutes,
  selectedRouteId,
  selectedGroup,
  showWards,
  onSelectPin,
}: {
  pins: OutletPin[];
  truckRoutes: TruckRoute[];
  selectedRouteId: string | null;
  selectedGroup: string;
  showWards: boolean;
  onSelectPin: (pin: OutletPin) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const wardsLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([-1.29, 36.82], 7);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap | Kanini Field",
      maxZoom: 18,
    }).addTo(map);
    mapInstanceRef.current = map;
  }, []);

  // Wards overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (wardsLayerRef.current) {
      wardsLayerRef.current.remove();
      wardsLayerRef.current = null;
    }
    if (!showWards) return;
    fetch("/geo/territory_wards.json")
      .then((r) => r.json())
      .then((geojson) => {
        if (!mapInstanceRef.current) return;
        const layer = L.geoJSON(geojson, {
          style: {
            color: "#0f766e",
            weight: 1,
            opacity: 0.35,
            fillColor: "#ccfbf1",
            fillOpacity: 0.08,
          },
          onEachFeature: (feature, lyr) => {
            const p = feature.properties as { ward?: string; constituency?: string };
            if (p?.ward) (lyr as L.Path).bindTooltip(`${p.ward} · ${p.constituency ?? ""}`, { sticky: true, opacity: 0.9 });
          },
        }).addTo(map);
        wardsLayerRef.current = layer;
      })
      .catch(() => {});
  }, [showWards]);

  // Markers + polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    polylinesRef.current.forEach((l) => l.remove());
    polylinesRef.current = [];

    const bounds: [number, number][] = [];

    // Polylines first (under markers)
    truckRoutes.forEach((route) => {
      if (route.points.length < 2) return;
      const isSelected = selectedRouteId ? route.id === selectedRouteId : selectedGroup === "All" || route.group === selectedGroup;
      // Dim non-selected when a filter is active
      const dimmed = selectedRouteId ? !isSelected : selectedGroup !== "All" && route.group !== selectedGroup;
      const color = GROUP_COLORS[route.group] || route.color || "#047857";
      const line = L.polyline(route.points, {
        color,
        weight: isSelected ? 4 : dimmed ? 1.5 : 2.5,
        opacity: isSelected ? 0.9 : dimmed ? 0.25 : 0.55,
        dashArray: isSelected ? undefined : "6 6",
        lineCap: "round",
      });
      // Arrow-like decorator: add truck head marker at start
      line.addTo(map).bindTooltip(
        `<div style="font-family:system-ui;font-size:11px;min-width:120px"><div style="font-weight:700">${route.name}</div><div style="color:#666">${route.group} · ${route.vehicle}</div><div style="color:#999;font-size:10px">${route.points.length} stops</div></div>`,
        { sticky: true }
      );
      // Truck head
      const headIcon = L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:10px">🚚</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const head = L.marker(route.points[0], { icon: headIcon }).addTo(map);
      markersRef.current.push(head);
      polylinesRef.current.push(line);
      route.points.forEach((pt) => bounds.push(pt));
    });

    // Outlet pins
    pins.forEach((pin) => {
      const color = GROUP_COLORS[selectedGroup] || "#047857";
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:10px;height:10px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      const marker = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui;min-width:160px;">
            <div style="font-weight:700;font-size:12px;margin-bottom:2px;">${pin.name}</div>
            <div style="font-size:11px;color:#666;">${pin.channel || "N/A"} · ${pin.type || "N/A"} · ${pin.size || ""}</div>
            <div style="font-size:11px;color:#666;">${pin.ward || ""}, ${pin.county || ""}</div>
            <div style="font-size:10px;color:#0f766e;margin-top:4px;">Route group ${pin.ward ? pin.ward.charAt(0) : selectedGroup} · tap to inspect</div>
          </div>`
        )
        .on("click", () => onSelectPin(pin));
      markersRef.current.push(marker);
      bounds.push([pin.lat, pin.lng]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [pins, truckRoutes, selectedRouteId, selectedGroup, showWards, onSelectPin]);

  return <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: 520 }} />;
}
