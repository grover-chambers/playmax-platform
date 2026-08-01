"use client";

import React from "react";
import { MapPin, Eye } from "lucide-react";
import Badge from "@/components/ui/badge";
import { InventoryItem } from "@/lib/types";

interface InventoryCardFullProps {
  item: InventoryItem;
  isActive: boolean;
  onClick: () => void;
}

function InventoryCardFull({
  item,
  isActive,
  onClick,
}: InventoryCardFullProps) {
  const isAvailable = item.status === "available";

  return (
    <div
      onClick={onClick}
      className={`inventory-card ${isActive ? "border-[var(--ws-accent)]!" : ""}`}
    >
      <div
        className={`inventory-card-img h-[130px]! ${item.imageGradient || "from-[#1a1a1a] to-[#2e2e2e]"}`}
      >
        <MapPin className="w-10 h-10 text-gray-5" />
        <Badge
          variant={isAvailable ? "available" : "booked"}
          className="inventory-card-badge"
        >
          {isAvailable ? "AVAILABLE" : "BOOKED"}
        </Badge>
      </div>
      <div className="inventory-card-body">
        <div className="inventory-type">{item.type}</div>
        <div className="inventory-name text-[14px]! leading-tight">
          {item.name}
        </div>
        <div className="inventory-location flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {item.location}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-5 mt-3">
          <Eye className="w-3 h-3" />
          {item.dailyImpressions.toLocaleString()} impressions/day
        </div>
      </div>
      <div className="inventory-card-footer">
        <div className="inventory-price">
          KES {item.price.toLocaleString()}
          <span className="inventory-price-unit"> /month</span>
        </div>
        <button className={`btn-sm ${isAvailable ? "btn-sm-primary" : ""}`}>
          {isAvailable ? "Book Now" : "Waitlist"}
        </button>
      </div>
    </div>
  );
}

export default InventoryCardFull;
