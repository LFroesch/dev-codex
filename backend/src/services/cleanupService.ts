import Analytics from '../models/Analytics';
import ActivityLog from '../models/ActivityLog';
import ProjectInvitation from '../models/ProjectInvitation';
import Notification from '../models/Notification';
import UserSession from '../models/UserSession';
import RateLimit from '../models/RateLimit';
import { Project } from '../models/Project';
import { User } from '../models/User';
import NoteLock from '../models/NoteLock';
import mongoose from 'mongoose';

export class CleanupService {
  /**
   * Get comprehensive database collection sizes and stats
   */
  static async getDatabaseStats() {
    const stats = {
      analytics: await Analytics.countDocuments(),
      activityLogs: await ActivityLog.countDocuments(),
      invitations: await ProjectInvitation.countDocuments(),
      notifications: await Notification.countDocuments(),
      userSessions: await UserSession.countDocuments(),
      rateLimits: await RateLimit.countDocuments(),
      projects: await Project.countDocuments(),
      users: await User.countDocuments(),
      noteLocks: await NoteLock.countDocuments(),
    };

    // Get detailed collection stats
    const dbStats = await mongoose.connection.db.stats();
    
    // Calculate approximate collection sizes
    const collectionSizes = await Promise.all([
      this.getCollectionSize('analytics'),
      this.getCollectionSize('activitylogs'),
      this.getCollectionSize('projects'),
      this.getCollectionSize('users'),
      this.getCollectionSize('notifications'),
      this.getCollectionSize('usersessions'),
    ]);

    return {
      collections: stats,
      totalDocuments: Object.values(stats).reduce((sum, count) => sum + count, 0),
      dbSizeGB: (dbStats.dataSize / (1024 * 1024 * 1024)).toFixed(2),
      indexSizeGB: (dbStats.indexSize / (1024 * 1024 * 1024)).toFixed(2),
      collectionSizes: {
        analytics: collectionSizes[0],
        activityLogs: collectionSizes[1],
        projects: collectionSizes[2],
        users: collectionSizes[3],
        notifications: collectionSizes[4],
        userSessions: collectionSizes[5],
      },
      performance: {
        avgDocumentSize: (dbStats.avgObjSize / 1024).toFixed(2) + ' KB',
        storageEngine: dbStats.storageEngine || 'Unknown'
      }
    };
  }

  /**
   * Get size of a specific collection
   */
  private static async getCollectionSize(collectionName: string) {
    try {
      const stats = await mongoose.connection.db.collection(collectionName).stats();
      return {
        documents: stats.count,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        avgDocSize: (stats.avgObjSize / 1024).toFixed(2) + ' KB'
      };
    } catch (error) {
      return {
        documents: 0,
        sizeMB: '0',
        avgDocSize: '0 KB'
      };
    }
  }

