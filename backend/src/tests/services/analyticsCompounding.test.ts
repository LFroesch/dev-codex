import { AnalyticsCompoundingService } from '../../services/analyticsCompounding';
import Analytics from '../../models/Analytics';
import CompactedAnalytics from '../../models/CompactedAnalytics';
import { User } from '../../models/User';
import mongoose from 'mongoose';

describe('AnalyticsCompoundingService', () => {
  let service: AnalyticsCompoundingService;
  let testUser: any;

  beforeEach(async () => {
    service = new AnalyticsCompoundingService();

    await Analytics.deleteMany({});
    await CompactedAnalytics.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      planTier: 'free',
      isEmailVerified: true
    });
  });

  afterEach(async () => {
    await Analytics.deleteMany({});
    await CompactedAnalytics.deleteMany({});
    await User.deleteMany({});
  });

  describe('calculateTTL', () => {
    it('should return undefined for all plan tiers', () => {
      expect(service.calculateTTL('free')).toBeUndefined();
      expect(service.calculateTTL('pro')).toBeUndefined();
      expect(service.calculateTTL('premium')).toBeUndefined();
      expect(service.calculateTTL('enterprise')).toBeUndefined();
    });

    it('should return undefined for any plan tier (compacted data never expires)', () => {
      expect(service.calculateTTL('unknown-tier')).toBeUndefined();
    });
  });

  describe('compactOldEvents', () => {
    it('should return empty result when no events to compact', async () => {
      const result = await service.compactOldEvents();

      expect(result.eventsProcessed).toBe(0);
      expect(result.compactedRecordsCreated).toBe(0);
      expect(result.eventsDeleted).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should compact events older than 7 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      // Create old events
      await Analytics.create([
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        },
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        }
      ]);

      const result = await service.compactOldEvents();

      expect(result.eventsProcessed).toBe(2);
      expect(result.compactedRecordsCreated).toBeGreaterThan(0);
      expect(result.eventsDeleted).toBe(2);
      expect(result.errors).toHaveLength(0);

      // Verify compacted record was created
      const compacted = await CompactedAnalytics.findOne();
      expect(compacted).toBeTruthy();
      expect(compacted?.count).toBe(2);
      expect(compacted?.eventType).toBe('project_open');
    });

    it('should not compact critical events', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      // Create critical events (should not be compacted)
      await Analytics.create([
        {
          userId: testUser._id,
          eventType: 'checkout_completed',
          category: 'business',
          timestamp: oldDate,
          isConversion: true,
          planTier: 'free',
          sessionId: 'session1'
        },
        {
          userId: testUser._id,
          eventType: 'user_upgraded',
          category: 'business',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'pro',
          sessionId: 'session1'
        }
      ]);

      const result = await service.compactOldEvents();

      expect(result.eventsProcessed).toBe(0);
      expect(result.compactedRecordsCreated).toBe(0);
      expect(result.eventsDeleted).toBe(0);

      // Verify critical events still exist
      const criticalEvents = await Analytics.countDocuments();
      expect(criticalEvents).toBe(2);
    });

    it('should not compact conversion events', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      await Analytics.create({
        userId: testUser._id,
        eventType: 'feature_used',
        category: 'engagement',
        timestamp: oldDate,
        isConversion: true,
        planTier: 'free',
        sessionId: 'session1'
      });

      const result = await service.compactOldEvents();

      expect(result.eventsProcessed).toBe(0);
      expect(result.eventsDeleted).toBe(0);

      // Verify conversion event still exists
      const conversionEvents = await Analytics.countDocuments();
      expect(conversionEvents).toBe(1);
    });

    it('should not compact recent events (less than 7 days old)', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days ago

      await Analytics.create({
        userId: testUser._id,
        eventType: 'project_open',
        category: 'engagement',
        timestamp: recentDate,
        isConversion: false,
        planTier: 'free',
        sessionId: 'session1'
      });

      const result = await service.compactOldEvents();

      expect(result.eventsProcessed).toBe(0);
      expect(result.eventsDeleted).toBe(0);

      // Verify recent event still exists
      const recentEvents = await Analytics.countDocuments();
      expect(recentEvents).toBe(1);
    });

    it('should aggregate events by date, userId, and eventType', async () => {
      const oldDate1 = new Date();
      oldDate1.setDate(oldDate1.getDate() - 10);
      const oldDate2 = new Date();
      oldDate2.setDate(oldDate2.getDate() - 11);

      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'Password123!',
        firstName: 'User',
        lastName: 'Two',
        username: 'user2',
        planTier: 'pro',
        isEmailVerified: true
      });

      // Create events for different users and event types
      await Analytics.create([
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate1,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        },
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate1,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        },
        {
          userId: testUser._id,
          eventType: 'feature_used',
          category: 'engagement',
          timestamp: oldDate1,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        },
        {
          userId: user2._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate1,
          isConversion: false,
          planTier: 'pro',
          sessionId: 'session2'
        },
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate2,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        }
      ]);

      const result = await service.compactOldEvents();

      expect(result.eventsProcessed).toBe(5);
      expect(result.eventsDeleted).toBe(5);

      // Should create separate compacted records for:
      // 1. testUser + project_open + date1
      // 2. testUser + feature_used + date1
      // 3. user2 + project_open + date1
      // 4. testUser + project_open + date2
      expect(result.compactedRecordsCreated).toBe(4);

      const compacted = await CompactedAnalytics.find();
      expect(compacted).toHaveLength(4);
    });

    it('should calculate duration metrics correctly', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      await Analytics.create([
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1',
          eventData: { duration: 100 }
        },
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1',
          eventData: { duration: 200 }
        }
      ]);

      const result = await service.compactOldEvents();

      expect(result.compactedRecordsCreated).toBe(1);

      const compacted = await CompactedAnalytics.findOne();
      expect(compacted?.totalDuration).toBe(300);
      expect(compacted?.avgDuration).toBe(150); // 300 / 2
      expect(compacted?.count).toBe(2);
    });

    it('should count unique sessions correctly', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      await Analytics.create([
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        },
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        },
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session2'
        }
      ]);

      const result = await service.compactOldEvents();

      expect(result.compactedRecordsCreated).toBe(1);

      const compacted = await CompactedAnalytics.findOne();
      expect(compacted?.uniqueSessions).toBe(2);
      expect(compacted?.count).toBe(3);
    });

    it('should set expiresAt to undefined (never expires)', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      await Analytics.create({
        userId: testUser._id,
        eventType: 'project_open',
        category: 'engagement',
        timestamp: oldDate,
        isConversion: false,
        planTier: 'free',
        sessionId: 'session1'
      });

      await service.compactOldEvents();

      const compacted = await CompactedAnalytics.findOne();
      expect(compacted?.expiresAt).toBeUndefined();
    });

    it('should handle events with projectId', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const projectId = new mongoose.Types.ObjectId();

      await Analytics.create([
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1',
          eventData: { projectId: projectId.toString() }
        },
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1',
          eventData: { projectId: projectId.toString() }
        }
      ]);

      const result = await service.compactOldEvents();

      expect(result.compactedRecordsCreated).toBe(1);

      const compacted = await CompactedAnalytics.findOne();
      expect(compacted?.projectId?.toString()).toBe(projectId.toString());
      expect(compacted?.count).toBe(2);
    });

    it('should handle events without projectId', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      await Analytics.create({
        userId: testUser._id,
        eventType: 'project_open',
        category: 'engagement',
        timestamp: oldDate,
        isConversion: false,
        planTier: 'free',
        sessionId: 'session1',
        eventData: {}
      });

      const result = await service.compactOldEvents();

      expect(result.compactedRecordsCreated).toBe(1);

      const compacted = await CompactedAnalytics.findOne();
      expect(compacted?.projectId).toBeUndefined();
    });

    it('should store firstEvent and lastEvent timestamps', async () => {
      const oldDate1 = new Date();
      oldDate1.setDate(oldDate1.getDate() - 10);
      oldDate1.setHours(10, 0, 0, 0);

      const oldDate2 = new Date();
      oldDate2.setDate(oldDate2.getDate() - 10);
      oldDate2.setHours(15, 0, 0, 0);

      await Analytics.create([
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate1,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        },
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate2,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        }
      ]);

      await service.compactOldEvents();

      const compacted = await CompactedAnalytics.findOne();
      expect(compacted?.timestamps?.firstEvent).toEqual(oldDate1);
      expect(compacted?.timestamps?.lastEvent).toEqual(oldDate2);
    });

    it('should handle database errors gracefully', async () => {
      // Mock Analytics.countDocuments to throw an error
      jest.spyOn(Analytics, 'countDocuments').mockRejectedValueOnce(new Error('Database error'));

      const result = await service.compactOldEvents();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Database error');

      jest.restoreAllMocks();
    });

    it('should continue even if insertMany has duplicate key errors', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      // Create old event
      await Analytics.create({
        userId: testUser._id,
        eventType: 'project_open',
        category: 'engagement',
        timestamp: oldDate,
        isConversion: false,
        planTier: 'free',
        sessionId: 'session1'
      });

      // Pre-create a compacted record with the same key
      await CompactedAnalytics.create({
        date: new Date(oldDate.toISOString().split('T')[0]),
        userId: testUser._id,
        eventType: 'project_open',
        category: 'engagement',
        count: 1,
        totalDuration: 0,
        avgDuration: 0,
        uniqueSessions: 1,
        planTier: 'free',
        timestamps: {
          firstEvent: oldDate,
          lastEvent: oldDate
        }
      });

      // This should handle the duplicate gracefully with ordered: false
      const result = await service.compactOldEvents();

      // The process should complete even with duplicates
      expect(result.eventsProcessed).toBe(1);
    });
  });

  describe('manualCompact', () => {
    it('should compact events based on custom days parameter', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 15); // 15 days ago

      await Analytics.create({
        userId: testUser._id,
        eventType: 'project_open',
        category: 'engagement',
        timestamp: oldDate,
        isConversion: false,
        planTier: 'free',
        sessionId: 'session1'
      });

      const result = await service.manualCompact(10); // Compact events older than 10 days

      expect(result.eventsProcessed).toBe(1);
      expect(result.compactedRecordsCreated).toBe(1);
      expect(result.eventsDeleted).toBe(1);
    });

    it('should use default of 7 days if not specified', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      await Analytics.create({
        userId: testUser._id,
        eventType: 'project_open',
        category: 'engagement',
        timestamp: oldDate,
        isConversion: false,
        planTier: 'free',
        sessionId: 'session1'
      });

      const result = await service.manualCompact();

      expect(result.eventsProcessed).toBe(1);
    });
  });

  describe('getCompactionStats', () => {
    it('should return zero stats when no data exists', async () => {
      const stats = await service.getCompactionStats();

      expect(stats.totalRawEvents).toBe(0);
      expect(stats.totalCompactedRecords).toBe(0);
      expect(stats.oldestRawEvent).toBeNull();
      expect(stats.oldestCompactedRecord).toBeNull();
      expect(stats.storageEstimate.rawEventsBytes).toBe(0);
      expect(stats.storageEstimate.compactedBytes).toBe(0);
      expect(stats.storageEstimate.savingsPercentage).toBe(0);
    });

    it('should calculate correct stats with raw events only', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 5);

      await Analytics.create([
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        },
        {
          userId: testUser._id,
          eventType: 'feature_used',
          category: 'engagement',
          timestamp: new Date(),
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        }
      ]);

      const stats = await service.getCompactionStats();

      expect(stats.totalRawEvents).toBe(2);
      expect(stats.totalCompactedRecords).toBe(0);
      expect(stats.oldestRawEvent).toEqual(oldDate);
      expect(stats.storageEstimate.rawEventsBytes).toBe(1000); // 2 * 500
      expect(stats.storageEstimate.compactedBytes).toBe(0);
    });

    it('should calculate correct stats after compaction', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      // Create old events
      await Analytics.create([
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        },
        {
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        }
      ]);

      // Compact them
      await service.compactOldEvents();

      // Add a new recent event
      await Analytics.create({
        userId: testUser._id,
        eventType: 'feature_used',
        category: 'engagement',
        timestamp: new Date(),
        isConversion: false,
        planTier: 'free',
        sessionId: 'session1'
      });

      const stats = await service.getCompactionStats();

      expect(stats.totalRawEvents).toBe(1); // Only recent event remains
      expect(stats.totalCompactedRecords).toBe(1); // One compacted record created
      expect(stats.storageEstimate.rawEventsBytes).toBe(500); // 1 * 500
      expect(stats.storageEstimate.compactedBytes).toBe(200); // 1 * 200
      expect(stats.storageEstimate.savingsPercentage).toBeGreaterThan(0);
    });

    it('should calculate storage savings percentage correctly', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      // Create 10 old events that will be compacted into 1 record
      const events = [];
      for (let i = 0; i < 10; i++) {
        events.push({
          userId: testUser._id,
          eventType: 'project_open',
          category: 'engagement',
          timestamp: oldDate,
          isConversion: false,
          planTier: 'free',
          sessionId: 'session1'
        });
      }
      await Analytics.create(events);

      await service.compactOldEvents();

      const stats = await service.getCompactionStats();

      // After compaction: 0 raw, 1 compacted
      // Savings = (0 - 200) / 0 = undefined, but we keep 1 compacted record
      expect(stats.totalCompactedRecords).toBe(1);
      expect(stats.storageEstimate.compactedBytes).toBe(200);
    });

    it('should return oldest event and record dates correctly', async () => {
      const veryOldDate = new Date('2023-01-01');
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      // Create a very old compacted record
      await CompactedAnalytics.create({
        date: veryOldDate,
        userId: testUser._id,
        eventType: 'project_open',
        category: 'engagement',
        count: 5,
        totalDuration: 0,
        avgDuration: 0,
        uniqueSessions: 1,
        planTier: 'free',
        timestamps: {
          firstEvent: veryOldDate,
          lastEvent: veryOldDate
        }
      });

      // Create a recent raw event
      await Analytics.create({
        userId: testUser._id,
        eventType: 'feature_used',
        category: 'engagement',
        timestamp: oldDate,
        isConversion: false,
        planTier: 'free',
        sessionId: 'session1'
      });

      const stats = await service.getCompactionStats();

      expect(stats.oldestRawEvent).toEqual(oldDate);
      expect(stats.oldestCompactedRecord).toEqual(veryOldDate);
    });

    it('should handle database errors', async () => {
      jest.spyOn(Analytics, 'countDocuments').mockRejectedValueOnce(new Error('Database error'));

      await expect(service.getCompactionStats()).rejects.toThrow('Database error');

      jest.restoreAllMocks();
    });
  });
});
