import Notification, { INotification } from '../models/Notification';
import mongoose from 'mongoose';
import {
  getUserPlanTier,
  calculateNotificationExpiration,
  getNotificationImportance,
} from '../utils/retentionUtils';
import { SOCIAL_CONSTANTS } from '../config/socialConstants';

interface CreateNotificationData {
  userId: mongoose.Types.ObjectId | string;
  type: 'project_invitation' | 'project_shared' | 'team_member_added' | 'team_member_removed' | 'todo_assigned' | 'todo_due_soon' | 'todo_overdue' | 'subtask_completed' | 'stale_items_summary' | 'daily_todo_summary' | 'projects_locked' | 'projects_unlocked' | 'admin_message' | 'comment_on_project' | 'reply_to_comment' | 'project_favorited' | 'new_follower' | 'project_followed' | 'user_post' | 'project_update' | 'post_like' | 'comment_like';
  title: string;
  message: string;
  actionUrl?: string;
  relatedProjectId?: mongoose.Types.ObjectId | string;
  relatedInvitationId?: mongoose.Types.ObjectId | string;
  relatedUserId?: mongoose.Types.ObjectId | string;
  relatedTodoId?: string;
  relatedCommentId?: mongoose.Types.ObjectId | string;
  metadata?: Record<string, any>;
}

