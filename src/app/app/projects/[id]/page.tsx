"use client";

import React, { useState } from "react";
import { ArrowLeft, Calendar, DollarSign, FileText, Users } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import Avatar from "@/components/ui/avatar";
import ProgressBar from "@/components/ui/progress-bar";
import DocumentList from "@/components/documents/document-list";
import DocumentUpload from "@/components/documents/document-upload";

type Tab =
  | "overview"
  | "deliverables"
  | "communications"
  | "tasks"
  | "documents";

interface Deliverable {
  name: string;
  status: "active" | "review" | "draft" | "confirmed";
  dueDate: string;
  assignee: string;
}

interface Task {
  name: string;
  assignee: string;
  assigneeInitials: string;
  dueDate: string;
  done: boolean;
}

interface Document {
  name: string;
  type: string;
  date: string;
  size: string;
}

const project = {
  id: "1",
  name: "Out-of-Home Campaign",
  client: "Unga Group",
  type: "Campaign",
  status: "active" as const,
  progress: 40,
  value: "KES 1.2M",
  budget: "KES 1.2M",
  spent: "KES 480K",
  startDate: "Jan 15, 2026",
  deadline: "Apr 30, 2026",
  owner: "Brian Mwangi",
  ownerInitials: "BM",
  team: [
    { name: "Brian Mwangi", initials: "BM" },
    { name: "James Kamau", initials: "JK" },
    { name: "Alice Wanjiku", initials: "AW" },
  ],
  deliverables: [
    {
      name: "Campaign Strategy Deck",
      status: "confirmed" as const,
      dueDate: "Feb 1, 2026",
      assignee: "BM",
    },
    {
      name: "Creative Briefs — Batch 1",
      status: "active" as const,
      dueDate: "Feb 15, 2026",
      assignee: "AW",
    },
    {
      name: "Site Selection Report",
      status: "review" as const,
      dueDate: "Mar 1, 2026",
      assignee: "JK",
    },
    {
      name: "Production Assets",
      status: "draft" as const,
      dueDate: "Mar 20, 2026",
      assignee: "AW",
    },
    {
      name: "Installation & Activation",
      status: "draft" as const,
      dueDate: "Apr 15, 2026",
      assignee: "JK",
    },
  ] as Deliverable[],
  tasks: [
    {
      name: "Finalize media plan",
      assignee: "Brian Mwangi",
      assigneeInitials: "BM",
      dueDate: "Feb 5, 2026",
      done: true,
    },
    {
      name: "Approve creative concepts",
      assignee: "Alice Wanjiku",
      assigneeInitials: "AW",
      dueDate: "Feb 12, 2026",
      done: true,
    },
    {
      name: "Conduct site surveys — Nairobi",
      assignee: "James Kamau",
      assigneeInitials: "JK",
      dueDate: "Feb 20, 2026",
      done: false,
    },
    {
      name: "Secure billboard permits",
      assignee: "James Kamau",
      assigneeInitials: "JK",
      dueDate: "Mar 5, 2026",
      done: false,
    },
    {
      name: "Vendor negotiation — printing",
      assignee: "Brian Mwangi",
      assigneeInitials: "BM",
      dueDate: "Mar 10, 2026",
      done: false,
    },
    {
      name: "Submit campaign brief to client",
      assignee: "Alice Wanjiku",
      assigneeInitials: "AW",
      dueDate: "Feb 14, 2026",
      done: false,
    },
  ] as Task[],
  communications: [
    {
      type: "Email",
      from: "Grace Njoroge",
      subject: "Updated brief with site preferences",
      date: "2h ago",
    },
    {
      type: "WhatsApp",
      from: "Brian Mwangi",
      subject: "Shared site survey photos",
      date: "1d ago",
    },
    {
      type: "Note",
      from: "Alice Wanjiku",
      subject: "Creative direction references uploaded",
      date: "2d ago",
    },
  ],
  documents: [
    {
      name: "Campaign_Brief_v3.pdf",
      type: "PDF",
      date: "Feb 10, 2026",
      size: "2.4 MB",
    },
    {
      name: "Site_Map_Nairobi.png",
      type: "Image",
      date: "Feb 8, 2026",
      size: "1.1 MB",
    },
    {
      name: "Budget_Breakdown.xlsx",
      type: "Spreadsheet",
      date: "Jan 28, 2026",
      size: "340 KB",
    },
    {
      name: "Creative_Concepts_v1.pdf",
      type: "PDF",
      date: "Feb 12, 2026",
      size: "5.8 MB",
    },
  ] as Document[],
};

const tabItems: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "deliverables", label: "Deliverables" },
  { key: "communications", label: "Communications" },
  { key: "tasks", label: "Tasks" },
  { key: "documents", label: "Documents" },
];

