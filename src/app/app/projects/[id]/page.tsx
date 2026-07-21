"use client";

import React, { useState, useEffect, use } from "react";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Users,
  Loader2,
  ExternalLink,
  Download,
  Check,
  File,
  BarChart3,
  BookOpen,
  Target,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import ProgressBar from "@/components/ui/progress-bar";
import DocumentList from "@/components/documents/document-list";
import DocumentUpload from "@/components/documents/document-upload";
import { AnalyticsChart } from "@/components/charts/analytics-chart";
import { transformChartData } from "@/lib/analytics-transform";
import { findCategory } from "@/lib/report-types";
import type { ChartType } from "@/lib/report-types";
import type { ChartProps } from "@/components/charts/analytics-chart";

type Tab =
  | "overview"
  | "analytics"
  | "research"
  | "deliverables"
  | "tasks"
  | "milestones"
  | "documents";

interface ProjectClient {
  id: string;
  name: string;
  company: string;
}

interface ProjectDetail {
  id: string;
  name: string;
  client_id: string;
  type: string;
  status: string;
  value: number;
  progress: number;
  brief: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  clients: ProjectClient | null;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
}

interface Deliverable {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  approval_status: string;
  visible_to_client: boolean;
  pdf_base64: string | null;
  created_at: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  status: string;
  sort_order: number;
}

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  auth_users: {
    email: string;
    raw_user_meta_data: Record<string, unknown>;
  } | null;
}

interface AnalyticsReportLink {
  id: string;
  project_id: string;
  report_id: string;
  created_at: string;
  analytics_saved_reports: {
    id: string;
    name: string;
    report_type: string;
    generated_data: { data: Record<string, unknown>[]; chart_type: string };
    visible_to_client: boolean;
  } | null;
}

interface ResearchProjectLink {
  id: string;
  project_id: string;
  type: string;
  status: string;
  progress: number;
  metadata: {
    kpis?: { value: string; label: string }[];
    summary?: string;
    chartItems?: { label: string; value: number; displayValue?: string }[];
    chartLabel?: string;
  };
}

interface ProjectData {
  project: ProjectDetail;
  tasks: Task[];
  deliverables: Deliverable[];
  documents: unknown[];
  milestones: Milestone[];
  members: ProjectMember[];
  analyticsReports: AnalyticsReportLink[];
  research: ResearchProjectLink[];
}

const tabItems: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: Target },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "research", label: "Research", icon: BookOpen },
  { key: "deliverables", label: "Deliverables", icon: FileText },
  { key: "tasks", label: "Tasks", icon: CheckCircle2 },
  { key: "milestones", label: "Milestones", icon: Clock },
  { key: "documents", label: "Documents", icon: File },
];

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function memberInitials(member: ProjectMember): string {
  const name =
    (member.auth_users?.raw_user_meta_data as { full_name?: string })
      ?.full_name || member.auth_users?.email || "U";
  return initials(name);
}

function memberName(member: ProjectMember): string {
  const meta = member.auth_users?.raw_user_meta_data as {
    full_name?: string;
  };
  return meta?.full_name || member.auth_users?.email || "Unknown";
}

function statusDot(status: string, size = 18) {
  switch (status) {
    case "completed":
      return <CheckCircle2 size={size} className="text-teal" />;
    case "in_progress":
      return <Clock size={size} className="text-yellow" />;
    case "cancelled":
      return <XCircle size={size} className="text-red" />;
    default:
      return <Circle size={size} className="text-gray-5" />;
  }
}

function priorityColor(p: string): string {
  switch (p) {
    case "urgent":
      return "text-red bg-red/10 border-red/20";
    case "high":
      return "text-orange bg-orange/10 border-orange/20";
    case "medium":
      return "text-yellow bg-yellow/10 border-yellow/20";
    default:
      return "text-gray-4 bg-gray-4/10 border-gray-4/20";
  }
}

function statusGroup(status: string): string {
  switch (status) {
    case "in_progress":
      return "in_progress";
    case "done":
    case "completed":
      return "done";
    case "blocked":
      return "blocked";
    default:
      return "todo";
  }
}

function toggleTaskStatus(current: string): string {
  switch (current) {
    case "todo":
      return "in_progress";
    case "in_progress":
      return "done";
    case "done":
      return "todo";
    default:
      return current;
  }
}

