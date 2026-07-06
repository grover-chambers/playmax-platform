"use client";

import React from "react";
import StatCard from "@/components/ui/stat-card";
import StatusBadge from "@/components/ui/status-badge";
import Button from "@/components/ui/button";
import {
  Sun,
  AlertTriangle,
  FolderKanban,
  CheckCircle,
  ArrowRight,
  FileText,
  MessageSquare,
  Send,
  Eye,
  ThumbsUp,
  SquarePen,
  Clock,
  CreditCard,
  User,
} from "lucide-react";

const messages = [
  {
    name: "Sarah K.",
    text: "The brand concept routes are ready for your review.",
    time: "2h ago",
  },
  {
    name: "James M.",
    text: "Updated timeline for the Westlands campaign.",
    time: "5h ago",
  },
];

const deliverables = [
  {
    name: "Campaign Creative Deck",
    meta: "PDF • 12 MB",
  },
  {
    name: "Brand Guidelines v3",
    meta: "PDF • 8 MB",
  },
  {
    name: "Social Media Templates",
    meta: "AI • 24 MB",
  },
];

export default function PortalOverviewPage() {
  return (
    <div>
      {/* ── Welcome strip ──────────────────────────── */}
      <div className="pm-dash-welcome">
        <div>
          <h2>Good morning, Brian.</h2>
          <p>Here&rsquo;s a summary of your active engagements with PlayMax.</p>
        </div>
        <div className="flex items-center gap-3">
          <Sun size={18} className="text-yellow" />
          <span className="user-avatar">B</span>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────── */}
      <div className="pm-dash-krow pm-dash-krow-4">
        <div className="pm-dash-kcard">
          <div className="pm-dash-kn">3</div>
          <div className="pm-dash-kl">Active Projects</div>
          <div className="pm-dash-ksub">2 in progress</div>
        </div>
        <div className="pm-dash-kcard grn">
          <div className="pm-dash-kn grn">7</div>
          <div className="pm-dash-kl">Deliverables</div>
          <div className="pm-dash-ksub">3 pending review</div>
        </div>
        <div className="pm-dash-kcard red">
          <div className="pm-dash-kn red">KES 255K</div>
          <div className="pm-dash-kl">Outstanding</div>
          <div className="pm-dash-ksub">1 overdue</div>
        </div>
        <div className="pm-dash-kcard blu">
          <div className="pm-dash-kn blu">2</div>
          <div className="pm-dash-kl">Messages</div>
          <div className="pm-dash-ksub">2 unread</div>
        </div>
      </div>

      {/* ── Action alert ──────────────────────────── */}
      <div className="pm-dash-alert pm-dash-alert-y">
        <AlertTriangle size={14} />
        About 3 brand concept routes ready for review
      </div>

      {/* ── Two-column layout ──────────────────────── */}
      <div className="grid grid-cols-3 gap-6">
        {/* ══════════ LEFT (2/3) ════════════ */}
        <div className="col-span-2 space-y-4">
          {/* ── Project card: Brand Identity ────────── */}
          <div className="pm-dash-proj-card review">
            <div className="flex items-start justify-between">
              <div>
                <div className="pm-dash-proj-name">
                  Brand Identity &mdash; Twiga Snacks Range
                </div>
                <div className="pm-dash-proj-type">
                  Next milestone: Moodboard approval &middot; Due Fri
                </div>
              </div>
              <span className="pm-dash-bdg pm-dash-bdg-b">YOUR REVIEW</span>
            </div>

            <div className="pm-dash-prog-wrap">
              <div className="pm-dash-prog-track">
                <div className="pm-dash-prog-fill" style={{ width: "65%" }} />
              </div>
              <div className="pm-dash-prog-lbl">
                <span>Progress</span>
                <span>65%</span>
              </div>
            </div>

            <div className="pm-dash-proj-foot">
              <div className="flex items-center gap-2 text-[11px] text-gray-4">
                <Clock size={12} />
                Next review: Tomorrow
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm">View brief</Button>
                <Button size="sm" className="btn-sm-primary">
                  <ArrowRight size={12} />
                  Review concepts
                </Button>
              </div>
            </div>
          </div>

          {/* ── Project card: Westlands Screen ──────── */}
          <div
            className="pm-dash-proj-card"
            style={{ borderLeftColor: "var(--pm-green)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="pm-dash-proj-name">
                  Westlands Screen A &mdash; July Booking
                </div>
                <div className="pm-dash-proj-type">
                  Creative materials due: 14 Jul 2026
                </div>
              </div>
              <span className="pm-dash-bdg pm-dash-bdg-g">
                <CheckCircle size={10} className="mr-1" />
                CONFIRMED
              </span>
            </div>

            <div className="pm-dash-prog-wrap">
              <div className="pm-dash-prog-track">
                <div
                  className="pm-dash-prog-fill"
                  style={{ width: "100%", background: "var(--pm-green)" }}
                />
              </div>
              <div className="pm-dash-prog-lbl">
                <span>Complete</span>
                <span>100%</span>
              </div>
            </div>

            <div className="pm-dash-proj-foot">
              <div className="flex items-center gap-2 text-[11px] text-gray-4">
                <FileText size={12} />3 assets to deliver
              </div>
              <Button size="sm">Upload assets</Button>
            </div>
          </div>

          {/* ── Deliverables card ───────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-yellow" />
                <span className="pm-dash-card-t">
                  Deliverables awaiting review
                </span>
              </div>
              <span className="pm-dash-bdg pm-dash-bdg-y">3 pending</span>
            </div>
            <div className="pm-dash-card-b">
              {deliverables.map((d, i) => (
                <div key={i} className="pm-dash-del-row">
                  <div>
                    <div className="pm-dash-del-name">{d.name}</div>
                    <div className="pm-dash-del-meta">{d.meta}</div>
                  </div>
                  <div className="pm-dash-del-btns">
                    <button className="pm-dash-del-btn">
                      <Eye size={11} />
                      View
                    </button>
                    <button className="pm-dash-del-btn approve">
                      <ThumbsUp size={11} />
                      Approve
                    </button>
                    <button className="pm-dash-del-btn">
                      <SquarePen size={11} />
                      Request changes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ RIGHT (1/3) ════════════ */}
        <div className="space-y-4">
          {/* ── Messages card ────────────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-yellow" />
                <span className="pm-dash-card-t">Messages</span>
              </div>
              <span className="pm-dash-bdg pm-dash-bdg-y">2 unread</span>
            </div>
            <div className="pm-dash-card-b">
              {messages.map((msg, i) => (
                <div key={i} className="pm-dash-msg-prev">
                  <span
                    className="user-avatar"
                    style={{ width: 26, height: 26, fontSize: 10 }}
                  >
                    {msg.name.charAt(0)}
                  </span>
                  <div className="pm-dash-mp-body">
                    <div className="pm-dash-mp-name">{msg.name}</div>
                    <div className="pm-dash-mp-text">{msg.text}</div>
                    <div className="text-[10px] text-gray-5 mt-1 font-mono">
                      {msg.time}
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-3 flex gap-2">
                <textarea
                  className="flex-1 bg-black-3 border border-black-4 rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-gray-5 resize-none outline-none focus:border-yellow/40 transition-colors"
                  rows={2}
                  placeholder="Type a message..."
                />
                <Button size="sm" className="btn-sm-primary self-end">
                  <Send size={12} />
                  Send
                </Button>
              </div>
            </div>
          </div>

          {/* ── Your account card ────────────────────── */}
          <div className="pm-dash-card">
            <div className="pm-dash-card-h">
              <div className="flex items-center gap-2">
                <User size={14} className="text-yellow" />
                <span className="pm-dash-card-t">Your account</span>
              </div>
            </div>
            <div className="pm-dash-card-b">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="pm-dash-mini-kpi">
                  <div className="pm-dash-mini-kpi-val text-yellow">2</div>
                  <div className="pm-dash-mini-kpi-lbl">Projects</div>
                </div>
                <div className="pm-dash-mini-kpi">
                  <div className="pm-dash-mini-kpi-val text-blue">3</div>
                  <div className="pm-dash-mini-kpi-lbl">Pending</div>
                </div>
                <div className="pm-dash-mini-kpi">
                  <div className="pm-dash-mini-kpi-val text-green">1</div>
                  <div className="pm-dash-mini-kpi-lbl">Confirmed</div>
                </div>
              </div>

              <div className="border-t border-[#1a1a1a] pt-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard size={12} className="text-gray-5" />
                    <span className="text-[11px] text-gray-4">
                      Open invoice
                    </span>
                  </div>
                  <span className="text-[13px] font-display font-bold text-yellow">
                    KES 255,000
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="flex-1 justify-center">
                    View details
                  </Button>
                  <Button
                    size="sm"
                    className="btn-sm-primary flex-1 justify-center"
                  >
                    Pay now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
