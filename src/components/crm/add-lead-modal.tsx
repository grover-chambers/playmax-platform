"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

interface AddLeadModalProps {
  open: boolean;
  onClose: () => void;
}

const sources = [
  "Website Form",
  "WhatsApp",
  "Referral",
  "Billboard Inquiry",
  "Cold Call",
  "LinkedIn",
];
const intents = [
  "High Intent",
  "Medium Intent",
  "Low Intent",
  "Research",
  "Rental Inquiry",
  "Branding",
];

function AddLeadModal({ open, onClose }: AddLeadModalProps) {
  const [form, setForm] = useState({
    company: "",
    contact: "",
    email: "",
    phone: "",
    source: sources[0],
    intent: intents[0],
    message: "",
    assignedTo: "",
  });

  if (!open) return null;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.contact,
        company: form.company,
        email: form.email,
        phone: form.phone,
        source: form.source,
        intent: form.intent,
        description: form.message,
        service_interest: form.intent,
      }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="card bg-[#0D0D0D]! w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E1E]">
          <h2 className="font-display text-sm font-bold">Add New Lead</h2>
          <button
            onClick={onClose}
            className="text-gray-5 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3.5">
          <Input
            label="Company Name"
            value={form.company}
            onChange={(e) => handleChange("company", e.target.value)}
            placeholder="e.g. Unga Group"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Name"
              value={form.contact}
              onChange={(e) => handleChange("contact", e.target.value)}
              placeholder="John Doe"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="john@company.co.ke"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+254 7XX XXX XXX"
            />
            <div className="w-full">
              <label className="form-label">Source</label>
              <select
                value={form.source}
                onChange={(e) => handleChange("source", e.target.value)}
                className="form-select"
              >
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="w-full">
              <label className="form-label">Intent</label>
              <select
                value={form.intent}
                onChange={(e) => handleChange("intent", e.target.value)}
                className="form-select"
              >
                {intents.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Assigned To"
              value={form.assignedTo}
              onChange={(e) => handleChange("assignedTo", e.target.value)}
              placeholder="Team member"
            />
          </div>
          <div className="w-full">
            <label className="form-label">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => handleChange("message", e.target.value)}
              placeholder="Initial notes..."
              rows={3}
              className="form-textarea"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 px-5 py-4 border-t border-[#1E1E1E]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit}>
            Add Lead
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddLeadModal;
