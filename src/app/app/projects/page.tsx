"use client";

import React, { useMemo, useState, useEffect, startTransition } from "react";
import { Plus, Download } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import StatusBadge from "@/components/ui/status-badge";
import ProgressBar from "@/components/ui/progress-bar";
import NewProjectModal from "@/components/modals/new-project-modal";
import { downloadCSV } from "@/lib/export-utils";
import { createClient } from "@/lib/supabase/browser";
import Pagination, { usePagination } from "@/components/ui/pagination";

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

function fmtDeadline(d: string): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProjectsPage() {
  const [activeType, setActiveType] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All Statuses");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [data, setData] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

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
        if (error || !dbProjects) throw new Error(error?.message || "Failed to load projects");
        if (dbProjects.length === 0) {
          if (role === "crm_staff" && !cancelled) setData([]);
          return;
        }
        const mapped: Project[] = dbProjects.map((p) => ({
          id: p.id,
          name: p.name,
          client: p.clients?.company || p.client || "—",
          type: p.type || "Research",
          status: (["active", "review", "draft", "confirmed"].includes(p.status) ? p.status : "draft") as Project["status"],
          progress: p.progress || 0,
          value: p.value ? `KES ${((p.value ?? 0) / 1000).toFixed(0)}K` : "KES —",
          deadline: fmtDeadline(p.deadline),
        }));
        if (!cancelled) setData(mapped);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load projects"); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Reload when modal closes after creation
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
      if (dbProjects.length === 0) {
        if (role === "crm_staff") setData([]);
        return;
      }
      const mapped: Project[] = dbProjects.map((p) => ({
        id: p.id,
        name: p.name,
        client: p.clients?.company || p.client || "—",
        type: p.type || "Research",
        status: (["active", "review", "draft", "confirmed"].includes(p.status) ? p.status : "draft") as Project["status"],
        progress: p.progress || 0,
        value: p.value ? `KES ${((p.value ?? 0) / 1000).toFixed(0)}K` : "KES —",
        deadline: fmtDeadline(p.deadline),
      }));
      setData(mapped);
    } catch { /* silent fallback */ }
  };

  const filtered = useMemo(() => {
    return data.filter((p) => {
      if (activeType !== "All" && p.type !== activeType) return false;
      if (activeStatus !== "All Statuses" && p.status !== activeStatus.toLowerCase()) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [activeType, activeStatus, search, data]);

  useEffect(() => { startTransition(() => { setPage(1); }); }, [activeType, activeStatus, search]);

  const { paginated, total } = usePagination(filtered, page, 20);

  function handleExport() {
    const rows = filtered.map((p) => [p.name, p.client, p.type, p.status, String(p.progress) + "%", p.value, p.deadline]);
    downloadCSV(["Project", "Client", "Type", "Status", "Progress", "Value", "Deadline"], rows, "projects");
  }

  return (
    <div className="page-content">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-5 text-[13px]">Loading projects…</div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-red text-[13px]">{error}</div>
      ) : (
      <>
      <PageHeader
        title="Projects"
        subtitle={`${filtered.length} of ${data.length} projects`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download size={12} className="mr-1" /> Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalOpen(true)}
            >
              <Plus size={12} className="mr-1" /> New Project
            </Button>
          </>
        }
      />
      <div className="px-7 py-3 flex items-center gap-3 border-b border-white/5">
        <SearchBox placeholder="Search projects…" className="w-56" onChange={(val) => setSearch(val)} />
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

      <div className="py-5 grid grid-cols-3 gap-4">
        {paginated.map((project) => (
          <Link key={project.id} href={`/workspace/${project.id}`}>
            <div className="pm-dash-card pm-dash-card-b-0">
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
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5">
                <span className="text-[10px] text-gray-5">
                  {project.deadline}
                </span>
                <span className="font-display text-[11px] font-bold text-yellow">
                  {project.value}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={refreshProjects} />
      </>
      )}
    </div>
  );
}
