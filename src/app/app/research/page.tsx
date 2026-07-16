"use client";

import React, { useState, useRef, useEffect, startTransition } from "react";
import { Plus, Download, Upload, Loader2 } from "lucide-react";
import NewResearchModal from "@/components/modals/new-research-modal";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import { downloadCSV } from "@/lib/export-utils";
import Pagination, { usePagination } from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/browser";

// ── DB row types ──────────────────────────────────────
interface DbResearchProject {
  id: string;
  client_id: string | null;
  project_id: string | null;
  type: string | null;
  status: string | null;
  progress: number | null;
  value: number | null;
  due_date: string | null;
  survey_responses: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string } | null;
  projects?: { name: string } | null;
}

interface DbReport {
  id: string;
  project_id: string;
  client_id: string | null;
  title: string;
  type: string | null;
  content: string | null;
  visible_to_client: boolean;
  created_at: string;
  metrics?: DbReportMetric[] | null;
}

interface DbReportMetric {
  id: string;
  report_id: string;
  label: string;
  value: string | null;
  created_at: string;
}

// ── Derived view types ────────────────────────────────
interface ResearchView {
  id: string;
  title: string;
  client: string;
  type: string;
  status: "active" | "review" | "draft" | "completed" | string;
  progress: number;
  progressLabel: string;
  value: number | null;
  dueDate: string | null;
  surveyResponses: number;
  createdAt: string;
  reports: ReportView[];
  metadata: Record<string, unknown> | null;
}

interface ReportView {
  id: string;
  title: string;
  type: string | null;
  visible: boolean;
  metrics: { label: string; value: string }[];
  createdAt: string;
}

function toResearchView(row: DbResearchProject): ResearchView {
  const meta = (row.metadata || {}) as Record<string, unknown>;
  const title = (meta.title as string) || `${row.type || "Research"} Project`;
  const progress = row.progress ?? 0;
  let progressLabel = `${progress}% complete`;
  if (progress === 0) progressLabel = "Not started";
  else if (progress >= 100) progressLabel = "Complete";

  return {
    id: row.id,
    title,
    client: row.clients?.name || "—",
    type: row.type || "General",
    status: row.status || "draft",
    progress,
    progressLabel,
    value: row.value,
    dueDate: row.due_date,
    surveyResponses: row.survey_responses ?? 0,
    createdAt: row.created_at,
    reports: (row as unknown as { reports?: DbReport[] }).reports?.map(toReportView) || [],
    metadata: row.metadata,
  };
}

function toReportView(row: DbReport): ReportView {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    visible: row.visible_to_client,
    metrics: row.metrics?.map((m) => ({ label: m.label, value: m.value || "—" })) || [],
    createdAt: row.created_at,
  };
}

const typeFilters = [
  "All",
  "Market Research",
  "Competitor Analysis",
  "Consumer Insights",
  "Trend Analysis",
  "Site Analysis",
  "Market Sizing",
];

function statusBadgeClass(status: string | null): string {
  if (!status) return "pm-dash-bdg-n";
  const s = status.toLowerCase();
  if (s === "completed" || s === "active" || s === "paid") return "pm-dash-bdg-g";
  if (s === "in_progress" || s === "in progress" || s === "review" || s === "pending") return "pm-dash-bdg-y";
  if (s === "upcoming" || s === "draft") return "pm-dash-bdg-b";
  if (s === "cancelled" || s === "archived") return "pm-dash-bdg-n";
  return "pm-dash-bdg-b";
}

