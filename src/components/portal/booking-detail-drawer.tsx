"use client";

import React, { useEffect, useRef } from "react";
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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function BookingDetailDrawer({ booking, onClose }: BookingDetailDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!booking) return;

    const panel = panelRef.current;
    // Save the trigger only once per open — repeated parent re-renders
    // while the dialog is open must not clobber the original trigger.
    if (!previouslyFocusedRef.current || previouslyFocusedRef.current === document.body) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      // Trap Tab within the dialog while open
      if (e.key === "Tab" && panel) {
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusables.length === 0) {
          // No focusable elements inside — keep focus on the close button/panel
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || active === panel || !panel.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last || active === panel || !panel.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    // Move focus into the dialog (close button, or panel if none found)
    const closeButton = panel?.querySelector<HTMLElement>('[aria-label="Close booking details"]');
    const focusTarget = closeButton ?? panel;
    requestAnimationFrame(() => focusTarget?.focus());

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      // Restore focus to the previously-focused trigger element
      previouslyFocusedRef.current?.focus?.();
      previouslyFocusedRef.current = null;
    };
  }, [booking, onClose]);

  if (!booking) return null;

  const start = new Date(booking.start_date);
  const end = new Date(booking.end_date);
  const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const dialogLabel = booking.inventory?.name
    ? `Booking details — ${booking.inventory.name}`
    : "Booking details";

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={dialogLabel}
        tabIndex={-1}
        className="fixed top-0 right-0 h-full w-full max-w-md bg-[var(--ws-surface)] border-l border-[var(--ws-border)] z-50 shadow-2xl overflow-y-auto"
      >
        <div className="sticky top-0 bg-[var(--ws-surface)] border-b border-[var(--ws-border)] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-display text-[15px] font-bold text-[var(--ws-text)]">Booking Details</h2>
          <button
            onClick={onClose}
            aria-label="Close booking details"
            className="p-1.5 rounded-lg hover:bg-[var(--ws-bg)] transition-colors"
          >
            <X size={18} className="text-gray-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow/10 border border-yellow/20 flex items-center justify-center flex-shrink-0">
              <Calendar size={22} className="text-yellow" />
            </div>
            <div>
              <div className="font-display text-[16px] font-bold text-[var(--ws-text)]">
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

          <div className="border-t border-[var(--ws-border)] pt-4">
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
            <div className="border-t border-[var(--ws-border)] pt-4">
              <div className="text-[11px] text-gray-5 uppercase tracking-wider mb-2">Notes</div>
              <div className="text-[13px] text-gray-3 leading-relaxed">{booking.notes}</div>
            </div>
          )}

          <div className="border-t border-[var(--ws-border)] pt-4">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-lg border border-[var(--ws-border)] text-[12px] text-gray-3 hover:text-[var(--ws-text)] hover:border-gray-5 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
