import ReminderService from '../../services/reminderService';
import { Project } from '../../models/Project';
import { User } from '../../models/User';
import Notification from '../../models/Notification';
import NotificationService from '../../services/notificationService';
import staleItemService from '../../services/staleItemService';

// Mock node-cron to prevent actual cron jobs from running
jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

// Mock services
jest.mock('../../services/notificationService');
jest.mock('../../services/staleItemService');

describe('ReminderService', () => {
  let testUser: any;
  let testProject: any;

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Notification.deleteMany({});

    testUser = await User.create({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      planTier: 'free',
      isEmailVerified: true
    });

    testProject = await Project.create({
      name: 'Test Project',
      description: 'Test Description',
      userId: testUser._id,
      ownerId: testUser._id,
      notes: [],
      todos: []
    });

    // Setup notification service mock
    const mockNotificationService = {
      createNotification: jest.fn().mockResolvedValue(undefined)
    };
    (NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService);

    // Setup stale item service mock
    (staleItemService.checkAllUsers as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Notification.deleteMany({});
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ReminderService.getInstance();
      const instance2 = ReminderService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize cron jobs', () => {
      const cron = require('node-cron');
      const service = ReminderService.getInstance();

      service.initialize();

      // Verify cron.schedule was called (for due todos, daily summary, and stale items)
      expect(cron.schedule).toHaveBeenCalled();
      expect(cron.schedule).toHaveBeenCalledWith('*/15 * * * *', expect.any(Function));
      expect(cron.schedule).toHaveBeenCalledWith('0 8 * * *', expect.any(Function));
      expect(cron.schedule).toHaveBeenCalledWith('0 9 * * 1', expect.any(Function));
    });

    it('should not initialize twice', () => {
      const cron = require('node-cron');
      cron.schedule.mockClear();

      const service = ReminderService.getInstance();
      service.initialize();
      service.initialize(); // Second call should be no-op

      // Should only schedule cron jobs once
      const callCount = cron.schedule.mock.calls.length;
      service.initialize();
      expect(cron.schedule.mock.calls.length).toBe(callCount); // No new calls
    });
  });

  describe('checkDueTodos', () => {
    it('should create notification for overdue todo', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      testProject.todos = [{
        id: 'todo1',
        title: 'Overdue Todo',
        completed: false,
        dueDate: yesterday
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await service.triggerChecks();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).toHaveBeenCalled();
      const call = (mockService.createNotification as jest.Mock).mock.calls[0][0];
      expect(call.type).toBe('todo_overdue');
      expect(call.title).toBe('Todo Overdue');
      expect(call.message).toContain('Overdue Todo');
      // userId might be the full object or _id depending on populate
      const userId = call.userId._id || call.userId;
      expect(userId.toString()).toBe(testUser._id.toString());
    });

    it('should create notification for todo due within 24 hours', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);

      testProject.todos = [{
        id: 'todo1',
        title: 'Due Soon Todo',
        completed: false,
        dueDate: tomorrow
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await service.triggerChecks();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'todo_due_soon',
          title: 'Todo Due Soon',
          message: expect.stringContaining('Due Soon Todo')
        })
      );
    });

    it('should skip completed todos', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      testProject.todos = [{
        id: 'todo1',
        title: 'Completed Todo',
        completed: true,
        dueDate: yesterday
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await service.triggerChecks();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).not.toHaveBeenCalled();
    });

    it('should skip todos without due dates', async () => {
      testProject.todos = [{
        id: 'todo1',
        title: 'No Due Date',
        completed: false
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await service.triggerChecks();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).not.toHaveBeenCalled();
    });

    it('should not create duplicate notifications for same todo', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      testProject.todos = [{
        id: 'todo1',
        title: 'Overdue Todo',
        completed: false,
        dueDate: yesterday
      }];
      await testProject.save();

      // Create existing notification
      await Notification.create({
        userId: testUser._id,
        type: 'todo_overdue',
        title: 'Todo Overdue',
        message: 'Already notified',
        relatedTodoId: 'todo1',
        createdAt: new Date()
      });

      const service = ReminderService.getInstance();
      await service.triggerChecks();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).not.toHaveBeenCalled();
    });

    it('should send notification to assigned user instead of owner', async () => {
      const assignedUser = await User.create({
        email: 'assigned@example.com',
        password: 'Password123!',
        firstName: 'Assigned',
        lastName: 'User',
        username: 'assigned',
        planTier: 'free',
        isEmailVerified: true
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      testProject.todos = [{
        id: 'todo1',
        title: 'Assigned Todo',
        completed: false,
        dueDate: yesterday,
        assignedTo: assignedUser._id
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await service.triggerChecks();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).toHaveBeenCalled();
      const call = (mockService.createNotification as jest.Mock).mock.calls[0][0];
      // Should notify assigned user, not owner
      const userId = call.userId._id || call.userId;
      expect(userId.toString()).toBe(assignedUser._id.toString());
      expect(userId.toString()).not.toBe(testUser._id.toString());
    });

    it('should handle errors in checkDueTodos gracefully', async () => {
      // Mock Project.find to throw an error
      jest.spyOn(Project, 'find').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const service = ReminderService.getInstance();

      // Should not throw
      await expect(service.triggerChecks()).resolves.not.toThrow();

      jest.restoreAllMocks();
    });
  });

  describe('checkReminderNotifications', () => {
    it('should send notification when reminder date is within window', async () => {
      const reminderTime = new Date();
      reminderTime.setMinutes(reminderTime.getMinutes() + 10); // 10 minutes from now

      testProject.todos = [{
        id: 'todo1',
        title: 'Reminder Todo',
        completed: false,
        reminderDate: reminderTime
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await service.triggerChecks();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'todo_due_soon',
          title: 'Todo Reminder',
          message: expect.stringContaining('Reminder Todo')
        })
      );
    });

    it('should not send reminder for past reminder dates outside window', async () => {
      const pastReminder = new Date();
      pastReminder.setMinutes(pastReminder.getMinutes() - 30); // 30 minutes ago

      testProject.todos = [{
        id: 'todo1',
        title: 'Past Reminder',
        completed: false,
        reminderDate: pastReminder
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await service.triggerChecks();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).not.toHaveBeenCalled();
    });

    it('should not send reminder for completed todos', async () => {
      const reminderTime = new Date();
      reminderTime.setMinutes(reminderTime.getMinutes() + 10);

      testProject.todos = [{
        id: 'todo1',
        title: 'Completed Reminder',
        completed: true,
        reminderDate: reminderTime
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await service.triggerChecks();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).not.toHaveBeenCalled();
    });

    it('should send notification when dueDate is within reminder window', async () => {
      const dueTime = new Date();
      dueTime.setMinutes(dueTime.getMinutes() + 10); // 10 minutes from now

      testProject.todos = [{
        id: 'todo2',
        title: 'Due Soon Via DueDate',
        completed: false,
        dueDate: dueTime
        // No reminderDate, just dueDate
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await service.triggerChecks();

      const mockService = NotificationService.getInstance();

      // Should have been called twice: once for due within 24h, once for reminder window
      expect(mockService.createNotification).toHaveBeenCalled();

      // Check that at least one call has the reminder message
      const calls = (mockService.createNotification as jest.Mock).mock.calls;
      const hasReminderCall = calls.some((call: any) =>
        call[0].title === 'Todo Due Soon' && call[0].message.includes('due soon')
      );
      expect(hasReminderCall).toBe(true);
    });

    it('should handle errors in checkReminderNotifications gracefully', async () => {
      // Save original implementation
      const originalFind = Project.find.bind(Project);

      // Mock to throw error on second call
      let callCount = 0;
      jest.spyOn(Project, 'find').mockImplementation((() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Database error in reminder check');
        }
        return originalFind({});
      }) as any);

      const service = ReminderService.getInstance();

      // Should not throw
      await expect(service.triggerChecks()).resolves.not.toThrow();

      jest.restoreAllMocks();
    });
  });

  describe('sendDailySummary', () => {
    it('should send daily summary with overdue todos', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      testProject.todos = [{
        id: 'todo1',
        title: 'Overdue Todo',
        completed: false,
        dueDate: yesterday
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      // Access private method through a workaround
      await (service as any).sendDailySummary();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'daily_todo_summary',
          title: 'Daily Todo Summary',
          message: expect.stringContaining('overdue')
        })
      );
    });

    it('should send daily summary with todos due today', async () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      testProject.todos = [{
        id: 'todo1',
        title: 'Due Today',
        completed: false,
        dueDate: today
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await (service as any).sendDailySummary();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'daily_todo_summary',
          message: expect.stringContaining('due today')
        })
      );
    });

    it('should not send summary when no actionable todos', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      testProject.todos = [{
        id: 'todo1',
        title: 'Future Todo',
        completed: false,
        dueDate: nextWeek
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await (service as any).sendDailySummary();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).not.toHaveBeenCalled();
    });

    it('should skip completed todos in summary', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      testProject.todos = [{
        id: 'todo1',
        title: 'Completed Overdue',
        completed: true,
        dueDate: yesterday
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await (service as any).sendDailySummary();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).not.toHaveBeenCalled();
    });

    it('should include metadata in daily summary', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      testProject.todos = [
        {
          id: 'todo1',
          title: 'Overdue Todo',
          completed: false,
          dueDate: yesterday
        },
        {
          id: 'todo2',
          title: 'Due Today',
          completed: false,
          dueDate: today
        }
      ];
      await testProject.save();

      const service = ReminderService.getInstance();
      await (service as any).sendDailySummary();

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            totalCount: 2,
            overdueTodos: expect.arrayContaining([
              expect.objectContaining({ title: 'Overdue Todo' })
            ]),
            dueTodayTodos: expect.arrayContaining([
              expect.objectContaining({ title: 'Due Today' })
            ])
          })
        })
      );
    });

    it('should handle plural correctly in summary message', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      testProject.todos = [{
        id: 'todo1',
        title: 'Single Overdue',
        completed: false,
        dueDate: yesterday
      }];
      await testProject.save();

      const service = ReminderService.getInstance();
      await (service as any).sendDailySummary();

      const mockService = NotificationService.getInstance();
      const call = (mockService.createNotification as jest.Mock).mock.calls[0][0];
      expect(call.message).toContain('1 overdue todo');
      expect(call.message).not.toContain('1 overdue todos');
    });

    it('should handle errors in sendDailySummary gracefully', async () => {
      // Mock User.find to throw an error
      jest.spyOn(User, 'find').mockImplementationOnce(() => {
        throw new Error('Database error in summary');
      });

      const service = ReminderService.getInstance();

      // Should not throw
      await expect((service as any).sendDailySummary()).resolves.not.toThrow();

      jest.restoreAllMocks();
    });
  });

  describe('checkStaleItems', () => {
    it('should call staleItemService.checkAllUsers', async () => {
      const service = ReminderService.getInstance();
      await service.triggerStaleItemsCheck();

      expect(staleItemService.checkAllUsers).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (staleItemService.checkAllUsers as jest.Mock).mockRejectedValue(new Error('Test error'));

      const service = ReminderService.getInstance();

      // Should not throw
      await expect(service.triggerStaleItemsCheck()).resolves.not.toThrow();
    });
  });

  describe('stop', () => {
    it('should mark service as not initialized', () => {
      const service = ReminderService.getInstance();
      service.initialize();
      service.stop();

      // Verify we can initialize again
      const cron = require('node-cron');
      const callsBefore = cron.schedule.mock.calls.length;
      service.initialize();
      expect(cron.schedule.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
