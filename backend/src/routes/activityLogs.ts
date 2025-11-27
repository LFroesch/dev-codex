import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import activityLogger from '../services/activityLogger';
import ActivityLog from '../models/ActivityLog';
import UserSession from '../models/UserSession';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { asyncHandler, ForbiddenError } from '../utils/errorHandler';

const router = Router();

// Get activity logs for a specific project
router.get('/project/:projectId', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const {
    limit = 50,
    offset = 0,
    userId,
    resourceType,
    startDate,
    endDate
  } = req.query;

  const options = {
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
    userId: userId as string,
    resourceType: resourceType as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined
  };

  const result = await activityLogger.getProjectActivities(projectId, options);
  
  res.json({
    success: true,
    activities: result.activities,
    total: result.total,
    pagination: {
      limit: options.limit,
      offset: options.offset,
      hasMore: result.total > (options.offset + options.limit)
    }
  });
}));

// Get recent activity for a project (last 5 minutes by default)
router.get('/project/:projectId/recent', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const { minutes = 5 } = req.query;

  const activities = await activityLogger.getRecentActivity(
    projectId, 
    parseInt(minutes as string)
  );
  
  res.json({
    success: true,
    activities
  });
}));

// Get active users currently working on a project
router.get('/project/:projectId/active-users', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const { minutes = 3 } = req.query; // Consider users active if they were active in last 3 minutes

  const cutoffTime = new Date(Date.now() - parseInt(minutes as string) * 60 * 1000);

  // Find active sessions for this project
  const activeSessions = await UserSession.find({
    currentProjectId: projectId,
    isActive: true,
    lastActivity: { $gte: cutoffTime }
  }).lean();

  // Get user details for active sessions
  const userIds = activeSessions.map(session => session.userId);
  const users = await User.find({ 
    _id: { $in: userIds } 
  }).select('firstName lastName email').lean();

  // Combine session and user data
  const activeUsers = activeSessions.map(session => {
    const user = users.find((u: any) => u._id.toString() === session.userId);
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      user,
      currentPage: session.currentPage,
      lastActivity: session.lastActivity,
      isVisible: session.isVisible,
      duration: session.duration || 0
    };
  });

  res.json({
    success: true,
    activeUsers,
    count: activeUsers.length
  });
}));

// Get user's activity logs
router.get('/user/:userId', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const {
    limit = 50,
    offset = 0,
    projectId,
    startDate,
    endDate
  } = req.query;

  // Users can only view their own activities unless they're admin
  const requestingUserId = req.userId;
  if (userId !== requestingUserId) {
    // Admin check not needed for current requirements
    throw ForbiddenError('Access denied', 'ACCESS_DENIED');
  }

  const options = {
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
    projectId: projectId as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined
  };

  const result = await activityLogger.getUserActivities(userId, options);
  
  res.json({
    success: true,
    activities: result.activities,
    total: result.total,
    pagination: {
      limit: options.limit,
      offset: options.offset,
      hasMore: result.total > (options.offset + options.limit)
    }
  });
}));

// Smart project join (prevents duplicate "started working" messages)
router.post('/smart-join', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId, sessionId } = req.body;
  const userId = req.userId!;
  const userAgent = req.get('User-Agent');
  const ipAddress = req.ip;

  const activity = await activityLogger.logProjectJoin(
    projectId,
    userId,
    sessionId || 'unknown',
    userAgent,
    ipAddress
  );

  res.json({
    success: true,
    logged: !!activity, // true if activity was logged, false if skipped
    activity
  });
}));

// Clear all activity logs for a project
router.delete('/project/:projectId/clear', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const userId = req.userId!;

  // Delete all activity logs for this project
  const result = await ActivityLog.deleteMany({
    projectId: new mongoose.Types.ObjectId(projectId)
  });

  // Log the clear action itself
  await activityLogger.log({
    projectId,
    userId,
    sessionId: 'system',
    action: 'cleared_activity_log',
    resourceType: 'project',
    resourceId: projectId,
    details: {
      metadata: {
        deletedCount: result.deletedCount
      }
    }
  });

  res.json({
    success: true,
    deletedCount: result.deletedCount,
    message: `Cleared ${result.deletedCount} activity log entries`
  });
}));

// Log a custom activity (for frontend events)
router.post('/log', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    projectId,
    action,
    resourceType,
    resourceId,
    details,
    sessionId
  } = req.body;

  const userId = req.userId!
  const userAgent = req.get('User-Agent');
  const ipAddress = req.ip;

  const activity = await activityLogger.log({
    projectId,
    userId,
    sessionId: sessionId || 'unknown',
    action,
    resourceType,
    resourceId,
    details,
    userAgent,
    ipAddress
  });

  res.json({
    success: true,
    activity
  });
}));

export default router;