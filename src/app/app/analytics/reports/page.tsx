"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Download, Save, Loader2, Eye, EyeOff, ChevronRight,
} from "lucide-react";
import Button from "@/components/ui/button";
import PageHeader from "@/components/layout/page-header";
import { AnalyticsChart } from "@/components/charts/analytics-chart";
import { transformChartData } from "@/lib/analytics-transform";
import { REPORT_CATEGORIES, findSubtype, findCategory } from "@/lib/report-types";
import type { ReportCategory, ReportSubtype, FilterDef, ChartType } from "@/lib/report-types";
import type { ChartProps } from "@/components/charts/analytics-chart";

/* ── Types ──────────────────────────────────────────────────── */

interface FilterValues {
  date_start: string;
  date_end: string;
  category: string;
  subcategory: string;
  branch: string;
  branch_multi: string[];
  supplier: string;
  suppliers_multi: string[];
  product_id: string;
  product_name: string;
  metric: string;
  trend_filter: string[];
  lead_time: number;
}

interface DimensionOption {
  id: string;
  name: string;
}

interface SavedReport {
  id: string;
  name: string;
  report_type: string;
  subtype: string;
  config: Record<string, unknown>;
  generated_data: Record<string, unknown>;
  visible_to_client: boolean;
  client_id: string | null;
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string; company: string } | { name: string; company: string }[];
}

/* ── Helpers ────────────────────────────────────────────────── */

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString();
}

function filterKeyToLabel(key: string): string {
  const m: Record<string, string> = {
    date_range: "Date Range",
    category: "Category",
    subcategory: "Sub-Category",
    branch: "Branch",
    supplier: "Supplier",
    suppliers_multi: "Suppliers",
    product: "Product / SKU",
    metric: "Metric",
    trend_filter: "Trend",
    lead_time: "Lead Time (days)",
  };
  return m[key] ?? key;
}

/* ══════════════════════════════════════════════════════════════ */

