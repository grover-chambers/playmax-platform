"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Download, Plus, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import KanbanColumn from "@/components/crm/kanban-column";
import ProjectCard from "@/components/crm/project-card";
import NewProjectModal from "@/components/modals/new-project-modal";
import { createClient } from "@/lib/supabase/browser";

const typeFilters = [
  "All Types",
  "Research",
  "Branding",
  "Campaign",
  "Event",
  "Rental",
];

const stageMapping: Record<string, string> = {
  draft: "New",
  active: "Active",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
};

const reverseStageMapping: Record<string, string> = {
  New: "draft",
  Active: "active",
  "In Progress": "in_progress",
  Review: "review",
  Completed: "completed",
};

const stageOrder = ["New", "Active", "In Progress", "Review", "Completed"];

interface PipelineProject {
  id: string;
  name: string;
  client: string;
  type: string;
  status: string;
  progress: number;
  value: string;
  deadline: string;
}

const staffData = [
  { name: "Amina", role: "Lead Gen", progress: 85, projects: 12, closedValue: "KES 620K" },
  { name: "James", role: "Sales Exec", progress: 55, projects: 8, closedValue: "KES 290K" },
  { name: "Christine", role: "Junior Sales", progress: 40, projects: 5, closedValue: "KES 120K" },
];

