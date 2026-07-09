"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  preselectedClient?: string;
}

const projectTypes = ["Research", "Branding", "Campaign", "Event", "Rental"];
const clientOptions = [
  "Unga Group",
  "Bidco Africa",
  "Safaricom",
  "Java House",
  "Naivas",
  "P&G East Africa",
  "Twiga Foods",
  "Kenchic",
  "Haco Industries",
  "Kevian Kenya",
];
const staffOptions = [
  { value: "brian", label: "Brian Mwangi" },
  { value: "amina", label: "Amina Mwangi" },
  { value: "james", label: "James Kariuki" },
  { value: "christine", label: "Christine Kamau" },
];

interface Milestone {
  name: string;
  dueDate: string;
}

export default function NewProjectModal({
  open,
  onClose,
  preselectedClient,
}: NewProjectModalProps) {
  const [form, setForm] = useState({
    projectName: "",
    client: preselectedClient || "",
    type: projectTypes[0],
    startDate: "",
    endDate: "",
    budget: "",
    assignedTeam: [] as string[],
    description: "",
    // Type-conditional fields
    targetMarket: "",
    inventoryItem: "",
    rentalStart: "",
    rentalEnd: "",
  });
  const [milestones, setMilestones] = useState<Milestone[]>([
    { name: "", dueDate: "" },
  ]);
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

  const handleTeamToggle = (value: string) => {
    setForm((prev) => ({
      ...prev,
      assignedTeam: prev.assignedTeam.includes(value)
        ? prev.assignedTeam.filter((v) => v !== value)
        : [...prev.assignedTeam, value],
    }));
  };

  const addMilestone = () => {
    setMilestones((prev) => [...prev, { name: "", dueDate: "" }]);
  };

  const updateMilestone = (
    index: number,
    field: keyof Milestone,
    value: string,
  ) => {
    setMilestones((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.projectName.trim()) errs.projectName = "Required";
    if (!form.client.trim()) errs.client = "Required";
    if (!form.startDate) errs.startDate = "Required";
    if (!form.budget) errs.budget = "Required";
    if (milestones.length === 1 && !milestones[0].name.trim())
      errs.milestone = "At least one milestone required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    console.log("New project:", { ...form, milestones });
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setForm({
      projectName: "",
      client: "",
      type: projectTypes[0],
      startDate: "",
      endDate: "",
      budget: "",
      assignedTeam: [],
      description: "",
      targetMarket: "",
      inventoryItem: "",
      rentalStart: "",
      rentalEnd: "",
    });
    setMilestones([{ name: "", dueDate: "" }]);
    setErrors({});
  };

  const isRental = form.type === "Rental";
  const isResearch = form.type === "Research";

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <div className="space-y-4">
        {/* Project name */}
        <div>
          <label className="form-label">
            Project name <span className="text-yellow">*</span>
          </label>
          <input
            className="form-input"
            placeholder="e.g. Brand Audit Q1"
            value={form.projectName}
            onChange={(e) => handleChange("projectName", e.target.value)}
          />
          {errors.projectName && (
            <p className="text-red text-[10px] mt-1">{errors.projectName}</p>
          )}
        </div>

        {/* Client */}
        <div>
          <label className="form-label">
            Client <span className="text-yellow">*</span>
          </label>
          <select
            className="form-select"
            value={form.client}
            onChange={(e) => handleChange("client", e.target.value)}
            disabled={!!preselectedClient}
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

        {/* Type */}
        <div>
          <label className="form-label">
            Type <span className="text-yellow">*</span>
          </label>
          <select
            className="form-select"
            value={form.type}
            onChange={(e) => handleChange("type", e.target.value)}
          >
            {projectTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Start / End date */}
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
              <p className="text-red text-[10px] mt-1">{errors.startDate}</p>
            )}
          </div>
          <div>
            <label className="form-label">End date</label>
            <input
              className="form-input"
              type="date"
              value={form.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
            />
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="form-label">
            Budget (KES) <span className="text-yellow">*</span>
          </label>
          <input
            className="form-input"
            type="number"
            min={0}
            step={10000}
            placeholder="e.g. 500000"
            value={form.budget}
            onChange={(e) => handleChange("budget", e.target.value)}
          />
          {errors.budget && (
            <p className="text-red text-[10px] mt-1">{errors.budget}</p>
          )}
        </div>

        {/* Type-conditional: Research */}
        {isResearch && (
          <div>
            <label className="form-label">Target market / niche</label>
            <input
              className="form-input"
              placeholder="e.g. Nairobi urban consumers 18-35"
              value={form.targetMarket}
              onChange={(e) => handleChange("targetMarket", e.target.value)}
            />
          </div>
        )}

        {/* Type-conditional: Rental */}
        {isRental && (
          <>
            <div>
              <label className="form-label">Inventory item</label>
              <select
                className="form-select"
                value={form.inventoryItem}
                onChange={(e) =>
                  handleChange("inventoryItem", e.target.value)
                }
              >
                <option value="">Select billboard / screen…</option>
                <option value="westlands-screen-a">
                  Westlands Screen A
                </option>
                <option value="cbd-billboard-1">CBD Billboard 1</option>
                <option value="mombasa-rd">Mombasa Rd Billboard</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Rental start</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.rentalStart}
                  onChange={(e) =>
                    handleChange("rentalStart", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="form-label">Rental end</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.rentalEnd}
                  onChange={(e) =>
                    handleChange("rentalEnd", e.target.value)
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* Assigned team */}
        <div>
          <label className="form-label">Assigned team</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {staffOptions.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => handleTeamToggle(s.value)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  form.assignedTeam.includes(s.value)
                    ? "bg-yellow/10 text-yellow border-yellow/30"
                    : "text-gray-4 border-[#2a2a2a] hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Milestones */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="form-label !mb-0">Milestones</label>
            <button
              type="button"
              onClick={addMilestone}
              className="text-[10px] text-yellow hover:text-yellow/80 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add milestone
            </button>
          </div>
          {errors.milestone && (
            <p className="text-red text-[10px] mb-2">{errors.milestone}</p>
          )}
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="form-input flex-1 text-[12px]"
                  placeholder="Milestone name"
                  value={m.name}
                  onChange={(e) => updateMilestone(i, "name", e.target.value)}
                />
                <input
                  className="form-input w-[130px] text-[12px]"
                  type="date"
                  value={m.dueDate}
                  onChange={(e) =>
                    updateMilestone(i, "dueDate", e.target.value)
                  }
                />
                {milestones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMilestone(i)}
                    className="text-gray-5 hover:text-red transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Brief description of the project"
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
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
            Create Project
          </Button>
        </div>
      </div>
    </Modal>
  );
}
