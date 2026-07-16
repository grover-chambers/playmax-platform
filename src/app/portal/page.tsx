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
} from "lucide-react";
import { usePortalClient } from "@/components/portal/portal-provider";
import MetricsGrid from "@/components/reports/metrics-grid";
import DocumentList from "@/components/documents/document-list";

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
  type: "project" | "invoice" | "booking" | "deliverable";
  title: string;
  detail: string;
  date: string;
  status: string;
}

function buildActivityFeed(
  projects: Project[],
  invoices: Invoice[],
  bookings: Booking[],
  kpis: KpiData | null,
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
  if (kpis && kpis.pendingDeliverables > 0) {
    items.push({
      id: "deliverables",
      type: "deliverable",
      title: "New deliverables available",
      detail: `${kpis.pendingDeliverables} file${kpis.pendingDeliverables > 1 ? "s" : ""} ready for download`,
      date: new Date().toISOString(),
      status: "available",
    });
  }

  // Sort by most recent first (use creation order as tiebreaker)
  return items.slice(0, 8);
}

function formatCurrency(amount: number | null | undefined): string {
  const num = amount ?? 0;
  if (num >= 1_000_000) return `KES ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `KES ${(num / 1_000).toFixed(0)}K`;
  return `KES ${num.toLocaleString()}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/overview")
      .then((r) => r.json())
      .then((data) => {
        startTransition(() => {
          if (data.error) {
            setError(data.error);
          } else {
            setKpis(data.kpis);
            setRecentProjects(data.recentProjects || []);
            setRecentInvoices(data.recentInvoices || []);
            setRecentBookings(data.recentBookings || []);
          }
          setLoading(false);
        });
      })
      .catch(() => {
        startTransition(() => {
          setError("Failed to load dashboard");
          setLoading(false);
        });
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-teal" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="pm-dash-card p-6">
        <div className="flex items-center gap-3 text-red">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <div className="font-display text-[14px] font-semibold">Unable to load dashboard</div>
            <div className="text-[12px] text-gray-4 mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  const firstName = client?.name?.split(" ")[0] || "there";

  return (
    <div>
      {/* ── Welcome strip ──────────────────────────── */}
      <div className="pm-dash-welcome">
        <div>
          <h2>{getGreeting()}, {firstName}.</h2>
          <p>
            {client?.company
              ? `Here's a summary of your engagements with ${client.company}.`
              : "Here's a summary of your active engagements with PlayMax."}
          </p>
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
          <div className="pm-dash-ksub">available</div>
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
          {buildActivityFeed(recentProjects, recentInvoices, recentBookings, kpis).length === 0 ? (
            <div className="text-[12px] text-gray-4 py-3">No recent activity</div>
          ) : (
            buildActivityFeed(recentProjects, recentInvoices, recentBookings, kpis).map((item) => (
              <div key={item.id} className="pm-dash-feed-item">
                <div className={`pm-dash-feed-dot ${
                  item.type === "project" ? "b" :
                  item.type === "invoice" ? (item.status === "overdue" ? "r" : "y") :
                  item.type === "booking" ? "g" : "g"
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

          {/* ── Research Reports ──────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-yellow" />
                <span className="pm-dash-card-t">Research Insights</span>
              </div>
            </div>
            <div className="pm-dash-card-b">
              <MetricsGrid clientId={client?.id} />
            </div>
          </div>

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
