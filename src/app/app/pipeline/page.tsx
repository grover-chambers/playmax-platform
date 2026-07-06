"use client";

import React, { useState } from "react";
import { Filter, Download, Plus } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import KanbanColumn from "@/components/crm/kanban-column";
import LeadCard from "@/components/crm/lead-card";
import AddLeadModal from "@/components/crm/add-lead-modal";

const sourceFilters = [
  "All Sources",
  "Website Form",
  "WhatsApp",
  "Referral",
  "Billboard Inquiry",
];

const pipelineData: Record<
  string,
  {
    company: string;
    intent: string;
    value?: string;
    time: string;
    source: string;
    assignee: string;
    highlight?: boolean;
  }[]
> = {
  New: [
    {
      company: "Unga Group",
      intent: "High Intent",
      time: "2h ago",
      source: "Website Form",
      assignee: "BM",
      highlight: true,
    },
    {
      company: "Bidco Africa",
      intent: "Rental Inquiry",
      time: "5h ago",
      source: "WhatsApp",
      assignee: "JK",
    },
    {
      company: "Kevian Kenya",
      intent: "Medium Intent",
      value: "KES 380K",
      time: "1d ago",
      source: "Referral",
      assignee: "AW",
    },
  ],
  Contacted: [
    {
      company: "Naivas",
      intent: "High Intent",
      value: "KES 520K",
      time: "3h ago",
      source: "Billboard Inquiry",
      assignee: "BM",
    },
    {
      company: "Safaricom",
      intent: "Research",
      time: "6h ago",
      source: "Website Form",
      assignee: "JK",
    },
    {
      company: "P&G EA",
      intent: "Branding",
      value: "KES 890K",
      time: "1d ago",
      source: "Referral",
      assignee: "AW",
      highlight: true,
    },
  ],
  Qualified: [
    {
      company: "Java House",
      intent: "High Intent",
      value: "KES 1.2M",
      time: "4h ago",
      source: "WhatsApp",
      assignee: "BM",
      highlight: true,
    },
    {
      company: "Twiga Foods",
      intent: "Medium Intent",
      value: "KES 450K",
      time: "2d ago",
      source: "Website Form",
      assignee: "JK",
    },
  ],
  "Proposal Sent": [
    {
      company: "Kenchic",
      intent: "High Intent",
      value: "KES 680K",
      time: "1d ago",
      source: "Referral",
      assignee: "BM",
    },
  ],
  Won: [
    {
      company: "Haco Industries",
      intent: "High Intent",
      value: "KES 340K",
      time: "3d ago",
      source: "Billboard Inquiry",
      assignee: "AW",
    },
  ],
};

const staffData = [
  {
    name: "Amina",
    role: "Lead Gen",
    progress: 85,
    leads: 12,
    closedValue: "KES 620K",
  },
  {
    name: "James",
    role: "Sales Exec",
    progress: 55,
    leads: 8,
    closedValue: "KES 290K",
  },
  {
    name: "Christine",
    role: "Junior Sales",
    progress: 40,
    leads: 5,
    closedValue: "KES 120K",
  },
];

const clientHealthData = [
  { name: "Unga Group", dot: "g", status: "Active", meta: "Campaign running" },
  {
    name: "Java House",
    dot: "g",
    status: "Active",
    meta: "Proposal under review",
  },
  { name: "Naivas", dot: "y", status: "Warm", meta: "Follow-up due in 2d" },
  { name: "Bidco Africa", dot: "y", status: "Warm", meta: "Meeting scheduled" },
  { name: "Kevian Kenya", dot: "r", status: "Cold", meta: "No response 3w+" },
];

const dotColorMap: Record<string, string> = {
  g: "var(--pm-green)",
  y: "var(--pm-yellow)",
  r: "var(--pm-red)",
};

const bdgClassMap: Record<string, string> = {
  g: "pm-dash-bdg-g",
  y: "pm-dash-bdg-y",
  r: "pm-dash-bdg-r",
};

