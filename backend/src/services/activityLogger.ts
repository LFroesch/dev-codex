import ActivityLog, { IActivityLog } from '../models/ActivityLog';
import mongoose from 'mongoose';

export interface ActivityLogData {
  projectId: string;
  userId: string;
  sessionId: string;
  action: string;
  resourceType: 'project' | 'note' | 'todo' | 'doc' | 'devlog' | 'link' | 'tech' | 'package' | 'team' | 'settings';
  resourceId?: string;
  details?: {
    field?: string;
    oldValue?: any;
    newValue?: any;
    resourceName?: string;
    fileName?: string;
    metadata?: Record<string, any>;
  };
  userAgent?: string;
  ipAddress?: string;
}

class ActivityLogger {
  async log(data: ActivityLogData): Promise<IActivityLog> {
    try {
      const activityLog = new ActivityLog({
        projectId: new mongoose.Types.ObjectId(data.projectId),
        userId: new mongoose.Types.ObjectId(data.userId),
        sessionId: data.sessionId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: data.details || {},
        timestamp: new Date(),
        userAgent: data.userAgent,
        ipAddress: data.ipAddress
      });

      return await activityLog.save();
    } catch (error) {
      console.error('Failed to log activity:', error);
      throw error;
    }
  }

  async getProjectActivities(
    projectId: string, 
    options: {
      limit?: number;
      offset?: number;
      userId?: string;
      resourceType?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ activities: IActivityLog[], total: number }> {
    const {
      limit = 50,
      offset = 0,
      userId,
      resourceType,
      startDate,
      endDate
    } = options;

    const query: any = { projectId: new mongoose.Types.ObjectId(projectId) };

    if (userId) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    if (resourceType) {
      query.resourceType = resourceType;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const [activities, total] = await Promise.all([
      ActivityLog.find(query)
        .populate('userId', 'firstName lastName email')
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query)
    ]);

    return { activities, total };
  }

  async getUserActivities(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      projectId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ activities: IActivityLog[], total: number }> {
    const {
      limit = 50,
      offset = 0,
      projectId,
      startDate,
      endDate
    } = options;

    const query: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (projectId) {
      query.projectId = new mongoose.Types.ObjectId(projectId);
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const [activities, total] = await Promise.all([
      ActivityLog.find(query)
        .populate('projectId', 'name')
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query)
    ]);

    return { activities, total };
  }

  async getRecentActivity(
    projectId: string,
    minutes: number = 5
  ): Promise<IActivityLog[]> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    
    return ActivityLog.find({
      projectId: new mongoose.Types.ObjectId(projectId),
      timestamp: { $gte: cutoffTime }
    })
    .populate('userId', 'firstName lastName email')
    .sort({ timestamp: -1 })
    .limit(20)
    .lean();
  }

  // Helper methods for common activity types
  async logProjectView(projectId: string, userId: string, sessionId: string, userAgent?: string, ipAddress?: string) {
    return this.log({
      projectId,
      userId,
      sessionId,
      action: 'viewed',
      resourceType: 'project',
      resourceId: projectId,
      userAgent,
      ipAddress
    });
  }

  async logFieldUpdate(
    projectId: string,
    userId: string,
    sessionId: string,
    resourceType: ActivityLogData['resourceType'],
    resourceId: string,
    field: string,
    oldValue: any,
    newValue: any,
    resourceName?: string,
    fileName?: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    return this.log({
      projectId,
      userId,
      sessionId,
      action: 'updated',
      resourceType,
      resourceId,
      details: {
        field,
        oldValue,
        newValue,
        resourceName,
        fileName
      },
      userAgent,
      ipAddress
    });
  }

  async logResourceCreation(
    projectId: string,
    userId: string,
    sessionId: string,
    resourceType: ActivityLogData['resourceType'],
    resourceId: string,
    metadata?: Record<string, any>,
    userAgent?: string,
    ipAddress?: string
  ) {
    return this.log({
      projectId,
      userId,
      sessionId,
      action: 'created',
      resourceType,
      resourceId,
      details: { metadata },
      userAgent,
      ipAddress
    });
  }

  async logResourceDeletion(
    projectId: string,
    userId: string,
    sessionId: string,
    resourceType: ActivityLogData['resourceType'],
    resourceId: string,
    metadata?: Record<string, any>,
    userAgent?: string,
    ipAddress?: string
  ) {
    return this.log({
      projectId,
      userId,
      sessionId,
      action: 'deleted',
      resourceType,
      resourceId,
      details: { metadata },
      userAgent,
      ipAddress
    });
  }

  // Smart project join logging - prevents spam
  async logProjectJoin(
    projectId: string,
    userId: string,
    sessionId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<IActivityLog | null> {
    try {
      // Check if user has already "joined_project" in this session
      const existingJoin = await ActivityLog.findOne({
        projectId: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(userId),
        sessionId,
        action: 'joined_project'
      }).lean();

      // If they already joined in this session, don't log again
      if (existingJoin) {
        console.log(`User ${userId} already joined project ${projectId} in session ${sessionId}, skipping duplicate log`);
        return null;
      }

      // Log the join
      return this.log({
        projectId,
        userId,
        sessionId,
        action: 'joined_project',
        resourceType: 'project',
        resourceId: projectId,
        userAgent,
        ipAddress
      });
    } catch (error) {
      console.error('Failed to log project join:', error);
      throw error;
    }
  }
}

export default new ActivityLogger();