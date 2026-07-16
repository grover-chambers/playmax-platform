"use client";

import { useState, useEffect, startTransition } from "react";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import FilterPill from "@/components/ui/filter-pill";
import StatusBadge from "@/components/ui/status-badge";
import Button from "@/components/ui/button";
import NewBookingModal from "@/components/modals/new-booking-modal";
import { sampleBookings } from "@/lib/data";
import { Booking } from "@/lib/types";
import Pagination, { usePagination } from "@/components/ui/pagination";

const statusFilters = [
  "All",
  "confirmed",
  "pending",
  "completed",
  "cancelled",
] as const;

const statusVariantMap: Record<
  string,
  "active" | "review" | "draft" | "confirmed"
> = {
  confirmed: "confirmed",
  pending: "review",
  completed: "active",
  cancelled: "draft",
};

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [bookings] = useState<Booking[]>(sampleBookings);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { startTransition(() => { setPage(1); }); }, [statusFilter]);

  const filtered = bookings.filter((b) => {
    if (statusFilter !== "All" && b.status !== statusFilter) return false;
    return true;
  });
  const { paginated, total } = usePagination(filtered, page, 20);

  return (
    <div className="page-content">
      <PageHeader
        title="Bookings"
        subtitle={`${filtered.length} booking${filtered.length !== 1 ? "s" : ""}`}
        actions={
          <>
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
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Booking
            </Button>
          </>
        }
      />

      <div className="pm-dash-card pm-dash-card-b-0">
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
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {paginated.map((b) => (
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
          <div className="pm-dash-card-b py-12 text-center text-[13px] text-gray-5">
            No bookings match the selected filter.
          </div>
        )}
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>

      <NewBookingModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
