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

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
    // Show inventory field only when intent is Billboard Inquiry
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

  const handleSubmit = () => {
    if (!validate()) return;
    // In a real app, POST to /api/leads
    console.log("New lead:", form);
    onClose();
    resetForm();
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
  };

  return (
    <Modal open={open} onClose={onClose} title="New Lead">
      <div className="space-y-4">
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
            <select className="form-select" value={form.linkedInventory} onChange={(e) => handleChange("linkedInventory", e.target.value)}>
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
            Add Lead
          </Button>
        </div>
      </div>
    </Modal>
  );
}
