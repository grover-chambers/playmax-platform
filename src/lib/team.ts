/**
 * Client-team tier limits. Single source of truth for how many team
 * members a client may have, enforced server-side on invite.
 *
 * The client admin (the paying account) is always counted as 1 seat and
 * is immutable — it can never be deleted, demoted, or removed.
 */
export const TEAM_CAP: Record<string, number> = {
  free: 1, // admin only — no invitations allowed
  pro: 5, // admin + 4 viewers
  enterprise: 1000, // effectively unlimited
};

export function teamCapForTier(tier: string | null | undefined): number {
  return TEAM_CAP[tier ?? "free"] ?? TEAM_CAP.free;
}

/** True if the client may invite more viewers given their current seat count. */
export function canInviteMember(
  tier: string | null | undefined,
  currentMemberCount: number,
): boolean {
  return currentMemberCount < teamCapForTier(tier);
}
