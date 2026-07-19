"use client";

import React, { useState, useRef, useEffect, startTransition } from "react";
import { Plus, Download, Upload, FileText, Loader2, BarChart3 } from "lucide-react";
import NewResearchModal from "@/components/modals/new-research-modal";
import AIReportModal from "@/components/modals/ai-report-modal";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import BarChart from "@/components/ui/bar-chart";
import StatusBadge from "@/components/ui/status-badge";
import { downloadCSV } from "@/lib/export-utils";
import Pagination, { usePagination } from "@/components/ui/pagination";

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
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNewResearch, setShowNewResearch] = useState(false);
  const [showAIReport, setShowAIReport] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const importRef = useRef<HTMLInputElement>(null);
  const [reportsVisibility, setReportsVisibility] = useState<Record<string, boolean>>({});

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

  const selected = projects.find((p) => p.id === selectedId) || null;

  const activeCount = projects.filter((p) => p.status === "in_progress").length;
  const reviewCount = projects.filter((p) => p.status === "completed").length;

  const toggleVisibility = (projectId: string, reportName: string) => {
    setReportsVisibility((prev) => ({
      ...prev,
      [`${projectId}-${reportName}`]: !prev[`${projectId}-${reportName}`],
    }));
  };

  async function handleGenerateAI() {
    setShowAIReport(true);
  }

  return (
    <div className="flex h-full">
      {/* ── LEFT PANEL: Research List ─────────────────── */}
      <div className="w-[420px] border-r border-[#1E1E1E] pm-dash-card pm-dash-card-b-0 flex flex-col flex-shrink-0">
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
        <div className="px-4 py-3 border-b border-[#1E1E1E]">
          <SearchBox placeholder="Search research..." value={search} onChange={setSearch} />
        </div>
        <div className="px-4 py-2.5 border-b border-[#1E1E1E] flex gap-1.5 flex-wrap">
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
                  className={`bg-black-2 border rounded-lg p-4 cursor-pointer transition-all ${
                    isActive ? "border-yellow ring-1 ring-yellow/20" : "border-[#252525] hover:border-[#3A3A3A]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-[13px] font-semibold leading-snug text-white">
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
                              ? "bg-yellow/10 text-yellow border-yellow/20"
                              : "bg-transparent text-gray-5 border-[#2A2A2A]"
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

      {/* ── RIGHT PANEL: Research Detail ──────────────── */}
      <div className="flex-1 overflow-y-auto pm-dash-card">
        {selected ? (
          <div>
            <div className="px-7 py-5 border-b border-[#1E1E1E] bg-black">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-[18px] font-bold text-white">
                    {selected.metadata?.title || selected.project_name || TYPE_LABELS[selected.type] || selected.type}
                  </h2>
                  <p className="text-[12px] text-gray-4 mt-1">
                    {selected.client_name || "Unknown client"} · Started {new Date(selected.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleGenerateAI}>
                    <BarChart3 size={12} className="mr-1" /> Generate AI Report
                  </Button>
                  <StatusBadge variant={statusVariantMap[selected.status] || "draft"}>
                    {selected.status === "in_progress" ? "In Progress" : selected.status === "completed" ? "Completed" : selected.status === "upcoming" ? "Upcoming" : "Cancelled"}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <div className="px-7 py-5 space-y-6">
              {/* KPI Row */}
              {selected.metadata?.kpis && selected.metadata.kpis.length > 0 && (
                <div className="pm-dash-krow grid grid-cols-2 gap-4">
                  {selected.metadata.kpis.map((kpi) => (
                    <div key={kpi.label} className="pm-dash-kcard">
                      <div className="font-display text-[28px] font-bold text-yellow leading-none">{kpi.value}</div>
                      <div className="text-[11px] text-gray-4 mt-1.5">{kpi.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {selected.metadata?.summary && (
                <div>
                  <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-2">Summary</h3>
                  <p className="text-[13px] text-gray-3 leading-relaxed">{selected.metadata.summary}</p>
                </div>
              )}

              {/* Bar Chart */}
              {selected.metadata?.chartItems && selected.metadata.chartItems.length > 0 && (
                <div>
                  <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-3">
                    {selected.metadata.chartLabel || "Chart"}
                  </h3>
                  <div className="bg-black-3 border border-[#252525] rounded-lg p-5">
                    <BarChart items={selected.metadata.chartItems} />
                  </div>
                </div>
              )}

              {/* Reports & Deliverables */}
              <div className="pm-dash-card pm-dash-card-b">
                <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-3">
                  Reports &amp; Deliverables
                </h3>
                <div className="space-y-2">
                  {(selected.metadata?.reports && selected.metadata.reports.length > 0 ? selected.metadata.reports : []).map((report) => {
                    const key = `${selected.id}-${report.name}`;
                    const isVisible = reportsVisibility[key] !== undefined ? reportsVisibility[key] : report.visible;
                    return (
                      <div key={report.name} className="flex items-center justify-between pm-dash-card px-4 py-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText size={14} className="text-gray-5 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-white truncate">{report.name}</div>
                            <div className="text-[10px] text-gray-5 mt-0.5">{report.meta}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleVisibility(selected.id, report.name)}
                            className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                              isVisible ? "bg-green/10 text-green border-green/20" : "bg-transparent text-gray-5 border-[#2A2A2A] hover:text-gray-3"
                            }`}
                          >
                            {isVisible ? "Client visible" : "Hidden"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(!selected.metadata?.reports || selected.metadata.reports.length === 0) && (
                    <div className="text-[12px] text-gray-5 text-center py-6">
                      No deliverables yet. Generate an AI report to create one.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-gray-5 text-[13px]">
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
        }}
      />
    </div>
  );
}
