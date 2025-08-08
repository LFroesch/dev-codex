import Analytics from '../models/Analytics';
import ActivityLog from '../models/ActivityLog';
import ProjectInvitation from '../models/ProjectInvitation';
import Notification from '../models/Notification';
import UserSession from '../models/UserSession';
import RateLimit from '../models/RateLimit';

export class CleanupService {
  /**
   * Get database collection sizes and stats
   */
  static async getDatabaseStats() {
    const stats = {
      analytics: await Analytics.countDocuments(),
      activityLogs: await ActivityLog.countDocuments(),
      invitations: await ProjectInvitation.countDocuments(),
      notifications: await Notification.countDocuments(),
      userSessions: await UserSession.countDocuments(),
      rateLimits: await RateLimit.countDocuments(),
    };

    // Get collection sizes in MB (approximate)
    const collections = await Analytics.db.db.stats();
    
    return {
      collections: stats,
      totalDocuments: Object.values(stats).reduce((sum, count) => sum + count, 0),
      dbSizeGB: collections.dataSize ? (collections.dataSize / (1024 * 1024 * 1024)).toFixed(2) : 'N/A'
    };
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
}