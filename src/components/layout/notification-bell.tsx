"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { formatTimeAgo } from "@/lib/utils";

interface Notification {
  id: string;
  text: string;
  time: string;
  unread: boolean;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("leads")
          .select("id, company, created_at, status")
          .order("created_at", { ascending: false })
          .limit(5);
        if (data && data.length > 0) {
          setNotifications(
            data.map((l) => ({
              id: l.id,
              text: `New lead: ${l.company}`,
              time: formatTimeAgo(l.created_at),
              unread: l.status === "new",
            })),
          );
        }
      } catch { /* silent */ }
    })();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = notifications.filter((n) => n.unread).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-4 hover:text-white transition-all"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red text-[8px] font-bold text-white flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-72 bg-[#0D0D0D] border border-[#1E1E1E] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E1E1E]">
            <span className="text-[11px] font-semibold text-white">Notifications</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-[11px] text-gray-5 text-center py-6">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-[#1E1E1E] last:border-0 hover:bg-white/5 transition-colors ${n.unread ? "bg-yellow/5" : ""}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${n.unread ? "bg-yellow" : "bg-transparent"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-gray-3 leading-relaxed">{n.text}</div>
                    <div className="text-[9px] font-mono text-gray-6 mt-0.5">{n.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
