import NotificationService from '../../services/notificationService';
import Notification from '../../models/Notification';
import { User } from '../../models/User';
import { Project } from '../../models/Project';

describe('NotificationService', () => {
  let service: NotificationService;
  let user: any;
  let project: any;

  beforeEach(async () => {
    service = NotificationService.getInstance();

    user = await User.create({
      email: 'notif@example.com',
      password: 'StrongPass123!',
      firstName: 'Notif',
      lastName: 'User',
      username: 'notifuser',
      planTier: 'free'
    });

    project = await Project.create({
      name: 'Notif Project',
      description: 'Notification test project',
      ownerId: user._id,
      userId: user._id
    });
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = NotificationService.getInstance();
      const instance2 = NotificationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const notif = await service.createNotification({
        userId: user._id,
        type: 'project_invitation',
        title: 'Test Notification',
        message: 'Test message'
      });

      expect(notif).toBeDefined();
      expect(notif).toHaveProperty('userId');
      expect(notif).toHaveProperty('type', 'project_invitation');
      expect(notif).toHaveProperty('title', 'Test Notification');

      // Verify in DB
      const dbNotif = await Notification.findById(notif._id);
      expect(dbNotif).toBeDefined();
    });

    it('should create notification with project reference', async () => {
      const notif = await service.createNotification({
        userId: user._id,
        type: 'project_shared',
        title: 'Project Shared',
        message: 'Your project was shared',
        relatedProjectId: project._id
      });

      expect(notif.relatedProjectId).toEqual(project._id);
    });

    it('should create notification with user reference', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'StrongPass123!',
        firstName: 'Other',
        lastName: 'User',
        username: 'otheruser',
        planTier: 'free'
      });

      const notif = await service.createNotification({
        userId: user._id,
        type: 'team_member_added',
        title: 'New Team Member',
        message: 'Someone joined your project',
        relatedUserId: otherUser._id
      });

      expect(notif.relatedUserId).toEqual(otherUser._id);
    });

    it('should replace duplicate notifications', async () => {
      // Create first notification
      const notif1 = await service.createNotification({
        userId: user._id,
        type: 'project_invitation',
        title: 'First',
        message: 'First message',
        relatedProjectId: project._id
      });

      // Create duplicate - should replace first
      const notif2 = await service.createNotification({
        userId: user._id,
        type: 'project_invitation',
        title: 'Second',
        message: 'Second message',
        relatedProjectId: project._id
      });

      // First should be deleted
      const deleted = await Notification.findById(notif1._id);
      expect(deleted).toBeNull();

      // Second should exist
      const exists = await Notification.findById(notif2._id);
      expect(exists).toBeDefined();
    });
  });

  describe('getNotifications', () => {
    it('should get user notifications', async () => {
      await service.createNotification({
        userId: user._id,
        type: 'todo_assigned',
        title: 'Test 1',
        message: 'Message 1',
        relatedTodoId: 'todo1' // Different todo IDs to prevent duplicate replacement
      });

      await service.createNotification({
        userId: user._id,
        type: 'todo_assigned',
        title: 'Test 2',
        message: 'Message 2',
        relatedTodoId: 'todo2' // Different todo IDs to prevent duplicate replacement
      });

      const result = await service.getNotifications(user._id.toString());

      expect(result.notifications.length).toBeGreaterThanOrEqual(2);
      expect(result).toHaveProperty('unreadCount');
      expect(result).toHaveProperty('total');
    });

    it('should support pagination', async () => {
      // Create multiple notifications with different related IDs to avoid duplicates
      for (let i = 0; i < 15; i++) {
        await service.createNotification({
          userId: user._id,
          type: 'todo_assigned',
          title: `Test ${i}`,
          message: `Message ${i}`,
          relatedTodoId: `todo${i}` // Unique ID for each notification
        });
      }

      const page1 = await service.getNotifications(user._id.toString(), { limit: 10, skip: 0 });
      const page2 = await service.getNotifications(user._id.toString(), { limit: 10, skip: 10 });

      expect(page1.notifications.length).toBe(10);
      expect(page2.notifications.length).toBeGreaterThan(0);
    });

    it('should filter unread notifications', async () => {
      const notif1 = await service.createNotification({
        userId: user._id,
        type: 'todo_assigned',
        title: 'Unread',
        message: 'Message',
        relatedTodoId: 'todo-unread' // Unique ID
      });

      const notif2 = await service.createNotification({
        userId: user._id,
        type: 'todo_assigned',
        title: 'Read',
        message: 'Message',
        relatedTodoId: 'todo-read' // Unique ID
      });

      await service.markAsRead(notif2._id.toString(), user._id.toString());

      const result = await service.getNotifications(user._id.toString(), { unreadOnly: true });

      expect(result.notifications.every(n => !n.isRead)).toBe(true);
      expect(result.unreadCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notif = await service.createNotification({
        userId: user._id,
        type: 'todo_assigned',
        title: 'Unread',
        message: 'Message'
      });

      expect(notif.isRead).toBe(false);

      await service.markAsRead(notif._id.toString(), user._id.toString());

      const updated = await Notification.findById(notif._id);
      expect(updated?.isRead).toBe(true);
    });

    it('should not mark notification for different user', async () => {
      const otherUser = await User.create({
        email: 'other2@example.com',
        password: 'StrongPass123!',
        firstName: 'Other',
        lastName: 'User2',
        username: 'otheruser2',
        planTier: 'free'
      });

      const notif = await service.createNotification({
        userId: user._id,
        type: 'todo_assigned',
        title: 'Test',
        message: 'Message'
      });

      const result = await service.markAsRead(notif._id.toString(), otherUser._id.toString());
      expect(result).toBeNull();

      const unchanged = await Notification.findById(notif._id);
      expect(unchanged?.isRead).toBe(false);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const notif = await service.createNotification({
        userId: user._id,
        type: 'todo_assigned',
        title: 'To Delete',
        message: 'Will be deleted'
      });

      await service.deleteNotification(notif._id.toString(), user._id.toString());

      const deleted = await Notification.findById(notif._id);
      expect(deleted).toBeNull();
    });

    it('should not delete notification for different user', async () => {
      const otherUser = await User.create({
        email: 'other3@example.com',
        password: 'StrongPass123!',
        firstName: 'Other',
        lastName: 'User3',
        username: 'otheruser3',
        planTier: 'free'
      });

      const notif = await service.createNotification({
        userId: user._id,
        type: 'todo_assigned',
        title: 'Test',
        message: 'Message'
      });

      const result = await service.deleteNotification(notif._id.toString(), otherUser._id.toString());
      expect(result).toBe(false);

      const exists = await Notification.findById(notif._id);
      expect(exists).toBeDefined();
    });
  });

  describe('clearAllNotifications', () => {
    it('should clear all user notifications', async () => {
      await service.createNotification({
        userId: user._id,
        type: 'todo_assigned',
        title: 'Test 1',
        message: 'Message 1',
        relatedTodoId: 'clear-todo-1' // Unique ID
      });

      await service.createNotification({
        userId: user._id,
        type: 'todo_assigned',
        title: 'Test 2',
        message: 'Message 2',
        relatedTodoId: 'clear-todo-2' // Unique ID
      });

      const count = await service.clearAllNotifications(user._id.toString());
      expect(count).toBeGreaterThanOrEqual(2);

      const remaining = await Notification.find({ userId: user._id });
      expect(remaining.length).toBe(0);
    });
  });

  describe('hasRecentNotification', () => {
    it('should detect recent notification', async () => {
      await service.createNotification({
        userId: user._id,
        type: 'todo_due_soon',
        title: 'Due Soon',
        message: 'Your todo is due soon',
        relatedTodoId: 'todo123'
      });

      const hasRecent = await service.hasRecentNotification(
        user._id.toString(),
        'todo_due_soon',
        'todo123',
        60
      );

      expect(hasRecent).toBe(true);
    });

    it('should not detect old notification', async () => {
      const hasRecent = await service.hasRecentNotification(
        user._id.toString(),
        'todo_due_soon',
        'todo999',
        1
      );

      expect(hasRecent).toBe(false);
    });
  });

  describe('notification types', () => {
    it('should handle project_invitation type', async () => {
      const notif = await service.createNotification({
        userId: user._id,
        type: 'project_invitation',
        title: 'Project Invite',
        message: 'You were invited',
        relatedProjectId: project._id
      });

      expect(notif.type).toBe('project_invitation');
    });

    it('should handle team_member_added type', async () => {
      const notif = await service.createNotification({
        userId: user._id,
        type: 'team_member_added',
        title: 'Team Member',
        message: 'New member added'
      });

      expect(notif.type).toBe('team_member_added');
    });

    it('should handle todo_assigned type', async () => {
      const notif = await service.createNotification({
        userId: user._id,
        type: 'todo_assigned',
        title: 'Todo Assigned',
        message: 'You have a new todo'
      });

      expect(notif.type).toBe('todo_assigned');
    });

    it('should handle todo_due_soon type', async () => {
      const notif = await service.createNotification({
        userId: user._id,
        type: 'todo_due_soon',
        title: 'Due Soon',
        message: 'Todo is due soon'
      });

      expect(notif.type).toBe('todo_due_soon');
    });
  });

  describe('createBulkNotifications', () => {
    it('should create multiple notifications at once', async () => {
      const user2 = await User.create({
        email: 'bulk@example.com',
        password: 'StrongPass123!',
        firstName: 'Bulk',
        lastName: 'User',
        username: 'bulkuser',
        planTier: 'free'
      });

      const notifications = [
        {
          userId: user._id,
          type: 'project_shared' as const,
          title: 'Bulk 1',
          message: 'Message 1'
        },
        {
          userId: user2._id,
          type: 'project_shared' as const,
          title: 'Bulk 2',
          message: 'Message 2'
        }
      ];

      const result = await service.createBulkNotifications(notifications);

      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Bulk 1');
      expect(result[1].title).toBe('Bulk 2');
    });
  });
});
