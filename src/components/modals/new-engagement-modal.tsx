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
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

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

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const response = await fetch("/api/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: form.client,
          engagement_type: form.engagementType,
          date: form.date,
          staff_involved: form.staffInvolved,
          billable: form.billable,
          billing_rate: form.billable ? form.billingRate : null,
          flat_fee: form.billable ? form.flatFee : null,
          summary: form.summary,
          project_id: form.linkToProject || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create engagement");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create engagement");
    } finally {
      setSubmitting(false);
    }
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
    setSubmitError("");
    setSubmitSuccess(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={submitSuccess ? "Engagement Logged!" : "New Engagement"}
    >
      {submitSuccess ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-display text-lg font-semibold mb-1">Engagement logged successfully</p>
          <p className="text-gray-4 text-sm">Visible in the Engagement timeline.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submitError && (
            <div className="flex items-start gap-2 bg-red/10 border border-red/20 rounded px-3 py-2.5 text-[11px] text-red">
              <span className="mt-0.5">{submitError}</span>
            </div>
          )}

          {/* Client */}
          <div>
            <label className="form-label">
              Client <span className="text-yellow">*</span>
            </label>
            <select
              className="form-select"
              value={form.client}
              onChange={(e) => handleChange("client", e.target.value)}
              disabled={submitting}
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
              onChange={(e) => handleChange("engagementType", e.target.value)}
              disabled={submitting}
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
                disabled={submitting}
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
                  disabled={submitting}
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
              disabled={submitting}
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
                  disabled={submitting}
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
                  disabled={submitting}
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
              onChange={(e) => handleChange("linkToProject", e.target.value)}
              disabled={submitting}
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
                  <svg className="animate-spin -ml-1 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Logging...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Log Engagement
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}