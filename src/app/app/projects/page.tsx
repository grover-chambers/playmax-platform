"use client";

import React, { useState } from "react";
import { Plus, Filter } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import StatusBadge from "@/components/ui/status-badge";
import Card from "@/components/ui/card";
import ProgressBar from "@/components/ui/progress-bar";

interface Project {
  id: string;
  name: string;
  client: string;
  type: string;
  status: "active" | "review" | "draft" | "confirmed";
  progress: number;
  value: string;
  deadline: string;
}

const projects: Project[] = [
  {
    id: "1",
    name: "Brand Audit Q1",
    client: "Unga Group",
    type: "Research",
    status: "active",
    progress: 65,
    value: "KES 380K",
    deadline: "Mar 15, 2026",
  },
  {
    id: "2",
    name: "Out-of-Home Campaign",
    client: "Unga Group",
    type: "Campaign",
    status: "active",
    progress: 40,
    value: "KES 1.2M",
    deadline: "Apr 30, 2026",
  },
  {
    id: "3",
    name: "Safaricom Research Study",
    client: "Safaricom",
    type: "Research",
    status: "review",
    progress: 90,
    value: "KES 890K",
    deadline: "Feb 28, 2026",
  },
  {
    id: "4",
    name: "Java House Brand Refresh",
    client: "Java House",
    type: "Branding",
    status: "active",
    progress: 30,
    value: "KES 1.5M",
    deadline: "May 15, 2026",
  },
  {
    id: "5",
    name: "Naivas Billboard Network",
    client: "Naivas",
    type: "Rental",
    status: "active",
    progress: 75,
    value: "KES 620K",
    deadline: "Ongoing",
  },
  {
    id: "6",
    name: "P&G Product Launch Event",
    client: "P&G East Africa",
    type: "Event",
    status: "confirmed",
    progress: 20,
    value: "KES 2.1M",
    deadline: "Jun 1, 2026",
  },
  {
    id: "7",
    name: "Twiga Brand Strategy",
    client: "Twiga Foods",
    type: "Branding",
    status: "draft",
    progress: 10,
    value: "KES 450K",
    deadline: "Jul 1, 2026",
  },
  {
    id: "8",
    name: "Kenchic Campaign Rollout",
    client: "Kenchic",
    type: "Campaign",
    status: "active",
    progress: 55,
    value: "KES 680K",
    deadline: "Apr 15, 2026",
  },
  {
    id: "9",
    name: "Haco Retail Activation",
    client: "Haco Industries",
    type: "Campaign",
    status: "review",
    progress: 85,
    value: "KES 340K",
    deadline: "Mar 1, 2026",
  },
];

const typeFilters = [
  "All",
  "Research",
  "Branding",
  "Campaign",
  "Event",
  "Rental",
];
const statusFilters = [
  "All Statuses",
  "Active",
  "Review",
  "Draft",
  "Confirmed",
];

const typeColors: Record<string, string> = {
  Research: "bg-blue/10 text-blue border-blue/20",
  Branding: "bg-purple/10 text-purple border-purple/20",
  Campaign: "bg-yellow/10 text-yellow border-yellow/20",
  Event: "bg-green/10 text-green border-green/20",
  Rental: "bg-wa-green/10 text-wa-green border-wa-green/20",
};

export default function ProjectsPage() {
  const [activeType, setActiveType] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All Statuses");

  const filtered = projects.filter((p) => {
    if (activeType !== "All" && p.type !== activeType) return false;
    if (
      activeStatus !== "All Statuses" &&
      p.status !== activeStatus.toLowerCase()
    )
      return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} projects · KES 7.9M active value`}
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Filter size={12} className="mr-1" /> Filter
            </Button>
            <Button variant="primary" size="sm">
              <Plus size={12} className="mr-1" /> New Project
            </Button>
          </>
        }
      />
      <div className="px-7 py-3 flex items-center gap-3 border-b border-[#1E1E1E]">
        <SearchBox placeholder="Search projects…" className="w-56" />
        <div className="flex items-center gap-1.5 ml-2">
          {typeFilters.map((filter) => (
            <FilterPill
              key={filter}
              active={activeType === filter}
              onClick={() => setActiveType(filter)}
            >
              {filter}
            </FilterPill>
          ))}
        </div>
        <div className="ml-4 flex items-center gap-1.5">
          {statusFilters.map((filter) => (
            <FilterPill
              key={filter}
              active={activeStatus === filter}
              onClick={() => setActiveStatus(filter)}
            >
              {filter}
            </FilterPill>
          ))}
        </div>
      </div>

      <div className="px-7 py-5 grid grid-cols-3 gap-4">
        {filtered.map((project) => (
          <Link key={project.id} href={`/app/projects/${project.id}`}>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-display text-[13px] font-semibold text-white leading-tight">
                  {project.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border ${typeColors[project.type] || "bg-black-4 text-gray-4 border-black-4"}`}
                >
                  {project.type}
                </span>
                <StatusBadge variant={project.status}>
                  {project.status}
                </StatusBadge>
              </div>
              <div className="text-[11px] text-gray-5 mb-3">
                {project.client}
              </div>
              <ProgressBar value={project.progress} />
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1E1E1E]">
                <span className="text-[10px] text-gray-5">
                  {project.deadline}
                </span>
                <span className="font-display text-[11px] font-bold text-yellow">
                  {project.value}
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
