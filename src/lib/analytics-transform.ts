import type { ChartType } from "@/lib/report-types";
import { chartColor } from "@/lib/analytics-colors";
import type { ChartProps } from "@/components/charts/analytics-chart";

const LABEL_CANDIDATES = [
  "supplier", "supplier_name", "category", "product_name", "name",
  "subcategory", "period_label", "branch", "branch_name", "tier",
  "manufacturer", "sub_category", "product",
];

function pickLabelField(row: Record<string, unknown>): string | null {
  for (const key of LABEL_CANDIDATES) {
    if (key in row && typeof row[key] === "string") return key;
  }
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "string") return k;
  }
  return null;
}

function pickValueFields(row: Record<string, unknown>): string[] {
  return Object.entries(row)
    .filter(([, v]) => typeof v === "number")
    .map(([k]) => k);
}

function isLabelField(k: string): boolean {
  return LABEL_CANDIDATES.includes(k) || k === "rank" || k === "rn";
}

export function transformChartData(
  chartType: ChartType,
  rawData: Record<string, unknown>[],
): ChartProps {
  if (!rawData || rawData.length === 0) {
    return { type: chartType, labels: [], datasets: [], rawData: [] };
  }

  // Table variants pass rawData directly
  if (["table", "table_flag", "table_trend", "table_bar"].includes(chartType)) {
    return { type: chartType, rawData };
  }

  // Radar: all numeric fields (except label) are dimensions
  if (chartType === "radar") {
    const first = rawData[0];
    const labelField = pickLabelField(first);
    const valueFields = pickValueFields(first).filter(
      (k) => k !== labelField && !k.includes("_pct") && !k.includes("score"),
    );
    const scoreFields = pickValueFields(first).filter(
      (k) => k.includes("score") || k === "price_score",
    );
    const dims = scoreFields.length > 0 ? scoreFields : valueFields.slice(0, 6);
    return {
      type: chartType,
      labels: dims.map((d) => d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())),
      datasets: rawData.map((row, i) => ({
        label: labelField ? String(row[labelField] ?? "") : `Series ${i + 1}`,
        data: dims.map((d) => Number(row[d]) || 0),
        backgroundColor: chartColor(i) + "20",
        borderColor: chartColor(i),
      })),
      rawData,
    };
  }

  // Scatter: find x and y numeric fields
  if (chartType === "scatter") {
    const first = rawData[0];
    const numFields = pickValueFields(first);
    const xField = numFields.find((k) => /units|qty|quantity|volume/.test(k)) ?? numFields[0];
    const yField = numFields.find((k) => /revenue|amount|price|sales/.test(k)) ?? (numFields[1] ?? numFields[0]);
    return {
      type: chartType,
      datasets: [{
        label: `${yField} vs ${xField}`,
        data: rawData.map((r) => ({
          x: Number(r[xField]) || 0,
          y: Number(r[yField]) || 0,
        })),
        backgroundColor: chartColor(0),
      }],
      rawData,
    };
  }

  // Grouped bar / multi-line: group by a category field within supplier/brand
  if (chartType === "bar_grouped" || chartType === "line_multi") {
    const first = rawData[0];
    const labelField = pickLabelField(first);
    // Find the grouping field: "category" or similar non-label string
    const groupField = Object.keys(first).find(
      (k) => k !== labelField && typeof first[k] === "string",
    );
    // Find the value field (first numeric that isn't label-like)
    const valueField = pickValueFields(first).find(
      (k) => !isLabelField(k) && k !== labelField,
    ) ?? pickValueFields(first)[0];

    if (!groupField || !valueField || !labelField) {
      return { type: chartType, labels: [], datasets: [], rawData };
    }

    const groups = [...new Set(rawData.map((r) => String(r[groupField!] ?? "")))];
    const labels = [...new Set(rawData.map((r) => String(r[labelField!] ?? "")))];

    return {
      type: chartType,
      labels,
      datasets: groups.map((g, i) => ({
        label: g,
        data: labels.map((l) => {
          const match = rawData.find(
            (r) => String(r[labelField!]) === l && String(r[groupField!]) === g,
          );
          return Number(match?.[valueField!]) || 0;
        }),
        backgroundColor: chartColor(i),
      })),
      rawData,
    };
  }

  // Diverging bar: positive/negative values
  if (chartType === "bar_div") {
    const first = rawData[0];
    const labelField = pickLabelField(first);
    const valueFields = pickValueFields(first);
    const shiftField = valueFields.find((k) => /shift|gap|change|growth|excess/.test(k)) ?? valueFields[0];

    const labels = labelField ? rawData.map((r) => String(r[labelField] ?? "")) : [];
    return {
      type: chartType,
      labels,
      datasets: [{
        label: shiftField.replace(/_/g, " "),
        data: rawData.map((r) => Number(r[shiftField]) || 0),
        backgroundColor: rawData.map((r) => {
          const v = Number(r[shiftField]) || 0;
          return v >= 0 ? chartColor(1) : chartColor(7);
        }),
      }],
      rawData,
    };
  }

  // Heatmap: use rawData as table
  if (chartType === "heatmap") {
    return { type: "table", rawData };
  }

  // Doughnut / bar / bar_h / line: single series
  const first = rawData[0];
  const labelField = pickLabelField(first);
  const valueField = pickValueFields(first).find(
    (k) => !isLabelField(k) && k !== labelField,
  ) ?? pickValueFields(first)[0];

  const labels = labelField ? rawData.map((r) => String(r[labelField] ?? "")) : [];
  const values = valueField ? rawData.map((r) => Number(r[valueField]) || 0) : [];

  if (chartType === "doughnut") {
    return {
      type: chartType,
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => chartColor(i)),
        borderWidth: 2,
        borderColor: "#fff",
      }],
      rawData,
    };
  }

  if (chartType === "bar_h" || chartType === "bar") {
    return {
      type: chartType,
      labels,
      datasets: [{
        label: valueField.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        data: values,
        backgroundColor: chartColor(0),
      }],
      rawData,
    };
  }

  // Line
  if (chartType === "line") {
    return {
      type: chartType,
      labels,
      datasets: [{
        label: valueField.replace(/_/g, " "),
        data: values,
        borderColor: chartColor(0),
        backgroundColor: chartColor(0) + "15",
        fill: true,
        tension: 0.3,
      }],
      rawData,
    };
  }

  // Fallback for unimplemented chart types
  if (["area_stack", "treemap", "waterfall", "box_plot", "lollipop", "gauge"].includes(chartType)) {
    return { type: chartType, rawData };
  }

  return { type: chartType, labels, datasets: [{ data: values }], rawData };
}
