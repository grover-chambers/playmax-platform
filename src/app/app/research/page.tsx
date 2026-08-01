"use client";

import React, { useState, useRef, useEffect, startTransition } from "react";
import { Plus, Download, Upload, FileText, Loader2, BarChart3, ArrowLeft, Database, TrendingUp, Package, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import NewResearchModal from "@/components/modals/new-research-modal";
import AIReportModal from "@/components/modals/ai-report-modal";
import PublishReportModal from "@/components/modals/publish-report-modal";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import BarChart from "@/components/ui/bar-chart";
import StatusBadge from "@/components/ui/status-badge";
import { downloadCSV } from "@/lib/export-utils";
import Pagination, { usePagination } from "@/components/ui/pagination";
import ResearchChat from "@/components/research/research-chat";

interface ReportItem {
  id: string;
  title: string;
  type: string;
  kind: "raw" | "ai_summary";
  content: string | null;
  storage_url: string | null;
  visible_to_client: boolean;
  created_at: string;
  published: { id: string; visible_to_client: boolean }[];
}

interface ResearchProject {
  id: string;
  client_id: string | null;
  project_id: string | null;
  client_name: string | null;
  project_name: string | null;
  type: string;
  status: "upcoming" | "in_progress" | "completed" | "cancelled";
  progress: number;
  value: number;
  due_date: string | null;
  survey_responses: number;
  metadata: {
    title?: string;
    summary?: string;
    tags?: string[];
    stats?: string;
    progressLabel?: string;
    kpis?: { value: string; label: string }[];
    chartLabel?: string;
    chartItems?: { label: string; value: number; displayValue?: string }[];
    reports?: { name: string; meta: string; visible: boolean; url?: string }[];
  };
  created_at: string;
  updated_at: string;
}

const typeFilters = ["All", "market_research", "competitor_analysis", "consumer_survey", "brand_audit"];

const TYPE_LABELS: Record<string, string> = {
  market_research: "Market Research",
  competitor_analysis: "Competitor Analysis",
  consumer_survey: "Consumer Insights",
  brand_audit: "Brand Audit",
};

const statusVariantMap: Record<string, "active" | "review" | "draft"> = {
  in_progress: "active",
  completed: "review",
  upcoming: "draft",
  cancelled: "draft",
};

export default function ResearchPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNewResearch, setShowNewResearch] = useState(false);
  const [showAIReport, setShowAIReport] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [detailTab, setDetailTab] = useState<"summary" | "analytics">("summary");
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [publishTarget, setPublishTarget] = useState<ReportItem | null>(null);
  const [pendingSummary, setPendingSummary] = useState<string | null>(null);

  const selected = projects.find((p) => p.id === selectedId) || null;
  const activeCount = projects.filter((p) => p.status === "in_progress").length;
  const reviewCount = projects.filter((p) => p.status === "completed").length;

  useEffect(() => {
    fetch("/api/research")
      .then((r) => r.json())
      .then(({ projects: data }) => {
        startTransition(() => {
          setProjects(data || []);
          setLoading(false);
          if (data && data.length > 0) setSelectedId(data[0].id);
        });
      })
      .catch(() => startTransition(() => setLoading(false)));
  }, []);

  const filtered = projects.filter((p) => {
    if (activeFilter !== "All" && p.type !== activeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const title = (p.metadata?.title || "").toLowerCase();
      const client = (p.client_name || "").toLowerCase();
      return title.includes(q) || client.includes(q);
    }
    return true;
  });

  const { paginated, total } = usePagination(filtered, page, 20);
  useEffect(() => { startTransition(() => { setPage(1); }); }, [activeFilter, search]);

  useEffect(() => {
    if (selectedId && detailTab === "analytics") {
      startTransition(() => setAnalyticsLoading(true));
      fetch(`/api/research/${selectedId}/analytics`)
        .then((r) => r.json())
        .then((data) => startTransition(() => { setAnalyticsData(data); setAnalyticsLoading(false); }))
        .catch(() => startTransition(() => { setAnalyticsData(null); setAnalyticsLoading(false); }));
    }
  }, [selectedId, detailTab]);

  useEffect(() => {
    if (!selectedId) return;
    startTransition(() => setReportsLoading(true));
    fetch(`/api/reports?project_id=${selectedId}`)
      .then((r) => r.json())
      .then(({ data }) => startTransition(() => { setReportsList(data || []); setReportsLoading(false); }))
      .catch(() => startTransition(() => { setReportsList([]); setReportsLoading(false); }));
  }, [selectedId]);

  function handlePublished(report: ReportItem, doc: { id: string; name: string }) {
    setPublishSuccess(`Published as "${doc.name}"`);
    setReportsList((prev) =>
      prev.map((r) =>
        r.id === report.id
          ? { ...r, published: [...r.published, { id: doc.id, visible_to_client: false }] }
          : r
      )
    );
    setTimeout(() => setPublishSuccess(null), 3000);
  }

  async function handleGenerateAI() {
    setShowAIReport(true);
  }

  const handleOpenInWorkspace = async () => {
    if (!selected) return;
    if (selected.project_id) {
      router.push(`/workspace/${selected.project_id}`);
    } else {
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: selected.metadata?.title || `Research: ${selected.type.replace(/_/g, " ")}`,
            client_id: selected.client_id,
            type: "market_research",
            status: "active",
            value: selected.value || 0,
            end_date: selected.due_date,
          }),
        });
        const data = await res.json();
        if (data.project) {
          await fetch(`/api/projects/${data.project.id}/research`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ research_id: selected.id }),
          });
          router.push(`/workspace/${data.project.id}`);
        }
      } catch { /* silent */ }
    }
  };

  return (
    <div className="flex h-full">
      {/* ── LEFT PANEL: Research List ─────────────────── */}
      <div className="w-[420px] border-r border-[var(--ws-border)] pm-dash-card pm-dash-card-b-0 flex flex-col flex-shrink-0">
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
              <Button variant="secondary" size="sm" onClick={() => importRef.current?.click()}>
                <Upload size={12} className="mr-1" /> Import
              </Button>
              <Button variant="secondary" size="sm" onClick={() => {
                const rows = filtered.map((p) => [
                  p.metadata?.title || "", p.client_name || "", p.type, p.status,
                  p.metadata?.stats || "", p.metadata?.progressLabel || "",
                ]);
                downloadCSV(["Title", "Client", "Type", "Status", "Stats", "Progress"], rows, "research-projects");
              }}>
                <Download size={12} className="mr-1" /> Export
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowNewResearch(true)}>
                <Plus size={12} className="mr-1" /> New Research
              </Button>
            </>
          }
        />
        <div className="px-4 py-3 border-b border-[var(--ws-border)]">
          <SearchBox placeholder="Search research..." value={search} onChange={setSearch} />
        </div>
        <div className="px-4 py-2.5 border-b border-[var(--ws-border)] flex gap-1.5 flex-wrap">
          {typeFilters.map((f) => (
            <FilterPill key={f} active={activeFilter === f} onClick={() => setActiveFilter(f)}>
              {f === "All" ? "All" : TYPE_LABELS[f] || f}
            </FilterPill>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-5">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : (
            paginated.map((project) => {
              const isActive = project.id === selectedId;
              const title = project.metadata?.title || project.project_name || TYPE_LABELS[project.type] || project.type;
              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedId(project.id)}
                  className={`bg-[var(--ws-surface)] border rounded-lg p-4 cursor-pointer transition-all ${
                    isActive ? "border-[var(--ws-accent)] ring-1 ring-[var(--ws-accent)]/20" : "border-[var(--ws-border)] hover:border-[var(--ws-accent)]/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-[13px] font-semibold leading-snug text-[var(--ws-text)]">
                        {title}
                      </div>
                      <div className="text-[10px] text-gray-5 mt-0.5">
                        {project.client_name || "Unknown client"} · {TYPE_LABELS[project.type] || project.type}
                      </div>
                    </div>
                    <StatusBadge variant={statusVariantMap[project.status] || "draft"}>
                      {project.status === "in_progress" ? "In Progress" : project.status === "completed" ? "Completed" : project.status === "upcoming" ? "Upcoming" : "Cancelled"}
                    </StatusBadge>
                  </div>

                  {project.metadata?.tags && project.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {project.metadata.tags.map((tag, i) => (
                        <span
                          key={tag}
                          className={`font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border ${
                            i === 0
                              ? "bg-[var(--ws-accent)]/10 text-[var(--ws-accent)] border-[var(--ws-accent)]/20"
                              : "bg-transparent text-gray-5 border-[var(--ws-border)]"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {project.metadata?.summary && (
                    <p className="text-[11px] text-gray-4 leading-relaxed mb-3 line-clamp-2">
                      {project.metadata.summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-5">{project.metadata?.stats || `${project.type.replace(/_/g, " ")} · ${project.client_name || ""}`}</span>
                    <span className="text-gray-4 font-mono">{project.metadata?.progressLabel || `${project.progress}%`}</span>
                  </div>
                </div>
              );
            })
          )}
          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center text-[13px] text-gray-5">
              No research projects match your filter.
            </div>
          )}
          <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </div>
      </div>

      {/* ── RIGHT PANEL: Research Detail + AI Chat ─────── */}
      <div className="flex-1 flex flex-col pm-dash-card">
        {selected ? (
          <>
            {/* ── Scrollable detail area ──────────────────── */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-7 py-5 border-b border-[var(--ws-border)] bg-[var(--ws-bg)]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-[18px] font-bold text-[var(--ws-text)]">
                      {selected.metadata?.title || selected.project_name || TYPE_LABELS[selected.type] || selected.type}
                    </h2>
                    <p className="text-[12px] text-gray-4 mt-1">
                      {selected.client_name || "Unknown client"} · Started {new Date(selected.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={handleOpenInWorkspace}>
                      <ArrowLeft size={12} className="mr-1 rotate-90" /> Open in Workspace
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleGenerateAI}>
                      <BarChart3 size={12} className="mr-1" /> Generate AI Report
                    </Button>
                    <StatusBadge variant={statusVariantMap[selected.status] || "draft"}>
                      {selected.status === "in_progress" ? "In Progress" : selected.status === "completed" ? "Completed" : selected.status === "upcoming" ? "Upcoming" : "Cancelled"}
                    </StatusBadge>
                  </div>
                </div>
                {/* Tab bar */}
                <div className="flex gap-1 mt-4 border-b border-[var(--ws-border)] -mb-[1px]">
                  <button
                    onClick={() => setDetailTab("summary")}
                    className={`px-3 py-2 text-[11px] font-medium border-b-2 transition-colors ${
                      detailTab === "summary"
                        ? "border-[var(--ws-accent)] text-[var(--ws-accent)]"
                        : "border-transparent text-gray-4 hover:text-[var(--ws-text)]"
                    }`}
                  >
                    <FileText size={12} className="inline mr-1.5" />
                    Summary
                  </button>
                  <button
                    onClick={() => setDetailTab("analytics")}
                    className={`px-3 py-2 text-[11px] font-medium border-b-2 transition-colors ${
                      detailTab === "analytics"
                        ? "border-[var(--ws-accent)] text-[var(--ws-accent)]"
                        : "border-transparent text-gray-4 hover:text-[var(--ws-text)]"
                    }`}
                  >
                    <BarChart3 size={12} className="inline mr-1.5" />
                    Analytics
                  </button>
                </div>
              </div>

              {/* ═══ SUMMARY TAB ═══════════════════════════════ */}
              {detailTab === "summary" && (
                <div className="px-7 py-5 space-y-6">
                  {selected.metadata?.kpis && selected.metadata.kpis.length > 0 && (
                    <div className="pm-dash-krow grid grid-cols-2 gap-4">
                      {selected.metadata.kpis.map((kpi) => (
                        <div key={kpi.label} className="pm-dash-kcard">
                          <div className="font-display text-[28px] font-bold text-[var(--ws-accent)] leading-none">{kpi.value}</div>
                          <div className="text-[11px] text-gray-4 mt-1.5">{kpi.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selected.metadata?.summary && (
                    <div>
                      <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-2">Summary</h3>
                      <p className="text-[13px] text-gray-4 leading-relaxed">{selected.metadata.summary}</p>
                    </div>
                  )}
                  {selected.metadata?.chartItems && selected.metadata.chartItems.length > 0 && (
                    <div>
                      <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-3">
                        {selected.metadata.chartLabel || "Chart"}
                      </h3>
                      <div className="bg-[var(--ws-bg)] border border-[var(--ws-border)] rounded-lg p-5">
                        <BarChart items={selected.metadata.chartItems} />
                      </div>
                    </div>
                  )}
                  <div className="pm-dash-card pm-dash-card-b">
                    <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-3">
                      Reports &amp; Deliverables
                    </h3>
                    {publishSuccess && (
                      <div className="mb-3 text-[11px] text-green bg-green/5 border border-green/20 rounded-lg px-3 py-2">
                        {publishSuccess}
                      </div>
                    )}
                    <div className="space-y-2">
                      {reportsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-5" />
                        </div>
                      ) : reportsList.length > 0 ? (
                        reportsList.map((report) => {
                          const pub = report.published?.[0];
                          const pubState = !pub
                            ? "none"
                            : pub.visible_to_client
                              ? "visible"
                              : "hidden";
                          return (
                            <div key={report.id} className="flex items-center justify-between pm-dash-card px-4 py-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FileText size={14} className="text-gray-5 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="text-[12px] font-semibold text-[var(--ws-text)] truncate">{report.title}</div>
                                    <span className={`text-[8px] font-mono font-bold px-1.5 py-[2px] rounded-full border ${
                                      report.kind === "ai_summary"
                                        ? "bg-purple/10 text-purple border-purple/20"
                                        : "bg-teal/10 text-teal border-teal/20"
                                    }`}>
                                      {report.kind === "ai_summary" ? "AI" : "Raw"}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-gray-5 mt-0.5">
                                    {new Date(report.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                    {report.storage_url && (
                                      <> · <a href={report.storage_url} target="_blank" rel="noopener noreferrer" className="text-[var(--ws-accent)] hover:underline">View PDF</a></>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {pubState === "none" && (
                                  <button
                                    onClick={() => setPublishTarget(report)}
                                    className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-[var(--ws-accent)]/30 bg-[var(--ws-accent)]/5 text-[var(--ws-accent)] hover:bg-[var(--ws-accent)]/10 transition-colors cursor-pointer"
                                  >
                                    Publish to client
                                  </button>
                                )}
                                {pubState === "hidden" && (
                                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-orange/20 bg-orange/5 text-orange">
                                    Published (hidden)
                                  </span>
                                )}
                                {pubState === "visible" && (
                                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-green/20 bg-green/5 text-green">
                                    Live for client
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[12px] text-gray-5 text-center py-6">
                          No deliverables yet. Generate an AI report to create one.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ ANALYTICS TAB ══════════════════════════════ */}
              {detailTab === "analytics" && (
                <div className="px-7 py-5 space-y-6">
                  {analyticsLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--ws-accent)] mr-2" />
                      <span className="text-[12px] text-gray-5">Loading analytics data...</span>
                    </div>
                  ) : analyticsData?.analytics ? (
                    <>
                      {/* KPI Summary */}
                      <div className="pm-dash-krow grid grid-cols-2 gap-4">
                        <div className="pm-dash-kcard">
                          <div className="font-display text-[28px] font-bold text-teal leading-none">
                            {(analyticsData.analytics as Record<string, unknown[]>).category_analysis?.length || 0}
                          </div>
                          <div className="text-[11px] text-gray-4 mt-1.5">Categories Tracked</div>
                        </div>
                        <div className="pm-dash-kcard">
                          <div className="font-display text-[28px] font-bold text-[var(--ws-accent)] leading-none">
                            {(analyticsData.analytics as Record<string, unknown[]>).competition_matrix?.length || 0}
                          </div>
                          <div className="text-[11px] text-gray-4 mt-1.5">Competitive Pairs</div>
                        </div>
                      </div>

                      {/* Category Performance */}
                      {(analyticsData.analytics as Record<string, unknown[]>).category_analysis?.length > 0 && (
                        <div>
                          <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <TrendingUp size={12} /> Category Performance
                          </h3>
                          <div className="space-y-2">
                            {((analyticsData.analytics as Record<string, unknown[]>).category_analysis as Array<Record<string, unknown>>).slice(0, 10).map((cat, i) => (
                              <div key={String(cat.category || i)} className="flex items-center justify-between text-[12px] px-3 py-2 rounded-lg bg-[var(--ws-bg)] border border-[var(--ws-border)]">
                                <span className="text-gray-4 font-medium">{String(cat.category)}</span>
                                <span className="text-gray-4 font-mono">
                                  KES {Number(cat.total_revenue) >= 1000000
                                    ? `${(Number(cat.total_revenue) / 1000000).toFixed(1)}M`
                                    : `${(Number(cat.total_revenue) / 1000).toFixed(0)}K`}
                                  {' · '}{Number(cat.total_units).toLocaleString()} units
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Supply/Demand Gaps */}
                      {(analyticsData.analytics as Record<string, unknown[]>).supply_demand_gap?.length > 0 && (
                        <div>
                          <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Package size={12} /> Supply &amp; Demand Gaps
                          </h3>
                          <div className="space-y-1.5">
                            {((analyticsData.analytics as Record<string, unknown[]>).supply_demand_gap as Array<Record<string, unknown>>)
                              .filter((g) => g.gap_status !== "BALANCED").slice(0, 8).map((gap, i) => (
                              <div key={i} className={`flex items-center justify-between text-[11px] px-3 py-2 rounded-lg border ${
                                gap.gap_status === "NO_STOCK" || gap.gap_status === "UNDERSUPPLY"
                                  ? "bg-red/5 border-red/20" : "bg-[var(--ws-accent)]/5 border-[var(--ws-accent)]/20"
                              }`}>
                                <div>
                                  <span className="text-gray-4">{String(gap.product_name)}</span>
                                  <span className="text-gray-5 ml-2">@{String(gap.branch_name)}</span>
                                </div>
                                <span className={`font-mono font-bold ${
                                  gap.gap_status === "NO_STOCK" || gap.gap_status === "UNDERSUPPLY" ? "text-red" : "text-[var(--ws-accent)]"
                                }`}>{String(gap.gap_status)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Branch Performance */}
                      {(analyticsData.analytics as Record<string, unknown[]>).branch_analysis?.length > 0 && (
                        <div>
                          <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Store size={12} /> Branch Performance
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {Array.from(new Set(((analyticsData.analytics as Record<string, unknown[]>).branch_analysis as Array<Record<string, unknown>>).map((b) => b.branch_name)))
                              .slice(0, 6).map((branch) => (
                              <div key={String(branch)} className="text-[11px] text-gray-4 px-3 py-2 rounded-lg bg-[var(--ws-bg)] border border-[var(--ws-border)]">
                                <span className="font-medium text-gray-4">{String(branch)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-16 text-[12px] text-gray-5">
                      <Database size={32} className="mx-auto mb-3 text-gray-4" />
                      <p>{(analyticsData as Record<string, string>)?.summary || "No analytics data available for this project."}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── AI Chat panel (fixed bottom) ───────────── */}
            <ResearchChat
              projectId={selectedId}
              onUseAsSummary={(text) => {
                setPendingSummary(text);
                const firstUnpublished = reportsList.find((r) => !r.published?.length);
                if (firstUnpublished) setPublishTarget(firstUnpublished);
              }}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-5 text-[13px]">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              "Select a research project to view details"
            )}
          </div>
        )}
      </div>

      <NewResearchModal
        open={showNewResearch}
        onClose={() => setShowNewResearch(false)}
        onCreated={() => {
          setShowNewResearch(false);
          fetch("/api/research")
            .then((r) => r.json())
            .then(({ projects: data }) => {
              startTransition(() => {
                setProjects(data || []);
                if (data && data.length > 0) setSelectedId(data[0].id);
              });
            });
        }}
      />

      <PublishReportModal
        key={publishTarget?.id ?? "none"}
        open={!!publishTarget}
        report={publishTarget ? { ...publishTarget, content: pendingSummary ?? publishTarget.content } : null}
        onClose={() => { setPublishTarget(null); setPendingSummary(null); }}
        onPublished={(doc) => {
          if (publishTarget) handlePublished(publishTarget, doc);
          setPublishTarget(null);
          setPendingSummary(null);
        }}
      />

      <AIReportModal
        open={showAIReport}
        project={selected}
        onClose={() => setShowAIReport(false)}
        onGenerated={() => {
          setShowAIReport(false);
          fetch("/api/research")
            .then((r) => r.json())
            .then(({ projects: data }) => {
              startTransition(() => setProjects(data || []));
            });
          if (selectedId) {
            fetch(`/api/reports?project_id=${selectedId}`)
              .then((r) => r.json())
              .then(({ data }) => startTransition(() => setReportsList(data || [])));
          }
        }}
      />
    </div>
  );
}
