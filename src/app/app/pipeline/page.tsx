"use client";

import React, { useMemo, useState, useEffect, startTransition } from "react";
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
import Pagination, { usePagination } from "@/components/ui/pagination";

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



export default function PipelinePage() {
  const [activeFilter, setActiveFilter] = useState("All Types");
  const [search, setSearch] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [projects, setProjects] = useState<PipelineProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientPage, setClientPage] = useState(1);

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
          value: p.value ? `KES ${((p.value ?? 0) / 1000).toFixed(0)}K` : "KES —",
          deadline: p.end_date
            ? new Date(p.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "—",
        }));
        if (!cancelled) setProjects(mapped);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load pipeline"); }
      finally { if (!cancelled) setLoading(false); }
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
        value: p.value ? `KES ${((p.value ?? 0) / 1000).toFixed(0)}K` : "KES —",
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

  const clientHealthList = useMemo(() => {
    const clientMap = new Map<string, { projects: number; completed: number; progress: number }>();
    for (const p of projects) {
      const existing = clientMap.get(p.client) || { projects: 0, completed: 0, progress: 0 };
      existing.projects += 1;
      if (p.status === "completed") existing.completed += 1;
      existing.progress = Math.max(existing.progress, p.progress);
      clientMap.set(p.client, existing);
    }
    return Array.from(clientMap.entries());
  }, [projects]);

  const { paginated: paginatedClients, total: totalClients } = usePagination(clientHealthList, clientPage, 20);

  useEffect(() => { startTransition(() => { setClientPage(1); }); }, [projects]);

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
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-5 text-[13px]">Loading pipeline…</div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-red text-[13px]">{error}</div>
      ) : (
      <>
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
                      .reduce((sum, p) => sum + (parseInt((p.value ?? "0").replace(/[^0-9]/g, "")) || 0), 0) / 1000
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
              {projects.length === 0 ? (
                <p className="text-[12px] text-gray-5 py-4">No staff data yet.</p>
              ) : (
                (() => {
                  const staffMap = new Map<string, { progress: number; projects: number; closedValue: number }>();
                  projects.forEach(p => {
                    const staff = p.client || "Unassigned";
                    const existing = staffMap.get(staff) || { progress: 0, projects: 0, closedValue: 0 };
                    existing.projects += 1;
                    if (p.status === "completed") existing.closedValue += parseInt((p.value ?? "0").replace(/[^0-9]/g, "")) || 0;
                    existing.progress = Math.max(existing.progress, p.progress);
                    staffMap.set(staff, existing);
                  });
                  return Array.from(staffMap.entries()).slice(0, 5).map(([name, info]) => (
                    <div key={name} className="pm-dash-staff-row">
                      <div className="pm-dash-staff-info">
                        <div className="pm-dash-staff-name">{name}</div>
                        <div className="pm-dash-staff-role">{info.projects} project{info.projects !== 1 ? "s" : ""}</div>
                        <div className="pm-dash-prog-wrap">
                          <div className="pm-dash-prog-track">
                            <div className="pm-dash-prog-fill" style={{ width: `${info.progress}%`, background: "var(--pm-yellow)" }} />
                          </div>
                          <div className="pm-dash-prog-lbl"><span>{info.progress}%</span></div>
                        </div>
                      </div>
                    </div>
                  ));
                })()
              )}
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
              {paginatedClients.length === 0 ? (
                <p className="text-[12px] text-gray-5 py-4">No client data yet.</p>
              ) : (
                <>{paginatedClients.map(([name, info]) => {
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
                })}
                  <Pagination page={clientPage} pageSize={20} total={totalClients} onPageChange={setClientPage} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <NewProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} onCreated={() => { refreshProjects(); setShowNewProject(false); }} />
      </>
      )}
    </div>
  );
}
