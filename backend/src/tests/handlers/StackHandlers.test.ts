import { StackHandlers } from '../../services/handlers/StackHandlers';
import { ParsedCommand, CommandType } from '../../services/commandParser';
import { ResponseType } from '../../services/types';
import { Project } from '../../models/Project';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../models/Project');
jest.mock('../../services/ProjectCache');
jest.mock('../../config/logger');
jest.mock('../../services/activityLogger');

describe('StackHandlers', () => {
  let handler: StackHandlers;
  const userId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();

  const mockProject: any = {
    _id: new mongoose.Types.ObjectId(projectId),
    name: 'Test Project',
    userId: new mongoose.Types.ObjectId(userId),
    stack: [],
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new StackHandlers(userId);
    mockProject.stack = [];
  });

  describe('handleAddStack', () => {
    it('should trigger wizard when no args or flags', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_STACK,
        command: 'add',
        raw: '/add stack',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddStack(parsed, projectId);

      expect(result.type).toBe(ResponseType.PROMPT);
      expect(result.data.wizardType).toBe('add_stack');
    });

    it('should add stack item with all fields', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_STACK,
        command: 'add',
        raw: '/add stack',
        args: [],
        flags: {
          name: 'React',
          category: 'framework',
          version: '18.2.0',
          description: 'UI library'
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddStack(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.stack).toHaveLength(1);
      expect(mockProject.stack[0].name).toBe('React');
      expect(mockProject.stack[0].category).toBe('framework');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should reject old args syntax', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_STACK,
        command: 'add',
        raw: '/add stack',
        args: ['React', 'framework'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddStack(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('flag-based syntax');
    });

    it('should validate required name field', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_STACK,
        command: 'add',
        raw: '/add stack',
        args: [],
        flags: {
          category: 'framework',
          // Missing name
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddStack(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('name');
    });

    it('should add stack item with minimal fields', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_STACK,
        command: 'add',
        raw: '/add stack',
        args: [],
        flags: {
          name: 'Express',
          category: 'api'
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddStack(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      // Express is auto-detected and normalized to "Express.js" by lookupTech
      expect(mockProject.stack[0].name).toBe('Express.js');
    });
  });

  describe('handleViewStack', () => {
    beforeEach(() => {
      mockProject.stack = [
        { id: '1', name: 'React', category: 'framework', version: '18.2.0' },
        { id: '2', name: 'Express', category: 'api', version: '4.18.0' },
        { id: '3', name: 'MongoDB', category: 'database', version: '6.0' }
      ];
    });

    it('should view all stack items', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_STACK,
        command: 'view',
        raw: '/view stack',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewStack(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.stack.length).toBe(3);
    });

    it('should return all stack items regardless of category flag', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_STACK,
        command: 'view',
        raw: '/view stack',
        args: [],
        flags: { category: 'framework' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewStack(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      // The handler doesn't implement category filtering yet, returns all items
      expect(result.data.stack).toHaveLength(3);
    });
  });

  describe('handleRemoveStack', () => {
    beforeEach(() => {
      mockProject.stack = [
        { id: '1', name: 'React', category: 'framework' },
        { id: '2', name: 'Express', category: 'api' }
      ];
    });

    it('should remove stack item', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.REMOVE_STACK,
        command: 'remove',
        raw: '/remove stack React',
        args: ['React'], // Handler expects name, not ID
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleRemoveStack(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.stack).toHaveLength(1);
      expect(mockProject.stack[0].name).toBe('Express'); // Check by name, not ID
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should error when removing non-existent item', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.REMOVE_STACK,
        command: 'remove',
        raw: '/remove stack 999',
        args: ['999'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleRemoveStack(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
    });
  });
});
