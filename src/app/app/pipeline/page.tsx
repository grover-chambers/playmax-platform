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

const sourceFilters = ["All Sources", "Website Form", "WhatsApp", "Referral", "Billboard Inquiry"];

const pipelineData: Record<string, { company: string; intent: string; value?: string; time: string; source: string; assignee: string; highlight?: boolean }[]> = {
  New: [
    { company: "Unga Group", intent: "High Intent", time: "2h ago", source: "Website Form", assignee: "BM", highlight: true },
    { company: "Bidco Africa", intent: "Rental Inquiry", time: "5h ago", source: "WhatsApp", assignee: "JK" },
    { company: "Kevian Kenya", intent: "Medium Intent", value: "KES 380K", time: "1d ago", source: "Referral", assignee: "AW" },
  ],
  Contacted: [
    { company: "Naivas", intent: "High Intent", value: "KES 520K", time: "3h ago", source: "Billboard Inquiry", assignee: "BM" },
    { company: "Safaricom", intent: "Research", time: "6h ago", source: "Website Form", assignee: "JK" },
    { company: "P&G EA", intent: "Branding", value: "KES 890K", time: "1d ago", source: "Referral", assignee: "AW", highlight: true },
  ],
  Qualified: [
    { company: "Java House", intent: "High Intent", value: "KES 1.2M", time: "4h ago", source: "WhatsApp", assignee: "BM", highlight: true },
    { company: "Twiga Foods", intent: "Medium Intent", value: "KES 450K", time: "2d ago", source: "Website Form", assignee: "JK" },
  ],
  "Proposal Sent": [
    { company: "Kenchic", intent: "High Intent", value: "KES 680K", time: "1d ago", source: "Referral", assignee: "BM" },
  ],
  Won: [
    { company: "Haco Industries", intent: "High Intent", value: "KES 340K", time: "3d ago", source: "Billboard Inquiry", assignee: "AW" },
  ],
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
            <Button variant="primary" size="sm" onClick={() => setShowAddLead(true)}>
              <Plus size={12} className="mr-1" /> Add Lead
            </Button>
          </>
        }
      />
      <div className="px-7 py-3 flex items-center gap-3 border-b border-[#1E1E1E]">
        <SearchBox placeholder="Search leads…" className="w-56" />
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
      <AddLeadModal open={showAddLead} onClose={() => setShowAddLead(false)} />
    </div>
  );
}
