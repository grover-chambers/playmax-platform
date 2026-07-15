"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import Pagination, { usePagination } from "@/components/ui/pagination";
import { Calendar, MapPin, Clock, ExternalLink } from "lucide-react";

interface Booking {
  id: string;
  title: string;
  location: string;
  type: string;
  dateStart: string;
  dateEnd: string;
  status: "confirmed" | "pending" | "completed";
}

const bookings: Booking[] = [
  {
    id: "BK-2026-001",
    title: "Westlands Roundabout — Screen A",
    location: "Westlands, Nairobi",
    type: "Digital Screen",
    dateStart: "22 Jul 2026",
    dateEnd: "31 Jul 2026",
    status: "confirmed",
  },
  {
    id: "BK-2026-002",
    title: "CBD Upper Hill Junction",
    location: "Upper Hill, Nairobi",
    type: "Billboard",
    dateStart: "15 Aug 2026",
    dateEnd: "14 Sep 2026",
    status: "pending",
  },
  {
    id: "BK-2025-018",
    title: "Mombasa Road Super-size",
    location: "Industrial Area, Nairobi",
    type: "Billboard",
    dateStart: "01 Mar 2026",
    dateEnd: "31 Mar 2026",
    status: "completed",
  },
];

export default function PortalBookingsPage() {
  const [page, setPage] = useState(1);
  const { paginated, total } = usePagination(bookings, page, 20);
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-xl font-bold">My Bookings</h1>
        <p className="text-xs text-gray-4 mt-0.5">
          Media inventory you currently have reserved
        </p>
      </div>

      <div className="grid gap-4">
        {paginated.map((b) => (
          <div
            key={b.id}
            className="bg-black-2 border border-[#252525] rounded-lg px-6 py-5 flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-lg bg-black-3 border border-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                <Calendar size={20} className="text-yellow" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-[15px] font-bold text-white leading-tight">
                  {b.title}
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-4">
                    <MapPin size={11} className="flex-shrink-0" />
                    {b.location}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-4 font-mono">
                    <Clock size={11} className="flex-shrink-0" />
                    {b.dateStart} — {b.dateEnd}
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] font-mono text-gray-5 uppercase tracking-wider">
                    {b.type}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <StatusBadge
                variant={
                  b.status === "confirmed"
                    ? "active"
                    : b.status === "pending"
                      ? "review"
                      : "draft"
                }
              >
                {b.status === "confirmed"
                  ? "Confirmed"
                  : b.status === "pending"
                    ? "Pending"
                    : "Completed"}
              </StatusBadge>
              <Button variant="secondary" size="sm">
                <ExternalLink size={12} className="mr-1.5" />
                Details
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
    </div>
  );
}
