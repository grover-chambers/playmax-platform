import React from "react";

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  rightLabel?: string;
  className?: string;
}

function ProgressBar({
  value,
  max = 100,
  label,
  rightLabel,
  className = "",
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={className}>
      {(label || rightLabel) && (
        <div className="text-[10px] text-gray-5 mt-1 flex justify-between">
          <span>{label}</span>
          <span>{rightLabel}</span>
        </div>
      )}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default ProgressBar;
