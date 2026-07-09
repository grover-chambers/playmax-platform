"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { Plus, Send } from "lucide-react";

interface NewLeadModalProps {
  open: boolean;
  onClose: () => void;
}

const sources = [
  "Website Form",
  "WhatsApp",
  "Referral",
  "Walk-in",
  "Event",
  "Ad",
];
const intents = [
  "Research",
  "Branding",
  "Media Buy",
  "Billboard Inquiry",
  "Event",
];
const staffOptions = [
  { value: "amina", label: "Amina Mwangi" },
  { value: "james", label: "James Kariuki" },
  { value: "christine", label: "Christine Kamau" },
  { value: "brian", label: "Brian Mwangi" },
];

export default function NewLeadModal({ open, onClose }: NewLeadModalProps) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    source: sources[0],
    intent: intents[0],
    linkedInventory: "",
    assignedTo: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showInventory, setShowInventory] = useState(false);
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
    if (field === "intent") {
      setShowInventory(value === "Billboard Inquiry");
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.phone.trim()) errs.phone = "Required";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email))
      errs.email = "Invalid email";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          email: form.email,
          phone: form.phone,
          service_interest: form.intent,
          description: form.notes,
          source: form.source,
          intent: form.intent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create lead");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      company: "",
      phone: "",
      email: "",
      source: sources[0],
      intent: intents[0],
      linkedInventory: "",
      assignedTo: "",
      notes: "",
    });
    setErrors({});
    setShowInventory(false);
    setSubmitError("");
    setSubmitSuccess(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={submitSuccess ? "Lead Created!" : "New Lead"}>
      {submitSuccess ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Send className="w-6 h-6 text-green" />
          </div>
          <p className="font-display text-lg font-semibold mb-1">Lead submitted successfully</p>
          <p className="text-gray-4 text-sm">We&apos;ll review and assign it shortly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submitError && (
            <div className="flex items-start gap-2 bg-red/10 border border-red/20 rounded px-3 py-2.5 text-[11px] text-red">
              <span className="mt-0.5">{submitError}</span>
            </div>
          )}

          {/* Name * */}
          <div>
            <label className="form-label">
              Name <span className="text-yellow">*</span>
            </label>
            <input
              className="form-input"
              placeholder="e.g. John Kamau"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => {
                if (!form.name.trim())
                  setErrors((prev) => ({ ...prev, name: "Required" }));
              }}
              disabled={submitting}
            />
            {errors.name && (
              <p className="text-red text-[10px] mt-1">{errors.name}</p>
            )}
          </div>

          {/* Company */}
          <div>
            <label className="form-label">Company</label>
            <input
              className="form-input"
              placeholder="e.g. Unga Group"
              value={form.company}
              onChange={(e) => handleChange("company", e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Phone * + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">
                Phone <span className="text-yellow">*</span>
              </label>
              <input
                className="form-input"
                type="tel"
                placeholder="+254 7XX XXX XXX"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                onBlur={() => {
                  if (!form.phone.trim())
                    setErrors((prev) => ({ ...prev, phone: "Required" }));
                }}
                disabled={submitting}
              />
              {errors.phone && (
                <p className="text-red text-[10px] mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="john@company.co.ke"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={submitting}
              />
              {errors.email && (
                <p className="text-red text-[10px] mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Source + Intent */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Source</label>
              <select
                className="form-select"
                value={form.source}
                onChange={(e) => handleChange("source", e.target.value)}
                disabled={submitting}
              >
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Intent</label>
              <select
                className="form-select"
                value={form.intent}
                onChange={(e) => handleChange("intent", e.target.value)}
                disabled={submitting}
              >
                {intents.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linked Inventory (conditional) */}
          {showInventory && (
            <div>
              <label className="form-label">Linked Inventory</label>
              <select className="form-select" value={form.linkedInventory} onChange={(e) => handleChange("linkedInventory", e.target.value)} disabled={submitting}>
                <option value="">Select billboard / screen…</option>
                <option value="westlands-screen-a">Westlands Screen A</option>
                <option value="cbd-billboard-1">CBD Billboard 1</option>
                <option value="mombasa-rd">Mombasa Rd Billboard</option>
              </select>
            </div>
          )}

          {/* Assign to */}
          <div>
            <label className="form-label">Assign to</label>
            <select
              className="form-select"
              value={form.assignedTo}
              onChange={(e) => handleChange("assignedTo", e.target.value)}
              disabled={submitting}
            >
              <option value="">Round-robin (auto)</option>
              {staffOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Initial notes…"
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
                  Add Lead
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}