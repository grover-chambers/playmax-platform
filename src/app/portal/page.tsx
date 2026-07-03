"use client";

import React from "react";
import StatCard from "@/components/ui/stat-card";
import StatusBadge from "@/components/ui/status-badge";
import { FolderKanban, FileCheck, Receipt, MessageSquare, ArrowRight, Clock } from "lucide-react";

const activeProjects = [
  { name: "Westlands Screen Package", status: "In Progress" as const, progress: 65, value: "KES 255K" },
  { name: "Campaign Expansion", status: "Starting" as const, progress: 10, value: "KES 890K" },
];

const recentActivity = [
  { text: "New deliverable uploaded: Campaign Creative Deck", time: "2h ago" },
  { text: "Invoice INV-2026-002 sent", time: "1d ago" },
  { text: "Project status updated to In Progress", time: "3d ago" },
  { text: "Welcome call completed", time: "5d ago" },
];

export default function PortalOverviewPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold">
          Welcome back, P&G East Africa
        </h1>
        <p className="text-sm text-gray-4 mt-1">
          Here&rsquo;s a summary of your active engagements with PlayMax.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard value="3" label="Active Projects" />
        <StatCard value="7" label="Deliverables" />
        <StatCard value="KES 255,000" label="Outstanding" />
        <StatCard value="2" label="Messages" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-bold">
              Active Projects
            </h2>
            <button className="text-[11px] text-yellow font-semibold flex items-center gap-1 hover:underline">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {activeProjects.map((project) => (
              <div
                key={project.name}
                className="bg-black-3 border border-black-4 rounded-lg px-5 py-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <FolderKanban size={16} className="text-yellow" />
                    <span className="font-display text-[13px] font-semibold">
                      {project.name}
                    </span>
                  </div>
                  <StatusBadge variant={project.progress > 50 ? "active" : "review"}>
                    {project.status}
                  </StatusBadge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-black-3 rounded-full h-1.5 w-20 border border-[#1E1E1E]">
                      <div
                        className="bg-yellow rounded-full h-1.5"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-4">
                      {project.progress}%
                    </span>
                  </div>
                  <span className="font-display text-[13px] font-bold text-yellow">
                    {project.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-bold">Recent Activity</h2>
          </div>
          <div className="bg-black-3 border border-black-4 rounded-lg divide-y divide-[#1E1E1E]">
            {recentActivity.map((item, i) => (
              <div key={i} className="px-4 py-3">
                <p className="text-[12px] text-gray-1 leading-relaxed">
                  {item.text}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock size={10} className="text-gray-5" />
                  <span className="text-[10px] text-gray-5 font-mono">
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
