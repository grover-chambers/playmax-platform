"use client";

import React, { useState, useEffect, useCallback, startTransition } from "react";
import Pagination, { usePagination } from "@/components/ui/pagination";
import { Plus, Mail, UserCheck, UserX, Loader2, Users } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import { createClient } from "@/lib/supabase/browser";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/types";
import type { UserRole, StaffMember } from "@/lib/types";

const roleFilters = [
  "All",
  "super_admin",
  "cms_admin",
  "crm_admin",
  "crm_staff",
  "finance",
];

const roleBadgeMap: Record<string, string> = {
  super_admin: "pm-dash-bdg-g",
  cms_admin: "pm-dash-bdg-b",
  crm_admin: "pm-dash-bdg-y",
  crm_staff: "pm-dash-bdg-n",
  finance: "pm-dash-bdg-b",
};

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("crm_staff");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const loadStaff = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      const data = await res.json();
      setStaff(data.staff ?? []);
      setPage(1);
    } catch {
      setError("Could not load staff. Try refreshing.");
      setStaff([]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadStaff();
      startTransition(() => setLoading(false));
    };
    init();
  }, [loadStaff]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.admin.inviteUserByEmail(
        inviteEmail,
        {
          data: {
            name: inviteName,
            role: inviteRole,
          },
        },
      );

      if (error) {
        setInviteError(error.message);
      } else {
        setInviteSuccess(`Invitation sent to ${inviteEmail}`);
        setInviteEmail("");
        setInviteName("");
        setInviteRole("crm_staff");
        setTimeout(() => setShowInvite(false), 2000);
        loadStaff();
      }
    } catch {
      setInviteError("Failed to send invitation. Check your permissions.");
    } finally {
      setInviting(false);
    }
  };

  async function toggleStatus(member: StaffMember) {
    const newStatus = member.status === "active" ? "inactive" : "active";
    setStaff((prev) =>
      prev.map((m) =>
        m.id === member.id ? { ...m, status: newStatus } : m,
      ),
    );
    try {
      await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      setStaff((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, status: member.status } : m,
        ),
      );
    }
  }

  async function updateRole(member: StaffMember, newRole: string) {
    const prevRole = member.role;
    setStaff((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, role: newRole as StaffMember["role"] } : m)),
    );
    try {
      await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
    } catch {
      setStaff((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, role: prevRole } : m,
        ),
      );
    }
  }

  const filtered = staff.filter((m) => {
    if (roleFilter !== "All" && m.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const { paginated, total } = usePagination(filtered, page, 20);
  const activeCount = staff.filter((s) => s.status === "active").length;

  return (
    <div className="page-content space-y-5">
      <PageHeader
        title="Staff Management"
        subtitle={`${activeCount} active · ${staff.length} total`}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowInvite(true)}
          >
            <Plus size={12} className="mr-1" /> Invite Staff
          </Button>
        }
      />

      {/* ── KPI row ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="ws-stat-card">
          <div className="flex items-center gap-3">
            <div className="ws-stat-icon"><Users className="w-4 h-4 text-teal" /></div>
            <div>
              <div className="ws-stat-value">{loading ? "…" : staff.length}</div>
              <div className="ws-stat-label">Total Staff</div>
            </div>
          </div>
        </div>
        <div className="ws-stat-card">
          <div className="flex items-center gap-3">
            <div className="ws-stat-icon"><UserCheck className="w-4 h-4 text-green" /></div>
            <div>
              <div className="ws-stat-value">{loading ? "…" : activeCount}</div>
              <div className="ws-stat-label">Active</div>
            </div>
          </div>
        </div>
        <div className="ws-stat-card">
          <div className="flex items-center gap-3">
            <div className="ws-stat-icon"><UserX className="w-4 h-4 text-red" /></div>
            <div>
              <div className="ws-stat-value">{loading ? "…" : staff.length - activeCount}</div>
              <div className="ws-stat-label">Inactive</div>
            </div>
          </div>
        </div>
        <div className="ws-stat-card">
          <div className="flex items-center gap-3">
            <div className="ws-stat-icon"><Mail className="w-4 h-4 text-blue" /></div>
            <div>
              <div className="ws-stat-value">{loading ? "…" : new Set(staff.map((s) => s.role)).size}</div>
              <div className="ws-stat-label">Roles Used</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-[var(--ws-border)]">
        <SearchBox
          placeholder="Search staff…"
          value={search}
          onChange={(val) => { setSearch(val); setPage(1); }}
          className="w-56"
        />
        <div className="flex items-center gap-1.5">
          {roleFilters.map((filter) => (
            <FilterPill
              key={filter}
              active={roleFilter === filter}
              onClick={() => { setRoleFilter(filter); setPage(1); }}
            >
              {filter === "All" ? "All Roles" : ROLE_LABELS[filter as UserRole]}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* ── Invite modal ───────────────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="ws-panel w-full max-w-md mx-4 p-6 shadow-2xl">
            <h3 className="pm-dash-card-t mb-1">
              Invite Staff Member
            </h3>
            <p className="text-[11px] text-gray-5 mb-5">
              They&apos;ll receive an email to set up their account.
            </p>

            {inviteError && (
              <div className="pm-dash-bdg pm-dash-bdg-r w-full text-left px-4 py-2.5 rounded mb-4">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="pm-dash-bdg pm-dash-bdg-g w-full text-left px-4 py-2.5 rounded mb-4">
                {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Wanjiku"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  placeholder="jane@marketlink.co.ke"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="form-select"
                >
                  {Object.entries(ROLE_LABELS)
                    .filter(([key]) => key !== "client")
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-gray-5 mt-1.5 leading-relaxed">
                  {ROLE_DESCRIPTIONS[inviteRole]}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowInvite(false);
                    setInviteError("");
                    setInviteSuccess("");
                  }}
                  className="flex-1 justify-center text-[12px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={inviting}
                  className="flex-1 justify-center text-[12px]"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-3 h-3" /> Send Invite
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Staff table ────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-5">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading staff...
        </div>
      ) : error ? (
        <div className="pm-dash-card p-8 text-center">
          <p className="text-[13px] text-[var(--pm-red)] mb-3">{error}</p>
          <Button variant="primary" size="sm" onClick={loadStaff}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="pm-dash-card overflow-hidden">
          <table className="pm-dash-tbl w-full">
            <thead>
              <tr className="pm-dash-tbl-th">
                {["Name", "Email", "Role", "Status", "Joined", "Actions"].map(
                  (h) => (
                    <th key={h} className="pm-dash-tbl-th">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {paginated.map((member) => (
                <tr key={member.id} className="pm-dash-tbl-td">
                  <td className="pm-dash-tbl-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[rgba(15,118,110,0.15)] text-[var(--pm-teal)] flex items-center justify-center font-display text-[11px] font-bold">
                        {member.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <span className="pm-dash-staff-name">
                        {member.name}
                      </span>
                    </div>
                  </td>
                  <td className="pm-dash-tbl-td font-mono text-[11px] text-gray-4">
                    {member.email}
                  </td>
                  <td className="pm-dash-tbl-td">
                    <select
                      value={member.role}
                      onChange={(e) => updateRole(member, e.target.value)}
                      className={`pm-dash-bdg border-none cursor-pointer text-[10px] appearance-none px-2 py-0.5 rounded outline-none ${roleBadgeMap[member.role] || "pm-dash-bdg-n"}`}
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5' fill='%23888'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 4px center", paddingRight: "18px" }}
                    >
                      {Object.entries(ROLE_LABELS)
                        .filter(([k]) => k !== "client")
                        .map(([key, label]) => (
                          <option key={key} value={key} className="bg-[#1A1A1A] text-gray-3">
                            {label}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="pm-dash-tbl-td">
                    <span
                      className={`pm-dash-bdg ${
                        member.status === "active"
                          ? "pm-dash-bdg-g"
                          : "pm-dash-bdg-n"
                      }`}
                    >
                      {member.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="pm-dash-tbl-td text-[11px] text-gray-5 font-mono">
                    {member.createdAt}
                  </td>
                  <td className="pm-dash-tbl-td">
                    <button
                      onClick={() => toggleStatus(member)}
                      className={`pm-dash-qa-btn py-1! px-2.5! text-[10px] ${
                        member.status === "active"
                          ? "hover:text-[var(--pm-red)]!"
                          : "hover:text-[var(--pm-green)]!"
                      }`}
                      title={
                        member.status === "active" ? "Deactivate" : "Activate"
                      }
                    >
                      {member.status === "active" ? (
                        <UserX className="w-3 h-3" />
                      ) : (
                        <UserCheck className="w-3 h-3" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-[13px] text-gray-5">
              No staff match your search or filter.
            </div>
          )}
          <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
