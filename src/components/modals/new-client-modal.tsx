"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { Plus } from "lucide-react";

interface NewClientModalProps {
  open: boolean;
  onClose: () => void;
  convertedLead?: {
    company: string;
    contactName: string;
    phone: string;
    email: string;
  } | null;
}

const industries = [
  "FMCG / Manufacturing",
  "Telecommunications",
  "Food & Beverage",
  "Retail",
  "AgriTech / Distribution",
  "Finance / Banking",
  "Healthcare",
  "Education",
  "Real Estate",
  "Other",
];
const staffOptions = [
  { value: "brian", label: "Brian Mwangi" },
  { value: "amina", label: "Amina Mwangi" },
  { value: "james", label: "James Kariuki" },
  { value: "christine", label: "Christine Kamau" },
];

export default function NewClientModal({
  open,
  onClose,
  convertedLead,
}: NewClientModalProps) {
  const [form, setForm] = useState({
    companyName: convertedLead?.company || "",
    industry: industries[0],
    industryOther: "",
    contactName: convertedLead?.contactName || "",
    phone: convertedLead?.phone || "",
    email: convertedLead?.email || "",
    accountOwner: "",
    billingAddress: "",
    convertedFromLead: convertedLead ? "Yes (auto-filled)" : "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
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
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.companyName.trim()) errs.companyName = "Required";
    if (!form.contactName.trim()) errs.contactName = "Required";
    if (!form.phone.trim()) errs.phone = "Required";
    if (!form.accountOwner) errs.accountOwner = "Required";
    if (form.industry === "Other" && !form.industryOther.trim())
      errs.industryOther = "Specify industry";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.companyName,
          industry: form.industry === "Other" ? form.industryOther : form.industry,
          phone: form.phone,
          email: form.email,
          location: form.billingAddress,
          account_owner: form.accountOwner,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create client");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      companyName: "",
      industry: industries[0],
      industryOther: "",
      contactName: "",
      phone: "",
      email: "",
      accountOwner: "",
      billingAddress: "",
      convertedFromLead: "",
    });
    setErrors({});
    setSubmitError("");
    setSubmitSuccess(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={submitSuccess ? "Client Created!" : "New Client"}>
      {submitSuccess ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-display text-lg font-semibold mb-1">Client created successfully</p>
          <p className="text-gray-4 text-sm">Account is ready for project assignment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submitError && (
            <div className="flex items-start gap-2 bg-red/10 border border-red/20 rounded px-3 py-2.5 text-[11px] text-red">
              <span className="mt-0.5">{submitError}</span>
            </div>
          )}

          {/* Company name */}
          <div>
            <label className="form-label">
              Company name <span className="text-yellow">*</span>
            </label>
            <input
              className="form-input"
              placeholder="e.g. Unga Group"
              value={form.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
              disabled={submitting}
            />
            {errors.companyName && (
              <p className="text-red text-[10px] mt-1">{errors.companyName}</p>
            )}
          </div>

          {/* Industry */}
          <div>
            <label className="form-label">
              Industry / Niche <span className="text-yellow">*</span>
            </label>
            <select
              className="form-select"
              value={form.industry}
              onChange={(e) => handleChange("industry", e.target.value)}
              disabled={submitting}
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
            {form.industry === "Other" && (
              <input
                className="form-input mt-2"
                placeholder="Specify industry…"
                value={form.industryOther}
                onChange={(e) => handleChange("industryOther", e.target.value)}
                disabled={submitting}
              />
            )}
            {errors.industryOther && (
              <p className="text-red text-[10px] mt-1">
                {errors.industryOther}
              </p>
            )}
          </div>

          {/* Contact name + phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">
                Primary contact name <span className="text-yellow">*</span>
              </label>
              <input
                className="form-input"
                placeholder="e.g. Jane Wanjiku"
                value={form.contactName}
                onChange={(e) => handleChange("contactName", e.target.value)}
                disabled={submitting}
              />
              {errors.contactName && (
                <p className="text-red text-[10px] mt-1">
                  {errors.contactName}
                </p>
              )}
            </div>
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
                disabled={submitting}
              />
              {errors.phone && (
                <p className="text-red text-[10px] mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="jane@company.co.ke"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Account owner */}
          <div>
            <label className="form-label">
              Account owner <span className="text-yellow">*</span>
            </label>
            <select
              className="form-select"
              value={form.accountOwner}
              onChange={(e) => handleChange("accountOwner", e.target.value)}
              disabled={submitting}
            >
              <option value="">Select account owner…</option>
              {staffOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {errors.accountOwner && (
              <p className="text-red text-[10px] mt-1">
                {errors.accountOwner}
              </p>
            )}
          </div>

          {/* Billing address */}
          <div>
            <label className="form-label">Billing address</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Physical / postal address"
              value={form.billingAddress}
              onChange={(e) => handleChange("billingAddress", e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Converted from lead (read-only) */}
          {convertedLead && (
            <div className="bg-yellow/5 border border-yellow/10 rounded px-3 py-2 text-[11px] text-yellow/80">
              Converted from lead: {convertedLead.company}
            </div>
          )}

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
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Client
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}