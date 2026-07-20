"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { InventoryItem } from "@/lib/types";

const defaultIcon = L.divIcon({
  className: "",
  html: `<div style="background:#0F6E56;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const bookedIcon = L.divIcon({
  className: "",
  html: `<div style="background:#B8860B;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const centerMap: [number, number] = [-1.286389, 36.817223];

interface InventoryMapViewProps {
  inventory: InventoryItem[];
}

export default function InventoryMapView({ inventory }: InventoryMapViewProps) {
  if (typeof window === "undefined") {
    return (
      <div className="flex items-center justify-center py-20 text-gray-5 text-[13px]">
        Loading map...
      </div>
    );
  }

  return (
    <div className="px-7 py-5 h-[600px]">
      <MapContainer
        center={centerMap}
        zoom={12}
        className="w-full h-full rounded-xl border border-[#2A2A2A]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {inventory.map((item) => {
          const coords = parseCoords(item.location);
          if (!coords) return null;
          return (
            <Marker
              key={item.id}
              position={coords}
              icon={item.status === "available" ? defaultIcon : bookedIcon}
            >
              <Popup>
                <div className="text-[12px]" style={{ fontFamily: "system-ui" }}>
                  <strong>{item.name}</strong>
                  <br />
                  <span style={{ color: "#666" }}>{item.type}</span>
                  <br />
                  <span style={{ color: "#666" }}>{item.location}</span>
                  <br />
                  <span style={{ color: item.status === "available" ? "#059669" : "#B8860B", fontWeight: 600 }}>
                    {item.status === "available" ? "Available" : "Booked"}
                  </span>
                  <br />
                  <span style={{ fontWeight: 600 }}>KES {item.price.toLocaleString()}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

function parseCoords(location: string): [number, number] | null {
  const match = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (match) return [parseFloat(match[1]), parseFloat(match[2])];
  return null;
}
