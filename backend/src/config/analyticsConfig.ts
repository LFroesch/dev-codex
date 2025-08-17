/**
 * Analytics Configuration - Plan-based TTL and Industry Standards
 * Configurable analytics retention based on subscription tiers
 */

export interface AnalyticsPlanConfig {
  planTier: 'free' | 'pro' | 'enterprise';
  retentionPeriod: number; // seconds, 0 = forever
  maxEventsPerDay: number;
  throttlingMultiplier: number; // 1.0 = standard, 0.5 = faster, 2.0 = slower
  advancedAnalytics: boolean;
  dataExport: boolean;
}

// Industry standard TTL configurations by plan
export const ANALYTICS_PLAN_CONFIG: Record<string, AnalyticsPlanConfig> = {
  free: {
    planTier: 'free',
    retentionPeriod: 3 * 30 * 24 * 60 * 60, // 3 months (industry standard for free tier)
    maxEventsPerDay: 1000, // Reasonable limit for free users
    throttlingMultiplier: 1.0, // Standard throttling
    advancedAnalytics: false,
    dataExport: false
  },
  pro: {
    planTier: 'pro',
    retentionPeriod: 0, // Forever (until unsubscribe)
    maxEventsPerDay: 10000, // Higher limit for pro
    throttlingMultiplier: 0.7, // 30% faster event processing
    advancedAnalytics: true,
    dataExport: true
  },
  enterprise: {
    planTier: 'enterprise',
    retentionPeriod: 0, // Forever (until unsubscribe)
    maxEventsPerDay: 100000, // Very high limit for enterprise
    throttlingMultiplier: 0.5, // 50% faster event processing
    advancedAnalytics: true,
    dataExport: true
  }
};

// Industry standard event throttling (base times in milliseconds)
export const BASE_THROTTLE_DURATIONS: Record<string, number> = {
  // High frequency events - tighter throttling
  page_view: 15000,      // 15 seconds (industry: 10-30s)
  ui_interaction: 8000,  // 8 seconds (industry: 5-15s)
  heartbeat: 240000,     // 4 minutes (industry: 1-10m)
  
  // Medium frequency events
  navigation: 8000,      // 8 seconds (industry: 5-15s)
  field_edit: 3000,      // 3 seconds (industry: 1-5s)
  search: 4000,          // 4 seconds (industry: 3-10s)
  
  // Lower frequency events
  feature_usage: 15000,  // 15 seconds (industry: 15-60s)
  action: 10000,         // 10 seconds (industry: 10-30s)
  project_open: 45000,   // 45 seconds (industry: 30-120s)
  performance: 20000,    // 20 seconds (industry: 15-60s)
  
  // Never throttle critical events
  error: 0,              // Never throttle errors
  session_start: 0,      // Never throttle session events
  session_end: 0         // Never throttle session events
};

// Advanced analytics features by plan
export const ANALYTICS_FEATURES = {
  free: {
    realTimeAnalytics: false,
    customDashboards: false,
    advancedFiltering: false,
    dataExport: false,
    apiAccess: false,
    retentionDays: 90
  },
  pro: {
    realTimeAnalytics: true,
    customDashboards: true,
    advancedFiltering: true,
    dataExport: true,
    apiAccess: true,
    retentionDays: -1 // Forever
  },
  enterprise: {
    realTimeAnalytics: true,
    customDashboards: true,
    advancedFiltering: true,
    dataExport: true,
    apiAccess: true,
    retentionDays: -1 // Forever
  }
};

/**
 * Get analytics configuration for a specific plan tier
 */
export function getAnalyticsConfig(planTier: 'free' | 'pro' | 'enterprise'): AnalyticsPlanConfig {
  return ANALYTICS_PLAN_CONFIG[planTier];
}

/**
 * Calculate throttle duration based on plan tier
 */
export function getThrottleDuration(eventType: string, planTier: 'free' | 'pro' | 'enterprise'): number {
  const baseThrottle = BASE_THROTTLE_DURATIONS[eventType] || 10000;
  const config = getAnalyticsConfig(planTier);
  
  // Apply plan-based multiplier
  return Math.round(baseThrottle * config.throttlingMultiplier);
}

/**
 * Check if user can track this many events per day
 */
export function canTrackEvent(currentDailyCount: number, planTier: 'free' | 'pro' | 'enterprise'): boolean {
  const config = getAnalyticsConfig(planTier);
  return currentDailyCount < config.maxEventsPerDay;
}

/**
 * Get TTL for analytics data based on plan and subscription status
 */
export function getAnalyticsTTL(
  planTier: 'free' | 'pro' | 'enterprise', 
  subscriptionStatus?: string
): number {
  const config = getAnalyticsConfig(planTier);
  
  // If subscription is canceled/inactive, revert to free tier TTL
  if ((planTier === 'pro' || planTier === 'enterprise') && 
      ['canceled', 'inactive', 'incomplete_expired'].includes(subscriptionStatus || '')) {
    return ANALYTICS_PLAN_CONFIG.free.retentionPeriod;
  }
  
  return config.retentionPeriod; // 0 = forever for active pro/enterprise
}
