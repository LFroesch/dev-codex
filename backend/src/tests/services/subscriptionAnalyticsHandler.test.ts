import { SubscriptionAnalyticsHandler, SubscriptionChangeEvent } from '../../services/subscriptionAnalyticsHandler';
import { AnalyticsService } from '../../middleware/analytics';

// Mock the AnalyticsService
jest.mock('../../middleware/analytics', () => ({
  AnalyticsService: {
    updateUserAnalyticsRetention: jest.fn().mockResolvedValue(undefined),
    trackEvent: jest.fn().mockResolvedValue(undefined),
    handleSubscriptionCancellation: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('SubscriptionAnalyticsHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handlePlanChange', () => {
    it('should handle upgrade events', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'free',
        newPlanTier: 'pro',
        subscriptionStatus: 'active',
        eventType: 'upgrade'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user123',
        'pro',
        'active'
      );
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith(
        'user123',
        'session_start',
        {
          actionName: 'plan_upgrade',
          metadata: {
            oldPlan: 'free',
            newPlan: 'pro',
            subscriptionStatus: 'active'
          }
        }
      );
    });

    it('should handle downgrade events', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'pro',
        newPlanTier: 'free',
        subscriptionStatus: 'active',
        eventType: 'downgrade'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user123',
        'free',
        'active'
      );
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith(
        'user123',
        'session_start',
        {
          actionName: 'plan_downgrade',
          metadata: {
            oldPlan: 'pro',
            newPlan: 'free',
            subscriptionStatus: 'active'
          }
        }
      );
    });

    it('should handle cancel events', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'pro',
        newPlanTier: 'free',
        subscriptionStatus: 'canceled',
        eventType: 'cancel'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.handleSubscriptionCancellation).toHaveBeenCalledWith('user123');
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith(
        'user123',
        'session_start',
        {
          actionName: 'subscription_canceled',
          metadata: {
            canceledPlan: 'pro',
            subscriptionStatus: 'canceled'
          }
        }
      );
    });

    it('should handle reactivate events', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'free',
        newPlanTier: 'pro',
        subscriptionStatus: 'active',
        eventType: 'reactivate'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user123',
        'pro',
        'active'
      );
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith(
        'user123',
        'session_start',
        {
          actionName: 'subscription_reactivated',
          metadata: {
            reactivatedPlan: 'pro',
            subscriptionStatus: 'active'
          }
        }
      );
    });

    it('should handle errors during plan change', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'free',
        newPlanTier: 'pro',
        subscriptionStatus: 'active',
        eventType: 'upgrade'
      };

      const error = new Error('Analytics service error');
      (AnalyticsService.updateUserAnalyticsRetention as jest.Mock).mockRejectedValueOnce(error);

      await expect(SubscriptionAnalyticsHandler.handlePlanChange(event)).rejects.toThrow('Analytics service error');
    });

    it('should not call any handlers for unknown event types', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'free',
        newPlanTier: 'pro',
        subscriptionStatus: 'active',
        eventType: 'unknown' as any
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).not.toHaveBeenCalled();
      expect(AnalyticsService.trackEvent).not.toHaveBeenCalled();
      expect(AnalyticsService.handleSubscriptionCancellation).not.toHaveBeenCalled();
    });
  });

  describe('handlePlanUpgrade', () => {
    it('should handle free to pro upgrade', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'free',
        newPlanTier: 'pro',
        subscriptionStatus: 'active',
        eventType: 'upgrade'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user123',
        'pro',
        'active'
      );
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith(
        'user123',
        'session_start',
        expect.objectContaining({
          actionName: 'plan_upgrade',
          metadata: expect.objectContaining({
            oldPlan: 'free',
            newPlan: 'pro'
          })
        })
      );
    });

    it('should handle pro to premium upgrade', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user456',
        oldPlanTier: 'pro',
        newPlanTier: 'premium',
        subscriptionStatus: 'active',
        eventType: 'upgrade'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user456',
        'premium',
        'active'
      );
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith(
        'user456',
        'session_start',
        expect.objectContaining({
          metadata: expect.objectContaining({
            oldPlan: 'pro',
            newPlan: 'premium'
          })
        })
      );
    });

    it('should handle free to premium upgrade', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user789',
        oldPlanTier: 'free',
        newPlanTier: 'premium',
        subscriptionStatus: 'active',
        eventType: 'upgrade'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user789',
        'premium',
        'active'
      );
    });
  });

  describe('handlePlanDowngrade', () => {
    it('should handle premium to pro downgrade', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'premium',
        newPlanTier: 'pro',
        subscriptionStatus: 'active',
        eventType: 'downgrade'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user123',
        'pro',
        'active'
      );
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith(
        'user123',
        'session_start',
        expect.objectContaining({
          actionName: 'plan_downgrade',
          metadata: expect.objectContaining({
            oldPlan: 'premium',
            newPlan: 'pro'
          })
        })
      );
    });

    it('should handle pro to free downgrade', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user456',
        oldPlanTier: 'pro',
        newPlanTier: 'free',
        subscriptionStatus: 'active',
        eventType: 'downgrade'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user456',
        'free',
        'active'
      );
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith(
        'user456',
        'session_start',
        expect.objectContaining({
          metadata: expect.objectContaining({
            oldPlan: 'pro',
            newPlan: 'free'
          })
        })
      );
    });

    it('should handle premium to free downgrade', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user789',
        oldPlanTier: 'premium',
        newPlanTier: 'free',
        subscriptionStatus: 'active',
        eventType: 'downgrade'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user789',
        'free',
        'active'
      );
    });
  });

  describe('handleSubscriptionCancellation', () => {
    it('should handle subscription cancellation for pro user', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'pro',
        newPlanTier: 'free',
        subscriptionStatus: 'canceled',
        eventType: 'cancel'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.handleSubscriptionCancellation).toHaveBeenCalledWith('user123');
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith(
        'user123',
        'session_start',
        expect.objectContaining({
          actionName: 'subscription_canceled',
          metadata: expect.objectContaining({
            canceledPlan: 'pro',
            subscriptionStatus: 'canceled'
          })
        })
      );
    });

    it('should handle subscription cancellation for premium user', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user456',
        oldPlanTier: 'premium',
        newPlanTier: 'free',
        subscriptionStatus: 'canceled',
        eventType: 'cancel'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.handleSubscriptionCancellation).toHaveBeenCalledWith('user456');
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith(
        'user456',
        'session_start',
        expect.objectContaining({
          metadata: expect.objectContaining({
            canceledPlan: 'premium'
          })
        })
      );
    });
  });

  describe('handleSubscriptionReactivation', () => {
    it('should handle subscription reactivation to pro', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'free',
        newPlanTier: 'pro',
        subscriptionStatus: 'active',
        eventType: 'reactivate'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user123',
        'pro',
        'active'
      );
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith(
        'user123',
        'session_start',
        expect.objectContaining({
          actionName: 'subscription_reactivated',
          metadata: expect.objectContaining({
            reactivatedPlan: 'pro',
            subscriptionStatus: 'active'
          })
        })
      );
    });

    it('should handle subscription reactivation to premium', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user456',
        oldPlanTier: 'free',
        newPlanTier: 'premium',
        subscriptionStatus: 'active',
        eventType: 'reactivate'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user456',
        'premium',
        'active'
      );
      expect(AnalyticsService.trackEvent).toHaveBeenCalledWith(
        'user456',
        'session_start',
        expect.objectContaining({
          metadata: expect.objectContaining({
            reactivatedPlan: 'premium'
          })
        })
      );
    });
  });

  describe('batchProcessPlanChanges', () => {
    it('should process multiple plan changes successfully', async () => {
      const events: SubscriptionChangeEvent[] = [
        {
          userId: 'user1',
          oldPlanTier: 'free',
          newPlanTier: 'pro',
          subscriptionStatus: 'active',
          eventType: 'upgrade'
        },
        {
          userId: 'user2',
          oldPlanTier: 'pro',
          newPlanTier: 'premium',
          subscriptionStatus: 'active',
          eventType: 'upgrade'
        },
        {
          userId: 'user3',
          oldPlanTier: 'premium',
          newPlanTier: 'pro',
          subscriptionStatus: 'active',
          eventType: 'downgrade'
        }
      ];

      const result = await SubscriptionAnalyticsHandler.batchProcessPlanChanges(events);

      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledTimes(3);
    });

    it('should handle errors during batch processing', async () => {
      const events: SubscriptionChangeEvent[] = [
        {
          userId: 'user1',
          oldPlanTier: 'free',
          newPlanTier: 'pro',
          subscriptionStatus: 'active',
          eventType: 'upgrade'
        },
        {
          userId: 'user2',
          oldPlanTier: 'pro',
          newPlanTier: 'premium',
          subscriptionStatus: 'active',
          eventType: 'upgrade'
        }
      ];

      // Make the second call fail
      (AnalyticsService.updateUserAnalyticsRetention as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Failed to update retention'));

      const result = await SubscriptionAnalyticsHandler.batchProcessPlanChanges(events);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        userId: 'user2',
        error: 'Failed to update retention'
      });
    });

    it('should continue processing after errors', async () => {
      const events: SubscriptionChangeEvent[] = [
        {
          userId: 'user1',
          oldPlanTier: 'free',
          newPlanTier: 'pro',
          subscriptionStatus: 'active',
          eventType: 'upgrade'
        },
        {
          userId: 'user2',
          oldPlanTier: 'pro',
          newPlanTier: 'premium',
          subscriptionStatus: 'active',
          eventType: 'upgrade'
        },
        {
          userId: 'user3',
          oldPlanTier: 'premium',
          newPlanTier: 'pro',
          subscriptionStatus: 'active',
          eventType: 'downgrade'
        }
      ];

      // Make the middle call fail
      (AnalyticsService.updateUserAnalyticsRetention as jest.Mock)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(undefined);

      const result = await SubscriptionAnalyticsHandler.batchProcessPlanChanges(events);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors[0].userId).toBe('user2');
    });

    it('should handle empty events array', async () => {
      const events: SubscriptionChangeEvent[] = [];

      const result = await SubscriptionAnalyticsHandler.batchProcessPlanChanges(events);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle unknown error types', async () => {
      const events: SubscriptionChangeEvent[] = [
        {
          userId: 'user1',
          oldPlanTier: 'free',
          newPlanTier: 'pro',
          subscriptionStatus: 'active',
          eventType: 'upgrade'
        }
      ];

      // Throw a non-Error object
      (AnalyticsService.updateUserAnalyticsRetention as jest.Mock)
        .mockRejectedValueOnce('String error');

      const result = await SubscriptionAnalyticsHandler.batchProcessPlanChanges(events);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toEqual({
        userId: 'user1',
        error: 'Unknown error'
      });
    });

    it('should process all event types in batch', async () => {
      const events: SubscriptionChangeEvent[] = [
        {
          userId: 'user1',
          oldPlanTier: 'free',
          newPlanTier: 'pro',
          subscriptionStatus: 'active',
          eventType: 'upgrade'
        },
        {
          userId: 'user2',
          oldPlanTier: 'premium',
          newPlanTier: 'pro',
          subscriptionStatus: 'active',
          eventType: 'downgrade'
        },
        {
          userId: 'user3',
          oldPlanTier: 'pro',
          newPlanTier: 'free',
          subscriptionStatus: 'canceled',
          eventType: 'cancel'
        },
        {
          userId: 'user4',
          oldPlanTier: 'free',
          newPlanTier: 'pro',
          subscriptionStatus: 'active',
          eventType: 'reactivate'
        }
      ];

      const result = await SubscriptionAnalyticsHandler.batchProcessPlanChanges(events);

      expect(result.successful).toBe(4);
      expect(result.failed).toBe(0);
      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledTimes(3); // upgrade, downgrade, reactivate
      expect(AnalyticsService.handleSubscriptionCancellation).toHaveBeenCalledTimes(1); // cancel
      expect(AnalyticsService.trackEvent).toHaveBeenCalledTimes(4);
    });
  });

  describe('subscription status handling', () => {
    it('should handle incomplete_expired subscription status', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'pro',
        newPlanTier: 'free',
        subscriptionStatus: 'incomplete_expired',
        eventType: 'downgrade'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user123',
        'free',
        'incomplete_expired'
      );
    });

    it('should handle past_due subscription status', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'pro',
        newPlanTier: 'free',
        subscriptionStatus: 'past_due',
        eventType: 'downgrade'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user123',
        'free',
        'past_due'
      );
    });

    it('should handle inactive subscription status', async () => {
      const event: SubscriptionChangeEvent = {
        userId: 'user123',
        oldPlanTier: 'pro',
        newPlanTier: 'free',
        subscriptionStatus: 'inactive',
        eventType: 'downgrade'
      };

      await SubscriptionAnalyticsHandler.handlePlanChange(event);

      expect(AnalyticsService.updateUserAnalyticsRetention).toHaveBeenCalledWith(
        'user123',
        'free',
        'inactive'
      );
    });
  });
});
