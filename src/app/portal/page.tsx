"use client";

import React, { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import {
  Sun,
  AlertTriangle,
  ArrowRight,
  FileText,
  Clock,
  CreditCard,
  User,
  BarChart3,
  Loader2,
  Milestone,
  TrendingUp,
} from "lucide-react";
import { usePortalClient } from "@/components/portal/portal-provider";
import DocumentList from "@/components/documents/document-list";
import PageHeader from "@/components/layout/page-header";
import ResearchFindingsCards from "@/components/portal/research-findings-cards";
import MilestoneTimeline from "@/components/portal/milestone-timeline";

function competitorLabel(name: string, isClient: boolean, rank: number): string {
  if (isClient) return name;
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `Competitor ${letters[(rank - 1) % 26]}`;
}

interface KpiData {
  activeProjects: number;
  totalProjects: number;
  totalProjectValue: number;
  outstandingAmount: number;
  overdueInvoices: number;
  totalInvoices: number;
  activeBookings: number;
  totalBookings: number;
  openConversations: number;
  pendingDeliverables: number;
}

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  value: number;
  progress: number;
  end_date: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date: string | null;
}

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  inventory?: { name: string; location: string } | null;
}

interface ActivityItem {
  id: string;
  type: "project" | "invoice" | "booking" | "deliverable" | "milestone" | "general";
  title: string;
  detail: string;
  date: string;
  status: string;
}

interface LoggedActivity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