class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Create or update notification with smart aggregation for social actions.
   * Aggregates multiple actions (favorites, comments, follows) within 1 hour into single notification.
   */
  async createNotification(data: CreateNotificationData): Promise<INotification> {
    try {
      // Define which notification types should be unique (only one per user)
      const uniqueTypes = ['daily_todo_summary', 'stale_items_summary'];

      // Delete old notification if this is a unique type
      if (uniqueTypes.includes(data.type)) {
        await Notification.deleteMany({
          userId: data.userId,
          type: data.type
        });
      }

      // Define which notification types should be aggregated (social actions)
      const aggregatableTypes = [
        'comment_on_project',
        'reply_to_comment',
        'project_favorited',
        'project_followed',
        'new_follower'
      ];

      const shouldAggregate = aggregatableTypes.includes(data.type);

      if (shouldAggregate) {
        const aggregationWindowMs = SOCIAL_CONSTANTS.NOTIFICATION_AGGREGATION_WINDOW_HOURS * 60 * 60 * 1000;
        const aggregationCutoff = new Date(Date.now() - aggregationWindowMs);

        // Build query based on notification type
        const aggregationQuery: any = {
          userId: data.userId,
          type: data.type,
          createdAt: { $gte: aggregationCutoff }
        };

        // Add relatedProjectId if it exists (for project-related notifications)
        if (data.relatedProjectId) {
          aggregationQuery.relatedProjectId = data.relatedProjectId;
        }

        const recentNotification = await Notification.findOne(aggregationQuery);

        if (recentNotification) {
          // UPDATE existing notification with aggregation
          const metadata = recentNotification.metadata || {};
          const actors = metadata.actors || [];
          const actorId = data.relatedUserId?.toString();

          // Only add if this actor hasn't already been counted
          if (actorId && !actors.includes(actorId)) {
            actors.push(actorId);
          }

          const count = actors.length;

          // Get project name for message
          const Project = (await import('../models/Project')).Project;
          const project = await Project.findById(data.relatedProjectId).select('name');
          const projectName = project?.name || 'your project';

          // Generate aggregated message
          let newMessage = '';
          let newTitle = '';

          if (data.type === 'comment_on_project' || data.type === 'reply_to_comment') {
            newTitle = count === 1 ? 'New Comment' : 'New Activity';
            newMessage = count === 1
              ? `New comment on "${projectName}"`
              : `${count} people commented on "${projectName}"`;
          } else if (data.type === 'project_favorited') {
            newTitle = count === 1 ? 'Project Favorited' : 'New Favorites';
            newMessage = count === 1
              ? `Someone favorited your project "${projectName}"`
              : `${count} people favorited your project "${projectName}"`;
          } else if (data.type === 'project_followed') {
            newTitle = count === 1 ? 'Project Followed' : 'New Followers';
            newMessage = count === 1
              ? `Someone started following "${projectName}"`
              : `${count} people started following "${projectName}"`;
          } else if (data.type === 'new_follower') {
            newTitle = count === 1 ? 'New Follower' : 'New Followers';
            newMessage = count === 1
              ? `Someone started following you`
              : `${count} people started following you`;
          }

          // Update the notification
          recentNotification.message = newMessage;
          recentNotification.title = newTitle;
          recentNotification.isRead = false; // Mark as unread again
          recentNotification.metadata = {
            ...metadata,
            actors,
            count,
            lastActorId: actorId,
            lastUpdated: new Date()
          };
          // Update createdAt to bubble to top of notification list
          recentNotification.createdAt = new Date();

          await recentNotification.save();

          // Populate and emit update event
          const populatedNotification = await Notification.findById(recentNotification._id)
            .populate('relatedProjectId', 'name color')
            .populate('relatedUserId', 'firstName lastName');

          this.emitNotificationEvent('notification-updated', data.userId.toString(), populatedNotification);

          return recentNotification;
        }
      }

      // No recent notification to aggregate, or non-aggregatable type
      // Create new notification

      // Get user's plan tier and calculate retention
      const planTier = await getUserPlanTier(data.userId);
      const importance = getNotificationImportance(data.type);
      const expiresAt = calculateNotificationExpiration(planTier, data.type);

      // Initialize metadata with first actor
      const initialMetadata = data.metadata || {};
      if (shouldAggregate && data.relatedUserId) {
        initialMetadata.actors = [data.relatedUserId.toString()];
        initialMetadata.count = 1;
      }

      // Create the new notification
      const notification = await Notification.create({
        ...data,
        metadata: initialMetadata,
        planTier,
        importance,
        expiresAt,
      });

      // Populate related fields for the socket event
      const populatedNotification = await Notification.findById(notification._id)
        .populate('relatedProjectId', 'name color')
        .populate('relatedUserId', 'firstName lastName')
        .populate('relatedInvitationId');

      // Emit real-time event to user's notification room
      this.emitNotificationEvent('notification-created', data.userId.toString(), populatedNotification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read and emit real-time event
   */
  async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { new: true }
      )
        .populate('relatedProjectId', 'name color')
        .populate('relatedUserId', 'firstName lastName')
        .populate('relatedInvitationId');

      if (notification) {
        this.emitNotificationEvent('notification-updated', userId, notification);
      }

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification and emit real-time event
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        userId,
      });

      if (notification) {
        this.emitNotificationEvent('notification-deleted', userId, notificationId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Clear all notifications for a user and emit real-time event
   */
  async clearAllNotifications(userId: string): Promise<number> {
    try {
      const result = await Notification.deleteMany({ userId });
      
      if (result.deletedCount > 0) {
        this.emitNotificationEvent('notifications-cleared', userId, null);
      }

      return result.deletedCount;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options: {
      limit?: number;
      skip?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<{
    notifications: INotification[];
    unreadCount: number;
    total: number;
  }> {
    try {
      const { limit = 20, skip = 0, unreadOnly = false } = options;

      const query: any = { userId };
      if (unreadOnly) {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .populate('relatedProjectId', 'name color')
        .populate('relatedUserId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const unreadCount = await Notification.countDocuments({
        userId,
        isRead: false,
      });

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        unreadCount,
        total,
      };
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Check if user has recent notification of specific type for a todo
   *
   * SPAM PREVENTION:
   * This method provides time-based spam prevention by checking if a similar notification
   * was recently created. Use this BEFORE calling createNotification() to prevent
   * excessive notifications for rapidly changing events (e.g., todo updates).
   *
   * UNIQUENESS vs SPAM PREVENTION:
   * - createNotification() handles UNIQUENESS (one notification per entity)
   * - hasRecentNotification() handles SPAM PREVENTION (rate limiting by time)
   *
   * EXAMPLE USE CASE:
   * Before sending a "todo due soon" reminder, check if one was already sent
   * within the last 60 minutes to avoid bombarding the user.
   *
   * @param userId - The user to check notifications for
   * @param type - The notification type
   * @param todoId - The related todo ID
   * @param minutesWindow - Time window in minutes (default: 60)
   * @returns true if a recent notification exists, false otherwise
   */
  async hasRecentNotification(
    userId: string,
    type: string,
    todoId: string,
    minutesWindow: number = 60
  ): Promise<boolean> {
    try {
      // Calculate cutoff time (current time - window)
      const cutoff = new Date(Date.now() - minutesWindow * 60 * 1000);

      // Check if a notification of this type for this todo exists within the window
      const existingNotification = await Notification.findOne({
        userId,
        type,
        relatedTodoId: todoId,
        createdAt: { $gte: cutoff }
      });

      return !!existingNotification;
    } catch (error) {
      console.error('Error checking recent notification:', error);
      // Return false on error to avoid blocking notification creation
      return false;
    }
  }

  /**
   * Emit socket event to user's notification room
   */
  private emitNotificationEvent(event: string, userId: string, data: any): void {
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`user-${userId}`).emit(event, data);
      } else {
      }
    } catch (error) {
      console.error('Error emitting notification event:', error);
    }
  }

  /**
   * Bulk create notifications (useful for system-wide notifications)
   */
  async createBulkNotifications(notifications: CreateNotificationData[]): Promise<INotification[]> {
    try {
      const createdNotifications = await Notification.insertMany(notifications);
      
      // Emit events for each notification
      for (let i = 0; i < createdNotifications.length; i++) {
        const notification = createdNotifications[i] as INotification;
        const originalData = notifications[i];
        
        // Populate the notification for the socket event
        const populatedNotification = await Notification.findById(notification._id)
          .populate('relatedProjectId', 'name color')
          .populate('relatedUserId', 'firstName lastName')
          .populate('relatedInvitationId');

        this.emitNotificationEvent('notification-created', originalData.userId.toString(), populatedNotification);
      }

      return createdNotifications as INotification[];
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }
}

export default NotificationService;