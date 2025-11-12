import { DevLogHandlers } from '../../services/handlers/crud/DevLogHandlers';
import { ParsedCommand, CommandType } from '../../services/commandParser';
import { ResponseType } from '../../services/types';
import { Project } from '../../models/Project';
import mongoose from 'mongoose';

jest.mock('../../models/Project');
jest.mock('../../services/ProjectCache');
jest.mock('../../config/logger');
jest.mock('../../services/activityLogger');

describe('DevLogHandlers', () => {
  let handler: DevLogHandlers;
  const userId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();

  const mockProject: any = {
    _id: new mongoose.Types.ObjectId(projectId),
    name: 'Test Project',
    userId: new mongoose.Types.ObjectId(userId),
    devLog: [],
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new DevLogHandlers(userId);
    mockProject.devLog = [];
  });

  describe('handleAddDevLog', () => {
    it('should add a devlog with content', async () => {
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_DEVLOG,
        command: 'devlog',
        raw: '/devlog',
        args: [],
        flags: { title: 'Bug Fix', content: 'Fixed authentication bug' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddDevLog(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.devLog).toHaveLength(1);
      expect(mockProject.devLog[0].description).toBe('Fixed authentication bug');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should show wizard when no content provided', async () => {
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_DEVLOG,
        command: 'devlog',
        raw: '/devlog',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddDevLog(parsed, projectId);

      expect(result.type).toBe(ResponseType.PROMPT);
      expect(result.data.wizardType).toBe('add_devlog');
    });
  });

  describe('handleViewDevLog', () => {
    beforeEach(() => {
      mockProject.devLog = [
        { id: '1', description: 'Log 1', date: new Date() },
        { id: '2', description: 'Log 2', date: new Date() }
      ];
    });

    it('should view all devlogs', async () => {
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_DEVLOG,
        command: 'view',
        raw: '/view devlog',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewDevLog(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.entries).toHaveLength(2);
    });
  });

  describe('handleEditDevLog', () => {
    beforeEach(() => {
      mockProject.devLog = [
        { id: '1', description: 'Original log' }
      ];
    });

    it('should edit devlog content', async () => {
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_DEVLOG,
        command: 'edit',
        raw: '/edit devlog',
        args: ['1'],
        flags: { content: 'Updated log content' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditDevLog(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.devLog[0].description).toBe('Updated log content');
      expect(mockProject.save).toHaveBeenCalled();
    });
  });

  describe('handleDeleteDevLog', () => {
    beforeEach(() => {
      mockProject.devLog = [
        { id: '1', description: 'Log 1' },
        { id: '2', description: 'Log 2' }
      ];
    });

    it('should delete a devlog with confirmation', async () => {
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_DEVLOG,
        command: 'delete',
        raw: '/delete devlog',
        args: ['1'],
        flags: { confirm: true },
        isValid: true,
        errors: []
      };

      const result = await handler.handleDeleteDevLog(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.devLog).toHaveLength(1);
      expect(mockProject.devLog[0].id).toBe('2');
      expect(mockProject.save).toHaveBeenCalled();
    });
  });
});
