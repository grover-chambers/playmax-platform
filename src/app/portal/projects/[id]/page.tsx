"use client";

import React, { useState, useEffect, use, startTransition } from "react";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  BarChart3,
  FileText,
  CheckSquare,
  MessageSquare,
  Loader2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Download,
  Eye,
  Map,
  ExternalLink,
  BarChart,
} from "lucide-react";
import Link from "next/link";
import StatusBadge from "@/components/ui/status-badge";
import ProgressBar from "@/components/ui/progress-bar";
import { AnalyticsChart } from "@/components/charts/analytics-chart";
import type { ChartProps } from "@/components/charts/analytics-chart";
import { transformChartData } from "@/lib/analytics-transform";
import CensusDashboard from "@/components/khel/census-dashboard";
import RouteMapDashboard from "@/components/khel/route-map-dashboard";

/* ── Types ────────────────────────────────────────────────────── */

interface ProjectDetail {
  id: string;
  name: string;
  type: string;
  status: string;
  value: number;
  progress: number;
  brief: string | null;
  start_date: string | null;
  end_date: string | null;
  clients: { name: string; company: string } | null;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  sort_order: number;
}

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  approval_status: string | null;
  pdf_base64: string | null;
  has_pdf: boolean;
  created_at: string;
  client_feedback?: string | null;
}

interface AnalyticsReport {
  id: string;
  name: string;
  report_type: string;
  generated_data: { data: Record<string, unknown>[]; chart_type: string };
}

interface ProjectMessage {
  id: string;
  author_name: string;
  author_role: string;
  text: string;
  created_at: string;
}

type Tab = "overview" | "analytics" | "census" | "routes" | "milestones" | "deliverables" | "updates";

/* ── Helpers ──────────────────────────────────────────────────── */

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapStatus(status: string): "active" | "review" | "draft" | "confirmed" {
  switch (status) {
    case "active":
    case "in_progress":
      return "active";
    case "review":
      return "review";
    case "completed":
      return "confirmed";
    default:
      return "draft";
  }
}

function milestoneStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return { color: "#0F6E56", bg: "#0F6E5622", label: "Completed" };
    case "in_progress":
      return { color: "#F4C300", bg: "#F4C30022", label: "In Progress" };
    case "cancelled":
      return { color: "#EF4444", bg: "#EF444422", label: "Cancelled" };
    default:
      return { color: "#666", bg: "#66666622", label: "Pending" };
  }
}

/* ── Tab Definitions ──────────────────────────────────────────── */

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: Eye },
  { key: "census", label: "Data Analytics", icon: BarChart3 },
  { key: "routes", label: "Route Mapping", icon: Map },
  { key: "milestones", label: "Milestones", icon: CheckSquare },
  { key: "deliverables", label: "Deliverables", icon: FileText },
  { key: "updates", label: "Updates", icon: MessageSquare },
];

/* ── Overview Tab ─────────────────────────────────────────────── */

