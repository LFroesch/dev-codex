import { io, Socket } from 'socket.io-client';
import { Notification } from '../api';

interface NotificationListener {
  (notifications: Notification[]): void;
}

interface UnreadCountListener {
  (count: number): void;
}

class NotificationService {
  private static instance: NotificationService;
  private socket: Socket | null = null;
  private notifications: Notification[] = [];
  private unreadCount: number = 0;
  
  private notificationListeners: Set<NotificationListener> = new Set();
  private unreadCountListeners: Set<UnreadCountListener> = new Set();
  
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isInitialized = false;
  private currentUserId: string | null = null;

  private constructor() {
    // Don't auto-connect in constructor - wait for explicit initialization
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private connect() {
    if (this.socket?.connected) {
      console.log('Notification service already connected');
      return;
    }

    // Clean up any existing socket before creating new one
    if (this.socket && !this.socket.connected) {
      this.socket.removeAllListeners();
      this.socket = null;
    }

    const serverUrl = import.meta.env.DEV ? 'http://localhost:5003' : window.location.origin;
    
    this.socket = io(serverUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      forceNew: false
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Join user notification room if we have a userId
      if (this.currentUserId) {
        this.socket?.emit('join-user-notifications', this.currentUserId);
      }
      
      // Request initial notifications
      this.fetchNotifications();
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      
      // Auto-reconnect on unexpected disconnections
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        return;
      }
      
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Notification service connection error:', error);
      this.handleReconnect();
    });

    // Real-time notification events
    this.socket.on('notification-created', (notification: Notification) => {
      this.addNotification(notification);
    });

    this.socket.on('notification-updated', (notification: Notification) => {
      this.updateNotification(notification);
    });

    this.socket.on('notification-deleted', (notificationId: string) => {
      this.removeNotification(notificationId);
    });

    this.socket.on('notifications-cleared', () => {
      this.clearAllNotifications();
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
    
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Public method to initialize the service with user authentication
  public async initialize(userId?: string): Promise<void> {
    if (this.isInitialized) {
      console.log('Notification service already initialized');
      return;
    }
    
    try {
      // Get userId if not provided
      if (!userId) {
        const { authAPI } = await import('../api');
        const response = await authAPI.getMe();
        const user = response.user;
        userId = user?.id;
      }
      
      if (!userId) {
        console.warn('Cannot initialize notification service: no user ID available');
        return;
      }
      
      this.currentUserId = userId;
      this.isInitialized = true;
      
      // Now connect to socket
      this.connect();
      
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  private async fetchNotifications() {
    if (!this.isInitialized || !this.currentUserId) {
      console.warn('Cannot fetch notifications: service not initialized');
      return;
    }
    
    try {
      const { notificationAPI } = await import('../api');
      const response = await notificationAPI.getNotifications({ limit: 10 });
      
      this.notifications = response.notifications;
      this.unreadCount = response.unreadCount;
      
      this.notifyNotificationListeners();
      this.notifyUnreadCountListeners();
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }

  private addNotification(notification: Notification) {
    // Add to beginning of array (newest first)
    this.notifications.unshift(notification);
    
    // Limit to latest 10 notifications in memory
    if (this.notifications.length > 10) {
      this.notifications = this.notifications.slice(0, 10);
    }
    
    if (!notification.isRead) {
      this.unreadCount++;
    }
    
    this.notifyNotificationListeners();
    this.notifyUnreadCountListeners();
  }

  private updateNotification(updatedNotification: Notification) {
    const index = this.notifications.findIndex(n => n._id === updatedNotification._id);
    
    if (index !== -1) {
      const wasUnread = !this.notifications[index].isRead;
      const isNowRead = updatedNotification.isRead;
      
      this.notifications[index] = updatedNotification;
      
      // Update unread count if read status changed
      if (wasUnread && isNowRead) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      } else if (!wasUnread && !isNowRead) {
        this.unreadCount++;
      }
      
      this.notifyNotificationListeners();
      this.notifyUnreadCountListeners();
    }
  }

  private removeNotification(notificationId: string) {
    const notification = this.notifications.find(n => n._id === notificationId);
    
    if (notification) {
      this.notifications = this.notifications.filter(n => n._id !== notificationId);
      
      if (!notification.isRead) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
      
      this.notifyNotificationListeners();
      this.notifyUnreadCountListeners();
    }
  }

  private clearAllNotifications() {
    this.notifications = [];
    this.unreadCount = 0;
    
    this.notifyNotificationListeners();
    this.notifyUnreadCountListeners();
  }

  private notifyNotificationListeners() {
    this.notificationListeners.forEach(callback => {
      try {
        callback([...this.notifications]);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  private notifyUnreadCountListeners() {
    this.unreadCountListeners.forEach(callback => {
      try {
        callback(this.unreadCount);
      } catch (error) {
        console.error('Error in unread count listener:', error);
      }
    });
  }

  // Public API
  public subscribeToNotifications(callback: NotificationListener): () => void {
    this.notificationListeners.add(callback);
    
    // Immediately call with current notifications
    callback([...this.notifications]);
    
    return () => this.notificationListeners.delete(callback);
  }

  public subscribeToUnreadCount(callback: UnreadCountListener): () => void {
    this.unreadCountListeners.add(callback);
    
    // Immediately call with current count
    callback(this.unreadCount);
    
    return () => this.unreadCountListeners.delete(callback);
  }

  public async markAsRead(notificationId: string): Promise<void> {
    try {
      const { notificationAPI } = await import('../api');
      await notificationAPI.markAsRead(notificationId);
      
      // Update local state optimistically
      this.updateNotification({
        ...this.notifications.find(n => n._id === notificationId)!,
        isRead: true
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Refetch to sync state
      this.fetchNotifications();
    }
  }

  public async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { notificationAPI } = await import('../api');
      await notificationAPI.deleteNotification(notificationId);
      
      // Update local state optimistically
      this.removeNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Refetch to sync state
      this.fetchNotifications();
    }
  }

  public async clearAll(): Promise<void> {
    try {
      const { notificationAPI } = await import('../api');
      
      // Delete all notifications
      for (const notification of this.notifications) {
        await notificationAPI.deleteNotification(notification._id);
      }
      
      // Update local state
      this.clearAllNotifications();
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      // Refetch to sync state
      this.fetchNotifications();
    }
  }

  public getNotifications(): Notification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.unreadCount;
  }

  public isSocketConnected(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  public cleanup(): void {
    this.disconnect();
    this.notifications = [];
    this.unreadCount = 0;
    this.currentUserId = null;
    this.isInitialized = false;
    this.reconnectAttempts = 0;
    
    // Notify listeners of empty state
    this.notifyNotificationListeners();
    this.notifyUnreadCountListeners();
  }

  public forceReconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    if (this.isInitialized) {
      this.connect();
    }
  }
}

export const notificationService = NotificationService.getInstance();