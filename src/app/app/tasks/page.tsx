"use client";

import React, { useState } from "react";
import { Plus, CheckCircle2, Circle, Clock } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import Avatar from "@/components/ui/avatar";

interface Task {
  id: string;
  name: string;
  project: string;
  assignee: string;
  assigneeInitials: string;
  dueDate: string;
  status: "todo" | "in-progress" | "done";
  priority: "high" | "medium" | "low";
}

const tasks: Task[] = [
  { id: "1", name: "Finalize media plan", project: "Out-of-Home Campaign", assignee: "Brian Mwangi", assigneeInitials: "BM", dueDate: "Feb 5, 2026", status: "done", priority: "high" },
  { id: "2", name: "Approve creative concepts", project: "Out-of-Home Campaign", assignee: "Alice Wanjiku", assigneeInitials: "AW", dueDate: "Feb 12, 2026", status: "done", priority: "high" },
  { id: "3", name: "Conduct site surveys — Nairobi", project: "Out-of-Home Campaign", assignee: "James Kamau", assigneeInitials: "JK", dueDate: "Feb 20, 2026", status: "in-progress", priority: "high" },
  { id: "4", name: "Draft research questionnaire", project: "Safaricom Research Study", assignee: "Alice Wanjiku", assigneeInitials: "AW", dueDate: "Feb 18, 2026", status: "in-progress", priority: "medium" },
  { id: "5", name: "Brand identity presentation v2", project: "Java House Brand Refresh", assignee: "Brian Mwangi", assigneeInitials: "BM", dueDate: "Feb 25, 2026", status: "in-progress", priority: "medium" },
  { id: "6", name: "Secure billboard permits", project: "Out-of-Home Campaign", assignee: "James Kamau", assigneeInitials: "JK", dueDate: "Mar 5, 2026", status: "todo", priority: "high" },
  { id: "7", name: "Vendor negotiation — printing", project: "Out-of-Home Campaign", assignee: "Brian Mwangi", assigneeInitials: "BM", dueDate: "Mar 10, 2026", status: "todo", priority: "medium" },
  { id: "8", name: "Recruit field researchers", project: "Safaricom Research Study", assignee: "James Kamau", assigneeInitials: "JK", dueDate: "Feb 22, 2026", status: "todo", priority: "medium" },
  { id: "9", name: "Venue scouting report", project: "P&G Product Launch Event", assignee: "Alice Wanjiku", assigneeInitials: "AW", dueDate: "Mar 15, 2026", status: "todo", priority: "low" },
  { id: "10", name: "Naivas site mapping — Phase 2", project: "Naivas Billboard Network", assignee: "James Kamau", assigneeInitials: "JK", dueDate: "Mar 20, 2026", status: "todo", priority: "low" },
  { id: "11", name: "Client feedback review", project: "Haco Retail Activation", assignee: "Alice Wanjiku", assigneeInitials: "AW", dueDate: "Feb 28, 2026", status: "in-progress", priority: "high" },
  { id: "12", name: "Submit campaign brief to client", project: "Out-of-Home Campaign", assignee: "Alice Wanjiku", assigneeInitials: "AW", dueDate: "Feb 14, 2026", status: "todo", priority: "medium" },
];

const statusGroups = [
  { key: "in-progress" as const, label: "In Progress", icon: <Clock size={13} className="text-yellow" /> },
  { key: "todo" as const, label: "To Do", icon: <Circle size={13} className="text-gray-5" /> },
  { key: "done" as const, label: "Done", icon: <CheckCircle2 size={13} className="text-green" /> },
];

const priorityLabels: Record<string, string> = {
  high: "bg-red/10 text-red border-red/20",
  medium: "bg-yellow/10 text-yellow border-yellow/20",
  low: "bg-gray-4/10 text-gray-4 border-[#2A2A2A]",
};

const projectFilters = ["All Projects", "Out-of-Home Campaign", "Safaricom Research Study", "Java House Brand Refresh", "P&G Product Launch Event"];

export default function TasksPage() {
  const [activeProject, setActiveProject] = useState("All Projects");

  const filtered = activeProject === "All Projects" ? tasks : tasks.filter((t) => t.project === activeProject);

  const grouped = statusGroups.map((group) => ({
    ...group,
    tasks: filtered.filter((t) => t.status === group.key),
  }));

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`${tasks.length} tasks · ${tasks.filter((t) => t.status === "in-progress").length} in progress`}
        actions={
          <Button variant="primary" size="sm">
            <Plus size={12} className="mr-1" /> Add Task
          </Button>
        }
      />
      <div className="px-7 py-3 flex items-center gap-3 border-b border-[#1E1E1E]">
        <SearchBox placeholder="Search tasks…" className="w-56" />
        <div className="flex items-center gap-1.5 ml-2 flex-wrap">
          {projectFilters.map((filter) => (
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

      <div className="p-7 space-y-6">
        {grouped.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-2 mb-3">
              {group.icon}
              <span className="font-display text-[12px] font-semibold text-white">{group.label}</span>
              <span className="font-mono text-[9px] bg-black-4 text-gray-4 px-1.5 py-[2px] rounded-full">{group.tasks.length}</span>
            </div>
            <div className="space-y-1.5">
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 bg-[#0D0D0D] border border-[#1E1E1E] rounded-md px-4 py-3 hover:border-[#333] transition-colors"
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    task.status === "done" ? "border-green bg-green" :
                    task.status === "in-progress" ? "border-yellow" :
                    "border-[#444]"
                  }`}>
                    {task.status === "done" && <span className="block w-1.5 h-1.5 bg-black rounded-full mx-auto mt-0.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[12px] font-semibold ${task.status === "done" ? "text-gray-5 line-through" : "text-white"}`}>
                      {task.name}
                    </div>
                    <div className="text-[10px] text-gray-5 mt-0.5">{task.project}</div>
                  </div>
                  <span className={`font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border ${priorityLabels[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className="text-[10px] text-gray-5 w-24 text-right">{task.dueDate}</span>
                  <Avatar initials={task.assigneeInitials} variant="dark" size="sm" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
