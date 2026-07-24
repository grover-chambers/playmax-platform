import { ANALYTICS_COLORS } from "./analytics-colors";
import type { SubscriptionTier } from "@/lib/stripe";

export function competitorLabel(name: string, isClient: boolean, rank: number, tier: SubscriptionTier = "free"): string {
  if (isClient) return `${name} (you)`;
  if (tier === "free") return `Competitor ${String.fromCharCode(64 + rank)}`;
  return name;
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