export default function ProjectDetailPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const p = project;

  return (
    <div className="page-content">
      <PageHeader
        title={p.name}
        subtitle={`${p.client} · ${p.type} · Due ${p.deadline}`}
        actions={
          <>
            <Link href="/app/projects">
              <Button variant="secondary" size="sm">
                <ArrowLeft size={12} className="mr-1" /> Back
              </Button>
            </Link>
            <StatusBadge variant={p.status}>{p.status}</StatusBadge>
          </>
        }
      />

      <div className="pm-dash-krow pm-dash-krow-4 px-7 py-4 border-b border-[#1E1E1E]">
        <div className="pm-dash-kcard flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black-4 flex items-center justify-center">
            <Calendar size={15} className="text-yellow" />
          </div>
          <div>
            <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
              Timeline
            </div>
            <div className="text-[12px] text-white font-semibold">
              {p.startDate} — {p.deadline}
            </div>
          </div>
        </div>
        <div className="pm-dash-kcard flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black-4 flex items-center justify-center">
            <DollarSign size={15} className="text-yellow" />
          </div>
          <div>
            <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
              Budget
            </div>
            <div className="text-[12px] text-white font-semibold">
              {p.spent} / {p.budget}
            </div>
          </div>
        </div>
        <div className="pm-dash-kcard flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black-4 flex items-center justify-center">
            <Users size={15} className="text-yellow" />
          </div>
          <div>
            <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
              Team
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {p.team.map((t) => (
                <Avatar
                  key={t.initials}
                  initials={t.initials}
                  variant="yellow"
                  size="sm"
                />
              ))}
              <span className="text-[11px] text-gray-4 ml-1">
                {p.team.length} members
              </span>
            </div>
          </div>
        </div>
        <div className="pm-dash-kcard flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black-4 flex items-center justify-center">
            <FileText size={15} className="text-yellow" />
          </div>
          <div>
            <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider">
              Progress
            </div>
            <div className="text-[12px] text-white font-semibold">
              {p.progress}% complete
            </div>
          </div>
        </div>
      </div>

      <div className="px-7 py-3 flex items-center gap-1 border-b border-[#1E1E1E]">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-[12px] px-4 py-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "text-yellow border-yellow"
                : "text-gray-4 border-transparent hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pm-dash-card pm-dash-card-b">
        {activeTab === "overview" && (
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 space-y-5">
              <div className="pm-dash-card p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Deliverables
                </h3>
                <div className="space-y-3">
                  {p.deliverables.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between py-2 border-b border-[#1E1E1E] last:border-0"
                    >
                      <div>
                        <div className="text-[12px] font-semibold text-white">
                          {d.name}
                        </div>
                        <div className="text-[10px] text-gray-5 mt-0.5">
                          Due {d.dueDate} ·{" "}
                          <Avatar
                            initials={d.assignee}
                            variant="dark"
                            size="sm"
                            className="inline -mt-0.5"
                          />
                        </div>
                      </div>
                      <StatusBadge variant={d.status}>{d.status}</StatusBadge>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pm-dash-card p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Progress
                </h3>
                <ProgressBar value={p.progress} label={`${p.progress}%`} />
                <div className="mt-4 text-[11px] text-gray-5">
                  Budget utilization: {p.spent} of {p.budget}
                </div>
              </div>
            </div>
            <div className="space-y-5">
              <div className="pm-dash-card p-5">
                <h3 className="font-display text-[13px] font-semibold mb-4">
                  Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Type
                    </div>
                    <span className="font-mono text-[8px] font-bold px-1.5 py-[2px] rounded-full border bg-yellow/10 text-yellow border-yellow/20">
                      {p.type}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Client
                    </div>
                    <span className="text-[12px] text-gray-3">{p.client}</span>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Project Lead
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar
                        initials={p.ownerInitials}
                        variant="yellow"
                        size="sm"
                      />
                      <span className="text-[12px] text-gray-3">{p.owner}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-0.5">
                      Value
                    </div>
                    <span className="font-display text-[18px] font-bold text-yellow">
                      {p.value}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "deliverables" && (
          <div className="pm-dash-card p-5">
            <div className="space-y-3">
              {p.deliverables.map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between py-3 border-b border-[#1E1E1E] last:border-0"
                >
                  <div>
                    <div className="text-[12px] font-semibold text-white">
                      {d.name}
                    </div>
                    <div className="text-[10px] text-gray-5 mt-0.5">
                      Due {d.dueDate}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar initials={d.assignee} variant="dark" size="sm" />
                    <StatusBadge variant={d.status}>{d.status}</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "communications" && (
          <div className="pm-dash-card p-5">
            <div className="space-y-4">
              {p.communications.map((c, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 py-3 border-b border-[#1E1E1E] last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-black-4 flex items-center justify-center text-[10px] font-mono text-yellow flex-shrink-0">
                    {c.type[0]}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] text-white font-semibold">
                      {c.subject}
                    </div>
                    <div className="text-[10px] text-gray-5 mt-0.5">
                      {c.type} · {c.from}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-5 flex-shrink-0">
                    {c.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="pm-dash-card p-5">
            <div className="space-y-2">
              {p.tasks.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2.5 border-b border-[#1E1E1E] last:border-0"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${t.done ? "bg-yellow border-yellow" : "border-[#444]"}`}
                  >
                    {t.done && (
                      <span className="text-[8px] text-black font-bold">✓</span>
                    )}
                  </div>
                  <div
                    className={`text-[12px] flex-1 ${t.done ? "text-gray-5 line-through" : "text-white"}`}
                  >
                    {t.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar
                      initials={t.assigneeInitials}
                      variant="dark"
                      size="sm"
                    />
                    <span className="text-[10px] text-gray-5 w-24 text-right">
                      {t.dueDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="pm-dash-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[12px] font-semibold text-white">Project Documents</span>
              <DocumentUpload projectId={p.id} clientId={p.client} onUploaded={() => {}} />
            </div>
            <DocumentList projectId={p.id} canManage={true} />
          </div>
        )}
      </div>
    </div>
  );
}
