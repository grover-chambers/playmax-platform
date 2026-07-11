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
import { useDashboardStats } from "@/hooks/useDashboardData";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [showNewLead, setShowNewLead] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewEngagement, setShowNewEngagement] = useState(false);
  const { stats, loading } = useDashboardStats();

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
      <div className="p-6">
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
            <div className="pm-dash-kn">{loading ? "..." : `KES ${(stats.pipelineValue / 1000000).toFixed(1)}M`}</div>
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
            <div className="pm-dash-kn blu">{loading ? "..." : `KES ${(stats.collectedThisMonth / 1000).toFixed(0)}K`}</div>
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
            {/* ── Card: Pipeline health ────────────────── */}
            <div className="pm-dash-card">
              <div className="pm-dash-card-h">
                <span className="pm-dash-card-t">Pipeline health</span>
                <span className="pm-dash-bdg pm-dash-bdg-y">24 leads</span>
              </div>
              <div className="pm-dash-card-b">
                {/* New */}
                <div className="pm-dash-pipe-row">
                  <span className="pm-dash-pipe-stage">New</span>
                  <div className="pm-dash-pipe-bar-track">
                    <div
                      className="pm-dash-pipe-bar-fill"
                      style={{ width: "60%", background: "var(--pm-blue)" }}
                    />
                  </div>
                  <span className="pm-dash-pipe-count">12</span>
                  <span className="pm-dash-pipe-val">60%</span>
                </div>
                {/* Contacted */}
                <div className="pm-dash-pipe-row">
                  <span className="pm-dash-pipe-stage">Contacted</span>
                  <div className="pm-dash-pipe-bar-track">
                    <div
                      className="pm-dash-pipe-bar-fill"
                      style={{ width: "75%", background: "var(--pm-yellow)" }}
                    />
                  </div>
                  <span className="pm-dash-pipe-count">9</span>
                  <span className="pm-dash-pipe-val">75%</span>
                </div>
                {/* Qualified */}
                <div className="pm-dash-pipe-row">
                  <span className="pm-dash-pipe-stage">Qualified</span>
                  <div className="pm-dash-pipe-bar-track">
                    <div
                      className="pm-dash-pipe-bar-fill"
                      style={{ width: "50%", background: "var(--pm-yellow)" }}
                    />
                  </div>
                  <span className="pm-dash-pipe-count">6</span>
                  <span className="pm-dash-pipe-val">50%</span>
                </div>
                {/* Stale >10d */}
                <div className="pm-dash-pipe-row">
                  <span className="pm-dash-pipe-stage">Stale &gt;10d</span>
                  <div className="pm-dash-pipe-bar-track">
                    <div
                      className="pm-dash-pipe-bar-fill"
                      style={{ width: "30%", background: "var(--pm-red)" }}
                    />
                  </div>
                  <span className="pm-dash-pipe-count">4</span>
                  <span className="pm-dash-pipe-val">30%</span>
                </div>
                {/* Won this mo. */}
                <div className="pm-dash-pipe-row">
                  <span className="pm-dash-pipe-stage">Won this mo.</span>
                  <div className="pm-dash-pipe-bar-track">
                    <div
                      className="pm-dash-pipe-bar-fill"
                      style={{ width: "25%", background: "var(--pm-green)" }}
                    />
                  </div>
                  <span className="pm-dash-pipe-count">3</span>
                  <span className="pm-dash-pipe-val">25%</span>
                </div>
              </div>
            </div>

            {/* ── Card: Team workload ──────────────────── */}
            <div className="pm-dash-card">
              <div className="pm-dash-card-h">
                <span className="pm-dash-card-t">Team workload</span>
                <button
                  className="btn-sm"
                  onClick={() => router.push("/app/admin/staff")}
                >
                  Manage staff
                </button>
              </div>
              <div className="pm-dash-card-b">
                {/* Alex M. */}
                <div className="pm-dash-staff-row">
                  <div
                    className="user-avatar"
                    style={{ background: "#1a3a2a", color: "var(--pm-green)" }}
                  >
                    AM
                  </div>
                  <div className="pm-dash-staff-info">
                    <div className="pm-dash-staff-name">Alex M.</div>
                    <div className="pm-dash-staff-role">Project Manager</div>
                  </div>
                  <div className="pm-dash-staff-stats">
                    <div className="pm-dash-staff-stat">
                      <div className="pm-dash-staff-stat-n">8</div>
                      <div className="pm-dash-staff-stat-l">Leads</div>
                    </div>
                    <div className="pm-dash-staff-stat">
                      <div className="pm-dash-staff-stat-n">12</div>
                      <div className="pm-dash-staff-stat-l">Tasks</div>
                    </div>
                    <div className="pm-dash-staff-stat">
                      <span className="pm-dash-bdg pm-dash-bdg-g">Online</span>
                    </div>
                  </div>
                </div>

                {/* Jordan W. */}
                <div className="pm-dash-staff-row">
                  <div
                    className="user-avatar"
                    style={{ background: "#1a2a3a", color: "var(--pm-blue)" }}
                  >
                    JW
                  </div>
                  <div className="pm-dash-staff-info">
                    <div className="pm-dash-staff-name">Jordan W.</div>
                    <div className="pm-dash-staff-role">CRM Admin</div>
                  </div>
                  <div className="pm-dash-staff-stats">
                    <div className="pm-dash-staff-stat">
                      <div className="pm-dash-staff-stat-n">14</div>
                      <div className="pm-dash-staff-stat-l">Leads</div>
                    </div>
                    <div className="pm-dash-staff-stat">
                      <div className="pm-dash-staff-stat-n">9</div>
                      <div className="pm-dash-staff-stat-l">Tasks</div>
                    </div>
                    <div className="pm-dash-staff-stat">
                      <span className="pm-dash-bdg pm-dash-bdg-y">Away</span>
                    </div>
                  </div>
                </div>

                {/* Riley N. */}
                <div className="pm-dash-staff-row">
                  <div
                    className="user-avatar"
                    style={{ background: "#3a3a1a", color: "var(--pm-yellow)" }}
                  >
                    RN
                  </div>
                  <div className="pm-dash-staff-info">
                    <div className="pm-dash-staff-name">Riley N.</div>
                    <div className="pm-dash-staff-role">Design Lead</div>
                  </div>
                  <div className="pm-dash-staff-stats">
                    <div className="pm-dash-staff-stat">
                      <div className="pm-dash-staff-stat-n">5</div>
                      <div className="pm-dash-staff-stat-l">Leads</div>
                    </div>
                    <div className="pm-dash-staff-stat">
                      <div className="pm-dash-staff-stat-n">18</div>
                      <div className="pm-dash-staff-stat-l">Tasks</div>
                    </div>
                    <div className="pm-dash-staff-stat">
                      <span className="pm-dash-bdg pm-dash-bdg-g">Online</span>
                    </div>
                  </div>
                </div>

                {/* Kai P. */}
                <div className="pm-dash-staff-row">
                  <div
                    className="user-avatar"
                    style={{ background: "#3a1a1a", color: "var(--pm-red)" }}
                  >
                    KP
                  </div>
                  <div className="pm-dash-staff-info">
                    <div className="pm-dash-staff-name">Kai P.</div>
                    <div className="pm-dash-staff-role">Finance</div>
                  </div>
                  <div className="pm-dash-staff-stats">
                    <div className="pm-dash-staff-stat">
                      <div className="pm-dash-staff-stat-n">3</div>
                      <div className="pm-dash-staff-stat-l">Leads</div>
                    </div>
                    <div className="pm-dash-staff-stat">
                      <div className="pm-dash-staff-stat-n">7</div>
                      <div className="pm-dash-staff-stat-l">Tasks</div>
                    </div>
                    <div className="pm-dash-staff-stat">
                      <span className="pm-dash-bdg pm-dash-bdg-n">Offline</span>
                    </div>
                  </div>
                </div>
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

            {/* ── Card: Finance snapshot ────────────────── */}
            <div className="pm-dash-card">
              <div className="pm-dash-card-h">
                <span className="pm-dash-card-t">Finance snapshot</span>
                <button
                  className="btn-sm"
                  onClick={() => router.push("/app/invoices")}
                >
                  View invoices
                </button>
              </div>
              <div className="pm-dash-card-b">
                {/* Mini KPI row */}
                <div className="flex gap-3 mb-4">
                  <div className="pm-dash-mini-kpi flex-1">
                    <div
                      className="pm-dash-mini-kpi-val"
                      style={{ color: "var(--pm-red)" }}
                    >
                      KES 1.2M
                    </div>
                    <div className="pm-dash-mini-kpi-lbl">Outstanding</div>
                  </div>
                  <div className="pm-dash-mini-kpi flex-1">
                    <div
                      className="pm-dash-mini-kpi-val"
                      style={{ color: "var(--pm-green)" }}
                    >
                      KES 780K
                    </div>
                    <div className="pm-dash-mini-kpi-lbl">Collected</div>
                  </div>
                  <div className="pm-dash-mini-kpi flex-1">
                    <div
                      className="pm-dash-mini-kpi-val"
                      style={{ color: "var(--pm-red)" }}
                    >
                      3
                    </div>
                    <div className="pm-dash-mini-kpi-lbl">Overdue</div>
                  </div>
                </div>

                {/* List item 1 — Overdue */}
                <div className="pm-dash-li">
                  <div
                    className="pm-dash-li-dot"
                    style={{ background: "var(--pm-red)" }}
                  />
                  <div className="pm-dash-li-body">
                    <div className="pm-dash-li-title">
                      Invoice #1042 — KES 180,000
                    </div>
                    <div className="pm-dash-li-meta">Due 5 Jul · Overdue</div>
                  </div>
                  <span className="pm-dash-bdg pm-dash-bdg-r">Overdue</span>
                </div>

                {/* List item 2 — Pending */}
                <div className="pm-dash-li">
                  <div
                    className="pm-dash-li-dot"
                    style={{ background: "var(--pm-blue)" }}
                  />
                  <div className="pm-dash-li-body">
                    <div className="pm-dash-li-title">
                      Invoice #1043 — KES 95,000
                    </div>
                    <div className="pm-dash-li-meta">Due 15 Jul · Pending</div>
                  </div>
                  <span className="pm-dash-bdg pm-dash-bdg-b">Pending</span>
                </div>

                {/* List item 3 — Paid */}
                <div className="pm-dash-li">
                  <div
                    className="pm-dash-li-dot"
                    style={{ background: "var(--pm-green)" }}
                  />
                  <div className="pm-dash-li-body">
                    <div className="pm-dash-li-title">
                      Invoice #1044 — KES 32,000
                    </div>
                    <div className="pm-dash-li-meta">Paid 2 Jul</div>
                  </div>
                  <span className="pm-dash-bdg pm-dash-bdg-g">Paid</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