export default function PipelinePage() {
  const [activeFilter, setActiveFilter] = useState("All Sources");
  const [showAddLead, setShowAddLead] = useState(false);

  const columns = Object.entries(pipelineData);

  return (
    <div>
      <PageHeader
        title="Lead Pipeline"
        subtitle="24 active leads · KES 4.2M pipeline value"
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter size={12} className="mr-1" /> Filter
            </Button>
            <Button variant="secondary" size="sm">
              <Download size={12} className="mr-1" /> Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddLead(true)}
            >
              <Plus size={12} className="mr-1" /> Add Lead
            </Button>
          </>
        }
      />

      {/* ── Velocity KPIs ── */}
      <div className="px-7 pt-5 pb-1">
        <div className="pm-dash-krow pm-dash-krow-4">
          <div className="pm-dash-kcard">
            <div className="pm-dash-kn">62%</div>
            <div className="pm-dash-kl">Lead&rarr;qualified rate</div>
            <div className="pm-dash-ksub">
              <span className="trend-up">&uarr; 8%</span> vs last month
            </div>
          </div>
          <div className="pm-dash-kcard grn">
            <div className="pm-dash-kn grn">11d</div>
            <div className="pm-dash-kl">Avg days to close</div>
            <div className="pm-dash-ksub">
              <span className="trend-up">&darr; 3 days faster</span>
            </div>
          </div>
          <div className="pm-dash-kcard red">
            <div className="pm-dash-kn red">3</div>
            <div className="pm-dash-kl">Stale leads (&gt;10 days)</div>
            <div className="pm-dash-ksub" style={{ color: "var(--pm-red)" }}>
              Needs reassignment
            </div>
          </div>
          <div className="pm-dash-kcard neu">
            <div className="pm-dash-kn" style={{ color: "var(--pm-gray-3)" }}>
              KES 1.7M
            </div>
            <div className="pm-dash-kl">Won this month</div>
            <div className="pm-dash-ksub">3 deals closed</div>
          </div>
        </div>
      </div>

      {/* ── Search & Source Filters ── */}
      <div className="px-7 py-3 flex items-center gap-3 border-b border-[#1E1E1E]">
        <SearchBox placeholder="Search leads&hellip;" className="w-56" />
        <div className="flex items-center gap-1.5 ml-2">
          {sourceFilters.map((filter) => (
            <FilterPill
              key={filter}
              active={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <div className="flex gap-4 p-7 overflow-x-auto">
        {columns.map(([title, leads]) => (
          <KanbanColumn key={title} title={title} count={leads.length}>
            {leads.map((lead) => (
              <LeadCard
                key={lead.company}
                company={lead.company}
                intent={lead.intent}
                value={lead.value}
                time={lead.time}
                source={lead.source}
                assignee={lead.assignee}
                highlight={lead.highlight}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>

      {/* ── Staff Performance + Client Health Grid ── */}
      <div className="px-7 pb-7">
        <div className="grid grid-cols-2 gap-5">
          {/* Left Column — Staff Performance */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">Staff Performance</span>
            </div>
            <div className="pm-dash-card-b">
              {staffData.map((staff) => (
                <div key={staff.name} className="pm-dash-staff-row">
                  <div className="pm-dash-staff-info">
                    <div className="pm-dash-staff-name">{staff.name}</div>
                    <div className="pm-dash-staff-role">{staff.role}</div>
                    <div className="pm-dash-prog-wrap">
                      <div className="pm-dash-prog-track">
                        <div
                          className="pm-dash-prog-fill"
                          style={{
                            width: `${staff.progress}%`,
                            background:
                              staff.name === "Christine"
                                ? "var(--pm-red)"
                                : "var(--pm-yellow)",
                          }}
                        />
                      </div>
                      <div className="pm-dash-prog-lbl">
                        <span>{staff.progress}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="pm-dash-staff-stats">
                    <div className="pm-dash-staff-stat">
                      <div className="pm-dash-staff-stat-n">{staff.leads}</div>
                      <div className="pm-dash-staff-stat-l">leads</div>
                    </div>
                    <div className="pm-dash-staff-stat">
                      <div className="pm-dash-staff-stat-n">
                        {staff.closedValue}
                      </div>
                      <div className="pm-dash-staff-stat-l">closed</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column — Client Health */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">Client Health</span>
              <span className="pm-dash-bdg pm-dash-bdg-r">2 at risk</span>
            </div>
            <div className="pm-dash-card-b">
              {clientHealthData.map((client) => (
                <div key={client.name} className="pm-dash-li">
                  <div
                    className="pm-dash-li-dot"
                    style={{ background: dotColorMap[client.dot] }}
                  />
                  <div className="pm-dash-li-body">
                    <div className="pm-dash-li-title">{client.name}</div>
                    <div className="pm-dash-li-meta">{client.meta}</div>
                  </div>
                  <span className={`pm-dash-bdg ${bdgClassMap[client.dot]}`}>
                    {client.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AddLeadModal open={showAddLead} onClose={() => setShowAddLead(false)} />
    </div>
  );
}