function statusLabel(status: string | null): string {
  if (!status) return "DRAFT";
  const s = status.toLowerCase();
  if (s === "active" || s === "in_progress" || s === "in progress") return "IN PROGRESS";
  if (s === "review" || s === "pending") return "PENDING REVIEW";
  return status.toUpperCase();
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

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  const num = amount ?? 0;
  if (num >= 1_000_000) return `KES ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `KES ${(num / 1_000).toFixed(0)}K`;
  return `KES ${amount.toLocaleString()}`;
}

// ── Page Component ────────────────────────────────────
export default function ResearchPage() {
  const [search, setSearch] = useState("");
  const [showNewResearch, setShowNewResearch] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const importRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<ResearchView[]>([]);
  const [loading, setLoading] = useState(true);

  // Active tab within detail panel: "overview" | "reports" | "insights"
  const [detailTab, setDetailTab] = useState<"overview" | "reports" | "insights">("overview");

  // ── Fetch research projects from Supabase ──────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const supabase = createClient();

        const { data, error } = await supabase
          .from("research_projects")
          .select("*, clients(name), projects(name)")
          .order("created_at", { ascending: false });

        if (cancelled) return;
        if (error) {
          console.error("Failed to fetch research projects:", error);
          setProjects([]);
          setLoading(false);
          return;
        }

        const rows = (data || []) as unknown as DbResearchProject[];
        setProjects(rows.map(toResearchView));
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to fetch research projects:", e);
          setProjects([]);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Fetch reports when a project is selected ───────
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("reports")
          .select("*, metrics:report_metrics(*)")
          .eq("project_id", selectedId)
          .order("created_at", { ascending: false });

        if (cancelled || !data) return;

        const reportRows = data as unknown as DbReport[];
        setProjects((prev) =>
          prev.map((p) =>
            p.id === selectedId
              ? { ...p, reports: reportRows.map(toReportView) }
              : p
          )
        );
      } catch {
        // Reports fetch is optional — don't break the page
      }
    })();

    return () => { cancelled = true; };
  }, [selectedId]);

  // ── Filtering & search ─────────────────────────────
  const filtered = projects.filter((p) => {
    if (activeFilter !== "All" && p.type !== activeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const { paginated, total } = usePagination(filtered, page, 20);

  useEffect(() => {
    startTransition(() => { setPage(1); });
  }, [activeFilter, search]);

  const selected = projects.find((p) => p.id === selectedId) || null;

  // Report visibility toggled locally
  const [reportsVisibility, setReportsVisibility] = useState<Record<string, boolean>>({});

  const toggleVisibility = (reportId: string) => {
    setReportsVisibility((prev) => ({
      ...prev,
      [reportId]: !prev[reportId],
    }));
  };

  const isVisible = (report: ReportView) =>
    reportsVisibility[report.id] ?? report.visible;

  // ── Computed stats ─────────────────────────────────
  const activeCount = projects.filter((p) => p.status === "active" || p.status === "in_progress").length;
  const reviewCount = projects.filter((p) => p.status === "review" || p.status === "pending").length;
  // totalValue and totalResponses removed — unused variables

  return (
    <div className="flex h-full">
      {/* ── LEFT PANEL: Research List ─────────────────── */}
      <div className="w-[420px] border-r border-[#1E1E1E] bg-black flex flex-col flex-shrink-0">
        <PageHeader
          title="Research & Data"
          subtitle={`${activeCount} active · ${reviewCount} pending review`}
          actions={
            <>
              <input
                ref={importRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    alert(`Import triggered for: ${file.name}`);
                    e.target.value = "";
                  }
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => importRef.current?.click()}
              >
                <Upload size={12} className="mr-1" /> Import
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const rows = projects.map((p) => [
                    p.title, p.client, p.type, p.status, `${p.progress}%`, p.progressLabel,
                  ]);
                  downloadCSV(
                    ["Title", "Client", "Type", "Status", "Progress", "Progress Label"],
                    rows,
                    "research-projects",
                  );
                }}
              >
                <Download size={12} className="mr-1" /> Export
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowNewResearch(true)}>
                <Plus size={12} className="mr-1" /> New Research
              </Button>
            </>
          }
        />
        <div className="px-4 py-3 border-b border-[#1E1E1E]">
          <SearchBox
            placeholder="Search research..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <div className="px-4 py-2.5 border-b border-[#1E1E1E] flex gap-1.5 flex-wrap">
          {typeFilters.map((f) => (
            <FilterPill
              key={f}
              active={activeFilter === f}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </FilterPill>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={20} className="animate-spin text-yellow" />
              <span className="text-[13px] text-gray-5">Loading research…</span>
            </div>
          ) : (
            <>
              {paginated.map((project) => {
                const isActive = project.id === selectedId;
                return (
                  <div
                    key={project.id}
                    onClick={() => {
                      setSelectedId(project.id);
                      setDetailTab("overview");
                    }}
                    className={`bg-black-2 border rounded-lg p-4 cursor-pointer transition-all ${
                      isActive
                        ? "border-yellow ring-1 ring-yellow/20"
                        : "border-[#252525] hover:border-[#3A3A3A]"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-[13px] font-semibold leading-snug text-white">
                          {project.title}
                        </div>
                        <div className="text-[10px] text-gray-5 mt-0.5">
                          {project.client}
                        </div>
                      </div>
                      <span className={`pm-dash-bdg ${statusBadgeClass(project.status)}`}>
                        {statusLabel(project.status)}
                      </span>
                    </div>

                    {/* Type tag */}
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      <span className="font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border bg-yellow/10 text-yellow border-yellow/20">
                        {project.type}
                      </span>
                      {project.value != null && (
                        <span className="font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border bg-transparent text-gray-5 border-[#2A2A2A]">
                          {formatCurrency(project.value)}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="pm-dash-prog-wrap mb-3">
                      <div className="pm-dash-prog-track">
                        <div
                          className="pm-dash-prog-fill"
                          style={{ width: `${Math.min(project.progress, 100)}%` }}
                        />
                      </div>
                      <div className="pm-dash-prog-lbl flex justify-between">
                        <span>{project.progressLabel}</span>
                        <span>{project.progress}%</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-5">
                        {project.surveyResponses > 0 ? `${project.surveyResponses} responses` : "No responses yet"}
                      </span>
                      <span className="text-gray-4 font-mono">
                        {project.dueDate ? `Due ${formatDate(project.dueDate)}` : "No deadline"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="py-16 text-center text-[13px] text-gray-5">
                  No research projects found.
                </div>
              )}
              <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Research Detail ──────────────── */}
      <div className="flex-1 bg-[#0D0D0D] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={20} className="animate-spin text-yellow" />
            <span className="text-[13px] text-gray-5">Loading…</span>
          </div>
        ) : !selected ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-[13px] text-gray-5">
              {projects.length === 0
                ? "No research projects yet. Create your first project to get started."
                : "Select a project to view details"}
            </span>
          </div>
        ) : (
          <div>
            {/* Detail Header */}
            <div className="px-7 py-5 border-b border-[#1E1E1E] bg-black">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-[18px] font-bold text-white">
                    {selected.title}
                  </h2>
                  <p className="text-[12px] text-gray-4 mt-1">
                    {selected.client} · Started {formatDate(selected.createdAt)}
                    {selected.dueDate && <> · Due {formatDate(selected.dueDate)}</>}
                  </p>
                </div>
                <span className={`pm-dash-bdg ${statusBadgeClass(selected.status)}`}>
                  {statusLabel(selected.status)}
                </span>
              </div>

              {/* Detail tabs */}
              <div className="flex items-center gap-1 mt-4">
                {(["overview", "reports", "insights"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`text-[12px] px-4 py-1.5 border-b-2 transition-colors cursor-pointer ${
                      detailTab === tab
                        ? "text-yellow border-yellow"
                        : "text-gray-4 border-transparent hover:text-white"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-7 py-5 space-y-6">
              {/* ═══════════ OVERVIEW TAB ═══════════ */}
              {detailTab === "overview" && (
                <>
                  {/* KPI Row */}
                  <div className="pm-dash-krow pm-dash-krow-3">
                    <div className="pm-dash-kcard">
                      <div className="pm-dash-kl">Status</div>
                      <div className="pm-dash-kn">
                        <span className={`pm-dash-bdg ${statusBadgeClass(selected.status)}`}>
                          {statusLabel(selected.status)}
                        </span>
                      </div>
                    </div>
                    <div className="pm-dash-kcard grn">
                      <div className="pm-dash-kl">Progress</div>
                      <div className="pm-dash-kn grn">{selected.progress}%</div>
                    </div>
                    <div className="pm-dash-kcard">
                      <div className="pm-dash-kl">Value</div>
                      <div className="pm-dash-kn">{formatCurrency(selected.value)}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="pm-dash-card">
                    <div className="pm-dash-card-h">
                      <span className="pm-dash-card-t text-[14px]">Progress</span>
                      <span className="text-[12px] text-gray-4">{selected.progressLabel}</span>
                    </div>
                    <div className="pm-dash-card-b">
                      <div className="pm-dash-prog-wrap">
                        <div className="pm-dash-prog-track">
                          <div
                            className="pm-dash-prog-fill"
                            style={{ width: `${Math.min(selected.progress, 100)}%` }}
                          />
                        </div>
                        <div className="pm-dash-prog-lbl flex justify-between">
                          <span>{selected.progress}% complete</span>
                          <span>
                            {selected.dueDate
                              ? `Due ${formatDate(selected.dueDate)}`
                              : "No deadline set"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Survey Responses */}
                  {selected.surveyResponses > 0 && (
                    <div className="pm-dash-krow pm-dash-krow-2">
                      <div className="pm-dash-kcard">
                        <div className="pm-dash-kl">Survey Responses</div>
                        <div className="pm-dash-kn">{selected.surveyResponses.toLocaleString()}</div>
                      </div>
                      <div className="pm-dash-kcard">
                        <div className="pm-dash-kl">Project Value</div>
                        <div className="pm-dash-kn">{formatCurrency(selected.value)}</div>
                      </div>
                    </div>
                  )}

                  {/* Summary from metadata */}
                  {selected.metadata && (selected.metadata as Record<string, unknown>).summary && (
                    <div className="pm-dash-card">
                      <div className="pm-dash-card-h">
                        <span className="pm-dash-card-t text-[14px]">Summary</span>
                      </div>
                      <div className="pm-dash-card-b">
                        <p className="text-[12px] text-gray-3 leading-relaxed">
                          {String((selected.metadata as Record<string, unknown>).summary)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ═══════════ REPORTS TAB ═══════════ */}
              {detailTab === "reports" && (
                <>
                  {selected.reports.length === 0 ? (
                    <div className="pm-dash-card">
                      <div className="pm-dash-card-b">
                        <div className="py-8 text-center text-[13px] text-gray-5">
                          No reports generated for this project yet.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selected.reports.map((report) => {
                        const visible = isVisible(report);
                        return (
                          <div
                            key={report.id}
                            className="pm-dash-card"
                          >
                            <div className="pm-dash-card-h">
                              <div className="flex-1 min-w-0">
                                <span className="pm-dash-card-t text-[13px]">{report.title}</span>
                                {report.type && (
                                  <span className="ml-2 font-mono text-[10px] text-gray-5 uppercase">
                                    {report.type}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-5">{formatDate(report.createdAt)}</span>
                                <button
                                  onClick={() => toggleVisibility(report.id)}
                                  className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                                    visible
                                      ? "bg-green/10 text-green border-green/20"
                                      : "bg-transparent text-gray-5 border-[#2A2A2A] hover:text-gray-3"
                                  }`}
                                >
                                  {visible ? "Client visible" : "Hidden"}
                                </button>
                              </div>
                            </div>
                            {report.metrics && report.metrics.length > 0 && (
                              <div className="pm-dash-card-b">
                                <div className="grid grid-cols-3 gap-4">
                                  {report.metrics.map((m, i) => (
                                    <div key={i}>
                                      <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
                                        {m.label}
                                      </div>
                                      <div className="text-[14px] font-display font-bold text-white mt-0.5">
                                        {m.value}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ═══════════ INSIGHTS TAB ═══════════ */}
              {detailTab === "insights" && (
                <>
                  {/* Key info table */}
                  <div className="pm-dash-card">
                    <div className="pm-dash-card-h">
                      <span className="pm-dash-card-t text-[14px]">Project Details</span>
                    </div>
                    <div className="pm-dash-card-b-0">
                      <table className="pm-dash-tbl w-full">
                        <thead>
                          <tr>
                            <th className="pm-dash-tbl-th">Field</th>
                            <th className="pm-dash-tbl-th">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="pm-dash-tbl-td">Client</td>
                            <td className="pm-dash-tbl-td text-white">{selected.client}</td>
                          </tr>
                          <tr>
                            <td className="pm-dash-tbl-td">Type</td>
                            <td className="pm-dash-tbl-td text-white">{selected.type}</td>
                          </tr>
                          <tr>
                            <td className="pm-dash-tbl-td">Status</td>
                            <td className="pm-dash-tbl-td">
                              <span className={`pm-dash-bdg ${statusBadgeClass(selected.status)}`}>
                                {statusLabel(selected.status)}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="pm-dash-tbl-td">Value</td>
                            <td className="pm-dash-tbl-td text-yellow font-semibold">
                              {formatCurrency(selected.value)}
                            </td>
                          </tr>
                          <tr>
                            <td className="pm-dash-tbl-td">Survey Responses</td>
                            <td className="pm-dash-tbl-td text-white">
                              {selected.surveyResponses.toLocaleString()}
                            </td>
                          </tr>
                          <tr>
                            <td className="pm-dash-tbl-td">Created</td>
                            <td className="pm-dash-tbl-td">{formatDate(selected.createdAt)}</td>
                          </tr>
                          <tr>
                            <td className="pm-dash-tbl-td">Due Date</td>
                            <td className="pm-dash-tbl-td">{formatDate(selected.dueDate)}</td>
                          </tr>
                          <tr>
                            <td className="pm-dash-tbl-td">Progress</td>
                            <td className="pm-dash-tbl-td">
                              <div className="pm-dash-prog-wrap" style={{ marginBottom: 0 }}>
                                <div className="pm-dash-prog-track">
                                  <div
                                    className="pm-dash-prog-fill"
                                    style={{ width: `${Math.min(selected.progress, 100)}%` }}
                                  />
                                </div>
                                <span className="pm-dash-prog-lbl">{selected.progress}%</span>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Findings from metadata */}
                  {selected.metadata && (selected.metadata as Record<string, unknown>).findings && (
                    <div className="pm-dash-card">
                      <div className="pm-dash-card-h">
                        <span className="pm-dash-card-t text-[14px]">Findings</span>
                      </div>
                      <div className="pm-dash-card-b">
                        <p className="text-[12px] text-gray-3 leading-relaxed">
                          {String((selected.metadata as Record<string, unknown>).findings)}
                        </p>
                      </div>
                    </div>
                  )}

                  {selected.metadata && (selected.metadata as Record<string, unknown>).sources && (
                    <div className="pm-dash-card">
                      <div className="pm-dash-card-h">
                        <span className="pm-dash-card-t text-[14px]">Sources</span>
                      </div>
                      <div className="pm-dash-card-b">
                        <ul className="list-disc list-inside space-y-1">
                          {((selected.metadata as Record<string, unknown>).sources as string[]).map(
                            (src, i) => (
                              <li key={i} className="text-[12px] text-gray-3">
                                {src}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <NewResearchModal
        open={showNewResearch}
        onClose={() => setShowNewResearch(false)}
      />
    </div>
  );
}
