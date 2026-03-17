export type PlanTier = "free" | "family";

const FREE_MEMBER_LIMIT = 2;

export interface PlanLimits {
  maxMembers: number | null;
}

const TIER_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { maxMembers: FREE_MEMBER_LIMIT },
  family: { maxMembers: null },
};

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return TIER_LIMITS[tier];
}

export function canAddMember(
  tier: PlanTier,
  currentMemberCount: number,
): { allowed: boolean; upgradeRequired: boolean } {
  const limits = TIER_LIMITS[tier];
  if (limits.maxMembers === null) {
    return { allowed: true, upgradeRequired: false };
  }
  if (currentMemberCount >= limits.maxMembers) {
    return { allowed: false, upgradeRequired: true };
  }
  return { allowed: true, upgradeRequired: false };
}

export function getEffectiveTier(planTier: string | undefined): PlanTier {
  if (planTier === "family") return "family";
  return "free";
}
