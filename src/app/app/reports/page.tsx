"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Filter,
  TrendingUp,
  DollarSign,
  Target,
  Users,
  FileText,
  BarChart3,
  Plus,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import FilterPill from "@/components/ui/filter-pill";
import NewReportModal from "@/components/modals/new-report-modal";
import { formatTimeAgo } from "@/lib/utils";
import { downloadCSV } from "@/lib/export-utils";
import Pagination, { usePagination } from "@/components/ui/pagination";

const periodFilters = ["This Month", "This Quarter", "This Year", "Custom"];

interface ReportSummary {
  id: string;
  title: string;
  type: string;
  visible_to_client: boolean;
  created_at: string;
  project_id?: string;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState("This Month");
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewReport, setShowNewReport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const recentActivity = [
    { date: "07 Jul 2026", event: "Invoice paid", client: "Haco Industries", value: "KES 560K", by: "Faith" },
    { date: "06 Jul 2026", event: "Lead won", client: "Twiga Foods", value: "KES 780K", by: "Amina" },
    { date: "05 Jul 2026", event: "Project milestone", client: "Safaricom", value: "—", by: "James" },
    { date: "05 Jul 2026", event: "Research report published", client: "Bidco Africa", value: "—", by: "Christine" },
    { date: "04 Jul 2026", event: "Booking confirmed", client: "P&G EA", value: "KES 255K", by: "System" },
    { date: "03 Jul 2026", event: "New lead", client: "Unga Group", value: "—", by: "Website" },
  ];
  const { paginated, total } = usePagination(recentActivity, page, 20);

