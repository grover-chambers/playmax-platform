"use client";

import React, { useState, useRef } from "react";
import { Plus, Download, Upload } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import BarChart from "@/components/ui/bar-chart";
import StatusBadge from "@/components/ui/status-badge";
import { downloadCSV } from "@/lib/export-utils";

// ── Types ─────────────────────────────────────────────
interface ResearchProject {
  id: string;
  title: string;
  client: string;
  accountManager: string;
  type: string;
  status: "active" | "review" | "draft";
  tags: string[];
  summary: string;
  stats: string;
  progressLabel: string;
  progress?: number;
  startedAt: string;
  kpis: { value: string; label: string }[];
  chartLabel: string;
  chartItems: { label: string; value: number; displayValue?: string }[];
  reports: {
    icon: string;
    name: string;
    meta: string;
    visible: boolean;
  }[];
}

// ── Sample Data ───────────────────────────────────────
const sampleProjects: ResearchProject[] = [
  {
    id: "r1",
    title: "FMCG Cooking Oil — Nairobi Market Sizing",
    client: "Bidco Africa",
    accountManager: "Amina",
    type: "Market Sizing",
    status: "active",
    tags: ["Market Sizing", "Consumer Survey", "Competitor Analysis"],
    summary:
      "Quantitative survey of 800 Nairobi households on cooking oil purchasing behaviour, brand awareness, and price sensitivity — covering Westlands, Eastlands, and South B zones.",
    stats: "📊 800 respondents · 3 zones covered",
    progressLabel: "75% complete",
    progress: 75,
    startedAt: "1 Jun 2026",
    kpis: [
      { value: "KES 2.4B", label: "Est. market value / yr" },
      { value: "62%", label: "Branded product share" },
    ],
    chartLabel: "Brand Awareness — Top 5",
    chartItems: [
      { label: "Elianto", value: 78, displayValue: "78%" },
      { label: "Bidco", value: 71, displayValue: "71%" },
      { label: "Prestige", value: 54, displayValue: "54%" },
      { label: "Golden Fry", value: 43, displayValue: "43%" },
      { label: "Salit", value: 31, displayValue: "31%" },
    ],
    reports: [
      {
        icon: "📄",
        name: "Consumer Survey — Full Data Export",
        meta: "XLSX · 2.4MB · Uploaded 10 Jun",
        visible: false,
      },
      {
        icon: "📊",
        name: "Market Sizing Report — Draft v2",
        meta: "PDF · 3.1MB · Uploaded 18 Jun",
        visible: true,
      },
      {
        icon: "🎯",
        name: "Executive Summary (1-pager)",
        meta: "PDF · 0.8MB · Uploaded 20 Jun",
        visible: true,
      },
    ],
  },
  {
    id: "r2",
    title: "Dairy Alternatives — Competitor Landscape",
    client: "Brookside Dairy",
    accountManager: "James",
    type: "Competitor Analysis",
    status: "review",
    tags: ["Competitor Analysis", "Market Entry"],
    summary:
      "Analysis of 14 competing dairy-alternative brands operating in Nairobi, Mombasa, and Kisumu — pricing, distribution, consumer perception, and shelf placement.",
    stats: "📋 14 brands · 3 cities",
    progressLabel: "Awaiting client approval",
    progress: 90,
    startedAt: "15 May 2026",
    kpis: [
      { value: "14", label: "Competitors analysed" },
      { value: "3", label: "Cities covered" },
    ],
    chartLabel: "Market Share — Top Brands",
    chartItems: [
      { label: "Brookside", value: 34, displayValue: "34%" },
      { label: "Tuzki", value: 22, displayValue: "22%" },
      { label: "Yogurt King", value: 18, displayValue: "18%" },
      { label: "Fresh Dairy", value: 15, displayValue: "15%" },
      { label: "Others", value: 11, displayValue: "11%" },
    ],
    reports: [
      {
        icon: "📄",
        name: "Competitor Analysis — Full Report",
        meta: "PDF · 4.2MB · Uploaded 15 Jun",
        visible: true,
      },
      {
        icon: "📊",
        name: "Pricing Comparison Matrix",
        meta: "XLSX · 1.1MB · Uploaded 18 Jun",
        visible: true,
      },
    ],
  },
  {
    id: "r3",
    title: "Quick-Service Restaurant — Site Feasibility",
    client: "Java House",
    accountManager: "Amina",
    type: "Site Analysis",
    status: "draft",
    tags: ["Site Analysis", "Footfall Data", "Demographics"],
    summary:
      "Feasibility analysis for 4 proposed new Java House locations in Nairobi — pedestrian footfall counts, catchment demographics, and competitor proximity mapping.",
    stats: "📍 4 sites · Field work complete",
    progressLabel: "Report in progress",
    progress: 40,
    startedAt: "10 May 2026",
    kpis: [
      { value: "4", label: "Sites analysed" },
      { value: "12K", label: "Avg. daily footfall" },
    ],
    chartLabel: "Footfall by Location",
    chartItems: [
      { label: "Two Rivers", value: 85, displayValue: "12.4K" },
      { label: "The Hub", value: 72, displayValue: "8.2K" },
      { label: "TRM", value: 68, displayValue: "7.8K" },
      { label: "Garden City", value: 55, displayValue: "5.1K" },
    ],
    reports: [
      {
        icon: "📄",
        name: "Site Survey — Raw Data",
        meta: "XLSX · 3.5MB · Uploaded 25 May",
        visible: false,
      },
    ],
  },
];

