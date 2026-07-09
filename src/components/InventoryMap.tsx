"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface MapPin {
  name: string;
  location: string;
  coords: [number, number];
  status: "available" | "booked";
}

const PINS: MapPin[] = [
  { name: "Westlands Roundabout — Screen A", location: "Westlands, Nairobi", coords: [-1.2671, 36.8143], status: "available" },
  { name: "Westlands Roundabout — Screen B", location: "Westlands, Nairobi", coords: [-1.2675, 36.8140], status: "available" },
  { name: "Mombasa Road Super-size", location: "Industrial Area", coords: [-1.3278, 36.8575], status: "available" },
  { name: "CBD Upper Hill Junction", location: "Upper Hill", coords: [-1.3010, 36.8200], status: "booked" },
  { name: "Thika Road — Safari Park", location: "Kasarani", coords: [-1.2253, 36.8958], status: "available" },
  { name: "Nyayo Stadium Roundabout", location: "South C", coords: [-1.3090, 36.8260], status: "booked" },
  { name: "Kenyatta Avenue Banner — East", location: "CBD", coords: [-1.2860, 36.8230], status: "available" },
  { name: "Lavington Road — Yaya Centre", location: "Kilimani", coords: [-1.2895, 36.7820], status: "available" },
  { name: "Waiyaki Way — Uthiru", location: "Uthiru", coords: [-1.2548, 36.7165], status: "available" },
];

export function InventoryMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !mapRef.current) return;
    initializedRef.current = true;

    const initMap = async () => {
      const L = await import("leaflet");

      const map = L.map(mapRef.current!, {
        center: [-1.286, 36.82],
        zoom: 12,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:var(--pm-yellow);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: "",
      });

      const bookedIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#666;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: "",
      });

      PINS.forEach((pin) => {
        const marker = L.marker(pin.coords, {
          icon: pin.status === "available" ? icon : bookedIcon,
        }).addTo(map);

        marker.bindPopup(`
          <strong>${pin.name}</strong><br/>
          <span style="color:#666;font-size:12px">${pin.location}</span><br/>
          <span style="color:${pin.status === "available" ? "#22c55e" : "#ef4444"};font-size:11px;font-weight:600">
            ${pin.status === "available" ? "● AVAILABLE" : "● BOOKED"}
          </span>
        `);
      });

      // Fix Leaflet icon path issue
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    };

    initMap();
  }, []);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "400px",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    />
  );
}
