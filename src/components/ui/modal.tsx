"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  className = "",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape + trap Tab within the dialog while open
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey) {
          if (active === first || active === panelRef.current || !panelRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last || active === panelRef.current || !panelRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      const previouslyFocused = document.activeElement as HTMLElement | null;
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      panelRef.current?.focus();
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        previouslyFocused?.focus?.();
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full max-w-lg mx-4 bg-[var(--ws-surface)] border border-[var(--ws-border)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] outline-none ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ws-border)] flex-shrink-0">
          <h2 className="font-display text-[15px] font-semibold text-[var(--ws-text)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[var(--ws-text-muted)] hover:bg-[var(--ws-bg)] hover:text-[var(--ws-text)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
