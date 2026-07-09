"use client";

import { useEffect, useRef } from "react";

interface MiniMapProps {
  coords: [number, number];
  status: "available" | "booked";
}

export function MiniMap({ coords, status }: MiniMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !mapRef.current) return;
    initializedRef.current = true;

    const initMap = async () => {
      const L = await import("leaflet");

      const map = L.map(mapRef.current!, {
        center: coords,
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      const color = status === "available" ? "#F4C300" : "#666";
      const icon = L.divIcon({
        html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        className: "",
      });

      L.marker(coords, { icon }).addTo(map);
    };

    initMap();
  }, [coords, status]);

  return (
    <div
      ref={mapRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}
