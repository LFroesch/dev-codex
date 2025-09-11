import { Request, Response, NextFunction } from 'express';
import Analytics from '../models/Analytics';
import UserSession from '../models/UserSession';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { 
  getAnalyticsConfig, 
  getThrottleDuration, 
  canTrackEvent, 
  getAnalyticsTTL,
  BASE_THROTTLE_DURATIONS 
} from '../config/analyticsConfig';

interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

// Event throttling cache to prevent over-tracking
const eventThrottleCache = new Map<string, number>();
const projectAccessCache = new Map<string, number>();
const dailyEventCounts = new Map<string, number>();

// Gap detection utility
export function calculateActiveTime(startTime: Date, endTime: Date, heartbeatTimestamps: Date[] = []): number {
  const GAP_THRESHOLD = 15 * 60 * 1000; // 15 minutes in milliseconds - allows for coffee breaks, phone calls, etc.
  const MAX_ACTIVE_SEGMENT = 30 * 60 * 1000; // 30 minutes max for any single segment
  
  if (heartbeatTimestamps.length === 0) {
    // No heartbeats recorded, cap the duration to prevent counting long idle periods
    const duration = endTime.getTime() - startTime.getTime();
    return Math.min(duration, GAP_THRESHOLD);
  }

  // Sort heartbeat timestamps and filter to only those within our time range
  const sortedHeartbeats = [...heartbeatTimestamps]
    .filter(ts => ts.getTime() >= startTime.getTime() && ts.getTime() <= endTime.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  
  if (sortedHeartbeats.length === 0) {
    // No valid heartbeats in range
    const duration = endTime.getTime() - startTime.getTime();
    return Math.min(duration, GAP_THRESHOLD);
  }

  let activeTime = 0;
  let lastTimestamp = startTime;

  for (const heartbeat of sortedHeartbeats) {
    const segmentDuration = heartbeat.getTime() - lastTimestamp.getTime();
    
    if (segmentDuration <= GAP_THRESHOLD) {
      // Normal activity segment, count it all
      activeTime += segmentDuration;
    } else {
      // Large gap detected, don't count this segment as active time
      // This is where sleep/AFK periods get excluded
    }
    
    lastTimestamp = heartbeat;
  }

  // Handle time from last heartbeat to end time
  const finalSegmentDuration = endTime.getTime() - lastTimestamp.getTime();
  if (finalSegmentDuration <= GAP_THRESHOLD) {
    activeTime += finalSegmentDuration;
  }
  // If final segment is too long, don't count it (likely inactive period)

  return Math.max(0, activeTime);
}

// Consolidated and optimized Analytics service class with Plan-aware TTL
export class AnalyticsService {
  // Get user's current plan tier and subscription status
  private static async getUserPlanInfo(userId: string): Promise<{
    planTier: 'free' | 'pro' | 'enterprise';
    subscriptionStatus?: string;
  }> {
    try {
      const user = await User.findById(userId).select('planTier subscriptionStatus');
      return {
        planTier: user?.planTier || 'free',
        subscriptionStatus: user?.subscriptionStatus
      };
    } catch (error) {
      console.error('Error fetching user plan:', error);
      return { planTier: 'free' };
    }
  }

  // Check daily event limits based on plan
  private static async checkDailyLimit(userId: string, planTier: 'free' | 'pro' | 'enterprise'): Promise<boolean> {
    const today = new Date().toDateString();
    const cacheKey = `${userId}-${today}`;
    
    let currentCount = dailyEventCounts.get(cacheKey) || 0;
    
    // If not cached, get from database
    if (currentCount === 0) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      currentCount = await Analytics.countDocuments({
        userId,
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      });
      
      dailyEventCounts.set(cacheKey, currentCount);
    }
    
    return canTrackEvent(currentCount, planTier);
  }

  static async trackEvent(
    userId: string,
    eventType: 'project_open' | 'session_start' | 'session_end',
    eventData: any,
    req?: Request
  ) {
    try {
      // Get user's plan information
      const { planTier, subscriptionStatus } = await this.getUserPlanInfo(userId);
      
      // Check daily event limits for plan tier
      const canTrack = await this.checkDailyLimit(userId, planTier);
      if (!canTrack) {
        return null;
      }

      // Check if this event should be throttled based on plan
      const criticalEvents = ['session_start', 'session_end'];
      if (!criticalEvents.includes(eventType)) {
        const cacheKey = `${userId}-${eventType}-${JSON.stringify(eventData)}`;
        const now = Date.now();
        const lastTracked = eventThrottleCache.get(cacheKey);
        const throttleDuration = getThrottleDuration(eventType, planTier);

        if (lastTracked && (now - lastTracked) < throttleDuration) {
          // Event is throttled, skip tracking
          return null;
        }

        // Update throttle cache
        eventThrottleCache.set(cacheKey, now);
      }

      // Clean up old cache entries periodically (every 1000 events)
      if (Math.random() < 0.001) {
        this.cleanThrottleCache();
      }

      // Calculate expiration date based on plan and subscription status
      const ttlSeconds = getAnalyticsTTL(planTier, subscriptionStatus);
      const expiresAt = ttlSeconds > 0 ? new Date(Date.now() + (ttlSeconds * 1000)) : undefined;

      const analyticsData = new Analytics({
        userId,
        sessionId: req?.headers['x-session-id'] as string,
        eventType,
        eventData: this.sanitizeEventData(eventData),
        timestamp: new Date(),
        userAgent: req?.headers['user-agent'],
        ipAddress: this.getClientIP(req),
        planTier, // Store plan tier at time of event
        expiresAt // Plan-based expiration (undefined = never expires)
      });

      await analyticsData.save();

      // Update daily count cache
      const today = new Date().toDateString();
      const dailyCacheKey = `${userId}-${today}`;
      const currentCount = dailyEventCounts.get(dailyCacheKey) || 0;
      dailyEventCounts.set(dailyCacheKey, currentCount + 1);

      // Update session if exists
      if (req?.headers['x-session-id']) {
        await this.updateSession(req.headers['x-session-id'] as string, eventData);
      }

      return analyticsData;
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      return null;
    }
  }

  // Sanitize event data to prevent bloat and security issues
  private static sanitizeEventData(eventData: any): any {
    if (!eventData || typeof eventData !== 'object') {
      return eventData;
    }

    const sanitized: any = {};
    
    // Limit the depth and size of event data
    for (const [key, value] of Object.entries(eventData)) {
      if (key.length > 100) continue; // Skip very long keys
      
      if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '...';
      } else if (typeof value === 'object' && value !== null) {
        // Flatten nested objects to prevent deep nesting
        sanitized[key] = JSON.stringify(value).substring(0, 500);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Get client IP address with fallbacks
  private static getClientIP(req?: Request): string {
    if (!req) return 'unknown';
    
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  // Clean up old throttle cache entries
  private static cleanThrottleCache(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [key, timestamp] of eventThrottleCache.entries()) {
      if (now - timestamp > maxAge) {
        eventThrottleCache.delete(key);
      }
    }
  }

  // Update analytics retention when user's plan changes
  static async updateUserAnalyticsRetention(
    userId: string, 
    newPlanTier: 'free' | 'pro' | 'enterprise',
    subscriptionStatus?: string
  ): Promise<void> {
    try {
      const ttlSeconds = getAnalyticsTTL(newPlanTier, subscriptionStatus);
      
      if (ttlSeconds > 0) {
        // Plan has limited retention - set expiration dates
        const expiresAt = new Date(Date.now() + (ttlSeconds * 1000));
        
        await Analytics.updateMany(
          { userId, expiresAt: { $exists: false } }, // Only update records without expiration
          { 
            $set: { 
              expiresAt,
              planTier: newPlanTier 
            } 
          }
        );
        
      } else {
        // Unlimited retention - remove expiration dates
        await Analytics.updateMany(
          { userId },
          { 
            $unset: { expiresAt: 1 },
            $set: { planTier: newPlanTier }
          }
        );
        
      }
    } catch (error) {
      console.error('Error updating user analytics retention:', error);
    }
  }

  // Handle subscription cancellation - convert to free tier retention
  static async handleSubscriptionCancellation(userId: string): Promise<void> {
    try {
      await this.updateUserAnalyticsRetention(userId, 'free', 'canceled');
    } catch (error) {
      console.error('Error handling subscription cancellation:', error);
    }
  }

  // Get analytics summary with plan-aware counts
  static async getAnalyticsSummary(userId: string): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    planTier: string;
    retentionStatus: string;
    dailyEventsRemaining?: number;
  }> {
    try {
      const { planTier } = await this.getUserPlanInfo(userId);
      const config = getAnalyticsConfig(planTier);
      
      // Get total events
      const totalEvents = await Analytics.countDocuments({ userId });
      
      // Get events by type
      const eventsByType = await Analytics.aggregate([
        { $match: { userId } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $project: { eventType: '$_id', count: 1, _id: 0 } }
      ]).then(results => 
        results.reduce((acc, { eventType, count }) => ({ ...acc, [eventType]: count }), {})
      );
      
      // Get today's event count
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayEvents = await Analytics.countDocuments({
        userId,
        timestamp: { $gte: startOfDay }
      });
      
      const retentionStatus = config.retentionPeriod === 0 ? 'unlimited' : `${config.retentionPeriod / (24 * 60 * 60)} days`;
      
      return {
        totalEvents,
        eventsByType,
        planTier,
        retentionStatus,
        dailyEventsRemaining: config.maxEventsPerDay - todayEvents
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      return {
        totalEvents: 0,
        eventsByType: {},
        planTier: 'free',
        retentionStatus: 'error'
      };
    }
  }

  static async startSession(userId: string, req: Request): Promise<string> {
    try {
      const sessionId = uuidv4();
      
      const session = new UserSession({
        userId,
        sessionId,
        startTime: new Date(),
        lastActivity: new Date(),
        userAgent: req.headers['user-agent'],
        ipAddress: this.getClientIP(req),
        isActive: true
      });

      await session.save();

      // Track session start event
      await this.trackEvent(userId, 'session_start', { sessionId }, req);

      return sessionId;
    } catch (error) {
      console.error('Error starting session:', error);
      return uuidv4(); // Return a session ID even if DB fails
    }
  }

  static async endSession(sessionId: string, userId?: string) {
    try {
      const session = await UserSession.findOne({ sessionId, isActive: true });
      if (!session) return;

      const endTime = new Date();
      const duration = endTime.getTime() - session.startTime.getTime();

      // Save time spent on current project before ending session using gap-aware calculation
      if (session.currentProjectId && session.currentProjectStartTime) {
        // Find existing project time entry or create new one
        let existingProject = session.projectTimeBreakdown?.find(
          p => p.projectId === session.currentProjectId
        );
        
        if (existingProject) {
          // Calculate active time using heartbeat gap detection
          const activeTime = calculateActiveTime(
            session.currentProjectStartTime,
            endTime,
            existingProject.heartbeatTimestamps || []
          );
          
          existingProject.activeTime = (existingProject.activeTime || 0) + activeTime;
          existingProject.timeSpent = existingProject.activeTime; // Use active time as the main metric
          existingProject.lastSwitchTime = endTime;
        } else {
          // Create new project entry
          const activeTime = calculateActiveTime(
            session.currentProjectStartTime,
            endTime,
            []
          );
          
          if (!session.projectTimeBreakdown) {
            session.projectTimeBreakdown = [];
          }
          session.projectTimeBreakdown.push({
            projectId: session.currentProjectId,
            timeSpent: activeTime,
            activeTime: activeTime,
            lastSwitchTime: endTime,
            heartbeatTimestamps: []
          });
        }
      }

      // Calculate total active session duration using gap detection
      const activeDuration = calculateActiveTime(
        session.startTime,
        endTime,
        session.heartbeatTimestamps || []
      );

      // Update session with final data
      session.endTime = endTime;
      session.duration = activeDuration; // Use active duration instead of raw duration
      session.isActive = false;
      await session.save();

      // Track session end event
      if (userId) {
        const currentProject = session.projectTimeBreakdown?.find(
          p => p.projectId === session.currentProjectId
        );
        
        await this.trackEvent(userId, 'session_end', { 
          sessionId, 
          duration: Math.round(activeDuration / 1000), // active duration in seconds
          rawDuration: Math.round(duration / 1000), // raw duration for comparison
          currentProjectTime: currentProject ? Math.round(currentProject.activeTime! / 1000) : 0
        });
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  static async updateSession(sessionId: string, eventData: any) {
    try {
      const session = await UserSession.findOne({ sessionId });
      if (!session) return;

      const now = new Date();
      const updateData: any = {
        lastActivity: now,
        $inc: { totalEvents: 1 }
      };

      // Handle heartbeat updates differently
      if (eventData.heartbeat) {
        updateData.lastActivity = eventData.timestamp || now;
        // Don't increment totalEvents for heartbeats
        delete updateData.$inc;
        
        // Track heartbeat timestamp for gap detection
        if (!session.heartbeatTimestamps) {
          session.heartbeatTimestamps = [];
        }
        session.heartbeatTimestamps.push(now);
        
        // Keep only last 100 heartbeats to prevent memory bloat
        if (session.heartbeatTimestamps.length > 100) {
          session.heartbeatTimestamps = session.heartbeatTimestamps.slice(-100);
        }

        // Gap detection is handled automatically by calculateActiveTime() 
        // when project switching or session ending occurs
        // No special wake-up processing needed
        
        // Track visibility state if provided
        if (typeof eventData.isVisible === 'boolean') {
          updateData.isVisible = eventData.isVisible;
        }

        // Track current project and page
        if (eventData.currentProjectId) {
          updateData.currentProjectId = eventData.currentProjectId;
        }
        if (eventData.currentPage) {
          updateData.currentPage = eventData.currentPage;
        }

        // Add heartbeat timestamp to current project if active
        if (session.currentProjectId) {
          let currentProject = session.projectTimeBreakdown?.find(
            p => p.projectId === session.currentProjectId
          );
          
          if (currentProject) {
            if (!currentProject.heartbeatTimestamps) {
              currentProject.heartbeatTimestamps = [];
            }
            currentProject.heartbeatTimestamps.push(now);
            
            // Keep only last 50 heartbeats per project to prevent memory bloat
            if (currentProject.heartbeatTimestamps.length > 50) {
              currentProject.heartbeatTimestamps = currentProject.heartbeatTimestamps.slice(-50);
            }
          }
        }
      } else {
        // Regular event updates
        if (eventData.projectId) {
          updateData.$addToSet = { projectsViewed: eventData.projectId };
        }

        if (eventData.pageName) {
          updateData.$addToSet = { 
            ...updateData.$addToSet,
            pagesViewed: eventData.pageName 
          };
        }
      }

      // Update the session with the new data
      Object.assign(session, updateData);
      await session.save();
    } catch (error) {
      console.error('Error updating session:', error);
    }
  }

  // New consolidated method for project switching with gap-aware time tracking
  static async switchProject(userId: string, sessionId: string, newProjectId: string) {
    try {
      const session = await UserSession.findOne({ sessionId, userId, isActive: true });
      if (!session) {
        throw new Error('Active session not found');
      }

      const now = new Date();
      
      // If switching FROM a project, record time spent using gap-aware calculation
      if (session.currentProjectId && session.currentProjectStartTime) {
        // Find existing project time entry or create new one
        let existingProject = session.projectTimeBreakdown?.find(
          p => p.projectId === session.currentProjectId
        );
        
        if (existingProject) {
          // Calculate active time using heartbeat gap detection
          const activeTime = calculateActiveTime(
            session.currentProjectStartTime,
            now,
            existingProject.heartbeatTimestamps || []
          );
          
          existingProject.activeTime = (existingProject.activeTime || 0) + activeTime;
          existingProject.timeSpent = existingProject.activeTime; // Use active time as the main metric
          existingProject.lastSwitchTime = now;
        } else {
          // Create new project entry
          const activeTime = calculateActiveTime(
            session.currentProjectStartTime,
            now,
            []
          );
          
          if (!session.projectTimeBreakdown) {
            session.projectTimeBreakdown = [];
          }
          session.projectTimeBreakdown.push({
            projectId: session.currentProjectId,
            timeSpent: activeTime,
            activeTime: activeTime,
            lastSwitchTime: now,
            heartbeatTimestamps: []
          });
        }
      }

      // Switch to new project
      session.currentProjectId = newProjectId;
      
      // Set project start time - always use current time to avoid double counting
      if (newProjectId) {
        session.currentProjectStartTime = now;
        
        // Initialize or find project entry for the new project
        let newProject = session.projectTimeBreakdown?.find(
          p => p.projectId === newProjectId
        );
        
        if (!newProject) {
          if (!session.projectTimeBreakdown) {
            session.projectTimeBreakdown = [];
          }
          session.projectTimeBreakdown.push({
            projectId: newProjectId,
            timeSpent: 0,
            activeTime: 0,
            lastSwitchTime: now,
            heartbeatTimestamps: []
          });
        }
      } else {
        session.currentProjectStartTime = undefined;
      }
      
      session.lastActivity = now;
      
      // Add to projectsViewed if not already there
      if (newProjectId && !session.projectsViewed.includes(newProjectId)) {
        session.projectsViewed.push(newProjectId);
      }

      await session.save();
      return { success: true };
    } catch (error) {
      console.error('Error switching project:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Get projects time data for a user
  static async getProjectTimeData(userId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Aggregate project time from all user sessions
      const sessions = await UserSession.aggregate([
        {
          $match: {
            userId: userId,
            startTime: { $gte: startDate },
            projectTimeBreakdown: { $exists: true, $ne: [] }
          }
        },
        {
          $unwind: '$projectTimeBreakdown'
        },
        {
          $group: {
            _id: '$projectTimeBreakdown.projectId',
            totalTime: { $sum: '$projectTimeBreakdown.timeSpent' },
            sessions: { $sum: 1 },
            lastUsed: { $max: '$projectTimeBreakdown.lastSwitchTime' }
          }
        },
        {
          $sort: { totalTime: -1 }
        }
      ]);

      return { projects: sessions, period: `${days} days` };
    } catch (error) {
      console.error('Error fetching project time data:', error);
      return null;
    }
  }

  // Get specific project time data with daily breakdown
  static async getProjectTimeBreakdown(userId: string, projectId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const projectTime = await UserSession.aggregate([
        {
          $match: {
            userId: userId,
            startTime: { $gte: startDate },
            'projectTimeBreakdown.projectId': projectId
          }
        },
        {
          $unwind: '$projectTimeBreakdown'
        },
        {
          $match: {
            'projectTimeBreakdown.projectId': projectId
          }
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$projectTimeBreakdown.lastSwitchTime'
                }
              }
            },
            dailyTime: { $sum: '$projectTimeBreakdown.timeSpent' },
            sessions: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      const totalTime = projectTime.reduce((sum, day) => sum + day.dailyTime, 0);

      return {
        projectId,
        totalTime,
        dailyBreakdown: projectTime,
        period: `${days} days`
      };
    } catch (error) {
      console.error('Error fetching project time breakdown:', error);
      return null;
    }
  }

  // Get team time data for a project
  static async getTeamProjectTime(userId: string, projectId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // First, get all team members for this project
      const project = await Project.findById(projectId).select('userId').lean();
      
      if (!project) {
        throw new Error('Project not found');
      }

      // Get team members from TeamMember collection (optimized: only get userIds)
      const TeamMember = (await import('../models/TeamMember')).default;
      const teamMemberIds = await TeamMember.find({ projectId })
        .select('userId')
        .lean()
        .then(members => members.map(m => m.userId.toString()));
      
      // Get all user IDs (owner + team members)
      const userIds = [project.userId.toString(), ...teamMemberIds];

      const objectIdUserIds = userIds.map(id => new mongoose.Types.ObjectId(id));

      // Get current active sessions for all team members
      const activeSessions = await UserSession.find({
        userId: { $in: objectIdUserIds },
        isActive: true
      }).lean();

      const teamTimeData: any[] = [];
      
      // For each team member, calculate their total time on this project
      for (const userId of userIds) {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        
        // Get all sessions for this user that have project time data
        const userSessions = await UserSession.find({
          userId: userObjectId,
          projectTimeBreakdown: { $exists: true, $ne: [] }
        }).lean();
        
        let totalTime = 0;
        let lastUsed: Date | null = null;
        
        userSessions.forEach(session => {
          const projectEntry = session.projectTimeBreakdown?.find(p => 
            p.projectId === projectId || p.projectId?.toString() === projectId
          );
          if (projectEntry) {
            totalTime += projectEntry.timeSpent || 0;
            if (!lastUsed || projectEntry.lastSwitchTime > lastUsed) {
              lastUsed = projectEntry.lastSwitchTime;
            }
          }
        });
        
        // Check for current active session with this project
        const activeSession = activeSessions.find(s => s.userId.toString() === userId);
        if (activeSession && activeSession.currentProjectId === projectId && activeSession.currentProjectStartTime) {
          // Use lastActivity instead of current time to avoid including sleep periods
          const endTime = activeSession.lastActivity ? activeSession.lastActivity.getTime() : Date.now();
          const currentSessionTime = endTime - activeSession.currentProjectStartTime.getTime();
          totalTime += currentSessionTime;
          lastUsed = new Date();
        }
        
        // Always include team members in the result, even with 0 time
        teamTimeData.push({
          _id: userObjectId,
          totalTime,
          sessions: userSessions.length,
          lastUsed
        });
      }

      return {
        projectId,
        teamTimeData,
        period: `${days} days`
      };
    } catch (error) {
      console.error('Error fetching team project time data:', error);
      return null;
    }
  }

  static async getActiveSession(userId: string) {
    try {
      return await UserSession.findOne({ 
        userId, 
        isActive: true 
      }).sort({ startTime: -1 });
    } catch (error) {
      console.error('Error getting active session:', error);
      return null;
    }
  }

  static async getUserAnalytics(userId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analytics = await Analytics.aggregate([
        {
          $match: {
            userId,
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
            lastEvent: { $max: '$timestamp' }
          }
        }
      ]);

      const sessions = await UserSession.aggregate([
        {
          $match: {
            userId,
            startTime: { $gte: startDate }
          }
        },
        {
          $addFields: {
            calculatedDuration: {
              $cond: {
                if: { $and: [{ $gt: ['$duration', 0] }] },
                then: '$duration',
                else: {
                  $subtract: [
                    { $ifNull: ['$lastActivity', new Date()] },
                    '$startTime'
                  ]
                }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalDuration: { $sum: '$calculatedDuration' },
            avgDuration: { $avg: '$calculatedDuration' },
            uniqueProjects: { $addToSet: '$projectsViewed' }
          }
        }
      ]);

      // Get project time breakdown data with simplified approach
      const projectTimeData = await UserSession.aggregate([
        {
          $match: {
            userId,
            startTime: { $gte: startDate },
            projectTimeBreakdown: { $exists: true, $ne: [] }
          }
        },
        {
          $unwind: '$projectTimeBreakdown'
        },
        {
          $group: {
            _id: '$projectTimeBreakdown.projectId',
            totalTime: { $sum: '$projectTimeBreakdown.timeSpent' },
            sessions: { $sum: 1 },
            lastUsed: { $max: '$projectTimeBreakdown.lastSwitchTime' }
          }
        },
        {
          $sort: { totalTime: -1 }
        }
      ]);

      // Get project names for the user to ensure we only get accessible projects
      const projectIds = projectTimeData.map(p => p._id).filter(id => id);
      
      // Convert string IDs to ObjectIds where possible
      const objectIds = projectIds.map(id => {
        try {
          return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
        } catch (e) {
          return null;
        }
      }).filter(id => id !== null);
      
      // Import TeamMember model
      const TeamMember = (await import('../models/TeamMember')).default;
      
      // Get projects the user has access to (owned or team member)
      const teamMemberProjects = await TeamMember.find({ userId }).select('projectId').lean();
      const accessibleProjectIds = [...objectIds, ...teamMemberProjects.map(tm => tm.projectId)];
      
      // Query projects by accessible project IDs
      const projects = await Project.find({
        $or: [
          { userId: userId, _id: { $in: objectIds } }, // User-owned projects
          { _id: { $in: accessibleProjectIds } } // Team member projects
        ]
      }).select('_id name').lean();

      // Combine the data
      const projectBreakdown = projectTimeData.map(timeData => {
        const project = projects.find(p => 
          p._id.toString() === timeData._id?.toString()
        );
        
        return {
          projectId: timeData._id,
          projectName: project?.name || `Project ${timeData._id?.toString().slice(-6)}`,
          totalTime: timeData.totalTime,
          sessions: timeData.sessions,
          lastUsed: timeData.lastUsed
        };
      });

      return {
        eventCounts: analytics,
        sessionStats: sessions[0] || {},
        projectBreakdown: projectBreakdown,
        period: `${days} days`
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return null;
    }
  }

}


// Optimized middleware to track project access with intelligent caching
export const trackProjectAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.userId) {
    return next();
  }

  const projectId = req.params.id || req.params.projectId;
  if (!projectId) {
    return next();
  }

  // Check project access cache to avoid redundant tracking
  const cacheKey = `${req.userId}-${projectId}`;
  const now = Date.now();
  const lastAccess = projectAccessCache.get(cacheKey);
  
  if (lastAccess && (now - lastAccess) < 60000) { // 1 minute throttle
    return next();
  }

  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode < 400) {
      projectAccessCache.set(cacheKey, now);
      
      // Track project access asynchronously without blocking the response
      (async () => {
        try {
          // Try to get project name from the response data first
          let projectName = 'Unknown Project';
          
          if (data && typeof data === 'string') {
            try {
              const parsedData = JSON.parse(data);
              if (parsedData.name) {
                projectName = parsedData.name;
              }
            } catch (e) {
              // Not JSON, continue with fallback
            }
          } else if (data && typeof data === 'object' && data.name) {
            projectName = data.name;
          }
          
          // If we still don't have a name, try to fetch it from the database
          if (projectName === 'Unknown Project') {
            const project = await Project.findById(projectId).select('name').lean();
            if (project) {
              projectName = project.name;
            }
          }

          AnalyticsService.trackEvent(req.userId!, 'project_open', {
            projectId,
            projectName,
            endpoint: req.path,
            method: req.method
          }, req).catch(console.error);
        } catch (error) {
          // Fallback to tracking without project name if there's an error
          AnalyticsService.trackEvent(req.userId!, 'project_open', {
            projectId,
            endpoint: req.path,
            method: req.method
          }, req).catch(console.error);
        }
      })();
    }
    return originalSend.call(this, data);
  };
  
  next();
};

// Optimized session middleware with smart updates
export const sessionMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.userId) {
      let sessionId = req.headers['x-session-id'] as string;
      
      if (!sessionId) {
        // Start new session
        sessionId = await AnalyticsService.startSession(req.userId, req);
        res.set('X-Session-ID', sessionId);
      } else {
        // Only update session periodically, not on every request (optimization)
        const shouldUpdate = Math.random() < 0.1; // 10% of requests
        
        if (shouldUpdate) {
          await AnalyticsService.updateSession(sessionId, {
            pageName: req.path,
            lastActivity: new Date()
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Session middleware error:', error);
    next(); // Continue even if session update fails
  }
};
