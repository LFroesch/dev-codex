import { UtilityHandlers } from '../../services/handlers/UtilityHandlers';
import { CommandParser } from '../../services/commandParser';
import { User } from '../../models/User';
import { Project } from '../../models/Project';

jest.mock('../../models/User');
jest.mock('../../models/Project');
jest.mock('../../services/notificationService');

describe('UtilityHandlers', () => {
  let handler: UtilityHandlers;
  let mockUser: any;
  let mockProject: any;

  beforeEach(() => {
    mockUser = {
      _id: 'user123',
      email: 'test@test.com',
      preferences: { theme: 'dark' }
    };

    mockProject = {
      _id: 'proj123',
      name: 'Test Project',
      todos: [],
      notes: [],
      devLog: [],
      stack: [],
      save: jest.fn().mockResolvedValue(true)
    };

    handler = new UtilityHandlers(mockUser, mockProject);
  });

  describe('handleHelp', () => {
    it('should return general help', () => {
      const parsed = CommandParser.parse('/help');
      const result = handler.handleHelp(parsed);

      expect(result.type).toBe('info');
      expect(result.message).toContain('Available Commands');
    });

    it('should return specific command help', () => {
      const parsed = CommandParser.parse('/help add');
      const result = handler.handleHelp(parsed);

      expect(result.type).toBe('info');
    });
  });

  describe('handleLLMContext', () => {
    it('should return project context', () => {
      const result = handler.handleLLMContext();

      expect(result.type).toBe('info');
      expect(result.data).toBeDefined();
    });
  });
});
