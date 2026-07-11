"use client";

import React, { useEffect, useState } from "react";

interface Metric {
  id: string;
  metric_key: string;
  metric_label: string;
  metric_value: number;
  unit: string;
  chart_type: string;
}

interface ReportData {
  id: string;
  title: string;
  type: string;
  visible_to_client: boolean;
  created_at: string;
  metrics: Metric[];
}

interface MetricsGridProps {
  clientId?: string;
  projectId?: string;
}

function formatValue(value: number, unit: string): string {
  if (unit === "KES") return `KES ${(value / 1000).toFixed(0)}K`;
  if (unit === "%") return `${value}%`;
  if (unit === "count") return String(Math.round(value));
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function chartTypeClass(chartType: string): string {
  switch (chartType) {
    case "bar": return "border-l-2 border-l-yellow";
    case "line": return "border-t-2 border-t-yellow";
    case "pie": return "border-2 border-yellow rounded-full";
    default: return "";
  }
}

function MiniLine({ value }: { value: number }) {
  const points = Array.from({ length: 8 }, (_, i) => {
    const x = (i / 7) * 100;
    const t = (i / 7) * Math.PI * 2;
    const wave = Math.sin(t) * value * 0.15;
    const y = 24 - ((value + wave) / (value * 1.6)) * 20;
    return `${x},${Math.max(4, Math.min(22, y))}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 24" className="w-full h-6 mt-1.5" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="rgb(234, 179, 8)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function MiniBar({ value, maxValue }: { value: number; maxValue: number; unit?: string }) {
  const pct = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-[#1E1E1E] rounded-full mt-1.5 overflow-hidden">
      <div className="h-full bg-yellow rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function MetricsGrid({ clientId, projectId }: MetricsGridProps) {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (clientId) params.set("client_id", clientId);
    if (projectId) params.set("project_id", projectId);
    params.set("visible_only", "true");

    fetch(`/api/reports?${params}`)
      .then((r) => r.json())
      .then(({ data }) => setReports(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId, projectId]);

  if (loading) {
    return <div className="text-[12px] text-gray-5 py-4">Loading metrics…</div>;
  }

  const allMetrics = reports.flatMap((r) => r.metrics || []);
  if (allMetrics.length === 0) {
    return <div className="text-[12px] text-gray-5 py-4">No report data yet.</div>;
  }

  const maxValue = Math.max(...allMetrics.map((m) => m.metric_value), 1);

  return (
    <div>
      {reports.map((report) => (
        <div key={report.id} className="mb-5">
          <div className="text-[13px] font-semibold text-white mb-3">{report.title}</div>
          <div className="grid grid-cols-2 gap-3">
            {(report.metrics || []).map((metric) => (
              <div
                key={metric.id}
                className={`bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg p-3 ${chartTypeClass(metric.chart_type)}`}
              >
                <div className="text-[10px] text-gray-5 uppercase tracking-wider font-mono mb-1">
                  {metric.metric_label}
                </div>
                <div className="text-[18px] font-display font-bold text-white">
                  {formatValue(metric.metric_value, metric.unit)}
                </div>
                {metric.chart_type === "bar" && (
                  <MiniBar value={metric.metric_value} maxValue={maxValue} unit={metric.unit} />
                )}
                {metric.chart_type === "line" && (
                  <MiniLine value={metric.metric_value} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
