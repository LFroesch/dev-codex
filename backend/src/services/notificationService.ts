import Notification, { INotification } from '../models/Notification';
import mongoose from 'mongoose';
import {
  getUserPlanTier,
  calculateNotificationExpiration,
  getNotificationImportance,
} from '../utils/retentionUtils';

interface CreateNotificationData {
  userId: mongoose.Types.ObjectId | string;
  type: 'project_invitation' | 'project_shared' | 'team_member_added' | 'team_member_removed' | 'todo_assigned' | 'todo_due_soon' | 'todo_overdue' | 'subtask_completed' | 'stale_items_summary' | 'daily_todo_summary' | 'projects_locked' | 'projects_unlocked';
  title: string;
  message: string;
  actionUrl?: string;
  relatedProjectId?: mongoose.Types.ObjectId | string;
  relatedInvitationId?: mongoose.Types.ObjectId | string;
  relatedUserId?: mongoose.Types.ObjectId | string;
  relatedTodoId?: string;
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
   * Create a new notification and emit real-time event
   *
   * UNIQUENESS LOGIC:
   * This method ensures notification uniqueness by detecting and replacing duplicates.
   * Uniqueness is determined by a combination of:
   * - userId + type (always)
   * - Plus ONE of the following related entities (in priority order):
   *   1. relatedTodoId - For todo-specific notifications (assigned, due soon, overdue)
   *   2. relatedInvitationId - For project invitation notifications
   *   3. relatedProjectId - For project-level notifications (shared, etc.)
   *   4. relatedUserId - For team_member_added notifications
   *
   * BEHAVIOR:
   * - If a duplicate is found, the OLD notification is deleted first
   * - A NEW notification is created with updated data
   * - Socket events are emitted for both deletion and creation
   *
   * SPAM PREVENTION:
   * - For additional spam prevention, use hasRecentNotification() before calling this method
   * - This method handles uniqueness by replacement, not by blocking creation
   *
   * @param data - Notification data including userId, type, and related entities
   * @returns The newly created notification
   */
  async createNotification(data: CreateNotificationData): Promise<INotification> {
    try {
      // Step 1: Build uniqueness query
      // Start with base criteria: same user and same notification type
      const duplicateQuery: any = {
        userId: data.userId,
        type: data.type,
      };

      // Step 2: Add related entity to uniqueness check
      // Priority: todo > invitation > user (for team_member_added) > project
      // This ensures we don't create multiple notifications for the same entity/action

      if (data.relatedTodoId) {
        // Todo-specific: prevents multiple "todo assigned/due" notifications for same todo
        duplicateQuery.relatedTodoId = data.relatedTodoId;
      }
      if (data.relatedInvitationId) {
        // Invitation-specific: prevents multiple invitations for same invitation
        duplicateQuery.relatedInvitationId = data.relatedInvitationId;
      }
      if (data.relatedProjectId && !data.relatedInvitationId && !data.relatedTodoId) {
        // Project-specific: only used if no more specific entity (todo/invitation) exists
        // Prevents multiple "project shared" notifications for the same project
        duplicateQuery.relatedProjectId = data.relatedProjectId;
      }
      if (data.relatedUserId && data.type === 'team_member_added') {
        // User-specific for team additions: prevents duplicate "X joined team" notifications
        duplicateQuery.relatedUserId = data.relatedUserId;
      }

      // Step 3: Check for existing duplicate
      const existingNotification = await Notification.findOne(duplicateQuery);

      if (existingNotification) {
        // Step 4: Replace duplicate by deleting old and creating new
        // This ensures users always see the most recent/updated version
        await Notification.findByIdAndDelete(existingNotification._id);
        // Emit deletion event so frontend removes old notification
        this.emitNotificationEvent('notification-deleted', data.userId.toString(), existingNotification._id.toString());
      }

      // Get user's plan tier and calculate retention
      const planTier = await getUserPlanTier(data.userId);
      const importance = getNotificationImportance(data.type);
      const expiresAt = calculateNotificationExpiration(planTier, data.type);

      // Create the new notification with retention fields
      const notification = await Notification.create({
        ...data,
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
        .skip(skip);

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