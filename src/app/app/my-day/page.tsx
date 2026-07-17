"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  AlertCircle,
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
  { value: "3", label: "Tasks due today", sub: "2 overdue from Friday", cardClass: "red", valueClass: "red" },
  { value: "2", label: "Unread messages", sub: "Twiga Foods · P&G EA", cardClass: "blu", valueClass: "blu" },
  { value: "8", label: "My open leads", sub: "2 need follow-up today", cardClass: "", valueClass: "" },
  { value: "2", label: "Deals closed this month", sub: "KES 1.1M won", cardClass: "grn", valueClass: "grn" },
];

interface Task {
  id: string;
  title: string;
  priority: "high" | "med" | "low";
  done: boolean;
  meta: string;
}

const tasks: Task[] = [
  {
    id: "t1",
    title: "Follow up with Twiga Foods on proposal",
    priority: "high",
    done: false,
    meta: "Due today · 2h ago",
  },
  {
    id: "t2",
    title: "Review OOH creative concepts for P&G EA",
    priority: "high",
    done: false,
    meta: "Due today · 3h ago",
  },
  {
    id: "t3",
    title: "Update lead tracker with new inquiries",
    priority: "med",
    done: false,
    meta: "Due today",
  },
  {
    id: "t4",
    title: "Organise research folder",
    priority: "low",
    done: false,
    meta: "Due tomorrow",
  },
  {
    id: "t5",
    title: "Send weekly report to management",
    priority: "high",
    done: true,
    meta: "Completed 9:42 AM",
  },
];

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

const leads: Lead[] = [
  {
    company: "Twiga Foods",
    intent: "Medium Intent",
    stage: "Proposal",
    contact: "2h ago",
  },
  {
    company: "P&G EA",
    intent: "High Intent",
    stage: "Qualified",
    contact: "1d ago",
  },
  {
    company: "Kevian Kenya",
    intent: "Medium Intent",
    stage: "Contacted",
    contact: "12d ago",
  },
  {
    company: "Java House",
    intent: "Brand Refresh",
    stage: "Proposal",
    contact: "3d ago",
  },
  { company: "Kenchic", intent: "Research", stage: "New", contact: "5d ago" },
];

interface Conversation {
  name: string;
  text: string;
  time: string;
  unread: boolean;
}

const conversations: Conversation[] = [
  {
    name: "Twiga Foods",
    text: "Hi, we've reviewed the proposal and would like to discuss the OOH placement options...",
    time: "4h ago",
    unread: true,
  },
  {
    name: "P&G EA",
    text: "Could you share the revised media plan for the Nairobi metro rollout?",
    time: "6h ago",
    unread: true,
  },
  {
    name: "Kenchic",
    text: "Thanks for the update, looking forward to the next deliverable.",
    time: "1d ago",
    unread: false,
  },
];

interface Project {
  name: string;
  type: string;
  progress: number;
}

