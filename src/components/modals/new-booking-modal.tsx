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
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
];

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
    status: "pending",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflictError, setConflictError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

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

    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end < start) {
        errs.endDate = "End must be after start";
      } else {
        const conflict = bookedDates.some((d) => {
          const date = new Date(d);
          return date >= start && date <= end;
        });
        if (conflict) {
          setConflictError(
            "This inventory item has existing bookings in the selected date range. Please choose different dates."
          );
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (conflictError) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_id: form.inventoryItem,
          client_id: form.clientProject,
          start_date: form.startDate,
          end_date: form.endDate,
          total_price: parseFloat(form.priceAgreed),
          status: form.status,
          notes: form.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(data.details || data.error || "Double-booking detected");
        }
        throw new Error(data.error || "Failed to create booking");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      inventoryItem: "",
      clientProject: "",
      startDate: "",
      endDate: "",
      priceAgreed: "",
      status: "pending",
      notes: "",
    });
    setErrors({});
    setConflictError("");
    setSubmitError("");
    setSubmitSuccess(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={submitSuccess ? "Booking Created!" : "New Booking"}
    >
      {submitSuccess ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-display text-lg font-semibold mb-1">Booking created successfully</p>
          <p className="text-gray-4 text-sm">Check the Bookings page to see it.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submitError && (
            <div className="flex items-start gap-2 bg-red/10 border border-red/20 rounded px-3 py-2.5 text-[11px] text-red">
              <span className="mt-0.5">{submitError}</span>
            </div>
          )}

          {/* Inventory item */}
          <div>
            <label className="form-label">
              Inventory item <span className="text-yellow">*</span>
            </label>
            <select
              className="form-select"
              value={form.inventoryItem}
              onChange={(e) => handleChange("inventoryItem", e.target.value)}
              disabled={!!preselectedInventory || submitting}
            >
              <option value="">Select inventory…</option>
              {inventoryOptions.map((inv) => (
                <option key={inv.value} value={inv.value}>
                  {inv.label}
                </option>
              ))}
            </select>
            {errors.inventoryItem && (
              <p className="text-red text-[10px] mt-1">{errors.inventoryItem}</p>
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
              disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
              disabled={submitting}
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
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1 justify-center"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Booking
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}