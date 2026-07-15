"use client";

import React, { useMemo, useState, useEffect, startTransition } from "react";
import { Plus, Download, Grid3X3, List } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import Avatar from "@/components/ui/avatar";
import StatusBadge from "@/components/ui/status-badge";
import NewClientModal from "@/components/modals/new-client-modal";
import { downloadCSV } from "@/lib/export-utils";
import { createClient } from "@/lib/supabase/browser";
import { formatTimeAgo, uuidInitials } from "@/lib/utils";
import Pagination, { usePagination } from "@/components/ui/pagination";

interface Client {
  id: string;
  company: string;
  industry: string;
  owner: string;
  ownerInitials: string;
  activeProjects: number;
  totalValue: string;
  lastActivity: string;
  status: "active" | "review" | "draft";
}

const clients: Client[] = [
  {
    id: "1",
    company: "Unga Group",
    industry: "FMCG / Manufacturing",
    owner: "Brian Mwangi",
    ownerInitials: "BM",
    activeProjects: 3,
    totalValue: "KES 2.4M",
    lastActivity: "2h ago",
    status: "active",
  },
  {
    id: "2",
    company: "Bidco Africa",
    industry: "FMCG / Manufacturing",
    owner: "James Kamau",
    ownerInitials: "JK",
    activeProjects: 1,
    totalValue: "KES 890K",
    lastActivity: "5h ago",
    status: "active",
  },
  {
    id: "3",
    company: "Safaricom",
    industry: "Telecommunications",
    owner: "Alice Wanjiku",
    ownerInitials: "AW",
    activeProjects: 2,
    totalValue: "KES 1.8M",
    lastActivity: "1d ago",
    status: "active",
  },
  {
    id: "4",
    company: "Java House",
    industry: "Food & Beverage",
    owner: "Brian Mwangi",
    ownerInitials: "BM",
    activeProjects: 2,
    totalValue: "KES 1.5M",
    lastActivity: "3h ago",
    status: "active",
  },
  {
    id: "5",
    company: "Naivas",
    industry: "Retail",
    owner: "James Kamau",
    ownerInitials: "JK",
    activeProjects: 1,
    totalValue: "KES 620K",
    lastActivity: "2d ago",
    status: "review",
  },
  {
    id: "6",
    company: "P&G East Africa",
    industry: "FMCG / Manufacturing",
    owner: "Alice Wanjiku",
    ownerInitials: "AW",
    activeProjects: 2,
    totalValue: "KES 3.1M",
    lastActivity: "6h ago",
    status: "active",
  },
  {
    id: "7",
    company: "Twiga Foods",
    industry: "AgriTech / Distribution",
    owner: "Brian Mwangi",
    ownerInitials: "BM",
    activeProjects: 1,
    totalValue: "KES 450K",
    lastActivity: "1d ago",
    status: "review",
  },
  {
    id: "8",
    company: "Kenchic",
    industry: "Food / Agriculture",
    owner: "Alice Wanjiku",
    ownerInitials: "AW",
    activeProjects: 1,
    totalValue: "KES 680K",
    lastActivity: "4d ago",
    status: "active",
  },
  {
    id: "9",
    company: "Haco Industries",
    industry: "FMCG / Manufacturing",
    owner: "James Kamau",
    ownerInitials: "JK",
    activeProjects: 1,
    totalValue: "KES 340K",
    lastActivity: "3d ago",
    status: "draft",
  },
  {
    id: "10",
    company: "Kevian Kenya",
    industry: "FMCG / Beverages",
    owner: "Brian Mwangi",
    ownerInitials: "BM",
    activeProjects: 1,
    totalValue: "KES 380K",
    lastActivity: "5d ago",
    status: "review",
  },
];

const industryFilters = ["All", "FMCG", "Telecom", "Retail", "F&B", "AgriTech"];

