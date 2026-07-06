"use client";

import { useState } from "react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import FilterPill from "@/components/ui/filter-pill";
import StatCard from "@/components/ui/stat-card";
import StatusBadge from "@/components/ui/status-badge";

const statusFilters = ["All", "Draft", "Sent", "Paid", "Overdue"] as const;

const statusVariantMap: Record<string, "active" | "review" | "draft"> = {
  Paid: "active",
  Sent: "review",
  Draft: "draft",
};

interface Invoice {
  id: string;
  client: string;
  project: string;
  amount: string;
  status: string;
  issued: string;
  due: string;
}

const invoices: Invoice[] = [
  {
    id: "INV-2026-001",
    client: "Safaricom",
    project: "CBD Billboard Campaign",
    amount: "KES 190,000",
    status: "Paid",
    issued: "01 Jun 2026",
    due: "01 Jul 2026",
  },
  {
    id: "INV-2026-002",
    client: "P&G East Africa",
    project: "Westlands Screen Package",
    amount: "KES 255,000",
    status: "Sent",
    issued: "15 Jun 2026",
    due: "15 Jul 2026",
  },
  {
    id: "INV-2026-003",
    client: "Bidco Africa",
    project: "Mombasa Rd Billboard",
    amount: "KES 360,000",
    status: "Overdue",
    issued: "01 Jun 2026",
    due: "01 Jul 2026",
  },
  {
    id: "INV-2026-004",
    client: "Java House",
    project: "Brand Perception Study",
    amount: "KES 580,000",
    status: "Sent",
    issued: "20 Jun 2026",
    due: "20 Jul 2026",
  },
  {
    id: "INV-2026-005",
    client: "Naivas",
    project: "Consumer Survey Report",
    amount: "KES 450,000",
    status: "Paid",
    issued: "01 May 2026",
    due: "01 Jun 2026",
  },
  {
    id: "INV-2026-006",
    client: "Unga Group",
    project: "Competitor Analysis",
    amount: "KES 220,000",
    status: "Draft",
    issued: "—",
    due: "—",
  },
];

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== "All" && inv.status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="12 invoices · KES 3.8M outstanding"
        actions={
          <>
            <Button variant="secondary" size="sm">
              Filter
            </Button>
            <Button variant="primary" size="sm">
              + New Invoice
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {/* ── 1. Big 3 numbers ── */}
        <div className="pm-dash-krow pm-dash-krow-3">
          <div className="pm-dash-kcard red" style={{ padding: "28px" }}>
            <div className="pm-dash-kn red">KES 1.2M</div>
            <div className="pm-dash-kl">Total outstanding</div>
            <div className="pm-dash-ksub">Across 5 open invoices</div>
          </div>
          <div className="pm-dash-kcard grn">
            <div className="pm-dash-kn grn">KES 780K</div>
            <div className="pm-dash-kl">Collected this month</div>
            <div className="pm-dash-ksub">
              <span className="trend-up">↑ 22% vs June</span>
            </div>
          </div>
          <div className="pm-dash-kcard red">
            <div className="pm-dash-kn red">KES 440K</div>
            <div className="pm-dash-kl">Overdue &gt;30 days</div>
            <div className="pm-dash-ksub">⚠️ 2 clients — action needed</div>
          </div>
        </div>

        {/* ── 2. Invoice ledger ── */}
        <div className="pm-dash-card">
          <div className="pm-dash-card-h">
            <span className="text-[13px] font-semibold">Invoice Ledger</span>
            <div className="flex items-center gap-2">
              <span className="pm-dash-bdg r">3 overdue</span>
              <span className="pm-dash-bdg y">2 due soon</span>
              <span className="pm-dash-bdg g">1 paid today</span>
            </div>
          </div>
          <div className="pm-dash-card-b-0">
            {/* Header row */}
            <div className="pm-dash-inv-head">
              <span className="pm-dash-inv-client">Client / Invoice</span>
              <span>Amount</span>
              <span>Due date</span>
              <span>Age</span>
              <span>Status</span>
            </div>
            {/* Overdue */}
            <div className="pm-dash-inv-row">
              <div className="pm-dash-inv-client">
                <div className="font-medium">Bidco Africa</div>
                <div className="text-[11px] text-gray-500 font-mono">
                  INV-2026-003
                </div>
              </div>
              <span className="font-mono text-yellow">KES 360K</span>
              <span className="font-mono text-[12px]">01 Jul 2026</span>
              <span className="pm-dash-inv-overdue">5 days</span>
              <span className="text-[11px] font-semibold text-red">
                Overdue
              </span>
            </div>
            <div className="pm-dash-inv-row">
              <div className="pm-dash-inv-client">
                <div className="font-medium">Unga Group</div>
                <div className="text-[11px] text-gray-500 font-mono">
                  INV-2026-006
                </div>
              </div>
              <span className="font-mono text-yellow">KES 220K</span>
              <span className="font-mono text-[12px]">28 Jun 2026</span>
              <span className="pm-dash-inv-overdue">8 days</span>
              <span className="text-[11px] font-semibold text-red">
                Overdue
              </span>
            </div>
            {/* Due soon */}
            <div className="pm-dash-inv-row">
              <div className="pm-dash-inv-client">
                <div className="font-medium">P&G East Africa</div>
                <div className="text-[11px] text-gray-500 font-mono">
                  INV-2026-002
                </div>
              </div>
              <span className="font-mono text-yellow">KES 255K</span>
              <span className="font-mono text-[12px]">15 Jul 2026</span>
              <span className="text-[12px] text-yellow">9 days</span>
              <span className="text-[11px] font-semibold text-yellow">
                Due Soon
              </span>
            </div>
            <div className="pm-dash-inv-row">
              <div className="pm-dash-inv-client">
                <div className="font-medium">Java House</div>
                <div className="text-[11px] text-gray-500 font-mono">
                  INV-2026-004
                </div>
              </div>
              <span className="font-mono text-yellow">KES 580K</span>
              <span className="font-mono text-[12px]">20 Jul 2026</span>
              <span className="text-[12px] text-yellow">14 days</span>
              <span className="text-[11px] font-semibold text-yellow">
                Due Soon
              </span>
            </div>
            {/* Paid today */}
            <div className="pm-dash-inv-row">
              <div className="pm-dash-inv-client">
                <div className="font-medium">Safaricom</div>
                <div className="text-[11px] text-gray-500 font-mono">
                  INV-2026-001
                </div>
              </div>
              <span className="font-mono text-green">KES 190K</span>
              <span className="font-mono text-[12px]">06 Jul 2026</span>
              <span className="text-[12px] text-green">—</span>
              <span className="text-[11px] font-semibold text-green">Paid</span>
            </div>
          </div>
        </div>

        {/* ── 3. Two-column grid ── */}
        <div className="pm-dash-krow pm-dash-krow-2">
          {/* Left — Revenue collected chart */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="text-[13px] font-semibold">
                Revenue Collected
              </span>
              <span className="text-[11px] text-gray-5">Last 6 months</span>
            </div>
            <div className="pm-dash-card-b">
              <div className="pm-dash-bchart">
                {[
                  { label: "Feb", amount: "120K", pct: 31 },
                  { label: "Mar", amount: "250K", pct: 64 },
                  { label: "Apr", amount: "180K", pct: 46 },
                  { label: "May", amount: "320K", pct: 82 },
                  { label: "Jun", amount: "400K", pct: 100, active: true },
                  { label: "Jul", amount: "280K", pct: 70 },
                ].map((m) => (
                  <div
                    key={m.label}
                    className={`pm-dash-bbar${m.active ? " active" : ""}`}
                  >
                    <div className="pm-dash-bbar-label">{m.label}</div>
                    <div className="flex-1 flex items-end justify-center">
                      <div
                        className="w-6 rounded-t bg-gradient-to-t from-blue-500/60 to-blue-400/30"
                        style={{ height: `${m.pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-5 mt-1">
                      {m.amount}
                    </div>
                  </div>
                ))}
              </div>
              {/* Stat boxes */}
              <div className="flex gap-4 mt-5">
                <div className="pm-dash-mini-kpi">
                  <div className="pm-dash-mini-kpi-val">KES 1.5M</div>
                  <div className="pm-dash-mini-kpi-lbl">Total collected</div>
                </div>
                <div className="pm-dash-mini-kpi">
                  <div className="pm-dash-mini-kpi-val">84%</div>
                  <div className="pm-dash-mini-kpi-lbl">Collection rate</div>
                </div>
                <div className="pm-dash-mini-kpi">
                  <div className="pm-dash-mini-kpi-val">12</div>
                  <div className="pm-dash-mini-kpi-lbl">Paid invoices</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Due in next 14 days */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="text-[13px] font-semibold">
                Due in Next 14 Days
              </span>
            </div>
            <div className="pm-dash-card-b space-y-3">
              {/* Alerts */}
              <div className="pm-dash-alert">⚠️ 3 invoices due this week</div>
              <div className="pm-dash-alert-r">
                🔔 2 invoices overdue — contact clients
              </div>
              {/* List items */}
              <div className="space-y-1">
                <div className="pm-dash-li">
                  <div className="pm-dash-li-dot" />
                  <div className="pm-dash-li-body">
                    <div className="pm-dash-li-title">Java House</div>
                    <div className="pm-dash-li-meta">KES 580K · Due 20 Jul</div>
                  </div>
                </div>
                <div className="pm-dash-li">
                  <div className="pm-dash-li-dot" />
                  <div className="pm-dash-li-body">
                    <div className="pm-dash-li-title">P&G East Africa</div>
                    <div className="pm-dash-li-meta">KES 255K · Due 15 Jul</div>
                  </div>
                </div>
                <div className="pm-dash-li">
                  <div className="pm-dash-li-dot" />
                  <div className="pm-dash-li-body">
                    <div className="pm-dash-li-title">Safaricom</div>
                    <div className="pm-dash-li-meta">KES 190K · Due 11 Jul</div>
                  </div>
                </div>
              </div>
              {/* Quick actions */}
              <div className="flex gap-2 pt-1">
                <Button variant="primary" size="sm">
                  Send reminders
                </Button>
                <Button variant="secondary" size="sm">
                  View all due
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
