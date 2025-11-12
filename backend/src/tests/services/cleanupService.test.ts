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
});
