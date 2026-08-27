"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2,
  Store,
  ClipboardCheck,
  TrendingUp,
  Users,
  Filter,
} from "lucide-react";
import { AnalyticsChart } from "@/components/charts/analytics-chart";
import type { ChartProps } from "@/components/charts/analytics-chart";

interface CensusData {
  outlets: {
    total: number;
    byChannel: Record<string, number>;
    byType: Record<string, number>;
    byCounty: Record<string, number>;
    byWard: Record<string, number>;
    mapPins: { id: string; name: string; channel: string; type: string; lat: number; lng: number; ward: string; county: string; size: string }[];
  };
  visits: {
    total: number;
    byStatus: Record<string, number>;
    byOutcome: Record<string, number>;
    totalOrders: number;
    totalOrderValue: number;
    timeline: { date: string; count: number }[];
  };
  submissions: { total: number };
  reps: { total: number; byGroup: { group: string; count: number }[] };
}

const GROUPS = ["All", "A", "B", "C", "D", "E", "F", "G"];

export default function CensusDashboard({ projectId }: { projectId: string }) {
  void projectId; // used for future scoping
  const [data, setData] = useState<CensusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<string>("All");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (group !== "All") params.set("group", group);
        const res = await fetch(`/api/portal/khel/census?${params}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [group]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-teal" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="pm-dash-card p-8 text-center">
        <div className="text-[13px] text-gray-4">No census data available</div>
      </div>
    );
  }

  // ── Chart data ──────────────────────────────────────────────
  const channelChart: ChartProps = {
    type: "doughnut",
    labels: Object.keys(data.outlets.byChannel),
    datasets: [{ data: Object.values(data.outlets.byChannel) }],
  };

  const typeChart: ChartProps = {
    type: "bar",
    labels: Object.keys(data.outlets.byType),
    datasets: [{ label: "Outlets", data: Object.values(data.outlets.byType), backgroundColor: "#047857" }],
  };

  const countyChart: ChartProps = {
    type: "bar_h",
    labels: Object.keys(data.outlets.byCounty).slice(0, 10),
    datasets: [{ label: "Outlets", data: Object.values(data.outlets.byCounty).slice(0, 10), backgroundColor: "#047857" }],
  };

  const statusChart: ChartProps = {
    type: "doughnut",
    labels: Object.keys(data.visits.byStatus),
    datasets: [{ data: Object.values(data.visits.byStatus) }],
  };

  const outcomeChart: ChartProps = {
    type: "bar",
    labels: Object.keys(data.visits.byOutcome),
    datasets: [{ label: "Visits", data: Object.values(data.visits.byOutcome), backgroundColor: "#047857" }],
  };

  const timelineChart: ChartProps = {
    type: "line",
    labels: data.visits.timeline.map((t) => t.date.slice(5)),
    datasets: [{ label: "Visits", data: data.visits.timeline.map((t) => t.count), borderColor: "#047857", backgroundColor: "#04785715" }],
  };

  const groupChart: ChartProps = {
    type: "bar",
    labels: data.reps.byGroup.map((g) => `Group ${g.group}`),
    datasets: [{ label: "Reps", data: data.reps.byGroup.map((g) => g.count), backgroundColor: "#047857" }],
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={14} className="text-gray-4" />
        <span className="text-[11px] text-gray-5 font-mono uppercase tracking-wider">Group</span>
        <div className="flex gap-1.5">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                group === g
                  ? "bg-[#047857] text-white"
                  : "bg-[var(--ws-bg)] border border-[var(--ws-border)] text-gray-4 hover:text-[var(--ws-text)]"
              }`}
            >
              {g === "All" ? "All Groups" : `Group ${g}`}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="pm-dash-krow pm-dash-krow-4">
        <div className="pm-dash-kcard grn">
          <div className="flex items-center gap-2 mb-2">
            <Store size={14} className="text-[#047857]" />
            <span className="pm-dash-kl">Total Outlets</span>
          </div>
          <div className="pm-dash-kn grn">{data.outlets.total.toLocaleString()}</div>
          <div className="pm-dash-ksub">{Object.keys(data.outlets.byChannel).length} channels</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck size={14} className="text-teal" />
            <span className="pm-dash-kl">Total Visits</span>
          </div>
          <div className="pm-dash-kn">{data.visits.total.toLocaleString()}</div>
          <div className="pm-dash-ksub">{data.visits.totalOrders} orders placed</div>
        </div>
        <div className="pm-dash-kcard yel">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-yellow" />
            <span className="pm-dash-kl">Order Value</span>
          </div>
          <div className="pm-dash-kn yel">KES {data.visits.totalOrderValue.toLocaleString()}</div>
          <div className="pm-dash-ksub">from {data.visits.totalOrders} orders</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-teal" />
            <span className="pm-dash-kl">Field Reps</span>
          </div>
          <div className="pm-dash-kn">{data.reps.total}</div>
          <div className="pm-dash-ksub">{data.reps.byGroup.length} groups</div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outlets by Channel */}
        <div className="pm-dash-card p-5">
          <div className="font-display text-[13px] font-semibold mb-4">Outlets by Channel</div>
          <div style={{ height: 220 }}>
            <AnalyticsChart {...channelChart} height={220} />
          </div>
        </div>

        {/* Outlets by Type */}
        <div className="pm-dash-card p-5">
          <div className="font-display text-[13px] font-semibold mb-4">Outlets by Type</div>
          <div style={{ height: 220 }}>
            <AnalyticsChart {...typeChart} height={220} />
          </div>
        </div>

        {/* Visit Timeline */}
        <div className="pm-dash-card p-5 lg:col-span-2">
          <div className="font-display text-[13px] font-semibold mb-4">Visit Activity Timeline</div>
          <div style={{ height: 200 }}>
            <AnalyticsChart {...timelineChart} height={200} />
          </div>
        </div>

        {/* Visit Outcomes */}
        <div className="pm-dash-card p-5">
          <div className="font-display text-[13px] font-semibold mb-4">Visit Outcomes</div>
          <div style={{ height: 220 }}>
            <AnalyticsChart {...outcomeChart} height={220} />
          </div>
        </div>

        {/* Visit Status */}
        <div className="pm-dash-card p-5">
          <div className="font-display text-[13px] font-semibold mb-4">Visit Status Distribution</div>
          <div style={{ height: 220 }}>
            <AnalyticsChart {...statusChart} height={220} />
          </div>
        </div>

        {/* Top Counties */}
        <div className="pm-dash-card p-5">
          <div className="font-display text-[13px] font-semibold mb-4">Top Counties by Outlet Count</div>
          <div style={{ height: 220 }}>
            <AnalyticsChart {...countyChart} height={220} />
          </div>
        </div>

        {/* Reps by Group */}
        <div className="pm-dash-card p-5">
          <div className="font-display text-[13px] font-semibold mb-4">Reps by Group</div>
          <div style={{ height: 220 }}>
            <AnalyticsChart {...groupChart} height={220} />
          </div>
        </div>
      </div>
    </div>
  );
}
