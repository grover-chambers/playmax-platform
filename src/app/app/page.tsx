"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Plus,
  UserPlus,
  FolderPlus,
  FileText,
  UserCheck,
  BarChart3,
  TrendingUp,
  Sun,
  Clock,
  Zap,
  Calendar,
  Globe,
  MessageSquare,
  Upload,
} from "lucide-react";
import Button from "@/components/ui/button";
import NewLeadModal from "@/components/modals/new-lead-modal";
import NewClientModal from "@/components/modals/new-client-modal";
import NewProjectModal from "@/components/modals/new-project-modal";
import NewEngagementModal from "@/components/modals/new-engagement-modal";
import { useDashboardStats, useLeadPipeline, useStaffPerformance, useInvoices } from "@/hooks/useDashboardData";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [showNewLead, setShowNewLead] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewEngagement, setShowNewEngagement] = useState(false);
  const { stats, loading } = useDashboardStats();
  const { pipeline } = useLeadPipeline();
  const { staff } = useStaffPerformance();
  const { invoices } = useInvoices();

  const pipelineTotal = pipeline.reduce((sum, s) => sum + s.leads.length, 0);
  const outstandingInvoices = invoices.filter((i) => i.status === "sent" || i.status === "overdue");
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const collectedTotal = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstandingTotal = outstandingInvoices.reduce((s, i) => s + i.amount, 0);
  const stageColors: Record<string, string> = {
    New: "var(--pm-blue)",
    Contacted: "var(--pm-yellow)",
    Qualified: "var(--pm-yellow)",
    Proposal: "var(--pm-amber)",
    Won: "var(--pm-green)",
  };

  return (
    <>
      <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} />
      <NewClientModal open={showNewClient} onClose={() => setShowNewClient(false)} />
      <NewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} />
      <NewEngagementModal open={showNewEngagement} onClose={() => setShowNewEngagement(false)} />
      {/* ── Welcome strip ──────────────────────────────────── */}
      <div className="pm-dash-welcome">
        <div>
          <h2>
            Good morning, Brayan.{" "}
            <Sun className="inline-block w-5 h-5 text-yellow align-text-bottom" />
          </h2>
          <p>Here&apos;s your command centre overview for today.</p>
        </div>
        <div className="flex gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/app/reports")}
          >
            <Download className="w-3.5 h-3.5" />
            Export report
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowNewClient(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            New client
          </Button>
        </div>
      </div>

      {/* ── Content wrapper ────────────────────────────────── */}
      <div className="page-content">
        {/* ── Quick actions strip ────────────────────────── */}
        <div className="pm-dash-qa-strip">
          <button
            className="pm-dash-qa-btn"
            onClick={() => router.push("/app/admin/staff")}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add staff
          </button>
          <button
            className="pm-dash-qa-btn"
            onClick={() => setShowNewProject(true)}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            New project
          </button>
          <button
            className="pm-dash-qa-btn"
            onClick={() => router.push("/app/invoices")}
          >
            <FileText className="w-3.5 h-3.5" />
            New invoice
          </button>
          <button
            className="pm-dash-qa-btn"
            onClick={() => setShowNewEngagement(true)}
          >
            <Calendar className="w-3.5 h-3.5" />
            Log engagement
          </button>
          <button
            className="pm-dash-qa-btn"
            onClick={() => setShowNewLead(true)}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Assign lead
          </button>
          <button
            className="pm-dash-qa-btn"
            onClick={() => router.push("/app/pipeline")}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Full analytics
          </button>
          <button
            className="pm-dash-qa-btn"
            onClick={() => router.push("/app/research")}
          >
            <Upload className="w-3.5 h-3.5" />
            Import data
          </button>
          <button
            className="pm-dash-qa-btn"
            onClick={() => router.push("/app/content")}
          >
            <Globe className="w-3.5 h-3.5" />
            Website CMS
          </button>
          <button
            className="pm-dash-qa-btn"
            onClick={() => router.push("/app/inbox")}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Inbox
          </button>
        </div>

        {/* ── KPI row (4 columns) ─────────────────────────── */}
        <div className="pm-dash-krow pm-dash-krow-4">
          {/* Card 1 — Pipeline value */}
          <div className="pm-dash-kcard">
            <div className="pm-dash-kn">{loading ? "..." : `KES ${((stats.pipelineValue ?? 0) / 1000000).toFixed(1)}M`}</div>
            <div className="pm-dash-kl">Pipeline value</div>
            <div className="pm-dash-ksub">
              <TrendingUp className="inline-block w-3 h-3 trend-up align-text-bottom" />{" "}
              <span className="trend-up">{stats.totalLeads} total leads</span>
            </div>
          </div>

          {/* Card 2 — Active projects */}
          <div className="pm-dash-kcard">
            <div className="pm-dash-kn">{loading ? "..." : stats.activeProjects}</div>
            <div className="pm-dash-kl">Active projects</div>
            <div className="pm-dash-ksub">
              <Clock className="inline-block w-3 h-3 text-yellow align-text-bottom" />{" "}
              {stats.staleLeads} stale leads need follow-up
            </div>
          </div>

          {/* Card 3 — Collected this month (blue) */}
          <div className="pm-dash-kcard blu">
            <div className="pm-dash-kn blu">{loading ? "..." : `KES ${((stats.collectedThisMonth ?? 0) / 1000).toFixed(0)}K`}</div>
            <div className="pm-dash-kl">Collected this month</div>
            <div className="pm-dash-ksub">
              Target: KES 1.2M{" "}
              <span className="text-[var(--pm-blue)]">· {Math.round((stats.collectedThisMonth / 1200000) * 100)}%</span>
            </div>
          </div>

          {/* Card 4 — New leads today (red) */}
          <div className="pm-dash-kcard red">
            <div className="pm-dash-kn red">{loading ? "..." : stats.newLeadsToday}</div>
            <div className="pm-dash-kl">New leads today</div>
            <div className="pm-dash-ksub">
              {stats.totalLeads} total leads in pipeline
            </div>
          </div>
        </div>

        {/* ── Two-column grid (left 2/3 · right 1/3) ──────── */}
        <div className="grid grid-cols-[2fr_1fr] gap-5">
          {/* ═══════════════ LEFT COLUMN ═══════════════════ */}
          <div className="flex flex-col gap-5">
            {/* ── Card: Pipeline health ── */}
            <div className="pm-dash-card">
              <div className="pm-dash-card-h">
                <span className="pm-dash-card-t">Pipeline health</span>
                <span className="pm-dash-bdg pm-dash-bdg-y">{pipelineTotal} leads</span>
              </div>
              <div className="pm-dash-card-b">
                {pipeline.length === 0 && (
                  <p className="text-[12px] text-gray-5 text-center py-4">No leads yet.</p>
                )}
                {pipeline.map((s) => {
                  const pct = pipelineTotal > 0 ? Math.round((s.leads.length / pipelineTotal) * 100) : 0;
                  const color = stageColors[s.stage] || "var(--pm-yellow)";
                  return (
                    <div key={s.stage} className="pm-dash-pipe-row">
                      <span className="pm-dash-pipe-stage">{s.stage}</span>
                      <div className="pm-dash-pipe-bar-track">
                        <div className="pm-dash-pipe-bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="pm-dash-pipe-count">{s.leads.length}</span>
                      <span className="pm-dash-pipe-val">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Card: Team workload ── */}
            <div className="pm-dash-card">
              <div className="pm-dash-card-h">
                <span className="pm-dash-card-t">Team workload</span>
                <button className="btn-sm" onClick={() => router.push("/app/admin/staff")}>Manage staff</button>
              </div>
              <div className="pm-dash-card-b">
                {staff.length === 0 && (
                  <p className="text-[12px] text-gray-5 text-center py-4">No staff data yet.</p>
                )}
                {staff.slice(0, 5).map((s, i) => {
                  const initials = s.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  const colors = ["#1a3a2a", "#1a2a3a", "#3a3a1a", "#3a1a1a", "#2a1a3a"];
                  const dotColors = ["var(--pm-green)", "var(--pm-blue)", "var(--pm-yellow)", "var(--pm-red)", "var(--pm-purple)"];
                  const statuses = ["Online", "Away", "Online", "Offline", "Online"] as const;
                  const bdgClasses = ["pm-dash-bdg-g", "pm-dash-bdg-y", "pm-dash-bdg-g", "pm-dash-bdg-n", "pm-dash-bdg-g"];
                  return (
                    <div key={s.name} className="pm-dash-staff-row">
                      <div className="user-avatar" style={{ background: colors[i % colors.length], color: dotColors[i % dotColors.length] }}>{initials}</div>
                      <div className="pm-dash-staff-info">
                        <div className="pm-dash-staff-name">{s.name}</div>
                        <div className="pm-dash-staff-role">{s.role}</div>
                      </div>
                      <div className="pm-dash-staff-stats">
                        <div className="pm-dash-staff-stat">
                          <div className="pm-dash-staff-stat-n">{s.leads}</div>
                          <div className="pm-dash-staff-stat-l">Leads</div>
                        </div>
                        <div className="pm-dash-staff-stat">
                          <div className="pm-dash-staff-stat-n">{s.closedValue}</div>
                          <div className="pm-dash-staff-stat-l">Closed</div>
                        </div>
                        <div className="pm-dash-staff-stat">
                          <span className={`pm-dash-bdg ${bdgClasses[i % bdgClasses.length]}`}>{statuses[i % statuses.length]}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ═══════════════ RIGHT COLUMN ════════════════ */}
          <div className="flex flex-col gap-5">
            {/* ── Card: Live activity feed ──────────────── */}
            <div className="pm-dash-card">
              <div className="pm-dash-card-h">
                <span className="pm-dash-card-t">Live activity feed</span>
                <Zap className="w-3.5 h-3.5 text-yellow" />
              </div>
              <div className="pm-dash-card-b-0">
                <div className="px-4">
                  {/* Feed item 1 */}
                  <div className="pm-dash-feed-item">
                    <div className="pm-dash-feed-dot g" />
                    <div className="flex-1 min-w-0">
                      <div className="pm-dash-feed-text">
                        <span className="pm-dash-feed-actor">Sarah K.</span>{" "}
                        qualified a new lead — 15kW solar install
                      </div>
                      <div className="pm-dash-feed-time">2 min ago</div>
                    </div>
                  </div>

                  {/* Feed item 2 */}
                  <div className="pm-dash-feed-item">
                    <div className="pm-dash-feed-dot g" />
                    <div className="flex-1 min-w-0">
                      <div className="pm-dash-feed-text">
                        Invoice{" "}
                        <span className="pm-dash-feed-actor">#1042</span> marked
                        as paid — KES 180,000
                      </div>
                      <div className="pm-dash-feed-time">14 min ago</div>
                    </div>
                  </div>

                  {/* Feed item 3 */}
                  <div className="pm-dash-feed-item">
                    <div className="pm-dash-feed-dot y" />
                    <div className="flex-1 min-w-0">
                      <div className="pm-dash-feed-text">
                        Project{" "}
                        <span className="pm-dash-feed-actor">
                          Hillcrest Estate
                        </span>{" "}
                        reached milestone 3/5
                      </div>
                      <div className="pm-dash-feed-time">32 min ago</div>
                    </div>
                  </div>

                  {/* Feed item 4 */}
                  <div className="pm-dash-feed-item">
                    <div className="pm-dash-feed-dot b" />
                    <div className="flex-1 min-w-0">
                      <div className="pm-dash-feed-text">
                        New staff login detected —{" "}
                        <span className="pm-dash-feed-actor">Jamie L.</span>
                      </div>
                      <div className="pm-dash-feed-time">1 hr ago</div>
                    </div>
                  </div>

                  {/* Feed item 5 */}
                  <div className="pm-dash-feed-item">
                    <div className="pm-dash-feed-dot y" />
                    <div className="flex-1 min-w-0">
                      <div className="pm-dash-feed-text">
                        Lead <span className="pm-dash-feed-actor">#L-023</span>{" "}
                        assigned to James W.
                      </div>
                      <div className="pm-dash-feed-time">2 hr ago</div>
                    </div>
                  </div>

                  {/* Feed item 6 */}
                  <div className="pm-dash-feed-item">
                    <div className="pm-dash-feed-dot g" />
                    <div className="flex-1 min-w-0">
                      <div className="pm-dash-feed-text">
                        Payment received —{" "}
                        <span className="pm-dash-feed-actor">KES 95,000</span>{" "}
                        from Green Valley Ltd
                      </div>
                      <div className="pm-dash-feed-time">3 hr ago</div>
                    </div>
                  </div>

                  {/* Feed item 7 */}
                  <div className="pm-dash-feed-item">
                    <div className="pm-dash-feed-dot r" />
                    <div className="flex-1 min-w-0">
                      <div className="pm-dash-feed-text">
                        Task{" "}
                        <span className="pm-dash-feed-actor">
                          &ldquo;Draft site report&rdquo;
                        </span>{" "}
                        overdue by 2 days
                      </div>
                      <div className="pm-dash-feed-time">5 hr ago</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card: Finance snapshot ── */}
            <div className="pm-dash-card">
              <div className="pm-dash-card-h">
                <span className="pm-dash-card-t">Finance snapshot</span>
                <button className="btn-sm" onClick={() => router.push("/app/invoices")}>View invoices</button>
              </div>
              <div className="pm-dash-card-b">
                <div className="flex gap-3 mb-4">
                  <div className="pm-dash-mini-kpi flex-1">
                    <div className="pm-dash-mini-kpi-val" style={{ color: "var(--pm-red)" }}>KES {(outstandingTotal / 1000).toFixed(0)}K</div>
                    <div className="pm-dash-mini-kpi-lbl">Outstanding</div>
                  </div>
                  <div className="pm-dash-mini-kpi flex-1">
                    <div className="pm-dash-mini-kpi-val" style={{ color: "var(--pm-green)" }}>KES {(collectedTotal / 1000).toFixed(0)}K</div>
                    <div className="pm-dash-mini-kpi-lbl">Collected</div>
                  </div>
                  <div className="pm-dash-mini-kpi flex-1">
                    <div className="pm-dash-mini-kpi-val" style={{ color: "var(--pm-red)" }}>{overdueCount}</div>
                    <div className="pm-dash-mini-kpi-lbl">Overdue</div>
                  </div>
                </div>
                {invoices.length === 0 && (
                  <p className="text-[12px] text-gray-5 text-center py-4">No invoices yet.</p>
                )}
                {invoices.slice(0, 3).map((inv) => {
                  const dotColors: Record<string, string> = { overdue: "var(--pm-red)", sent: "var(--pm-blue)", paid: "var(--pm-green)", draft: "var(--pm-gray-5)" };
                  const bdgClasses: Record<string, string> = { overdue: "pm-dash-bdg-r", sent: "pm-dash-bdg-b", paid: "pm-dash-bdg-g", draft: "pm-dash-bdg-n" };
                  return (
                    <div key={inv.id} className="pm-dash-li">
                      <div className="pm-dash-li-dot" style={{ background: dotColors[inv.status] || "var(--pm-gray-5)" }} />
                      <div className="pm-dash-li-body">
                        <div className="pm-dash-li-title">{inv.number} — KES {(inv.amount / 1000).toFixed(0)}K</div>
                        <div className="pm-dash-li-meta">{inv.client} · Due {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</div>
                      </div>
                      <span className={`pm-dash-bdg ${bdgClasses[inv.status] || "pm-dash-bdg-n"}`}>{inv.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
