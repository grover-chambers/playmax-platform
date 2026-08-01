"use client";

import React, { useState, useMemo } from "react";
import { X, Calendar, AlertCircle } from "lucide-react";
import {
  format,
  differenceInDays,
  parseISO,
  isBefore,
  isAfter,
} from "date-fns";
import Button from "@/components/ui/button";
import { InventoryItem, Booking } from "@/lib/types";

interface BookingModalProps {
  item: InventoryItem;
  bookings: Booking[];
  clients: { id: string; name: string }[];
  onClose: () => void;
  onConfirm: (booking: {
    clientId: string;
    clientName: string;
    inventoryId: string;
    inventoryName: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
  }) => void;
}

function BookingModal({
  item,
  bookings,
  clients,
  onClose,
  onConfirm,
}: BookingModalProps) {
  const [selectedClient, setSelectedClient] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  const itemBookings = bookings.filter(
    (b) =>
      b.inventoryId === item.id &&
      b.status !== "cancelled" &&
      b.status !== "completed",
  );

  const hasConflict = useMemo(() => {
    if (!startDate || !endDate) return false;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return itemBookings.some((b) => {
      const bStart = parseISO(b.startDate);
      const bEnd = parseISO(b.endDate);
      return !(isAfter(end, bEnd) || isBefore(start, bStart));
    });
  }, [startDate, endDate, itemBookings]);

  const days =
    startDate && endDate
      ? differenceInDays(parseISO(endDate), parseISO(startDate))
      : 0;

  const totalPrice = Math.round((item.price / 30) * days);

  const handleConfirm = () => {
    if (!selectedClient) {
      setError("Please select a client");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }
    if (hasConflict) {
      setError("Selected dates conflict with an existing booking");
      return;
    }
    if (differenceInDays(parseISO(endDate), parseISO(startDate)) <= 0) {
      setError("End date must be after start date");
      return;
    }
    const client = clients.find((c) => c.id === selectedClient);
    if (!client) return;
    onConfirm({
      clientId: selectedClient,
      clientName: client.name,
      inventoryId: item.id,
      inventoryName: item.name,
      startDate,
      endDate,
      totalPrice,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="card bg-[var(--ws-surface)]! w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ws-border)]">
          <div>
            <h2 className="font-display text-[15px] font-bold">
              Create Booking
            </h2>
            <p className="text-[11px] text-gray-5 mt-0.5">{item.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--ws-bg)] rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-gray-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red/8 border border-red/15 rounded-sm px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 text-red flex-shrink-0" />
              <span className="text-[11px] text-red">{error}</span>
            </div>
          )}

          {hasConflict && !error && (
            <div className="flex items-center gap-2 bg-red/8 border border-red/15 rounded-sm px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 text-red flex-shrink-0" />
              <span className="text-[11px] text-red">
                Date range conflicts with existing booking
              </span>
            </div>
          )}

          <div>
            <label className="form-label">Client</label>
            <select
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(e.target.value);
                setError("");
              }}
              className="form-select"
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setError("");
                }}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setError("");
                }}
                className="form-input"
              />
            </div>
          </div>

          {days > 0 && (
            <div className="card bg-[var(--ws-bg)]! px-4 py-3 space-y-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-4">Duration</span>
                <span className="text-[var(--ws-text)] font-semibold">{days} days</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-4">Daily rate</span>
                <span className="text-[var(--ws-text)]">
                  KES {Math.round(item.price / 30).toLocaleString()}/day
                </span>
              </div>
              <div className="divider my-2!" />
              <div className="flex justify-between">
                <span className="text-[13px] text-gray-3 font-semibold">
                  Total
                </span>
                <span className="text-[15px] text-yellow font-display font-bold">
                  KES {totalPrice.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {itemBookings.length > 0 && (
            <div>
              <h4 className="eyebrow text-[9px]! mb-2 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                Existing Bookings
              </h4>
              {itemBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-red/5 border border-red/10 rounded-sm px-3 py-2 mb-1.5 text-[11px]"
                >
                  <span className="text-red">{b.clientName}</span>
                  <span className="text-gray-5">
                    {" "}
                    · {format(parseISO(b.startDate), "d MMM")} —{" "}
                    {format(parseISO(b.endDate), "d MMM yyyy")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-[var(--ws-border)]">
          <Button
            variant="secondary"
            size="md"
            className="flex-1!"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1!"
            onClick={handleConfirm}
            disabled={hasConflict || !selectedClient || !startDate || !endDate}
          >
            Confirm Booking
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BookingModal;
