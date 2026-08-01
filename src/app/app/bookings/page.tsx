"use client";

import { useState, useEffect, startTransition } from "react";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import FilterPill from "@/components/ui/filter-pill";
import Button from "@/components/ui/button";
import NewBookingModal from "@/components/modals/new-booking-modal";
import { Booking } from "@/lib/types";
import Pagination, { usePagination } from "@/components/ui/pagination";

/* ── raw row shape returned by Supabase ──────────────── */
interface RawBookingRow {
  id: string;
  client_id: string;
  inventory_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  created_at: string;
  inventory?: { name: string } | null;
  clients?: { company: string } | null;
}

/* ── map snake_case DB row → camelCase Booking ─── */
function mapBooking(row: RawBookingRow): Booking {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.clients?.company ?? "—",
    inventoryId: row.inventory_id,
    inventoryName: row.inventory?.name ?? "—",
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as Booking["status"],
    totalPrice: row.total_price,
    createdAt: row.created_at,
  };
}

/* ── constants ────────────────────────────────────────── */
const statusFilters = [
  "All",
  "confirmed",
  "pending",
  "completed",
  "cancelled",
] as const;

const statusBdgMap: Record<string, string> = {
  confirmed: "pm-dash-bdg-g",
  pending: "pm-dash-bdg-y",
  completed: "pm-dash-bdg-b",
  cancelled: "pm-dash-bdg-n",
};

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  /* ── fetch bookings from API route ──────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/bookings");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setBookings((json.data || []).map(mapBooking));
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load bookings",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => { startTransition(() => { setPage(1); }); }, [statusFilter]);

  const filtered = bookings.filter((b) => {
    if (statusFilter !== "All" && b.status !== statusFilter) return false;
    return true;
  });
  const { paginated, total } = usePagination(filtered, page, 20);

  return (
    <div className="page-content space-y-5">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-5 text-[13px]">
          Loading bookings…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-red text-[13px]">
          {error}
        </div>
      ) : (
        <>
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

          <div className="ws-panel overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--ws-border)]">
                  {["Client", "Inventory", "Start", "End", "Status", "Total"].map(
                    (h) => (
                      <th
                        key={h}
                        className="font-mono text-[11px] text-gray-5 font-semibold tracking-widest uppercase text-left px-4 py-3"
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
                    className="border-b border-[var(--ws-border)] hover:bg-[var(--ws-bg)] transition-colors"
                  >
                    <td className="px-4 py-3 text-[13px] font-semibold text-[var(--ws-text)]">
                      {b.clientName}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-4">
                      {b.inventoryName}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-4 font-mono">
                      {format(parseISO(b.startDate), "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-4 font-mono">
                      {format(parseISO(b.endDate), "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`pm-dash-bdg ${statusBdgMap[b.status] || "pm-dash-bdg-n"}`}
                      >
                        {b.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-display font-bold text-[var(--ws-accent)]">
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
            <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
          </div>

          <NewBookingModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
      )}
    </div>
  );
}
