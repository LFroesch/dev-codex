import { UtilityHandlers } from '../../services/handlers/UtilityHandlers';
import { CommandParser } from '../../services/commandParser';
import { ResponseType } from '../../services/types';
import { User } from '../../models/User';
import { Project } from '../../models/Project';
import { NewsPost } from '../../models/NewsPost';
import Notification from '../../models/Notification';
import staleItemService from '../../services/staleItemService';
import NotificationService from '../../services/notificationService';

describe('UtilityHandlers', () => {
  let handler: UtilityHandlers;
  let mockUser: any;
  let mockProject: any;

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await NewsPost.deleteMany({});
    await Notification.deleteMany({});

    mockUser = await User.create({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      planTier: 'free',
      isEmailVerified: true,
      theme: 'dracula'
    });

    mockProject = await Project.create({
      name: 'Test Project',
      description: 'Test Description',
      userId: mockUser._id,
      ownerId: mockUser._id,
      category: 'web',
      todos: [],
      notes: [],
      devLog: [],
      stack: [],
      features: []
    });

    handler = new UtilityHandlers(mockUser._id.toString());
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await NewsPost.deleteMany({});
    await Notification.deleteMany({});
  });

  describe('handleHelp', () => {
    it('should return general help when no args provided', () => {
      const parsed = CommandParser.parse('/help');
      const result = handler.handleHelp(parsed);

      expect(result.type).toBe(ResponseType.INFO);
      expect(result.message).toContain('Available Commands');
      expect(result.data).toBeDefined();
    });

    it('should return specific command help for valid command', () => {
      const parsed = CommandParser.parse('/help add');
      const result = handler.handleHelp(parsed);

      expect(result.type).toBe(ResponseType.INFO);
      expect(result.message).toContain('Help for');
      expect(result.data).toBeDefined();
      expect(result.data.syntax).toBeDefined();
      expect(result.data.description).toBeDefined();
    });

    it('should return error for unknown command', () => {
      const parsed = CommandParser.parse('/help unknowncommand');
      const result = handler.handleHelp(parsed);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
      expect(result.suggestions).toContain('/help');
    });

    it('should handle multi-word command help', () => {
      const parsed = CommandParser.parse('/help add todo');
      const result = handler.handleHelp(parsed);

      expect(result.type).toBe(ResponseType.INFO);
    });
  });

  describe('handleSwapProject', () => {
    it('should prompt for project selection when no project mentioned', async () => {
      const parsed = CommandParser.parse('/swap');
      const result = await handler.handleSwapProject(parsed);

      expect(result.type).toBe(ResponseType.PROMPT);
      expect(result.message).toContain('Select a project');
      expect(result.data.projects).toBeDefined();
      expect(Array.isArray(result.data.projects)).toBe(true);
    });

    it('should switch to specified project', async () => {
      const parsed = CommandParser.parse(`/swap @${mockProject.name}`);
      const result = await handler.handleSwapProject(parsed);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(result.message).toContain('Switched to');
      expect(result.message).toContain(mockProject.name);
      expect(result.data.project).toBeDefined();
      expect(result.data.project.id).toBe(mockProject._id.toString());
      expect(result.metadata?.projectId).toBe(mockProject._id.toString());
    });

    it('should return error for non-existent project', async () => {
      const parsed = CommandParser.parse('/swap @NonExistentProject');
      const result = await handler.handleSwapProject(parsed);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
      expect(result.suggestions).toBeDefined();
    });

    it('should provide suggestions for similar project names', async () => {
      await Project.create({
        name: 'Test API Project',
        userId: mockUser._id,
        ownerId: mockUser._id,
        category: 'api',
        description: 'A test API project'
      });

      const parsed = CommandParser.parse('/swap @nonexistent');
      const result = await handler.handleSwapProject(parsed);

      expect(result.type).toBeDefined();
    });

    it('should handle case-insensitive project names', async () => {
      const parsed = CommandParser.parse(`/swap @${mockProject.name.toUpperCase()}`);
      const result = await handler.handleSwapProject(parsed);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(result.data.project.id).toBe(mockProject._id.toString());
    });
  });

  describe('handleExport', () => {
    it('should prepare export for specified project', async () => {
      const parsed = CommandParser.parse(`/export @${mockProject.name}`);
      const result = await handler.handleExport(parsed, mockProject._id.toString());

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(result.message).toContain('Preparing export');
      expect(result.data.exportUrl).toBeDefined();
      expect(result.data.exportUrl).toContain(`/api/projects/${mockProject._id}/export`);
      expect(result.data.projectName).toBe(mockProject.name);
    });

    it('should export current project when no project mentioned', async () => {
      const parsed = CommandParser.parse('/export');
      const result = await handler.handleExport(parsed, mockProject._id.toString());

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(result.data.exportUrl).toContain(mockProject._id.toString());
    });

    it('should handle no project context and no mention', async () => {
      const parsed = CommandParser.parse('/export');
      const result = await handler.handleExport(parsed);

      expect(result.type).toBeDefined();
    });
  });

  describe('handleSummary', () => {
    it('should generate markdown summary by default', async () => {
      const parsed = CommandParser.parse('/summary');
      const result = await handler.handleSummary(parsed, mockProject._id.toString());

      expect(result.type).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should generate JSON summary when specified', async () => {
      const parsed = CommandParser.parse('/summary json');
      const result = await handler.handleSummary(parsed, mockProject._id.toString());

      expect(result.type).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should generate text summary when specified', async () => {
      const parsed = CommandParser.parse('/summary text');
      const result = await handler.handleSummary(parsed, mockProject._id.toString());

      expect(result.type).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should generate prompt format summary', async () => {
      const parsed = CommandParser.parse('/summary prompt');
      const result = await handler.handleSummary(parsed, mockProject._id.toString());

      expect(result.type).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should return error for invalid format', async () => {
      const parsed = CommandParser.parse('/summary invalid');
      const result = await handler.handleSummary(parsed, mockProject._id.toString());

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('Invalid format');
      expect(result.suggestions).toContain('/help summary');
    });

    it('should filter summary by entity type', async () => {
      const parsed = CommandParser.parse('/summary markdown todos');
      const result = await handler.handleSummary(parsed, mockProject._id.toString());

      expect(result.type).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });

  describe('handleViewNews', () => {
    it('should return news posts', async () => {
      const result = await handler.handleViewNews();

      expect(result.type).toBe(ResponseType.INFO);
      expect(result.message).toContain('news');
    });

    it('should return news posts sorted by date', async () => {
      await NewsPost.create({
        title: 'News 1',
        content: 'Content 1',
        type: 'announcement',
        authorId: mockUser._id.toString(),
        isPublished: true,
        publishedAt: new Date('2025-01-01')
      });

      await NewsPost.create({
        title: 'News 2',
        content: 'Content 2',
        type: 'news',
        authorId: mockUser._id.toString(),
        isPublished: true,
        publishedAt: new Date('2025-01-02')
      });

      const result = await handler.handleViewNews();

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data).toBeDefined();
    });

    it('should limit news posts to specified amount', async () => {
      for (let i = 0; i < 15; i++) {
        await NewsPost.create({
          title: `News ${i}`,
          content: `Content ${i}`,
          type: 'announcement',
          authorId: mockUser._id.toString(),
          isPublished: true,
          publishedAt: new Date()
        });
      }

      const result = await handler.handleViewNews();

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data).toBeDefined();
    });
  });

  describe('handleSetTheme', () => {
    it('should set theme to light', async () => {
      const parsed = CommandParser.parse('/set theme light');
      const result = await handler.handleSetTheme(parsed);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(result.message).toContain('light');

      const user = await User.findById(mockUser._id);
      expect(user?.theme).toBe('light');
    });

    it('should set theme to dracula', async () => {
      const parsed = CommandParser.parse('/set theme dracula');
      const result = await handler.handleSetTheme(parsed);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(result.message).toContain('dracula');

      const user = await User.findById(mockUser._id);
      expect(user?.theme).toBe('dracula');
    });

    it('should handle invalid theme', async () => {
      const parsed = CommandParser.parse('/set theme invalid');
      const result = await handler.handleSetTheme(parsed);

      expect(result.type).toBeDefined();
    });

    it('should handle no theme specified', async () => {
      const parsed = CommandParser.parse('/set theme');
      const result = await handler.handleSetTheme(parsed);

      expect(result.type).toBeDefined();
    });
  });

  describe('handleViewThemes', () => {
    it('should return list of available themes', async () => {
      const result = await handler.handleViewThemes();

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.message).toContain('themes');
      expect(result.data).toBeDefined();
    });

    it('should include current theme in response', async () => {
      const result = await handler.handleViewThemes();

      expect(result.data).toBeDefined();
    });

    it('should include theme details', async () => {
      const result = await handler.handleViewThemes();

      expect(result.data).toBeDefined();
    });
  });

  describe('handleViewNotifications', () => {
    it('should return notifications list', async () => {
      const parsed = CommandParser.parse('/notifications');
      const result = await handler.handleViewNotifications(parsed);

      expect(result.type).toBe(ResponseType.INFO);
      expect(result.message).toContain('notifications');
      expect(result.data).toBeDefined();
    });

    it('should return unread notifications', async () => {
      await Notification.create({
        userId: mockUser._id,
        type: 'admin_message',
        title: 'Test Notification',
        message: 'Test message',
        isRead: false,
        planTier: 'free',
        importance: 'standard'
      });

      await Notification.create({
        userId: mockUser._id,
        type: 'project_shared',
        title: 'Read Notification',
        message: 'Already read',
        isRead: true,
        planTier: 'free',
        importance: 'standard'
      });

      const parsed = CommandParser.parse('/notifications');
      const result = await handler.handleViewNotifications(parsed);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data).toBeDefined();
    });

    it('should filter notifications by type', async () => {
      await Notification.create({
        userId: mockUser._id,
        type: 'admin_message',
        title: 'Info Notification',
        message: 'Info message',
        isRead: false,
        planTier: 'free',
        importance: 'standard'
      });

      await Notification.create({
        userId: mockUser._id,
        type: 'todo_overdue',
        title: 'Error Notification',
        message: 'Error message',
        isRead: false,
        planTier: 'free',
        importance: 'standard'
      });

      const parsed = CommandParser.parse('/notifications --type=admin_message');
      const result = await handler.handleViewNotifications(parsed);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data).toBeDefined();
    });
  });

  describe('handleClearNotifications', () => {
    it('should mark all notifications as read', async () => {
      await Notification.create({
        userId: mockUser._id,
        type: 'admin_message',
        title: 'Notification 1',
        message: 'Message 1',
        isRead: false,
        planTier: 'free',
        importance: 'standard'
      });

      await Notification.create({
        userId: mockUser._id,
        type: 'admin_message',
        title: 'Notification 2',
        message: 'Message 2',
        isRead: false,
        planTier: 'free',
        importance: 'standard'
      });

      const result = await handler.handleClearNotifications();

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(result.message).toBeDefined();
    });

    it('should return success when no notifications to clear', async () => {
      const result = await handler.handleClearNotifications();

      expect(result.type).toBe(ResponseType.INFO);
      expect(result.message).toBeDefined();
    });
  });

  describe('handleStaleItems', () => {
    it('should check for stale items in project', async () => {
      const parsed = CommandParser.parse('/stale');
      const result = await handler.handleStaleItems(parsed, mockProject._id.toString());

      expect(result.type).toBe(ResponseType.INFO);
      expect(result.message).toContain('stale');
      expect(result.data).toBeDefined();
    });

    it('should handle no project context', async () => {
      const parsed = CommandParser.parse('/stale');
      const result = await handler.handleStaleItems(parsed);

      expect(result.type).toBeDefined();
    });

    it('should detect stale todos', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days old

      mockProject.todos.push({
        id: 'todo1',
        title: 'Old todo',
        text: 'Old todo',
        done: false,
        createdAt: oldDate,
        updatedAt: oldDate
      });
      await mockProject.save();

      const parsed = CommandParser.parse('/stale');
      const result = await handler.handleStaleItems(parsed, mockProject._id.toString());

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data).toBeDefined();
    });
  });

  describe('handleActivityLog', () => {
    it('should return activity log for project', async () => {
      const parsed = CommandParser.parse('/activity');
      const result = await handler.handleActivityLog(parsed, mockProject._id.toString());

      expect(result.type).toBe(ResponseType.INFO);
      expect(result.message).toContain('activity');
    });

    it('should handle no project context', async () => {
      const parsed = CommandParser.parse('/activity');
      const result = await handler.handleActivityLog(parsed);

      expect(result.type).toBeDefined();
    });

    it('should limit activity log entries', async () => {
      const parsed = CommandParser.parse('/activity --limit=5');
      const result = await handler.handleActivityLog(parsed, mockProject._id.toString());

      expect(result.type).toBe(ResponseType.INFO);
    });
  });

  describe('handleLLMContext', () => {
    it('should return project context for LLM', async () => {
      const parsed = CommandParser.parse('/llm');
      const result = await handler.handleLLMContext(parsed, mockProject._id.toString());

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data).toBeDefined();
    });

    it('should include project details in context', async () => {
      mockProject.todos.push({
        id: 'todo1',
        title: 'Test todo',
        text: 'Test todo',
        done: false
      });
      mockProject.notes.push({
        id: 'note1',
        title: 'Test note',
        content: 'Note content'
      });
      await mockProject.save();

      const parsed = CommandParser.parse('/llm');
      const result = await handler.handleLLMContext(parsed, mockProject._id.toString());

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data).toBeDefined();
    });

    it('should handle no project context', async () => {
      const parsed = CommandParser.parse('/llm');
      const result = await handler.handleLLMContext(parsed);

      expect(result.type).toBeDefined();
    });
  });

  describe('handleWizard', () => {
    it('should return list of available wizards', async () => {
      const parsed = CommandParser.parse('/wizard');
      const result = await handler.handleWizard(parsed);

      expect(result.type).toBe(ResponseType.INFO);
      expect(result.message).toContain('wizard');
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('handleInfo', () => {
    it('should return project information', async () => {
      const parsed = CommandParser.parse('/info');
      const result = await handler.handleInfo(parsed, mockProject._id.toString());

      expect(result.type).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should include project statistics', async () => {
      mockProject.todos.push({
        id: 'todo1',
        title: 'Todo 1',
        text: 'Todo 1',
        done: false
      });
      mockProject.todos.push({
        id: 'todo2',
        title: 'Todo 2',
        text: 'Todo 2',
        done: true
      });
      mockProject.notes.push({
        id: 'note1',
        title: 'Note 1',
        content: 'Content'
      });
      await mockProject.save();

      const parsed = CommandParser.parse('/info');
      const result = await handler.handleInfo(parsed, mockProject._id.toString());

      expect(result.type).toBeDefined();
      expect(result.data).toBeDefined();
    });
  });
});
