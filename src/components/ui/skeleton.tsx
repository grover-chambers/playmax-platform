import React from "react";

function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--ws-border,#e5e5e5)] ${className}`}
      style={{ opacity: 0.3, ...style }}
    />
  );
}

export { Skeleton };

export function KpiSkeleton() {
  return (
    <div className="pm-dash-kcard">
      <Skeleton className="h-7 w-24 mb-2" />
      <Skeleton className="h-3 w-20 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function CardSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="pm-dash-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="w-full rounded" style={{ height }} />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="pm-dash-card p-5">
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