function projectStatusVariant(
  s: string
): "active" | "review" | "draft" | "confirmed" {
  switch (s) {
    case "active":
    case "in_progress":
      return "active";
    case "completed":
    case "done":
      return "confirmed";
    case "review":
    case "on_hold":
      return "review";
    default:
      return "draft";
  }
}

function deliverableStatusVariant(
  s: string
): "active" | "review" | "draft" | "confirmed" {
  switch (s) {
    case "approved":
    case "completed":
      return "confirmed";
    case "in_progress":
    case "active":
      return "active";
    case "review":
    case "pending":
      return "review";
    default:
      return "draft";
  }
}

const TASK_ORDER = ["todo", "in_progress", "done", "blocked"] as const;
const TASK_GROUP_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load project");
        return r.json();
      })
      .then((d: ProjectData) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [id]);

  async function handleToggleTask(task: Task) {
    if (togglingTask) return;
    const newStatus = toggleTaskStatus(task.status);
    setTogglingTask(task.id);
    try {
      await fetch(`/api/projects/${id}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === task.id ? { ...t, status: newStatus } : t
          ),
        };
      });
    } catch {
      /* silently fail */
    } finally {
      setTogglingTask(null);
    }
  }

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-yellow" />
          <span className="text-[12px] text-gray-5">Loading project…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-content flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle size={24} className="text-red" />
          <span className="text-[12px] text-red">
            {error || "Project not found"}
          </span>
          <Link href="/app/projects">
            <Button variant="secondary" size="sm">
              <ArrowLeft size={12} className="mr-1" /> Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const p = data.project;
  const clientName =
    p.clients?.company || p.clients?.name || "No Client";

  const groupedTasks = TASK_ORDER.reduce(
    (acc, group) => {
      acc[group] = data.tasks.filter((t) => statusGroup(t.status) === group);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  const sortedMilestones = [...data.milestones].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <div className="page-content">
      <PageHeader
        title={p.name}
        subtitle={`${clientName} · ${p.type} · Due ${formatDate(p.end_date)}`}
        actions={
          <div className="flex items-center gap-2.5">
            <Link href="/app/projects">
              <Button variant="secondary" size="sm">
                <ArrowLeft size={12} className="mr-1" /> Back
              </Button>
            </Link>
            <span
              className={`font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border bg-yellow/10 text-yellow border-yellow/20`}
            >
              {p.type}
            </span>
            <StatusBadge variant={projectStatusVariant(p.status)}>
              {p.status.replace(/_/g, " ")}
            </StatusBadge>
            <Link href={`/workspace/${p.id}`}>
              <Button variant="primary" size="sm">
                Open Canvas <ExternalLink size={11} className="ml-1" />
              </Button>
            </Link>
          </div>
        }
      />

      <div className="pm-dash-krow pm-dash-krow-4 px-7 py-4 border-b border-[#1E1E1E]">
        <div className="pm-dash-kcard flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black-4 flex items-center justify-center">
            <Calendar size={15} className="text-yellow" />
          </div>
          <div>
            <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
              Timeline
            </div>
            <div className="text-[12px] text-white font-semibold">
              {formatDate(p.start_date)} — {formatDate(p.end_date)}
            </div>
          </div>
        </div>
        <div className="pm-dash-kcard flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black-4 flex items-center justify-center">
            <DollarSign size={15} className="text-yellow" />
          </div>
          <div>
            <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
              Budget
            </div>
            <div className="text-[12px] text-white font-semibold">
              KES {(p.value || 0).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="pm-dash-kcard flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black-4 flex items-center justify-center">
            <Users size={15} className="text-yellow" />
          </div>
          <div>
            <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
              Team
            </div>
            <div className="text-[12px] text-white font-semibold">
              {data.members.length} member{data.members.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="pm-dash-kcard flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black-4 flex items-center justify-center">
            <FileText size={15} className="text-yellow" />
          </div>
          <div>
            <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
              Progress
            </div>
            <div className="text-[12px] text-white font-semibold">
              {p.progress}% complete
            </div>
          </div>
        </div>
      </div>

      <div className="px-7 py-3 flex items-center gap-1 border-b border-[#1E1E1E]">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-[12px] px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "text-yellow border-yellow"
                : "text-gray-4 border-transparent hover:text-white"
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
            {tab.key === "tasks" && data.tasks.length > 0 && (
              <span className="ml-0.5 text-[9px] bg-yellow/15 text-yellow px-1.5 py-0.5 rounded-full font-mono">
                {data.tasks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="pm-dash-card pm-dash-card-b mt-4">
        {activeTab === "overview" && (
          <div className="grid grid-cols-3 gap-5 p-5">
            <div className="col-span-2 space-y-5">
              <div className="pm-dash-card p-5">
                <h3 className="font-display text-[13px] font-semibold mb-3">
                  Project Brief
                </h3>
                <p className="text-[12px] text-gray-3 leading-relaxed">
                  {p.brief || "No brief provided."}
                </p>
              </div>

              <div className="pm-dash-card p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Progress
                </h3>
                <ProgressBar value={p.progress} label={`${p.progress}%`} />
              </div>

              {data.deliverables.length > 0 && (
                <div className="pm-dash-card p-5">
                  <h3 className="font-display text-[13px] font-semibold mb-4">
                    Deliverables
                  </h3>
                  <div className="space-y-3">
                    {data.deliverables.slice(0, 5).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between py-2 border-b border-[#1E1E1E] last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-gray-5" />
                          <div>
                            <div className="text-[12px] font-semibold text-white">
                              {d.title}
                            </div>
                            <div className="text-[10px] text-gray-5 mt-0.5">
                              {d.file_type?.toUpperCase()} · {formatDate(d.created_at)}
                            </div>
                          </div>
                        </div>
                        <StatusBadge variant={deliverableStatusVariant(d.approval_status)}>
                          {(d.approval_status || "draft").replace(/_/g, " ")}
                        </StatusBadge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="pm-dash-card p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Type
                    </div>
                    <span className="font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border bg-yellow/10 text-yellow border-yellow/20">
                      {p.type}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Client
                    </div>
                    <span className="text-[12px] text-gray-3">{clientName}</span>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Status
                    </div>
                    <StatusBadge variant={projectStatusVariant(p.status)}>
                      {p.status.replace(/_/g, " ")}
                    </StatusBadge>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Value
                    </div>
                    <span className="font-display text-[18px] font-bold text-yellow">
                      KES {(p.value || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Created
                    </div>
                    <span className="text-[12px] text-gray-3">
                      {formatDate(p.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {data.members.length > 0 && (
                <div className="pm-dash-card p-5">
                  <h3 className="font-display text-[13px] font-semibold mb-4">
                    Team
                  </h3>
                  <div className="space-y-2.5">
                    {data.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-yellow flex items-center justify-center text-[9px] font-bold text-black flex-shrink-0">
                          {memberInitials(m)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] text-white truncate">
                            {memberName(m)}
                          </div>
                          <div className="text-[9px] text-gray-5 uppercase font-mono">
                            {m.role || "member"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="p-5">
            {data.analyticsReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <BarChart3 size={32} className="text-gray-5 mb-3" />
                <p className="text-[13px] text-gray-4">
                  No analytics reports linked to this project.
                </p>
                <p className="text-[11px] text-gray-5 mt-1">
                  Link analytics reports from the Analytics page.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {data.analyticsReports.map((link) => {
                  const report = link.analytics_saved_reports;
                  if (!report) return null;
                  const gd = report.generated_data;
                  const rawData = gd?.data ?? [];
                  const chartType = (gd?.chart_type || "table") as ChartType;
                  const chartProps: ChartProps | null =
                    rawData.length > 0
                      ? transformChartData(chartType, rawData)
                      : null;
                  const category = findCategory(report.report_type);

                  return (
                    <div key={link.id} className="pm-dash-card p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="font-display text-[14px] font-semibold">
                            {report.name}
                          </div>
                          <div className="text-[11px] text-gray-5 mt-0.5 flex items-center gap-2">
                            {category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow/10 text-yellow">
                                {category.label}
                              </span>
                            )}
                            <span>{chartType.replace(/_/g, " ")}</span>
                            <span>·</span>
                            <span>{rawData.length} data points</span>
                          </div>
                        </div>
                      </div>
                      {chartProps ? (
                        <div style={{ height: 280 }}>
                          <AnalyticsChart {...chartProps} height={280} />
                        </div>
                      ) : (
                        <div className="text-[12px] text-gray-5 text-center py-8">
                          No chart data available
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "research" && (
          <div className="p-5">
            {data.research.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <BookOpen size={32} className="text-gray-5 mb-3" />
                <p className="text-[13px] text-gray-4">
                  No research linked to this project.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {data.research.map((rp) => (
                  <div key={rp.id} className="pm-dash-card p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-yellow/10 flex items-center justify-center">
                        <BookOpen size={14} className="text-yellow" />
                      </div>
                      <div>
                        <div className="font-display text-[14px] font-semibold">
                          {rp.type.replace(/_/g, " ")}
                        </div>
                        <div className="text-[11px] text-gray-5">
                          {rp.status.replace(/_/g, " ")} · {rp.progress}% progress
                        </div>
                      </div>
                    </div>

                    {rp.metadata?.kpis && rp.metadata.kpis.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {rp.metadata.kpis.map((kpi, i) => (
                          <div
                            key={i}
                            className="pm-dash-kcard p-3 flex flex-col"
                          >
                            <span className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
                              {kpi.label}
                            </span>
                            <span className="text-[16px] font-display font-bold text-yellow mt-1">
                              {kpi.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {rp.metadata?.summary && (
                      <div className="mb-4">
                        <h4 className="text-[11px] text-gray-5 uppercase font-mono tracking-wider mb-2">
                          Summary
                        </h4>
                        <p className="text-[12px] text-gray-3 leading-relaxed">
                          {rp.metadata.summary}
                        </p>
                      </div>
                    )}

                    {rp.metadata?.chartItems &&
                      rp.metadata.chartItems.length > 0 && (
                        <div>
                          <h4 className="text-[11px] text-gray-5 uppercase font-mono tracking-wider mb-3">
                            {rp.metadata.chartLabel || "Chart"}
                          </h4>
                          <div className="space-y-2">
                            {rp.metadata.chartItems.map((item, i) => {
                              const maxVal = Math.max(
                                ...rp.metadata!.chartItems!.map((c) => c.value)
                              );
                              const pct =
                                maxVal > 0
                                  ? Math.round((item.value / maxVal) * 100)
                                  : 0;
                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <span className="text-[11px] text-gray-3 w-32 truncate text-right">
                                    {item.label}
                                  </span>
                                  <div className="flex-1 h-4 bg-black-4 rounded overflow-hidden">
                                    <div
                                      className="h-full bg-yellow rounded"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] text-gray-4 font-mono w-16 text-right">
                                    {item.displayValue || item.value.toLocaleString()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "deliverables" && (
          <div className="p-5">
            {data.deliverables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText size={32} className="text-gray-5 mb-3" />
                <p className="text-[13px] text-gray-4">No deliverables yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.deliverables.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between py-3 px-4 border-b border-[#1E1E1E] last:border-0 hover:bg-white/[0.02] transition-colors rounded"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-gray-5 shrink-0" />
                      <div>
                        <div className="text-[12px] font-semibold text-white">
                          {d.title}
                        </div>
                        <div className="text-[10px] text-gray-5 mt-0.5">
                          {d.file_type?.toUpperCase() || "FILE"} · Created{" "}
                          {formatDate(d.created_at)}
                          {d.approval_status && (
                            <>
                              {" "}
                              ·{" "}
                              <span className="capitalize">
                                {d.approval_status.replace(/_/g, " ")}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {d.pdf_base64 && (
                        <a
                          href={`data:application/pdf;base64,${d.pdf_base64}`}
                          download={`${d.title}.pdf`}
                          className="text-[10px] text-yellow flex items-center gap-1 hover:text-white transition-colors"
                          title="Download PDF"
                        >
                          <Download size={12} /> PDF
                        </a>
                      )}
                      <StatusBadge
                        variant={deliverableStatusVariant(d.approval_status)}
                      >
                        {(d.approval_status || "draft").replace(
                          /_/g,
                          " "
                        )}
                      </StatusBadge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="p-5">
            {data.tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <CheckCircle2 size={32} className="text-gray-5 mb-3" />
                <p className="text-[13px] text-gray-4">No tasks yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {TASK_ORDER.map((group) => {
                  const tasks = groupedTasks[group];
                  if (!tasks || tasks.length === 0) return null;
                  return (
                    <div key={group}>
                      <h4 className="text-[11px] text-gray-5 uppercase font-mono tracking-wider mb-3 flex items-center gap-2">
                        {TASK_GROUP_LABELS[group]}
                        <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded-full">
                          {tasks.length}
                        </span>
                      </h4>
                      <div className="space-y-1">
                        {tasks.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center gap-3 py-2.5 px-3 border-b border-[#1E1E1E] last:border-0 hover:bg-white/[0.02] transition-colors rounded"
                          >
                            <button
                              onClick={() => handleToggleTask(t)}
                              disabled={togglingTask === t.id}
                              className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                                t.status === "done" || t.status === "completed"
                                  ? "bg-yellow border-yellow"
                                  : "border-[#444] hover:border-yellow"
                              }`}
                              title={`Mark as ${toggleTaskStatus(t.status).replace(/_/g, " ")}`}
                            >
                              {(t.status === "done" ||
                                t.status === "completed") && (
                                <Check size={11} className="text-black" />
                              )}
                              {togglingTask === t.id && (
                                <Loader2
                                  size={11}
                                  className="animate-spin text-black"
                                />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div
                                className={`text-[12px] ${
                                  t.status === "done" || t.status === "completed"
                                    ? "text-gray-5 line-through"
                                    : "text-white"
                                }`}
                              >
                                {t.title}
                              </div>
                              {t.description && (
                                <div className="text-[10px] text-gray-5 mt-0.5 truncate">
                                  {t.description}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`font-mono text-[9px] font-bold px-1.5 py-[2px] rounded-full border ${priorityColor(t.priority)}`}
                              >
                                {t.priority}
                              </span>
                              {t.assigned_to && (
                                <span className="text-[10px] text-gray-5">
                                  {t.assigned_to.slice(0, 8)}
                                </span>
                              )}
                              {t.due_date && (
                                <span className="text-[10px] text-gray-5 font-mono w-20 text-right">
                                  {formatDate(t.due_date)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "milestones" && (
          <div className="p-5">
            {sortedMilestones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Clock size={32} className="text-gray-5 mb-3" />
                <p className="text-[13px] text-gray-4">No milestones yet.</p>
              </div>
            ) : (
              <div className="relative max-w-2xl">
                <div className="absolute left-[17px] top-3 bottom-3 w-px bg-[#2A2A2A]" />
                <div className="space-y-0">
                  {sortedMilestones.map((m, i) => {
                    const isLast = i === sortedMilestones.length - 1;
                    return (
                      <div key={m.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="relative z-10 bg-[#0D0D0D] p-0.5 rounded-full">
                            {statusDot(m.status)}
                          </div>
                          {!isLast && (
                            <div className="flex-1 w-px bg-[#2A2A2A]" />
                          )}
                        </div>
                        <div className={`pb-6 flex-1`}>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[13px] font-semibold ${
                                m.status === "completed"
                                  ? "text-teal"
                                  : m.status === "cancelled"
                                    ? "text-red"
                                    : m.status === "in_progress"
                                      ? "text-yellow"
                                      : "text-gray-3"
                              }`}
                            >
                              {m.title}
                            </span>
                            {m.due_date && (
                              <span className="text-[10px] text-gray-5 font-mono">
                                {formatDate(m.due_date)}
                              </span>
                            )}
                          </div>
                          {m.description && (
                            <div className="text-[11px] text-gray-5 mt-1 leading-relaxed">
                              {m.description}
                            </div>
                          )}
                          <div className="text-[9px] text-gray-5 font-mono mt-1 uppercase tracking-wider">
                            {m.status.replace(/_/g, " ")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-display font-semibold">
                Project Documents
              </span>
              <DocumentUpload
                projectId={p.id}
                clientId={p.client_id}
                onUploaded={() => {
                  /* DocumentList handles its own refresh */
                }}
              />
            </div>
            <DocumentList projectId={p.id} canManage={true} />
          </div>
        )}
      </div>
    </div>
  );
}