export default function AnalyticsReportsPage() {
  const router = useRouter();

  /* ── Dimension data ── */
  const [categories, setCategories] = useState<DimensionOption[]>([]);
  const [subcategories, setSubcategories] = useState<DimensionOption[]>([]);
  const [branches, setBranches] = useState<DimensionOption[]>([]);
  const [suppliers, setSuppliers] = useState<DimensionOption[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; company: string }[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  /* ── Selection state ── */
  const [categoryTab, setCategoryTab] = useState<string>("market_share");
  const [selectedSubtype, setSelectedSubtype] = useState<string>("");
  const [filters, setFilters] = useState<FilterValues>({
    date_start: "",
    date_end: "",
    category: "",
    subcategory: "",
    branch: "",
    branch_multi: [],
    supplier: "",
    suppliers_multi: [],
    product_id: "",
    product_name: "",
    metric: "",
    trend_filter: [],
    lead_time: 7,
  });

  /* ── Query state ── */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartProps, setChartProps] = useState<ChartProps | null>(null);
  const [queryResult, setQueryResult] = useState<Record<string, unknown>[]>([]);

  /* ── Save state ── */
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [reportName, setReportName] = useState("");
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState("");

  /* ── Link-to-project modal state ── */
  const [linkModalReport, setLinkModalReport] = useState<string | null>(null);
  const [linkModalProjects, setLinkModalProjects] = useState<{ id: string; name: string }[]>([]);
  const [linking, setLinking] = useState(false);

  /* ── Load dimensions & saved reports ── */
  useEffect(() => {
    const load = async () => {
      const [dimRes, reportsRes, clientsRes] = await Promise.all([
        fetch("/api/analytics/dimensions"),
        fetch("/api/analytics/reports"),
        fetch("/api/analytics/clients"),
      ]);
      const dim = await dimRes.json();
      setCategories(dim.categories ?? []);
      setSubcategories(dim.subcategories ?? []);
      setBranches(dim.branches ?? []);
      setSuppliers(dim.suppliers ?? []);

      const rep = await reportsRes.json();
      setSavedReports(rep.reports ?? []);

      const cli = await clientsRes.json();
      setClients(cli.clients ?? []);
    };
    load();
  }, []);

  const currentCategory: ReportCategory | undefined = findCategory(categoryTab);
  const currentSubtype: ReportSubtype | undefined = selectedSubtype
    ? findSubtype(categoryTab, selectedSubtype) ?? undefined
    : undefined;

  /* ── Filtered subcategories ── */
  const filteredSubcategories = useMemo(() => {
    if (!filters.category) return subcategories;
    const cat = categories.find((c) => c.name === filters.category);
    if (!cat) return subcategories;
    return subcategories.filter((sc) => {
      // Derive category_id from subcategory (we store category_id in subcategory)
      return true;
    });
  }, [filters.category, categories, subcategories]);

  /* ── Build API body from subtype + filters ── */
  const buildApiBody = useCallback(() => {
    const body: Record<string, unknown> = {
      subtype: selectedSubtype,
    };
    if (filters.date_start || filters.date_end) {
      body.period_start = filters.date_start;
      body.period_end = filters.date_end;
    }
    if (filters.category) body.category = filters.category;
    if (filters.subcategory) body.sub_category = filters.subcategory;
    if (filters.branch) body.branch = filters.branch;
    if (filters.supplier) body.supplier_ids = [filters.supplier];
    if (filters.suppliers_multi.length > 0) body.supplier_ids = filters.suppliers_multi;
    if (filters.product_id) body.product_id = filters.product_id;
    if (filters.trend_filter.length > 0) body.trend_filter = filters.trend_filter.join(",");
    if (filters.lead_time) body.lead_time = filters.lead_time;
    return body;
  }, [selectedSubtype, filters]);

  /* ── Run query ── */
  const runQuery = useCallback(async () => {
    if (!selectedSubtype) return;
    setLoading(true);
    setError(null);
    setChartProps(null);
    try {
      const res = await fetch("/api/analytics/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildApiBody()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Query failed" }));
        throw new Error(err.error ?? "Query failed");
      }
      const result = await res.json();
      const data = result.data ?? [];
      const ct = result.chart_type ?? "table";
      setQueryResult(data);
      setChartProps(transformChartData(ct, data));
      // Auto-name report
      if (!reportName && currentSubtype) {
        const parts = [currentSubtype.name];
        if (filters.category) parts.push(`- ${filters.category}`);
        if (filters.subcategory) parts.push(`(${filters.subcategory})`);
        setReportName(parts.join(" "));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }, [selectedSubtype, buildApiBody, currentSubtype, filters, reportName]);

  /* ── Save report ── */
  const handleSave = async () => {
    if (!reportName.trim()) {
      setSaveMsg("Enter a report name");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const body = {
        name: reportName,
        report_type: categoryTab,
        subtype: selectedSubtype,
        config: buildApiBody(),
        generated_data: { data: queryResult, chart_type: chartProps?.type ?? "table" },
        visible_to_client: visibleToClient,
        client_id: selectedClientId || null,
      };
      const res = await fetch("/api/analytics/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        throw new Error(err.error ?? "Save failed");
      }
      const result = await res.json();
      setSavedReports((prev) => [result.report, ...prev]);
      setSaveMsg("Report saved!");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: unknown) {
      setSaveMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  /* ── Load saved report into viewer ── */
  const loadSavedReport = (report: SavedReport) => {
    if (report.generated_data && typeof report.generated_data === "object") {
      const gd = report.generated_data as { data?: Record<string, unknown>[]; chart_type?: string };
      if (gd.data && gd.chart_type) {
        setQueryResult(gd.data);
        setChartProps(transformChartData(gd.chart_type as ChartType, gd.data));
        setCategoryTab(report.report_type);
        setSelectedSubtype(report.subtype || "");
      }
    }
  };

  /* ── Link report to project ── */
  const openLinkModal = async (reportId: string) => {
    setLinkModalReport(reportId);
    const res = await fetch("/api/projects");
    const data = await res.json();
    setLinkModalProjects(data.data ?? []);
  };

  const handleLinkToProject = async (projectId: string) => {
    if (!linkModalReport) return;
    setLinking(true);
    try {
      await fetch(`/api/projects/${projectId}/analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: linkModalReport }),
      });
      setLinkModalReport(null);
    } finally {
      setLinking(false);
    }
  };

  /* ── Render filter field ── */
  const renderFilter = (fd: FilterDef) => {
    const key = fd.key;
    const label = filterKeyToLabel(key);

    if (fd.type === "date_range") {
      return (
        <div key={key} className="flex items-center gap-2">
          <label className="font-mono text-[9px] text-gray-5 uppercase whitespace-nowrap">{label}</label>
          <input type="date" value={filters.date_start} onChange={(e) => setFilters((f) => ({ ...f, date_start: e.target.value }))}
            className="bg-black-3 border border-white/6 rounded px-2 py-1 text-[12px] text-white font-mono outline-none" />
          <span className="text-[11px] text-gray-5">to</span>
          <input type="date" value={filters.date_end} onChange={(e) => setFilters((f) => ({ ...f, date_end: e.target.value }))}
            className="bg-black-3 border border-white/6 rounded px-2 py-1 text-[12px] text-white font-mono outline-none" />
        </div>
      );
    }

    if (key === "category") {
      return (
        <div key={key} className="flex items-center gap-2">
          <label className="font-mono text-[9px] text-gray-5 uppercase whitespace-nowrap">{label}</label>
          <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, subcategory: "" }))}
            className="bg-black-3 border border-white/6 rounded px-2 py-1 text-[12px] text-white font-mono outline-none cursor-pointer">
            <option value="">All</option>
            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      );
    }

    if (key === "subcategory") {
      return (
        <div key={key} className="flex items-center gap-2">
          <label className="font-mono text-[9px] text-gray-5 uppercase whitespace-nowrap">{label}</label>
          <select value={filters.subcategory} onChange={(e) => setFilters((f) => ({ ...f, subcategory: e.target.value }))}
            className="bg-black-3 border border-white/6 rounded px-2 py-1 text-[12px] text-white font-mono outline-none cursor-pointer">
            <option value="">All</option>
            {filteredSubcategories.map((sc) => <option key={sc.id} value={sc.name}>{sc.name}</option>)}
          </select>
        </div>
      );
    }

    if (key === "branch" && fd.type === "multi_select") {
      return (
        <div key={key} className="flex items-center gap-2">
          <label className="font-mono text-[9px] text-gray-5 uppercase whitespace-nowrap">{label}</label>
          <select multiple value={filters.branch_multi} onChange={(e) => {
            const vals = Array.from(e.target.selectedOptions, (o) => o.value);
            setFilters((f) => ({ ...f, branch_multi: vals }));
          }}
            className="bg-black-3 border border-white/6 rounded px-2 py-1 text-[12px] text-white font-mono outline-none max-h-[120px]">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      );
    }

    if (key === "branch") {
      return (
        <div key={key} className="flex items-center gap-2">
          <label className="font-mono text-[9px] text-gray-5 uppercase whitespace-nowrap">{label}</label>
          <select value={filters.branch} onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))}
            className="bg-black-3 border border-white/6 rounded px-2 py-1 text-[12px] text-white font-mono outline-none cursor-pointer">
            <option value="">All</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      );
    }

    if (key === "supplier") {
      return (
        <div key={key} className="flex items-center gap-2">
          <label className="font-mono text-[9px] text-gray-5 uppercase whitespace-nowrap">{label}</label>
          <select value={filters.supplier} onChange={(e) => setFilters((f) => ({ ...f, supplier: e.target.value }))}
            className="bg-black-3 border border-white/6 rounded px-2 py-1 text-[12px] text-white font-mono outline-none cursor-pointer">
            <option value="">Select supplier</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      );
    }

    if (key === "suppliers_multi") {
      return (
        <div key={key} className="flex items-center gap-2">
          <label className="font-mono text-[9px] text-gray-5 uppercase whitespace-nowrap">{label}</label>
          <select multiple value={filters.suppliers_multi} onChange={(e) => {
            const vals = Array.from(e.target.selectedOptions, (o) => o.value);
            setFilters((f) => ({ ...f, suppliers_multi: vals }));
          }}
            className="bg-black-3 border border-white/6 rounded px-2 py-1 text-[12px] text-white font-mono outline-none max-h-[120px]">
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      );
    }

    if (key === "product") {
      return (
        <div key={key} className="flex items-center gap-2">
          <label className="font-mono text-[9px] text-gray-5 uppercase whitespace-nowrap">{label}</label>
          <input type="text" placeholder="Product ID" value={filters.product_id}
            onChange={(e) => setFilters((f) => ({ ...f, product_id: e.target.value }))}
            className="bg-black-3 border border-white/6 rounded px-2 py-1 text-[12px] text-white font-mono outline-none w-[200px]" />
        </div>
      );
    }

    if (key === "metric") {
      return (
        <div key={key} className="flex items-center gap-2">
          <label className="font-mono text-[9px] text-gray-5 uppercase whitespace-nowrap">{label}</label>
          <select value={filters.metric} onChange={(e) => setFilters((f) => ({ ...f, metric: e.target.value }))}
            className="bg-black-3 border border-white/6 rounded px-2 py-1 text-[12px] text-white font-mono outline-none cursor-pointer">
            <option value="revenue">Revenue</option>
            <option value="units">Units</option>
          </select>
        </div>
      );
    }

    if (key === "trend_filter") {
      return (
        <div key={key} className="flex items-center gap-2">
          <label className="font-mono text-[9px] text-gray-5 uppercase whitespace-nowrap">{label}</label>
          <div className="flex gap-1">
            {["RISING", "STABLE", "FALLING"].map((t) => (
              <button key={t}
                onClick={() => setFilters((f) => ({
                  ...f,
                  trend_filter: f.trend_filter.includes(t)
                    ? f.trend_filter.filter((x) => x !== t)
                    : [...f.trend_filter, t],
                }))}
                className={`px-2 py-1 text-[10px] rounded font-mono transition-colors cursor-pointer ${
                  filters.trend_filter.includes(t)
                    ? "bg-yellow text-black"
                    : "bg-black-3 border border-white/6 text-gray-4"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (key === "lead_time") {
      return (
        <div key={key} className="flex items-center gap-2">
          <label className="font-mono text-[9px] text-gray-5 uppercase whitespace-nowrap">{label}</label>
          <input type="number" value={filters.lead_time} onChange={(e) => setFilters((f) => ({ ...f, lead_time: Number(e.target.value) || 7 }))}
            className="bg-black-3 border border-white/6 rounded px-2 py-1 text-[12px] text-white font-mono outline-none w-[80px]" />
        </div>
      );
    }

    return null;
  };

  /* ── Render saved report list item ── */
  const renderSavedReport = (report: SavedReport) => {
    const cat = findCategory(report.report_type);
    return (
      <button key={report.id}
        onClick={() => loadSavedReport(report)}
        className="w-full text-left p-3 rounded-lg bg-black-3 border border-white/6 hover:border-yellow/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] font-semibold text-white truncate">{report.name}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); openLinkModal(report.id); }}
              className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border transition-colors cursor-pointer bg-transparent text-gray-5 border-[#2A2A2A] hover:text-yellow hover:border-yellow/30"
            >
              Link to Project
            </button>
            {report.visible_to_client ? (
              <Eye size={11} className="text-teal" />
            ) : (
              <EyeOff size={11} className="text-gray-5" />
            )}
            <ChevronRight size={11} className="text-gray-5" />
          </div>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-gray-5">
          <span className="px-1.5 py-0.5 rounded bg-white/5" style={{ color: cat?.colour }}>
            {cat?.label ?? report.report_type}
          </span>
          <span>{fmtDate(report.updated_at)}</span>
        </div>
      </button>
    );
  };

  /* ══════════════════════════════════════════════════════════════ */

  return (
    <div className="page-content">
      <PageHeader
        title="Analytics Reports"
        subtitle="Build, preview, and publish reports for internal use or client sharing"
      />

      <div className="flex gap-6">
        {/* ── Left sidebar: Saved reports ── */}
        <div className="w-[240px] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9px] text-gray-5 uppercase tracking-wider">Saved Reports</span>
            <span className="text-[10px] text-gray-5">{savedReports.length}</span>
          </div>
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {savedReports.length === 0 ? (
              <div className="text-[11px] text-gray-5 text-center py-6">
                No saved reports yet. Run a query and save it.
              </div>
            ) : (
              savedReports.map(renderSavedReport)
            )}
          </div>
        </div>

        {/* ── Main area ── */}
        <div className="flex-1 min-w-0">
          {/* ── Category tabs ── */}
          <div className="pm-dash-qa-strip mb-4">
            {REPORT_CATEGORIES.map((cat) => {
              const isActive = categoryTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryTab(cat.id); setSelectedSubtype(""); setChartProps(null); }}
                  className={`pm-dash-qa-btn ${isActive ? "text-yellow border-yellow/40" : ""}`}
                  style={isActive ? { borderColor: cat.colour + "66", color: cat.colour } : undefined}
                >
                  {cat.icon}
                  <span className="ml-1">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Subtype selector ── */}
          {currentCategory && (
            <div className="mb-4">
              <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-2">
                Report Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {currentCategory.subtypes.map((st) => {
                  const isSelected = selectedSubtype === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => { setSelectedSubtype(st.id); setChartProps(null); }}
                      className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "border-yellow/50 bg-yellow/5"
                          : "border-white/6 bg-black-3 hover:border-white/20"
                      }`}
                    >
                      <div className="text-[12px] font-semibold text-white mb-0.5">{st.name}</div>
                      <div className="text-[9px] text-gray-5 leading-tight">{st.desc}</div>
                      <div className="mt-1.5 flex gap-1">
                        <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-white/5 text-gray-5 uppercase">
                          {st.chart}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Filter bar ── */}
          {currentSubtype && (
            <div className="flex items-center gap-3 flex-wrap pb-4 border-b border-white/6 mb-4">
              {currentSubtype.filters.map(renderFilter)}

              <div className="flex items-end gap-2 ml-auto">
                {saveMsg && (
                  <span className={`text-[11px] px-2 py-1 rounded ${
                    saveMsg === "Report saved!" ? "pm-dash-bdg pm-dash-bdg-g" : "pm-dash-bdg pm-dash-bdg-r"
                  }`}>
                    {saveMsg}
                  </span>
                )}
                <Button variant="secondary" size="sm" onClick={runQuery} disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Running...
                    </span>
                  ) : "Run query"}
                </Button>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="pm-dash-alert pm-dash-alert-r mb-4">{error}</div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-gray-5 animate-spin" />
              <span className="ml-2 text-[12px] text-gray-5">Running query...</span>
            </div>
          )}

          {/* ── Chart ── */}
          {chartProps && !loading && (
            <>
              <div className="pm-dash-card mb-4">
                <div className="pm-dash-card-h">
                  <span className="pm-dash-card-t text-[14px]">
                    {currentSubtype?.name ?? "Results"}
                  </span>
                  {currentSubtype && (
                    <span className="text-[10px] text-gray-5 font-mono ml-2">
                      {currentSubtype.chart}
                    </span>
                  )}
                </div>
                <div className="pm-dash-card-b">
                  <div style={{ height: 300 }}>
                    <AnalyticsChart {...chartProps} height={300} />
                  </div>
                </div>
              </div>

              {/* ── Data table ── */}
              {queryResult.length > 0 && (
                <div className="pm-dash-card mb-4">
                  <div className="pm-dash-card-h">
                    <span className="pm-dash-card-t text-[14px]">Data</span>
                    <span className="text-[10px] text-gray-5">{queryResult.length} rows</span>
                  </div>
                  <div className="pm-dash-card-b-0 overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="pm-dash-tbl">
                      <thead>
                        <tr>
                          {Object.keys(queryResult[0]).map((k) => (
                            <th key={k} className="pm-dash-tbl-th text-[9px] uppercase tracking-wider">
                              {k.replace(/_/g, " ")}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.slice(0, 50).map((row, i) => (
                          <tr key={i}>
                            {Object.entries(row).map(([k, v]) => (
                              <td key={k} className={`pm-dash-tbl-td text-[11px] ${
                                typeof v === "number" ? "font-mono text-right" : ""
                              }`}>
                                {typeof v === "number"
                                  ? v >= 1000000
                                    ? `KES ${(v / 1000000).toFixed(1)}M`
                                    : v >= 1000
                                      ? `KES ${(v / 1000).toFixed(0)}K`
                                      : typeof v === "number" && k.includes("pct")
                                        ? `${v.toFixed(1)}%`
                                        : v.toLocaleString()
                                  : String(v ?? "")
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {queryResult.length > 50 && (
                      <div className="text-center text-[11px] text-gray-5 py-3">
                        Showing 50 of {queryResult.length} rows
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Save panel ── */}
              <div className="pm-dash-card p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
                      Report Name
                    </label>
                    <input type="text" value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Enter report name..."
                      className="bg-black-3 border border-white/6 rounded px-3 py-1.5 text-[12px] text-white font-mono outline-none w-[280px]"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[9px] text-gray-5 uppercase tracking-wider block mb-1">
                      Client
                    </label>
                    <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}
                      className="bg-black-3 border border-white/6 rounded px-2 py-1.5 text-[12px] text-white font-mono outline-none cursor-pointer"
                    >
                      <option value="">No client (internal only)</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <button
                      onClick={() => setVisibleToClient(!visibleToClient)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        visibleToClient
                          ? "bg-teal/20 text-teal border border-teal/30"
                          : "bg-black-3 border border-white/6 text-gray-4"
                      }`}
                    >
                      {visibleToClient ? <Eye size={12} /> : <EyeOff size={12} />}
                      {visibleToClient ? "Visible to client" : "Hidden from client"}
                    </button>
                    <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        <>
                          <Save className="w-3 h-3" />
                          Save Report
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Empty state ── */}
          {!selectedSubtype && !loading && !chartProps && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-5">
              <Download size={40} className="mb-4 opacity-30" />
              <div className="text-[14px] font-semibold mb-1">Select a Report Type</div>
              <div className="text-[12px] text-center max-w-md">
                Choose a category tab above, then pick a specific report type and configure the filters. Click &ldquo;Run query&rdquo; to see results.
              </div>
            </div>
          )}
        </div>
      </div>

      {linkModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setLinkModalReport(null)}>
          <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-6 w-[400px] max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[14px] font-semibold text-white mb-4">Link Report to Project</h3>
            {linkModalProjects.length === 0 ? (
              <p className="text-[12px] text-gray-5">No projects found.</p>
            ) : (
              <div className="space-y-2">
                {linkModalProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleLinkToProject(p.id)}
                    disabled={linking}
                    className="w-full text-left p-3 rounded-lg border border-white/6 hover:border-yellow/30 hover:bg-yellow/5 transition-colors text-[12px] text-white disabled:opacity-50"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setLinkModalReport(null)} className="mt-4 text-[11px] text-gray-5 hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
