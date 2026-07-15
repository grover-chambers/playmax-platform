"use client";

import React, { useState, useEffect, startTransition } from "react";
import StatusBadge from "@/components/ui/status-badge";
import { Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  value: number;
  progress: number;
  start_date: string | null;
  end_date: string | null;
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

function mapStatus(status: string): "active" | "review" | "draft" | "confirmed" {
  switch (status) {
    case "active":
    case "in_progress":
      return "active";
    case "review":
      return "review";
    case "completed":
      return "confirmed";
    default:
      return "draft";
  }
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PortalProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/projects")
      .then((r) => r.json())
      .then(({ projects: data }) => {
        startTransition(() => {
          setProjects(data || []);
          setLoading(false);
        });
      })
      .catch(() => startTransition(() => setLoading(false)));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-teal" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold">Projects</h1>
        <p className="text-xs text-gray-4 mt-0.5">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-black-2 border border-[#252525] rounded-lg p-8 text-center text-[13px] text-gray-4">
          No projects yet
        </div>
      ) : (
        <div className="bg-black-2 border border-[#252525] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1A]">
                {["Project", "Type", "Status", "Progress", "Value", "End Date"].map((h) => (
                  <th key={h} className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-[#1A1A1A] transition-colors">
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-white">{p.name}</td>
                  <td className="px-4 py-3.5 text-[12px] text-gray-4">{p.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge variant={mapStatus(p.status)}>
                      {p.status.replace(/_/g, " ")}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="bg-black-3 rounded-full h-1.5 w-20 border border-[#1E1E1E]">
                        <div
                          className="bg-teal rounded-full h-1.5"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-4 font-mono">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-display font-bold text-yellow">
                    {formatCurrency(p.value)}
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-gray-4 font-mono">{formatDate(p.end_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
