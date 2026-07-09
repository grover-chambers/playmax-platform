"use client";

import { useState } from "react";
import {
  Plus,
  Zap,
  ToggleLeft,
  ToggleRight,
  Play,
  History,
  Clock,
  MessageSquare,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import StatusBadge from "@/components/ui/status-badge";

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  runCount: number;
  lastTriggered: string | null;
  status: "active" | "paused" | "error";
}

const initialRules: AutomationRule[] = [
  {
    id: "a1",
    name: "New lead WhatsApp acknowledgement",
    trigger: "New lead created",
    action: "Send WhatsApp template + assign round-robin",
    enabled: true,
    runCount: 47,
    lastTriggered: "2 min ago",
    status: "active",
  },
  {
    id: "a2",
    name: "48-hour no-reply follow-up task",
    trigger: "No reply from lead for 48h",
    action: "Create high-priority task for assigned staff",
    enabled: true,
    runCount: 12,
    lastTriggered: "1h ago",
    status: "active",
  },
  {
    id: "a3",
    name: "Booking confirmed → send invoice",
    trigger: "Booking status → confirmed",
    action: "Generate draft invoice + notify finance",
    enabled: true,
    runCount: 8,
    lastTriggered: "3h ago",
    status: "active",
  },
  {
    id: "a4",
    name: "Milestone due reminder",
    trigger: "Project milestone due in 3 days",
    action: "Send email + in-app notification to project lead",
    enabled: false,
    runCount: 23,
    lastTriggered: "2 days ago",
    status: "paused",
  },
  {
    id: "a5",
    name: "Stale lead alert (>10 days)",
    trigger: "Lead status unchanged for 10+ days",
    action: "Notify CRM admin + move to stale pipeline stage",
    enabled: true,
    runCount: 5,
    lastTriggered: "1 day ago",
    status: "active",
  },
  {
    id: "a6",
    name: "Research report published → client notify",
    trigger: "Research report visible_to_client toggled ON",
    action: "Send WhatsApp + email to client with portal link",
    enabled: true,
    runCount: 3,
    lastTriggered: "5 days ago",
    status: "active",
  },
  {
    id: "a7",
    name: "Invoice overdue escalation",
    trigger: "Invoice 7 days past due",
    action: "Send reminder WhatsApp + escalate to finance",
    enabled: false,
    runCount: 0,
    lastTriggered: null,
    status: "paused",
  },
];

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>(initialRules);
  const [showNewRule, setShowNewRule] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              enabled: !r.enabled,
              status: r.enabled ? ("paused" as const) : ("active" as const),
            }
          : r,
      ),
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[18px] font-bold">Automation Rules</h1>
          <p className="text-[11px] text-gray-5 mt-0.5">
            {rules.filter((r) => r.enabled).length} active · {rules.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowLog(true)}
          >
            <History className="w-3.5 h-3.5" />
            Run log
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowNewRule(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            New rule
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-black-2 border border-[#1e1e1e] rounded-lg p-4">
          <div className="font-display text-[24px] font-bold text-yellow">
            {rules.filter((r) => r.enabled).length}
          </div>
          <div className="text-[11px] text-gray-4 mt-1">Active rules</div>
        </div>
        <div className="bg-black-2 border border-[#1e1e1e] rounded-lg p-4">
          <div className="font-display text-[24px] font-bold text-green">
            {rules.reduce((sum, r) => sum + r.runCount, 0)}
          </div>
          <div className="text-[11px] text-gray-4 mt-1">Total triggers</div>
        </div>
        <div className="bg-black-2 border border-[#1e1e1e] rounded-lg p-4">
          <div className="font-display text-[24px] font-bold text-blue">
            {rules.filter((r) => r.status === "paused").length}
          </div>
          <div className="text-[11px] text-gray-4 mt-1">Paused</div>
        </div>
        <div className="bg-black-2 border border-[#1e1e1e] rounded-lg p-4">
          <div className="font-display text-[24px] font-bold text-red">
            {rules.filter((r) => r.status === "error").length}
          </div>
          <div className="text-[11px] text-gray-4 mt-1">Errors</div>
        </div>
      </div>

      {/* Rules list */}
      <div className="bg-black-2 border border-[#1e1e1e] rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_1.5fr_80px_100px_80px] gap-3 px-5 py-3 border-b border-[#1e1e1e] text-[10px] font-mono text-gray-5 uppercase tracking-wider">
          <span>Rule</span>
          <span>Trigger → Action</span>
          <span className="text-center">Runs</span>
          <span className="text-center">Last triggered</span>
          <span className="text-center">Status</span>
        </div>
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="grid grid-cols-[1fr_1.5fr_80px_100px_80px] gap-3 px-5 py-4 border-b border-[#111] hover:bg-white/[.02] transition-colors items-center"
          >
            <div>
              <div className="text-[13px] font-medium">{rule.name}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-yellow bg-yellow/10 px-2 py-0.5 rounded-full border border-yellow/20 whitespace-nowrap">
                {rule.trigger}
              </span>
              <span className="text-gray-5 text-[10px]">→</span>
              <span className="text-[11px] text-gray-3">
                {rule.action}
              </span>
            </div>
            <div className="text-center font-mono text-[12px] text-gray-3">
              {rule.runCount}
            </div>
            <div className="text-center text-[11px] text-gray-5">
              {rule.lastTriggered || "—"}
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => toggleRule(rule.id)}
                className="cursor-pointer bg-transparent border-none"
                title={rule.enabled ? "Pause rule" : "Enable rule"}
              >
                {rule.enabled ? (
                  <ToggleRight className="w-5 h-5 text-green" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-gray-5" />
                )}
              </button>
              <StatusBadge
                variant={
                  rule.status === "active"
                    ? "active"
                    : rule.status === "paused"
                      ? "review"
                      : "draft"
                }
              >
                {rule.status}
              </StatusBadge>
            </div>
          </div>
        ))}
      </div>

      {/* ── New Rule Modal ── */}
      <Modal open={showNewRule} onClose={() => setShowNewRule(false)} title="New Automation Rule">
        <div className="w-full max-w-lg mx-auto">
          <div className="bg-black-2 border border-[#1e1e1e] rounded-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
              <h2 className="font-display text-[15px] font-bold">
                New Automation Rule
              </h2>
              <button
                onClick={() => setShowNewRule(false)}
                className="text-gray-5 hover:text-white bg-transparent border-none cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">Rule name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. New lead WhatsApp acknowledgement"
                />
              </div>
              <div>
                <label className="form-label">Trigger</label>
                <select className="form-select">
                  <option>New lead created</option>
                  <option>Lead status changed</option>
                  <option>No reply for 48 hours</option>
                  <option>Booking confirmed</option>
                  <option>Milestone due in 3 days</option>
                  <option>Lead stale for 10+ days</option>
                  <option>Research report published</option>
                  <option>Invoice overdue</option>
                </select>
              </div>
              <div>
                <label className="form-label">Action</label>
                <select className="form-select">
                  <option>Send WhatsApp template</option>
                  <option>Send email notification</option>
                  <option>Create task</option>
                  <option>Assign staff (round-robin)</option>
                  <option>Generate invoice</option>
                  <option>Move pipeline stage</option>
                  <option>Notify CRM admin</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowNewRule(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowNewRule(false)}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Create rule
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Run Log Modal ── */}
      <Modal open={showLog} onClose={() => setShowLog(false)} title="Trigger Log">
        <div className="w-full max-w-lg mx-auto">
          <div className="bg-black-2 border border-[#1e1e1e] rounded-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
              <h2 className="font-display text-[15px] font-bold">
                Trigger Log
              </h2>
              <button
                onClick={() => setShowLog(false)}
                className="text-gray-5 hover:text-white bg-transparent border-none cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {[
                  {
                    rule: "New lead WhatsApp acknowledgement",
                    time: "2 min ago",
                    result: "success" as const,
                    detail: "Sent template to +254712345678",
                  },
                  {
                    rule: "48-hour no-reply follow-up",
                    time: "1h ago",
                    result: "success" as const,
                    detail: "Task created → assigned to Amina",
                  },
                  {
                    rule: "Booking confirmed → invoice",
                    time: "3h ago",
                    result: "success" as const,
                    detail: "Draft INV-2026-009 generated",
                  },
                  {
                    rule: "Stale lead alert",
                    time: "1 day ago",
                    result: "success" as const,
                    detail: "Kevian Kenya moved to stale",
                  },
                  {
                    rule: "Invoice overdue escalation",
                    time: "2 days ago",
                    result: "failed" as const,
                    detail:
                      "Rule is paused — escalation skipped (logged)",
                  },
                ].map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-black-3 rounded"
                  >
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        entry.result === "success"
                          ? "bg-green"
                          : "bg-red"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium">
                        {entry.rule}
                      </div>
                      <div className="text-[11px] text-gray-5 mt-0.5">
                        {entry.detail}
                      </div>
                      <div className="text-[10px] text-gray-5 font-mono mt-1">
                        {entry.time}
                      </div>
                    </div>
                    <StatusBadge
                      variant={
                        entry.result === "success" ? "active" : "draft"
                      }
                    >
                      {entry.result}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
