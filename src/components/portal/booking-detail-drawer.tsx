"use client";

import React from "react";
import { X, Calendar, MapPin, Clock, FileText } from "lucide-react";
import StatusBadge from "@/components/ui/status-badge";

interface BookingDetail {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  notes: string | null;
  inventory?: {
    name: string;
    location: string;
    type: string;
  } | null;
}

interface BookingDetailDrawerProps {
  booking: BookingDetail | null;
  onClose: () => void;
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapStatus(status: string): "active" | "review" | "draft" {
  switch (status) {
    case "confirmed": return "active";
    case "pending": return "review";
    default: return "draft";
  }
}

export default function BookingDetailDrawer({ booking, onClose }: BookingDetailDrawerProps) {
  if (!booking) return null;

  const start = new Date(booking.start_date);
  const end = new Date(booking.end_date);
  const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#111] border-l border-[#2A2A2A] z-50 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-[#111] border-b border-[#2A2A2A] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-display text-[15px] font-bold text-white">Booking Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X size={18} className="text-gray-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow/10 border border-yellow/20 flex items-center justify-center flex-shrink-0">
              <Calendar size={22} className="text-yellow" />
            </div>
            <div>
              <div className="font-display text-[16px] font-bold text-white">
                {booking.inventory?.name || "Booking"}
              </div>
              <StatusBadge variant={mapStatus(booking.status)}>
                {booking.status}
              </StatusBadge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[13px] text-gray-3">
              <MapPin size={14} className="text-gray-5 flex-shrink-0" />
              <span>{booking.inventory?.location || "No location specified"}</span>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-gray-3">
              <Clock size={14} className="text-gray-5 flex-shrink-0" />
              <span>{formatDate(booking.start_date)} — {formatDate(booking.end_date)}</span>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-gray-3">
              <FileText size={14} className="text-gray-5 flex-shrink-0" />
              <span>{booking.inventory?.type?.replace(/_/g, " ") || "Media"}</span>
            </div>
          </div>

          <div className="border-t border-[#2A2A2A] pt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-gray-5 uppercase tracking-wider">Duration</span>
              <span className="text-[13px] text-gray-3 font-mono">
                {durationDays} day{durationDays !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-5 uppercase tracking-wider">Total Price</span>
              <span className="text-[18px] font-display font-bold text-teal">
                {formatCurrency(booking.total_price)}
              </span>
            </div>
          </div>

          {booking.notes && (
            <div className="border-t border-[#2A2A2A] pt-4">
              <div className="text-[11px] text-gray-5 uppercase tracking-wider mb-2">Notes</div>
              <div className="text-[13px] text-gray-3 leading-relaxed">{booking.notes}</div>
            </div>
          )}

          <div className="border-t border-[#2A2A2A] pt-4">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-lg border border-[#2A2A2A] text-[12px] text-gray-3 hover:text-white hover:border-gray-5 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
