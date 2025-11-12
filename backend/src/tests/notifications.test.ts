import request from 'supertest';
import { User } from '../models/User';
import Notification from '../models/Notification';
import authRoutes from '../routes/auth';
import notificationRoutes from '../routes/notifications';
import { createTestApp, createAuthenticatedUser, getMockNotificationService } from './utils';

const app = createTestApp({
  '/api/auth': authRoutes,
  '/api/notifications': notificationRoutes
});

const mockNotificationService = getMockNotificationService();

jest.mock('../services/notificationService', () => ({
  getInstance: () => mockNotificationService,
}));

describe('Notification Routes', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = await createAuthenticatedUser(app);
    authToken = user.authToken;
    userId = user.userId;
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await Notification.deleteMany({});
  });

  describe('GET /api/notifications', () => {
    it('should get user notifications with default pagination', async () => {
      const mockNotifications = {
        notifications: [
          {
            _id: 'notif1',
            title: 'Test notification',
            message: 'Test message',
            read: false,
            createdAt: new Date()
          }
        ],
        totalCount: 1,
        unreadCount: 1
      };

      mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);

      const response = await request(app)
        .get('/api/notifications')
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.notifications).toHaveLength(1);
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith(userId, {
        limit: 20,
        skip: 0,
        unreadOnly: false,
      });
    });

    it('should get notifications with custom pagination and filters', async () => {
      const mockNotifications = {
        notifications: [],
        totalCount: 0,
        unreadCount: 0
      };

      mockNotificationService.getNotifications.mockResolvedValue(mockNotifications);

      const response = await request(app)
        .get('/api/notifications?limit=10&skip=5&unread_only=true')
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith(userId, {
        limit: 10,
        skip: 5,
        unreadOnly: true,
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications');

      expect(response.status).toBe(401);
    });

    it('should handle server errors', async () => {
      mockNotificationService.getNotifications.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/notifications')
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error fetching notifications');
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      mockNotificationService.markAsRead.mockResolvedValue({ success: true });

      const notificationId = 'notif123';
      const response = await request(app)
        .patch(`/api/notifications/${notificationId}/read`)
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(notificationId, userId);
    });

    it('should handle invalid notification ID', async () => {
      mockNotificationService.markAsRead.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/notifications/invalid-id/read')
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const response = await request(app)
        .patch('/api/notifications/read-all')
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('notifications as read');
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete notification', async () => {
      mockNotificationService.deleteNotification.mockResolvedValue(true);

      const notificationId = 'notif123';
      const response = await request(app)
        .delete(`/api/notifications/${notificationId}`)
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith(notificationId, userId);
    });

    it('should handle notification not found', async () => {
      mockNotificationService.deleteNotification.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/notifications/nonexistent')
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});