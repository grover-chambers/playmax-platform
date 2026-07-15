"use client";

import { useState } from "react";
import { Eye, LogOut, ExternalLink, Monitor, Smartphone } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";

const clientAccounts = [
  { id: "c1", name: "Bidco Africa", industry: "FMCG / Manufacturing", owner: "Amina Mwangi", projectCount: 3, lastActive: "2h ago" },
  { id: "c2", name: "Safaricom", industry: "Telecommunications", owner: "James Kariuki", projectCount: 2, lastActive: "1d ago" },
  { id: "c3", name: "Java House", industry: "Food & Beverage", owner: "Amina Mwangi", projectCount: 2, lastActive: "5h ago" },
  { id: "c4", name: "P&G East Africa", industry: "FMCG / Manufacturing", owner: "Christine Kamau", projectCount: 1, lastActive: "3d ago" },
  { id: "c5", name: "Unga Group", industry: "FMCG / Manufacturing", owner: "James Kariuki", projectCount: 1, lastActive: "1w ago" },
  { id: "c6", name: "Naivas", industry: "Retail", owner: "Amina Mwangi", projectCount: 2, lastActive: "Just now" },
  { id: "c7", name: "Kevian Kenya", industry: "Beverage", owner: "Christine Kamau", projectCount: 1, lastActive: "2w ago" },
  { id: "c8", name: "Twiga Foods", industry: "Agriculture / Logistics", owner: "James Kariuki", projectCount: 1, lastActive: "4d ago" },
];

