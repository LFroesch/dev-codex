/**
 * Utility functions for calculating data retention and expiration dates
 */

import mongoose from 'mongoose';
import {
  RETENTION_POLICIES,
  PlanTier,
  DEFAULT_PLAN_TIER,
  NOTIFICATION_IMPORTANCE,
} from '../config/retentionPolicies';
import { User } from '../models/User';
import { Project } from '../models/Project';

/**
 * Cache for user plan tiers to reduce database queries
 */
const planTierCache = new Map<string, { tier: PlanTier; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user's plan tier from cache or database
 */
export async function getUserPlanTier(userId: string | mongoose.Types.ObjectId): Promise<PlanTier> {
  const userIdStr = userId.toString();

  // Check cache first
  const cached = planTierCache.get(userIdStr);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.tier;
  }

  // Fetch from database
  try {
    const user = await User.findById(userId).select('planTier').lean();
    const tier = (user?.planTier as PlanTier) || DEFAULT_PLAN_TIER;

    // Update cache
    planTierCache.set(userIdStr, { tier, timestamp: Date.now() });

    return tier;
  } catch (error) {
    return DEFAULT_PLAN_TIER;
  }
}

/**
 * Get project owner's plan tier
 */
export async function getProjectOwnerPlanTier(
  projectId: string | mongoose.Types.ObjectId
): Promise<PlanTier> {
  try {
    const project = await Project.findById(projectId).select('ownerId').lean();
    if (!project) {
      return DEFAULT_PLAN_TIER;
    }

    return getUserPlanTier(project.ownerId);
  } catch (error) {
    return DEFAULT_PLAN_TIER;
  }
}

/**
 * Calculate expiration date for activity logs
 */
export function calculateActivityLogExpiration(
  planTier: PlanTier,
  createdAt: Date = new Date()
): Date | undefined {
  const policy = RETENTION_POLICIES.activityLog[planTier];

  if (policy.detailedDays === -1) {
    return undefined; // Keep forever
  }

  const expirationDate = new Date(createdAt);
  expirationDate.setDate(expirationDate.getDate() + policy.detailedDays);
  return expirationDate;
}

/**
 * Calculate expiration date for notifications based on type and plan tier
 */
export function calculateNotificationExpiration(
  planTier: PlanTier,
  notificationType: string,
  createdAt: Date = new Date()
): Date | undefined {
  const importance = NOTIFICATION_IMPORTANCE[notificationType] || 'standard';
  const policy = RETENTION_POLICIES.notification[planTier];
  const retentionDays = policy[importance];

  if (retentionDays === -1) {
    return undefined; // Keep forever
  }

  const expirationDate = new Date(createdAt);
  expirationDate.setDate(expirationDate.getDate() + retentionDays);
  return expirationDate;
}

/**
 * Calculate expiration date for project invitations based on status
 */
export function calculateInvitationExpiration(
  planTier: PlanTier,
  status: 'pending' | 'expired' | 'accepted' | 'cancelled',
  statusChangedAt: Date = new Date()
): Date | undefined {
  const policy = RETENTION_POLICIES.projectInvitation[planTier];

  let retentionDays: number;
  switch (status) {
    case 'pending':
      retentionDays = policy.pending;
      break;
    case 'expired':
    case 'cancelled':
      retentionDays = policy.expired;
      break;
    case 'accepted':
      retentionDays = policy.accepted;
      break;
    default:
      retentionDays = policy.expired;
  }

  if (retentionDays === -1) {
    return undefined; // Keep forever
  }

  const expirationDate = new Date(statusChangedAt);
  expirationDate.setDate(expirationDate.getDate() + retentionDays);
  return expirationDate;
}

/**
 * Calculate expiration date for removed team members
 */
export function calculateTeamMemberExpiration(
  planTier: PlanTier,
  removedAt: Date = new Date()
): Date | undefined {
  const policy = RETENTION_POLICIES.teamMember[planTier];

  if (policy.removedDays === -1) {
    return undefined; // Keep forever
  }

  const expirationDate = new Date(removedAt);
  expirationDate.setDate(expirationDate.getDate() + policy.removedDays);
  return expirationDate;
}

/**
 * Get notification importance level
 */
export function getNotificationImportance(
  notificationType: string
): 'critical' | 'standard' | 'transient' {
  return NOTIFICATION_IMPORTANCE[notificationType] || 'standard';
}

/**
 * Clear plan tier cache for a specific user (useful after plan upgrades/downgrades)
 */
export function clearPlanTierCache(userId?: string): void {
  if (userId) {
    planTierCache.delete(userId);
  } else {
    planTierCache.clear();
  }
}

/**
 * Update expiration date when plan tier changes
 */
export async function updateExpirationOnPlanChange(
  userId: string,
  oldPlanTier: PlanTier,
  newPlanTier: PlanTier
): Promise<void> {
  // Clear cache
  clearPlanTierCache(userId);

  // Update activity logs
  const activityLogModel = (await import('../models/ActivityLog')).default;
  const newActivityExpiration = calculateActivityLogExpiration(newPlanTier);

  await activityLogModel.updateMany(
    { userId, planTier: oldPlanTier },
    {
      $set: {
        planTier: newPlanTier,
        expiresAt: newActivityExpiration,
      },
    }
  );

  // Update notifications
  const notificationModel = (await import('../models/Notification')).default;
  const notifications = await notificationModel.find({ userId, planTier: oldPlanTier });

  for (const notification of notifications) {
    const newExpiration = calculateNotificationExpiration(
      newPlanTier,
      notification.type,
      notification.createdAt
    );

    await notificationModel.updateOne(
      { _id: notification._id },
      {
        $set: {
          planTier: newPlanTier,
          expiresAt: newExpiration,
        },
      }
    );
  }
}
