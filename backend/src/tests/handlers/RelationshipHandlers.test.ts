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
      // Add components that the relationship will reference
      mockProject.components = [
        { id: 'comp1', title: 'Login', type: 'component', category: 'frontend' },
        { id: 'comp2', title: 'AuthService', type: 'service', category: 'backend' }
      ];

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
      // Handler adds relationships to components, not project.relationships
      expect(mockProject.components[0].relationships).toHaveLength(1);
      expect(mockProject.components[0].relationships[0].targetId).toBe('comp2');
      expect(mockProject.components[0].relationships[0].relationType).toBe('uses');
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

      // Only test valid types as per handler implementation
      const types = ['uses', 'depends_on'];

      for (const type of types) {
        // Reset component relationships
        mockProject.components[0].relationships = [];
        mockProject.components[1].relationships = [];

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
        expect(mockProject.components[0].relationships[0].relationType).toBe(type);
      }
    });
  });

  describe('handleViewRelationships', () => {
    beforeEach(() => {
      // Setup relationships in components, not at project level
      mockProject.components[0].relationships = [
        {
          id: '1',
          targetId: 'comp2',
          relationType: 'uses',
          description: 'Uses for auth'
        }
      ];
      mockProject.components[1].relationships = [
        {
          id: '2',
          targetId: 'comp1',
          relationType: 'depends_on',
          description: 'Depends on'
        }
      ];
    });

    it('should show wizard when no component specified', async () => {
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

      expect(result.type).toBe(ResponseType.PROMPT);
      expect(result.data.wizardType).toBe('view_relationships_selector');
    });

    it('should view relationships for specific component', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_RELATIONSHIPS,
        command: 'view',
        raw: '/view relationships comp1',
        args: ['comp1'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewRelationships(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.relationships).toHaveLength(1);
      expect(result.data.relationships[0].relationType).toBe('uses');
    });
  });

  describe('handleEditRelationship', () => {
    beforeEach(() => {
      // Setup relationships in components
      mockProject.components[0].relationships = [
        {
          id: '1',
          targetId: 'comp2',
          relationType: 'uses',
          description: 'Original description'
        }
      ];
    });

    it('should show wizard when no args provided', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_RELATIONSHIP,
        command: 'edit',
        raw: '/edit relationship',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditRelationship(parsed, projectId);

      expect(result.type).toBe(ResponseType.PROMPT);
      expect(result.data.wizardType).toBe('edit_relationship_selector');
    });

    it('should return error when component not found', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_RELATIONSHIP,
        command: 'edit',
        raw: '/edit relationship',
        args: ['unknown', '1'],
        flags: {},
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
      // Setup relationships in components
      mockProject.components[0].relationships = [
        { id: '1', targetId: 'comp2', relationType: 'uses' }
      ];
      mockProject.components[1].relationships = [
        { id: '2', targetId: 'comp1', relationType: 'depends_on' }
      ];
    });

    it('should show wizard when no args provided', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_RELATIONSHIP,
        command: 'delete',
        raw: '/delete relationship',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleDeleteRelationship(parsed, projectId);

      expect(result.type).toBe(ResponseType.PROMPT);
      expect(result.data.wizardType).toBe('delete_relationship_selector');
    });

    it('should return error when component not found', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_RELATIONSHIP,
        command: 'delete',
        raw: '/delete relationship',
        args: ['unknown', '1'],
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
