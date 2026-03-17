import { FeatureHandlers } from '../../services/handlers/crud/FeatureHandlers';
import { ParsedCommand, CommandType } from '../../services/commandParser';
import { ResponseType } from '../../services/types';
import { Project } from '../../models/Project';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../models/Project');
jest.mock('../../services/ProjectCache');
jest.mock('../../config/logger');
jest.mock('../../services/activityLogger');

describe('FeatureHandlers', () => {
  let handler: FeatureHandlers;
  const userId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();

  const mockProject: any = {
    _id: new mongoose.Types.ObjectId(projectId),
    name: 'Test Project',
    userId: new mongoose.Types.ObjectId(userId),
    features: [],
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new FeatureHandlers(userId);
    mockProject.features = [];
  });

  describe('handleAddFeature', () => {
    it('should trigger wizard when no args or flags', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_FEATURE,
        command: 'add',
        raw: '/add feature',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddFeature(parsed, projectId);

      expect(result.type).toBe(ResponseType.PROMPT);
      expect(result.data.wizardType).toBe('add_feature');
      expect(result.data.typesByCategory).toBeDefined();
    });

    it('should add a feature with all fields', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_FEATURE,
        command: 'add',
        raw: '/add feature',
        args: [],
        flags: {
          group: 'Auth',
          category: 'backend',
          type: 'service',
          title: 'LoginService',
          content: 'Handles user authentication'
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddFeature(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.features).toHaveLength(1);
      expect(mockProject.features[0].group).toBe('Auth');
      expect(mockProject.features[0].category).toBe('backend');
      expect(mockProject.features[0].type).toBe('service');
      expect(mockProject.features[0].title).toBe('LoginService');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should reject old separator syntax', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_FEATURE,
        command: 'add',
        raw: '/add feature',
        args: ['Auth', '-', 'backend', 'service'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddFeature(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('flag-based syntax');
    });

    it('should validate required fields', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_FEATURE,
        command: 'add',
        raw: '/add feature',
        args: [],
        flags: {
          group: 'Auth',
          // Missing category, type, title, content
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddFeature(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('required');
    });

    it('should add frontend feature', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_FEATURE,
        command: 'add',
        raw: '/add feature',
        args: [],
        flags: {
          group: 'Dashboard',
          category: 'frontend',
          type: 'component',
          title: 'UserCard',
          content: 'Displays user info'
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddFeature(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.features[0].category).toBe('frontend');
      expect(mockProject.features[0].type).toBe('component');
    });
  });

  describe('handleViewFeatures', () => {
    beforeEach(() => {
      mockProject.features = [
        {
          id: '1',
          group: 'Auth',
          category: 'backend',
          type: 'service',
          title: 'LoginService',
          content: 'Auth logic',
          createdAt: new Date()
        },
        {
          id: '2',
          group: 'Dashboard',
          category: 'frontend',
          type: 'component',
          title: 'UserCard',
          content: 'User display',
          createdAt: new Date()
        },
        {
          id: '3',
          group: 'Auth',
          category: 'backend',
          type: 'route',
          title: 'AuthRoutes',
          content: 'Auth endpoints',
          createdAt: new Date()
        }
      ];
    });

    it('should view all features', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_FEATURES,
        command: 'view',
        raw: '/view features',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewFeatures(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.features.length).toBe(3);
    });

    it('should return all features grouped by group', async () => {
      mockProject.features = [
        { id: '1', title: 'LoginService', type: 'service', group: 'Auth', createdAt: new Date() },
        { id: '2', title: 'UserCard', type: 'component', group: 'Dashboard', createdAt: new Date() },
        { id: '3', title: 'AuthRoutes', type: 'route', group: 'Auth', createdAt: new Date() }
      ];

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_FEATURES,
        command: 'view',
        raw: '/view features',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewFeatures(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.features).toHaveLength(3);
      expect(result.data.structure).toBeDefined();
      expect(result.data.structure['Auth']).toHaveLength(2);
      expect(result.data.structure['Dashboard']).toHaveLength(1);
    });
  });

  describe('handleEditFeature', () => {
    beforeEach(() => {
      mockProject.features = [
        {
          id: '1',
          group: 'Auth',
          category: 'backend',
          type: 'service',
          title: 'LoginService',
          content: 'Original content'
        }
      ];
    });

    it('should edit feature title', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_FEATURE,
        command: 'edit',
        raw: '/edit feature',
        args: ['1'],
        flags: { title: 'AuthService' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditFeature(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.features[0].title).toBe('AuthService');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should edit feature content', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_FEATURE,
        command: 'edit',
        raw: '/edit feature',
        args: ['1'],
        flags: { content: 'Updated content' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditFeature(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.features[0].content).toBe('Updated content');
    });

    it('should edit multiple fields at once', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_FEATURE,
        command: 'edit',
        raw: '/edit feature',
        args: ['1'],
        flags: {
          title: 'NewTitle',
          content: 'New content',
          type: 'controller'
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditFeature(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.features[0].title).toBe('NewTitle');
      expect(mockProject.features[0].content).toBe('New content');
      expect(mockProject.features[0].type).toBe('controller');
    });

    it('should return error when feature not found', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_FEATURE,
        command: 'edit',
        raw: '/edit feature',
        args: ['999'],
        flags: { title: 'NewTitle' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditFeature(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
    });
  });

  describe('handleDeleteFeature', () => {
    beforeEach(() => {
      mockProject.features = [
        { id: '1', group: 'Auth', title: 'Feature 1' },
        { id: '2', group: 'Dashboard', title: 'Feature 2' }
      ];
    });

    it('should delete a feature with confirmation', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_FEATURE,
        command: 'delete',
        raw: '/delete feature',
        args: ['1'],
        flags: { confirm: true },
        isValid: true,
        errors: []
      };

      const result = await handler.handleDeleteFeature(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.features).toHaveLength(1);
      expect(mockProject.features[0].id).toBe('2');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should return error when deleting non-existent feature', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_FEATURE,
        command: 'delete',
        raw: '/delete feature',
        args: ['999'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleDeleteFeature(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
    });
  });
});