function OverviewTab({ project, onTabChange }: { project: ProjectDetail; onTabChange: (tab: Tab) => void }) {
  const timelineDays =
    project.start_date && project.end_date
      ? Math.ceil(
          (new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  const isDataAnalytics = project.type === "data_analytics";
  const isRouteMapping = project.type === "market_research" && project.name.toLowerCase().includes("route");

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      {(isDataAnalytics || isRouteMapping) && (
        <div className="flex gap-3 flex-wrap">
          {isDataAnalytics && (
            <>
              <button
                onClick={() => onTabChange("census")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#047857] text-white text-[12px] font-semibold hover:bg-[#047857]/90 transition-colors cursor-pointer"
              >
                <BarChart size={14} />
                Open Data Analytics Dashboard
              </button>
              <a
                href="https://nice-os.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--ws-bg)] border border-[var(--ws-border)] text-[12px] font-medium text-gray-4 hover:text-[var(--ws-text)] transition-colors"
              >
                <ExternalLink size={13} />
                Open Field App (Kanini Field)
              </a>
            </>
          )}
          {isRouteMapping && (
            <>
              <button
                onClick={() => onTabChange("routes")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#047857] text-white text-[12px] font-semibold hover:bg-[#047857]/90 transition-colors cursor-pointer"
              >
                <Map size={14} />
                Open Route Mapping Dashboard
              </button>
              <a
                href="https://nampark-rms-3cbt.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--ws-bg)] border border-[var(--ws-border)] text-[12px] font-medium text-gray-4 hover:text-[var(--ws-text)] transition-colors"
              >
                <ExternalLink size={13} />
                Open Nampark RMS
              </a>
            </>
          )}
        </div>
      )}
      {/* KPI Row */}
      <div className="pm-dash-krow pm-dash-krow-3">
        <div className="pm-dash-kcard">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-teal" />
            <span className="pm-dash-kl">Timeline</span>
          </div>
          <div className="pm-dash-kn text-[16px]">
            {formatDate(project.start_date)} — {formatDate(project.end_date)}
          </div>
          <div className="pm-dash-ksub">
            {timelineDays !== null ? `${timelineDays} days` : "No dates set"}
          </div>
        </div>
        <div className="pm-dash-kcard yel">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-yellow" />
            <span className="pm-dash-kl">Budget</span>
          </div>
          <div className="pm-dash-kn yel">{formatCurrency(project.value)}</div>
          <div className="pm-dash-ksub">Project value</div>
        </div>
        <div className="pm-dash-kcard grn">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare size={14} className="text-teal" />
            <span className="pm-dash-kl">Progress</span>
          </div>
          <div className="pm-dash-kn grn">{project.progress}%</div>
          <ProgressBar value={project.progress} />
        </div>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 pm-dash-card p-5">
          <div className="font-display text-[13px] font-semibold mb-3">Project Brief</div>
          {project.brief ? (
            <div className="text-[12px] text-gray-4 leading-relaxed whitespace-pre-wrap">
              {project.brief}
            </div>
          ) : (
            <div className="text-[12px] text-gray-5 italic">No brief provided</div>
          )}
        </div>
        <div className="pm-dash-card p-5">
          <div className="font-display text-[13px] font-semibold mb-3">Details</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-5">Type</span>
              <span className="text-[12px] text-gray-3 capitalize">{project.type.replace(/_/g, " ")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-5">Status</span>
              <StatusBadge variant={mapStatus(project.status)}>
                {project.status.replace(/_/g, " ")}
              </StatusBadge>
            </div>
            {project.clients && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-5">Client</span>
                  <span className="text-[12px] text-gray-3">{project.clients.name}</span>
                </div>
                {project.clients.company && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-5">Company</span>
                    <span className="text-[12px] text-gray-3">{project.clients.company}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Analytics Tab ────────────────────────────────────────────── */

function AnalyticsTab({ reports }: { reports: AnalyticsReport[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (reports.length === 0) {
    return (
      <div className="pm-dash-card p-8 text-center">
        <BarChart3 size={40} className="mx-auto mb-4 text-gray-5 opacity-30" />
        <div className="font-display text-[14px] font-semibold mb-2">No Analytics Reports</div>
        <div className="text-[12px] text-gray-4 max-w-md mx-auto">
          Analytics reports linked to this project will appear here once published by your account manager.
        </div>
      </div>
    );
  }

  const active = selected ? reports.find((r) => r.id === selected) : null;
  let chartData: ChartProps | null = null;
  if (active?.generated_data?.data && active.generated_data.chart_type) {
    chartData = transformChartData(active.generated_data.chart_type as never, active.generated_data.data);
  }

  return (
    <div className="space-y-6">
      {/* Report selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((report) => {
          const gd = report.generated_data as { data?: Record<string, unknown>[] } | undefined;
          const dataCount = gd?.data?.length ?? 0;
          return (
            <button
              key={report.id}
              onClick={() => setSelected(selected === report.id ? null : report.id)}
              className={`pm-dash-card p-4 text-left transition-all cursor-pointer ${
                selected === report.id
                  ? "border-teal ring-1 ring-teal/30"
                  : "hover:border-[var(--ws-border)]"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <BarChart3 size={16} className="text-teal shrink-0" />
                <span className="text-[10px] text-gray-5">{dataCount} points</span>
              </div>
              <div className="font-display text-[13px] font-semibold mb-1">{report.name}</div>
              <div className="text-[11px] text-gray-5 capitalize">{report.report_type.replace(/_/g, " ")}</div>
            </button>
          );
        })}
      </div>

      {/* Selected report chart */}
      {active && chartData && (
        <div className="pm-dash-card p-5">
          <div className="font-display text-[13px] font-semibold mb-4">{active.name}</div>
          <div style={{ height: 250 }}>
            <AnalyticsChart {...chartData} height={250} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Milestones Tab ───────────────────────────────────────────── */

function MilestonesTab({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) {
    return (
      <div className="pm-dash-card p-8 text-center">
        <CheckSquare size={40} className="mx-auto mb-4 text-gray-5 opacity-30" />
        <div className="font-display text-[14px] font-semibold mb-2">No Milestones</div>
        <div className="text-[12px] text-gray-4">Milestones for this project will appear here.</div>
      </div>
    );
  }

  return (
    <div className="pm-dash-card p-5">
      <div className="relative">
        <div className="absolute left-[17px] top-3 bottom-3 w-px bg-[var(--ws-border)]" />
        <div className="space-y-0">
          {milestones.map((m, i) => {
            const isLast = i === milestones.length - 1;
            const si = milestoneStatusIcon(m.status);
            return (
              <div key={m.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: si.bg, color: si.color, border: `2px solid ${si.color}44` }}
                  >
                    {m.status === "completed" ? "✓" : i + 1}
                  </div>
                  {!isLast && <div className="flex-1 w-px bg-[var(--ws-border)]" />}
                </div>
                <div className="pb-6 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: si.color }}
                    >
                      {m.title}
                    </span>
                    <span
                      className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: si.bg, color: si.color }}
                    >
                      {si.label}
                    </span>
                  </div>
                  {m.description && (
                    <div className="text-[11px] text-gray-5 mt-1 leading-relaxed">{m.description}</div>
                  )}
                  {m.due_date && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-5 font-mono">
                      <Calendar size={10} />
                      Due {formatDate(m.due_date)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Deliverables Tab ─────────────────────────────────────────── */

function DeliverablesTab({
  deliverables,
  onRefresh,
}: {
  deliverables: Deliverable[];
  onRefresh: () => void;
}) {
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleApproval = async (id: string, status: "approved" | "rejected") => {
    setSubmitting((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/portal/deliverables/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval_status: status,
          client_feedback: feedback[id] || null,
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } finally {
      setSubmitting((p) => ({ ...p, [id]: false }));
    }
  };

  const handleDownload = async (d: Deliverable) => {
    if (d.has_pdf && !d.file_url) {
      const res = await fetch(`/api/portal/reports/${d.id}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${d.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (d.file_url) {
      window.open(d.file_url, "_blank");
    }
  };

  if (deliverables.length === 0) {
    return (
      <div className="pm-dash-card p-8 text-center">
        <FileText size={40} className="mx-auto mb-4 text-gray-5 opacity-30" />
        <div className="font-display text-[14px] font-semibold mb-2">No Deliverables</div>
        <div className="text-[12px] text-gray-4">Deliverables for this project will appear here.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deliverables.map((d) => {
        const needsReview = !d.approval_status || d.approval_status === "pending";
        const isExpanded = expanded[d.id];
        return (
          <div key={d.id} className="pm-dash-card p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow/10 border border-yellow/20 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-yellow" />
                </div>
                <div>
                  <div className="font-display text-[13px] font-semibold">{d.title}</div>
                  {d.description && (
                    <div className="text-[11px] text-gray-5 mt-0.5 line-clamp-2">{d.description}</div>
                  )}
                  <div className="text-[10px] text-gray-5 font-mono mt-1">{formatDate(d.created_at)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(d.file_url || d.has_pdf) && (
                  <button
                    onClick={() => handleDownload(d)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-[var(--ws-bg)] border border-[var(--ws-border)] text-gray-4 rounded-lg hover:text-[var(--ws-text)] transition-colors"
                  >
                    <Download size={11} /> Download
                  </button>
                )}
                {needsReview && (
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [d.id]: !isExpanded }))}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-[var(--ws-bg)] border border-[var(--ws-border)] text-gray-4 rounded-lg hover:text-[var(--ws-text)] transition-colors"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>

            {d.approval_status && d.approval_status !== "pending" && (
              <div
                className={`mt-2.5 flex items-center gap-2 text-[11px] ${
                  d.approval_status === "approved" ? "text-teal" : "text-red"
                }`}
              >
                {d.approval_status === "approved" ? (
                  <><ThumbsUp size={12} /> Approved</>
                ) : (
                  <><ThumbsDown size={12} /> Changes requested</>
                )}
                {d.client_feedback && (
                  <span className="text-gray-4 ml-1">&mdash; &ldquo;{d.client_feedback}&rdquo;</span>
                )}
              </div>
            )}

            {isExpanded && needsReview && (
              <div className="mt-3 pt-3 border-t border-[var(--ws-border)] space-y-2">
                <textarea
                  placeholder="Add feedback or request changes..."
                  value={feedback[d.id] || ""}
                  onChange={(e) => setFeedback((p) => ({ ...p, [d.id]: e.target.value }))}
                  rows={2}
                  className="w-full w-full ws-input rounded-lg placeholder-gray-5 resize-none focus:border-[var(--ws-accent)]"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproval(d.id, "approved")}
                    disabled={submitting[d.id]}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-teal/10 text-teal rounded-lg border border-teal/20 hover:bg-teal/20 transition-colors disabled:opacity-50"
                  >
                    {submitting[d.id] ? <Loader2 size={11} className="animate-spin" /> : <ThumbsUp size={11} />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproval(d.id, "rejected")}
                    disabled={submitting[d.id]}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-red/10 text-red rounded-lg border border-red/20 hover:bg-red/20 transition-colors disabled:opacity-50"
                  >
                    {submitting[d.id] ? <Loader2 size={11} className="animate-spin" /> : <ThumbsDown size={11} />}
                    Request Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Updates Tab ──────────────────────────────────────────────── */

function UpdatesTab({ messages }: { messages: ProjectMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="pm-dash-card p-8 text-center">
        <MessageSquare size={40} className="mx-auto mb-4 text-gray-5 opacity-30" />
        <div className="font-display text-[14px] font-semibold mb-2">No Updates</div>
        <div className="text-[12px] text-gray-4">Project updates and messages will appear here.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        const isStaff = msg.author_role === "staff" || msg.author_role === "admin";
        return (
          <div
            key={msg.id}
            className={`pm-dash-card p-4 ${isStaff ? "border-l-2 border-l-teal" : ""}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isStaff
                    ? "bg-teal/15 text-teal"
                    : "bg-[var(--ws-accent)]/10 text-[var(--ws-accent)]"
                }`}
              >
                {msg.author_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-[12px] font-semibold text-gray-3">{msg.author_name}</span>
                {isStaff && (
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-teal/10 text-teal font-mono">
                    TEAM
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-5 font-mono ml-auto">{formatDateTime(msg.created_at)}</span>
            </div>
            <div className="text-[12px] text-gray-4 leading-relaxed whitespace-pre-wrap">{msg.text}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */

export default function PortalProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [tab, setTab] = useState<Tab>("overview");
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      const [projRes, msRes, delRes, repRes, msgRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/portal/milestones?projectId=${id}`),
        fetch(`/api/portal/deliverables?projectId=${id}`),
        fetch(`/api/portal/analytics/reports?projectId=${id}`),
        fetch(`/api/portal/messages?projectId=${id}`),
      ]);

      const projData = await projRes.json();
      const msData = await msRes.json();
      const delData = await delRes.json();
      const repData = await repRes.json();
      const msgData = await msgRes.json();

      startTransition(() => {
        if (projData.error || !projData.project) {
          setError(projData.error || "Project not found");
        } else {
          setProject(projData.project);
        }
        setMilestones(msData.milestones || []);
        setDeliverables(delData.deliverables || []);
        setReports(repData.reports || []);
        setMessages(msgData.messages || []);
        setLoading(false);
      });
    } catch {
      startTransition(() => {
        setError("Failed to load project");
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ── Loading ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="page-content">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-teal" />
        </div>
      </div>
    );
  }

  /* ── Error ────────────────────────────────────────────────── */
  if (error || !project) {
    return (
      <div className="page-content">
        <Link
          href="/portal/projects"
          className="inline-flex items-center gap-1.5 text-[12px] text-gray-4 hover:text-[var(--ws-text)] transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Back to Projects
        </Link>
        <div className="pm-dash-card p-6">
          <div className="flex items-center gap-3 text-red">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <div className="font-display text-[14px] font-semibold">Unable to load project</div>
              <div className="text-[12px] text-gray-4 mt-1">{error || "Project not found"}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabCounts: Record<Tab, number> = {
    overview: 0,
    analytics: reports.length,
    census: 0,
    routes: 0,
    milestones: milestones.length,
    deliverables: deliverables.length,
    updates: messages.length,
  };

  return (
    <div className="page-content">
      {/* Back link */}
      <Link
        href="/portal/projects"
        className="inline-flex items-center gap-1.5 text-[12px] text-gray-4 hover:text-[var(--ws-text)] transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Back to Projects
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-[22px] font-bold text-[var(--ws-text)]">{project.name}</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <StatusBadge variant={mapStatus(project.status)}>
              {project.status.replace(/_/g, " ")}
            </StatusBadge>
            <span className="text-[11px] text-gray-5 font-mono capitalize">
              {project.type.replace(/_/g, " ")}
            </span>
            {project.clients && (
              <span className="text-[11px] text-gray-5">
                {project.clients.name}
                {project.clients.company ? ` · ${project.clients.company}` : ""}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[18px] font-display font-bold text-[var(--ws-accent)]">{formatCurrency(project.value)}</div>
          <div className="text-[11px] text-gray-5 mt-0.5">{project.progress}% complete</div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const count = tabCounts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                tab === t.key
                  ? "bg-teal text-white"
                  : "bg-[var(--ws-bg)] border border-[var(--ws-border)] text-gray-4 hover:text-[var(--ws-text)]"
              }`}
            >
              <Icon size={13} />
              {t.label}
              {count > 0 && (
                <span className="ml-1 bg-white/10 text-[10px] px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "overview" && <OverviewTab project={project} onTabChange={setTab} />}
      {tab === "analytics" && <AnalyticsTab reports={reports} />}
      {tab === "census" && <CensusDashboard projectId={id} />}
      {tab === "routes" && <RouteMapDashboard projectId={id} />}
      {tab === "milestones" && <MilestonesTab milestones={milestones} />}
      {tab === "deliverables" && (
        <DeliverablesTab deliverables={deliverables} onRefresh={fetchAll} />
      )}
      {tab === "updates" && <UpdatesTab messages={messages} />}
    </div>
  );
}
