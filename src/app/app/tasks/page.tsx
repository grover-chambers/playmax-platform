"use client";

import React, { useState, useEffect, startTransition } from "react";
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import Avatar from "@/components/ui/avatar";
import NewTaskModal from "@/components/modals/new-task-modal";
import { createClient } from "@/lib/supabase/browser";
import { uuidInitials } from "@/lib/utils";
import Pagination, { usePagination } from "@/components/ui/pagination";

interface Task {
  id: string;
  name: string;
  project: string;
  assignee: string;
  assigneeInitials: string;
  dueDate: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  priority: "high" | "medium" | "low";
}



const statusGroups = [
  {
    key: "in_progress" as const,
    label: "In Progress",
    icon: <Clock size={13} className="text-[var(--ws-accent)]" />,
  },
  {
    key: "todo" as const,
    label: "To Do",
    icon: <Circle size={13} className="text-gray-5" />,
  },
  {
    key: "done" as const,
    label: "Done",
    icon: <CheckCircle2 size={13} className="text-green" />,
  },
  {
    key: "blocked" as const,
    label: "Blocked",
    icon: <AlertTriangle size={13} className="text-red" />,
  },
];

const priorityLabels: Record<string, string> = {
  high: "bg-red/10 text-red border-red/20",
  medium: "bg-[var(--ws-accent)]/10 text-[var(--ws-accent)] border-[var(--ws-accent)]/20",
  low: "bg-gray-4/10 text-gray-4 border-[var(--ws-border)]",
};

function buildProjectFilters(tasks: Task[]): string[] {
  const names = Array.from(new Set(tasks.map((t) => t.project).filter(Boolean)));
  return ["All Projects", ...names.slice(0, 5)];
}

export default function TasksPage() {
  const [activeProject, setActiveProject] = useState("All Projects");
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: dbTasks, error } = await supabase
          .from("tasks")
          .select("*, projects(name)")
          .order("created_at", { ascending: false });
        if (error || !dbTasks || dbTasks.length === 0) return;
        const mapped: Task[] = dbTasks.map((t) => ({
          id: t.id,
          name: t.title,
          project: (t as unknown as { projects: { name: string }[] }).projects?.[0]?.name || "—",
          assignee: t.assigned_to || "Unassigned",
          assigneeInitials: uuidInitials(t.assigned_to || ""),
          dueDate: t.due_date ? new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
          status: (t.status === "in_progress" || t.status === "done" || t.status === "blocked" ? t.status : "todo") as Task["status"],
          priority: (["high", "medium", "low"].includes(t.priority) ? t.priority : "medium") as Task["priority"],
        }));
        setData(mapped);
      } catch (e) { setError(e instanceof Error ? e.message : "Failed to load tasks"); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered =
    data.filter((t) => {
      if (activeProject !== "All Projects" && t.project !== activeProject) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

  useEffect(() => { startTransition(() => { setPage(1); }); }, [activeProject, search]);

  const { paginated, total } = usePagination(filtered, page, 20);

  const grouped = statusGroups.map((group) => ({
    ...group,
    tasks: paginated.filter((t) => t.status === group.key),
  }));

  return (
    <div className="page-content space-y-5">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-5 text-[13px]">Loading tasks…</div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-red text-[13px]">{error}</div>
      ) : (
      <>
      <PageHeader
        title="Tasks"
        subtitle={`${data.length} tasks · ${data.filter((t) => t.status === "in_progress").length} in progress`}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            <Plus size={12} className="mr-1" /> Add Task
          </Button>
        }
      />
      <div className="flex items-center gap-3 border-b border-[var(--ws-border)] pb-3">
        <SearchBox placeholder="Search tasks…" className="w-56" value={search} onChange={(val) => setSearch(val)} />
        <div className="flex items-center gap-1.5 ml-2 flex-wrap">
          {buildProjectFilters(data).map((filter) => (
            <FilterPill
              key={filter}
              active={activeProject === filter}
              onClick={() => setActiveProject(filter)}
            >
              {filter}
            </FilterPill>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {grouped.map((group) => (
          <div key={group.key} className="ws-panel">
            <div className="ws-panel-h">
              <div className="flex items-center gap-2">
                {group.icon}
                <span className="ws-panel-t">
                  {group.label}
                </span>
                <span className="font-mono text-[9px] bg-[var(--ws-bg)] text-gray-4 px-1.5 py-[2px] rounded-full">
                  {group.tasks.length}
                </span>
              </div>
            </div>
            <div className="ws-panel-b space-y-1.5">
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 px-4 py-3 hover:border-[var(--ws-accent)] transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      task.status === "done"
                        ? "border-green bg-green"
                        : task.status === "in_progress"
                          ? "border-[var(--ws-accent)]"
                          : "border-[var(--ws-border)]"
                    }`}
                  >
                    {task.status === "done" && (
                      <span className="block w-1.5 h-1.5 bg-white rounded-full mx-auto mt-0.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[12px] font-semibold ${task.status === "done" ? "text-gray-5 line-through" : "text-[var(--ws-text)]"}`}
                    >
                      {task.name}
                    </div>
                    <div className="text-[10px] text-gray-5 mt-0.5">
                      {task.project}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border ${priorityLabels[task.priority]}`}
                  >
                    {task.priority}
                  </span>
                  <span className="text-[10px] text-gray-5 w-24 text-right">
                    {task.dueDate}
                  </span>
                  <Avatar
                    initials={task.assigneeInitials}
                    variant="dark"
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />

      <NewTaskModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
      )}
    </div>
  );
}
