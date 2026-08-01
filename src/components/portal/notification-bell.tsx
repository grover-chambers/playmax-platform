"use client";

import React, { useState, useEffect, useRef, startTransition, useCallback } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/notifications");
      const data = await res.json();
      startTransition(() => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setLoading(false);
      });
    } catch {
      startTransition(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription for live notifications
    const supabase = createClient();
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => fetchNotifications(),
      )
      .subscribe();

    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    await fetch("/api/portal/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    fetchNotifications();
  };

  const handleMarkRead = async (id: string) => {
    await fetch("/api/portal/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    fetchNotifications();
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "deliverable": return "📄";
      case "invoice": return "💰";
      case "message": return "💬";
      case "booking": return "📅";
      case "milestone": return "🎯";
      default: return "🔔";
    }
  };

  const [now, setNow] = useState(-1);
  useEffect(() => {
    startTransition(() => setNow(Date.now()));
    const interval = setInterval(() => startTransition(() => setNow(Date.now())), 30000);
    return () => clearInterval(interval);
  }, []);

  const timeAgo = (date: string) => {
    const t = now > 0 ? now : new Date(date).getTime() + 1;
    const diff = t - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-[var(--ws-bg)] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-gray-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-[var(--ws-text)] bg-red rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--ws-surface)] border border-[var(--ws-border)] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ws-border)]">
            <span className="text-[13px] font-semibold text-[var(--ws-text)]">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[10px] text-teal hover:underline"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={16} className="animate-spin text-gray-4" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-[12px] text-gray-4">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const content = (
                  <div
                    className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-[var(--ws-bg)] ${
                      !n.read ? "bg-yellow/5" : ""
                    }`}
                    onClick={() => {
                      if (!n.read) handleMarkRead(n.id);
                      setOpen(false);
                    }}
                  >
                    <span className="text-[16px] mt-0.5">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12px] ${!n.read ? "font-semibold text-[var(--ws-text)]" : "text-gray-3"}`}>
                        {n.title}
                      </div>
                      {n.message && (
                        <div className="text-[11px] text-gray-5 mt-0.5 line-clamp-2">{n.message}</div>
                      )}
                      <div className="text-[9px] text-gray-5 font-mono mt-1">{timeAgo(n.created_at)}</div>
                    </div>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-teal mt-2 flex-shrink-0" />}
                  </div>
                );
                const safeLink = n.link && n.link.startsWith("/portal") ? n.link : null;
                return safeLink ? (
                  <Link key={n.id} href={safeLink} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
