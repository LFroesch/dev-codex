import ActivityLog, { IActivityLog } from '../models/ActivityLog';
import mongoose from 'mongoose';
import { getUserPlanTier, calculateActivityLogExpiration } from '../utils/retentionUtils';
import { User } from '../models/User';

export interface ActivityLogData {
  projectId: string;
  userId: string;
  sessionId: string;
  action: string;
  resourceType: 'project' | 'note' | 'todo' | 'component' | 'devlog' | 'link' | 'tech' | 'team' | 'settings';
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
  /**
   * Generate human-readable description for activity log
   */
  private generateDescription(data: ActivityLogData, userName: string): string {
    const resourceName = data.details?.resourceName || data.resourceId || 'item';
    const resourceType = data.resourceType;

    switch (data.action) {
      case 'created':
        return `${userName} created ${resourceType} "${resourceName}"`;

      case 'updated':
        if (data.details?.field === 'status') {
          return `${userName} changed ${resourceType} "${resourceName}" status to ${data.details.newValue}`;
        }
        if (data.details?.field === 'completed') {
          return `${userName} marked ${resourceType} "${resourceName}" as ${data.details.newValue ? 'complete' : 'incomplete'}`;
        }
        if (data.details?.field) {
          return `${userName} updated ${data.details.field} in ${resourceType} "${resourceName}"`;
        }
        return `${userName} updated ${resourceType} "${resourceName}"`;

      case 'deleted':
        return `${userName} deleted ${resourceType} "${resourceName}"`;

      case 'viewed':
        return `${userName} viewed ${resourceType} "${resourceName}"`;

      case 'invited_member':
        const inviteeEmail = data.details?.metadata?.inviteeEmail || 'a user';
        return `${userName} invited ${inviteeEmail} to the project`;

      case 'removed_member':
        const removedEmail = data.details?.metadata?.removedEmail || 'a user';
        return `${userName} removed ${removedEmail} from the project`;

      case 'updated_role':
        const newRole = data.details?.newValue || 'member';
        return `${userName} changed user role to ${newRole}`;

      case 'added_tech':
        return `${userName} added technology "${resourceName}"`;

      case 'removed_tech':
        return `${userName} removed technology "${resourceName}"`;

      case 'exported_data':
        const format = data.details?.metadata?.format || 'unknown format';
        return `${userName} exported project data to ${format}`;

      case 'imported_data':
        return `${userName} imported data into the project`;

      case 'archived_project':
        return `${userName} archived the project`;

      case 'unarchived_project':
        return `${userName} unarchived the project`;

      case 'joined_project':
        return `${userName} joined the project`;

      case 'left_project':
        return `${userName} left the project`;

      default:
        return `${userName} performed ${data.action} on ${resourceType}`;
    }
  }

  // Critical actions that should never expire (audit trail)
  private readonly CRITICAL_ACTIONS = [
    'invited_member',
    'removed_member',
    'updated_role',
    'shared_project',
    'unshared_project',
    'archived_project',
    'unarchived_project'
  ];

  async log(data: ActivityLogData): Promise<IActivityLog> {
    try {
      // Get user's plan tier to set appropriate retention policy
      const planTier = await getUserPlanTier(data.userId);
      const timestamp = new Date();

      // Critical audit events never expire, others expire based on plan tier
      const isCritical = this.CRITICAL_ACTIONS.includes(data.action);
      const expiresAt = isCritical ? undefined : calculateActivityLogExpiration(planTier, timestamp);

      // Get user info for human-readable description
      const user = await User.findById(data.userId).select('firstName lastName email').lean();
      const userName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
        : 'Unknown User';

      // Generate human-readable description
      const changeDescription = this.generateDescription(data, userName);

      const activityLog = new ActivityLog({
        projectId: new mongoose.Types.ObjectId(data.projectId),
        userId: new mongoose.Types.ObjectId(data.userId),
        sessionId: data.sessionId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: data.details || {},
        timestamp,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        // Tiered retention fields
        planTier,
        expiresAt,
        isCompacted: false,
        // NEW: Human-readable fields
        userName,
        changeDescription
      });

      return await activityLog.save();
    } catch (error) {
      
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
      ActivityLog.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $unwind: {
            path: '$userInfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            userId: {
              _id: '$userInfo._id',
              firstName: '$userInfo.firstName',
              lastName: '$userInfo.lastName',
              email: '$userInfo.email'
            }
          }
        },
        {
          $project: {
            userInfo: 0
          }
        },
        { $sort: { timestamp: -1 } },
        { $skip: offset },
        { $limit: limit }
      ]),
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
      ActivityLog.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'projects',
            localField: 'projectId',
            foreignField: '_id',
            as: 'projectInfo'
          }
        },
        {
          $unwind: {
            path: '$projectInfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            projectId: {
              _id: '$projectInfo._id',
              name: '$projectInfo.name'
            }
          }
        },
        {
          $project: {
            projectInfo: 0
          }
        },
        { $sort: { timestamp: -1 } },
        { $skip: offset },
        { $limit: limit }
      ]),
      ActivityLog.countDocuments(query)
    ]);

    return { activities, total };
  }

  async getRecentActivity(
    projectId: string,
    minutes: number = 5
  ): Promise<IActivityLog[]> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    
    return ActivityLog.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          timestamp: { $gte: cutoffTime }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: {
          path: '$userInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          userId: {
            _id: '$userInfo._id',
            firstName: '$userInfo.firstName',
            lastName: '$userInfo.lastName',
            email: '$userInfo.email'
          }
        }
      },
      {
        $project: {
          userInfo: 0
        }
      },
      { $sort: { timestamp: -1 } },
      { $limit: 20 }
    ]);
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
      
      throw error;
    }
  }
}

export default new ActivityLogger();