"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  FileText,
  Users,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import Avatar from "@/components/ui/avatar";
import DocumentList from "@/components/documents/document-list";
import DocumentUpload from "@/components/documents/document-upload";
import { createClient } from "@/utils/supabase/client";

/* ── Tab type ─────────────────────────────────────── */
type Tab =
  | "overview"
  | "deliverables"
  | "communications"
  | "tasks"
  | "documents";

/* ── DB row types ─────────────────────────────────── */
interface DbProject {
  id: string;
  client_id: string | null;
  name: string;
  type: string | null;
  status: string | null;
  value: number | null;
  start_date: string | null;
  end_date: string | null;
  assigned_to: string | null;
  brief: string | null;
  progress: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string | null; email: string | null } | null;
}

interface DbTask {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
}

interface DbDocument {
  id: string;
  project_id: string | null;
  client_id: string | null;
  name: string;
  type: string | null;
  url: string;
  size: number | null;
  visible_to_client: boolean | null;
  created_at: string;
}

interface DbDeliverable {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size: string | null;
  uploaded_by: string | null;
  created_at: string;
}

interface DbConversation {
  id: string;
  contact_name: string;
  channel: string | null;
  status: string | null;
  last_message_at: string | null;
  client_id: string;
}

/* ── Helpers ──────────────────────────────────────── */
function statusBadgeClass(status: string | null): string {
  if (!status) return "pm-dash-bdg-n";
  const s = status.toLowerCase();
  if (s === "active" || s === "completed" || s === "done")
    return "pm-dash-bdg-g";
  if (s === "in_progress" || s === "in progress" || s === "review")
    return "pm-dash-bdg-y";
  if (s === "draft" || s === "planned") return "pm-dash-bdg-b";
  if (
    s === "cancelled" ||
    s === "archived" ||
    s === "blocked" ||
    s === "inactive"
  )
    return "pm-dash-bdg-n";
  return "pm-dash-bdg-b";
}

function statusLabel(status: string | null): string {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number | null): string {
  if (amount == null || amount === 0) return "KES —";
  if (amount >= 1_000_000) return `KES ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `KES ${(amount / 1_000).toFixed(0)}K`;
  return `KES ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-KE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

function ownerDisplay(assignedTo: string | null): {
  name: string;
  initials: string;
} {
  if (!assignedTo) return { name: "Unassigned", initials: "UA" };
  const name = assignedTo
    .split("@")[0]
    .replace(".", " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return { name, initials };
}

function taskStatusBadge(status: string | null): string {
  if (!status) return "pm-dash-bdg-b";
  const s = status.toLowerCase();
  if (s === "done" || s === "completed") return "pm-dash-bdg-g";
  if (s === "in_progress" || s === "in progress") return "pm-dash-bdg-y";
  if (s === "blocked") return "pm-dash-bdg-r";
  return "pm-dash-bdg-b";
}

function channelIcon(channel: string | null): string {
  if (!channel) return "M";
  const c = channel.toLowerCase();
  if (c === "email") return "E";
  if (c === "whatsapp" || c === "wa") return "W";
  if (c === "sms") return "S";
  return "M";
}

const tabItems: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "deliverables", label: "Deliverables" },
  { key: "communications", label: "Communications" },
  { key: "tasks", label: "Tasks" },
  { key: "documents", label: "Documents" },
];

