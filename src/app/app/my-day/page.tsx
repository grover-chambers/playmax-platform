"use client";

import React, { useState, useEffect, useMemo, startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  MessageSquare,
  ChevronRight,
  FolderKanban,
  Target,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import NewTaskModal from "@/components/modals/new-task-modal";
import { useUser } from "@/lib/user-context";
import { createClient } from "@/lib/supabase/browser";
import { formatTimeAgo } from "@/lib/utils";
import Pagination, { usePagination } from "@/components/ui/pagination";

/* ── Data ──────────────────────────────────────────────── */

interface Kpi {
  value: string;
  label: string;
  sub: string;
  cardClass: string;
  valueClass: string;
}

interface Task {
  id: string;
  title: string;
  priority: "high" | "med" | "low";
  done: boolean;
  meta: string;
}

const priorityLabel: Record<string, string> = {
  high: "pm-dash-pri-high",
  med: "pm-dash-pri-med",
  low: "pm-dash-pri-low",
};

const priorityText: Record<string, string> = {
  high: "High",
  med: "Med",
  low: "Low",
};

interface Lead {
  company: string;
  intent: string;
  stage: string;
  contact: string;
  contactStale: boolean;
}

interface Conversation {
  name: string;
  text: string;
  time: string;
  unread: boolean;
}

interface Project {
  name: string;
  type: string;
  progress: number;
}

/* ── Helpers ───────────────────────────────────────────── */

function projColor(progress: number) {
  if (progress >= 70) return "bg-green-500";
  if (progress >= 40) return "bg-yellow-500";
  return "bg-gray-500";
}

/* ── Components ────────────────────────────────────────── */

function AlertBox({
  variant,
  icon: Icon,
  children,
}: {
  variant: "y" | "r" | "g";
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className={`pm-dash-alert pm-dash-alert-${variant}`}>
      <Icon size={14} className="shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function TaskCheckbox({ done }: { done: boolean }) {
  return (
    <div className={`pm-dash-task-check ${done ? "done" : ""}`}>
      {done && (
        <CheckCircle2 size={10} className="text-black" strokeWidth={3} />
      )}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default function MyDayPage() {
  const router = useRouter();
  const [showNewTask, setShowNewTask] = useState(false);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [myConversations, setMyConversations] = useState<Conversation[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadsPage, setLeadsPage] = useState(1);
  const [convPage, setConvPage] = useState(1);
  const [rawCounts, setRawCounts] = useState({
    tasksDueToday: 0,
    overdue: 0,
    unreadMessages: 0,
    activeProjects: 0,
    pendingApprovals: 0,
  });
  const { user } = useUser();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.allSettled([
      supabase.from("tasks").select("title, status, priority, due_date").order("priority", { ascending: true }),
      supabase.from("leads").select("company, intent, status, created_at").order("created_at", { ascending: false }),
      supabase.from("conversations").select("id, contact_name, last_message_at, status").order("last_message_at", { ascending: false }),
      supabase.from("projects").select("name, type, progress, status").order("updated_at", { ascending: false }).limit(3),
    ]).then(([tasksRes, leadsRes, convsRes, projsRes]) => {
      if (cancelled) return;
      const dbTasks = tasksRes.status === "fulfilled" ? tasksRes.value.data : null;
      const dbLeads = leadsRes.status === "fulfilled" ? leadsRes.value.data : null;
      const dbConvs = convsRes.status === "fulfilled" ? convsRes.value.data : null;
      const dbProjects = projsRes.status === "fulfilled" ? projsRes.value.data : null;

      let tasksDueToday = 0;
      let overdue = 0;
      let pendingApprovals = 0;

      if (dbTasks && dbTasks.length > 0) {
        const now = new Date();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const dueTasks = dbTasks.filter((t: { due_date?: string; status?: string }) => {
          if (t.due_date && new Date(t.due_date) <= todayEnd) return true;
          return t.status === "in_progress" || t.status === "todo";
        });
        setMyTasks(dueTasks.slice(0, 5).map((t: { title: string; status?: string; priority?: string; due_date?: string }) => ({
          id: Math.random().toString(36).slice(2),
          title: t.title,
          priority: (t.priority === "high" ? "high" : t.priority === "low" ? "low" : "med") as "high" | "med" | "low",
          done: t.status === "done",
          meta: t.due_date ? `Due ${new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No due date",
        })));
        overdue = dbTasks.filter((t: { due_date?: string; status?: string }) => t.due_date && new Date(t.due_date) < now && t.status !== "done").length;
        tasksDueToday = dueTasks.filter((t: { status?: string }) => t.status !== "done").length || 0;
        pendingApprovals = dbTasks.filter((t: { status?: string }) => t.status === "todo" || t.status === "in_progress").length || 0;
      }

      if (dbLeads && dbLeads.length > 0) {
        setMyLeads(dbLeads.map((l: { company: string; intent?: string; status?: string; created_at?: string }) => ({
          company: l.company,
          intent: l.intent || "General",
          stage: l.status ? l.status.charAt(0).toUpperCase() + l.status.slice(1) : "New",
          contact: l.created_at ? formatTimeAgo(l.created_at) : "—",
          contactStale: l.created_at ? formatTimeAgo(l.created_at) === "12d ago" : false,
        })));
      }

      let unreadMessages = 0;
      if (dbConvs && dbConvs.length > 0) {
        setMyConversations(dbConvs.map((c: { contact_name?: string; last_message_at?: string; status?: string }) => ({
          name: c.contact_name || "Unknown",
          text: c.status || "Active",
          time: c.last_message_at ? formatTimeAgo(c.last_message_at) : "—",
          unread: false,
        })));
        unreadMessages = dbConvs.length;
      }

      let activeProjects = 0;
      if (dbProjects && dbProjects.length > 0) {
        setMyProjects(dbProjects.map((p: { name: string; type?: string; progress?: number }) => ({
          name: p.name,
          type: p.type || "Project",
          progress: p.progress || 0,
        })));
        activeProjects = dbProjects.filter((p: { status?: string }) => p.status === "in_progress").length || dbProjects.length;
      }

      if (!cancelled) {
        setRawCounts({ tasksDueToday, overdue, unreadMessages, activeProjects, pendingApprovals });
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => { startTransition(() => { setLeadsPage(1); }); }, [myLeads]);
  useEffect(() => { startTransition(() => { setConvPage(1); }); }, [myConversations]);

  const userName = (user?.user_metadata?.name as string) || user?.email?.split("@")[0] || "there";

  const myKpis: Kpi[] = useMemo(() => [
    { value: String(rawCounts.tasksDueToday), label: "Tasks due today", sub: `${rawCounts.overdue} overdue`, cardClass: "red", valueClass: "red" },
    { value: String(rawCounts.unreadMessages), label: "Unread messages", sub: `${rawCounts.unreadMessages} conversations`, cardClass: "blu", valueClass: "blu" },
    { value: String(rawCounts.activeProjects), label: "Active projects", sub: "In progress", cardClass: "", valueClass: "" },
    { value: String(rawCounts.pendingApprovals), label: "Pending approvals", sub: "Awaiting review", cardClass: "grn", valueClass: "grn" },
  ], [rawCounts]);

  const { paginated: paginatedLeads, total: totalLeads } = usePagination(myLeads, leadsPage, 20);
  const { paginated: paginatedConvs, total: totalConvs } = usePagination(myConversations, convPage, 20);

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-5 text-[13px]">Loading your day…</div>
      ) : (
      <>
      <NewTaskModal open={showNewTask} onClose={() => setShowNewTask(false)} />
      <PageHeader
        title={`Good morning, ${userName}`}
        subtitle={`${myKpis[0].value} tasks due · ${myKpis[1].value} unread messages · ${myKpis[2].value} active projects`}
      />

      {/* ── Alerts ──────────────────────────────── */}
      <div className="px-7 pt-5 pb-2">
        {myConversations.length > 0 && myConversations[0]?.unread && (
          <AlertBox variant="y" icon={AlertTriangle}>
            <strong>{myConversations[0].name}</strong> has a recent message — check your inbox.
          </AlertBox>
        )}
      </div>

      {/* ── KPI Row ─────────────────────────────── */}
      <div className="px-7 pt-4 pb-2">
        <div className="pm-dash-krow pm-dash-krow-4">
          {myKpis.map((kpi) => (
            <div key={kpi.label} className={`pm-dash-kcard ${kpi.cardClass}`}>
              <div className={`pm-dash-kn ${kpi.valueClass}`}>{kpi.value}</div>
              <div className="pm-dash-kl">{kpi.label}</div>
              <div className="pm-dash-ksub">{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column grid ─────────────────────── */}
      <div className="px-7 pb-7 grid grid-cols-[2fr_1fr] gap-4 items-start">
        {/* ════ LEFT COLUMN ════════════════════════ */}
        <div className="space-y-4">
          {/* ── Today's Tasks ──────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">
                <CheckCircle2
                  size={13}
                  className="inline-block mr-1.5 text-yellow -mt-0.5"
                />
                Today&apos;s tasks
              </span>
              <Button variant="primary" size="sm" onClick={() => setShowNewTask(true)}>
                <Plus size={12} className="mr-1" /> New task
              </Button>
            </div>
            <div className="pm-dash-card-b">
              {myTasks.length === 0 && (
                <div className="text-[12px] text-gray-5 py-4 text-center">No tasks due today — enjoy the calm.</div>
              )}
              {myTasks.map((task) => (
                <div key={task.id} className="pm-dash-task">
                  <TaskCheckbox done={task.done} />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`pm-dash-task-title ${task.done ? "done" : ""}`}
                    >
                      {task.title}
                    </div>
                    <div className="pm-dash-task-meta">{task.meta}</div>
                  </div>
                  <span
                    className={`pm-dash-task-pri ${priorityLabel[task.priority]}`}
                  >
                    {priorityText[task.priority]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── My Leads ───────────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">
                <Target
                  size={13}
                  className="inline-block mr-1.5 text-yellow -mt-0.5"
                />
                My leads
              </span>
              <Button variant="secondary" size="sm" onClick={() => router.push("/app/pipeline")}>
                View all
              </Button>
            </div>
            <div className="pm-dash-card-b-0">
              <div className="pm-dash-inv-head">
                <span>Company</span>
                <span>Intent</span>
                <span>Stage</span>
                <span>Last contact</span>
              </div>
              {paginatedLeads.map((lead) => (
                <div
                  key={lead.company}
                  className="pm-dash-inv-row"
                >
                  <span className="pm-dash-inv-client">{lead.company}</span>
                  <span>
                    <span className="pm-dash-bdg pm-dash-bdg-b">
                      {lead.intent}
                    </span>
                  </span>
                  <span className="text-gray-400">
                    {lead.stage}
                  </span>
                  <span className={lead.contactStale ? "text-red-400" : "text-gray-500"}>
                    {lead.contact}
                  </span>
                </div>
              ))}
              <Pagination page={leadsPage} pageSize={20} total={totalLeads} onPageChange={setLeadsPage} />
            </div>
          </div>
        </div>

        {/* ════ RIGHT COLUMN ═══════════════════════ */}
        <div className="space-y-4">
          {/* ── My Conversations ────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">
                <MessageSquare
                  size={13}
                  className="inline-block mr-1.5 text-yellow -mt-0.5"
                />
                My conversations
              </span>
              <span className="pm-dash-bdg pm-dash-bdg-r text-[10px]">
                2 unread
              </span>
            </div>
            <div className="pm-dash-card-b">
              {paginatedConvs.map((conv) => (
                <div key={conv.name} className="pm-dash-msg-prev">
                  <div className="user-avatar">
                    {conv.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="pm-dash-mp-body">
                    <div className="pm-dash-mp-name">
                      {conv.unread && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow mr-1.5 align-middle" />
                      )}
                      {conv.name}
                    </div>
                    <div className="pm-dash-mp-text">{conv.text}</div>
                    <div className="font-mono text-[9px] text-gray-500 mt-0.5">
                      {conv.time}
                    </div>
                  </div>
                  <ChevronRight
                    size={12}
                    className="text-gray-500 shrink-0 mt-1"
                  />
                </div>
              ))}
              <Pagination page={convPage} pageSize={20} total={totalConvs} onPageChange={setConvPage} />
            </div>
          </div>

          {/* ── My Projects ─────────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">
                <FolderKanban
                  size={13}
                  className="inline-block mr-1.5 text-yellow -mt-0.5"
                />
                My projects
              </span>
            </div>
            <div className="pm-dash-card-b">
              {myProjects.map((proj) => (
                <div key={proj.name} className="pm-dash-li">
                  <div className={`pm-dash-li-dot ${projColor(proj.progress)}`} />
                  <div className="pm-dash-li-body">
                    <div className="pm-dash-li-title">{proj.name}</div>
                    <div className="pm-dash-li-meta">{proj.type}</div>
                    <div className="pm-dash-prog-wrap">
                      <div className="pm-dash-prog-track">
                        <div
                          className={`pm-dash-prog-fill ${projColor(proj.progress)} w-[${proj.progress}%]`}
                        />
                      </div>
                      <div className="pm-dash-prog-lbl flex justify-between">
                        <span>{proj.progress}%</span>
                        <span>On track</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
