"use client";

import React, { useState, useEffect, startTransition } from "react";
import StatusBadge from "@/components/ui/status-badge";
import { Calendar, MapPin, Clock, Loader2 } from "lucide-react";

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
    case "confirmed":
      return "active";
    case "pending":
      return "review";
    default:
      return "draft";
  }
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PortalBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/bookings")
      .then((r) => r.json())
      .then(({ bookings: data }) => {
        startTransition(() => {
          setBookings(data || []);
          setLoading(false);
        });
      })
      .catch(() => startTransition(() => setLoading(false)));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-teal" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold">My Bookings</h1>
        <p className="text-xs text-gray-4 mt-0.5">
          {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="pm-dash-card pm-dash-card-b text-center text-[13px] text-gray-4">
          No bookings yet
        </div>
      ) : (
        <div className="grid gap-4">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="pm-dash-card pm-dash-card-b flex items-start justify-between gap-4"
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
    </div>
  );
}
