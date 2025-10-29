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
    devlogs: [],
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new DevLogHandlers(userId);
    mockProject.devlogs = [];
  });

  describe('handleAddDevLog', () => {
    it('should add a devlog with content', async () => {
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_DEVLOG,
        command: 'devlog',
        raw: '/devlog',
        args: [],
        flags: { content: 'Fixed authentication bug' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddDevLog(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.devlogs).toHaveLength(1);
      expect(mockProject.devlogs[0].content).toBe('Fixed authentication bug');
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
      mockProject.devlogs = [
        { id: '1', content: 'Log 1', createdAt: new Date() },
        { id: '2', content: 'Log 2', createdAt: new Date() }
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
      expect(result.data.devlogs).toHaveLength(2);
    });
  });

  describe('handleEditDevLog', () => {
    beforeEach(() => {
      mockProject.devlogs = [
        { id: '1', content: 'Original log' }
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
      expect(mockProject.devlogs[0].content).toBe('Updated log content');
      expect(mockProject.save).toHaveBeenCalled();
    });
  });

  describe('handleDeleteDevLog', () => {
    beforeEach(() => {
      mockProject.devlogs = [
        { id: '1', content: 'Log 1' },
        { id: '2', content: 'Log 2' }
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
      expect(mockProject.devlogs).toHaveLength(1);
      expect(mockProject.save).toHaveBeenCalled();
    });
  });
});