  function loadReports() {
    fetch("/api/reports")
      .then((r) => r.json())
      .then(({ data }) => setReports(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div className="page-content">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Org-wide KPIs across all clients, projects, and channels"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowNewReport(true)}>
              <Plus className="w-3.5 h-3.5" />
              New Report
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Period filter */}
      <div className="px-7 py-3 flex items-center gap-3 border-b border-[#1e1e1e]">
        {periodFilters.map((p) => (
          <FilterPill
            key={p}
            active={period === p}
            onClick={() => setPeriod(p)}
          >
            {p}
          </FilterPill>
        ))}
        <div className="ml-auto">
          <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-3.5 h-3.5" />
            More filters
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* ── Row 1: Big KPI cards ── */}
        <div className="pm-dash-krow pm-dash-krow-4">
          {[
            {
              icon: DollarSign,
              label: "Total Revenue (YTD)",
              value: "KES 14.2M",
              change: "+22%",
              up: true,
            },
            {
              icon: Target,
              label: "Pipeline Value",
              value: "KES 4.2M",
              change: "+18%",
              up: true,
            },
            {
              icon: TrendingUp,
              label: "Win Rate",
              value: "68%",
              change: "+5%",
              up: true,
            },
            {
              icon: Users,
              label: "Active Clients",
              value: "10",
              change: "+2",
              up: true,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="pm-dash-kcard"
            >
              <div className="flex items-center gap-2 mb-3">
                <kpi.icon className="w-4 h-4 text-yellow" />
                <span className="text-[11px] text-gray-5">{kpi.label}</span>
              </div>
              <div className="font-display text-[26px] font-bold">
                {kpi.value}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <span
                  className={`text-[11px] font-mono font-bold ${
                    kpi.up ? "text-green" : "text-red"
                  }`}
                >
                  {kpi.change}
                </span>
                <span className="text-[10px] text-gray-5">vs last period</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Row 2: Revenue chart + Breakdown ── */}
        <div className="grid grid-cols-[2fr_1fr] gap-5">
          {/* Revenue chart */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <h3 className="pm-dash-card-t">
                Monthly Revenue (KES)
              </h3>
              <span className="text-[10px] text-gray-5 font-mono">
                {period}
              </span>
            </div>
            <div className="pm-dash-card-b">
              <div className="flex items-end gap-3 h-[200px] pt-2">
                {[
                  { label: "Jan", value: 850000 },
                  { label: "Feb", value: 920000 },
                  { label: "Mar", value: 1100000 },
                  { label: "Apr", value: 780000 },
                  { label: "May", value: 1250000 },
                  { label: "Jun", value: 1420000 },
                ].map((m) => {
                  const maxVal = 1420000;
                  const h = (m.value / maxVal) * 100;
                  return (
                    <div
                      key={m.label}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-[9px] font-mono text-yellow">
                        KES {(m.value / 1000).toFixed(0)}K
                      </span>
                      <div
                        className="w-full rounded-t-sm"
                        style={{
                          height: `${h}%`,
                          background: "var(--pm-yellow)",
                          opacity: 0.8,
                          minHeight: "8px",
                        }}
                      />
                      <span className="text-[9px] font-mono text-gray-5 mt-1">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Revenue by service type */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <h3 className="pm-dash-card-t">Revenue by Type</h3>
            </div>
            <div className="pm-dash-card-b">
              <div className="space-y-4">
                {[
                  { label: "Billboard Rental", pct: 42, value: "KES 5.9M" },
                  { label: "Research & Data", pct: 28, value: "KES 4.0M" },
                  { label: "Brand Campaign", pct: 18, value: "KES 2.5M" },
                  { label: "Consulting", pct: 12, value: "KES 1.7M" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-gray-3">{item.label}</span>
                      <span className="font-mono text-yellow text-[10px]">
                        {item.value}
                      </span>
                    </div>
                    <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.pct}%`,
                          background:
                            item.label === "Billboard Rental"
                              ? "var(--pm-yellow)"
                              : item.label === "Research & Data"
                                ? "var(--pm-blue)"
                                : item.label === "Brand Campaign"
                                  ? "var(--pm-green)"
                                  : "var(--pm-red)",
                        }}
                      />
                    </div>
                    <div className="text-[9px] text-gray-5 font-mono mt-0.5">
                      {item.pct}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 3: Performance metrics ── */}
        <div className="grid grid-cols-3 gap-5">
          {/* Lead conversion funnel */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <h3 className="pm-dash-card-t">Lead Funnel</h3>
            </div>
            <div className="pm-dash-card-b">
              {[
                { stage: "New Leads", count: 42, pct: 100 },
                { stage: "Contacted", count: 31, pct: 74 },
                { stage: "Qualified", count: 18, pct: 43 },
                { stage: "Proposal Sent", count: 10, pct: 24 },
                { stage: "Won", count: 6, pct: 14 },
              ].map((stage) => (
                <div
                  key={stage.stage}
                  className="flex items-center gap-3 py-2 border-b border-[#1a1a1a] last:border-b-0"
                >
                  <div className="w-24 text-[11px] text-gray-4">
                    {stage.stage}
                  </div>
                  <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow"
                      style={{ width: `${stage.pct}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-[11px] font-mono text-gray-3">
                    {stage.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top performers */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <h3 className="pm-dash-card-t">Top Performers</h3>
            </div>
            <div className="pm-dash-card-b">
              {[
                {
                  name: "Amina Mwangi",
                  deals: 4,
                  revenue: "KES 1.2M",
                  role: "Account Manager",
                },
                {
                  name: "James Kariuki",
                  deals: 3,
                  revenue: "KES 890K",
                  role: "Account Manager",
                },
                {
                  name: "Christine Kamau",
                  deals: 2,
                  revenue: "KES 560K",
                  role: "Researcher",
                },
                {
                  name: "Faith Opiyo",
                  deals: 1,
                  revenue: "KES 320K",
                  role: "Finance",
                },
              ].map((p) => (
                <div
                  key={p.name}
                  className="flex items-center gap-3 py-2.5 border-b border-[#1a1a1a] last:border-b-0"
                >
                  <div className="w-8 h-8 rounded-full bg-yellow/10 flex items-center justify-center text-[10px] font-bold text-yellow">
                    {p.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium">{p.name}</div>
                    <div className="text-[10px] text-gray-5">{p.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-mono text-yellow">
                      {p.revenue}
                    </div>
                    <div className="text-[10px] text-gray-5">{p.deals} deals</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Channel performance */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <h3 className="pm-dash-card-t">Lead Sources</h3>
            </div>
            <div className="pm-dash-card-b">
              {[
                { source: "Website", pct: 40, color: "var(--pm-yellow)" },
                { source: "WhatsApp", pct: 25, color: "var(--pm-green)" },
                { source: "Referral", pct: 20, color: "var(--pm-blue)" },
                { source: "Walk-in", pct: 10, color: "var(--pm-red)" },
                { source: "Event / Ad", pct: 5, color: "#888" },
              ].map((s) => (
                <div key={s.source} className="mb-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-gray-3">{s.source}</span>
                    <span className="font-mono text-[10px] text-gray-5">
                      {s.pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${s.pct}%`, background: s.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 4: Research Reports ── */}
        <div className="pm-dash-card">
          <div className="pm-dash-card-h">
            <BarChart3 className="w-4 h-4 text-yellow" />
            <h3 className="pm-dash-card-t">Research Reports</h3>
          </div>
          <div className="pm-dash-card-b">
            {loading ? (
              <div className="text-[12px] text-gray-5 py-4">Loading reports…</div>
            ) : reports.length === 0 ? (
              <div className="text-[12px] text-gray-5 py-4">No reports yet.</div>
            ) : (
              <div className="space-y-3">
                {reports.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a] last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-3.5 h-3.5 text-gray-5" />
                      <div>
                        <div className="text-[12px] font-medium">{r.title}</div>
                        <div className="text-[10px] text-gray-5 font-mono">
                          {r.type} &middot; {formatTimeAgo(r.created_at)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        r.visible_to_client
                          ? "bg-green/10 text-green"
                          : "bg-gray-5/10 text-gray-5"
                      }`}
                    >
                      {r.visible_to_client ? "Published" : "Draft"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Row 5: Recent activity table ── */}
        <div className="pm-dash-card">
          <div className="pm-dash-card-h">
            <h3 className="pm-dash-card-t">Recent Activity</h3>
            <Button variant="secondary" size="sm" onClick={() => downloadCSV(["Action", "Entity", "User", "Time"], [], "recent-activity")}>
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          </div>
          <div className="pm-dash-card-b-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-mono text-gray-5 uppercase tracking-wider border-b border-[#1e1e1e]">
                    <th className="text-left py-3 px-5 font-medium">Date</th>
                    <th className="text-left py-3 px-5 font-medium">Event</th>
                    <th className="text-left py-3 px-5 font-medium">
                      Client / Project
                    </th>
                    <th className="text-right py-3 px-5 font-medium">Value</th>
                    <th className="text-right py-3 px-5 font-medium">By</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#1a1a1a] hover:bg-white/[.02]"
                    >
                      <td className="py-3 px-5 text-[11px] text-gray-5 font-mono">
                        {row.date}
                      </td>
                      <td className="py-3 px-5 text-[12px]">{row.event}</td>
                      <td className="py-3 px-5 text-[12px] text-gray-4">
                        {row.client}
                      </td>
                      <td className="py-3 px-5 text-right text-[12px] font-mono text-yellow">
                        {row.value}
                      </td>
                      <td className="py-3 px-5 text-right text-[11px] text-gray-5">
                        {row.by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>

      <NewReportModal
        key={String(showNewReport)}
        open={showNewReport}
        onClose={() => setShowNewReport(false)}
        onCreated={loadReports}
      />
    </div>
  );
}