  /**
   * Clean up old analytics data (beyond TTL)
   */
  static async cleanupOldAnalytics(daysOld = 180) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await Analytics.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    return {
      deleted: result.deletedCount,
      cutoffDate: cutoffDate.toISOString()
    };
  }

  /**
   * Clean up expired invitations
   */
  static async cleanupExpiredInvitations() {
    const now = new Date();
    
    // Mark expired invitations
    const expiredResult = await ProjectInvitation.updateMany(
      { 
        expiresAt: { $lt: now },
        status: 'pending'
      },
      { status: 'expired' }
    );

    // Delete old expired/cancelled invitations (older than 30 days)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);
    
    const deleteResult = await ProjectInvitation.deleteMany({
      $or: [
        { status: 'expired', updatedAt: { $lt: oldDate } },
        { status: 'cancelled', updatedAt: { $lt: oldDate } }
      ]
    });

    return {
      markedExpired: expiredResult.modifiedCount,
      deleted: deleteResult.deletedCount
    };
  }

  /**
   * Clean up old notifications
   */
  static async cleanupOldNotifications(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    
    return {
      deleted: result.deletedCount,
      cutoffDate: cutoffDate.toISOString()
    };
  }

  /**
   * Clean up old activity logs (beyond TTL)
   */
  static async cleanupOldActivityLogs(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await ActivityLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    return {
      deleted: result.deletedCount,
      cutoffDate: cutoffDate.toISOString()
    };
  }

  /**
   * Clean up inactive user sessions
   */
  static async cleanupInactiveSessions() {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const result = await UserSession.deleteMany({
      isActive: false,
      lastActivity: { $lt: oneDayAgo }
    });
    
    return {
      deleted: result.deletedCount
    };
  }

  /**
   * Run complete cleanup
   */
  static async runCompleteCleanup() {
    console.log('Starting database cleanup...');
    
    const results = {
      timestamp: new Date().toISOString(),
      analytics: await this.cleanupOldAnalytics(),
      invitations: await this.cleanupExpiredInvitations(),
      notifications: await this.cleanupOldNotifications(),
      activityLogs: await this.cleanupOldActivityLogs(),
      userSessions: await this.cleanupInactiveSessions()
    };

    const totalDeleted = Object.values(results)
      .filter(r => typeof r === 'object' && r !== null)
      .reduce((sum, r: any) => sum + (r.deleted || 0), 0);

    console.log(`Cleanup completed. Total documents deleted: ${totalDeleted}`);
    
    return {
      ...results,
      totalDeleted,
      statsAfterCleanup: await this.getDatabaseStats()
    };
  }

  /**
   * Get cleanup recommendations based on current data
   */
  static async getCleanupRecommendations() {
    const stats = await this.getDatabaseStats();
    
    // Count old data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const oldAnalytics = await Analytics.countDocuments({
      timestamp: { $lt: sixMonthsAgo }
    });

    const expiredInvitations = await ProjectInvitation.countDocuments({
      expiresAt: { $lt: new Date() },
      status: 'pending'
    });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const oldNotifications = await Notification.countDocuments({
      createdAt: { $lt: ninetyDaysAgo }
    });

    return {
      currentStats: stats,
      recommendations: {
        oldAnalytics: oldAnalytics > 0 ? `${oldAnalytics} old analytics records can be cleaned up` : null,
        expiredInvitations: expiredInvitations > 0 ? `${expiredInvitations} expired invitations need cleanup` : null,
        oldNotifications: oldNotifications > 0 ? `${oldNotifications} old notifications can be cleaned up` : null,
      },
      shouldRunCleanup: oldAnalytics > 1000 || expiredInvitations > 50 || oldNotifications > 500
    };
  }

  /**
   * ADVANCED CLEANUP METHODS FOR ADMIN PANEL
   */

  /**
   * Clean up orphaned data - projects without valid owners
   */
  static async cleanupOrphanedProjects() {
    try {
      // Find projects with invalid user references
      const orphanedProjects = await Project.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'ownerId',
            foreignField: '_id',
            as: 'owner'
          }
        },
        {
          $match: {
            owner: { $size: 0 }
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            ownerId: 1,
            createdAt: 1
          }
        }
      ]);

      // Archive or delete orphaned projects
      const result = await Project.deleteMany({
        _id: { $in: orphanedProjects.map(p => p._id) }
      });

      return {
        orphanedFound: orphanedProjects.length,
        deleted: result.deletedCount,
        orphanedProjects: orphanedProjects.slice(0, 10) // Return first 10 for review
      };
    } catch (error) {
      console.error('Error cleaning orphaned projects:', error);
      return { error: (error as Error).message, orphanedFound: 0, deleted: 0 };
    }
  }

  /**
   * Clean up stale note locks
   */
  static async cleanupStaleNoteLocks() {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const result = await NoteLock.deleteMany({
        lastHeartbeat: { $lt: oneHourAgo }
      });

      return {
        deleted: result.deletedCount,
        cutoffTime: oneHourAgo.toISOString()
      };
    } catch (error) {
      console.error('Error cleaning stale note locks:', error);
      return { error: (error as Error).message, deleted: 0 };
    }
  }

  /**
   * Clean up old rate limits
   */
  static async cleanupOldRateLimits() {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const result = await RateLimit.deleteMany({
        windowStart: { $lt: oneDayAgo }
      });

      return {
        deleted: result.deletedCount,
        cutoffDate: oneDayAgo.toISOString()
      };
    } catch (error) {
      console.error('Error cleaning old rate limits:', error);
      return { error: (error as Error).message, deleted: 0 };
    }
  }

  /**
   * Optimize database by rebuilding indexes
   */
  static async optimizeDatabase() {
    try {
      const collections = ['analytics', 'projects', 'users', 'notifications', 'usersessions'];
      const results = [];

      for (const collectionName of collections) {
        try {
          // Note: reIndex is deprecated, using createIndex instead
          await mongoose.connection.db.collection(collectionName).createIndexes([]);
          results.push(`${collectionName}: indexes rebuilt`);
        } catch (error) {
          results.push(`${collectionName}: failed - ${(error as Error).message}`);
        }
      }

      return {
        success: true,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get performance recommendations
   */
  static async getPerformanceRecommendations() {
    try {
      const stats = await this.getDatabaseStats();
      const recommendations = [];

      // Check for large collections
      if (stats.collections.analytics > 100000) {
        recommendations.push({
          type: 'warning',
          collection: 'analytics',
          issue: 'Large analytics collection',
          recommendation: 'Consider cleaning up old analytics data or reducing tracking frequency',
          count: stats.collections.analytics
        });
      }

      // Check for document size issues
      Object.entries(stats.collectionSizes).forEach(([collection, data]) => {
        if (parseFloat(data.avgDocSize) > 100) { // > 100KB average
          recommendations.push({
            type: 'warning',
            collection,
            issue: 'Large average document size',
            recommendation: 'Consider optimizing document structure or moving large fields to separate collections',
            avgSize: data.avgDocSize
          });
        }
      });

      // Check for orphaned data
      const orphanedProjectsCount = await Project.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'ownerId',
            foreignField: '_id',
            as: 'owner'
          }
        },
        {
          $match: { owner: { $size: 0 } }
        },
        {
          $count: 'total'
        }
      ]);

      if (orphanedProjectsCount.length > 0 && orphanedProjectsCount[0].total > 0) {
        recommendations.push({
          type: 'error',
          collection: 'projects',
          issue: 'Orphaned projects detected',
          recommendation: 'Clean up projects with invalid owner references',
          count: orphanedProjectsCount[0].total
        });
      }

      return {
        stats,
        recommendations,
        overallHealth: recommendations.filter(r => r.type === 'error').length === 0 ? 'good' : 'needs-attention'
      };
    } catch (error) {
      return {
        error: (error as Error).message,
        recommendations: []
      };
    }
  }

  /**
   * Emergency cleanup - removes all non-essential data
   */
  static async emergencyCleanup() {
    try {
      console.log('Starting emergency cleanup...');
      
      const results = {
        timestamp: new Date().toISOString(),
        analytics: await Analytics.deleteMany({ eventType: { $nin: ['session_start', 'session_end', 'error'] } }),
        oldActivityLogs: await ActivityLog.deleteMany({ 
          timestamp: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days
        }),
        allNotifications: await Notification.deleteMany({
          createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days
        }),
        inactiveSessions: await UserSession.deleteMany({ isActive: false }),
        allRateLimits: await RateLimit.deleteMany({}),
        staleNoteLocks: await NoteLock.deleteMany({})
      };

      const totalDeleted = Object.values(results)
        .filter(r => r && typeof r === 'object' && 'deletedCount' in r)
        .reduce((sum, r: any) => sum + r.deletedCount, 0);

      console.log(`Emergency cleanup completed. Total documents deleted: ${totalDeleted}`);
      
      return {
        ...results,
        totalDeleted,
        success: true
      };
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Archive old projects instead of deleting them
   */
  static async archiveOldProjects(daysInactive = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

      const result = await Project.updateMany(
        {
          updatedAt: { $lt: cutoffDate },
          isArchived: { $ne: true }
        },
        {
          $set: {
            isArchived: true,
            archivedAt: new Date(),
            archivedReason: 'Auto-archived due to inactivity'
          }
        }
      );

      return {
        archived: result.modifiedCount,
        cutoffDate: cutoffDate.toISOString()
      };
    } catch (error) {
      console.error('Error archiving old projects:', error);
      return { error: (error as Error).message, archived: 0 };
    }
  }
}