"use client";

import React, { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import StatusBadge from "@/components/ui/status-badge";
import PageHeader from "@/components/layout/page-header";
import Pagination from "@/components/ui/pagination";
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

const PAGE_LIMIT = 10;

export default function PortalProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/portal/projects?page=${page}&limit=${PAGE_LIMIT}`)
      .then((r) => r.json())
      .then(({ projects: data, total: t }) => {
        startTransition(() => {
          setProjects(data || []);
          setTotal(t ?? data?.length ?? 0);
          setLoading(false);
        });
      })
      .catch(() => startTransition(() => setLoading(false)));
  }, [page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-teal" />
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? "s" : ""}`}
      />

      {projects.length === 0 ? (
        <div className="pm-dash-card p-6 text-center">
          <div className="text-[12px] text-gray-4">No projects yet</div>
        </div>
      ) : (
        <div className="pm-dash-card pm-dash-card-b-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--ws-border)]">
                {["Project", "Type", "Status", "Progress", "Value", "End Date"].map((h) => (
                  <th key={h} className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => window.location.href = `/portal/projects/${p.id}`}
                  className="border-b border-[var(--ws-border)] hover:bg-[var(--ws-bg)] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3.5 text-[13px] font-semibold text-[var(--ws-text)]">{p.name}</td>
                  <td className="px-4 py-3.5 text-[12px] text-gray-4">{p.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge variant={mapStatus(p.status)}>
                      {p.status.replace(/_/g, " ")}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="bg-[var(--ws-bg)] rounded-full h-1.5 w-20 border border-[var(--ws-border)]">
                        <div
                          className="bg-teal rounded-full h-1.5"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-4 font-mono">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-display font-bold text-[var(--ws-accent)]">
                    {formatCurrency(p.value)}
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-gray-4 font-mono">{formatDate(p.end_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} total={total} limit={PAGE_LIMIT} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
