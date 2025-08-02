export const PLAN_LIMITS = {
  free: 3,
  pro: 20,
  enterprise: -1 // unlimited
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;
