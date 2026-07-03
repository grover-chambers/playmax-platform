"use client";

import React from "react";
import StatusBadge from "@/components/ui/status-badge";

interface Project {
  name: string;
  status: string;
  statusVariant: "active" | "review" | "draft" | "confirmed";
  progress: number;
  value: string;
  start: string;
  end: string;
}

const projects: Project[] = [
  { name: "Westlands Screen Package", status: "In Progress", statusVariant: "active", progress: 65, value: "KES 255,000", start: "01 Jul 2026", end: "30 Sep 2026" },
  { name: "Campaign Expansion", status: "Starting", statusVariant: "review", progress: 10, value: "KES 890,000", start: "15 Jul 2026", end: "30 Nov 2026" },
  { name: "Market Research — Q1 FMCG Report", status: "Completed", statusVariant: "confirmed", progress: 100, value: "KES 340,000", start: "01 Jan 2026", end: "31 Mar 2026" },
];

export default function PortalProjectsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold">Projects</h1>
        <p className="text-xs text-gray-4 mt-0.5">
          {projects.length} projects for P&G East Africa
        </p>
      </div>

      <div className="bg-black-2 border border-[#252525] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1A1A1A]">
              {["Project", "Status", "Progress", "Value", "Start", "End"].map(
                (h) => (
                  <th
                    key={h}
                    className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.name}
                className="border-b border-[#1A1A1A] hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3.5 text-[13px] font-semibold text-white">
                  {project.name}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge variant={project.statusVariant}>
                    {project.status}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="bg-black-3 rounded-full h-1.5 w-20 border border-[#1E1E1E]">
                      <div
                        className="bg-yellow rounded-full h-1.5"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-4 font-mono">
                      {project.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[13px] font-display font-bold text-yellow">
                  {project.value}
                </td>
                <td className="px-4 py-3.5 text-[12px] text-gray-4 font-mono">
                  {project.start}
                </td>
                <td className="px-4 py-3.5 text-[12px] text-gray-4 font-mono">
                  {project.end}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
