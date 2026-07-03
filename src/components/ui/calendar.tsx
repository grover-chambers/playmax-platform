import React from "react";

type DayStatus = "free" | "taken" | "today" | "header" | "empty";

interface CalendarDay {
  label: string;
  status: DayStatus;
}

interface CalendarProps {
  days: CalendarDay[];
  className?: string;
}

const dayStyles: Record<DayStatus, string> = {
  header: "cal-header",
  free: "cal-free",
  taken: "cal-taken",
  today: "cal-today",
  empty: "text-transparent",
};

function Calendar({ days, className = "" }: CalendarProps) {
  return (
    <div className={className}>
      <div className="avail-calendar">
        {days.map((day, i) => (
          <div key={i} className={`cal-day ${dayStyles[day.status]}`}>
            {day.label}
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-2 text-[10px] text-gray-5">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-green/30 rounded-[2px] inline-block" />
          Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-red/20 rounded-[2px] inline-block" />
          Booked
        </span>
      </div>
    </div>
  );
}

export default Calendar;
