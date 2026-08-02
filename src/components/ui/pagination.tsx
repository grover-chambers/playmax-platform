"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  total: number;
  limit?: number;
  pageSize?: number;
  onChange?: (page: number) => void;
  onPageChange?: (page: number) => void;
}

export function usePagination<T>(items: T[], page: number, pageSize: number) {
  return useMemo(() => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    return {
      paginated: items.slice(from, to),
      total: items.length,
    };
  }, [items, page, pageSize]);
}

export default function Pagination({ page, total, limit, pageSize, onChange, onPageChange }: PaginationProps) {
  const size = limit ?? pageSize ?? 50;
  const change = onChange ?? onPageChange ?? (() => {});
  const totalPages = Math.max(1, Math.ceil(total / size));
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--ws-border)]">
      <div className="text-[11px] text-gray-5 font-mono">
        {total} result{total !== 1 ? "s" : ""}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => change(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded hover:bg-[var(--ws-bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} className="text-gray-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="px-1 text-[11px] text-gray-5">...</span>
          ) : (
            <button
              key={p}
              onClick={() => change(p)}
              className={`min-w-[28px] h-7 rounded text-[11px] font-mono transition-colors ${
                p === page
                  ? "bg-teal/20 text-teal font-semibold"
                  : "text-gray-4 hover:text-[var(--ws-text)] hover:bg-[var(--ws-bg)]"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => change(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded hover:bg-[var(--ws-bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} className="text-gray-4" />
        </button>
      </div>
    </div>
  );
}
