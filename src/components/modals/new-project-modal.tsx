"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface Client {
  id: string;
  company: string;
  name: string;
  email: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  preselectedClient?: string;
}

const projectTypes = ["Research", "Branding", "Campaign", "Event", "Rental"];

interface Milestone {
  name: string;
  dueDate: string;
}

export default function NewProjectModal({
  open,
  onClose,
  onCreated,
  preselectedClient,
}: NewProjectModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    projectName: "",
    client: "",
    type: projectTypes[0],
    startDate: "",
    endDate: "",
    budget: "",
    assignedTeam: [] as string[],
    description: "",
    targetMarket: "",
    inventoryItem: "",
    rentalStart: "",
    rentalEnd: "",
  });
  const [milestones, setMilestones] = useState<Milestone[]>([
    { name: "", dueDate: "" },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const [clientsRes, staffRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/staff"),
        ]);
        const clientsData = await clientsRes.json();
        const staffData = await staffRes.json();
        setClients(clientsData.data || []);
        setStaff(staffData.staff || []);
      } catch {
        // silent
      }
    };
    load();
  }, [open]);

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

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      const typeMap: Record<string, string> = {
        Research: "market_research",
        Branding: "brand_strategy",
        Campaign: "campaign_management",
        Event: "event_activation",
        Rental: "billboard_campaign",
      };

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.projectName,
          client_id: form.client,
          type: typeMap[form.type] || "market_research",
          status: "draft",
          value: parseInt(form.budget) || 0,
          end_date: form.endDate || form.startDate,
          assigned_to: form.assignedTeam[0] || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      setSubmitSuccess(true);
      onCreated?.();
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
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
    setSubmitError("");
    setSubmitSuccess(false);
  };

  const isRental = form.type === "Rental";
  const isResearch = form.type === "Research";

  return (
    <Modal open={open} onClose={onClose} title={submitSuccess ? "Project Created!" : "New Project"}>
      {submitSuccess ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-display text-lg font-semibold mb-1">Project created successfully</p>
          <p className="text-gray-4 text-sm">Ready to assign team and set milestones.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submitError && (
            <div className="flex items-start gap-2 bg-red/10 border border-red/20 rounded px-3 py-2.5 text-[11px] text-red">
              <span className="mt-0.5">{submitError}</span>
            </div>
          )}

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
              disabled={submitting}
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
              disabled={!!preselectedClient || submitting || loading}
            >
              <option value="">
                {loading ? "Loading clients..." : "Select client\u2026"}
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company || c.name}
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
              disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
              disabled={submitting}
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
                disabled={submitting}
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
                  disabled={submitting}
                >
                  <option value="">Select billboard / screen\u2026</option>
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
                    disabled={submitting}
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
                    disabled={submitting}
                  />
                </div>
              </div>
            </>
          )}

          {/* Assigned team */}
          <div>
            <label className="form-label">Assigned team</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {staff.length === 0 && loading && (
                <span className="text-[11px] text-gray-4">Loading staff...</span>
              )}
              {staff.length === 0 && !loading && (
                <span className="text-[11px] text-gray-4">No staff available</span>
              )}
              {staff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleTeamToggle(s.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    form.assignedTeam.includes(s.id)
                      ? "bg-yellow/10 text-yellow border-yellow/30"
                      : "text-gray-4 border-[#2a2a2a] hover:text-white"
                  }`}
                  disabled={submitting}
                >
                  {s.name}
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
                disabled={submitting}
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
                    disabled={submitting}
                  />
                  <input
                    className="form-input w-[130px] text-[12px]"
                    type="date"
                    value={m.dueDate}
                    onChange={(e) =>
                      updateMilestone(i, "dueDate", e.target.value)
                    }
                    disabled={submitting}
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
                  Create Project
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
