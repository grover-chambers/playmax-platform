"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import FilterPill from "@/components/ui/filter-pill";
import StatusBadge from "@/components/ui/status-badge";
import { sampleBookings } from "@/lib/data";
import { Booking } from "@/lib/types";

const statusFilters = ["All", "confirmed", "pending", "completed", "cancelled"] as const;

const statusVariantMap: Record<string, "active" | "review" | "draft" | "confirmed"> = {
  confirmed: "confirmed",
  pending: "review",
  completed: "active",
  cancelled: "draft",
};

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [bookings] = useState<Booking[]>(sampleBookings);

  const filtered = bookings.filter((b) => {
    if (statusFilter !== "All" && b.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-[18px] font-bold">Bookings</h1>
          <p className="text-[11px] text-gray-5 mt-0.5">
            {filtered.length} booking{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-1.5">
          {statusFilters.map((f) => (
            <FilterPill
              key={f}
              active={statusFilter === f}
              onClick={() => setStatusFilter(f)}
            >
              {f === "All" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </FilterPill>
          ))}
        </div>
      </div>

      <div className="bg-black-2 border border-[#252525] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1A1A1A]">
              {["Client", "Inventory", "Start", "End", "Status", "Total"].map(
                (h) => (
                  <th
                    key={h}
                    className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr
                key={b.id}
                className="border-b border-[#1A1A1A] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 text-[13px] font-semibold">
                  {b.clientName}
                </td>
                <td className="px-4 py-3 text-[13px] text-gray-3">
                  {b.inventoryName}
                </td>
                <td className="px-4 py-3 text-[12px] text-gray-4 font-mono">
                  {format(parseISO(b.startDate), "d MMM yyyy")}
                </td>
                <td className="px-4 py-3 text-[12px] text-gray-4 font-mono">
                  {format(parseISO(b.endDate), "d MMM yyyy")}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge variant={statusVariantMap[b.status] || "draft"}>
                    {b.status.toUpperCase()}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-[13px] font-display font-bold text-yellow">
                  KES {b.totalPrice.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-[13px] text-gray-5">
            No bookings match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}
