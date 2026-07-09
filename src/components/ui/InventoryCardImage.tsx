"use client";

import { MiniMap } from "@/components/ui/MiniMap";

interface InventoryCardImageProps {
  name: string;
  location: string;
  status: "available" | "booked";
  coords: [number, number];
}

export function InventoryCardImage({
  name,
  location,
  status,
  coords,
}: InventoryCardImageProps) {
  return (
    <div
      className="pm-inventory-card-img"
      style={{ overflow: "hidden" }}
    >
      <MiniMap coords={coords} status={status} />

      {/* Location + name overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 z-10">
        <div
          className="mb-1"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "var(--pm-yellow)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {location}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--pm-white)",
            lineHeight: 1.2,
          }}
        >
          {name}
        </div>
      </div>

      {/* Status badge */}
      <span
        className={`pm-badge absolute top-2.5 right-2.5 z-10 ${
          status === "available" ? "pm-badge-available" : "pm-badge-booked"
        }`}
      >
        {status === "available" ? "AVAILABLE" : "BOOKED"}
      </span>
    </div>
  );
}
