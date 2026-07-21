export const ANALYTICS_COLORS = {
  yellow:  "#F4C300",
  green:   "#22C55E",
  blue:    "#3B82F6",
  pink:    "#EC4899",
  orange:  "#F97316",
  purple:  "#A855F7",
  cyan:    "#06B6D4",
  red:     "#EF4444",
  gray:    "#BBBBBB",
  pale:    "#FDE68A",
} as const;

export const CHART_COLORS = [
  ANALYTICS_COLORS.yellow,
  ANALYTICS_COLORS.green,
  ANALYTICS_COLORS.blue,
  ANALYTICS_COLORS.pink,
  ANALYTICS_COLORS.orange,
  ANALYTICS_COLORS.purple,
  ANALYTICS_COLORS.cyan,
  ANALYTICS_COLORS.red,
] as const;

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
