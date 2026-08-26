"use client";

import React, { useState, useEffect, startTransition, useCallback } from "react";
import { Users, Plus, Trash2, Shield, Loader2, AlertTriangle, Mail } from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import { usePortalClient } from "@/components/portal/portal-provider";

interface TeamMember {
  user_id: string;
  email: string | null;
  name: string | null;
  portal_role: string;
  is_owner: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

interface TeamResponse {
  data: TeamMember[];
  capacity: { limit: number; used: number };
}

export default function PortalTeamPage() {
  const { client, loading: clientLoading } = usePortalClient();

  const isAdmin = client?.portal_role === "admin";
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [capacity, setCapacity] = useState<{ limit: number; used: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/team");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || json.error || "Failed to load team");
      startTransition(() => {
        setMembers(json.data || []);
        setCapacity(json.capacity || null);
        setLoading(false);
        setError(null);
      });
    } catch (e) {
      startTransition(() => {
        setError(e instanceof Error ? e.message : "Failed to load team");
        setLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetchTeam();
  }, [isAdmin, fetchTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await fetch("/api/portal/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInviteError(json.error?.message || json.error || "Failed to invite");
        return;
      }
      setInviteEmail("");
      setInviteName("");
      setInviteOpen(false);
      setInviteSuccess(`Invite sent to ${inviteEmail.trim()}. They'll receive a temporary password by email.`);
      await fetchTeam();
    } catch {
      setInviteError("Failed to invite team member");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string, email: string) => {
    if (!confirm(`Remove ${email || "this member"} from the team? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/portal/team/${userId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setInviteError(json.error?.message || json.error || "Failed to remove member");
        return;
      }
      await fetchTeam();
    } catch {
      setInviteError("Failed to remove team member");
    }
  };

  const seatsLeft = capacity ? capacity.limit - capacity.used : 0;
  const atCapacity = capacity ? seatsLeft <= 0 : false;

  /* ── Non-admin / loading states ─────────────────────────── */

  if (clientLoading) {
    return (
      <div className="page-content">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={20} className="animate-spin text-[var(--ws-accent)]" />
          <span className="text-[13px] text-gray-5">Loading team…</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-content">
        <PageHeader title="Team" subtitle="Account team and access" />
        <div className="pm-dash-card p-8 text-center">
          <Shield size={24} className="mx-auto text-gray-5 mb-3" />
          <p className="text-[13px] text-gray-5">
            Only the account admin can manage the team. Contact your account administrator.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={20} className="animate-spin text-[var(--ws-accent)]" />
          <span className="text-[13px] text-gray-5">Loading team…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-[13px] text-red">{error}</span>
          <button
            onClick={fetchTeam}
            className="text-[12px] text-[var(--ws-accent)] hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content space-y-6">
      <PageHeader
        title="Team"
        subtitle={`${capacity?.used ?? 0} of ${capacity?.limit ?? "—"} seats used — manage who can access this account`}
        actions={
          <>
            <button
              onClick={() => {
                setInviteOpen(true);
                setInviteSuccess(null);
              }}
              disabled={atCapacity}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--ws-accent)] text-white text-[12px] font-semibold px-3 py-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={13} /> Invite Member
            </button>
          </>
        }
      />

      {atCapacity && (
        <div className="pm-dash-alert pm-dash-alert-b mb-2">
          <AlertTriangle size={14} className="mr-2 shrink-0" />
          Your plan allows {capacity?.limit ?? 0} team member{(capacity?.limit ?? 0) !== 1 ? "s" : ""}. Upgrade to add more seats.
        </div>
      )}

      {inviteSuccess && (
        <div className="pm-dash-alert mb-2">
          <Mail size={14} className="mr-2 shrink-0" />
          {inviteSuccess}
        </div>
      )}

      {inviteError && (
        <div className="pm-dash-alert pm-dash-alert-b mb-2">
          <AlertTriangle size={14} className="mr-2 shrink-0" />
          {inviteError}
        </div>
      )}

      {/* ── Invite form ────────────────────────────────────── */}
      {inviteOpen && (
        <div className="pm-dash-card p-5">
          <div className="text-[12px] font-semibold text-[var(--ws-text)] mb-3">
            Invite a team member
          </div>
          <p className="text-[11px] text-gray-5 mb-4 leading-relaxed">
            The invitee will receive a temporary password by email and must set their own on first
            login. New members join as <span className="font-semibold">Viewer</span>.
          </p>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Jane Wanjiru"
                className="ws-input w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-1">
                Work email
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="user@company.com"
                className="ws-input w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={inviting}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--ws-accent)] text-white text-[12px] font-semibold px-3 py-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {inviting ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                {inviting ? "Sending…" : "Send Invite"}
              </button>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="text-[12px] text-gray-5 hover:text-[var(--ws-text)] px-2 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Members table ──────────────────────────────────── */}
      <div className="pm-dash-card overflow-hidden">
        {members.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={24} className="mx-auto text-gray-5 mb-3" />
            <p className="text-[13px] text-gray-5">No team members yet.</p>
            <button
              onClick={() => setInviteOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[var(--ws-accent)] text-white text-[12px] font-semibold px-3 py-2 hover:opacity-90"
            >
              <Plus size={13} /> Invite First Member
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-mono text-gray-5 font-semibold uppercase tracking-wider border-b border-[var(--ws-border)]">
                <th className="text-left py-3 font-medium pl-5">Member</th>
                <th className="text-left py-3 font-medium">Role</th>
                <th className="text-left py-3 font-medium">Joined</th>
                <th className="text-left py-3 font-medium">Last sign-in</th>
                <th className="text-right py-3 font-medium pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const displayName = m.name || m.email || "Unknown";
                const initials = displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const joined = m.created_at
                  ? new Date(m.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })
                  : "—";
                const lastIn = m.last_sign_in_at
                  ? new Date(m.last_sign_in_at).toLocaleString("en-KE", { month: "short", day: "numeric", year: "numeric" })
                  : "Never";

                return (
                  <tr key={m.user_id} className="border-b border-[var(--ws-border)] hover:bg-[var(--ws-bg)] transition-colors">
                    <td className="py-3 pl-5">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--ws-accent)] text-white text-[11px] font-bold">
                          {initials}
                        </span>
                        <div>
                          <div className="text-[12px] text-[var(--ws-text)] font-semibold">
                            {m.name || m.email || "Unknown"}
                            {m.is_owner && (
                              <span className="ml-2 text-[10px] text-gray-5 font-normal">(Account owner)</span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-5">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`pm-dash-bdg ${m.is_owner || m.portal_role === "admin" ? "pm-dash-bdg-g" : "pm-dash-bdg-n"}`}>
                        {m.is_owner || m.portal_role === "admin" ? "ADMIN" : "VIEWER"}
                      </span>
                    </td>
                    <td className="py-3 text-[12px] text-gray-4">{joined}</td>
                    <td className="py-3 text-[12px] text-gray-4">{lastIn}</td>
                    <td className="py-3 pr-5 text-right">
                      {!m.is_owner && m.portal_role !== "admin" ? (
                        <button
                          onClick={() => handleRemove(m.user_id, m.email || m.name || "")}
                          title="Remove member"
                          className="p-1.5 rounded text-gray-5 hover:text-red hover:bg-[var(--ws-bg)] transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-5">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
