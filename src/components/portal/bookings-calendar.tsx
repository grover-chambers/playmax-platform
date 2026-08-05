"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarBooking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  inventory?: { name: string; location: string } | null;
}

interface BookingsCalendarProps {
  bookings: CalendarBooking[];
}

export default function BookingsCalendar({ bookings }: BookingsCalendarProps) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const bookedDays = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of bookings) {
      const start = new Date(b.start_date);
      const end = new Date(b.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(b);
      }
    }
    return map;
  }, [bookings]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells: React.ReactNode[] = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(<div key={`empty-${i}`} className="h-24" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayBookings = bookedDays.get(key) || [];
    const isToday = today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;

    cells.push(
      <div
        key={key}
        className={`h-24 border border-[var(--ws-border)] rounded-lg p-1.5 overflow-hidden transition-colors ${
          isToday ? "border-teal/50 bg-teal/5" : "hover:border-[var(--ws-accent)]"
        }`}
      >
        <div className={`text-[10px] font-mono mb-1 ${isToday ? "text-teal font-semibold" : "text-gray-5"}`}>
          {day}
        </div>
        {dayBookings.slice(0, 2).map((b) => (
          <div
            key={b.id}
            className={`text-[8px] px-1 py-0.5 rounded mb-0.5 truncate ${
              b.status === "confirmed" ? "bg-teal/20 text-teal" : "bg-yellow/10 text-yellow"
            }`}
          >
            {b.inventory?.name || "Booking"}
          </div>
        ))}
        {dayBookings.length > 2 && (
          <div className="text-[8px] text-gray-5">+{dayBookings.length - 2} more</div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} aria-label="Previous month" className="p-1.5 rounded hover:bg-[var(--ws-bg)] transition-colors">
          <ChevronLeft size={16} className="text-gray-4" />
        </button>
        <span className="text-[14px] font-display font-semibold">{monthLabel}</span>
        <button onClick={nextMonth} aria-label="Next month" className="p-1.5 rounded hover:bg-[var(--ws-bg)] transition-colors">
          <ChevronRight size={16} className="text-gray-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-[9px] font-mono text-gray-5 uppercase tracking-wider text-center py-1">
            {d}
          </div>
        ))}
        {cells}
      </div>
    </div>
  );
}