export default function PipelinePage() {
  const [activeFilter, setActiveFilter] = useState("All Types");
  const [search, setSearch] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [projects, setProjects] = useState<PipelineProject[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        const role = userData?.user?.user_metadata?.role as string | undefined;

        let query = supabase.from("projects").select("*, clients(company)");
        if (role === "crm_staff" && userId) {
          query = query.eq("assigned_to", userId);
        }
        const { data: dbProjects, error } = await query.order("created_at", { ascending: false });
        if (error || !dbProjects) return;

        const mapped: PipelineProject[] = dbProjects.map((p) => ({
          id: p.id,
          name: p.name,
          client: p.clients?.company || "—",
          type: p.type || "Research",
          status: p.status || "draft",
          progress: p.progress || 0,
          value: p.value ? `KES ${(p.value / 1000).toFixed(0)}K` : "KES —",
          deadline: p.end_date
            ? new Date(p.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "—",
        }));
        if (!cancelled) setProjects(mapped);
      } catch { /* silent fallback */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshProjects = async () => {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      const role = userData?.user?.user_metadata?.role as string | undefined;

      let query = supabase.from("projects").select("*, clients(company)");
      if (role === "crm_staff" && userId) {
        query = query.eq("assigned_to", userId);
      }
      const { data: dbProjects, error } = await query.order("created_at", { ascending: false });
      if (error || !dbProjects) return;

      const mapped: PipelineProject[] = dbProjects.map((p) => ({
        id: p.id,
        name: p.name,
        client: p.clients?.company || "—",
        type: p.type || "Research",
        status: p.status || "draft",
        progress: p.progress || 0,
        value: p.value ? `KES ${(p.value / 1000).toFixed(0)}K` : "KES —",
        deadline: p.end_date
          ? new Date(p.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "—",
      }));
      setProjects(mapped);
    } catch { /* silent fallback */ }
  };

  const [, setUpdating] = useState<string | null>(null);

  const handleStageDrop = async (projectId: string, stageName: string) => {
    const newStatus = reverseStageMapping[stageName];
    if (!newStatus) return;
    setUpdating(projectId);
    try {
      const supabase = createClient();
      await supabase.from("projects").update({ status: newStatus }).eq("id", projectId);
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p)));
    } catch { /* silent */ }
    finally { setUpdating(null); }
  };

  const grouped = useMemo(() => {
    const result: Record<string, PipelineProject[]> = {};
    for (const stage of stageOrder) result[stage] = [];

    const filtered = projects.filter((p) => {
      if (activeFilter !== "All Types" && p.type !== activeFilter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    for (const p of filtered) {
      const stage = stageMapping[p.status] || "New";
      if (result[stage]) result[stage].push(p);
    }
    return result;
  }, [projects, activeFilter, search]);

  const totalProjects = Object.values(grouped).flat().length;

  function handleExport() {
    const rows = projects.map((p) => [
      p.name, p.client, p.type, p.status, String(p.progress) + "%", p.value, p.deadline,
    ]);
    import("@/lib/export-utils").then(({ downloadCSV }) =>
      downloadCSV(["Project", "Client", "Type", "Status", "Progress", "Value", "Deadline"], rows, "pipeline-projects"),
    );
  }

  return (
    <div>
      <PageHeader
        title="Project Pipeline"
        subtitle={`${totalProjects} projects in pipeline`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download size={12} className="mr-1" /> Export
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowNewProject(true)}>
              <Plus size={12} className="mr-1" /> New Project
            </Button>
          </>
        }
      />

      {/* ── Pipeline KPIs ── */}
      <div className="px-7 pt-5 pb-1">
        <div className="pm-dash-krow pm-dash-krow-4">
          <div className="pm-dash-kcard">
            <div className="pm-dash-kn">{projects.filter((p) => p.status === "active" || p.status === "in_progress").length}</div>
            <div className="pm-dash-kl">Active projects</div>
            <div className="pm-dash-ksub">{projects.filter((p) => p.status === "draft").length} in draft</div>
          </div>
          <div className="pm-dash-kcard grn">
            <div className="pm-dash-kn grn">{projects.filter((p) => p.status === "completed").length}</div>
            <div className="pm-dash-kl">Completed</div>
            <div className="pm-dash-ksub">{projects.filter((p) => p.status === "review").length} in review</div>
          </div>
          <div className="pm-dash-kcard red">
            <div className="pm-dash-kn red">{projects.length}</div>
            <div className="pm-dash-kl">Total projects</div>
            <div className="pm-dash-ksub" style={{ color: "var(--pm-red)" }}>
              {projects.filter((p) => p.progress < 25 && p.status !== "completed").length} behind schedule
            </div>
          </div>
          <div className="pm-dash-kcard neu">
            <div className="pm-dash-kn" style={{ color: "var(--pm-gray-3)" }}>
              {projects.filter((p) => p.status === "completed").length > 0
                ? `KES ${(
                    projects
                      .filter((p) => p.status === "completed")
                      .reduce((sum, p) => sum + (parseInt(p.value.replace(/[^0-9]/g, "")) || 0), 0) / 1000
                  ).toFixed(0)}K`
                : "—"}
            </div>
            <div className="pm-dash-kl">Completed value</div>
            <div className="pm-dash-ksub">{projects.filter((p) => p.status === "completed").length} projects done</div>
          </div>
        </div>
      </div>

      {/* ── Search & Type Filters ── */}
      <div className="px-7 py-3 flex items-center gap-3 border-b border-[#1E1E1E]">
        <SearchBox placeholder="Search projects…" className="w-56" onChange={(val) => setSearch(val)} />
        <div className="flex items-center gap-1.5 ml-2">
          {typeFilters.map((filter) => (
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
        {stageOrder.map((stage) => {
          const stageProjects = grouped[stage] || [];
          return (
            <KanbanColumn key={stage} title={stage} count={stageProjects.length} onDrop={handleStageDrop}>
              {stageProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  client={p.client}
                  type={p.type}
                  status={p.status}
                  progress={p.progress}
                  value={p.value}
                  deadline={p.deadline}
                />
              ))}
            </KanbanColumn>
          );
        })}
      </div>

      {/* ── Staff Performance + Client Health Grid ── */}
      <div className="px-7 pb-7">
        <div className="grid grid-cols-2 gap-5">
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">Staff Performance</span>
              <Link href="/app/tasks" className="text-[10px] text-yellow flex items-center gap-1 hover:underline">
                View tasks <ArrowUpRight size={10} />
              </Link>
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
                            background: staff.name === "Christine" ? "var(--pm-red)" : "var(--pm-yellow)",
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
                      <div className="pm-dash-staff-stat-n">{staff.projects}</div>
                      <div className="pm-dash-staff-stat-l">projects</div>
                    </div>
                    <div className="pm-dash-staff-stat">
                      <div className="pm-dash-staff-stat-n">{staff.closedValue}</div>
                      <div className="pm-dash-staff-stat-l">closed</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <span className="pm-dash-card-t">Client Health</span>
              {projects.length > 0 && (
                <span className="pm-dash-bdg pm-dash-bdg-r">
                  {projects.filter((p) => p.progress < 25 && p.status !== "completed").length} at risk
                </span>
              )}
            </div>
            <div className="pm-dash-card-b">
              {(() => {
                const clientMap = new Map<string, { projects: number; completed: number; progress: number }>();
                for (const p of projects) {
                  const existing = clientMap.get(p.client) || { projects: 0, completed: 0, progress: 0 };
                  existing.projects += 1;
                  if (p.status === "completed") existing.completed += 1;
                  existing.progress = Math.max(existing.progress, p.progress);
                  clientMap.set(p.client, existing);
                }
                const clients = Array.from(clientMap.entries());
                if (clients.length === 0) return <p className="text-[12px] text-gray-5 py-4">No client data yet.</p>;
                return clients.slice(0, 6).map(([name, info]) => {
                  const dot = info.completed > 0 ? "g" : info.progress >= 50 ? "g" : info.progress >= 25 ? "y" : "r";
                  const dotColors: Record<string, string> = { g: "var(--pm-green)", y: "var(--pm-yellow)", r: "var(--pm-red)" };
                  const bdgClasses: Record<string, string> = { g: "pm-dash-bdg-g", y: "pm-dash-bdg-y", r: "pm-dash-bdg-r" };
                  const statusLabels: Record<string, string> = { g: "Active", y: "Warm", r: "Cold" };
                  return (
                    <div key={name} className="pm-dash-li">
                      <div className="pm-dash-li-dot" style={{ background: dotColors[dot] }} />
                      <div className="pm-dash-li-body">
                        <div className="pm-dash-li-title">{name}</div>
                        <div className="pm-dash-li-meta">{info.projects} project{info.projects > 1 ? "s" : ""}{info.completed > 0 ? ` · ${info.completed} completed` : ""}</div>
                      </div>
                      <span className={`pm-dash-bdg ${bdgClasses[dot]}`}>{statusLabels[dot]}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      <NewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} onCreated={() => { refreshProjects(); setShowNewProject(false); }} />
    </div>
  );
}
