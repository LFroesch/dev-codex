import { ComponentHandlers } from '../../services/handlers/crud/ComponentHandlers';
import { ParsedCommand, CommandType } from '../../services/commandParser';
import { ResponseType } from '../../services/types';
import { Project } from '../../models/Project';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../models/Project');
jest.mock('../../services/ProjectCache');
jest.mock('../../config/logger');
jest.mock('../../services/activityLogger');

describe('ComponentHandlers', () => {
  let handler: ComponentHandlers;
  const userId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();

  const mockProject: any = {
    _id: new mongoose.Types.ObjectId(projectId),
    name: 'Test Project',
    userId: new mongoose.Types.ObjectId(userId),
    components: [],
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ComponentHandlers(userId);
    mockProject.components = [];
  });

  describe('handleAddComponent', () => {
    it('should trigger wizard when no args or flags', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_COMPONENT,
        command: 'add',
        raw: '/add component',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddComponent(parsed, projectId);

      expect(result.type).toBe(ResponseType.PROMPT);
      expect(result.data.wizardType).toBe('add_component');
      expect(result.data.typesByCategory).toBeDefined();
    });

    it('should add a component with all fields', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_COMPONENT,
        command: 'add',
        raw: '/add component',
        args: [],
        flags: {
          feature: 'Auth',
          category: 'backend',
          type: 'service',
          title: 'LoginService',
          content: 'Handles user authentication'
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddComponent(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.components).toHaveLength(1);
      expect(mockProject.components[0].feature).toBe('Auth');
      expect(mockProject.components[0].category).toBe('backend');
      expect(mockProject.components[0].type).toBe('service');
      expect(mockProject.components[0].title).toBe('LoginService');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should reject old separator syntax', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_COMPONENT,
        command: 'add',
        raw: '/add component',
        args: ['Auth', '-', 'backend', 'service'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddComponent(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('flag-based syntax');
    });

    it('should validate required fields', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_COMPONENT,
        command: 'add',
        raw: '/add component',
        args: [],
        flags: {
          feature: 'Auth',
          // Missing category, type, title, content
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddComponent(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('required');
    });

    it('should add frontend component', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_COMPONENT,
        command: 'add',
        raw: '/add component',
        args: [],
        flags: {
          feature: 'Dashboard',
          category: 'frontend',
          type: 'component',
          title: 'UserCard',
          content: 'Displays user info'
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddComponent(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.components[0].category).toBe('frontend');
      expect(mockProject.components[0].type).toBe('component');
    });
  });

  describe('handleViewComponents', () => {
    beforeEach(() => {
      mockProject.components = [
        {
          id: '1',
          feature: 'Auth',
          category: 'backend',
          type: 'service',
          title: 'LoginService',
          content: 'Auth logic',
          createdAt: new Date()
        },
        {
          id: '2',
          feature: 'Dashboard',
          category: 'frontend',
          type: 'component',
          title: 'UserCard',
          content: 'User display',
          createdAt: new Date()
        },
        {
          id: '3',
          feature: 'Auth',
          category: 'backend',
          type: 'route',
          title: 'AuthRoutes',
          content: 'Auth endpoints',
          createdAt: new Date()
        }
      ];
    });

    it('should view all components', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_COMPONENTS,
        command: 'view',
        raw: '/view components',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewComponents(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.components.length).toBe(3);
    });

    it('should filter components by feature', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_COMPONENTS,
        command: 'view',
        raw: '/view components',
        args: [],
        flags: { feature: 'Auth' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewComponents(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.components).toHaveLength(2);
      expect(result.data.components.every((c: any) => c.feature === 'Auth')).toBe(true);
    });

    it('should filter components by category', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_COMPONENTS,
        command: 'view',
        raw: '/view components',
        args: [],
        flags: { category: 'frontend' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewComponents(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.components).toHaveLength(1);
      expect(result.data.components[0].category).toBe('frontend');
    });

    it('should filter components by type', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_COMPONENTS,
        command: 'view',
        raw: '/view components',
        args: [],
        flags: { type: 'service' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewComponents(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.components).toHaveLength(1);
      expect(result.data.components[0].type).toBe('service');
    });
  });

  describe('handleEditComponent', () => {
    beforeEach(() => {
      mockProject.components = [
        {
          id: '1',
          feature: 'Auth',
          category: 'backend',
          type: 'service',
          title: 'LoginService',
          content: 'Original content'
        }
      ];
    });

    it('should edit component title', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_COMPONENT,
        command: 'edit',
        raw: '/edit component',
        args: ['1'],
        flags: { title: 'AuthService' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditComponent(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.components[0].title).toBe('AuthService');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should edit component content', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_COMPONENT,
        command: 'edit',
        raw: '/edit component',
        args: ['1'],
        flags: { content: 'Updated content' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditComponent(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.components[0].content).toBe('Updated content');
    });

    it('should edit multiple fields at once', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_COMPONENT,
        command: 'edit',
        raw: '/edit component',
        args: ['1'],
        flags: {
          title: 'NewTitle',
          content: 'New content',
          type: 'controller'
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditComponent(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.components[0].title).toBe('NewTitle');
      expect(mockProject.components[0].content).toBe('New content');
      expect(mockProject.components[0].type).toBe('controller');
    });

    it('should return error when component not found', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_COMPONENT,
        command: 'edit',
        raw: '/edit component',
        args: ['999'],
        flags: { title: 'NewTitle' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditComponent(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
    });
  });

  describe('handleDeleteComponent', () => {
    beforeEach(() => {
      mockProject.components = [
        { id: '1', feature: 'Auth', title: 'Component 1' },
        { id: '2', feature: 'Dashboard', title: 'Component 2' }
      ];
    });

    it('should delete a component with confirmation', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_COMPONENT,
        command: 'delete',
        raw: '/delete component',
        args: ['1'],
        flags: { confirm: true },
        isValid: true,
        errors: []
      };

      const result = await handler.handleDeleteComponent(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.components).toHaveLength(1);
      expect(mockProject.components[0].id).toBe('2');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should return error when deleting non-existent component', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_COMPONENT,
        command: 'delete',
        raw: '/delete component',
        args: ['999'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleDeleteComponent(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
    });
  });
});