export default function PreviewClientPage() {
  const [search, setSearch] = useState("");
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const filtered = clientAccounts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--ws-bg)" }}>
      {previewing ? (
        /* ── Preview Mode ── */
        <div className="min-h-screen flex flex-col">
          {/* Exit preview banner */}
          <div className="bg-yellow/10 border-b border-yellow/20 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-yellow" />
              <span className="text-[12px] text-yellow font-medium">
                Previewing as <strong>{previewing}</strong>
              </span>
              <span className="text-[10px] text-yellow/60 font-mono">
                Client Portal View
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === "desktop" ? "mobile" : "desktop")}
                className="btn-sm bg-transparent border border-yellow/30 text-yellow hover:bg-yellow/10 cursor-pointer"
              >
                {viewMode === "desktop" ? (
                  <Smartphone className="w-3.5 h-3.5" />
                ) : (
                  <Monitor className="w-3.5 h-3.5" />
                )}
                {viewMode === "desktop" ? "Mobile" : "Desktop"}
              </button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewing(null)}
              >
                <LogOut className="w-3.5 h-3.5" />
                Exit preview
              </Button>
            </div>
          </div>

          {/* Preview frame */}
          <div
            className={`flex-1 flex items-start justify-center overflow-y-auto p-6 ${
              viewMode === "mobile" ? "bg-[var(--ws-bg)]" : "bg-[var(--ws-bg)]"
            }`}
          >
            <div
              className={`bg-black border border-[#1e1e1e] rounded-lg ${
                viewMode === "mobile"
                  ? "w-[375px] min-h-[700px]"
                  : "w-full max-w-4xl"
              }`}
            >
              {/* Mock client portal header */}
              <div className="border-b border-[#1e1e1e] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-display text-[14px] font-bold">
                      PLAY<span className="text-yellow">MAX</span>
                    </span>
                    <span className="text-[10px] text-gray-5 ml-3 font-mono">
                      Client Portal
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-yellow/20 flex items-center justify-center text-[10px] font-bold text-yellow">
                      {previewing?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock content */}
              <div className="p-5 space-y-5">
                <div>
                  <h2 className="font-display text-[16px] font-bold">
                    Welcome back, {previewing?.split(" ")[0]}
                  </h2>
                  <p className="text-[11px] text-gray-5 mt-1">
                    Here&apos;s what&apos;s happening with your projects.
                  </p>
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Active Projects", value: "3", color: "text-yellow" },
                    { label: "Completed", value: "7", color: "text-green" },
                    { label: "Unread Messages", value: "2", color: "text-blue" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-black-2 border border-[#252525] rounded-lg p-3">
                      <div className={`font-display text-[20px] font-bold ${kpi.color}`}>
                        {kpi.value}
                      </div>
                      <div className="text-[10px] text-gray-5 mt-1">{kpi.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recent reports */}
                <div className="bg-black-2 border border-[#252525] rounded-lg p-4">
                  <h3 className="text-[12px] font-semibold mb-3">
                    Recent Reports & Deliverables
                  </h3>
                  {[
                    {
                      title: "Nairobi Market Sizing Report",
                      date: "Updated 3 days ago",
                      badge: "New",
                    },
                    {
                      title: "Competitor Landscape Analysis",
                      date: "Updated 1 week ago",
                      badge: "View",
                    },
                    {
                      title: "Q3 Advertising Effectiveness Survey",
                      date: "Updated 2 weeks ago",
                      badge: "View",
                    },
                  ].map((r) => (
                    <div
                      key={r.title}
                      className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a] last:border-b-0"
                    >
                      <div>
                        <div className="text-[12px] font-medium">{r.title}</div>
                        <div className="text-[10px] text-gray-5">{r.date}</div>
                      </div>
                      <span className="text-[10px] font-mono text-yellow bg-yellow/10 px-2 py-0.5 rounded-full">
                        {r.badge}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Recent invoices */}
                <div className="bg-black-2 border border-[#252525] rounded-lg p-4">
                  <h3 className="text-[12px] font-semibold mb-3">Invoices</h3>
                  {[
                    { inv: "INV-2026-004", amount: "KES 580,000", status: "Pending" },
                    { inv: "INV-2026-001", amount: "KES 320,000", status: "Paid" },
                  ].map((inv) => (
                    <div
                      key={inv.inv}
                      className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-b-0"
                    >
                      <div className="text-[11px]">{inv.inv}</div>
                      <div className="text-[11px] font-display font-semibold">
                        {inv.amount}
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          inv.status === "Paid"
                            ? "text-green bg-green/10"
                            : "text-yellow bg-yellow/10"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Messages preview */}
                <div className="bg-black-2 border border-[#252525] rounded-lg p-4">
                  <h3 className="text-[12px] font-semibold mb-3">
                    Messages from your team
                  </h3>
                  {[
                    {
                      from: "Amina Mwangi",
                      msg: "Your Q3 market report is ready for review on the portal.",
                      time: "2h ago",
                    },
                    {
                      from: "James Kariuki",
                      msg: "We've scheduled the billboard installation for next Tuesday.",
                      time: "1d ago",
                    },
                  ].map((m) => (
                    <div
                      key={m.time}
                      className="flex gap-2.5 py-2 border-b border-[#1a1a1a] last:border-b-0"
                    >
                      <div className="w-6 h-6 rounded-full bg-yellow/20 flex items-center justify-center text-[8px] font-bold text-yellow flex-shrink-0">
                        {m.from.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium">{m.from}</div>
                        <div className="text-[10px] text-gray-5 truncate">
                          {m.msg}
                        </div>
                        <div className="text-[9px] text-gray-5 font-mono mt-0.5">
                          {m.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Client Selection ── */
        <div className="p-6">
          <PageHeader
            title="Preview Client Portal"
            subtitle="Select a client account to preview their exact portal view"
            actions={
              <Button variant="secondary" size="sm" disabled>
                <ExternalLink className="w-3.5 h-3.5" />
                Open in new tab
              </Button>
            }
          />

          {/* Search */}
          <div className="px-7 py-4 border-b border-[#1e1e1e]">
            <input
              type="text"
              placeholder="Search client accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input max-w-xs"
            />
          </div>

          {/* Client grid */}
          <div className="p-7 grid grid-cols-2 gap-4">
            {filtered.map((client) => (
              <button
                key={client.id}
                onClick={() => setPreviewing(client.name)}
                className="bg-black-2 border border-[#252525] rounded-lg p-5 text-left hover:border-yellow/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow/10 flex items-center justify-center font-display text-[13px] font-bold text-yellow">
                      {client.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold">{client.name}</div>
                      <div className="text-[11px] text-gray-5">{client.industry}</div>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-gray-5 group-hover:text-yellow transition-colors" />
                </div>
                <div className="flex items-center gap-4 text-[11px] text-gray-5">
                  <span>
                    Account manager:{" "}
                    <span className="text-gray-3">{client.owner}</span>
                  </span>
                  <span>
                    {client.projectCount} project{client.projectCount !== 1 ? "s" : ""}
                  </span>
                  <span className="font-mono">{client.lastActive}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
