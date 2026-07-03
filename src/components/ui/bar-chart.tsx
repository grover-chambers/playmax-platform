import React from "react";

interface BarItem {
  label: string;
  value: number;
  displayValue?: string;
}

interface BarChartProps {
  items: BarItem[];
  className?: string;
}

function BarChart({ items, className = "" }: BarChartProps) {
  return (
    <div className={`bar-chart ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="bar-row">
          <div className="bar-label">{item.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${item.value}%` }} />
          </div>
          <div className="bar-value">
            {item.displayValue ?? `${item.value}%`}
          </div>
        </div>
      ))}
    </div>
  );
}

export default BarChart;
