"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  BarChart3,
} from "lucide-react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { formatTimeAgo } from "@/lib/utils";
import Pagination, { usePagination } from "@/components/ui/pagination";

interface Metric {
  id: string;
  metric_key: string;
  metric_label: string;
  metric_value: number;
  unit: string;
  chart_type: string;
}

interface Report {
  id: string;
  title: string;
  type: string;
  visible_to_client: boolean;
  created_at: string;
  metrics: Metric[];
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newUnit, setNewUnit] = useState("count");
  const [newChart, setNewChart] = useState("bar");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const r = await fetch(`/api/reports/${id}`);
    if (!r.ok) return router.push("/app/reports");
    const { data } = await r.json();
    setReport(data);
    setPage(1);
    setLoading(false);
  }, [id, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function toggleVisibility() {
    if (!report) return;
    const r = await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible_to_client: !report.visible_to_client }),
    });
    if (r.ok) setReport((prev) => prev ? { ...prev, visible_to_client: !prev.visible_to_client } : prev);
  }

  async function addMetric() {
    if (!newKey.trim() || !newLabel.trim() || !newValue.trim()) return;
    setSaving(true);
    const metrics = [
      ...(report?.metrics || []),
      {
        metric_key: newKey.trim(),
        metric_label: newLabel.trim(),
        metric_value: parseFloat(newValue),
        unit: newUnit,
        chart_type: newChart,
      },
    ];
    const r = await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metrics }),
    });
    if (r.ok) {
      await load();
      setNewKey("");
      setNewLabel("");
      setNewValue("");
      setNewUnit("count");
      setNewChart("bar");
      setShowAddMetric(false);
    }
    setSaving(false);
  }

  async function deleteMetric(metricKey: string) {
    const metrics = (report?.metrics || []).filter((m) => m.metric_key !== metricKey);
    const r = await fetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metrics }),
    });
    if (r.ok) await load();
  }

  async function deleteReport() {
    if (!confirm("Delete this report?")) return;
    const r = await fetch(`/api/reports/${id}`, { method: "DELETE" });
    if (r.ok) router.push("/app/reports");
  }

  const { paginated, total } = usePagination(report?.metrics || [], page, 20);

  if (loading) return <div className="page-content text-[12px] text-gray-5">Loading…</div>;
  if (!report) return null;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/app/reports")}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/5 text-gray-5 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-[16px] font-display font-bold">{report.title}</h1>
          <div className="text-[11px] text-gray-5 font-mono">
            {report.type} &middot; Created {formatTimeAgo(report.created_at)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleVisibility}
          >
            {report.visible_to_client ? (
              <><EyeOff size={12} /> Unpublish</>
            ) : (
              <><Eye size={12} /> Publish</>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={deleteReport}
          >
            <Trash2 size={12} />
            Delete
          </Button>
        </div>
      </div>

      {/* Metrics card */}
      <div className="pm-dash-card">
        <div className="pm-dash-card-h">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-yellow" />
            <h2 className="pm-dash-card-t">Metrics</h2>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowAddMetric(true)}>
            <Plus size={12} />
            Add Metric
          </Button>
        </div>

        <div className="pm-dash-card-b">
          {(report.metrics || []).length === 0 ? (
            <div className="text-[12px] text-gray-5 py-8 text-center border border-dashed border-[#1e1e1e] rounded-lg">
              No metrics yet. Add your first metric to track report data.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {paginated.map((m) => (
                <div
                  key={m.id}
                  className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-4 relative group"
                >
                  <button
                    onClick={() => deleteMetric(m.metric_key)}
                    className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-red/10 text-red transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                  <div className="text-[10px] text-gray-5 uppercase tracking-wider font-mono mb-1">
                    {m.metric_label}
                  </div>
                  <div className="text-[22px] font-display font-bold text-white">
                    {m.unit === "KES"
                      ? `KES ${(m.metric_value / 1000).toFixed(0)}K`
                      : m.unit === "%"
                        ? `${m.metric_value}%`
                        : m.metric_value}
                  </div>
                  <div className="text-[9px] text-gray-5 font-mono mt-1">
                    {m.unit} &middot; {m.chart_type}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </div>
      </div>

      {/* Add Metric Modal */}
      <Modal open={showAddMetric} onClose={() => setShowAddMetric(false)} title="Add Metric">
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Key
            </label>
            <input
              className="w-full bg-black border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-gray-5 outline-none focus:border-yellow/40"
              placeholder="e.g. total_reach"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Label
            </label>
            <input
              className="w-full bg-black border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-gray-5 outline-none focus:border-yellow/40"
              placeholder="e.g. Total Reach"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
              Value
            </label>
            <input
              type="number"
              step="any"
              className="w-full bg-black border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-yellow/40"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
                Unit
              </label>
              <select
                className="w-full bg-black border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-yellow/40"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
              >
                <option value="count">Count</option>
                <option value="KES">KES</option>
                <option value="%">%</option>
                <option value="hours">Hours</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-gray-5 uppercase tracking-wider mb-1.5">
                Chart Type
              </label>
              <select
                className="w-full bg-black border border-[#252525] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-yellow/40"
                value={newChart}
                onChange={(e) => setNewChart(e.target.value)}
              >
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="number">Number only</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1A1A1A]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddMetric(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={addMetric}
              disabled={saving || !newKey.trim() || !newLabel.trim() || !newValue.trim()}
            >
              <Save size={12} />
              {saving ? "Saving…" : "Save Metric"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
