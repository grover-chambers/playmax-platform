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

  const handleSubmit = () => {
    if (!validate()) return;
    console.log("New client:", form);
    onClose();
    resetForm();
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
  };

  return (
    <Modal open={open} onClose={onClose} title="New Client">
      <div className="space-y-4">
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
            Create Client
          </Button>
        </div>
      </div>
    </Modal>
  );
}
