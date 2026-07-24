"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <SectionError
          title={this.props.fallbackTitle}
          message={this.props.fallbackMessage || this.state.error?.message}
          onRetry={() => {
            this.setState({ hasError: false, error: null });
            this.props.onRetry?.();
          }}
        />
      );
    }
    return this.props.children;
  }
}

function SectionError({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="pm-dash-card">
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <AlertTriangle size={20} className="text-yellow/60" />
        <div className="text-center">
          <div className="text-[13px] text-gray-3 font-medium">
            {title || "Something went wrong"}
          </div>
          {message && (
            <div className="text-[11px] text-gray-5 mt-1 max-w-xs">{message}</div>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded-full border border-[rgba(255,255,255,0.1)] text-gray-4 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
          >
            <RefreshCw size={11} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
