"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

export default function KiambuMap({
  pins,
  truckRoutes,
  selectedGroup,
  showWards,
  onSelectPin,
}: {
  pins: OutletPin[];
  truckRoutes: TruckRoute[];
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

    // Initialize map centered on Kiambu: [-1.033, 37.07]
    const map = L.map(mapRef.current, { zoomControl: false }).setView([-1.033, 37.07], 10);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Use CartoDB Light tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Add Nampak Warehouse (Distribution Center)
    const warehouseIcon = L.divIcon({
      className: "",
      html: `<div style="width:32px;height:32px;background:#1e293b;border:3px solid #fff;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:18px;color:white;">🏭</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker([-1.0396, 37.0700], { icon: warehouseIcon })
      .addTo(map)
      .bindTooltip("Thika Nampak Warehouse (DC)", { permanent: true, direction: "top", offset: [0, -10] });

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
        weight: 3.5,
        opacity: 0.8,
        lineCap: "round",
      }).addTo(map);

      line.bindTooltip(
        `<div style="font-family:system-ui;font-size:11px;">
          <div style="font-weight:700">${route.name}</div>
          <div style="color:#666">${route.group} · ${route.vehicle}</div>
        </div>`,
        { sticky: true }
      );

      // Add truck head marker at the start
      const headIcon = L.divIcon({
        className: "",
        html: `<div style="width:24px;height:24px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;">🚚</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const headMarker = L.marker(route.points[0], { icon: headIcon }).addTo(map);

      markersRef.current.push(headMarker);
      polylinesRef.current.push(line);
      route.points.forEach((pt) => bounds.push(pt));
    });

    // Draw Outlet Pins
    pins.forEach((pin) => {
      const color = GROUP_COLORS[selectedGroup] || "#047857";
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
  }, [pins, truckRoutes, selectedGroup, showWards, onSelectPin]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-xl overflow-hidden border border-slate-200"
      style={{ minHeight: 520, background: "#f8fafc" }}
    />
  );
}
