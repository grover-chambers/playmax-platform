"use client";

import React from "react";

interface KanbanColumnProps {
  title: string;
  count: number;
  children: React.ReactNode;
  className?: string;
}

function KanbanColumn({
  title,
  count,
  children,
  className = "",
}: KanbanColumnProps) {
  return (
    <div className={`kanban-col ${className}`}>
      <div className="kanban-head">
        <div className="flex items-center gap-2">
          <span className="kanban-stage">{title}</span>
          <span className="kanban-count">{count}</span>
        </div>
      </div>
      <div className="kanban-body max-h-[calc(100vh-220px)] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export default KanbanColumn;
