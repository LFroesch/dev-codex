// Project limits
export const PLAN_LIMITS = {
  free: 3,
  pro: 20,
  premium: 50
} as const;

// Content limits per project by plan tier
export const CONTENT_LIMITS = {
  free: {
    todos: 50,
    notes: 20,
    devlogs: 30,
    components: 30,
    stackItems: 50,
    teamMembers: 3
  },
  pro: {
    todos: 500,
    notes: 200,
    devlogs: 300,
    components: 300,
    stackItems: 200,
    teamMembers: 10
  },
  premium: {
    todos: -1, // unlimited
    notes: -1,
    devlogs: -1,
    components: -1,
    stackItems: -1,
    teamMembers: -1
  }
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;
