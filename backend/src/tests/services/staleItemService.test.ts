import staleItemService from '../../services/staleItemService';
import { Project } from '../../models/Project';
import { User } from '../../models/User';
import TeamMember from '../../models/TeamMember';
import NotificationService from '../../services/notificationService';
import mongoose from 'mongoose';

jest.mock('../../services/notificationService');

describe('StaleItemService', () => {
  let testUser: any;
  let testProject: any;

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});

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
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    jest.clearAllMocks();
  });

  describe('findStaleItems', () => {
    it('should find stale notes older than 14 days', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 20); // 20 days ago

      testProject.notes = [{
        id: 'note1',
        title: 'Stale Note',
        content: 'Old content',
        createdAt: staleDate,
        updatedAt: staleDate
      }];
      await testProject.save();

      const result = await staleItemService.findStaleItems(testUser._id.toString());

      expect(result.staleNotes.length).toBe(1);
      expect(result.staleNotes[0].title).toBe('Stale Note');
      expect(result.staleNotes[0].daysSinceUpdate).toBeGreaterThanOrEqual(20);
      expect(result.totalCount).toBe(1);
    });

    it('should find stale todos older than 7 days without due dates', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10); // 10 days ago

      testProject.todos = [{
        id: 'todo1',
        title: 'Stale Todo',
        completed: false,
        createdAt: staleDate,
        updatedAt: staleDate
      }];
      await testProject.save();

      const result = await staleItemService.findStaleItems(testUser._id.toString());

      expect(result.staleTodos.length).toBe(1);
      expect(result.staleTodos[0].title).toBe('Stale Todo');
      expect(result.staleTodos[0].daysSinceUpdate).toBeGreaterThanOrEqual(10);
      expect(result.totalCount).toBe(1);
    });

    it('should skip completed todos', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10);

      testProject.todos = [{
        id: 'todo1',
        title: 'Completed Todo',
        completed: true,
        status: 'completed',
        createdAt: staleDate,
        updatedAt: staleDate
      }];
      await testProject.save();

      const result = await staleItemService.findStaleItems(testUser._id.toString());

      expect(result.staleTodos.length).toBe(0);
      expect(result.totalCount).toBe(0);
    });

    it('should skip todos with due dates', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      testProject.todos = [{
        id: 'todo1',
        title: 'Todo with Due Date',
        completed: false,
        dueDate: futureDate,
        createdAt: staleDate,
        updatedAt: staleDate
      }];
      await testProject.save();

      const result = await staleItemService.findStaleItems(testUser._id.toString());

      expect(result.staleTodos.length).toBe(0);
    });

    it('should skip todos with reminder dates', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      testProject.todos = [{
        id: 'todo1',
        title: 'Todo with Reminder',
        completed: false,
        reminderDate: futureDate,
        createdAt: staleDate,
        updatedAt: staleDate
      }];
      await testProject.save();

      const result = await staleItemService.findStaleItems(testUser._id.toString());

      expect(result.staleTodos.length).toBe(0);
    });

    it('should use createdAt as fallback for todos without updatedAt', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10);

      // Mongoose auto-sets updatedAt, so we need to explicitly override after save
      testProject.todos = [{
        id: 'todo1',
        title: 'Old Todo',
        completed: false,
        createdAt: staleDate
      }];
      await testProject.save();

      // Update directly in DB to remove updatedAt
      await Project.updateOne(
        { _id: testProject._id },
        { $unset: { 'todos.0.updatedAt': '' } }
      );

      const result = await staleItemService.findStaleItems(testUser._id.toString());

      expect(result.staleTodos.length).toBe(1);
    });

    it('should skip notes without updatedAt', async () => {
      testProject.notes = [{
        id: 'note1',
        title: 'Note without updatedAt',
        content: 'Content',
        createdAt: new Date()
        // No updatedAt
      }];
      await testProject.save();

      const result = await staleItemService.findStaleItems(testUser._id.toString());

      expect(result.staleNotes.length).toBe(0);
    });

    it('should skip todos without dates', async () => {
      testProject.todos = [{
        id: 'todo1',
        title: 'Todo without dates',
        completed: false
        // No createdAt or updatedAt
      }];
      await testProject.save();

      const result = await staleItemService.findStaleItems(testUser._id.toString());

      expect(result.staleTodos.length).toBe(0);
    });

    it('should not find fresh items', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days ago

      testProject.notes = [{
        id: 'note1',
        title: 'Recent Note',
        content: 'Content',
        createdAt: recentDate,
        updatedAt: recentDate
      }];
      testProject.todos = [{
        id: 'todo1',
        title: 'Recent Todo',
        completed: false,
        createdAt: recentDate,
        updatedAt: recentDate
      }];
      await testProject.save();

      const result = await staleItemService.findStaleItems(testUser._id.toString());

      expect(result.staleNotes.length).toBe(0);
      expect(result.staleTodos.length).toBe(0);
      expect(result.totalCount).toBe(0);
    });

    it('should find stale items from team member projects', async () => {
      const teamMember = await User.create({
        email: 'team@example.com',
        password: 'Password123!',
        firstName: 'Team',
        lastName: 'Member',
        username: 'teammember',
        planTier: 'free',
        isEmailVerified: true
      });

      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 20);

      // Create separate project for team collaboration test
      const teamProject = await Project.create({
        name: 'Team Project',
        description: 'Shared project',
        userId: testUser._id,
        ownerId: testUser._id,
        notes: [{
          id: 'note1',
          title: 'Team Note',
          content: 'Shared content',
          createdAt: staleDate,
          updatedAt: staleDate
        }],
        todos: []
      });

      // Create TeamMember record (separate collection)
      await TeamMember.create({
        projectId: teamProject._id,
        userId: teamMember._id,
        role: 'viewer',
        invitedBy: testUser._id,
        isActive: true
      });

      const result = await staleItemService.findStaleItems(teamMember._id.toString());

      expect(result.staleNotes.length).toBe(1);
      expect(result.staleNotes[0].title).toBe('Team Note');
      expect(result.staleNotes[0].projectName).toBe('Team Project');
    });

    it('should sort stale items by days since update (most stale first)', async () => {
      const veryStaleDate = new Date();
      veryStaleDate.setDate(veryStaleDate.getDate() - 30);
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 15);

      testProject.notes = [
        {
          id: 'note1',
          title: 'Somewhat Stale',
          content: 'Content',
          createdAt: staleDate,
          updatedAt: staleDate
        },
        {
          id: 'note2',
          title: 'Very Stale',
          content: 'Content',
          createdAt: veryStaleDate,
          updatedAt: veryStaleDate
        }
      ];
      await testProject.save();

      const result = await staleItemService.findStaleItems(testUser._id.toString());

      expect(result.staleNotes.length).toBe(2);
      expect(result.staleNotes[0].title).toBe('Very Stale');
      expect(result.staleNotes[1].title).toBe('Somewhat Stale');
    });

    it('should return empty result for user with no projects', async () => {
      const newUser = await User.create({
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        username: 'newuser',
        planTier: 'free',
        isEmailVerified: true
      });

      const result = await staleItemService.findStaleItems(newUser._id.toString());

      expect(result.staleNotes).toEqual([]);
      expect(result.staleTodos).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('notifyStaleItems', () => {
    beforeEach(() => {
      const mockNotificationService = {
        createNotification: jest.fn().mockResolvedValue(undefined)
      };
      (NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService);
    });

    it('should create notification when stale items exist', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 20);

      testProject.notes = [{
        id: 'note1',
        title: 'Stale Note',
        content: 'Content',
        createdAt: staleDate,
        updatedAt: staleDate
      }];
      await testProject.save();

      await staleItemService.notifyStaleItems(testUser._id.toString());

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser._id.toString(),
          type: 'stale_items_summary',
          title: 'Stale Items Summary',
          metadata: expect.objectContaining({
            totalCount: 1
          })
        })
      );
    });

    it('should not create notification when no stale items', async () => {
      await staleItemService.notifyStaleItems(testUser._id.toString());

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).not.toHaveBeenCalled();
    });

    it('should create notification with both notes and todos message', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 20);

      testProject.notes = [{
        id: 'note1',
        title: 'Stale Note',
        content: 'Content',
        createdAt: staleDate,
        updatedAt: staleDate
      }];
      testProject.todos = [{
        id: 'todo1',
        title: 'Stale Todo',
        completed: false,
        createdAt: staleDate,
        updatedAt: staleDate
      }];
      await testProject.save();

      await staleItemService.notifyStaleItems(testUser._id.toString());

      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('note')
        })
      );
      expect(mockService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('todo')
        })
      );
    });

    it('should handle plural correctly for single items', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 20);

      testProject.notes = [{
        id: 'note1',
        title: 'Stale Note',
        content: 'Content',
        createdAt: staleDate,
        updatedAt: staleDate
      }];
      await testProject.save();

      await staleItemService.notifyStaleItems(testUser._id.toString());

      const mockService = NotificationService.getInstance();
      const call = (mockService.createNotification as jest.Mock).mock.calls[0][0];
      expect(call.message).toContain('1 note');
      expect(call.message).not.toContain('1 notes');
    });

    it('should handle plural correctly for multiple items', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 20);

      testProject.notes = [
        {
          id: 'note1',
          title: 'Stale Note 1',
          content: 'Content',
          createdAt: staleDate,
          updatedAt: staleDate
        },
        {
          id: 'note2',
          title: 'Stale Note 2',
          content: 'Content',
          createdAt: staleDate,
          updatedAt: staleDate
        }
      ];
      await testProject.save();

      await staleItemService.notifyStaleItems(testUser._id.toString());

      const mockService = NotificationService.getInstance();
      const call = (mockService.createNotification as jest.Mock).mock.calls[0][0];
      expect(call.message).toContain('2 notes');
    });

    it('should create notification for todos only', async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 10);

      testProject.todos = [{
        id: 'todo1',
        title: 'Stale Todo',
        completed: false,
        createdAt: staleDate,
        updatedAt: staleDate
      }];
      await testProject.save();

      await staleItemService.notifyStaleItems(testUser._id.toString());

      const mockService = NotificationService.getInstance();
      const call = (mockService.createNotification as jest.Mock).mock.calls[0][0];
      expect(call.message).toContain('1 todo');
      expect(call.message).toContain("haven't been updated in 7+ days");
      expect(call.message).not.toContain('note');
    });
  });

  describe('checkAllUsers', () => {
    beforeEach(() => {
      const mockNotificationService = {
        createNotification: jest.fn().mockResolvedValue(undefined)
      };
      (NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService);
    });

    it('should check all users for stale items', async () => {
      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'Password123!',
        firstName: 'User',
        lastName: 'Two',
        username: 'user2',
        planTier: 'free',
        isEmailVerified: true
      });

      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 20);

      testProject.notes = [{
        id: 'note1',
        title: 'Stale Note',
        content: 'Content',
        createdAt: staleDate,
        updatedAt: staleDate
      }];
      await testProject.save();

      await staleItemService.checkAllUsers();

      // Should have attempted to notify both users
      const mockService = NotificationService.getInstance();
      expect(mockService.createNotification).toHaveBeenCalled();
    });

    it('should continue checking other users if one fails', async () => {
      const user2 = await User.create({
        email: 'user2@example.com',
        password: 'Password123!',
        firstName: 'User',
        lastName: 'Two',
        username: 'user2',
        planTier: 'free',
        isEmailVerified: true
      });

      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 20);

      testProject.notes = [{
        id: 'note1',
        title: 'Stale Note',
        content: 'Content',
        createdAt: staleDate,
        updatedAt: staleDate
      }];
      await testProject.save();

      // Mock to fail on first user
      const mockNotificationService = NotificationService.getInstance();
      let callCount = 0;
      (mockNotificationService.createNotification as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Failed to notify');
        }
        return Promise.resolve();
      });

      // Should not throw
      await expect(staleItemService.checkAllUsers()).resolves.not.toThrow();
    });

    it('should handle empty user list', async () => {
      await User.deleteMany({});

      await expect(staleItemService.checkAllUsers()).resolves.not.toThrow();
    });

    it('should throw error if User.find fails', async () => {
      // Mock User.find to throw an error
      jest.spyOn(User, 'find').mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      await expect(staleItemService.checkAllUsers()).rejects.toThrow('Database connection failed');

      // Restore the original implementation
      jest.restoreAllMocks();
    });
  });
});