export default function ClientsPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [data, setData] = useState<Client[]>(clients);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: dbClients, error } = await supabase
          .from("clients")
          .select("*")
          .order("updated_at", { ascending: false });
        if (error || !dbClients || dbClients.length === 0) return;
        const mapped: Client[] = dbClients.map((c) => ({
          id: c.id,
          company: c.name || c.company,
          industry: c.industry || "—",
          owner: c.assigned_to || "Unassigned",
          ownerInitials: uuidInitials(c.assigned_to || ""),
          activeProjects: 0,
          totalValue: "KES —",
          lastActivity: formatTimeAgo(c.updated_at),
          status: (c.status === "active" ? "active" : c.status === "inactive" ? "draft" : "review") as "active" | "review" | "draft",
        }));
        setData(mapped);
        setPage(1);
      } catch { /* silent fallback to hardcoded */ }
    })();
  }, []);

  useEffect(() => { startTransition(() => { setPage(1); }); }, [activeFilter, search]);

  const filtered = useMemo(() => {
    return data.filter((c) => {
      if (activeFilter !== "All" && !c.industry.startsWith(activeFilter)) return false;
      if (search && !c.company.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [activeFilter, search, data]);

  const { paginated, total } = usePagination(filtered, page, 20);

  const totalValue = filtered.reduce((acc, c) => {
    const num = parseInt(c.totalValue.replace(/[^0-9]/g, ""));
    return acc + (isNaN(num) ? 0 : num);
  }, 0);

  function handleExport() {
    const rows = filtered.map((c) => [
      c.company, c.industry, c.owner, String(c.activeProjects), c.totalValue, c.lastActivity, c.status,
    ]);
    downloadCSV(
      ["Company", "Industry", "Account Owner", "Active Projects", "Total Value", "Last Activity", "Status"],
      rows,
      "clients",
    );
  }

  return (
    <div>
      <NewClientModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <PageHeader
        title="Clients"
        subtitle={`${filtered.length} accounts · KES ${totalValue.toLocaleString()} total value`}
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
              <Plus size={12} className="mr-1" /> Add Client
            </Button>
          </>
        }
      />
      <div className="px-7 py-3 flex items-center gap-3 border-b border-[#1E1E1E]">
        <SearchBox
          placeholder="Search clients…"
          className="w-56"
          value={search}
          onChange={(val) => setSearch(val)}
        />
        <div className="flex items-center gap-1.5 ml-2">
          {industryFilters.map((filter) => (
            <FilterPill
              key={filter}
              active={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </FilterPill>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setView("list")}
            className={`p-1.5 rounded cursor-pointer transition-colors ${view === "list" ? "text-yellow" : "text-gray-5 hover:text-white"}`}
          >
            <List size={14} />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded cursor-pointer transition-colors ${view === "grid" ? "text-yellow" : "text-gray-5 hover:text-white"}`}
          >
            <Grid3X3 size={14} />
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div className="px-7 py-4">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-mono text-gray-5 uppercase tracking-wider border-b border-[#1E1E1E]">
                <th className="text-left py-2.5 font-medium">Company</th>
                <th className="text-left py-2.5 font-medium">Industry</th>
                <th className="text-left py-2.5 font-medium">Account Owner</th>
                <th className="text-center py-2.5 font-medium">
                  Active Projects
                </th>
                <th className="text-right py-2.5 font-medium">Total Value</th>
                <th className="text-right py-2.5 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-[#1A1A1A] hover:bg-white/2 transition-colors cursor-pointer"
                >
                  <td className="py-3">
                    <Link
                      href={`/app/clients/${client.id}`}
                      className="font-display text-[13px] font-semibold text-white hover:text-yellow transition-colors"
                    >
                      {client.company}
                    </Link>
                  </td>
                  <td className="py-3 text-[12px] text-gray-4">
                    {client.industry}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Avatar
                        initials={client.ownerInitials}
                        variant="yellow"
                        size="sm"
                      />
                      <span className="text-[12px] text-gray-3">
                        {client.owner}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-center">
                    <span className="font-mono text-[11px] text-white">
                      {client.activeProjects}
                    </span>
                  </td>
                  <td className="py-3 text-right font-display text-[12px] font-semibold text-yellow">
                    {client.totalValue}
                  </td>
                  <td className="py-3 text-right flex items-center justify-end gap-2">
                    <StatusBadge variant={client.status}>
                      {client.status}
                    </StatusBadge>
                    <span className="text-[11px] text-gray-5">
                      {client.lastActivity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-7 py-5 grid grid-cols-3 gap-4">
          {paginated.map((client) => (
            <Link key={client.id} href={`/app/clients/${client.id}`}>
              <div className="bg-[#0D0D0D] border border-[#252525] rounded-lg p-4 hover:border-yellow transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-[13px] font-semibold">
                    {client.company}
                  </span>
                  <StatusBadge variant={client.status}>
                    {client.status}
                  </StatusBadge>
                </div>
                <div className="text-[11px] text-gray-5 mb-2">
                  {client.industry}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#1E1E1E]">
                  <div className="flex items-center gap-1.5">
                    <Avatar
                      initials={client.ownerInitials}
                      variant="yellow"
                      size="sm"
                    />
                    <span className="text-[11px] text-gray-4">
                      {client.owner}
                    </span>
                  </div>
                  <span className="font-display text-[11px] font-bold text-yellow">
                    {client.totalValue}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="px-7 pb-5">
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
