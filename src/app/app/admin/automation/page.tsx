"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Zap,
  ToggleLeft,
  ToggleRight,
  History,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import StatusBadge from "@/components/ui/status-badge";
import Pagination, { usePagination } from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/browser";

/* ── Types ─────────────────────────────────────────────── */

interface AutomationRule {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
  last_triggered_at: string | null;
  created_at: string;
}

/* ── Helpers ───────────────────────────────────────────── */

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── Page ──────────────────────────────────────────────── */

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showNewRule, setShowNewRule] = useState(false);
  const [showLog, setShowLog] = useState(false);

  /* ── Load automations from Supabase ──────────────────── */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("automations")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!cancelled) setRules(data ?? []);
      } catch {
        if (!cancelled) setRules([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Toggle rule enabled/disabled ────────────────────── */

  const toggleRule = async (id: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;

    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: newEnabled } : r))
    );

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("automations")
        .update({ enabled: newEnabled })
        .eq("id", id);

      if (error) throw error;
    } catch {
      // Revert on failure
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: currentEnabled } : r))
      );
    }
  };

  /* ── Derived data ────────────────────────────────────── */

  const activeCount = rules.filter((r) => r.enabled).length;
  const pausedCount = rules.filter((r) => !r.enabled).length;
  const { paginated, total } = usePagination(rules, page, 20);

  /* ── Loading state ───────────────────────────────────── */

  if (loading) {
    return (
      <div className="page-content">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-[18px] font-bold">Automation Rules</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-24 text-gray-5">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading automations…
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[18px] font-bold">Automation Rules</h1>
          <p className="text-[11px] text-gray-5 mt-0.5">
            {activeCount} active · {rules.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowLog(true)}>
            <History className="w-3.5 h-3.5" />
            Run log
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowNewRule(true)}>
            <Plus className="w-3.5 h-3.5" />
            New rule
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="pm-dash-krow pm-dash-krow-4 mb-6">
        <div className="pm-dash-kcard">
          <div className="pm-dash-kn">{activeCount}</div>
          <div className="pm-dash-kl">Active rules</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="pm-dash-kn grn">{rules.length}</div>
          <div className="pm-dash-kl">Total rules</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="pm-dash-kn blu">{pausedCount}</div>
          <div className="pm-dash-kl">Paused</div>
        </div>
        <div className="pm-dash-kcard">
          <div className="pm-dash-kn red">0</div>
          <div className="pm-dash-kl">Errors</div>
        </div>
      </div>

      {/* Rules list */}
      <div className="pm-dash-card pm-dash-card-b-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1A1A1A]">
              {["Rule", "Type", "Status", "Last Triggered", "Toggle"].map((h) => (
                <th
                  key={h}
                  className="font-mono text-[9px] text-gray-5 tracking-widest uppercase text-left px-4 py-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-gray-5">
                  No automation rules yet. Create your first rule to get started.
                </td>
              </tr>
            ) : (
              paginated.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-[#1A1A1A] hover:bg-white/[.02] transition-colors items-center"
                >
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium">{rule.name}</div>
                    {rule.config && Object.keys(rule.config).length > 0 && (
                      <div className="text-[10px] text-gray-5 mt-0.5 font-mono">
                        {rule.config.trigger && (
                          <span className="pm-dash-bdg pm-dash-bdg-y text-[8px] mr-1">
                            {String(rule.config.trigger)}
                          </span>
                        )}
                        {rule.config.action && (
                          <>
                            <span className="text-gray-5 mx-1">→</span>
                            <span className="text-[10px] text-gray-4">
                              {String(rule.config.action)}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="pm-dash-bdg pm-dash-bdg-n text-[9px]">{rule.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      variant={rule.enabled ? "active" : "review"}
                    >
                      {rule.enabled ? "active" : "paused"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-gray-5 font-mono">
                    {timeAgo(rule.last_triggered_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRule(rule.id, rule.enabled)}
                      className="cursor-pointer bg-transparent border-none"
                      title={rule.enabled ? "Pause rule" : "Enable rule"}
                    >
                      {rule.enabled ? (
                        <ToggleRight className="w-5 h-5 text-green" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>

      {/* ── New Rule Modal ──────────────────────────────── */}
      <Modal open={showNewRule} onClose={() => setShowNewRule(false)} title="New Automation Rule">
        <div className="w-full max-w-lg mx-auto">
          <div className="pm-dash-card">
            <div className="pm-dash-card-h flex items-center justify-between">
              <h2 className="font-display text-[15px] font-bold">New Automation Rule</h2>
              <button
                onClick={() => setShowNewRule(false)}
                className="text-gray-5 hover:text-white bg-transparent border-none cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">Rule name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. New lead WhatsApp acknowledgement"
                />
              </div>
              <div>
                <label className="form-label">Type</label>
                <select className="form-select">
                  <option value="notification">Notification</option>
                  <option value="assignment">Assignment</option>
                  <option value="reminder">Reminder</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="escalation">Escalation</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="secondary" size="sm" onClick={() => setShowNewRule(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={async () => {
                    // TODO: Collect form values and insert into automations table
                    setShowNewRule(false);
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Create rule
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Run Log Modal ───────────────────────────────── */}
      <Modal open={showLog} onClose={() => setShowLog(false)} title="Trigger Log">
        <div className="w-full max-w-lg mx-auto">
          <div className="pm-dash-card">
            <div className="pm-dash-card-h flex items-center justify-between">
              <h2 className="font-display text-[15px] font-bold">Trigger Log</h2>
              <button
                onClick={() => setShowLog(false)}
                className="text-gray-5 hover:text-white bg-transparent border-none cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>
            <div>
              {rules.filter((r) => r.last_triggered_at).length === 0 ? (
                <div className="py-8 text-center text-[13px] text-gray-5">
                  No trigger history yet. Rules will log activity when they execute.
                </div>
              ) : (
                <div className="space-y-3">
                  {rules
                    .filter((r) => r.last_triggered_at)
                    .slice(0, 10)
                    .map((rule) => (
                      <div key={rule.id} className="pm-dash-feed-item">
                        <div className={`pm-dash-feed-dot ${rule.enabled ? "g" : "y"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="pm-dash-feed-text text-[12px] font-medium">
                            {rule.name}
                          </div>
                          <div className="pm-dash-feed-time text-[10px] font-mono mt-0.5">
                            {timeAgo(rule.last_triggered_at)}
                          </div>
                        </div>
                        <StatusBadge variant={rule.enabled ? "active" : "review"}>
                          {rule.enabled ? "success" : "skipped"}
                        </StatusBadge>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
