/**
 * Tiered Data Retention Policies
 *
 * Defines retention periods for different data types based on user subscription tier.
 * This configuration drives TTL (Time To Live) settings across all models.
 */

export type PlanTier = 'free' | 'pro' | 'enterprise';

export interface RetentionPolicy {
  detailedDays: number; // Days to keep detailed records (-1 = forever)
  summaryYears?: number; // Years to keep summaries after detailed period (-1 = forever, 0 = none)
}

export interface NotificationRetentionPolicy {
  critical: number;   // Days to keep critical notifications (invites, team changes)
  standard: number;   // Days to keep standard notifications (assignments, shares)
  transient: number;  // Days to keep transient notifications (reminders, updates)
}

export interface InvitationRetentionPolicy {
  pending: number;   // Days before pending invitation expires
  expired: number;   // Days to keep expired invitations before deletion
  accepted: number;  // Days to keep accepted invitations (-1 = forever)
}

export interface TeamMemberRetentionPolicy {
  removedDays: number; // Days to keep removed team member records (-1 = forever)
}

/**
 * Master retention policy configuration
 */
export const RETENTION_POLICIES = {
  activityLog: {
    free: {
      detailedDays: 30,
      summaryYears: 0,  // No summaries for free tier
    },
    pro: {
      detailedDays: 180,  // 6 months
      summaryYears: 3,
    },
    enterprise: {
      detailedDays: 365,  // 1 year
      summaryYears: -1,   // Forever
    },
  } as Record<PlanTier, RetentionPolicy>,

  notification: {
    free: {
      critical: 30,
      standard: 30,
      transient: 7,
    },
    pro: {
      critical: 180,  // 6 months
      standard: 90,   // 3 months
      transient: 30,
    },
    enterprise: {
      critical: 365,  // 1 year
      standard: 365,
      transient: 90,  // 3 months
    },
  } as Record<PlanTier, NotificationRetentionPolicy>,

  projectInvitation: {
    free: {
      pending: 7,
      expired: 7,
      accepted: 30,
    },
    pro: {
      pending: 14,
      expired: 30,
      accepted: 180,  // 6 months
    },
    enterprise: {
      pending: 30,
      expired: 90,
      accepted: -1,   // Forever
    },
  } as Record<PlanTier, InvitationRetentionPolicy>,

  teamMember: {
    free: {
      removedDays: 30,
    },
    pro: {
      removedDays: 180,  // 6 months
    },
    enterprise: {
      removedDays: 1095, // 3 years
    },
  } as Record<PlanTier, TeamMemberRetentionPolicy>,
} as const;

/**
 * Notification importance levels
 * Used to determine which retention policy to apply
 */
export const NOTIFICATION_IMPORTANCE: Record<string, 'critical' | 'standard' | 'transient'> = {
  // Critical - long retention
  project_invitation: 'critical',
  team_member_added: 'critical',
  team_member_removed: 'critical',

  // Standard - medium retention
  project_shared: 'standard',
  todo_assigned: 'standard',

  // Transient - short retention
  todo_due_soon: 'transient',
  todo_overdue: 'transient',
  subtask_completed: 'transient',
} as const;

/**
 * Get default plan tier for users without a subscription
 */
export const DEFAULT_PLAN_TIER: PlanTier = 'free';
