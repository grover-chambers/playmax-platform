"use client";

import { MapPin } from "lucide-react";
import { MiniMap } from "@/components/ui/MiniMap";

interface InventoryCardProps {
  type: string;
  name: string;
  location: string;
  price: number;
  status: "available" | "booked";
  specs?: string;
  ctaText?: string;
  coords?: [number, number];
}

export function InventoryCard({
  type,
  name,
  location,
  price,
  status,
  specs,
  ctaText,
  coords,
}: InventoryCardProps) {
  const isAvailable = status === "available";

  return (
    <div className="inventory-card">
      <div className="inventory-card-img" style={{ overflow: "hidden" }}>
        {coords ? (
          <MiniMap coords={coords} status={status} />
        ) : (
          <MapPin className="w-10 h-10 text-gray-5" />
        )}
        <span
          className={`inventory-card-badge badge ${isAvailable ? "badge-available" : "badge-booked"}`}
        >
          {isAvailable ? "AVAILABLE" : "BOOKED"}
        </span>
      </div>
      <div className="inventory-card-body">
        <div className="inventory-type">{type}</div>
        <div className="inventory-name">{name}</div>
        <div className="inventory-location flex items-center gap-1">
          <MapPin className="w-3 h-3 text-gray-5" />
          {location}
          {specs && <span className="text-gray-5">· {specs}</span>}
        </div>
      </div>
      <div className="inventory-card-footer">
        <div className="inventory-price">
          KES {price.toLocaleString()}{" "}
          <span className="inventory-price-unit">/month</span>
        </div>
        <div className="text-[11px] text-gray-4">
          {ctaText || (isAvailable ? "Inquire →" : "Join waitlist →")}
        </div>
      </div>
    </div>
  );
}
