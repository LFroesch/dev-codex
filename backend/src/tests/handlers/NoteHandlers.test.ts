import { NoteHandlers } from '../../services/handlers/crud/NoteHandlers';
import { ParsedCommand, CommandType } from '../../services/commandParser';
import { ResponseType } from '../../services/types';
import { Project } from '../../models/Project';
import mongoose from 'mongoose';

jest.mock('../../models/Project');
jest.mock('../../services/ProjectCache');
jest.mock('../../config/logger');
jest.mock('../../services/activityLogger');

describe('NoteHandlers', () => {
  let handler: NoteHandlers;
  const userId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();

  const mockProject: any = {
    _id: new mongoose.Types.ObjectId(projectId),
    name: 'Test Project',
    userId: new mongoose.Types.ObjectId(userId),
    notes: [],
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new NoteHandlers(userId);
    mockProject.notes = [];
  });

  describe('handleAddNote', () => {
    it('should add a note with title and content', async () => {
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_NOTE,
        command: 'add',
        raw: '/add note',
        args: [],
        flags: { title: 'Meeting Notes', content: 'Discussed feature X' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddNote(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.notes).toHaveLength(1);
      expect(mockProject.notes[0].title).toBe('Meeting Notes');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should show wizard when no args or flags', async () => {
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_NOTE,
        command: 'add',
        raw: '/add note',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddNote(parsed, projectId);

      expect(result.type).toBe(ResponseType.PROMPT);
      expect(result.data.wizardType).toBe('add_note');
    });
  });

  describe('handleViewNotes', () => {
    beforeEach(() => {
      mockProject.notes = [
        { id: '1', title: 'Note 1', content: 'Content 1', createdAt: new Date() },
        { id: '2', title: 'Note 2', content: 'Content 2', createdAt: new Date() }
      ];
    });

    it('should view all notes', async () => {
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_NOTES,
        command: 'view',
        raw: '/view notes',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewNotes(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.notes).toHaveLength(2);
    });
  });

  describe('handleEditNote', () => {
    beforeEach(() => {
      mockProject.notes = [
        { id: '1', title: 'Original', content: 'Original content' }
      ];
    });

    it('should edit note title', async () => {
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_NOTE,
        command: 'edit',
        raw: '/edit note',
        args: ['1'],
        flags: { title: 'Updated Title' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditNote(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.notes[0].title).toBe('Updated Title');
      expect(mockProject.save).toHaveBeenCalled();
    });
  });

  describe('handleDeleteNote', () => {
    beforeEach(() => {
      mockProject.notes = [
        { id: '1', title: 'Note 1' },
        { id: '2', title: 'Note 2' }
      ];
    });

    it('should delete a note with confirmation', async () => {
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_NOTE,
        command: 'delete',
        raw: '/delete note',
        args: ['1'],
        flags: { confirm: true },
        isValid: true,
        errors: []
      };

      const result = await handler.handleDeleteNote(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.notes).toHaveLength(1);
      expect(mockProject.save).toHaveBeenCalled();
    });
  });
});
