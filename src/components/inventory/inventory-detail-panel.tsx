"use client";

import React from "react";
import { MapPin, Eye, Calendar, IndianRupee } from "lucide-react";
import Badge from "@/components/ui/badge";
import CalendarUI from "@/components/ui/calendar";
import Button from "@/components/ui/button";
import { InventoryItem } from "@/lib/types";

interface InventoryDetailPanelProps {
  item: InventoryItem;
  onBook: () => void;
}

function InventoryDetailPanel({ item, onBook }: InventoryDetailPanelProps) {
  const isAvailable = item.status === "available";

  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const dayNum = i - 2;
    if (i < 2) return { label: "", status: "empty" as const };
    if (i < 9)
      return {
        label: ["S", "M", "T", "W", "T", "F", "S"][i - 2],
        status: "header" as const,
      };
    const day = dayNum - 5;
    if (day < 1 || day > 31) return { label: "", status: "empty" as const };
    if (day === 15) return { label: String(day), status: "today" as const };
    if (!isAvailable && day >= 1 && day <= 20)
      return { label: String(day), status: "taken" as const };
    return { label: String(day), status: "free" as const };
  });

  return (
    <div className="w-[360px] border-l border-[var(--ws-border)] bg-[var(--ws-bg)] flex flex-col overflow-y-auto flex-shrink-0">
      <div
        className={`h-[200px] bg-gradient-to-br ${item.imageGradient || "from-[#1a1a1a] to-[#2e2e2e]"} flex items-center justify-center relative`}
      >
        <MapPin className="w-16 h-16 text-gray-5" />
      </div>

      <div className="p-5 flex-1">
        <Badge variant={isAvailable ? "available" : "booked"} className="mb-3">
          {isAvailable ? "AVAILABLE" : "BOOKED"}
        </Badge>
        <div className="inventory-type text-[9px]!">{item.type}</div>
        <h2 className="font-display text-[16px] font-bold mb-1">{item.name}</h2>
        <div className="inventory-location flex items-center gap-1 mb-5">
          <MapPin className="w-3 h-3" />
          {item.location}
        </div>

        <div className="mb-5">
          <h3 className="eyebrow text-[9px]! text-gray-5! mb-3">
            Specifications
          </h3>
          <div className="spec-grid">
            {[
              { label: "Size", value: item.size },
              { label: "Resolution", value: item.resolution },
              { label: "Type", value: item.type },
              {
                label: "Impressions/day",
                value: item.dailyImpressions.toLocaleString(),
              },
            ].map((spec) => (
              <div key={spec.label} className="spec-item">
                <div className="spec-key">{spec.label}</div>
                <div className="spec-value">
                  {spec.label === "Impressions/day" ? (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-gray-4" />
                      {spec.value}
                    </span>
                  ) : (
                    spec.value
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {!isAvailable && item.bookedBy && (
          <div className="mb-4 bg-red/5 border border-red/15 rounded-sm px-3 py-2">
            <span className="text-[10px] text-red font-mono">
              Booked by {item.bookedBy} until {item.bookedUntil}
            </span>
          </div>
        )}

        <div className="mb-5">
          <h3 className="eyebrow text-[9px]! text-gray-5! mb-3 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            Availability — July 2026
          </h3>
          <CalendarUI days={calendarDays} />
        </div>

        <div className="mb-5">
          <h3 className="eyebrow text-[9px]! text-gray-5! mb-3 flex items-center gap-1.5">
            <IndianRupee className="w-3 h-3" />
            Pricing
          </h3>
          <div className="kpi-big-card">
            <div className="kpi-big-num">
              KES {item.price.toLocaleString()}
              <span className="text-[12px] text-gray-5 font-normal">
                {" "}
                /month
              </span>
            </div>
            <div className="kpi-big-label">
              {item.dailyImpressions.toLocaleString()} impressions/day
            </div>
          </div>
        </div>

        {isAvailable ? (
          <Button
            variant="primary"
            size="md"
            className="w-full!"
            onClick={onBook}
          >
            Create Booking
          </Button>
        ) : (
          <Button variant="secondary" size="md" className="w-full!">
            Join Waitlist
          </Button>
        )}
      </div>
    </div>
  );
}

export default InventoryDetailPanel;
