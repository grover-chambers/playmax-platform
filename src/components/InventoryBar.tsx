"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";

interface InventoryBarProps {
  available: number;
  total: number;
}

export function InventoryBar({ available, total }: InventoryBarProps) {
  const { ref, visible } = useScrollReveal();
  const pct = (available / total) * 100;

  return (
    <div ref={ref} className="max-w-xs">
      <div className="flex items-center gap-3 text-sm" style={{ color: "var(--pm-gray-4)" }}>
        <span>{available} of {total} sites available</span>
        <span style={{ color: "var(--pm-yellow)" }}>· Updated daily</span>
      </div>
      <div className="mt-2 w-full h-1.5 bg-black-4 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow rounded-full"
          style={{
            width: visible ? `${pct}%` : "0%",
            transition: "width 1200ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>
    </div>
  );
}
