import Analytics from '../models/Analytics';
import CompactedAnalytics from '../models/CompactedAnalytics';
import mongoose from 'mongoose';

interface QueryFilters {
  userId?: string;
  projectId?: string;
  eventType?: string;
  category?: 'engagement' | 'business' | 'error';
  planTier?: 'free' | 'pro' | 'premium';
  startDate?: Date;
  endDate?: Date;
}

interface MergedEvent {
  timestamp: Date;
  eventType: string;
  count: number;
  isCompacted: boolean;
  category?: string;
  duration?: number;
  conversionValue?: number;
}

export class AnalyticsQueryService {
  private readonly COMPACTION_THRESHOLD_DAYS = 7;

  /**
   * Get cutoff date for when events are compacted (7 days ago)
   */
  private getCompactionCutoff(): Date {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.COMPACTION_THRESHOLD_DAYS);
    cutoff.setHours(0, 0, 0, 0);
    return cutoff;
  }

  /**
   * Get user events transparently from raw or compacted data
   */
  async getUserEvents(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<MergedEvent[]> {
    const compactionCutoff = this.getCompactionCutoff();

    // Query raw events for recent data
    const rawEventsPromise = startDate >= compactionCutoff
      ? Analytics.find({
          userId,
          timestamp: { $gte: startDate, $lte: endDate }
        })
          .select('timestamp eventType category eventData conversionValue')
          .lean()
      : Analytics.find({
          userId,
          timestamp: {
            $gte: Math.max(startDate.getTime(), compactionCutoff.getTime()),
            $lte: endDate.getTime()
          }
        })
          .select('timestamp eventType category eventData conversionValue')
          .lean();

    // Query compacted events for older data
    const compactedEventsPromise = startDate < compactionCutoff
      ? CompactedAnalytics.find({
          userId: new mongoose.Types.ObjectId(userId),
          date: {
            $gte: startDate,
            $lt: compactionCutoff
          }
        })
          .lean()
      : Promise.resolve([]);

    const [rawEvents, compactedEvents] = await Promise.all([
      rawEventsPromise,
      compactedEventsPromise
    ]);

    return this.mergeEvents(rawEvents, compactedEvents);
  }

  /**
   * Get event counts with filters
   */
  async getEventCounts(filters: QueryFilters): Promise<number> {
    const compactionCutoff = this.getCompactionCutoff();
    const { startDate, endDate, ...otherFilters } = filters;

    // Build query for raw events
    const rawQuery: any = { ...otherFilters };
    if (startDate || endDate) {
      rawQuery.timestamp = {};
      if (startDate) {
        rawQuery.timestamp.$gte = Math.max(
          startDate.getTime(),
          compactionCutoff.getTime()
        );
      }
      if (endDate) rawQuery.timestamp.$lte = endDate;
    }

    // Build query for compacted events
    const compactedQuery: any = {};
    if (filters.userId) {
      compactedQuery.userId = new mongoose.Types.ObjectId(filters.userId);
    }
    if (filters.projectId) {
      compactedQuery.projectId = new mongoose.Types.ObjectId(filters.projectId);
    }
    if (filters.eventType) compactedQuery.eventType = filters.eventType;
    if (filters.category) compactedQuery.category = filters.category;
    if (filters.planTier) compactedQuery.planTier = filters.planTier;

    if (startDate && startDate < compactionCutoff) {
      compactedQuery.date = { $gte: startDate, $lt: compactionCutoff };
    } else if (startDate) {
      // All data is in raw events
      return await Analytics.countDocuments(rawQuery);
    }

    // Query both sources
    const [rawCount, compactedResult] = await Promise.all([
      Analytics.countDocuments(rawQuery),
      startDate && startDate < compactionCutoff
        ? CompactedAnalytics.aggregate([
            { $match: compactedQuery },
            { $group: { _id: null, total: { $sum: '$count' } } }
          ])
        : Promise.resolve([])
    ]);

    const compactedCount = compactedResult[0]?.total || 0;
    return rawCount + compactedCount;
  }

  /**
   * Get event counts by type
   */
  async getEventCountsByType(filters: QueryFilters): Promise<Record<string, number>> {
    const compactionCutoff = this.getCompactionCutoff();
    const { startDate, endDate, ...otherFilters } = filters;

    // Query raw events
    const rawQuery: any = { ...otherFilters };
    if (startDate || endDate) {
      rawQuery.timestamp = {};
      if (startDate) {
        rawQuery.timestamp.$gte = Math.max(
          startDate.getTime(),
          compactionCutoff.getTime()
        );
      }
      if (endDate) rawQuery.timestamp.$lte = endDate;
    }

    const rawEventsPromise = Analytics.aggregate([
      { $match: rawQuery },
      { $group: { _id: '$eventType', count: { $sum: 1 } } }
    ]);

    // Query compacted events
    let compactedEventsPromise = Promise.resolve([]);
    if (startDate && startDate < compactionCutoff) {
      const compactedQuery: any = {};
      if (filters.userId) {
        compactedQuery.userId = new mongoose.Types.ObjectId(filters.userId);
      }
      if (filters.category) compactedQuery.category = filters.category;
      if (filters.planTier) compactedQuery.planTier = filters.planTier;
      compactedQuery.date = { $gte: startDate, $lt: compactionCutoff };

      compactedEventsPromise = CompactedAnalytics.aggregate([
        { $match: compactedQuery },
        { $group: { _id: '$eventType', count: { $sum: '$count' } } }
      ]);
    }

    const [rawEvents, compactedEvents] = await Promise.all([
      rawEventsPromise,
      compactedEventsPromise
    ]);

    // Merge results
    const merged: Record<string, number> = {};

    rawEvents.forEach((event: any) => {
      merged[event._id] = (merged[event._id] || 0) + event.count;
    });

    compactedEvents.forEach((event: any) => {
      merged[event._id] = (merged[event._id] || 0) + event.count;
    });

    return merged;
  }

  /**
   * Get unique users count
   */
  async getUniqueUsersCount(filters: Omit<QueryFilters, 'userId'>): Promise<number> {
    const compactionCutoff = this.getCompactionCutoff();
    const { startDate, endDate, ...otherFilters } = filters;

    // Query raw events
    const rawQuery: any = { ...otherFilters };
    if (startDate || endDate) {
      rawQuery.timestamp = {};
      if (startDate) {
        rawQuery.timestamp.$gte = Math.max(
          startDate.getTime(),
          compactionCutoff.getTime()
        );
      }
      if (endDate) rawQuery.timestamp.$lte = endDate;
    }

    const rawUsersPromise = Analytics.distinct('userId', rawQuery);

    // Query compacted events
    let compactedUsersPromise = Promise.resolve([]);
    if (startDate && startDate < compactionCutoff) {
      const compactedQuery: any = { ...otherFilters };
      compactedQuery.date = { $gte: startDate, $lt: compactionCutoff };

      compactedUsersPromise = CompactedAnalytics.distinct('userId', compactedQuery);
    }

    const [rawUsers, compactedUsers] = await Promise.all([
      rawUsersPromise,
      compactedUsersPromise
    ]);

    // Combine and deduplicate
    const allUsers = new Set([
      ...rawUsers.map(u => u.toString()),
      ...compactedUsers.map((u: any) => u.toString())
    ]);

    return allUsers.size;
  }

  /**
   * Get conversion metrics
   */
  async getConversionMetrics(filters: QueryFilters): Promise<{
    totalConversions: number;
    totalRevenue: number;
    conversionRate: number;
  }> {
    const totalUsers = await this.getUniqueUsersCount(filters);

    const compactionCutoff = this.getCompactionCutoff();
    const { startDate, endDate, ...otherFilters } = filters;

    // Query raw events
    const rawQuery: any = { ...otherFilters, isConversion: true };
    if (startDate || endDate) {
      rawQuery.timestamp = {};
      if (startDate) {
        rawQuery.timestamp.$gte = Math.max(
          startDate.getTime(),
          compactionCutoff.getTime()
        );
      }
      if (endDate) rawQuery.timestamp.$lte = endDate;
    }

    const rawMetricsPromise = Analytics.aggregate([
      { $match: rawQuery },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$conversionValue' }
        }
      }
    ]);

    // Query compacted events
    let compactedMetricsPromise: Promise<Array<{ _id: null; count: number; revenue: number }>> = Promise.resolve([]);
    if (startDate && startDate < compactionCutoff) {
      const compactedQuery: any = {};
      if (filters.userId) {
        compactedQuery.userId = new mongoose.Types.ObjectId(filters.userId);
      }
      if (filters.category) compactedQuery.category = filters.category;
      compactedQuery.date = { $gte: startDate, $lt: compactionCutoff };

      compactedMetricsPromise = CompactedAnalytics.aggregate([
        { $match: compactedQuery },
        {
          $group: {
            _id: null,
            count: { $sum: '$conversionCount' },
            revenue: { $sum: '$totalConversionValue' }
          }
        }
      ]);
    }

    const [rawMetrics, compactedMetrics] = await Promise.all([
      rawMetricsPromise,
      compactedMetricsPromise
    ]);

    const totalConversions =
      (rawMetrics[0]?.count || 0) + (compactedMetrics[0]?.count || 0);
    const totalRevenue =
      (rawMetrics[0]?.revenue || 0) + (compactedMetrics[0]?.revenue || 0);
    const conversionRate = totalUsers > 0 ? (totalConversions / totalUsers) * 100 : 0;

    return {
      totalConversions,
      totalRevenue,
      conversionRate
    };
  }

  /**
   * Merge raw and compacted events into a unified format
   */
  private mergeEvents(rawEvents: any[], compactedEvents: any[]): MergedEvent[] {
    const merged: MergedEvent[] = [];

    // Add raw events
    rawEvents.forEach(event => {
      merged.push({
        timestamp: event.timestamp,
        eventType: event.eventType,
        count: 1,
        isCompacted: false,
        category: event.category,
        duration: event.eventData?.duration,
        conversionValue: event.conversionValue
      });
    });

    // Add compacted events
    compactedEvents.forEach(event => {
      merged.push({
        timestamp: event.date,
        eventType: event.eventType,
        count: event.count,
        isCompacted: true,
        category: event.category,
        duration: event.avgDuration,
        conversionValue: event.totalConversionValue
      });
    });

    // Sort by timestamp
    merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return merged;
  }
}

export default new AnalyticsQueryService();
