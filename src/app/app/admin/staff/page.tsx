"use client";

import React, { useState, useEffect, startTransition } from "react";
import { Plus, Mail, UserCheck, UserX, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import SearchBox from "@/components/ui/search-box";
import FilterPill from "@/components/ui/filter-pill";
import { createClient } from "@/utils/supabase/client";
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

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("crm_staff");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  async function loadStaff() {
    const supabase = createClient();
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      const demoStaff: StaffMember[] = [
        {
          id: "1",
          email: currentUser?.email || "admin@marketlink.co.ke",
          name: currentUser?.user_metadata?.name || "Current User",
          role: (currentUser?.user_metadata?.role as UserRole) || "super_admin",
          status: "active",
          createdAt: "2026-01-15",
        },
        {
          id: "2",
          email: "brian@marketlink.co.ke",
          name: "Brian Mwangi",
          role: "crm_admin",
          status: "active",
          createdAt: "2026-01-20",
        },
        {
          id: "3",
          email: "amina@marketlink.co.ke",
          name: "Amina Mohamed",
          role: "crm_staff",
          status: "active",
          createdAt: "2026-02-01",
        },
        {
          id: "4",
          email: "joy@marketlink.co.ke",
          name: "Joy Kariuki",
          role: "cms_admin",
          status: "active",
          createdAt: "2026-02-15",
        },
        {
          id: "5",
          email: "finance@marketlink.co.ke",
          name: "Peter Odhiambo",
          role: "finance",
          status: "inactive",
          createdAt: "2026-03-01",
        },
      ];

      setStaff(demoStaff);
    } catch {
      setStaff([]);
    }
  }

  // Load initial staff data
  useEffect(() => {
    const init = async () => {
      await loadStaff();
      startTransition(() => setLoading(false));
    };
    init();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviting(true);

    try {
      const supabase = createClient();
      // Use Supabase Admin API to create user with role metadata
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

  function toggleStatus(member: StaffMember) {
    setStaff((prev) =>
      prev.map((m) =>
        m.id === member.id
          ? { ...m, status: m.status === "active" ? "inactive" : "active" }
          : m,
      ),
    );
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

  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle={`${staff.filter((s) => s.status === "active").length} active · ${staff.length} total`}
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

      <div className="px-7 py-3 flex items-center gap-3 border-b border-[#1E1E1E]">
        <SearchBox
          placeholder="Search staff…"
          value={search}
          onChange={setSearch}
          className="w-56"
        />
        <div className="flex items-center gap-1.5">
          {roleFilters.map((filter) => (
            <FilterPill
              key={filter}
              active={roleFilter === filter}
              onClick={() => setRoleFilter(filter)}
            >
              {filter === "All" ? "All Roles" : ROLE_LABELS[filter as UserRole]}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-black-2 border border-[#333] rounded-xl p-6 w-full max-w-md mx-4 shadow-lg">
            <h3 className="font-display text-[16px] font-bold mb-1">
              Invite Staff Member
            </h3>
            <p className="text-[11px] text-gray-5 mb-5">
              They&apos;ll receive an email to set up their account.
            </p>

            {inviteError && (
              <div className="bg-red/10 border border-red/20 text-red text-[12px] px-4 py-2.5 rounded mb-4">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="bg-green/10 border border-green/20 text-green text-[12px] px-4 py-2.5 rounded mb-4">
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
                <button
                  type="button"
                  onClick={() => {
                    setShowInvite(false);
                    setInviteError("");
                    setInviteSuccess("");
                  }}
                  className="btn-secondary flex-1 justify-center text-[12px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="btn-sm-primary flex-1 justify-center text-[12px] disabled:opacity-60"
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
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff table */}
      <div className="px-7 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-5">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading staff...
          </div>
        ) : (
          <div className="bg-black-2 border border-[#252525] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A1A1A]">
                  {["Name", "Email", "Role", "Status", "Joined", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-[#1A1A1A] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow/15 text-yellow flex items-center justify-center font-display text-[11px] font-bold">
                          {member.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <span className="font-display text-[13px] font-semibold text-white">
                          {member.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-4 font-mono">
                      {member.email}
                    </td>
                    <td className="px-4 py-3">
                      <span className="intent-tag text-[9px]">
                        {ROLE_LABELS[member.role] || member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          member.status === "active"
                            ? "badge-available"
                            : "badge-draft"
                        }`}
                      >
                        {member.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-5 font-mono">
                      {member.createdAt}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(member)}
                        className={`btn-sm !py-1 !px-2.5 text-[10px] ${
                          member.status === "active"
                            ? "hover:!bg-red/10 hover:!text-red"
                            : "hover:!bg-green/10 hover:!text-green"
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
          </div>
        )}
      </div>
    </div>
  );
}
