import { SettingsHandlers } from '../../services/handlers/SettingsHandlers';
import { ParsedCommand, CommandType } from '../../services/commandParser';
import { ResponseType } from '../../services/types';
import { Project } from '../../models/Project';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../models/Project');
jest.mock('../../services/ProjectCache');
jest.mock('../../config/logger');
jest.mock('../../services/activityLogger');

describe('SettingsHandlers', () => {
  let handler: SettingsHandlers;
  const userId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();

  const mockProject: any = {
    _id: new mongoose.Types.ObjectId(projectId),
    name: 'Test Project',
    description: 'Test Description',
    userId: new mongoose.Types.ObjectId(userId),
    category: 'web',
    tags: ['react', 'nodejs'],
    color: '#3498db',
    stagingEnvironment: 'development',
    isPublic: false,
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new SettingsHandlers(userId);
    mockProject.tags = ['react', 'nodejs'];
  });

  describe('handleViewSettings', () => {
    it('should view project settings', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_SETTINGS,
        command: 'view',
        raw: '/view settings',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewSettings(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.settings.name).toBe('Test Project');
      expect(result.data.settings.tags).toEqual(['react', 'nodejs']);
    });
  });

  describe('handleSetName', () => {
    it('should set project name', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.SET_NAME,
        command: 'set',
        raw: '/set name New Project Name',
        args: ['New', 'Project', 'Name'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleSetName(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should validate empty name', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.SET_NAME,
        command: 'set',
        raw: '/set name',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleSetName(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('valid');
    });
  });

  describe('handleSetDescription', () => {
    it('should set project description', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.SET_DESCRIPTION,
        command: 'set',
        raw: '/set description New description',
        args: ['New', 'description'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleSetDescription(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should validate empty description', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.SET_DESCRIPTION,
        command: 'set',
        raw: '/set description',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleSetDescription(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('required');
    });
  });

  describe('handleAddTag', () => {
    it('should add a new tag', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_TAG,
        command: 'add',
        raw: '/add tag typescript',
        args: ['typescript'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddTag(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.tags).toContain('typescript');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should prevent duplicate tags', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_TAG,
        command: 'add',
        raw: '/add tag react',
        args: ['react'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddTag(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('already exists');
    });

    it('should validate empty tag', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_TAG,
        command: 'add',
        raw: '/add tag',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddTag(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('required');
    });
  });

  describe('handleRemoveTag', () => {
    it('should remove an existing tag', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.REMOVE_TAG,
        command: 'remove',
        raw: '/remove tag react',
        args: ['react'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleRemoveTag(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.tags).not.toContain('react');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should error when removing non-existent tag', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.REMOVE_TAG,
        command: 'remove',
        raw: '/remove tag python',
        args: ['python'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleRemoveTag(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
    });
  });

  describe('handleSetPublic', () => {
    it('should set project to public', async () => {
      mockProject.isPublic = false;
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.SET_PUBLIC,
        command: 'set',
        raw: '/set public true',
        args: ['true'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleSetPublic(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.isPublic).toBe(true);
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should set project to private', async () => {
      mockProject.isPublic = true;
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.SET_PUBLIC,
        command: 'set',
        raw: '/set public false',
        args: ['false'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleSetPublic(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.isPublic).toBe(false);
      expect(mockProject.save).toHaveBeenCalled();
    });
  });
});
