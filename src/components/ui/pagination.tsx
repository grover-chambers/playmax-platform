"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function usePagination<T>(data: T[], page: number, pageSize: number) {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paginated = data.slice(start, end);
  return { paginated, total, totalPages, start, end };
}

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) {
  if (total <= pageSize) return null;

  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--ws-border)]">
      <span className="text-xs text-[var(--ws-text-muted)]">
        Showing {start}–{end} of {total} records
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-md hover:bg-[var(--ws-border)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" style={{ color: "var(--ws-text)" }} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .map((p, idx, arr) => (
            <React.Fragment key={p}>
              {idx > 0 && arr[idx - 1] !== p - 1 && (
                <span className="px-1 text-xs" style={{ color: "var(--ws-text-muted)" }}>…</span>
              )}
              <button
                onClick={() => onPageChange(p)}
                className={`min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors ${
                  p === page
                    ? "text-white"
                    : "hover:bg-[var(--ws-border)]"
                }`}
                style={
                  p === page
                    ? { background: "var(--pm-teal)", color: "white" }
                    : { color: "var(--ws-text)" }
                }
              >
                {p}
              </button>
            </React.Fragment>
          ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-md hover:bg-[var(--ws-border)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" style={{ color: "var(--ws-text)" }} />
        </button>
      </div>
    </div>
  );
}