/* ── Page Component ───────────────────────────────── */
export default function ProjectDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [project, setProject] = useState<DbProject | null>(null);
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [documents, setDocuments] = useState<DbDocument[]>([]);
  const [deliverables, setDeliverables] = useState<DbDeliverable[]>([]);
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Derived values ──── */
  const clientName = project?.clients?.name || "—";
  const clientEmail = project?.clients?.email || null;
  const owner = ownerDisplay(project?.assigned_to ?? null);
  const budget = project?.value ?? null;
  const progress = project?.progress ?? 0;
  const tasksCompleted = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;

  /* ── Fetch project ──────────────────────────────── */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        const { data: projectData, error: projectErr } = await supabase
          .from("projects")
          .select("*, clients(name, email)")
          .eq("id", id)
          .single();

        if (cancelled) return;
        if (projectErr || !projectData) {
          setError("Project not found.");
          setLoading(false);
          return;
        }
        setProject(projectData as DbProject);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load project");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ── Fetch related data when project loads ──────── */
  useEffect(() => {
    if (!id || !project) return;
    let cancelled = false;
    const supabase = createClient();

    // Tasks
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setTasks(data as DbTask[]);
      });

    // Documents
    supabase
      .from("documents")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setDocuments(data as DbDocument[]);
      });

    // Deliverables
    supabase
      .from("deliverables")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setDeliverables(data as DbDeliverable[]);
      });

    // Conversations (via client_id)
    if (project.client_id) {
      supabase
        .from("conversations")
        .select("*")
        .eq("client_id", project.client_id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .then(({ data }) => {
          if (!cancelled && data) setConversations(data as DbConversation[]);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [id, project]);

  /* ── Loading state ──────────────────────────────── */
  if (loading) {
    return (
      <div className="px-7 py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 size={20} className="animate-spin text-yellow" />
        <span className="text-[13px] text-gray-5">Loading project…</span>
      </div>
    );
  }

  /* ── Error state ────────────────────────────────── */
  if (error || !project) {
    return (
      <div className="px-7 py-20 flex flex-col items-center justify-center gap-3">
        <span className="text-[13px] text-red">
          {error || "Project not found"}
        </span>
        <Link
          href="/app/projects"
          className="text-[12px] text-yellow hover:underline"
        >
          ← Back to projects
        </Link>
      </div>
    );
  }

  const p = project;

  return (
    <div>
      {/* ── Header ──── */}
      <PageHeader
        title={p.name}
        subtitle={`${clientName} · ${p.type?.replace(/_/g, " ") || "—"} · Due ${formatDate(p.end_date)}`}
        actions={
          <>
            <Link href="/app/projects">
              <Button variant="secondary" size="sm">
                <ArrowLeft size={12} className="mr-1" /> Back
              </Button>
            </Link>
            <span className={`pm-dash-bdg ${statusBadgeClass(p.status)}`}>
              {statusLabel(p.status)}
            </span>
          </>
        }
      />

      {/* ── Meta strip ──── */}
      <div className="px-7 py-4 grid grid-cols-4 gap-4 border-b border-[#1E1E1E]">
        {/* Timeline */}
        <div className="flex items-center gap-3">
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

        {/* Budget */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black-4 flex items-center justify-center">
            <DollarSign size={15} className="text-yellow" />
          </div>
          <div>
            <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
              Value
            </div>
            <div className="text-[12px] text-white font-semibold">
              {formatCurrency(budget)}
            </div>
          </div>
        </div>

        {/* Tasks progress */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black-4 flex items-center justify-center">
            <Users size={15} className="text-yellow" />
          </div>
          <div>
            <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
              Tasks
            </div>
            <div className="text-[12px] text-white font-semibold">
              {tasksCompleted}/{totalTasks} done
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black-4 flex items-center justify-center">
            <FileText size={15} className="text-yellow" />
          </div>
          <div>
            <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
              Progress
            </div>
            <div className="text-[12px] text-white font-semibold">
              {progress}% complete
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ──── */}
      <div className="px-7 py-3 flex items-center gap-1 border-b border-[#1E1E1E]">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-[12px] px-4 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "text-yellow border-yellow"
                : "text-gray-4 border-transparent hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──── */}
      <div className="p-7">
        {/* ══════ OVERVIEW ══════ */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-5">
              {/* Deliverables card */}
              <div className="pm-dash-card">
                <div className="pm-dash-card-h">
                  <span className="pm-dash-card-t text-[13px] font-semibold">
                    Deliverables
                  </span>
                </div>
                <div className="pm-dash-card-b">
                  {deliverables.length === 0 ? (
                    <div className="text-[12px] text-gray-5 py-3">
                      No deliverables yet
                    </div>
                  ) : (
                    deliverables.slice(0, 5).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between py-2 border-b border-[#1E1E1E] last:border-0"
                      >
                        <div>
                          <div className="text-[12px] font-semibold">
                            {d.title}
                          </div>
                          {d.description && (
                            <div className="text-[10px] text-gray-5 mt-0.5 max-w-[300px] truncate">
                              {d.description}
                            </div>
                          )}
                        </div>
                        {d.file_type && (
                          <span className="font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border bg-yellow/10 text-yellow border-yellow/20">
                            {d.file_type.toUpperCase()}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Progress card */}
              <div className="pm-dash-card">
                <div className="pm-dash-card-h">
                  <span className="pm-dash-card-t text-[13px] font-semibold">
                    Progress
                  </span>
                </div>
                <div className="pm-dash-card-b">
                  <div className="pm-dash-prog-wrap mt-2">
                    <div className="pm-dash-prog-track">
                      <div
                        className="pm-dash-prog-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="pm-dash-prog-lbl">{progress}%</span>
                  </div>
                  <div className="pm-dash-mini-kpi mt-4">
                    <span className="pm-dash-mini-kpi-val">
                      {tasksCompleted}
                    </span>
                    <span className="pm-dash-mini-kpi-lbl">
                      of {totalTasks} tasks completed
                    </span>
                  </div>
                  <div className="pm-dash-mini-kpi mt-2">
                    <span className="pm-dash-mini-kpi-val">
                      {documents.length}
                    </span>
                    <span className="pm-dash-mini-kpi-lbl">
                      documents uploaded
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent tasks */}
              <div className="pm-dash-card">
                <div className="pm-dash-card-h">
                  <span className="pm-dash-card-t text-[13px] font-semibold">
                    Recent Tasks
                  </span>
                </div>
                <div className="pm-dash-card-b">
                  {tasks.length === 0 ? (
                    <div className="text-[12px] text-gray-5 py-3">
                      No tasks yet
                    </div>
                  ) : (
                    tasks.slice(0, 5).map((t) => (
                      <div
                        key={t.id}
                        className="pm-dash-task"
                      >
                        <div
                          className={`pm-dash-task-check ${t.status === "done" ? "done" : ""}`}
                        >
                          {t.status === "done" && (
                            <span className="text-[8px] font-bold">✓</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <span
                            className={`pm-dash-task-title ${t.status === "done" ? "done" : ""}`}
                          >
                            {t.title}
                          </span>
                          <span className="pm-dash-task-meta">
                            {t.due_date ? ` · Due ${formatDate(t.due_date)}` : ""}
                            {t.priority && (
                              <span
                                className={`pm-dash-task-pri ${t.priority === "high" || t.priority === "urgent" ? "pm-dash-pri-high" : t.priority === "medium" ? "pm-dash-pri-med" : "pm-dash-pri-low"}`}
                              >
                                {t.priority}
                              </span>
                            )}
                          </span>
                        </div>
                        <span className={`pm-dash-bdg ${taskStatusBadge(t.status)} text-[9px]`}>
                          {statusLabel(t.status)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── Sidebar ──── */}
            <div className="space-y-5">
              {/* Details card */}
              <div className="pm-dash-card">
                <div className="pm-dash-card-h">
                  <span className="pm-dash-card-t text-[13px] font-semibold">
                    Details
                  </span>
                </div>
                <div className="pm-dash-card-b">
                  <div className="mb-3">
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Type
                    </div>
                    <span className="font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border bg-yellow/10 text-yellow border-yellow/20">
                      {(p.type || "—").replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Client
                    </div>
                    <span className="text-[12px]">{clientName}</span>
                    {clientEmail && (
                      <div className="text-[10px] text-gray-5 mt-0.5">
                        {clientEmail}
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Project Lead
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar
                        initials={owner.initials}
                        variant="yellow"
                        size="sm"
                      />
                      <span className="text-[12px]">{owner.name}</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Value
                    </div>
                    <span className="font-display text-[18px] font-bold text-yellow">
                      {formatCurrency(budget)}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Status
                    </div>
                    <span className={`pm-dash-bdg ${statusBadgeClass(p.status)}`}>
                      {statusLabel(p.status)}
                    </span>
                  </div>
                  {p.brief && (
                    <div>
                      <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                        Brief
                      </div>
                      <p className="text-[11px] text-gray-3 leading-relaxed">
                        {p.brief}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* KPI summary */}
              <div className="pm-dash-kcard">
                <div className="pm-dash-kn">{progress}%</div>
                <div className="pm-dash-kl">Project Progress</div>
              </div>
              <div className="pm-dash-kcard">
                <div className="pm-dash-kn">{totalTasks}</div>
                <div className="pm-dash-kl">Total Tasks</div>
              </div>
              <div className="pm-dash-kcard">
                <div className="pm-dash-kn">{documents.length}</div>
                <div className="pm-dash-kl">Documents</div>
              </div>
              <div className="pm-dash-kcard">
                <div className="pm-dash-kn">{conversations.length}</div>
                <div className="pm-dash-kl">Conversations</div>
              </div>
            </div>
          </div>
        )}

        {/* ══════ DELIVERABLES ══════ */}
        {activeTab === "deliverables" && (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[13px] font-semibold">
                Project Deliverables
              </span>
              <span className="text-[11px] text-gray-5">
                {deliverables.length} item{deliverables.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="pm-dash-card-b">
              {deliverables.length === 0 ? (
                <div className="text-[12px] text-gray-5 py-3">
                  No deliverables found for this project.
                </div>
              ) : (
                deliverables.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between py-3 border-b border-[#1E1E1E] last:border-0"
                  >
                    <div>
                      <div className="text-[12px] font-semibold">
                        {d.title}
                      </div>
                      <div className="text-[10px] text-gray-5 mt-0.5">
                        {d.description || "No description"} ·{" "}
                        {formatDate(d.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {d.file_type && (
                        <span className="font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border bg-yellow/10 text-yellow border-yellow/20">
                          {d.file_type.toUpperCase()}
                        </span>
                      )}
                      {d.file_size && (
                        <span className="text-[10px] text-gray-5">
                          {d.file_size}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══════ COMMUNICATIONS ══════ */}
        {activeTab === "communications" && (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[13px] font-semibold">
                Communications
              </span>
              <span className="text-[11px] text-gray-5">
                {conversations.length} conversation
                {conversations.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="pm-dash-card-b">
              {conversations.length === 0 ? (
                <div className="text-[12px] text-gray-5 py-3">
                  No conversations found for this client.
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-4 py-3 border-b border-[#1E1E1E] last:border-0"
                  >
                    <div className="pm-dash-cq-icon">
                      {channelIcon(c.channel)}
                    </div>
                    <div className="pm-dash-cq-body flex-1">
                      <div className="pm-dash-cq-title">
                        {c.contact_name}
                      </div>
                      <div className="pm-dash-cq-meta">
                        {(c.channel || "Unknown").replace(/\b\w/g, (ch) =>
                          ch.toUpperCase()
                        )}{" "}
                        · {c.status === "open" ? "Open" : "Closed"}
                      </div>
                    </div>
                    <span className="pm-dash-cq-right text-[10px] text-gray-5 flex-shrink-0">
                      {formatRelative(c.last_message_at) || "—"}
                    </span>
                    {c.status && (
                      <span
                        className={`pm-dash-bdg ${c.status === "open" ? "pm-dash-bdg-g" : "pm-dash-bdg-n"} text-[9px]`}
                      >
                        {c.status}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══════ TASKS ══════ */}
        {activeTab === "tasks" && (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[13px] font-semibold">
                Tasks
              </span>
              <span className="text-[11px] text-gray-5">
                {tasksCompleted}/{totalTasks} completed
              </span>
            </div>
            <div className="pm-dash-card-b">
              {tasks.length === 0 ? (
                <div className="text-[12px] text-gray-5 py-3">
                  No tasks found for this project.
                </div>
              ) : (
                tasks.map((t) => (
                  <div key={t.id} className="pm-dash-task">
                    <div
                      className={`pm-dash-task-check ${t.status === "done" ? "done" : ""}`}
                    >
                      {t.status === "done" && (
                        <span className="text-[8px] font-bold">✓</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <span
                        className={`pm-dash-task-title ${t.status === "done" ? "done" : ""}`}
                      >
                        {t.title}
                      </span>
                      <span className="pm-dash-task-meta">
                        {t.due_date ? ` · Due ${formatDate(t.due_date)}` : ""}
                        {t.description && (
                          <span className="text-gray-4">
                            {" · "}
                            {t.description.length > 60
                              ? t.description.slice(0, 60) + "…"
                              : t.description}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.priority && (
                        <span
                          className={`pm-dash-task-pri ${t.priority === "high" || t.priority === "urgent" ? "pm-dash-pri-high" : t.priority === "medium" ? "pm-dash-pri-med" : "pm-dash-pri-low"}`}
                        >
                          {t.priority}
                        </span>
                      )}
                      <span className={`pm-dash-bdg ${taskStatusBadge(t.status)} text-[9px]`}>
                        {statusLabel(t.status)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══════ DOCUMENTS ══════ */}
        {activeTab === "documents" && (
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t text-[13px] font-semibold">
                Project Documents
              </span>
              <DocumentUpload
                projectId={p.id}
                clientId={p.client_id || undefined}
                onUploaded={() => {
                  /* refresh handled by DocumentList */
                }}
              />
            </div>
            <div className="pm-dash-card-b">
              <DocumentList projectId={p.id} canManage={true} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
