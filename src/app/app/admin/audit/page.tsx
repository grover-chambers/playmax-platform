"use client";

import React, { useState, useEffect } from "react";
import Pagination from "@/components/ui/pagination";
import { Download, Search, Loader2, ClipboardList } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";

// ── Types ──
type ActionType = "Create" | "Update" | "Delete" | "Login" | "Logout";

interface AuditEntry {
  id: string;
  action: ActionType;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown>;
  user_email: string;
  user_role: string;
  ip_address: string | null;
  created_at: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  limit: number;
}

// ── Action → badge config ──
const actionBadgeMap: Record<string, string> = {
  Create: "pm-dash-bdg-g",
  Update: "pm-dash-bdg-b",
  Delete: "pm-dash-bdg-r",
  Login: "pm-dash-bdg-y",
  Logout: "pm-dash-bdg-n",
};

const ENTITY_TYPES = [
  "all",
  "lead",
  "client",
  "booking",
  "invoice",
  "project",
  "staff",
  "system",
];

// ── Helpers ──
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function detailsSummary(details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return "—";
  // Pick a human-readable summary from common keys
  if (typeof details.summary === "string") return details.summary;
  if (typeof details.message === "string") return details.message;
  if (typeof details.description === "string") return details.description;
  // Fallback: first value
  const vals = Object.values(details).filter((v) => typeof v === "string");
  return vals.length > 0 ? (vals[0] as string) : JSON.stringify(details);
}

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [entityType, setEntityType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        if (entityType !== "all") params.set("entity_type", entityType);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);

        const res = await fetch(`/api/audit?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch audit log");
        const data: AuditResponse = await res.json();

        let filtered = data.entries ?? [];

        // Client-side text search (server doesn't support full-text yet)
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (e) =>
              e.user_email.toLowerCase().includes(q) ||
              e.entity_type.toLowerCase().includes(q) ||
              (e.entity_name ?? "").toLowerCase().includes(q) ||
              detailsSummary(e.details).toLowerCase().includes(q),
          );
        }

        if (!cancelled) {
          setEntries(filtered);
          setTotal(data.total ?? 0);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load audit entries. Try refreshing.");
          setEntries([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, entityType, fromDate, toDate, searchQuery, refreshKey]);

  // ── CSV Export ──
  function exportCSV() {
    const headers = [
      "Timestamp",
      "User",
      "Action",
      "Entity",
      "Entity Name",
      "Details",
      "IP",
    ];
    const rows = entries.map((e) => [
      formatTimestamp(e.created_at),
      e.user_email,
      e.action,
      e.entity_type,
      e.entity_name ?? "",
      detailsSummary(e.details),
      e.ip_address ?? "",
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const paginated = entries;
  // Client-side pagination on server-fetched page is already server-paginated,
  // so we display what the API returned for this page.

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <PageHeader
        title="Audit Log"
        subtitle={loading ? "Loading…" : `${total} total entries`}
        actions={
          <Button variant="primary" size="sm" onClick={exportCSV} disabled={loading}>
            <Download size={12} className="mr-1" /> Export CSV
          </Button>
        }
      />

      {/* ── KPI row ── */}
      <div className="pm-dash-krow pm-dash-krow-3">
        <div className="pm-dash-kcard">
          <div className="pm-dash-kl pm-dash-kl-icon">
            <ClipboardList size={14} />
            Total Entries
          </div>
          <div className="pm-dash-kn">{loading ? "…" : total}</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="pm-dash-kl pm-dash-kl-icon">
            <Search size={14} />
            Current Page
          </div>
          <div className="pm-dash-kn blu">{loading ? "…" : page}</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="pm-dash-kl pm-dash-kl-icon">
            <Download size={14} />
            Showing
          </div>
          <div className="pm-dash-kn grn">
            {loading ? "…" : entries.length}
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3 border-b border-[#1E1E1E]">
        {/* Entity type dropdown */}
        <select
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className="form-select w-32! py-1.5! text-[11px]!"
        >
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "all" ? "All Entities" : t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        {/* Date from */}
        <input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          className="form-input w-36! py-1.5! text-[11px]!"
          placeholder="From date"
        />

        <span className="text-gray-5 text-[11px] select-none">→</span>

        {/* Date to */}
        <input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          className="form-input w-36! py-1.5! text-[11px]!"
          placeholder="To date"
        />

        {/* User / target search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search user, entity, details…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="form-input pl-8! py-1.5! text-[11px]!"
          />
        </div>
      </div>

      {/* ── Audit Table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-5">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading audit entries…
        </div>
      ) : error ? (
        <div className="pm-dash-card p-8 text-center">
          <p className="text-[13px] text-[var(--pm-red)] mb-3">{error}</p>
          <Button variant="primary" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="pm-dash-card overflow-hidden">
          <table className="pm-dash-tbl w-full">
            <thead>
              <tr className="pm-dash-tbl-th">
                {["Timestamp", "User", "Action", "Entity", "Details"].map(
                  (h) => (
                    <th key={h} className="pm-dash-tbl-th">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? (
                paginated.map((entry) => (
                  <tr key={entry.id} className="pm-dash-tbl-td">
                    {/* Timestamp */}
                    <td className="pm-dash-tbl-td text-[11px] text-gray-4 font-mono whitespace-nowrap">
                      {formatTimestamp(entry.created_at)}
                    </td>

                    {/* User */}
                    <td className="pm-dash-tbl-td">
                      <div className="text-[12px] font-medium text-white">
                        {entry.user_email?.split("@")[0] ?? "—"}
                      </div>
                      <div className="text-[10px] text-gray-5 font-mono mt-0.5">
                        {entry.user_email}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="pm-dash-tbl-td">
                      <span
                        className={`pm-dash-bdg ${actionBadgeMap[entry.action] || "pm-dash-bdg-n"}`}
                      >
                        {entry.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="pm-dash-tbl-td">
                      <div className="text-[12px] text-gray-3">
                        {entry.entity_type}
                      </div>
                      {entry.entity_name && (
                        <div className="text-[10px] text-gray-5 font-mono mt-0.5">
                          {entry.entity_name}
                        </div>
                      )}
                    </td>

                    {/* Details */}
                    <td className="pm-dash-tbl-td max-w-70">
                      <p
                        className="text-[11px] text-gray-4 leading-relaxed truncate"
                        title={detailsSummary(entry.details)}
                      >
                        {detailsSummary(entry.details)}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-[13px] text-gray-5"
                  >
                    <ClipboardList className="w-8 h-8 mx-auto mb-3 text-gray-5 opacity-40" />
                    No audit entries found. They&apos;ll appear here as team members use the platform.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