const typeFilters = [
  "All",
  "Market Sizing",
  "Competitor Analysis",
  "Site Analysis",
  "Consumer Survey",
];

const statusVariantMap: Record<string, "active" | "review" | "draft"> = {
  active: "active",
  review: "review",
  draft: "draft",
};

// ── Page Component ────────────────────────────────────
export default function ResearchPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(sampleProjects[0].id);
  const importRef = useRef<HTMLInputElement>(null);

  const filtered = sampleProjects.filter((p) => {
    if (activeFilter !== "All" && p.type !== activeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const selected =
    sampleProjects.find((p) => p.id === selectedId) || sampleProjects[0];

  // Manage report visibility locally
  const [reportsVisibility, setReportsVisibility] = useState<
    Record<string, boolean>
  >(() => {
    const map: Record<string, boolean> = {};
    sampleProjects.forEach((p) => {
      p.reports.forEach((r) => {
        map[`${p.id}-${r.name}`] = r.visible;
      });
    });
    return map;
  });

  const toggleVisibility = (projectId: string, reportName: string) => {
    setReportsVisibility((prev) => ({
      ...prev,
      [`${projectId}-${reportName}`]: !prev[`${projectId}-${reportName}`],
    }));
  };

  return (
    <div className="flex h-full">
      {/* ── LEFT PANEL: Research List ─────────────────── */}
      <div className="w-[420px] border-r border-[#1E1E1E] bg-black flex flex-col flex-shrink-0">
        <PageHeader
          title="Research & Data"
          subtitle="12 active projects · 5 pending review"
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
                  const rows = sampleProjects.map((p) => [
                    p.title, p.client, p.type, p.status, p.stats, p.progressLabel,
                  ]);
                  downloadCSV(
                    ["Title", "Client", "Type", "Status", "Stats", "Progress"],
                    rows,
                    "research-projects",
                  );
                }}
              >
                <Download size={12} className="mr-1" /> Export
              </Button>
              <Button variant="primary" size="sm">
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
          {filtered.map((project) => {
            const isActive = project.id === selectedId;
            return (
              <div
                key={project.id}
                onClick={() => setSelectedId(project.id)}
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
                      {project.client} · {project.accountManager}
                    </div>
                  </div>
                  <StatusBadge variant={statusVariantMap[project.status]}>
                    {project.status === "active"
                      ? "In Progress"
                      : project.status === "review"
                        ? "Pending Review"
                        : "Draft"}
                  </StatusBadge>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {project.tags.map((tag, i) => (
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

                {/* Summary */}
                <p className="text-[11px] text-gray-4 leading-relaxed mb-3 line-clamp-2">
                  {project.summary}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-5">{project.stats}</span>
                  <span className="text-gray-4 font-mono">
                    {project.progressLabel}
                  </span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-16 text-center text-[13px] text-gray-5">
              No research projects match your filter.
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Research Detail ──────────────── */}
      <div className="flex-1 bg-[#0D0D0D] overflow-y-auto">
        {selected && (
          <div>
            {/* Detail Header */}
            <div className="px-7 py-5 border-b border-[#1E1E1E] bg-black">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-[18px] font-bold text-white">
                    {selected.title}
                  </h2>
                  <p className="text-[12px] text-gray-4 mt-1">
                    {selected.client} · Started {selected.startedAt}
                  </p>
                </div>
                <StatusBadge variant={statusVariantMap[selected.status]}>
                  {selected.status === "active"
                    ? "In Progress"
                    : selected.status === "review"
                      ? "Pending Review"
                      : "Draft"}
                </StatusBadge>
              </div>
            </div>

            <div className="px-7 py-5 space-y-6">
              {/* KPI Big Row */}
              <div className="grid grid-cols-2 gap-4">
                {selected.kpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="bg-black-3 border border-[#252525] rounded-lg p-5"
                  >
                    <div className="font-display text-[28px] font-bold text-yellow leading-none">
                      {kpi.value}
                    </div>
                    <div className="text-[11px] text-gray-4 mt-1.5">
                      {kpi.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bar Chart */}
              <div>
                <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-3">
                  {selected.chartLabel}
                </h3>
                <div className="bg-black-3 border border-[#252525] rounded-lg p-5">
                  <BarChart items={selected.chartItems} />
                </div>
              </div>

              {/* Reports & Deliverables */}
              <div>
                <h3 className="font-mono text-[10px] text-gray-5 uppercase tracking-wider mb-3">
                  Reports &amp; Deliverables
                </h3>
                <div className="space-y-2">
                  {selected.reports.map((report) => {
                    const isVisible =
                      reportsVisibility[`${selected.id}-${report.name}`] ??
                      report.visible;
                    return (
                      <div
                        key={report.name}
                        className="flex items-center justify-between bg-black-3 border border-[#252525] rounded-md px-4 py-3"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-[16px] flex-shrink-0">
                            {report.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-white truncate">
                              {report.name}
                            </div>
                            <div className="text-[10px] text-gray-5 mt-0.5">
                              {report.meta}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            toggleVisibility(selected.id, report.name)
                          }
                          className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                            isVisible
                              ? "bg-green/10 text-green border-green/20"
                              : "bg-transparent text-gray-5 border-[#2A2A2A] hover:text-gray-3"
                          }`}
                        >
                          {isVisible ? "Client visible" : "Hidden"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
