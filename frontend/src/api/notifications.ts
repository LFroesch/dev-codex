import { BaseApiService } from './base';
import type { Notification } from './types';

class NotificationService extends BaseApiService {
  constructor() {
    super('/notifications');
  }

  async getNotifications(params?: { limit?: number; skip?: number; unread_only?: boolean }): Promise<{ 
    success: boolean; 
    notifications: Notification[]; 
    unreadCount: number; 
    total: number; 
  }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());
    if (params?.unread_only) queryParams.append('unread_only', 'true');
    
    const queryString = queryParams.toString();
    return this.get(queryString ? `?${queryString}` : '');
  }

  async markAsRead(notificationId: string): Promise<{ success: boolean; notification: Notification }> {
    return this.patch(`/${notificationId}/read`);
  }

  async markAllAsRead(): Promise<{ success: boolean; message: string; modifiedCount: number }> {
    return this.patch('/read-all');
  }

  async deleteNotification(notificationId: string): Promise<{ success: boolean; message: string }> {
    return this.delete(`/${notificationId}`);
  }

  async clearAllNotifications(): Promise<{ success: boolean; message: string; deletedCount: number }> {
    return this.delete('/clear-all');
  }

  async getInvitationNotification(invitationId: string): Promise<{ 
    success: boolean; 
    notification: Notification; 
    invitation: any; 
    project: any; 
  }> {
    return this.get(`/invitation/${invitationId}`);
  }
}

export const notificationAPI = new NotificationService();