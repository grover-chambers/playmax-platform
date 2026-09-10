"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface OutletPin {
  accuracy_tier?: string | null; gps_final_lat?: number | null; gps_final_lng?: number | null;
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

export default function KiambuMap({
  pins,
  truckRoutes,
  selectedGroup,
  showWards,
  onSelectPin,
  onSelectRoute,
}: {
  pins: OutletPin[];
  truckRoutes: TruckRoute[];
  selectedGroup: string;
  showWards: boolean;
  onSelectPin: (pin: OutletPin) => void;
  onSelectRoute?: (route: TruckRoute) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const wardsLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on Kiambu: [-1.033, 37.07]
    const map = L.map(mapRef.current, { zoomControl: false }).setView([-1.033, 37.07], 10);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Use OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);

    // Add Nampak Warehouse (Distribution Center)
    const warehouseIcon = L.divIcon({
      className: "",
      html: `<div style="width:36px;height:36px;background:#1e293b;border:3px solid #fff;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:20px;color:white;">🏭</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    // Precise Nampak Thika Gate: -1.0423, 37.0684
    L.marker([-1.0423, 37.0684], { icon: warehouseIcon })
      .addTo(map)
      .bindTooltip("Nampak Thika DC (Origin)", { permanent: true, direction: "bottom", offset: [0, 10] });

    mapInstanceRef.current = map;
    // Invalidate size to ensure correct rendering
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
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

        // Filter for Kiambu features
        const kiambuFeatures = (geojson.features as Array<{ properties?: Record<string, string> }>).filter(
          (f) =>
            (f.properties?.zone || "").toLowerCase() === "kiambu" ||
            (f.properties?.county || "").toLowerCase() === "kiambu"
        );

        const kiambuGeojson = {
          ...geojson,
          features: kiambuFeatures.length ? kiambuFeatures : geojson.features,
        };

        const activeColor = GROUP_COLORS[selectedGroup] || "#0f766e";
        const isFiltered = selectedGroup !== "All";

        const layer = L.geoJSON(kiambuGeojson, {
          style: () => ({
            color: isFiltered ? activeColor : "#0f766e",
            weight: isFiltered ? 2 : 1,
            opacity: isFiltered ? 0.6 : 0.35,
            fillColor: isFiltered ? activeColor : "#ccfbf1",
            fillOpacity: isFiltered ? 0.18 : 0.08,
          }),
          onEachFeature: (feature, lyr) => {
            const p = feature.properties;
            const label = `${p?.ward ?? "?"} · ${p?.constituency ?? ""} · ${p?.zone ?? "Kiambu"}`;
            lyr.bindTooltip(label, { sticky: true, opacity: 0.9 });
          },
        }).addTo(map);

        wardsLayerRef.current = layer;

        // Fit to Kiambu bounds if features were found
        if (kiambuFeatures.length > 0) {
          const b = layer.getBounds();
          if (b.isValid()) map.fitBounds(b.pad(0.1), { maxZoom: 11 });
        }
      })
      .catch((err) => console.error("[KiambuMap] Failed to load wards", err));
  }, [showWards, selectedGroup]);

  // Markers, Routes, and Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean old markers and polylines
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    polylinesRef.current.forEach((l) => l.remove());
    polylinesRef.current = [];

    const bounds: L.LatLngExpression[] = [];

    // Draw Truck Routes
    const visibleRoutes = truckRoutes.filter(
      (r) => r.points.length >= 2 && (selectedGroup === "All" || r.group === selectedGroup)
    );

    visibleRoutes.forEach((route) => {
      const color = GROUP_COLORS[route.group] || route.color || "#047857";
      const line = L.polyline(route.points, {
        color,
        weight: 4.5,
        opacity: 0.85,
        lineCap: "round",
        interactive: true,
      }).addTo(map);

      line.bindTooltip(
        `<div style="font-family:system-ui;font-size:11px;">
          <div style="font-weight:700">${route.name}</div>
          <div style="color:#666">${route.group} · ${route.vehicle}</div>
        </div>`,
        { sticky: true }
      );

      line.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRoute?.(route);
        // Visual feedback
        line.setStyle({ weight: 7, opacity: 1 });
        setTimeout(() => line.setStyle({ weight: 4.5, opacity: 0.85 }), 2000);
      });

      // Add truck head marker at the current/last point
      const lastPoint = route.points[route.points.length - 1];
      const headIcon = L.divIcon({
        className: "",
        html: `<div style="width:28px;height:28px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;">🚚</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const headMarker = L.marker(lastPoint, { icon: headIcon })
        .addTo(map)
        .on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectRoute?.(route);
        });

      markersRef.current.push(headMarker);
      polylinesRef.current.push(line);
      route.points.forEach((pt) => bounds.push(pt));
    });

    // Draw Outlet Pins
    pins.forEach((pin) => {
      const tier = (pin as any).accuracy_tier; const color = tier==='high'? '#16a34a' : tier==='medium'? '#f59e0b' : tier==='manual'? '#ca8a04' : (GROUP_COLORS[selectedGroup] || "#047857");
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:12px;height:12px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui;min-width:160px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:2px;">${pin.name}</div>
            <div style="font-size:11px;color:#666;">${pin.channel || "N/A"} · ${pin.type || "N/A"}</div>
            <div style="font-size:11px;color:#666;">${pin.ward || ""}, ${pin.county || ""}</div>
          </div>`
        )
        .on("click", () => onSelectPin(pin));

      markersRef.current.push(marker);
      bounds.push([pin.lat, pin.lng]);
    });

    // Adjust view to fit bounds
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 14 });
    } else if (!showWards) {
      map.setView([-1.033, 37.07], 10);
    }

    setTimeout(() => map.invalidateSize(), 50);
  }, [pins, truckRoutes, selectedGroup, showWards, onSelectPin, onSelectRoute]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl overflow-hidden border border-slate-200"
      style={{ minHeight: 520, background: "#f8fafc" }}
    />
  );
}
