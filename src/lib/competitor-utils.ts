import { ANALYTICS_COLORS } from "./analytics-colors";

export function competitorLabel(name: string, isClient: boolean, rank: number): string {
  if (isClient) return name;
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `Competitor ${letters[(rank - 1) % 26]}`;
}

const RANK_COLORS = {
  gold: ANALYTICS_COLORS.yellow,
  silver: ANALYTICS_COLORS.gray,
  bronze: ANALYTICS_COLORS.orange,
  faded: ANALYTICS_COLORS.blue,
};

export function competitorColor(rank: number, isClient: boolean, clientColor: string): string {
  if (isClient) return clientColor;
  if (rank === 1) return RANK_COLORS.gold;
  if (rank === 2) return RANK_COLORS.silver;
  if (rank === 3) return RANK_COLORS.bronze;
  return RANK_COLORS.faded;
}
