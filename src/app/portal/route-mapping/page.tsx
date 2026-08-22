"use client";

import React, { useState, useEffect } from "react";
import { Map, RefreshCw, Clock, CheckCircle2, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/page-header";

interface Metric {
  metric_key: string;
  metric_label: string;
  metric_value: number;
  unit: string | null;
}

interface Report {
  id: string;
  title: string;
  updated_at: string;
}

interface RouteMappingData {
  active: boolean;
  report: Report | null;
  metrics: Metric[];
}

function formatValue(m: Metric): string {
  const v =
    m.metric_value >= 1000 && Number.isInteger(m.metric_value)
      ? m.metric_value.toLocaleString()
      : String(Math.round(m.metric_value * 1000) / 1000);
  return m.unit === "%" ? `${v}%` : `${v}${m.unit ? ` ${m.unit}` : ""}`;
}

export default function RouteMappingPage() {
  const [data, setData] = useState<RouteMappingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portal/route-mapping");
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json: RouteMappingData = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = async () => {
    setError(null);
    try {
      const res = await fetch("/api/portal/route-mapping");
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  };

  return (
    <div className="page-content">
      <PageHeader
        title="Route Mapping"
        subtitle="Live route & field data synced from operations"
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-teal" />
        </div>
      ) : error ? (
        <div className="pm-dash-card p-6 text-center text-[13px] text-red-500">
          {error}
        </div>
      ) : !data?.active ? (
        <div className="pm-dash-card pm-dash-card-b p-8 text-center">
          <Map className="w-10 h-10 mx-auto mb-3 text-gray-4" />
          <p className="text-[15px] font-semibold mb-1">
            Route Mapping module not active
          </p>
          <p className="text-[13px] text-gray-4">
            Contact your Market Link account manager to activate this module.
          </p>
        </div>
      ) : !data.report || data.metrics.length === 0 ? (
        <div className="pm-dash-card pm-dash-card-b p-8 text-center">
          <Clock className="w-10 h-10 mx-auto mb-3 text-gray-4" />
          <p className="text-[15px] font-semibold mb-1">Awaiting first sync</p>
          <p className="text-[13px] text-gray-4">
            Summary data arrives nightly. Check back after the next sync.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 text-[12px] text-teal font-medium">
              <CheckCircle2 size={14} /> Synced{" "}
              {new Date(data.report!.updated_at).toLocaleString("en-KE", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            <button
              onClick={reload}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded border border-[var(--ws-border)] hover:text-teal hover:border-teal transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {data.metrics.map((m) => (
              <div key={m.metric_key} className="pm-dash-card p-5">
                <p className="text-[11px] uppercase tracking-wide text-gray-4 mb-1">
                  {m.metric_label}
                </p>
                <p className="text-[26px] font-bold leading-tight">
                  {formatValue(m)}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[12px] text-gray-4">
            Operational detail (routes, visits, GPS) stays in the field system.
            This tab shows the summary pushed to your account each night.
          </p>
        </>
      )}
    </div>
  );
}
