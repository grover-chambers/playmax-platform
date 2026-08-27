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

const GROUP_COLORS: Record<string, string> = {
  A: "#047857",
  B: "#0369a1",
  C: "#7c3aed",
  D: "#c2410c",
  E: "#be185d",
  F: "#15803d",
  G: "#a16207",
};

export default function LeafletMapInner({
  pins,
  selectedGroup,
  onSelectPin,
}: {
  pins: OutletPin[];
  selectedGroup: string;
  onSelectPin: (pin: OutletPin) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([-1.29, 36.82], 6);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);
    mapInstanceRef.current = map;
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (pins.length === 0) return;

    const bounds: [number, number][] = [];

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
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${pin.name}</div>
            <div style="font-size:11px;color:#666;">${pin.channel || "N/A"} &middot; ${pin.type || "N/A"}</div>
            <div style="font-size:11px;color:#666;margin-top:2px;">${pin.ward || ""}, ${pin.county || ""}</div>
            <div style="font-size:10px;color:#999;margin-top:4px;">Size: ${pin.size || "N/A"}</div>
          </div>`,
        )
        .on("click", () => onSelectPin(pin));

      markersRef.current.push(marker);
      bounds.push([pin.lat, pin.lng]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [pins, selectedGroup, onSelectPin]);

  return <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: 500 }} />;
}