function buildActivityFeed(
  projects: Project[],
  invoices: Invoice[],
  bookings: Booking[],
  kpis: KpiData | null,
  activityLog: LoggedActivity[],
  milestones?: number,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const p of projects) {
    items.push({
      id: `p-${p.id}`,
      type: "project",
      title: p.name,
      detail: `${p.type.replace(/_/g, " ")} — ${p.progress}% complete`,
      date: p.end_date || p.id,
      status: p.status,
    });
  }
  for (const inv of invoices) {
    items.push({
      id: `i-${inv.id}`,
      type: "invoice",
      title: inv.invoice_number,
      detail: `${formatCurrency(inv.amount)} — ${inv.status}`,
      date: inv.due_date || inv.id,
      status: inv.status,
    });
  }
  for (const b of bookings) {
    items.push({
      id: `b-${b.id}`,
      type: "booking",
      title: b.inventory?.name || "Booking",
      detail: `${new Date(b.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — ${new Date(b.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      date: b.start_date,
      status: b.status,
    });
  }
  for (const log of activityLog) {
    items.push({
      id: `log-${log.id}`,
      type: (log.activity_type.replace("_event", "") as ActivityItem["type"]) || "general",
      title: log.title,
      detail: log.description || log.activity_type.replace(/_/g, " "),
      date: log.created_at,
      status: "active",
    });
  }
  if (kpis && kpis.pendingDeliverables > 0) {
    items.push({
      id: "deliverables",
      type: "deliverable",
      title: "New deliverables available",
      detail: `${kpis.pendingDeliverables} file${kpis.pendingDeliverables > 1 ? "s" : ""} ready for review`,
      date: new Date().toISOString(),
      status: "available",
    });
  }
  if (milestones && milestones > 0) {
    items.push({
      id: "milestones",
      type: "milestone",
      title: `${milestones} milestone${milestones > 1 ? "s" : ""} pending`,
      detail: "Project milestones awaiting completion",
      date: new Date().toISOString(),
      status: "pending",
    });
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
}

function formatCurrency(amount: number | null | undefined): string {
  const num = amount ?? 0;
  if (num >= 1_000_000) return `KES ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `KES ${(num / 1_000).toFixed(0)}K`;
  return `KES ${num.toLocaleString()}`;
}

function getGreeting(client: { industry?: string | null; name?: string | null } | null): string {
  const h = new Date().getHours();
  const base = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  if (client?.industry) {
    return `${base}, ${client.name?.split(" ")[0] || "there"}. Welcome to your ${client.industry} dashboard.`;
  }
  return `${base}, ${client?.name?.split(" ")[0] || "there"}.`;
}

function getSubtitle(client: { company?: string | null; industry?: string | null } | null, kpis: KpiData | null): string {
  if (client?.company && kpis) {
    const total = kpis.totalProjects + kpis.totalInvoices + kpis.totalBookings;
    return `${client.company} · ${total} total engagement${total !== 1 ? "s" : ""} across projects, invoices, and bookings.`;
  }
  if (client?.company) {
    return `Here's a summary of your engagements with ${client.company}.`;
  }
  return "Here's a summary of your active engagements with PlayMax.";
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
    case "in_progress":
    case "confirmed":
      return "pm-dash-bdg-g";
    case "review":
    case "pending":
      return "pm-dash-bdg-b";
    case "completed":
    case "available":
      return "pm-dash-bdg-g";
    case "overdue":
    case "cancelled":
      return "pm-dash-bdg-r";
    default:
      return "pm-dash-bdg-n";
  }
}

export default function PortalOverviewPage() {
  const { client } = usePortalClient();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [activityLog, setActivityLog] = useState<LoggedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maizeAnalytics, setMaizeAnalytics] = useState<Record<string, unknown> | null>(null);
  const [maizeLoading, setMaizeLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/portal/overview").then((r) => r.json()),
      fetch("/api/portal/activity").then((r) => r.json()),
      fetch("/api/portal/analytics/category/maizze").then((r) => r.json()),
    ])
      .then(([overview, activity, maize]) => {
        startTransition(() => {
          if (overview.error) {
            setError(overview.error);
          } else {
            setKpis(overview.kpis);
            setRecentProjects(overview.recentProjects || []);
            setRecentInvoices(overview.recentInvoices || []);
            setRecentBookings(overview.recentBookings || []);
          }
          setActivityLog(activity.activity || []);
          if (maize && maize.category) setMaizeAnalytics(maize);
          setMaizeLoading(false);
          setLoading(false);
        });
      })
      .catch(() => {
        startTransition(() => {
          setError("Failed to load dashboard");
          setLoading(false);
          setMaizeLoading(false);
        });
      });
  }, []);

  if (loading) {
    return (
      <div className="page-content">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-teal" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <PageHeader title="Overview" subtitle="Your engagement summary" />
        <div className="pm-dash-card p-6">
          <div className="flex items-center gap-3 text-red">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <div className="font-display text-[14px] font-semibold">Unable to load dashboard</div>
              <div className="text-[12px] text-gray-4 mt-1">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content portal-page">
      {/* ── Welcome strip (dynamic context) ─────────────── */}
      <div className="pm-dash-welcome">
        <div>
          <h2>{getGreeting(client)}</h2>
          <p>{getSubtitle(client, kpis)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Sun size={18} className="text-yellow" />
          <span className="user-avatar">
            {client?.name?.charAt(0)?.toUpperCase() || "?"}
          </span>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────── */}
      <div className="pm-dash-krow pm-dash-krow-4">
        <div className="pm-dash-kcard">
          <div className="pm-dash-kn">{kpis?.activeProjects ?? 0}</div>
          <div className="pm-dash-kl">Active Projects</div>
          <div className="pm-dash-ksub">{kpis?.totalProjects ?? 0} total</div>
        </div>
        <div className="pm-dash-kcard grn">
          <div className="pm-dash-kn grn">{kpis?.pendingDeliverables ?? 0}</div>
          <div className="pm-dash-kl">Deliverables</div>
          <div className="pm-dash-ksub">ready for review</div>
        </div>
        <div className="pm-dash-kcard red">
          <div className="pm-dash-kn red">{formatCurrency(kpis?.outstandingAmount ?? 0)}</div>
          <div className="pm-dash-kl">Outstanding</div>
          <div className="pm-dash-ksub">{kpis?.overdueInvoices ?? 0} overdue</div>
        </div>
        <div className="pm-dash-kcard blu">
          <div className="pm-dash-kn blu">{kpis?.openConversations ?? 0}</div>
          <div className="pm-dash-kl">Messages</div>
          <div className="pm-dash-ksub">{kpis?.openConversations ?? 0} open</div>
        </div>
      </div>

      {/* ── Overdue alert ──────────────────────────── */}
      {(kpis?.overdueInvoices ?? 0) > 0 && (
        <div className="pm-dash-alert pm-dash-alert-y">
          <AlertTriangle size={14} />
          You have {kpis!.overdueInvoices} overdue invoice{kpis!.overdueInvoices > 1 ? "s" : ""} —{" "}
          <Link href="/portal/invoices" className="underline">view invoices</Link>
        </div>
      )}

      {/* ── Activity Feed ─────────────────────────── */}
      <div className="pm-dash-card mb-6">
        <div className="pm-dash-card-h">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-yellow" />
            <span className="pm-dash-card-t">Recent Activity</span>
          </div>
        </div>
        <div className="pm-dash-card-b">
          {buildActivityFeed(recentProjects, recentInvoices, recentBookings, kpis, activityLog).length === 0 ? (
            <div className="text-[12px] text-gray-4 py-3">No recent activity</div>
          ) : (
            buildActivityFeed(recentProjects, recentInvoices, recentBookings, kpis, activityLog).map((item) => (
              <div key={item.id} className="pm-dash-feed-item">
                <div className={`pm-dash-feed-dot ${
                  item.type === "project" ? "b" :
                  item.type === "invoice" ? (item.status === "overdue" ? "r" : "y") :
                  item.type === "booking" ? "g" :
                  item.type === "milestone" ? "g" : "g"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="pm-dash-feed-text">{item.title}</div>
                  <div className="pm-dash-feed-time">{item.detail}</div>
                </div>
                <span className={`pm-dash-bdg ${statusBadgeClass(item.status)} text-[8px]`}>
                  {item.status.replace(/_/g, " ")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Maize Analytics at a Glance ───────────────── */}
      {!maizeLoading && maizeAnalytics && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-yellow" />
            <span className="font-display text-[14px] font-semibold">Market at a Glance — Maize Flour</span>
          </div>
          <div className="pm-dash-krow pm-dash-krow-4">
            <div className="pm-dash-kcard yel">
              <div className="pm-dash-kn yel">
                {(maizeAnalytics.summary as Record<string, unknown>)?.totalSales
                  ? `KES ${(Number((maizeAnalytics.summary as Record<string, unknown>).totalSales) / 1000000).toFixed(1)}M`
                  : "—"}
              </div>
              <div className="pm-dash-kl">Maize Revenue</div>
              <div className="pm-dash-ksub">{(maizeAnalytics.competitors as Array<Record<string, unknown>>)?.length || 0} suppliers</div>
            </div>
            <div className="pm-dash-kcard grn">
              <div className="pm-dash-kn grn">
                {(maizeAnalytics.competitors as Array<Record<string, unknown>>)
                  ?.find((c) => c.is_client)
                  ? `${Number((maizeAnalytics.competitors as Array<Record<string, unknown>>).find((c) => c.is_client)?.share).toFixed(1)}%`
                  : "—"}
              </div>
              <div className="pm-dash-kl">Your Share</div>
              <div className="pm-dash-ksub">
                Rank #{String((maizeAnalytics.competitors as Array<Record<string, unknown>>)?.find((c) => c.is_client)?.rank || "—")}
              </div>
            </div>
            <div className="pm-dash-kcard blu">
              <div className="pm-dash-kn blu">{String((maizeAnalytics.summary as Record<string, unknown>)?.totalProducts || "—")}</div>
              <div className="pm-dash-kl">Maize Products</div>
              <div className="pm-dash-ksub">{(maizeAnalytics.branches as Array<Record<string, unknown>>)?.length || 0} branches</div>
            </div>
            <div className="pm-dash-kcard red">
              <div className="pm-dash-kn red">
                {(maizeAnalytics.summary as Record<string, unknown>)?.avgMargin
                  ? `${Number((maizeAnalytics.summary as Record<string, unknown>).avgMargin).toFixed(1)}%`
                  : "—"}
              </div>
              <div className="pm-dash-kl">Avg Margin</div>
              <div className="pm-dash-ksub">Maize flour category</div>
            </div>
          </div>
          {/* Maize competitor leaderboard (mini) */}
          {(maizeAnalytics.competitors as Array<Record<string, unknown>>)?.length > 0 && (
            <div className="mt-3 pm-dash-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-gray-3">Maize Supplier Rankings</span>
                <Link href="/portal/analytics" className="text-[10px] text-teal hover:underline">
                  Full analytics →
                </Link>
              </div>
              <div className="space-y-2">
                {(maizeAnalytics.competitors as Array<Record<string, unknown>>).slice(0, 5).map((comp, i) => (
                  <div key={String(comp.supplier || i)} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-5 w-4 shrink-0">{comp.rank as number}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-[11px] ${comp.is_client ? "text-yellow font-semibold" : "text-gray-4"}`}>
                          {competitorLabel(String(comp.supplier), Boolean(comp.is_client), Number(comp.rank))}
                          {comp.is_client ? <span className="ml-1 text-[9px] text-yellow">(you)</span> : ""}
                        </span>
                        <span className="text-[10px] text-gray-5">
                          KES {(Number(comp.total_sales) / 1000000).toFixed(1)}M · {Number(comp.share).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded bg-[var(--ws-border,#e5e5e5)] overflow-hidden">
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${Math.min(100, (Number(comp.total_sales) / Math.max(...(maizeAnalytics.competitors as Array<Record<string, unknown>>).map((c) => Number(c.total_sales)))) * 100)}%`,
                            background: comp.is_client ? "#F4C300" : ["#F4C300", "#BBBBBB", "#F97316", "#3B82F6", "#A855F7"][i % 5],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Two-column layout ──────────────────────── */}
      <div className="grid grid-cols-3 gap-6">
        {/* ══════════ LEFT (2/3) ════════════ */}
        <div className="col-span-2 space-y-4">
          {/* ── Recent projects ────────────────── */}
          {recentProjects.length > 0 && recentProjects.map((project) => (
            <div key={project.id} className="pm-dash-proj-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="pm-dash-proj-name">{project.name}</div>
                  <div className="pm-dash-proj-type">
                    {project.type.replace(/_/g, " ")}
                    {project.end_date && (
                      <> · Due {new Date(project.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>
                    )}
                  </div>
                </div>
                <span className={`pm-dash-bdg ${statusBadgeClass(project.status)}`}>
                  {project.status.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
              <div className="pm-dash-prog-wrap">
                <div className="pm-dash-prog-track">
                  <div className="pm-dash-prog-fill" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="pm-dash-prog-lbl">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
              </div>
            </div>
          ))}

          {recentProjects.length === 0 && (
            <div className="pm-dash-card p-6 text-center">
              <div className="text-[12px] text-gray-4">No projects yet</div>
            </div>
          )}

          {/* ── Research Findings Cards ──────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-yellow" />
                <span className="pm-dash-card-t">Research Insights</span>
              </div>
            </div>
            <div className="pm-dash-card-b">
              <ResearchFindingsCards clientId={client?.id} />
            </div>
          </div>

          {/* ── Milestone Timeline ──────────────── */}
          {recentProjects.length > 0 && (
            <div className="pm-dash-card">
              <div className="pm-dash-card-h">
                <div className="flex items-center gap-2">
                  <Milestone size={14} className="text-yellow" />
                  <span className="pm-dash-card-t">Project Milestones</span>
                </div>
                <Link href="/portal/projects" className="text-[10px] text-teal hover:underline">
                  View all →
                </Link>
              </div>
              <div className="pm-dash-card-b">
                <MilestoneTimeline projectId={recentProjects[0]?.id} />
              </div>
            </div>
          )}

          {/* ── Documents ──────────────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-yellow" />
                <span className="pm-dash-card-t">Documents</span>
              </div>
            </div>
            <div className="pm-dash-card-b">
              <DocumentList clientId={client?.id} />
            </div>
          </div>
        </div>

        {/* ══════════ RIGHT (1/3) ════════════ */}
        <div className="space-y-4">
          {/* ── Recent invoices ────────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-yellow" />
                <span className="pm-dash-card-t">Invoices</span>
              </div>
              {recentInvoices.length > 0 && (
                <Link href="/portal/invoices" className="text-[10px] text-teal hover:underline">
                  View all →
                </Link>
              )}
            </div>
            <div className="pm-dash-card-b">
              {recentInvoices.length === 0 ? (
                <div className="text-[12px] text-gray-4 py-3">No outstanding invoices</div>
              ) : (
                recentInvoices.map((inv) => (
                  <div key={inv.id} className="pm-dash-inv-row flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-[12px] font-semibold">{inv.invoice_number}</div>
                      {inv.due_date && (
                        <div className="text-[10px] text-gray-4 font-mono">
                          Due {new Date(inv.due_date).toLocaleDateString("en-GB")}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-display font-bold text-teal">
                        {formatCurrency(inv.amount)}
                      </div>
                      <div className={`text-[9px] uppercase font-mono ${
                        inv.status === "overdue" ? "text-red" : "text-gray-4"
                      }`}>
                        {inv.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Active bookings ────────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-yellow" />
                <span className="pm-dash-card-t">Bookings</span>
              </div>
              {recentBookings.length > 0 && (
                <Link href="/portal/bookings" className="text-[10px] text-teal hover:underline">
                  View all →
                </Link>
              )}
            </div>
            <div className="pm-dash-card-b">
              {recentBookings.length === 0 ? (
                <div className="text-[12px] text-gray-4 py-3">No active bookings</div>
              ) : (
                recentBookings.map((b) => (
                  <div key={b.id} className="pm-dash-inv-row flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-[12px] font-semibold">{b.inventory?.name || "Booking"}</div>
                      <div className="text-[10px] text-gray-4">
                        {new Date(b.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} —{" "}
                        {new Date(b.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <span className={`pm-dash-bdg ${statusBadgeClass(b.status)}`}>
                      {b.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Quick links ────────────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <div className="flex items-center gap-2">
                <User size={14} className="text-yellow" />
                <span className="pm-dash-card-t">Quick Links</span>
              </div>
            </div>
            <div className="pm-dash-card-b space-y-1">
              <Link href="/portal/projects" className="flex items-center gap-2 py-2 text-[12px] hover:text-teal transition-colors">
                <ArrowRight size={12} /> View all projects
              </Link>
              <Link href="/portal/deliverables" className="flex items-center gap-2 py-2 text-[12px] hover:text-teal transition-colors">
                <ArrowRight size={12} /> View deliverables
              </Link>
              <Link href="/portal/messages" className="flex items-center gap-2 py-2 text-[12px] hover:text-teal transition-colors">
                <ArrowRight size={12} /> Messages
              </Link>
              <Link href="/portal/settings" className="flex items-center gap-2 py-2 text-[12px] hover:text-teal transition-colors">
                <ArrowRight size={12} /> Account settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
