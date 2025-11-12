import { TodoHandlers } from '../../services/handlers/crud/TodoHandlers';
import { ParsedCommand, CommandType } from '../../services/commandParser';
import { ResponseType } from '../../services/types';
import { Project } from '../../models/Project';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../models/Project');
jest.mock('../../services/ProjectCache');
jest.mock('../../config/logger');
jest.mock('../../services/activityLogger');

describe('TodoHandlers', () => {
  let handler: TodoHandlers;
  const userId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();

  const mockProject: any = {
    _id: new mongoose.Types.ObjectId(projectId),
    name: 'Test Project',
    userId: new mongoose.Types.ObjectId(userId),
    todos: [],
    devLog: [],
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new TodoHandlers(userId);
    mockProject.todos = [];
    mockProject.devLog = [];
  });

  describe('handleAddTodo', () => {
    it('should add a todo with wizard when no args', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_TODO,
        command: 'add',
        raw: '/add todo',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.PROMPT);
      expect(result.data.wizardType).toBe('add_todo');
    });

    it('should add a simple todo with title only', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_TODO,
        command: 'add',
        raw: '/add todo',
        args: [],
        flags: { title: 'Implement auth' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.todos).toHaveLength(1);
      expect(mockProject.todos[0].title).toBe('Implement auth');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should add a todo with all fields', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_TODO,
        command: 'add',
        raw: '/add todo',
        args: [],
        flags: {
          title: 'Build API',
          content: 'RESTful API', // Handler uses 'content' not 'description'
          priority: 'high',
          status: 'in_progress' // Use underscore format
        },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.todos[0].title).toBe('Build API');
      expect(mockProject.todos[0].description).toBe('RESTful API');
      expect(mockProject.todos[0].priority).toBe('high');
      expect(mockProject.todos[0].status).toBe('in_progress');
    });

    it('should validate required title', async () => {
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_TODO,
        command: 'add',
        raw: '/add todo',
        args: [],
        flags: { description: 'Missing title' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('title');
    });
  });

  describe('handleViewTodos', () => {
    beforeEach(() => {
      mockProject.todos = [
        { id: '1', title: 'Todo 1', status: 'todo', priority: 'medium', createdAt: new Date() },
        { id: '2', title: 'Todo 2', status: 'completed', priority: 'high', createdAt: new Date() },
        { id: '3', title: 'Todo 3', status: 'in-progress', priority: 'low', createdAt: new Date() }
      ];
    });

    it('should view all todos', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_TODOS,
        command: 'view',
        raw: '/view todos',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewTodos(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.todos.length).toBe(3);
    });

    it('should return all todos without filtering', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_TODOS,
        command: 'view',
        raw: '/view todos',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewTodos(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      // Handler returns all todos without filtering
      expect(result.data.todos).toHaveLength(3);
      expect(result.data.todos.some((t: any) => t.status === 'completed')).toBe(true);
      expect(result.data.todos.some((t: any) => t.priority === 'high')).toBe(true);
    });
  });

  describe('handleEditTodo', () => {
    beforeEach(() => {
      mockProject.todos = [
        { id: '1', title: 'Original Title', description: 'Original', status: 'todo', priority: 'medium' }
      ];
    });

    it('should edit todo title', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_TODO,
        command: 'edit',
        raw: '/edit todo',
        args: ['1'],
        flags: { title: 'Updated Title' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.todos[0].title).toBe('Updated Title');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should edit todo status', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_TODO,
        command: 'edit',
        raw: '/edit todo',
        args: ['1'],
        flags: { status: 'completed' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.todos[0].status).toBe('completed');
    });

    it('should return error when todo not found', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_TODO,
        command: 'edit',
        raw: '/edit todo',
        args: ['999'],
        flags: { title: 'New Title' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
    });
  });

  describe('handleDeleteTodo', () => {
    beforeEach(() => {
      mockProject.todos = [
        { id: '1', title: 'Todo 1' },
        { id: '2', title: 'Todo 2' }
      ];
    });

    it('should delete a todo with confirmation', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_TODO,
        command: 'delete',
        raw: '/delete todo',
        args: ['1'],
        flags: { confirm: true },
        isValid: true,
        errors: []
      };

      const result = await handler.handleDeleteTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.todos).toHaveLength(1);
      expect(mockProject.todos[0].id).toBe('2');
      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should return error when deleting non-existent todo', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_TODO,
        command: 'delete',
        raw: '/delete todo',
        args: ['999'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleDeleteTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
    });
  });

  describe('handleCompleteTodo', () => {
    beforeEach(() => {
      mockProject.todos = [
        { id: '1', title: 'Todo 1', status: 'todo' }
      ];
    });

    it('should complete a todo', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.COMPLETE_TODO,
        command: 'complete',
        raw: '/complete todo',
        args: ['1'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleCompleteTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.todos[0].status).toBe('completed');
      expect(mockProject.save).toHaveBeenCalled();
    });
  });

  describe('handleAssignTodo', () => {
    beforeEach(() => {
      mockProject.todos = [
        { id: '1', title: 'Todo 1', assignee: null }
      ];
    });

    it('should require correct args format', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ASSIGN_TODO,
        command: 'assign',
        raw: '/assign todo',
        args: [], // Missing args
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAssignTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('Usage');
    });
  });

  describe('handlePushTodo', () => {
    it('should push todo to devlog', async () => {
      const sourceTodo = {
        id: 'todo-1',
        title: 'Todo to push',
        description: 'Description',
        priority: 'medium',
        completed: false,
        status: 'not_started'
      };
      mockProject.todos = [sourceTodo];
      mockProject.devLog = [];

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.PUSH_TODO,
        command: 'push',
        raw: '/push todo 1',
        args: ['1'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handlePushTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.devLog).toHaveLength(1);
      expect(mockProject.devLog[0].title).toBe('Todo to push');
      expect(mockProject.todos).toHaveLength(0); // Todo removed after push
    });

    it('should return error when todo not found', async () => {
      mockProject.todos = [];

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.PUSH_TODO,
        command: 'push',
        raw: '/push todo 1',
        args: ['1'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handlePushTodo(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
    });
  });

  describe('handleAddSubtask', () => {
    it('should add subtask to parent todo', async () => {
      const parentTodo = {
        id: 'parent-1',
        title: 'Parent Todo',
        description: '',
        priority: 'medium',
        completed: false,
        status: 'not_started'
      };
      mockProject.todos = [parentTodo];

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_SUBTASK,
        command: 'add',
        raw: '/add subtask --parent="1" --title="Subtask 1"',
        args: [],
        flags: { parent: '1', title: 'Subtask 1' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddSubtask(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.todos).toHaveLength(2);
      expect(mockProject.todos[1].parentTodoId).toBe('parent-1');
    });

    it('should return error when no parent todos exist', async () => {
      mockProject.todos = [];

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.ADD_SUBTASK,
        command: 'add',
        raw: '/add subtask',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleAddSubtask(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('No parent todos');
    });
  });

  describe('handleViewSubtasks', () => {
    it('should view all subtasks of parent todo', async () => {
      mockProject.todos = [
        {
          id: 'parent-1',
          title: 'Parent Todo',
          description: '',
          priority: 'medium',
          completed: false,
          status: 'not_started'
        },
        {
          id: 'subtask-1',
          title: 'Subtask 1',
          description: '',
          priority: 'low',
          completed: false,
          status: 'not_started',
          parentTodoId: 'parent-1'
        },
        {
          id: 'subtask-2',
          title: 'Subtask 2',
          description: '',
          priority: 'high',
          completed: true,
          status: 'completed',
          parentTodoId: 'parent-1'
        }
      ];

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_SUBTASKS,
        command: 'view',
        raw: '/view subtasks 1',
        args: ['1'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewSubtasks(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.subtasks).toHaveLength(2);
    });
  });

  describe('handleEditSubtask', () => {
    it('should edit subtask', async () => {
      mockProject.todos = [
        {
          id: 'parent-1',
          title: 'Parent Todo',
          description: '',
          priority: 'medium',
          completed: false,
          status: 'not_started'
        },
        {
          id: 'subtask-1',
          title: 'Old Title',
          description: '',
          priority: 'low',
          completed: false,
          status: 'not_started',
          parentTodoId: 'parent-1'
        }
      ];

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.EDIT_SUBTASK,
        command: 'edit',
        raw: '/edit subtask 1 1',
        args: ['1', '1'],
        flags: { title: 'New Title' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleEditSubtask(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.todos[1].title).toBe('New Title');
    });
  });

  describe('handleDeleteSubtask', () => {
    it('should delete subtask', async () => {
      mockProject.todos = [
        {
          id: 'parent-1',
          title: 'Parent Todo',
          description: '',
          priority: 'medium',
          completed: false,
          status: 'not_started'
        },
        {
          id: 'subtask-1',
          title: 'Subtask to delete',
          description: '',
          priority: 'low',
          completed: false,
          status: 'not_started',
          parentTodoId: 'parent-1'
        }
      ];

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.DELETE_SUBTASK,
        command: 'delete',
        raw: '/delete subtask 1 1',
        args: ['1', '1'],
        flags: { confirm: true },
        isValid: true,
        errors: []
      };

      const result = await handler.handleDeleteSubtask(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(mockProject.todos).toHaveLength(1);
    });
  });
});
