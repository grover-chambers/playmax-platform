"use client";

import React, { useState, useMemo } from "react";
import { Download, Search } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";

// ── Types ──
type ActionType = "Create" | "Update" | "Delete" | "Login" | "Logout";

interface AuditEntry {
  id: string;
  timestamp: Date;
  user: string;
  userEmail: string;
  action: ActionType;
  target: string;
  details: string;
}

// ── Action → badge variant mapping ──
// StatusBadge supports: active (green), review (yellow), draft (gray), confirmed (green)
// We use className overrides for blue / red where the component lacks a native variant.
const actionBadgeConfig: Record<
  ActionType,
  { variant: "active" | "review" | "draft"; className: string }
> = {
  Create: { variant: "active", className: "" },
  Update: {
    variant: "active",
    className: "bg-blue/10! text-blue! border-blue/20!",
  },
  Delete: {
    variant: "draft",
    className: "bg-red/10! text-red! border-red/20!",
  },
  Login: { variant: "review", className: "" },
  Logout: { variant: "draft", className: "" },
};

// ── Sample Data ──
const sampleData: AuditEntry[] = [
  {
    id: "a1",
    timestamp: new Date("2026-07-07T08:32:00"),
    user: "Brian Mwangi",
    userEmail: "brian@marketlink.co.ke",
    action: "Login",
    target: "System",
    details: "User logged in from Nairobi, IP 197.248.xxx.xxx",
  },
  {
    id: "a2",
    timestamp: new Date("2026-07-07T08:15:00"),
    user: "Amina Mohamed",
    userEmail: "amina@marketlink.co.ke",
    action: "Create",
    target: "Lead",
    details:
      "Created lead 'Kevian Kenya' — qualified, pipeline stage: discovery",
  },
  {
    id: "a3",
    timestamp: new Date("2026-07-07T07:50:00"),
    user: "Joy Kariuki",
    userEmail: "joy@marketlink.co.ke",
    action: "Update",
    target: "Booking",
    details: "Updated booking BKG-042 — rescheduled from 12 Jul → 19 Jul",
  },
  {
    id: "a4",
    timestamp: new Date("2026-07-06T18:20:00"),
    user: "Peter Odhiambo",
    userEmail: "peter@marketlink.co.ke",
    action: "Update",
    target: "Invoice",
    details: "Marked invoice INV-2026-012 as paid (M-Pesa, KES 185,000)",
  },
  {
    id: "a5",
    timestamp: new Date("2026-07-06T17:45:00"),
    user: "Admin User",
    userEmail: "admin@marketlink.co.ke",
    action: "Update",
    target: "Staff Role",
    details: "Changed Amina Mohamed role: crm_staff → crm_admin",
  },
  {
    id: "a6",
    timestamp: new Date("2026-07-06T16:30:00"),
    user: "Brian Mwangi",
    userEmail: "brian@marketlink.co.ke",
    action: "Delete",
    target: "Lead",
    details:
      "Deleted lead 'Jamaa Ventures' — duplicate entry (merged into existing)",
  },
  {
    id: "a7",
    timestamp: new Date("2026-07-06T14:10:00"),
    user: "Amina Mohamed",
    userEmail: "amina@marketlink.co.ke",
    action: "Create",
    target: "Booking",
    details: "Confirmed booking BKG-043 — Savannah Suite, check-in 22 Aug 2026",
  },
  {
    id: "a8",
    timestamp: new Date("2026-07-06T11:05:00"),
    user: "Joy Kariuki",
    userEmail: "joy@marketlink.co.ke",
    action: "Create",
    target: "Invoice",
    details:
      "Generated draft invoice INV-2026-013 for Kevian Kenya (KES 420,000)",
  },
  {
    id: "a9",
    timestamp: new Date("2026-07-06T09:30:00"),
    user: "Admin User",
    userEmail: "admin@marketlink.co.ke",
    action: "Login",
    target: "System",
    details: "Super admin login from Mombasa, IP 197.186.xxx.xxx",
  },
  {
    id: "a10",
    timestamp: new Date("2026-07-05T22:15:00"),
    user: "Peter Odhiambo",
    userEmail: "peter@marketlink.co.ke",
    action: "Logout",
    target: "System",
    details: "User logged out — session duration 9h 42m",
  },
  {
    id: "a11",
    timestamp: new Date("2026-07-05T16:00:00"),
    user: "Brian Mwangi",
    userEmail: "brian@marketlink.co.ke",
    action: "Update",
    target: "Lead",
    details:
      "Updated lead 'Tatu City': stage discovery → proposal, value KES 2.4M",
  },
  {
    id: "a12",
    timestamp: new Date("2026-07-05T13:20:00"),
    user: "Amina Mohamed",
    userEmail: "amina@marketlink.co.ke",
    action: "Create",
    target: "Task",
    details:
      "Created high-priority task: 'Send proposal to Tatu City by 10 Jul'",
  },
  {
    id: "a13",
    timestamp: new Date("2026-07-05T10:45:00"),
    user: "Joy Kariuki",
    userEmail: "joy@marketlink.co.ke",
    action: "Update",
    target: "Booking",
    details:
      "Confirmed booking BKG-041 — Lake View Villa, check-in 15 Aug 2026",
  },
  {
    id: "a14",
    timestamp: new Date("2026-07-04T19:00:00"),
    user: "Brian Mwangi",
    userEmail: "brian@marketlink.co.ke",
    action: "Logout",
    target: "System",
    details: "User logged out — session duration 10h 15m",
  },
  {
    id: "a15",
    timestamp: new Date("2026-07-04T15:30:00"),
    user: "Admin User",
    userEmail: "admin@marketlink.co.ke",
    action: "Delete",
    target: "Invoice",
    details: "Voided invoice INV-2026-008 — duplicate issued in error",
  },
  {
    id: "a16",
    timestamp: new Date("2026-07-04T11:10:00"),
    user: "Peter Odhiambo",
    userEmail: "peter@marketlink.co.ke",
    action: "Create",
    target: "Payment",
    details:
      "Recorded M-Pesa payment KES 95,000 for INV-2026-010 (Tatu City deposit)",
  },
  {
    id: "a17",
    timestamp: new Date("2026-07-04T08:00:00"),
    user: "Amina Mohamed",
    userEmail: "amina@marketlink.co.ke",
    action: "Login",
    target: "System",
    details: "User logged in from Kisumu, IP 197.254.xxx.xxx",
  },
  {
    id: "a18",
    timestamp: new Date("2026-07-03T17:55:00"),
    user: "Joy Kariuki",
    userEmail: "joy@marketlink.co.ke",
    action: "Update",
    target: "Staff Role",
    details: "Changed Peter Odhiambo role: finance → crm_admin (interim)",
  },
  {
    id: "a19",
    timestamp: new Date("2026-07-03T14:20:00"),
    user: "Brian Mwangi",
    userEmail: "brian@marketlink.co.ke",
    action: "Update",
    target: "Automation Rule",
    details: "Enabled rule '48-hour no-reply follow-up' — was paused",
  },
  {
    id: "a20",
    timestamp: new Date("2026-07-03T09:45:00"),
    user: "Admin User",
    userEmail: "admin@marketlink.co.ke",
    action: "Delete",
    target: "Staff",
    details: "Deactivated staff account 'James Ochieng' — access revoked",
  },
];

