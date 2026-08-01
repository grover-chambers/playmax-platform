"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { formatTimeAgo } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    fetchRef.current = () => {
      fetch("/api/staff/notifications")
        .then((res) => { if (!res.ok) return null; return res.json(); })
        .then((data) => {
          if (!data) return;
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
  }, []);

  useEffect(() => {
    fetchRef.current();
    const supabase = createClient();
    const channel = supabase
      .channel("staff-notifications")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => fetchRef.current(),
      )
      .subscribe();
    const interval = setInterval(() => fetchRef.current(), 30000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async (id: string) => {
    setMarking(true);
    try {
      await fetch("/api/staff/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ } finally { setMarking(false); }
  };

  const markAllRead = async () => {
    setMarking(true);
    try {
      await fetch("/api/staff/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ } finally { setMarking(false); }
  };

  const typeIcon = (type: string) => {
    const icons: Record<string, string> = {
      new_lead: "💼",
      task_assigned: "📋",
      project_update: "📊",
      deliverable: "📄",
      message: "💬",
      milestone: "🎯",
      invoice: "💰",
      payment_received: "💳",
      booking: "📅",
    };
    return icons[type] || "🔔";
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-4 hover:text-white transition-all"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red text-[8px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E1E1E] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={marking}
                className="text-[10px] text-yellow hover:text-yellow/80 transition-colors flex items-center gap-1"
              >
                {marking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-gray-5" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-[11px] text-gray-5 text-center py-8">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-[#1E1E1E] last:border-0 transition-colors cursor-pointer ${
                    n.read ? "hover:bg-white/5" : "bg-yellow/5 hover:bg-yellow/10"
                  }`}
                >
                  <span className="text-sm mt-0.5">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[11px] leading-relaxed ${n.read ? "text-gray-5" : "text-gray-3"}`}>
                      <span className="font-medium text-white">{n.title}</span>
                      {n.message && <span className="block text-gray-5 mt-0.5">{n.message}</span>}
                    </div>
                    <div className="text-[9px] font-mono text-gray-4 mt-1">{formatTimeAgo(n.created_at)}</div>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-yellow flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
