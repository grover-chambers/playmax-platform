"use client";

import React, { useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { Plus } from "lucide-react";

interface NewTaskModalProps {
  open: boolean;
  onClose: () => void;
  preselectedProject?: string;
}

const projectOptions = [
  "Out-of-Home Campaign",
  "Safaricom Research Study",
  "Java House Brand Refresh",
  "P&G Product Launch Event",
  "Naivas Billboard Network",
  "Haco Retail Activation",
];
const staffOptions = [
  { value: "brian", label: "Brian Mwangi" },
  { value: "amina", label: "Amina Mwangi" },
  { value: "james", label: "James Kariuki" },
  { value: "christine", label: "Christine Kamau" },
];

export default function NewTaskModal({
  open,
  onClose,
  preselectedProject,
}: NewTaskModalProps) {
  const [form, setForm] = useState({
    title: "",
    project: preselectedProject || "",
    assignedTo: "",
    dueDate: "",
    priority: "normal" as "low" | "normal" | "high",
    description: "",
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
    if (!form.title.trim()) errs.title = "Required";
    if (!form.assignedTo) errs.assignedTo = "Required";
    if (!form.dueDate) errs.dueDate = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    console.log("New task:", form);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setForm({
      title: "",
      project: "",
      assignedTo: "",
      dueDate: "",
      priority: "normal",
      description: "",
    });
    setErrors({});
  };

  const priorities = [
    { value: "low" as const, label: "Low" },
    { value: "normal" as const, label: "Normal" },
    { value: "high" as const, label: "High" },
  ];

  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="form-label">
            Title <span className="text-yellow">*</span>
          </label>
          <input
            className="form-input"
            placeholder="e.g. Draft media plan"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
          />
          {errors.title && (
            <p className="text-red text-[10px] mt-1">{errors.title}</p>
          )}
        </div>

        {/* Project */}
        <div>
          <label className="form-label">Linked project</label>
          <select
            className="form-select"
            value={form.project}
            onChange={(e) => handleChange("project", e.target.value)}
            disabled={!!preselectedProject}
          >
            <option value="">No project</option>
            {projectOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Assigned to + Due date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">
              Assigned to <span className="text-yellow">*</span>
            </label>
            <select
              className="form-select"
              value={form.assignedTo}
              onChange={(e) => handleChange("assignedTo", e.target.value)}
            >
              <option value="">Select…</option>
              {staffOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {errors.assignedTo && (
              <p className="text-red text-[10px] mt-1">
                {errors.assignedTo}
              </p>
            )}
          </div>
          <div>
            <label className="form-label">
              Due date <span className="text-yellow">*</span>
            </label>
            <input
              className="form-input"
              type="date"
              value={form.dueDate}
              onChange={(e) => handleChange("dueDate", e.target.value)}
            />
            {errors.dueDate && (
              <p className="text-red text-[10px] mt-1">{errors.dueDate}</p>
            )}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="form-label">Priority</label>
          <div className="flex gap-2 mt-1">
            {priorities.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => handleChange("priority", p.value)}
                className={`flex-1 text-[11px] py-2 rounded-md border transition-colors ${
                  form.priority === p.value
                    ? p.value === "high"
                      ? "bg-red/10 text-red border-red/30"
                      : p.value === "normal"
                        ? "bg-yellow/10 text-yellow border-yellow/30"
                        : "bg-gray-4/10 text-gray-4 border-[#2a2a2a]"
                    : "text-gray-5 border-[#2a2a2a] hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Task details…"
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
            Add Task
          </Button>
        </div>
      </div>
    </Modal>
  );
}