// ── Helpers ──
function formatTimestamp(date: Date): string {
  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_FILTERS = ["All", "Create", "Update", "Delete", "Login", "Logout"];

// ── Page Component ──
export default function AuditLogPage() {
  const [entries] = useState<AuditEntry[]>(sampleData);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Filter logic ──
  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      // Action filter
      if (actionFilter !== "All" && entry.action !== actionFilter) {
        return false;
      }

      // Text search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          entry.user.toLowerCase().includes(q) ||
          entry.userEmail.toLowerCase().includes(q) ||
          entry.target.toLowerCase().includes(q) ||
          entry.details.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Date range
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (entry.timestamp < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (entry.timestamp > to) return false;
      }

      return true;
    });
  }, [entries, actionFilter, searchQuery, fromDate, toDate]);

  // ── CSV Export ──
  function exportCSV() {
    const headers = [
      "Timestamp",
      "User",
      "Email",
      "Action",
      "Target",
      "Details",
    ];
    const rows = filtered.map((entry) => [
      formatTimestamp(entry.timestamp),
      entry.user,
      entry.userEmail,
      entry.action,
      entry.target,
      entry.details,
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

  return (
    <div>
      {/* ── Header ── */}
      <PageHeader
        title="Audit Log"
        subtitle={`${filtered.length} of ${entries.length} entries`}
        actions={
          <Button variant="primary" size="sm" onClick={exportCSV}>
            <Download size={12} className="mr-1" /> Export CSV
          </Button>
        }
      />

      {/* ── Filter Bar ── */}
      <div className="flex items-center gap-3 px-7 py-3 border-b border-[#1E1E1E]">
        {/* Date from */}
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="form-input w-36! py-1.5! text-[11px]!"
          placeholder="From date"
        />

        <span className="text-gray-5 text-[11px] select-none">→</span>

        {/* Date to */}
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="form-input w-36! py-1.5! text-[11px]!"
          placeholder="To date"
        />

        {/* Action type dropdown */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="form-select w-28! py-1.5! text-[11px]!"
        >
          {ACTION_FILTERS.map((f) => (
            <option key={f} value={f}>
              {f === "All" ? "All Actions" : f}
            </option>
          ))}
        </select>

        {/* User / target search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search user, target, details…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input pl-8! py-1.5! text-[11px]!"
          />
        </div>
      </div>

      {/* ── Audit Table ── */}
      <div className="px-7 py-4">
        <div className="bg-black-2 border border-[#252525] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1A]">
                {["Timestamp", "User", "Action", "Target", "Details"].map(
                  (h) => (
                    <th
                      key={h}
                      className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((entry) => {
                  const badge =
                    actionBadgeConfig[entry.action] ?? actionBadgeConfig.Create;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-[#1A1A1A] hover:bg-white/2 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3 text-[11px] text-gray-4 font-mono whitespace-nowrap">
                        {formatTimestamp(entry.timestamp)}
                      </td>

                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="text-[12px] font-medium text-white">
                          {entry.user}
                        </div>
                        <div className="text-[10px] text-gray-5 font-mono mt-0.5">
                          {entry.userEmail}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <StatusBadge
                          variant={badge.variant}
                          className={badge.className}
                        >
                          {entry.action}
                        </StatusBadge>
                      </td>

                      {/* Target */}
                      <td className="px-4 py-3">
                        <span className="text-[12px] text-gray-3">
                          {entry.target}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="px-4 py-3 max-w-70">
                        <p
                          className="text-[11px] text-gray-4 leading-relaxed truncate"
                          title={entry.details}
                        >
                          {entry.details}
                        </p>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-[13px] text-gray-5"
                  >
                    No audit entries match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