const projects: Project[] = [
  { name: "OOH Campaign — P&G EA", type: "Out-of-Home", progress: 72 },
  { name: "Java House Brand Refresh", type: "Branding", progress: 45 },
  { name: "Safaricom Research Study", type: "Research", progress: 28 },
];

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
  const [myTasks, setMyTasks] = useState(tasks);
  const [myLeads, setMyLeads] = useState(leads);
  const [myConversations, setMyConversations] = useState(conversations);
  const [myProjects, setMyProjects] = useState(projects);
  const [myKpis, setMyKpis] = useState(defaultKpis);
  const [leadsPage, setLeadsPage] = useState(1);
  const [convPage, setConvPage] = useState(1);
  const { user } = useUser();

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: dbTasks } = await supabase
          .from("tasks")
          .select("title, status, priority, due_date")
          .order("priority", { ascending: true });
        if (dbTasks && dbTasks.length > 0) {
          const now = new Date();
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          const dueTasks = dbTasks.filter(t => {
            if (t.due_date && new Date(t.due_date) <= todayEnd) return true;
            return t.status === "in_progress" || t.status === "todo";
          });
          setMyTasks(dueTasks.slice(0, 5).map(t => ({
            id: Math.random().toString(36).slice(2),
            title: t.title,
            priority: (t.priority === "high" ? "high" : t.priority === "low" ? "low" : "med") as "high" | "med" | "low",
            done: t.status === "done",
            meta: t.due_date ? `Due ${new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No due date",
          })));
          const overdue = dbTasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== "done").length;
          setMyKpis(prev => prev.map(k =>
            k.label === "Tasks due today" ? { ...k, value: String(dueTasks.filter(t => t.status !== "done").length || 1), sub: `${overdue} overdue` } : k
          ));
        }
      } catch { /* fallback */ }
    })();
    (async () => {
      try {
        const supabase = createClient();
        const { data: dbLeads } = await supabase
          .from("leads")
          .select("company, intent, status, created_at")
          .order("created_at", { ascending: false })
          ;
        if (dbLeads && dbLeads.length > 0) {
          setMyLeads(dbLeads.map(l => ({
            company: l.company,
            intent: l.intent || "General",
            stage: l.status ? l.status.charAt(0).toUpperCase() + l.status.slice(1) : "New",
            contact: l.created_at ? formatTimeAgo(l.created_at) : "—",
          })));
          const openCount = dbLeads.filter(l => !["won", "lost"].includes(l.status)).length;
          const wonCount = dbLeads.filter(l => l.status === "won").length;
          setMyKpis(prev => prev.map(k =>
            k.label === "My open leads" ? { ...k, value: String(openCount || 1) } :
            k.label === "Deals closed this month" ? { ...k, value: String(wonCount || 0) } : k
          ));
        }
      } catch { /* fallback */ }
    })();
        (async () => {
          try {
            const supabase = createClient();
            const { data: dbConvs } = await supabase
              .from("conversations")
              .select("id, contact_name, last_message_at, channel, status")
              .order("last_message_at", { ascending: false });
            if (dbConvs && dbConvs.length > 0) {
              // Get latest message for each conversation
              const convIds = dbConvs.map(c => c.id);
              const { data: latestMsgs } = await supabase
                .from("messages")
                .select("conversation_id, text, direction, created_at")
                .in("conversation_id", convIds)
                .order("created_at", { ascending: false });
          
              const latestMsgMap = new Map();
              latestMsgs?.forEach(m => {
                if (!latestMsgMap.has(m.conversation_id)) {
                  latestMsgMap.set(m.conversation_id, m);
                }
              });
          
              // Get unread counts (inbound messages not read)
              const { data: unreadCounts } = await supabase
                .from("messages")
                .select("conversation_id")
                .in("conversation_id", convIds)
                .eq("direction", "inbound");
          
              const unreadMap = new Map();
              unreadCounts?.forEach(m => {
                unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1);
              });
          
              setMyConversations(dbConvs.map(c => {
                              const msg = latestMsgMap.get(c.id);
                              const unreadCount = unreadMap.get(c.id) || 0;
                              return {
                                name: c.contact_name || "Unknown",
                                text: msg?.text || "—",
                                time: formatTimeAgo(c.last_message_at),
                                unread: unreadCount > 0,
                              };
                            }));
          
              const totalUnread = Array.from(unreadMap.values()).reduce((a, b) => a + b, 0);
              setMyKpis(prev => prev.map(k =>
                k.label === "Unread messages" ? { ...k, value: String(totalUnread), sub: `${totalUnread} unread` } : k
              ));
            }
          } catch (err) {
            console.error("my-day conversations fetch failed:", err);
          }
        })();
    (async () => {
      try {
        const supabase = createClient();
        const { data: dbProjects } = await supabase
          .from("projects")
          .select("name, type, progress")
          .order("updated_at", { ascending: false })
          .limit(3);
        if (dbProjects && dbProjects.length > 0) {
          setMyProjects(dbProjects.map(p => ({
            name: p.name,
            type: p.type || "Project",
            progress: p.progress || 0,
          })));
        }
      } catch { /* fallback */ }
    })();
  }, [user?.id]);

  useEffect(() => { startTransition(() => { setLeadsPage(1); }); }, [myLeads]);
  useEffect(() => { startTransition(() => { setConvPage(1); }); }, [myConversations]);

  const { paginated: paginatedLeads, total: totalLeads } = usePagination(myLeads, leadsPage, 20);
  const { paginated: paginatedConvs, total: totalConvs } = usePagination(myConversations, convPage, 20);

  return (
    <div className="page-content">
      <NewTaskModal open={showNewTask} onClose={() => setShowNewTask(false)} />
      <PageHeader
        title="My Day"
        subtitle={`${myKpis[0].value} tasks due · ${myKpis[1].value} unread messages · ${myKpis[2].value} active leads`}
      />

      {/* ── Alerts ──────────────────────────────── */}
      <div className="px-7 pt-5 pb-2">
        <AlertBox variant="y" icon={AlertTriangle}>
          <strong>Twiga Foods</strong> has an unread message waiting for your
          reply — 4 hours old.
        </AlertBox>
        <AlertBox variant="r" icon={AlertCircle}>
          <strong>Kevian Kenya</strong> lead has been stale for 12 days. Follow
          up or escalate.
        </AlertBox>
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
    </div>
  );
}
