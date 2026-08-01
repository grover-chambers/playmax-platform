"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, Activity, Clock, CheckCircle, XCircle } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";

/* ── Types ─────────────────────────────────────────────── */

interface JobCounts {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
}

interface HealthData {
  status: "ok" | "error";
  jobs: JobCounts;
  lastJobAt: string | null;
  timestamp: string;
  error?: string;
}

/* ── KPI Card ──────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="ws-stat-card">
      <div className="flex items-center gap-3">
        <div className={`ws-stat-icon ${color}`}>{icon}</div>
        <div>
          <div className="ws-stat-value">{value}</div>
          <div className="ws-stat-label">{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────── */

export default function JobsPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/worker/health");
      const data: HealthData = await res.json();
      setHealth(data);
    } catch {
      setHealth({
        status: "error",
        jobs: { queued: 0, processing: 0, completed: 0, failed: 0 },
        lastJobAt: null,
        timestamp: new Date().toISOString(),
        error: "Failed to fetch health data",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    (async () => {
      await fetchHealth();
      if (!cancelled) {
        interval = setInterval(() => { fetchHealth(); }, 30_000);
      }
    })();
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [fetchHealth]);

  const isHealthy = health?.status === "ok";
  const jobs = health?.jobs ?? { queued: 0, processing: 0, completed: 0, failed: 0 };

  /* ── Loading ───────────────────────────────────────── */

  if (loading) {
    return (
      <div className="page-content">
        <PageHeader title="Worker Jobs" subtitle="Loading…" />
        <div className="flex items-center justify-center py-24 text-gray-5">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading job data…
        </div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────── */

  return (
    <div className="page-content">
      <PageHeader
        title="Worker Jobs"
        subtitle="Analytics engine job monitoring"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchHealth(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={14}
              className={`mr-1.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Status Indicator */}
        <div className="pm-dash-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${isHealthy ? "bg-green" : "bg-red"}`}
              />
              <div>
                <h3 className="font-display text-[15px] font-bold">
                  Worker Status
                </h3>
                <p className="text-[11px] text-gray-5 mt-0.5">
                  {isHealthy ? "All systems operational" : "Worker unreachable or degraded"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] text-gray-5 tracking-widest uppercase">
                Last Updated
              </p>
              <p className="text-[12px] font-mono mt-1">
                {health?.timestamp
                  ? new Date(health.timestamp).toLocaleTimeString()
                  : "—"}
              </p>
            </div>
          </div>
          {health?.error && (
            <div className="mt-3 p-3 rounded bg-red/10 border border-red/20">
              <p className="text-[11px] text-red font-mono">{health.error}</p>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <KpiCard
            label="Queued"
            value={jobs.queued}
            icon={<Clock size={18} className="text-yellow" />}
            color="bg-yellow/15 text-yellow"
          />
          <KpiCard
            label="Processing"
            value={jobs.processing}
            icon={<Activity size={18} className="text-blue" />}
            color="bg-blue/15 text-blue"
          />
          <KpiCard
            label="Completed"
            value={jobs.completed}
            icon={<CheckCircle size={18} className="text-green" />}
            color="bg-green/15 text-green"
          />
          <KpiCard
            label="Failed"
            value={jobs.failed}
            icon={<XCircle size={18} className="text-red" />}
            color="bg-red/15 text-red"
          />
        </div>

        {/* Last Job Info */}
        <div className="pm-dash-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="ws-stat-icon text-gray-4">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-display text-[15px] font-bold">Last Job Activity</h3>
              <p className="text-[11px] text-gray-5 mt-0.5">
                Most recent job update timestamp
              </p>
            </div>
          </div>
          <div className="p-4 rounded-lg border border-[var(--ws-border)]">
            <p className="font-mono text-[13px]">
              {health?.lastJobAt
                ? new Date(health.lastJobAt).toLocaleString()
                : "No jobs recorded yet"}
            </p>
          </div>
          <p className="text-[10px] text-gray-5 mt-3">
            Auto-refreshes every 30 seconds. Use the Refresh button for immediate updates.
          </p>
        </div>
      </div>
    </div>
  );
}
