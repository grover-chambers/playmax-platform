"use client";

import React, { useState, useEffect, startTransition } from "react";
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

const defaultKpis = [
  { value: "—", label: "Tasks due today", sub: "Loading…", cardClass: "red", valueClass: "red" },
  { value: "—", label: "Unread messages", sub: "Loading…", cardClass: "blu", valueClass: "blu" },
  { value: "—", label: "My open leads", sub: "Loading…", cardClass: "", valueClass: "" },
  { value: "—", label: "Deals closed this month", sub: "Loading…", cardClass: "grn", valueClass: "grn" },
];

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
  const [myKpis, setMyKpis] = useState(defaultKpis);
  const [loading, setLoading] = useState(true);
  const [leadsPage, setLeadsPage] = useState(1);
  const [convPage, setConvPage] = useState(1);
  const { user } = useUser();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.allSettled([
      supabase.from("tasks").select("title, status, priority, due_date").order("priority", { ascending: true }),
      supabase.from("leads").select("company, intent, status, created_at").order("created_at", { ascending: false }),
      supabase.from("conversations").select("id, contact_name, last_message_at, status").order("last_message_at", { ascending: false }),
      supabase.from("projects").select("name, type, progress").order("updated_at", { ascending: false }).limit(3),
    ]).then(([tasksRes, leadsRes, convsRes, projsRes]) => {
      if (cancelled) return;
      const dbTasks = tasksRes.status === "fulfilled" ? tasksRes.value.data : null;
      const dbLeads = leadsRes.status === "fulfilled" ? leadsRes.value.data : null;
      const dbConvs = convsRes.status === "fulfilled" ? convsRes.value.data : null;
      const dbProjects = projsRes.status === "fulfilled" ? projsRes.value.data : null;

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
        const overdue = dbTasks.filter((t: { due_date?: string; status?: string }) => t.due_date && new Date(t.due_date) < now && t.status !== "done").length;
        setMyKpis(prev => prev.map(k =>
          k.label === "Tasks due today" ? { ...k, value: String(dueTasks.filter((t: { status?: string }) => t.status !== "done").length || 0), sub: `${overdue} overdue` } : k
        ));
      }

      if (dbLeads && dbLeads.length > 0) {
        setMyLeads(dbLeads.map((l: { company: string; intent?: string; status?: string; created_at?: string }) => ({
          company: l.company,
          intent: l.intent || "General",
          stage: l.status ? l.status.charAt(0).toUpperCase() + l.status.slice(1) : "New",
          contact: l.created_at ? formatTimeAgo(l.created_at) : "—",
        })));
        const openCount = dbLeads.filter((l: { status?: string }) => !["won", "lost"].includes(l.status || "")).length;
        const wonCount = dbLeads.filter((l: { status?: string }) => l.status === "won").length;
        setMyKpis(prev => prev.map(k =>
          k.label === "My open leads" ? { ...k, value: String(openCount || 0) } :
          k.label === "Deals closed this month" ? { ...k, value: String(wonCount || 0) } : k
        ));
      }

      if (dbConvs && dbConvs.length > 0) {
        setMyConversations(dbConvs.map((c: { contact_name?: string; last_message_at?: string; status?: string }) => ({
          name: c.contact_name || "Unknown",
          text: c.status || "Active",
          time: c.last_message_at ? formatTimeAgo(c.last_message_at) : "—",
          unread: false,
        })));
        setMyKpis(prev => prev.map(k =>
          k.label === "Unread messages" ? { ...k, value: String(dbConvs.length), sub: `${dbConvs.length} conversations` } : k
        ));
      }

      if (dbProjects && dbProjects.length > 0) {
        setMyProjects(dbProjects.map((p: { name: string; type?: string; progress?: number }) => ({
          name: p.name,
          type: p.type || "Project",
          progress: p.progress || 0,
        })));
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => { startTransition(() => { setLeadsPage(1); }); }, [myLeads]);
  useEffect(() => { startTransition(() => { setConvPage(1); }); }, [myConversations]);

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
        title="My Day"
        subtitle={`${myKpis[0].value} tasks due · ${myKpis[1].value} unread messages · ${myKpis[2].value} active leads`}
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
      <div
        className="px-7 pb-7"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "16px",
          alignItems: "start",
        }}
      >
        {/* ════ LEFT COLUMN ════════════════════════ */}
        <div className="space-y-4">
          {/* ── Today's Tasks ──────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">
                <CheckCircle2
                  size={13}
                  className="inline-block mr-1.5 text-yellow"
                  style={{ marginTop: -2 }}
                />
                Today&apos;s tasks
              </span>
              <Button variant="primary" size="sm" onClick={() => setShowNewTask(true)}>
                <Plus size={12} className="mr-1" /> New task
              </Button>
            </div>
            <div className="pm-dash-card-b">
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
                  className="inline-block mr-1.5 text-yellow"
                  style={{ marginTop: -2 }}
                />
                My leads
              </span>
              <Button variant="secondary" size="sm" onClick={() => router.push("/app/pipeline")}>
                View all
              </Button>
            </div>
            <div className="pm-dash-card-b-0">
              <div
                className="pm-dash-inv-head"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
                  gap: "8px",
                }}
              >
                <span>Company</span>
                <span>Intent</span>
                <span>Stage</span>
                <span>Last contact</span>
              </div>
              {paginatedLeads.map((lead) => (
                <div
                  key={lead.company}
                  className="pm-dash-inv-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
                    gap: "8px",
                    alignItems: "center",
                    padding: "9px 14px",
                    borderBottom: "1px solid #111",
                    fontSize: "12px",
                  }}
                >
                  <span className="pm-dash-inv-client">{lead.company}</span>
                  <span>
                    <span className="pm-dash-bdg pm-dash-bdg-b">
                      {lead.intent}
                    </span>
                  </span>
                  <span style={{ color: "var(--pm-gray-3)" }}>
                    {lead.stage}
                  </span>
                  <span
                    style={{
                      color:
                        lead.contact === "12d ago"
                          ? "var(--pm-red)"
                          : "var(--pm-gray-5)",
                    }}
                  >
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
                  className="inline-block mr-1.5 text-yellow"
                  style={{ marginTop: -2 }}
                />
                My conversations
              </span>
              <span
                className="pm-dash-bdg pm-dash-bdg-r"
                style={{ fontSize: "10px" }}
              >
                2 unread
              </span>
            </div>
            <div className="pm-dash-card-b">
              {paginatedConvs.map((conv) => (
                <div key={conv.name} className="pm-dash-msg-prev">
                  <div
                    className="user-avatar"
                    style={{
                      width: 30,
                      height: 30,
                      fontSize: 10,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {conv.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="pm-dash-mp-body">
                    <div className="pm-dash-mp-name">
                      {conv.unread && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full bg-yellow mr-1.5"
                          style={{ verticalAlign: "middle" }}
                        />
                      )}
                      {conv.name}
                    </div>
                    <div className="pm-dash-mp-text">{conv.text}</div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 9,
                        color: "var(--pm-gray-5)",
                        marginTop: 3,
                      }}
                    >
                      {conv.time}
                    </div>
                  </div>
                  <ChevronRight
                    size={12}
                    className="text-gray-5 shrink-0"
                    style={{ marginTop: 4 }}
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
                  className="inline-block mr-1.5 text-yellow"
                  style={{ marginTop: -2 }}
                />
                My projects
              </span>
            </div>
            <div className="pm-dash-card-b">
              {myProjects.map((proj) => (
                <div key={proj.name} className="pm-dash-li">
                  <div
                    className="pm-dash-li-dot"
                    style={{
                      background:
                        proj.progress >= 70
                          ? "var(--pm-green)"
                          : proj.progress >= 40
                            ? "var(--pm-yellow)"
                            : "var(--pm-gray-5)",
                    }}
                  />
                  <div className="pm-dash-li-body">
                    <div className="pm-dash-li-title">{proj.name}</div>
                    <div className="pm-dash-li-meta">{proj.type}</div>
                    <div className="pm-dash-prog-wrap">
                      <div className="pm-dash-prog-track">
                        <div
                          className="pm-dash-prog-fill"
                          style={{
                            width: `${proj.progress}%`,
                            background:
                              proj.progress >= 70
                                ? "var(--pm-green)"
                                : proj.progress >= 40
                                  ? "var(--pm-yellow)"
                                  : "var(--pm-gray-5)",
                          }}
                        />
                      </div>
                      <div className="pm-dash-prog-lbl">
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
