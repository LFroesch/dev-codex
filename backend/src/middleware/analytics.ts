import { Request, Response, NextFunction } from 'express';
import Analytics from '../models/Analytics';
import UserSession from '../models/UserSession';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

// Analytics service class
export class AnalyticsService {
  static async trackEvent(
    userId: string,
    eventType: 'project_open' | 'field_edit' | 'session_start' | 'session_end' | 'page_view' | 'action',
    eventData: any,
    req?: Request
  ) {
    try {
      const analyticsData = new Analytics({
        userId,
        sessionId: req?.headers['x-session-id'] as string,
        eventType,
        eventData,
        timestamp: new Date(),
        userAgent: req?.headers['user-agent'],
        ipAddress: req?.ip || req?.connection?.remoteAddress
      });

      await analyticsData.save();

      // Update session if exists
      if (req?.headers['x-session-id']) {
        await this.updateSession(req.headers['x-session-id'] as string, eventData);
      }

      return analyticsData;
    } catch (error) {
      console.error('Error tracking analytics event:', error);
    }
  }

  static async startSession(userId: string, req: Request): Promise<string> {
    try {
      const sessionId = uuidv4();
      
      const session = new UserSession({
        userId,
        sessionId,
        startTime: new Date(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection?.remoteAddress,
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

      await UserSession.updateOne(
        { sessionId },
        {
          endTime,
          duration,
          isActive: false
        }
      );

      // Track session end event
      if (userId) {
        await this.trackEvent(userId, 'session_end', { 
          sessionId, 
          duration: Math.round(duration / 1000) // duration in seconds
        });
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  static async updateSession(sessionId: string, eventData: any) {
    try {
      const updateData: any = {
        lastActivity: new Date(),
        $inc: { totalEvents: 1 }
      };

      // Handle heartbeat updates differently
      if (eventData.heartbeat) {
        updateData.lastActivity = eventData.timestamp || new Date();
        // Don't increment totalEvents for heartbeats
        delete updateData.$inc;
        
        // Track visibility state if provided
        if (typeof eventData.isVisible === 'boolean') {
          updateData.isVisible = eventData.isVisible;
        }
      } else {
        // Regular event updates
        if (eventData.projectId) {
          updateData.$addToSet = { projectsViewed: eventData.projectId };
        }

        if (eventData.pageName) {
          updateData.$addToSet = { 
            ...updateData.$addToSet,
            pagesVisited: eventData.pageName 
          };
        }
      }

      await UserSession.updateOne({ sessionId }, updateData);
    } catch (error) {
      console.error('Error updating session:', error);
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
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalDuration: { $sum: '$duration' },
            avgDuration: { $avg: '$duration' },
            uniqueProjects: { $addToSet: '$projectsViewed' }
          }
        }
      ]);

      return {
        eventCounts: analytics,
        sessionStats: sessions[0] || {},
        period: `${days} days`
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      return null;
    }
  }
}

// Middleware to track page views
export const trackPageView = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.userId) {
    // Don't await this to avoid slowing down the request
    AnalyticsService.trackEvent(req.userId, 'page_view', {
      pageName: req.path,
      method: req.method,
      query: req.query
    }, req).catch(console.error);
  }
  next();
};

// Middleware to track project access
export const trackProjectAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (req.userId && res.statusCode < 400) {
      const projectId = req.params.id || req.params.projectId;
      if (projectId) {
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
              const { Project } = await import('../models/Project');
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
    }
    return originalSend.call(this, data);
  };
  
  next();
};

// Middleware to handle session management
export const sessionMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.userId) {
    let sessionId = req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      // Start new session
      sessionId = await AnalyticsService.startSession(req.userId, req);
      res.set('X-Session-ID', sessionId);
    } else {
      // Update existing session
      await AnalyticsService.updateSession(sessionId, {
        pageName: req.path
      });
    }
  }
  next();
};