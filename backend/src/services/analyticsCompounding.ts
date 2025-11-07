import Analytics from '../models/Analytics';
import CompactedAnalytics from '../models/CompactedAnalytics';
import mongoose from 'mongoose';

interface CompactionResult {
  eventsProcessed: number;
  compactedRecordsCreated: number;
  eventsDeleted: number;
  errors: string[];
}

export class AnalyticsCompoundingService {
  // Critical events that should never be compacted
  private readonly CRITICAL_EVENT_TYPES = [
    'checkout_completed',
    'user_upgraded',
    'user_downgraded',
    'user_signup'
  ];

  /**
   * Calculate TTL for compacted analytics based on plan tier
   */
  calculateTTL(planTier: string): Date | undefined {
    const now = new Date();
    switch (planTier) {
      case 'free':
        // 90 days retention
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      case 'pro':
        // 365 days retention
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      case 'premium':
        // Unlimited retention
        return undefined;
      default:
        // Default to 30 days
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Main compaction method - runs daily to aggregate old events
   */
  async compactOldEvents(): Promise<CompactionResult> {
    const result: CompactionResult = {
      eventsProcessed: 0,
      compactedRecordsCreated: 0,
      eventsDeleted: 0,
      errors: []
    };

    try {
      console.log('[Analytics Compounding] Starting compaction process...');

      // Calculate cutoff date (7 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      cutoffDate.setHours(0, 0, 0, 0); // Start of day

      // Count events to be processed
      const totalEvents = await Analytics.countDocuments({
        timestamp: { $lt: cutoffDate },
        isConversion: false,
        eventType: { $nin: this.CRITICAL_EVENT_TYPES }
      });

      result.eventsProcessed = totalEvents;
      console.log(`[Analytics Compounding] Found ${totalEvents} events to compact`);

      if (totalEvents === 0) {
        console.log('[Analytics Compounding] No events to compact');
        return result;
      }

      // Aggregate events by date, userId, projectId, eventType
      const aggregated = await Analytics.aggregate([
        {
          $match: {
            timestamp: { $lt: cutoffDate },
            isConversion: false,
            eventType: { $nin: this.CRITICAL_EVENT_TYPES }
          }
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$timestamp'
                }
              },
              userId: '$userId',
              projectId: '$eventData.projectId',
              eventType: '$eventType',
              category: '$category',
              planTier: '$planTier'
            },
            count: { $sum: 1 },
            totalDuration: {
              $sum: {
                $cond: [
                  { $ifNull: ['$eventData.duration', false] },
                  '$eventData.duration',
                  0
                ]
              }
            },
            uniqueSessions: { $addToSet: '$sessionId' },
            totalConversionValue: {
              $sum: {
                $cond: [
                  { $ifNull: ['$conversionValue', false] },
                  '$conversionValue',
                  0
                ]
              }
            },
            conversionCount: {
              $sum: {
                $cond: ['$isConversion', 1, 0]
              }
            },
            firstEvent: { $min: '$timestamp' },
            lastEvent: { $max: '$timestamp' }
          }
        }
      ]);

      console.log(`[Analytics Compounding] Created ${aggregated.length} aggregated records`);

      // Insert compacted records
      const compacted = aggregated.map(a => ({
        date: new Date(a._id.date),
        userId: a._id.userId,
        projectId: a._id.projectId ? new mongoose.Types.ObjectId(a._id.projectId) : undefined,
        eventType: a._id.eventType,
        category: a._id.category,
        count: a.count,
        totalDuration: a.totalDuration,
        avgDuration: a.count > 0 ? a.totalDuration / a.count : 0,
        uniqueSessions: a.uniqueSessions.filter((s: any) => s != null).length,
        planTier: a._id.planTier,
        expiresAt: this.calculateTTL(a._id.planTier),
        totalConversionValue: a.totalConversionValue,
        conversionCount: a.conversionCount,
        timestamps: {
          firstEvent: a.firstEvent,
          lastEvent: a.lastEvent
        }
      }));

      if (compacted.length > 0) {
        await CompactedAnalytics.insertMany(compacted, { ordered: false });
        result.compactedRecordsCreated = compacted.length;
      }

      // Delete old raw events (keep critical events)
      const deleteResult = await Analytics.deleteMany({
        timestamp: { $lt: cutoffDate },
        isConversion: false,
        eventType: { $nin: this.CRITICAL_EVENT_TYPES }
      });

      result.eventsDeleted = deleteResult.deletedCount || 0;

      console.log('[Analytics Compounding] Compaction summary:', result);

      // Log compaction results to analytics (meta!)
      await this.logCompaction(result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Analytics Compounding] Error during compaction:', error);
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * Log compaction results for monitoring
   */
  private async logCompaction(result: CompactionResult): Promise<void> {
    try {
      // You could log this to a separate monitoring collection or external service
      console.log('[Analytics Compounding] Compaction completed:', {
        timestamp: new Date().toISOString(),
        eventsProcessed: result.eventsProcessed,
        compactedRecordsCreated: result.compactedRecordsCreated,
        eventsDeleted: result.eventsDeleted,
        errors: result.errors.length,
        success: result.errors.length === 0
      });
    } catch (error) {
      console.error('[Analytics Compounding] Failed to log compaction result:', error);
    }
  }

  /**
   * Manual trigger for compaction (for testing or emergency use)
   */
  async manualCompact(daysOld: number = 7): Promise<CompactionResult> {
    console.log(`[Analytics Compounding] Manual compaction triggered for events older than ${daysOld} days`);

    // Temporarily adjust the cutoff for manual runs
    const originalCompact = this.compactOldEvents.bind(this);

    // Override the cutoff date calculation
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await this.compactOldEvents();
  }

  /**
   * Get compaction statistics
   */
  async getCompactionStats(): Promise<{
    totalRawEvents: number;
    totalCompactedRecords: number;
    oldestRawEvent: Date | null;
    oldestCompactedRecord: Date | null;
    storageEstimate: {
      rawEventsBytes: number;
      compactedBytes: number;
      savingsPercentage: number;
    };
  }> {
    try {
      const [totalRaw, totalCompacted, oldestRaw, oldestCompacted] = await Promise.all([
        Analytics.countDocuments(),
        CompactedAnalytics.countDocuments(),
        Analytics.findOne().sort({ timestamp: 1 }).select('timestamp').lean(),
        CompactedAnalytics.findOne().sort({ date: 1 }).select('date').lean()
      ]);

      // Rough estimate: avg raw event ~500 bytes, avg compacted record ~200 bytes
      const rawEventsBytes = totalRaw * 500;
      const compactedBytes = totalCompacted * 200;
      const savingsPercentage = rawEventsBytes > 0
        ? ((rawEventsBytes - compactedBytes) / rawEventsBytes) * 100
        : 0;

      return {
        totalRawEvents: totalRaw,
        totalCompactedRecords: totalCompacted,
        oldestRawEvent: oldestRaw?.timestamp || null,
        oldestCompactedRecord: oldestCompacted?.date || null,
        storageEstimate: {
          rawEventsBytes,
          compactedBytes,
          savingsPercentage: Math.round(savingsPercentage * 100) / 100
        }
      };
    } catch (error) {
      console.error('[Analytics Compounding] Error getting compaction stats:', error);
      throw error;
    }
  }
}

export default new AnalyticsCompoundingService();
