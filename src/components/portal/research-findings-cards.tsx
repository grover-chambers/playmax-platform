"use client";

import React, { useState, useEffect, startTransition } from "react";
import { BarChart3, TrendingUp, Loader2 } from "lucide-react";

interface Finding {
  id: string;
  report_id: string;
  metric_key: string;
  metric_label: string;
  metric_value: number;
  unit: string | null;
  chart_type: string | null;
  sort_order: number;
}

interface ResearchFindingsCardsProps {
  clientId?: string;
}

function formatValue(value: number, unit: string | null): string {
  if (unit === "%") return `${value}%`;
  if (unit === "KES") return `KES ${value.toLocaleString()}`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function trendIcon() {
  return <TrendingUp size={14} className="text-teal" />;
}

export default function ResearchFindingsCards({ clientId }: ResearchFindingsCardsProps) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      startTransition(() => setLoading(false));
      return;
    }
    fetch(`/api/portal/research?clientId=${clientId}`)
      .then((r) => r.json())
      .then(({ findings: data }) => {
        startTransition(() => {
          setFindings(data || []);
          setLoading(false);
        });
      })
      .catch(() => startTransition(() => setLoading(false)));
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={14} className="animate-spin text-gray-4" />
      </div>
    );
  }

  if (findings.length === 0) {
    return <div className="text-[12px] text-gray-4 py-2">No research findings available</div>;
  }

  const topFindings = findings.slice(0, 4);

  return (
    <div className="grid grid-cols-2 gap-3">
      {topFindings.map((f) => (
        <div
          key={f.id}
          className="bg-[#0D0D0D] rounded-lg border border-[#2A2A2A] p-3"
        >
          <div className="flex items-center gap-1.5 text-[10px] text-gray-5 uppercase tracking-wider mb-1.5">
            <BarChart3 size={10} />
            {f.metric_label}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-display font-bold text-white">
              {formatValue(f.metric_value, f.unit)}
            </span>
            {trendIcon()}
          </div>
          {f.unit && (
            <div className="text-[9px] text-gray-5 font-mono mt-1 uppercase">{f.unit}</div>
          )}
        </div>
      ))}
    </div>
  );
}
