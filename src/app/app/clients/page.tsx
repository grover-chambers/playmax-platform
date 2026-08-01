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
import { formatTimeAgo } from "@/lib/utils";
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



const industryFilters = ["All", "FMCG", "Telecom", "Retail", "F&B", "AgriTech"];

export default function ClientsPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
      (async () => {
        try {
          const supabase = createClient();
          const { data: dbClients, error } = await supabase
            .from("clients")
            .select("*, profiles!clients_assigned_to_fkey(full_name)")
            .order("updated_at", { ascending: false });
          if (error || !dbClients || dbClients.length === 0) return;
          const mapped: Client[] = dbClients.map((c) => {
            const ownerName = c.profiles?.full_name || "Unassigned";
            const initials = ownerName === "Unassigned" ? "UA" : ownerName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            return {
            id: c.id,
            company: c.name || c.company,
            industry: c.industry || "—",
            owner: ownerName,
            ownerInitials: initials,
            activeProjects: 0,
            totalValue: "KES —",
            lastActivity: formatTimeAgo(c.updated_at),
            status: (c.status === "active" ? "active" : c.status === "inactive" ? "draft" : "review") as "active" | "review" | "draft",
          };
        });
        setData(mapped);
        setPage(1);
      } catch (e) { setError(e instanceof Error ? e.message : "Failed to load clients"); }
      finally { setLoading(false); }
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
    <div className="page-content space-y-5">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-5 text-[13px]">Loading clients…</div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-red text-[13px]">{error}</div>
      ) : (
      <>
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
      <div className="flex items-center gap-3 border-b border-[var(--ws-border)] pb-3">
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
            className={`p-1.5 rounded cursor-pointer transition-colors ${view === "list" ? "text-[var(--ws-accent)]" : "text-gray-5 hover:text-gray-8"}`}
          >
            <List size={14} />
          </button>
          <button
            onClick={() => setView("grid")}
            className={`p-1.5 rounded cursor-pointer transition-colors ${view === "grid" ? "text-[var(--ws-accent)]" : "text-gray-5 hover:text-gray-8"}`}
          >
            <Grid3X3 size={14} />
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div className="ws-panel overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-mono text-gray-5 font-semibold uppercase tracking-wider border-b border-[var(--ws-border)]">
                <th className="text-left py-3 px-4 font-medium">Company</th>
                <th className="text-left py-3 px-4 font-medium">Industry</th>
                <th className="text-left py-3 px-4 font-medium">Account Owner</th>
                <th className="text-center py-3 px-4 font-medium">
                  Active Projects
                </th>
                <th className="text-right py-3 px-4 font-medium">Total Value</th>
                <th className="text-right py-3 px-4 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-[var(--ws-border)] hover:bg-[var(--ws-bg)] transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <Link
                      href={`/app/clients/${client.id}`}
                      className="font-display text-[13px] font-semibold text-[var(--ws-text)] hover:text-[var(--ws-accent)] transition-colors"
                    >
                      {client.company}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-[12px] text-gray-4">
                    {client.industry}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Avatar
                        initials={client.ownerInitials}
                        variant="yellow"
                        size="sm"
                      />
                      <span className="text-[12px] text-gray-4">
                        {client.owner}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-mono text-[11px] text-[var(--ws-text)]">
                      {client.activeProjects}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-display text-[12px] font-semibold text-[var(--ws-accent)]">
                    {client.totalValue}
                  </td>
                  <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {paginated.map((client) => (
            <Link key={client.id} href={`/app/clients/${client.id}`}>
              <div className="ws-panel p-5 hover:border-[var(--ws-accent)] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display text-[13px] font-semibold text-[var(--ws-text)]">
                    {client.company}
                  </span>
                  <StatusBadge variant={client.status}>
                    {client.status}
                  </StatusBadge>
                </div>
                <div className="text-[11px] text-gray-5 mb-2">
                  {client.industry}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--ws-border)]">
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
                  <span className="font-display text-[11px] font-bold text-[var(--ws-accent)]">
                    {client.totalValue}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className="pb-5">
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>
      </>
      )}
    </div>
  );
}
