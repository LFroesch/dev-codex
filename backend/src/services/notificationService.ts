import Notification, { INotification } from '../models/Notification';
import mongoose from 'mongoose';

interface CreateNotificationData {
  userId: mongoose.Types.ObjectId | string;
  type: 'project_invitation' | 'project_shared' | 'team_member_added' | 'team_member_removed' | 'todo_assigned' | 'todo_due_soon' | 'todo_overdue' | 'subtask_completed';
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
   */
  async createNotification(data: CreateNotificationData): Promise<INotification> {
    try {
      // Create the notification
      const notification = await Notification.create(data);
      
      // Populate related fields for the socket event
      const populatedNotification = await Notification.findById(notification._id)
        .populate('relatedProjectId', 'name color')
        .populate('relatedUserId', 'firstName lastName')
        .populate('relatedInvitationId');

      // Emit real-time event to user's notification room
      this.emitNotificationEvent('notification-created', data.userId.toString(), populatedNotification);

      console.log(`Created ${data.type} notification for user ${data.userId}`);
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
   */
  async hasRecentNotification(
    userId: string,
    type: string,
    todoId: string,
    minutesWindow: number = 60
  ): Promise<boolean> {
    try {
      const cutoff = new Date(Date.now() - minutesWindow * 60 * 1000);
      
      const existingNotification = await Notification.findOne({
        userId,
        type,
        relatedTodoId: todoId,
        createdAt: { $gte: cutoff }
      });

      return !!existingNotification;
    } catch (error) {
      console.error('Error checking recent notification:', error);
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
        console.log(`Emitted ${event} to user-${userId}`);
      } else {
        console.warn('Socket.IO instance not available for notification event');
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

      console.log(`Created ${createdNotifications.length} bulk notifications`);
      return createdNotifications as INotification[];
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }
}

export default NotificationService;