import { RelationshipHandlers } from '../../services/handlers/crud/RelationshipHandlers';
import { ParsedCommand, CommandType } from '../../services/commandParser';
import { ResponseType } from '../../services/types';
import { Project } from '../../models/Project';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../models/Project');
jest.mock('../../services/ProjectCache');
jest.mock('../../config/logger');
jest.mock('../../services/activityLogger');

describe('RelationshipHandlers', () => {
  let handler: RelationshipHandlers;
  const userId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();

  const mockProject: any = {
    _id: new mongoose.Types.ObjectId(projectId),
    name: 'Test Project',
    userId: new mongoose.Types.ObjectId(userId),
    components: [
      { id: 'comp1', title: 'Login', category: 'frontend' },
      { id: 'comp2', title: 'AuthService', category: 'backend' }
    ],
    relationships: [],
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new RelationshipHandlers(userId);
    mockProject.relationships = [];
  });

  describe('handleAddRelationship', () => {
    it('should trigger wizard when no args or flags', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_RELATIONSHIP,
        command: 'add',
        raw: '/add relationship',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddRelationship(parsed, projectId);

      expect(result.type).toBe(ResponseType.PROMPT);
      expect(result.data.wizardType).toBe('add_relationship');
    });

    it('should add a relationship with all fields', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_RELATIONSHIP,
        command: 'add',
        raw: '/add relationship',
        args: [],
        flags: {
          source: 'comp1',
          target: 'comp2',
          type: 'uses',
          description: 'Login uses AuthService for authentication'
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddRelationship(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.relationships).toHaveLength(1);
      expect(mockProject.relationships[0].source).toBe('comp1');
      expect(mockProject.relationships[0].target).toBe('comp2');
      expect(mockProject.relationships[0].type).toBe('uses');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should reject old args syntax', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_RELATIONSHIP,
        command: 'add',
        raw: '/add relationship',
        args: ['comp1', 'comp2', 'uses'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddRelationship(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('flag-based syntax');
    });

    it('should validate required fields', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_RELATIONSHIP,
        command: 'add',
        raw: '/add relationship',
        args: [],
        flags: {
          source: 'comp1',
          // Missing target and type
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddRelationship(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('required');
    });

    it('should support different relationship types', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const types = ['implements', 'extends', 'depends_on', 'calls'];

      for (const type of types) {
        mockProject.relationships = [];

        const parsed: ParsedCommand = {
          type: CommandType.ADD_RELATIONSHIP,
          command: 'add',
          raw: '/add relationship',
          args: [],
          flags: {
            source: 'comp1',
            target: 'comp2',
            type: type
          },
          isValid: true,
          errors: []
        };

        const result = await handler.handleAddRelationship(parsed, projectId);

        expect(result.type).toBe(ResponseType.SUCCESS);
        expect(mockProject.relationships[0].type).toBe(type);
      }
    });
  });

  describe('handleViewRelationships', () => {
    beforeEach(() => {
      mockProject.relationships = [
        {
          id: '1',
          source: 'comp1',
          target: 'comp2',
          type: 'uses',
          description: 'Uses for auth',
          createdAt: new Date()
        },
        {
          id: '2',
          source: 'comp2',
          target: 'comp1',
          type: 'calls',
          description: 'Calls back',
          createdAt: new Date()
        }
      ];
    });

    it('should view all relationships', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_RELATIONSHIPS,
        command: 'view',
        raw: '/view relationships',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewRelationships(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.relationships.length).toBe(2);
    });

    it('should filter by relationship type', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_RELATIONSHIPS,
        command: 'view',
        raw: '/view relationships',
        args: [],
        flags: { type: 'uses' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewRelationships(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.relationships).toHaveLength(1);
      expect(result.data.relationships[0].type).toBe('uses');
    });
  });

  describe('handleEditRelationship', () => {
    beforeEach(() => {
      mockProject.relationships = [
        {
          id: '1',
          source: 'comp1',
          target: 'comp2',
          type: 'uses',
          description: 'Original description'
        }
      ];
    });

    it('should edit relationship description', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_RELATIONSHIP,
        command: 'edit',
        raw: '/edit relationship',
        args: ['1'],
        flags: { description: 'Updated description' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditRelationship(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.relationships[0].description).toBe('Updated description');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should edit relationship type', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_RELATIONSHIP,
        command: 'edit',
        raw: '/edit relationship',
        args: ['1'],
        flags: { type: 'implements' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditRelationship(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.relationships[0].type).toBe('implements');
    });

    it('should return error when relationship not found', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_RELATIONSHIP,
        command: 'edit',
        raw: '/edit relationship',
        args: ['999'],
        flags: { description: 'New desc' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditRelationship(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
    });
  });

  describe('handleDeleteRelationship', () => {
    beforeEach(() => {
      mockProject.relationships = [
        { id: '1', source: 'comp1', target: 'comp2', type: 'uses' },
        { id: '2', source: 'comp2', target: 'comp1', type: 'calls' }
      ];
    });

    it('should delete a relationship with confirmation', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_RELATIONSHIP,
        command: 'delete',
        raw: '/delete relationship',
        args: ['1'],
        flags: { confirm: true },
        isValid: true,
        errors: []
      };

      const result = await handler.handleDeleteRelationship(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.relationships).toHaveLength(1);
      expect(mockProject.relationships[0].id).toBe('2');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should return error when deleting non-existent relationship', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_RELATIONSHIP,
        command: 'delete',
        raw: '/delete relationship',
        args: ['999'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleDeleteRelationship(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
    });
  });
});
