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
    priority: "medium" as "low" | "medium" | "high",
    description: "",
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
    if (!form.title.trim()) errs.title = "Required";
    if (!form.assignedTo) errs.assignedTo = "Required";
    if (!form.dueDate) errs.dueDate = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          assigned_to: form.assignedTo,
          due_date: form.dueDate,
          status: "todo",
          priority: form.priority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      project: preselectedProject || "",
      assignedTo: "",
      dueDate: "",
      priority: "medium",
      description: "",
    });
    setErrors({});
    setSubmitError("");
    setSubmitSuccess(false);
  };

  const priorities = [
    { value: "low" as const, label: "Low" },
    { value: "medium" as const, label: "Medium" },
    { value: "high" as const, label: "High" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={submitSuccess ? "Task Created!" : "New Task"}
    >
      {submitSuccess ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-display text-lg font-semibold mb-1">Task created successfully</p>
          <p className="text-gray-4 text-sm">Assigned and added to the project board.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submitError && (
            <div className="flex items-start gap-2 bg-red/10 border border-red/20 rounded px-3 py-2.5 text-[11px] text-red">
              <span className="mt-0.5">{submitError}</span>
            </div>
          )}

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
              disabled={submitting}
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
              disabled={!!preselectedProject || submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                        : p.value === "medium"
                        ? "bg-yellow/10 text-yellow border-yellow/30"
                        : "bg-gray-4/10 text-gray-4 border-[#2a2a2a]"
                      : "text-gray-5 border-[#2a2a2a] hover:text-white"
                  }`}
                  disabled={submitting}
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
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Task
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}