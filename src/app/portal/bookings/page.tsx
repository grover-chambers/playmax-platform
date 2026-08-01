"use client";

import React, { useState, useEffect, startTransition } from "react";
import StatusBadge from "@/components/ui/status-badge";
import BookingDetailDrawer from "@/components/portal/booking-detail-drawer";
import BookingsCalendar from "@/components/portal/bookings-calendar";
import Pagination from "@/components/ui/pagination";
import PageHeader from "@/components/layout/page-header";
import { Calendar, MapPin, Clock, Loader2, List, CalendarDays } from "lucide-react";

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  notes: string | null;
  inventory?: { name: string; location: string; type: string } | null;
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

function mapStatus(status: string): "active" | "review" | "draft" {
  switch (status) {
    case "confirmed": return "active";
    case "pending": return "review";
    default: return "draft";
  }
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const PAGE_LIMIT = 20;

export default function PortalBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  useEffect(() => {
    fetch(`/api/portal/bookings?page=${page}&limit=${PAGE_LIMIT}`)
      .then((r) => r.json())
      .then(({ bookings: data, total: t }) => {
        startTransition(() => {
          setBookings(data || []);
          setTotal(t ?? data?.length ?? 0);
          setLoading(false);
        });
      })
      .catch(() => startTransition(() => setLoading(false)));
  }, [page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-teal" />
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Bookings"
        subtitle={`${bookings.length} booking${bookings.length !== 1 ? "s" : ""}`}
        actions={
          <div className="flex gap-1 bg-[var(--ws-bg)] border border-[var(--ws-border)] rounded p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === "list" ? "bg-teal/10 text-teal" : "text-gray-5 hover:text-gray-3"
              }`}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === "calendar" ? "bg-teal/10 text-teal" : "text-gray-5 hover:text-gray-3"
              }`}
            >
              <CalendarDays size={14} />
            </button>
          </div>
        }
      />

      {viewMode === "calendar" && bookings.length > 0 && (
        <div className="pm-dash-card p-5 mb-6">
          <BookingsCalendar bookings={bookings} />
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="pm-dash-card pm-dash-card-b text-center text-[13px] text-gray-4">
          No bookings yet
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelectedBooking(b)}
              className="pm-dash-card pm-dash-card-b flex items-start justify-between gap-4 cursor-pointer hover:border-yellow/20 transition-colors"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-black-3 border border-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                  <Calendar size={20} className="text-yellow" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-[15px] font-bold text-white leading-tight">
                    {b.inventory?.name || "Booking"}
                  </div>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {b.inventory?.location && (
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-4">
                        <MapPin size={11} className="flex-shrink-0" />
                        {b.inventory.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-4 font-mono">
                      <Clock size={11} className="flex-shrink-0" />
                      {formatDate(b.start_date)} — {formatDate(b.end_date)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-5 uppercase tracking-wider">
                      {b.inventory?.type?.replace(/_/g, " ") || "Media"}
                    </span>
                    <span className="text-[12px] font-display font-bold text-teal">
                      {formatCurrency(b.total_price)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <StatusBadge variant={mapStatus(b.status)}>{b.status}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === "list" && !loading && bookings.length > 0 && (
        <Pagination page={page} total={total} limit={PAGE_LIMIT} onChange={setPage} />
      )}

      <BookingDetailDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
}
