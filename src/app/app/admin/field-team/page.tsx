"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  RefreshCw,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import PageHeader from "@/components/layout/page-header";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/ui/status-badge";
import Modal from "@/components/ui/modal";
import ConfirmActionModal from "@/components/modals/confirm-action-modal";

interface Rep {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
}

interface FieldTeamError {
  error?: { code?: string; message?: string };
}

const RMS_ERROR_MESSAGES: Record<string, string> = {
  not_configured: "RMS integration is not configured on this deployment.",
  rms_unavailable:
    "The RMS service is unavailable right now. Try again shortly.",
};

function rmsErrorMessage(code: string | undefined): string {
  return (
    (code && RMS_ERROR_MESSAGES[code]) ||
    "The RMS service could not process the request."
  );
}

export default function FieldTeamPage() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Add rep modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [addError, setAddError] = useState("");
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  // Deactivate flow
  const [repToDeactivate, setRepToDeactivate] = useState<Rep | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/admin/field-team");
        if (!res.ok) throw new Error("Failed to fetch field team");
        const data: { reps: Rep[] } = await res.json();
        if (!cancelled) setReps(data.reps ?? []);
      } catch {
        if (!cancelled) {
          setReps([]);
          setError(
            "Could not load the field team. The RMS service may be unavailable.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  function openAddModal() {
    setShowAddModal(true);
    setCreatedTempPassword(null);
    setAddError("");
  }

  function closeAddModal() {
    setShowAddModal(false);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setAddError("");
    setCreatedTempPassword(null);
    setCopied(false);
  }

  async function handleCreateRep() {
    if (!newName.trim() || !newEmail.trim()) {
      setAddError("Name and email are required.");
      return;
    }
    setCreating(true);
    setAddError("");
    try {
      const res = await fetch("/api/admin/field-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          email: newEmail.trim(),
          name: newName.trim(),
          phone: newPhone.trim() || undefined,
        }),
      });
      const data: (FieldTeamError & { tempPassword?: string }) | null =
        await res.json().catch(() => null);
      if (!res.ok || !data?.tempPassword) {
        setAddError(rmsErrorMessage(data?.error?.code));
        return;
      }
      setCreatedTempPassword(data.tempPassword);
      setRefreshKey((k) => k + 1);
    } catch {
      setAddError("Could not create the rep account.");
    } finally {
      setCreating(false);
    }
  }

  async function copyTempPassword() {
    if (!createdTempPassword) return;
    try {
      await navigator.clipboard.writeText(createdTempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the password stays visible in the dialog
    }
  }

  async function handleDeactivate() {
    if (!repToDeactivate) return;
    setDeactivating(true);
    setActionError("");
    try {
      const res = await fetch("/api/admin/field-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deactivate",
          email: repToDeactivate.email,
        }),
      });
      const data: FieldTeamError | null = await res.json().catch(() => null);
      if (!res.ok) {
        setActionError(
          `Could not deactivate ${repToDeactivate.email}. ${rmsErrorMessage(data?.error?.code)}`,
        );
        return;
      }
      setRefreshKey((k) => k + 1);
    } catch {
      setActionError(
        `Could not deactivate ${repToDeactivate.email}. Try again shortly.`,
      );
    } finally {
      setDeactivating(false);
      setRepToDeactivate(null);
    }
  }

  const activeCount = reps.filter((r) => r.isActive).length;
  const inactiveCount = reps.length - activeCount;

  return (
    <div className="page-content space-y-5">
      {/* Header */}
      <PageHeader
        title="Field Team"
        subtitle={loading ? "Loading…" : `${reps.length} rep${reps.length !== 1 ? "s" : ""} provisioned in NAMPARK RMS`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={openAddModal}>
              <UserPlus className="w-3 h-3 mr-1" /> Add rep
            </Button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="ws-stat-card">
          <div className="flex items-center gap-3">
            <div className="ws-stat-icon"><Users className="w-4 h-4 text-teal" /></div>
            <div>
              <div className="ws-stat-value">{loading ? "…" : reps.length}</div>
              <div className="ws-stat-label">Total Reps</div>
            </div>
          </div>
        </div>
        <div className="ws-stat-card">
          <div className="flex items-center gap-3">
            <div className="ws-stat-icon"><Check className="w-4 h-4 text-green" /></div>
            <div>
              <div className="ws-stat-value">{loading ? "…" : activeCount}</div>
              <div className="ws-stat-label">Active</div>
            </div>
          </div>
        </div>
        <div className="ws-stat-card">
          <div className="flex items-center gap-3">
            <div className="ws-stat-icon"><Loader2 className={`w-4 h-4 text-blue ${deactivating ? "animate-spin" : ""}`} /></div>
            <div>
              <div className="ws-stat-value">{loading ? "…" : inactiveCount}</div>
              <div className="ws-stat-label">Inactive</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reps Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-5">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading field team…
        </div>
      ) : error ? (
        <div className="pm-dash-card p-8 text-center">
          <p className="text-[13px] text-[var(--pm-red)] mb-3">{error}</p>
          <Button variant="primary" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="pm-dash-card overflow-hidden">
          <table className="pm-dash-tbl w-full">
            <thead>
              <tr>
                {["Name", "Email", "Phone", "Status", "Actions"].map((h) => (
                  <th key={h} className="pm-dash-tbl-th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reps.length > 0 ? (
                reps.map((rep) => (
                  <tr key={rep.id} className="pm-dash-tbl-td">
                    <td className="pm-dash-tbl-td">
                      <span className="font-display text-[13px] font-semibold">
                        {rep.name || "—"}
                      </span>
                    </td>
                    <td className="pm-dash-tbl-td text-[12px] text-gray-4 font-mono">
                      {rep.email || "—"}
                    </td>
                    <td className="pm-dash-tbl-td text-[11px] text-gray-4 font-mono whitespace-nowrap">
                      {rep.phone || "—"}
                    </td>
                    <td className="pm-dash-tbl-td">
                      <StatusBadge variant={rep.isActive ? "active" : "draft"}>
                        {rep.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    <td className="pm-dash-tbl-td">
                      {rep.isActive ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRepToDeactivate(rep)}
                          disabled={deactivating}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <span className="text-[10px] text-gray-5 font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-[13px] text-gray-5">
                    <Users className="w-8 h-8 mx-auto mb-3 text-gray-5 opacity-40" />
                    No reps yet. Add your first field team member to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {actionError && (
        <p className="text-[11px] text-[var(--pm-red)]">{actionError}</p>
      )}

      {/* Add Rep Modal */}
      <Modal
        open={showAddModal}
        onClose={closeAddModal}
        title={createdTempPassword ? "Rep account created" : "Add rep"}
      >
        {createdTempPassword ? (
          <div className="space-y-4">
            <p className="text-[13px] text-gray-4 leading-relaxed">
              The rep account was created in RMS. Share this temporary password
              with the rep — it will only be shown once.
            </p>
            <div className="flex items-center gap-2 bg-[var(--ws-bg)] border border-[var(--ws-border)] rounded-lg px-3 py-2.5">
              <code className="flex-1 font-mono text-[14px] tracking-wider select-all">
                {createdTempPassword}
              </code>
              <button
                onClick={copyTempPassword}
                aria-label="Copy temporary password"
                className="p-1.5 rounded-lg text-[var(--ws-text-muted)] hover:bg-[var(--ws-surface)] hover:text-[var(--ws-text)] transition-colors cursor-pointer bg-transparent border-none"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="primary" size="sm" onClick={closeAddModal}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="form-label">Full name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Jane Wanjiru"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="rep@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Phone (optional)</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+254…"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            {addError && (
              <p className="text-[11px] text-[var(--pm-red)]">{addError}</p>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={closeAddModal}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateRep}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" /> Creating…
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3 mr-1" /> Create rep
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivate confirmation */}
      <ConfirmActionModal
        open={!!repToDeactivate}
        onClose={() => setRepToDeactivate(null)}
        title="Deactivate rep"
        message={`This will deactivate ${repToDeactivate?.name || repToDeactivate?.email || "this rep"}'s account in NAMPARK RMS. They will immediately lose access to the rep app. Continue?`}
        confirmLabel="Deactivate"
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
