/**
 * Webhook handler for subscription changes
 * Automatically updates analytics retention when plans change
 */

import { AnalyticsService } from '../middleware/analytics';

export interface SubscriptionChangeEvent {
  userId: string;
  oldPlanTier: 'free' | 'pro' | 'premium';
  newPlanTier: 'free' | 'pro' | 'premium';
  subscriptionStatus: 'active' | 'inactive' | 'canceled' | 'past_due' | 'incomplete_expired';
  eventType: 'upgrade' | 'downgrade' | 'cancel' | 'reactivate';
}

export class SubscriptionAnalyticsHandler {
  /**
   * Handle subscription plan changes and update analytics retention accordingly
   */
  static async handlePlanChange(event: SubscriptionChangeEvent): Promise<void> {
    try {

      switch (event.eventType) {
        case 'upgrade':
          await this.handlePlanUpgrade(event);
          break;
        
        case 'downgrade':
          await this.handlePlanDowngrade(event);
          break;
        
        case 'cancel':
          await this.handleSubscriptionCancellation(event);
          break;
        
        case 'reactivate':
          await this.handleSubscriptionReactivation(event);
          break;
        
        default:
      }

    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Handle plan upgrades (free → pro/premium, pro → premium)
   */
  private static async handlePlanUpgrade(event: SubscriptionChangeEvent): Promise<void> {
    
    // Upgrade to unlimited retention
    await AnalyticsService.updateUserAnalyticsRetention(
      event.userId, 
      event.newPlanTier, 
      event.subscriptionStatus
    );

    // Track the upgrade event
    await AnalyticsService.trackEvent(event.userId, 'session_start', {
      actionName: 'plan_upgrade',
      metadata: {
        oldPlan: event.oldPlanTier,
        newPlan: event.newPlanTier,
        subscriptionStatus: event.subscriptionStatus
      }
    });
  }

  /**
   * Handle plan downgrades (premium → pro/free, pro → free)
   */
  private static async handlePlanDowngrade(event: SubscriptionChangeEvent): Promise<void> {
    
    // Apply new retention limits
    await AnalyticsService.updateUserAnalyticsRetention(
      event.userId, 
      event.newPlanTier, 
      event.subscriptionStatus
    );

    // Track the downgrade event
    await AnalyticsService.trackEvent(event.userId, 'session_start', {
      actionName: 'plan_downgrade',
      metadata: {
        oldPlan: event.oldPlanTier,
        newPlan: event.newPlanTier,
        subscriptionStatus: event.subscriptionStatus
      }
    });
  }

  /**
   * Handle subscription cancellations
   */
  private static async handleSubscriptionCancellation(event: SubscriptionChangeEvent): Promise<void> {
    
    // Revert to free tier retention
    await AnalyticsService.handleSubscriptionCancellation(event.userId);

    // Track the cancellation event
    await AnalyticsService.trackEvent(event.userId, 'session_start', {
      actionName: 'subscription_canceled',
      metadata: {
        canceledPlan: event.oldPlanTier,
        subscriptionStatus: event.subscriptionStatus
      }
    });
  }

  /**
   * Handle subscription reactivations
   */
  private static async handleSubscriptionReactivation(event: SubscriptionChangeEvent): Promise<void> {
    
    // Restore plan-based retention
    await AnalyticsService.updateUserAnalyticsRetention(
      event.userId, 
      event.newPlanTier, 
      'active'
    );

    // Track the reactivation event
    await AnalyticsService.trackEvent(event.userId, 'session_start', {
      actionName: 'subscription_reactivated',
      metadata: {
        reactivatedPlan: event.newPlanTier,
        subscriptionStatus: 'active'
      }
    });
  }

  /**
   * Batch process multiple subscription changes
   */
  static async batchProcessPlanChanges(events: SubscriptionChangeEvent[]): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ userId: string; error: string }>
    };

    for (const event of events) {
      try {
        await this.handlePlanChange(event);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          userId: event.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}
