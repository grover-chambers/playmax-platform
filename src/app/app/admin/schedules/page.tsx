"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";

interface Schedule {
  id: string;
  client_id: string;
  client_name: string;
  name: string;
  report_type: string;
  frequency: string;
  next_run_at: string | null;
  last_run_at: string | null;
  enabled: boolean;
  created_at: string;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    name: "",
    report_type: "",
    frequency: "monthly",
  });

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/report-schedules");
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/report-schedules");
        const data = await res.json();
        if (active) setSchedules(data.schedules || []);
      } catch {}
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const handleCreate = async () => {
    if (!form.client_id || !form.name || !form.report_type) return;
    await fetch("/api/admin/report-schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ client_id: "", name: "", report_type: "", frequency: "monthly" });
    fetchSchedules();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/admin/report-schedules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    fetchSchedules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this schedule?")) return;
    await fetch(`/api/admin/report-schedules/${id}`, { method: "DELETE" });
    fetchSchedules();
  };

  const freqBadge = (f: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      weekly: { cls: "pm-dash-bdg bg-blue-500/20 text-blue-400", label: "Weekly" },
      monthly: { cls: "pm-dash-bdg bg-purple-500/20 text-purple-400", label: "Monthly" },
      quarterly: { cls: "pm-dash-bdg bg-amber-500/20 text-amber-400", label: "Quarterly" },
    };
    const m = map[f] || map.monthly;
    return <span className={m.cls}>{m.label}</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Schedules"
        subtitle="Automate recurring report delivery to clients"
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">
          {schedules.length} schedule{schedules.length !== 1 && "s"}
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="pm-btn-green flex items-center gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "New Schedule"}
        </button>
      </div>

      {showForm && (
        <div className="pm-dash-card p-6 space-y-4">
          <h3 className="text-white font-semibold">Create Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Client ID"
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
              className="pm-input"
            />
            <input
              placeholder="Schedule Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="pm-input"
            />
            <input
              placeholder="Report Type (e.g. monthly-analytics)"
              value={form.report_type}
              onChange={(e) => setForm({ ...form, report_type: e.target.value })}
              className="pm-input"
            />
            <select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              className="pm-input"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <button onClick={handleCreate} className="pm-btn-green">
            Create Schedule
          </button>
        </div>
      )}

      {loading ? (
        <div className="pm-dash-card p-8 text-center text-white/50">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          Loading schedules...
        </div>
      ) : schedules.length === 0 ? (
        <div className="pm-dash-card p-8 text-center text-white/50">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No report schedules yet. Create one to automate delivery.
        </div>
      ) : (
        <div className="pm-dash-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="p-4 text-white/50 font-medium">Name</th>
                <th className="p-4 text-white/50 font-medium">Client</th>
                <th className="p-4 text-white/50 font-medium">Type</th>
                <th className="p-4 text-white/50 font-medium">Frequency</th>
                <th className="p-4 text-white/50 font-medium">Next Run</th>
                <th className="p-4 text-white/50 font-medium">Status</th>
                <th className="p-4 text-white/50 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-4 text-white">{s.name}</td>
                  <td className="p-4 text-white/70">{s.client_name}</td>
                  <td className="p-4 text-white/70">{s.report_type}</td>
                  <td className="p-4">{freqBadge(s.frequency)}</td>
                  <td className="p-4 text-white/50">
                    {s.next_run_at
                      ? new Date(s.next_run_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggle(s.id, s.enabled)}
                      className="flex items-center gap-1"
                    >
                      {s.enabled ? (
                        <>
                          <ToggleRight className="w-5 h-5 text-emerald-400" />
                          <span className="text-emerald-400 text-xs">Active</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5 text-white/40" />
                          <span className="text-white/40 text-xs">Paused</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
