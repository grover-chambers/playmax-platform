"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Users, Plus, Trash2, Shield, ShieldOff, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/layout/page-header";
import Avatar from "@/components/ui/avatar";
import Button from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

interface ClientUserRow {
  id: string;
  user_id: string;
  portal_role: string;
  created_at: string;
  profiles: { full_name: string | null; email: string | null } | null;
}

interface ClientInfo {
  id: string;
  name: string;
  company: string | null;
}

export default function ClientUsersPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;

  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [users, setUsers] = useState<ClientUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "viewer">("viewer");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/users`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch");
      setUsers(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    }
  };

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data: cData } = await supabase
          .from("clients")
          .select("id, name, company")
          .eq("id", clientId)
          .maybeSingle();

        if (!cancelled && cData) {
          setClientInfo(cData as ClientInfo);
        }

        const userRes = await fetch(`/api/clients/${clientId}/users`);
        const userJson = await userRes.json();
        if (!cancelled) setUsers(userJson.data || []);
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [clientId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);

    try {
      const res = await fetch(`/api/clients/${clientId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), portal_role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInviteError(json.error || "Failed to invite");
        return;
      }
      setInviteEmail("");
      setInviteRole("viewer");
      setShowInvite(false);
      await fetchUsers();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: "admin" | "viewer") => {
    try {
      const res = await fetch(`/api/clients/${clientId}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal_role: newRole }),
      });
      if (res.ok) await fetchUsers();
    } catch {
      // silent
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this user from the client?")) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchUsers();
    } catch {
      // silent
    }
  };

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
            onClick={() => router.push("/app/clients")}
            className="text-[12px] text-[var(--ws-accent)] hover:underline"
          >
            ← Back to clients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content space-y-5">
      <PageHeader
        title={`Team — ${clientInfo?.company || clientInfo?.name || "Client"}`}
        subtitle={`${users.length} member${users.length !== 1 ? "s" : ""} with portal access`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => router.push(`/app/clients/${clientId}`)}>
              <ArrowLeft size={12} className="mr-1" /> Back
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}>
              <Plus size={12} className="mr-1" /> Invite User
            </Button>
          </>
        }
      />

      {/* ── Invite Form ────────────────────────── */}
      {showInvite && (
        <div className="ws-panel">
          <div className="ws-panel-h">
            <span className="ws-panel-t">Invite User</span>
          </div>
          <div className="ws-panel-b">
            <form onSubmit={handleInvite} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-1">
                  Email
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
              <div className="w-36">
                <label className="block text-[10px] text-gray-5 uppercase font-mono tracking-wider mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "viewer")}
                  className="ws-select w-full"
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button variant="primary" type="submit" disabled={inviting}>
                {inviting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                {inviting ? "Sending…" : "Send Invite"}
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() => { setShowInvite(false); setInviteError(null); }}
              >
                Cancel
              </Button>
            </form>
            {inviteError && (
              <div className="mt-2 text-[12px] text-red">{inviteError}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Users Table ─────────────────────────── */}
      <div className="ws-panel overflow-hidden">
        {users.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={24} className="mx-auto text-gray-5 mb-3" />
            <p className="text-[13px] text-gray-5">No users linked to this client yet.</p>
            <Button variant="primary" size="sm" className="mt-3" onClick={() => setShowInvite(true)}>
              <Plus size={12} className="mr-1" /> Invite First User
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-mono text-gray-5 font-semibold uppercase tracking-wider border-b border-[var(--ws-border)]">
                <th className="text-left py-3 font-medium pl-5">User</th>
                <th className="text-left py-3 font-medium">Role</th>
                <th className="text-left py-3 font-medium">Joined</th>
                <th className="text-right py-3 font-medium pr-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const name = u.profiles?.full_name || u.profiles?.email || "Unknown";
                const email = u.profiles?.email || "—";
                const initials = name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                const joinedDate = new Date(u.created_at).toLocaleDateString("en-KE", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <tr
                    key={u.id}
                    className="border-b border-[var(--ws-border)] hover:bg-[var(--ws-bg)] transition-colors"
                  >
                    <td className="py-3 pl-5">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={initials} variant="yellow" size="sm" />
                        <div>
                          <div className="text-[12px] text-[var(--ws-text)] font-semibold">{name}</div>
                          <div className="text-[11px] text-gray-5">{email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`pm-dash-bdg ${u.portal_role === "admin" ? "pm-dash-bdg-g" : "pm-dash-bdg-n"}`}>
                        {u.portal_role === "admin" ? "ADMIN" : "VIEWER"}
                      </span>
                    </td>
                    <td className="py-3 text-[12px] text-gray-4">{joinedDate}</td>
                    <td className="py-3 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            handleUpdateRole(
                              u.user_id,
                              u.portal_role === "admin" ? "viewer" : "admin",
                            )
                          }
                          title={u.portal_role === "admin" ? "Demote to viewer" : "Promote to admin"}
                          className="p-1.5 rounded text-gray-5 hover:text-[var(--ws-accent)] hover:bg-[var(--ws-bg)] transition-colors cursor-pointer"
                        >
                          {u.portal_role === "admin" ? <ShieldOff size={13} /> : <Shield size={13} />}
                        </button>
                        <button
                          onClick={() => handleRemove(u.user_id)}
                          title="Remove user"
                          className="p-1.5 rounded text-gray-5 hover:text-red hover:bg-[var(--ws-bg)] transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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
