"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { Plus } from "lucide-react";

interface NewEngagementModalProps {
  open: boolean;
  onClose: () => void;
}

const clientOptions = [
  "Unga Group",
  "Bidco Africa",
  "Safaricom",
  "Java House",
  "Naivas",
  "P&G East Africa",
];
const engagementTypes = [
  "Consultation",
  "Quick Research",
  "Ad Hoc Placement",
  "Retainer Check-in",
];
const staffOptions = [
  { value: "brian", label: "Brian Mwangi" },
  { value: "amina", label: "Amina Mwangi" },
  { value: "james", label: "James Kariuki" },
  { value: "christine", label: "Christine Kamau" },
];
const projectOptions = [
  { value: "", label: "None (standalone)" },
  { value: "brand-audit", label: "Brand Audit Q1" },
  { value: "ooh-campaign", label: "Out-of-Home Campaign" },
  { value: "java-refresh", label: "Java House Brand Refresh" },
];

export default function NewEngagementModal({
  open,
  onClose,
}: NewEngagementModalProps) {
  const [form, setForm] = useState({
    client: "",
    engagementType: engagementTypes[0],
    date: "",
    staffInvolved: [] as string[],
    billable: false,
    billingRate: "",
    flatFee: "",
    summary: "",
    linkToProject: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleStaffToggle = (value: string) => {
    setForm((prev) => ({
      ...prev,
      staffInvolved: prev.staffInvolved.includes(value)
        ? prev.staffInvolved.filter((v) => v !== value)
        : [...prev.staffInvolved, value],
    }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.client) errs.client = "Required";
    if (!form.date) errs.date = "Required";
    if (form.billable && !form.billingRate && !form.flatFee)
      errs.billingRate = "Enter hourly rate or flat fee";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    console.log("New engagement:", form);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setForm({
      client: "",
      engagementType: engagementTypes[0],
      date: "",
      staffInvolved: [],
      billable: false,
      billingRate: "",
      flatFee: "",
      summary: "",
      linkToProject: "",
    });
    setErrors({});
  };

  return (
    <Modal open={open} onClose={onClose} title="New Engagement">
      <div className="space-y-4">
        {/* Client */}
        <div>
          <label className="form-label">
            Client <span className="text-yellow">*</span>
          </label>
          <select
            className="form-select"
            value={form.client}
            onChange={(e) => handleChange("client", e.target.value)}
          >
            <option value="">Select client…</option>
            {clientOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.client && (
            <p className="text-red text-[10px] mt-1">{errors.client}</p>
          )}
        </div>

        {/* Engagement type */}
        <div>
          <label className="form-label">
            Engagement type <span className="text-yellow">*</span>
          </label>
          <select
            className="form-select"
            value={form.engagementType}
            onChange={(e) =>
              handleChange("engagementType", e.target.value)
            }
          >
            {engagementTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Date + Staff */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">
              Date <span className="text-yellow">*</span>
            </label>
            <input
              className="form-input"
              type="date"
              value={form.date}
              onChange={(e) => handleChange("date", e.target.value)}
            />
            {errors.date && (
              <p className="text-red text-[10px] mt-1">{errors.date}</p>
            )}
          </div>
        </div>

        {/* Staff involved */}
        <div>
          <label className="form-label">Staff involved</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {staffOptions.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => handleStaffToggle(s.value)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  form.staffInvolved.includes(s.value)
                    ? "bg-yellow/10 text-yellow border-yellow/30"
                    : "text-gray-4 border-[#2a2a2a] hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Billable toggle */}
        <div className="flex items-center gap-3">
          <label className="form-label !mb-0">Billable</label>
          <button
            type="button"
            onClick={() => handleChange("billable", !form.billable)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              form.billable ? "bg-yellow" : "bg-[#333]"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all ${
                form.billable ? "left-[22px]" : "left-[2px]"
              }`}
            />
          </button>
        </div>

        {/* Billing fields (conditional) */}
        {form.billable && (
          <div className="grid grid-cols-2 gap-3 pl-0">
            <div>
              <label className="form-label">Hourly rate (KES)</label>
              <input
                className="form-input"
                type="number"
                min={0}
                placeholder="e.g. 5000"
                value={form.billingRate}
                onChange={(e) =>
                  handleChange("billingRate", e.target.value)
                }
              />
            </div>
            <div>
              <label className="form-label">Flat fee (KES)</label>
              <input
                className="form-input"
                type="number"
                min={0}
                placeholder="e.g. 50000"
                value={form.flatFee}
                onChange={(e) => handleChange("flatFee", e.target.value)}
              />
            </div>
          </div>
        )}
        {errors.billingRate && (
          <p className="text-red text-[10px] -mt-2">{errors.billingRate}</p>
        )}

        {/* Link to project */}
        <div>
          <label className="form-label">Link to project (optional)</label>
          <select
            className="form-select"
            value={form.linkToProject}
            onChange={(e) =>
              handleChange("linkToProject", e.target.value)
            }
          >
            {projectOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Summary */}
        <div>
          <label className="form-label">Summary / Outcome</label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Brief summary of the engagement"
            value={form.summary}
            onChange={(e) => handleChange("summary", e.target.value)}
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
            Log Engagement
          </Button>
        </div>
      </div>
    </Modal>
  );
}
