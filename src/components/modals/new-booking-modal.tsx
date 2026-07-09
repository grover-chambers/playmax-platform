"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";

interface NewBookingModalProps {
  open: boolean;
  onClose: () => void;
  preselectedInventory?: string;
}

const clientOptions = [
  "Unga Group",
  "Bidco Africa",
  "Safaricom",
  "Java House",
  "Naivas",
  "P&G East Africa",
];
const inventoryOptions = [
  { value: "westlands-screen-a", label: "Westlands Screen A — KES 15,000/day" },
  { value: "cbd-billboard-1", label: "CBD Billboard 1 — KES 25,000/day" },
  { value: "mombasa-rd", label: "Mombasa Rd Billboard — KES 18,000/day" },
  { value: "thika-rd", label: "Thika Rd Banner — KES 8,000/day" },
];
const statusOptions = [
  { value: "tentative", label: "Tentative" },
  { value: "confirmed", label: "Confirmed" },
  { value: "paid", label: "Paid" },
];

// Simulated booked dates (greyed out in a real date picker)
const bookedDates = ["2026-07-10", "2026-07-11", "2026-07-12"];

export default function NewBookingModal({
  open,
  onClose,
  preselectedInventory,
}: NewBookingModalProps) {
  const [form, setForm] = useState({
    inventoryItem: preselectedInventory || "",
    clientProject: "",
    startDate: "",
    endDate: "",
    priceAgreed: "",
    status: "tentative",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflictError, setConflictError] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
    setConflictError("");
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.inventoryItem) errs.inventoryItem = "Required";
    if (!form.clientProject.trim()) errs.clientProject = "Required";
    if (!form.startDate) errs.startDate = "Required";
    if (!form.endDate) errs.endDate = "Required";
    if (!form.priceAgreed) errs.priceAgreed = "Required";

    // Check for date conflicts
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end < start) {
        errs.endDate = "End must be after start";
      } else {
        // Check against booked dates
        const conflict = bookedDates.some((d) => {
          const date = new Date(d);
          return date >= start && date <= end;
        });
        if (conflict) {
          setConflictError(
            "This inventory item has existing bookings in the selected date range. Please choose different dates.",
          );
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (conflictError) return;
    console.log("New booking:", form);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setForm({
      inventoryItem: "",
      clientProject: "",
      startDate: "",
      endDate: "",
      priceAgreed: "",
      status: "tentative",
      notes: "",
    });
    setErrors({});
    setConflictError("");
  };

  return (
    <Modal open={open} onClose={onClose} title="New Booking">
      <div className="space-y-4">
        {/* Inventory item */}
        <div>
          <label className="form-label">
            Inventory item <span className="text-yellow">*</span>
          </label>
          <select
            className="form-select"
            value={form.inventoryItem}
            onChange={(e) => handleChange("inventoryItem", e.target.value)}
            disabled={!!preselectedInventory}
          >
            <option value="">Select inventory…</option>
            {inventoryOptions.map((inv) => (
              <option key={inv.value} value={inv.value}>
                {inv.label}
              </option>
            ))}
          </select>
          {errors.inventoryItem && (
            <p className="text-red text-[10px] mt-1">
              {errors.inventoryItem}
            </p>
          )}
        </div>

        {/* Client / Project */}
        <div>
          <label className="form-label">
            Client / Project <span className="text-yellow">*</span>
          </label>
          <select
            className="form-select"
            value={form.clientProject}
            onChange={(e) => handleChange("clientProject", e.target.value)}
          >
            <option value="">Select client…</option>
            {clientOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.clientProject && (
            <p className="text-red text-[10px] mt-1">
              {errors.clientProject}
            </p>
          )}
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">
              Start date <span className="text-yellow">*</span>
            </label>
            <input
              className="form-input"
              type="date"
              value={form.startDate}
              onChange={(e) => handleChange("startDate", e.target.value)}
            />
            {errors.startDate && (
              <p className="text-red text-[10px] mt-1">
                {errors.startDate}
              </p>
            )}
          </div>
          <div>
            <label className="form-label">
              End date <span className="text-yellow">*</span>
            </label>
            <input
              className="form-input"
              type="date"
              value={form.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
            />
            {errors.endDate && (
              <p className="text-red text-[10px] mt-1">{errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Availability hint */}
        {form.inventoryItem && form.startDate && (
          <div className="text-[10px] text-gray-5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green/60 inline-block" />
            Selected dates:{" "}
            {bookedDates.some((d) => {
              const date = new Date(d);
              return (
                date >= new Date(form.startDate) &&
                date <= new Date(form.endDate)
              );
            })
              ? "Some dates unavailable"
              : "Currently available"}
          </div>
        )}

        {/* Conflict error */}
        {conflictError && (
          <div className="flex items-start gap-2 bg-red/10 border border-red/20 rounded px-3 py-2.5 text-[11px] text-red">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{conflictError}</span>
          </div>
        )}

        {/* Price agreed + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">
              Price agreed (KES) <span className="text-yellow">*</span>
            </label>
            <input
              className="form-input"
              type="number"
              min={0}
              step={1000}
              placeholder="e.g. 15000"
              value={form.priceAgreed}
              onChange={(e) => handleChange("priceAgreed", e.target.value)}
            />
            {errors.priceAgreed && (
              <p className="text-red text-[10px] mt-1">
                {errors.priceAgreed}
              </p>
            )}
          </div>
          <div>
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Booking notes…"
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 justify-center"
            onClick={() => {
              onClose();
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1 justify-center"
            onClick={handleSubmit}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create Booking
          </Button>
        </div>
      </div>
    </Modal>
  );
}
