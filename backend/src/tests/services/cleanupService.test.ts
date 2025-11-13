import { CleanupService } from '../../services/cleanupService';
import Analytics from '../../models/Analytics';
import ActivityLog from '../../models/ActivityLog';
import ProjectInvitation from '../../models/ProjectInvitation';
import Notification from '../../models/Notification';
import UserSession from '../../models/UserSession';
import RateLimit from '../../models/RateLimit';
import { Project } from '../../models/Project';
import { User } from '../../models/User';
import NoteLock from '../../models/NoteLock';
import mongoose from 'mongoose';

// Mock all models
jest.mock('../../models/Analytics');
jest.mock('../../models/ActivityLog');
jest.mock('../../models/ProjectInvitation');
jest.mock('../../models/Notification');
jest.mock('../../models/UserSession');
jest.mock('../../models/RateLimit');
jest.mock('../../models/Project');
jest.mock('../../models/User');
jest.mock('../../models/NoteLock');
jest.mock('../../models/TeamMember');

describe('CleanupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDatabaseStats', () => {
    it('should return database statistics', async () => {
      // Mock count documents
      (Analytics.countDocuments as jest.Mock).mockResolvedValue(100);
      (ActivityLog.countDocuments as jest.Mock).mockResolvedValue(500);
      (ProjectInvitation.countDocuments as jest.Mock).mockResolvedValue(50);
      (Notification.countDocuments as jest.Mock).mockResolvedValue(200);
      (UserSession.countDocuments as jest.Mock).mockResolvedValue(75);
      (RateLimit.countDocuments as jest.Mock).mockResolvedValue(25);
      (Project.countDocuments as jest.Mock).mockResolvedValue(30);
      (User.countDocuments as jest.Mock).mockResolvedValue(10);
      (NoteLock.countDocuments as jest.Mock).mockResolvedValue(5);

      // Mock mongoose connection stats using defineProperty to avoid read-only error
      Object.defineProperty(mongoose.connection, 'db', {
        value: {
          stats: jest.fn().mockResolvedValue({
            dataSize: 1024 * 1024 * 1024, // 1GB
            indexSize: 512 * 1024 * 1024, // 512MB
            avgObjSize: 1024, // 1KB
            storageEngine: 'wiredTiger'
          }),
          collection: jest.fn().mockReturnValue({
            stats: jest.fn().mockResolvedValue({
              count: 100,
              size: 1024 * 1024, // 1MB
              avgObjSize: 1024
            })
          })
        },
        writable: true,
        configurable: true
      });

      const stats = await CleanupService.getDatabaseStats();

      expect(stats).toHaveProperty('collections');
      expect(stats).toHaveProperty('totalDocuments');
      expect(stats.collections.analytics).toBe(100);
      expect(stats.collections.activityLogs).toBe(500);
      expect(stats.totalDocuments).toBe(995); // sum of all counts
    });
  });

  describe('cleanupOldAnalytics', () => {
    it('should delete analytics older than specified days', async () => {
      const mockDeleteResult = { deletedCount: 50 };
      (Analytics.deleteMany as jest.Mock).mockResolvedValue(mockDeleteResult);

      const result = await CleanupService.cleanupOldAnalytics(180);

      expect(Analytics.deleteMany).toHaveBeenCalledWith({
        timestamp: { $lt: expect.any(Date) }
      });
      expect(result.deleted).toBe(50);
      expect(result.cutoffDate).toBeDefined();
    });

    it('should use default days if not specified', async () => {
      const mockDeleteResult = { deletedCount: 25 };
      (Analytics.deleteMany as jest.Mock).mockResolvedValue(mockDeleteResult);

      const result = await CleanupService.cleanupOldAnalytics();

      expect(result.deleted).toBe(25);
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should mark expired invitations', async () => {
      // Mock find() to return an empty array since the function uses for..of
      (ProjectInvitation.find as jest.Mock).mockResolvedValue([]);

      const result = await CleanupService.cleanupExpiredInvitations();

      expect(ProjectInvitation.find).toHaveBeenCalled();
      expect(result.markedExpired).toBe(0);
      expect(result.message).toContain('TTL');
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should delete old legacy notifications', async () => {
      const mockDeleteResult = { deletedCount: 100 };
      (Notification.deleteMany as jest.Mock).mockResolvedValue(mockDeleteResult);

      const result = await CleanupService.cleanupOldNotifications(90);

      expect(Notification.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: { $lt: expect.any(Date) },
          expiresAt: { $exists: false }
        })
      );
      expect(result.deleted).toBe(100);
    });
  });

  describe('cleanupOldActivityLogs', () => {
    it('should delete legacy activity logs older than specified days', async () => {
      const mockDeleteResult = { deletedCount: 250 };
      (ActivityLog.deleteMany as jest.Mock).mockResolvedValue(mockDeleteResult);

      const result = await CleanupService.cleanupOldActivityLogs(90);

      expect(ActivityLog.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: { $lt: expect.any(Date) },
          expiresAt: { $exists: false }
        })
      );
      expect(result.deleted).toBe(250);
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('should delete inactive user sessions', async () => {
      const mockDeleteResult = { deletedCount: 30 };
      (UserSession.deleteMany as jest.Mock).mockResolvedValue(mockDeleteResult);

      const result = await CleanupService.cleanupInactiveSessions();

      expect(UserSession.deleteMany).toHaveBeenCalled();
      expect(result.deleted).toBe(30);
    });
  });

  describe('runCompleteCleanup', () => {
    it('should run all cleanup tasks and return aggregated results', async () => {
      // Mock all cleanup methods
      (Analytics.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 100 });
      (ProjectInvitation.find as jest.Mock).mockResolvedValue([]);
      (Notification.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 50 });
      (ActivityLog.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 200 });
      (UserSession.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 25 });

      // Mock getDatabaseStats
      (Analytics.countDocuments as jest.Mock).mockResolvedValue(50);
      (ActivityLog.countDocuments as jest.Mock).mockResolvedValue(300);
      (ProjectInvitation.countDocuments as jest.Mock).mockResolvedValue(25);
      (Notification.countDocuments as jest.Mock).mockResolvedValue(150);
      (UserSession.countDocuments as jest.Mock).mockResolvedValue(50);
      (RateLimit.countDocuments as jest.Mock).mockResolvedValue(10);
      (Project.countDocuments as jest.Mock).mockResolvedValue(20);
      (User.countDocuments as jest.Mock).mockResolvedValue(5);
      (NoteLock.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await CleanupService.runCompleteCleanup();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('analytics');
      expect(result).toHaveProperty('invitations');
      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('activityLogs');
      expect(result).toHaveProperty('userSessions');
      expect(result).toHaveProperty('totalDeleted');
      expect(result).toHaveProperty('statsAfterCleanup');
      expect(result.totalDeleted).toBe(375); // 100 + 50 + 200 + 25
    });
  });

  describe('getCleanupRecommendations', () => {
    it('should return cleanup recommendations', async () => {
      // Mock database stats
      (Analytics.countDocuments as jest.Mock).mockResolvedValue(2000);
      (ActivityLog.countDocuments as jest.Mock).mockResolvedValue(300);
      (ProjectInvitation.countDocuments as jest.Mock).mockResolvedValue(60);
      (Notification.countDocuments as jest.Mock).mockResolvedValue(600);
      (UserSession.countDocuments as jest.Mock).mockResolvedValue(50);
      (RateLimit.countDocuments as jest.Mock).mockResolvedValue(10);
      (Project.countDocuments as jest.Mock).mockResolvedValue(20);
      (User.countDocuments as jest.Mock).mockResolvedValue(5);
      (NoteLock.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await CleanupService.getCleanupRecommendations();

      expect(result).toHaveProperty('currentStats');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('shouldRunCleanup');
      expect(typeof result.shouldRunCleanup).toBe('boolean');
    });

    it('should recommend cleanup when thresholds are exceeded', async () => {
      // Mock high counts
      (Analytics.countDocuments as jest.Mock).mockResolvedValue(5000);
      (ProjectInvitation.countDocuments as jest.Mock).mockResolvedValue(100);
      (Notification.countDocuments as jest.Mock).mockResolvedValue(1000);
      (ActivityLog.countDocuments as jest.Mock).mockResolvedValue(300);
      (UserSession.countDocuments as jest.Mock).mockResolvedValue(50);
      (RateLimit.countDocuments as jest.Mock).mockResolvedValue(10);
      (Project.countDocuments as jest.Mock).mockResolvedValue(20);
      (User.countDocuments as jest.Mock).mockResolvedValue(5);
      (NoteLock.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await CleanupService.getCleanupRecommendations();

      expect(result.shouldRunCleanup).toBe(true);
    });
  });

  describe('getRetentionStats', () => {
    it('should return retention statistics', async () => {
      const mockActivityStats = [
        { _id: 'free', count: 100, withExpiration: 90 }
      ];
      const mockNotificationStats = [
        { _id: { planTier: 'free', importance: 'high' }, count: 50, withExpiration: 45 }
      ];
      const mockTeamMemberStats = [
        { _id: true, count: 20 },
        { _id: false, count: 5 }
      ];

      (ActivityLog.aggregate as jest.Mock).mockResolvedValue(mockActivityStats);
      (Notification.aggregate as jest.Mock).mockResolvedValue(mockNotificationStats);
      const TeamMember = require('../../models/TeamMember').default;
      (TeamMember.aggregate as jest.Mock).mockResolvedValue(mockTeamMemberStats);

      const result = await CleanupService.getRetentionStats();

      expect(result).toHaveProperty('activityLogs');
      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('teamMembers');
      expect(result).toHaveProperty('summary');
      expect(result.activityLogs).toEqual(mockActivityStats);
    });
  });

  describe('cleanupOrphanedProjects', () => {
    it('should delete projects with invalid owners', async () => {
      const mockOrphanedProjects = [
        { _id: 'orphan1', name: 'Orphaned Project 1', ownerId: 'invalid1', createdAt: new Date() },
        { _id: 'orphan2', name: 'Orphaned Project 2', ownerId: 'invalid2', createdAt: new Date() }
      ];

      (Project.aggregate as jest.Mock).mockResolvedValue(mockOrphanedProjects);
      (Project.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 2 });

      const result = await CleanupService.cleanupOrphanedProjects();

      expect(result.orphanedFound).toBe(2);
      expect(result.deleted).toBe(2);
      expect(result.orphanedProjects).toHaveLength(2);
    });

    it('should handle errors gracefully', async () => {
      (Project.aggregate as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await CleanupService.cleanupOrphanedProjects();

      expect(result.error).toBeDefined();
      expect(result.orphanedFound).toBe(0);
      expect(result.deleted).toBe(0);
    });
  });

  describe('cleanupStaleNoteLocks', () => {
    it('should delete stale note locks older than 1 hour', async () => {
      const mockDeleteResult = { deletedCount: 5 };
      (NoteLock.deleteMany as jest.Mock).mockResolvedValue(mockDeleteResult);

      const result = await CleanupService.cleanupStaleNoteLocks();

      expect(NoteLock.deleteMany).toHaveBeenCalledWith({
        lastHeartbeat: { $lt: expect.any(Date) }
      });
      expect(result.deleted).toBe(5);
      expect(result.cutoffTime).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      (NoteLock.deleteMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await CleanupService.cleanupStaleNoteLocks();

      expect(result.error).toBeDefined();
      expect(result.deleted).toBe(0);
    });
  });

  describe('cleanupOldRateLimits', () => {
    it('should delete rate limits older than 1 day', async () => {
      const mockDeleteResult = { deletedCount: 15 };
      (RateLimit.deleteMany as jest.Mock).mockResolvedValue(mockDeleteResult);

      const result = await CleanupService.cleanupOldRateLimits();

      expect(RateLimit.deleteMany).toHaveBeenCalledWith({
        windowStart: { $lt: expect.any(Date) }
      });
      expect(result.deleted).toBe(15);
    });

    it('should handle errors gracefully', async () => {
      (RateLimit.deleteMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await CleanupService.cleanupOldRateLimits();

      expect(result.error).toBeDefined();
      expect(result.deleted).toBe(0);
    });
  });

  describe('optimizeDatabase', () => {
    it('should rebuild indexes for all collections', async () => {
      const mockCreateIndexes = jest.fn().mockResolvedValue({});
      Object.defineProperty(mongoose.connection, 'db', {
        value: {
          collection: jest.fn().mockReturnValue({
            createIndexes: mockCreateIndexes
          }),
          stats: jest.fn().mockResolvedValue({
            dataSize: 1024,
            indexSize: 512,
            avgObjSize: 100,
            storageEngine: 'wiredTiger'
          })
        },
        writable: true,
        configurable: true
      });

      const result = await CleanupService.optimizeDatabase();

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(mockCreateIndexes).toHaveBeenCalled();
    });

    it('should handle collection-specific errors', async () => {
      let callCount = 0;
      const mockCreateIndexes = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Index creation failed');
        }
        return Promise.resolve({});
      });

      Object.defineProperty(mongoose.connection, 'db', {
        value: {
          collection: jest.fn().mockReturnValue({
            createIndexes: mockCreateIndexes
          }),
          stats: jest.fn().mockResolvedValue({
            dataSize: 1024,
            indexSize: 512,
            avgObjSize: 100,
            storageEngine: 'wiredTiger'
          })
        },
        writable: true,
        configurable: true
      });

      const result = await CleanupService.optimizeDatabase();

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      // Check that at least one result contains "failed"
      if (result.results) {
        const hasFailedResult = result.results.some((r: string) => r.includes('failed'));
        expect(hasFailedResult).toBe(true);
      }
    });
  });

  describe('getPerformanceRecommendations', () => {
    it('should return recommendations for large collections', async () => {
      // Mock large analytics collection
      (Analytics.countDocuments as jest.Mock).mockResolvedValue(150000);
      (ActivityLog.countDocuments as jest.Mock).mockResolvedValue(500);
      (ProjectInvitation.countDocuments as jest.Mock).mockResolvedValue(50);
      (Notification.countDocuments as jest.Mock).mockResolvedValue(200);
      (UserSession.countDocuments as jest.Mock).mockResolvedValue(75);
      (RateLimit.countDocuments as jest.Mock).mockResolvedValue(25);
      (Project.countDocuments as jest.Mock).mockResolvedValue(30);
      (User.countDocuments as jest.Mock).mockResolvedValue(10);
      (NoteLock.countDocuments as jest.Mock).mockResolvedValue(5);

      // Mock aggregate for orphaned projects
      (Project.aggregate as jest.Mock).mockResolvedValue([]);

      Object.defineProperty(mongoose.connection, 'db', {
        value: {
          stats: jest.fn().mockResolvedValue({
            dataSize: 1024 * 1024 * 1024,
            indexSize: 512 * 1024 * 1024,
            avgObjSize: 1024,
            storageEngine: 'wiredTiger'
          }),
          collection: jest.fn().mockReturnValue({
            stats: jest.fn().mockResolvedValue({
              count: 100,
              size: 1024 * 1024,
              avgObjSize: 1024
            })
          })
        },
        writable: true,
        configurable: true
      });

      const result = await CleanupService.getPerformanceRecommendations();

      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('overallHealth');
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].type).toBe('warning');
      expect(result.recommendations[0].collection).toBe('analytics');
      expect(result.overallHealth).toBe('good');
    });

    it('should detect orphaned projects', async () => {
      (Analytics.countDocuments as jest.Mock).mockResolvedValue(1000);
      (ActivityLog.countDocuments as jest.Mock).mockResolvedValue(500);
      (ProjectInvitation.countDocuments as jest.Mock).mockResolvedValue(50);
      (Notification.countDocuments as jest.Mock).mockResolvedValue(200);
      (UserSession.countDocuments as jest.Mock).mockResolvedValue(75);
      (RateLimit.countDocuments as jest.Mock).mockResolvedValue(25);
      (Project.countDocuments as jest.Mock).mockResolvedValue(30);
      (User.countDocuments as jest.Mock).mockResolvedValue(10);
      (NoteLock.countDocuments as jest.Mock).mockResolvedValue(5);

      // Mock orphaned projects found
      (Project.aggregate as jest.Mock).mockResolvedValue([{ total: 5 }]);

      Object.defineProperty(mongoose.connection, 'db', {
        value: {
          stats: jest.fn().mockResolvedValue({
            dataSize: 1024,
            indexSize: 512,
            avgObjSize: 100,
            storageEngine: 'wiredTiger'
          }),
          collection: jest.fn().mockReturnValue({
            stats: jest.fn().mockResolvedValue({
              count: 100,
              size: 1024,
              avgObjSize: 10
            })
          })
        },
        writable: true,
        configurable: true
      });

      const result = await CleanupService.getPerformanceRecommendations();

      expect(result.recommendations).toContainEqual(
        expect.objectContaining({
          type: 'error',
          collection: 'projects',
          issue: 'Orphaned projects detected'
        })
      );
      expect(result.overallHealth).toBe('needs-attention');
    });

    it('should handle errors gracefully', async () => {
      // Mock getDatabaseStats to throw error
      (Analytics.countDocuments as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await CleanupService.getPerformanceRecommendations();

      expect(result.error).toBeDefined();
      expect(result.recommendations).toEqual([]);
    });
  });

  describe('getCollectionSize error handling', () => {
    it('should handle getDatabaseStats when collection stats fail', async () => {
      // Mock count documents
      (Analytics.countDocuments as jest.Mock).mockResolvedValue(100);
      (ActivityLog.countDocuments as jest.Mock).mockResolvedValue(500);
      (ProjectInvitation.countDocuments as jest.Mock).mockResolvedValue(50);
      (Notification.countDocuments as jest.Mock).mockResolvedValue(200);
      (UserSession.countDocuments as jest.Mock).mockResolvedValue(75);
      (RateLimit.countDocuments as jest.Mock).mockResolvedValue(25);
      (Project.countDocuments as jest.Mock).mockResolvedValue(30);
      (User.countDocuments as jest.Mock).mockResolvedValue(10);
      (NoteLock.countDocuments as jest.Mock).mockResolvedValue(5);

      // Mock collection stats to throw errors
      Object.defineProperty(mongoose.connection, 'db', {
        value: {
          stats: jest.fn().mockResolvedValue({
            dataSize: 1024,
            indexSize: 512,
            avgObjSize: 100,
            storageEngine: 'wiredTiger'
          }),
          collection: jest.fn().mockReturnValue({
            stats: jest.fn().mockRejectedValue(new Error('Collection not found'))
          })
        },
        writable: true,
        configurable: true
      });

      const stats = await CleanupService.getDatabaseStats();

      // Should return default values for failed collections
      expect(stats).toHaveProperty('collectionSizes');
      expect(stats.collectionSizes.analytics.sizeMB).toBe('0');
    });
  });
});
