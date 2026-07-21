"use client";

import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  RadialLinearScale, Filler,
} from "chart.js";
import { Doughnut, Bar, Line, Scatter, Radar } from "react-chartjs-2";

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  RadialLinearScale, Filler,
);

import type { ChartType } from "@/lib/report-types";
import { CHART_COLORS } from "@/lib/analytics-colors";

const palette = [...CHART_COLORS, "#BBBBBB"];

export type ChartDataset = Record<string, unknown> & {
  label?: string;
  data: number[] | { x: number; y: number }[];
  backgroundColor?: string | string[];
  borderColor?: string;
};

export interface ChartProps {
  type: ChartType;
  labels?: string[];
  datasets?: ChartDataset[];
  rawData?: Record<string, unknown>[];
  height?: number;
}

export function AnalyticsChart({ type, labels, datasets, rawData, height = 250 }: ChartProps) {
  const gridConfig = { grid: { color: "rgba(0,0,0,0.06)" }, ticks: { color: "#999", font: { size: 10 } } };

  const opt = (extra?: Record<string, unknown>) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#666", font: { size: 11 }, boxWidth: 12, padding: 12 } },
    },
    ...extra,
  });

  if (type === "doughnut") {
    const data = {
      labels: labels ?? [],
      datasets: [{
        data: datasets?.[0]?.data ?? [],
        backgroundColor: datasets?.[0]?.backgroundColor ?? (labels?.map((_, i) => palette[i % palette.length]) ?? palette),
        borderWidth: 2,
        borderColor: "#fff",
        hoverOffset: 8,
      }],
    };
    return <Doughnut data={data} options={opt({ cutout: "55%" })} height={height} />;
  }

  if (type === "bar_h") {
    const data = {
      labels: labels ?? [],
      datasets: [{
        label: datasets?.[0]?.label ?? "",
        data: datasets?.[0]?.data ?? [],
        backgroundColor: datasets?.[0]?.backgroundColor ?? palette[0],
        borderRadius: 4,
        borderSkipped: false,
      }],
    };
    return (
      <Bar
        data={data}
        options={opt({
          indexAxis: "y" as const,
          scales: { x: gridConfig, y: { ...gridConfig, grid: { display: false } } },
        })}
        height={height}
      />
    );
  }

  if (type === "bar" || type === "bar_grouped" || type === "bar_div") {
    const data = {
      labels: labels ?? [],
      datasets: (datasets ?? []).map((ds, i) => ({
        ...ds,
        backgroundColor: Array.isArray(ds.backgroundColor) ? ds.backgroundColor : (ds.backgroundColor ?? palette[i % palette.length]),
        borderRadius: 4,
        borderSkipped: false,
      })),
    };
    return <Bar data={data} options={opt({ scales: { x: gridConfig, y: gridConfig } })} height={height} />;
  }

  if (type === "line" || type === "line_multi") {
    const data = {
      labels: labels ?? [],
      datasets: (datasets ?? []).map((ds, i) => ({
        ...ds,
        borderColor: ds.borderColor ?? palette[i % palette.length],
        backgroundColor: ds.backgroundColor ?? palette[i % palette.length] + "15",
        fill: (datasets ?? []).length === 1,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      })),
    };
    return <Line data={data} options={opt({ scales: { x: gridConfig, y: gridConfig } })} height={height} />;
  }

  if (type === "scatter") {
    const data = {
      datasets: (datasets ?? []).map((ds, i) => ({
        label: ds.label,
        data: (ds.data as unknown as { x: number; y: number }[]) ?? [],
        backgroundColor: ds.backgroundColor ?? palette[i % palette.length],
        pointRadius: 6,
        pointHoverRadius: 8,
      })),
    };
    return <Scatter data={data} options={opt({ scales: { x: { ...gridConfig, title: { display: true, text: "Value", color: "#999" } }, y: { ...gridConfig, title: { display: true, text: "Value", color: "#999" } } } })} height={height} />;
  }

  if (type === "radar") {
    const data = {
      labels: labels ?? [],
      datasets: (datasets ?? []).map((ds, i) => ({
        ...ds,
        borderColor: ds.borderColor ?? palette[i % palette.length],
        backgroundColor: ds.backgroundColor ?? palette[i % palette.length] + "20",
        pointBackgroundColor: ds.borderColor ?? palette[i % palette.length],
        pointRadius: 4,
      })),
    };
    return <Radar data={data} options={opt({ scales: { r: { ...gridConfig, beginAtZero: true, max: 100 } } })} height={height} />;
  }

  // Table-based chart types (table, table_flag, table_trend, table_bar)
  if (["table", "table_flag", "table_trend", "table_bar"].includes(type)) {
    if (!rawData || rawData.length === 0) {
      return <div style={{ color: "#999", fontSize: 13, textAlign: "center", padding: 24 }}>No data</div>;
    }
    const keys = Object.keys(rawData[0]);
    const flagKey = keys.find(k => k.toLowerCase().includes("flag") || k.toLowerCase().includes("trend"));
    return (
      <div style={{ overflowX: "auto", fontSize: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #eee" }}>
              {keys.map(k => <th key={k} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.replace(/_/g, " ")}</th>)}
            </tr>
          </thead>
          <tbody>
            {rawData.slice(0, 25).map((row, i) => {
              const flagVal = flagKey ? String(row[flagKey] ?? "") : "";
              const rowColor = flagVal === "SHORTAGE" || flagVal === "RISING" ? "#fee2e2" : flagVal === "OVERSTOCK" || flagVal === "FALLING" ? "#fef3c7" : flagVal === "BALANCED" || flagVal === "STABLE" ? "#dcfce7" : "transparent";
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: rowColor || "transparent" }}>
                  {keys.map(k => (
                    <td key={k} style={{ padding: "6px 10px", color: "#333" }}>
                      {k === "flag" || k === "trend" || k === "gap" || k === "share_pct" || k === "margin_pct"
                        ? <span style={{
                            fontWeight: 600,
                            color: typeof row[k] === "number" && (row[k] as number) < 0 ? "#EF4444"
                              : typeof row[k] === "number" && (row[k] as number) > 0 ? "#22C55E" : "#333",
                          }}>{String(row[k] ?? "")}</span>
                        : String(row[k] ?? "")
                      }
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rawData.length > 25 && <div style={{ textAlign: "center", padding: 8, color: "#999", fontSize: 11 }}>Showing 25 of {rawData.length} rows</div>}
      </div>
    );
  }

  // Fallback
  return <div style={{ color: "#999", fontSize: 13, textAlign: "center", padding: 24 }}>Chart type &ldquo;{type}&rdquo; not yet implemented</div>;
}
