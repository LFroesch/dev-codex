import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { BaseCommandHandler } from './BaseCommandHandler';
import { CommandResponse, ResponseType } from '../commandExecutor';
import { ParsedCommand } from '../commandParser';
import { sanitizeText, validateTodoText, parseDueDate, formatDueDate, formatTime12Hour } from '../../utils/validation';

/**
 * Handlers for CRUD operations on todos, notes, devlog, and docs
 */
export class CrudHandlers extends BaseCommandHandler {
  /**
   * Handle /add todo command
   * Now requires flag-based syntax: /add todo --title="..." [--content="..."] [--priority=...] [--status=...]
   * Or use without flags to pull up an interactive wizard: /add todo
   */
  async handleAddTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags) - this is an error
    if (parsed.args.length > 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add todo - Interactive wizard',
          '/add todo --title="your todo title"',
          '/add todo --title="fix bug" --content="detailed description" --priority=high',
          '/help add todo'
        ]
      };
    }

    // Get flags
    const title = parsed.flags.get('title') as string;
    const content = parsed.flags.get('content') as string;
    const priority = parsed.flags.get('priority') as string;
    const status = parsed.flags.get('status') as string;
    const due = parsed.flags.get('due') as string;

    // No args and no flags - pull up wizard
    if (parsed.args.length === 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.PROMPT,
        message: `✨ Add New Todo`,
        data: {
          wizardType: 'add_todo',
          steps: [
            {
              id: 'title',
              label: 'Title',
              type: 'text',
              required: true,
              placeholder: 'Enter todo title'
            },
            {
              id: 'content',
              label: 'Description',
              type: 'textarea',
              required: false,
              placeholder: 'Optional description'
            },
            {
              id: 'priority',
              label: 'Priority',
              type: 'select',
              options: ['low', 'medium', 'high'],
              required: true,
              value: 'medium'
            },
            {
              id: 'status',
              label: 'Status',
              type: 'select',
              options: ['not_started', 'in_progress', 'completed', 'blocked'],
              required: true,
              value: 'not_started'
            },
            {
              id: 'due',
              label: 'Due Date',
              type: 'text',
              required: false,
              placeholder: 'MM-DD-YYYY 8:00PM or MM-DD 21:00 (optional)'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_todo'
        }
      };
    }

    // Validate required flags
    if (!title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --title flag is required',
        suggestions: [
          '/add todo - Use wizard instead',
          '/add todo --title="your todo title"',
          '/add todo --title="fix authentication bug" --priority=high',
          '/help add todo'
        ]
      };
    }

    // Validate title
    const validation = validateTodoText(title);
    if (!validation.isValid) {
      return {
        type: ResponseType.ERROR,
        message: validation.error || 'Invalid todo title',
        suggestions: ['/help add todo']
      };
    }

    // Validate priority if provided
    if (priority && !['low', 'medium', 'high'].includes(priority.toLowerCase())) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Invalid priority. Must be: low, medium, or high',
        suggestions: ['/add todo --title="task" --priority=high']
      };
    }

    // Validate status if provided
    const validStatuses = ['not_started', 'in_progress', 'completed', 'blocked'];
    if (status && !validStatuses.includes(status.toLowerCase())) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        suggestions: ['/add todo --title="task" --status=in_progress']
      };
    }

    // Parse and validate due date if provided
    let dueDate: Date | undefined;
    if (due) {
      const dueDateParse = parseDueDate(due);
      if (!dueDateParse.isValid) {
        return {
          type: ResponseType.ERROR,
          message: `❌ ${dueDateParse.error}`,
          suggestions: [
            '/add todo --title="task" --due="12-25-2025 8:00PM"',
            '/add todo --title="task" --due="3-15 9:30AM" (defaults to current year)',
            '/add todo --title="task" --due="12-31 21:00" (24-hour format)',
            '/help add todo'
          ]
        };
      }
      dueDate = dueDateParse.date;
    }

    const newTodo = {
      id: uuidv4(),
      title: validation.sanitized!,
      description: content ? sanitizeText(content) : '',
      priority: (priority?.toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
      completed: false,
      status: (status?.toLowerCase() as 'not_started' | 'in_progress' | 'completed' | 'blocked') || 'not_started',
      dueDate,
      createdAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    project.todos.push(newTodo);
    await project.save();

    const dueDateMsg = dueDate ? ` (due: ${formatDueDate(dueDate)})` : '';
    return this.buildSuccessResponse(
      `✅ Added todo: "${validation.sanitized}"${dueDateMsg} to ${project.name}`,
      project,
      'add_todo'
    );
  }

  /**
   * Handle /add note command
   * Now requires flag-based syntax: /add note --title="..." --content="..."
   * Or use without flags to pull up an interactive wizard: /add note
   */
  async handleAddNote(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags) - this is an error
    if (parsed.args.length > 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add note - Interactive wizard',
          '/add note --title="Note Title" --content="Note content"',
          '/add note --title="Meeting Notes" --content="Discussed project architecture..."',
          '/help add note'
        ]
      };
    }

    // Get flags
    const title = parsed.flags.get('title') as string;
    const content = parsed.flags.get('content') as string;

    // No args and no flags - pull up wizard
    if (parsed.args.length === 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.PROMPT,
        message: `✨ Add New Note`,
        data: {
          wizardType: 'add_note',
          steps: [
            {
              id: 'title',
              label: 'Note Title',
              type: 'text',
              required: true,
              placeholder: 'Enter note title'
            },
            {
              id: 'content',
              label: 'Content',
              type: 'textarea',
              required: true,
              placeholder: 'Enter note content'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_note'
        }
      };
    }

    // Validate required flags
    if (!title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --title flag is required',
        suggestions: [
          '/add note - Use wizard instead',
          '/add note --title="Note Title" --content="Note content"',
          '/help add note'
        ]
      };
    }

    if (!content) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --content flag is required',
        suggestions: [
          '/add note - Use wizard instead',
          '/add note --title="Note Title" --content="Note content"',
          '/help add note'
        ]
      };
    }

    const sanitizedTitle = sanitizeText(title);
    const sanitizedContent = sanitizeText(content);

    if (!sanitizedTitle || !sanitizedContent) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Title and content cannot be empty',
        suggestions: ['/help add note']
      };
    }

    const newNote = {
      id: uuidv4(),
      title: sanitizedTitle,
      description: '',
      content: sanitizedContent,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    project.notes.push(newNote);
    await project.save();

    return this.buildSuccessResponse(
      `📝 Added note "${sanitizedTitle}" to ${project.name}`,
      project,
      'add_note',
      { title: sanitizedTitle, preview: sanitizedContent.slice(0, 50) + (sanitizedContent.length > 50 ? '...' : '') }
    );
  }

  /**
   * Handle /add devlog command
   * Now requires flag-based syntax: /add devlog --title="..." --content="..."
   * Or use without flags to pull up an interactive wizard: /add devlog
   */
  async handleAddDevLog(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags) - this is an error
    if (parsed.args.length > 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add devlog - Interactive wizard',
          '/add devlog --title="Entry Title" --content="What I worked on today..."',
          '/add devlog --title="Bug Fix" --content="Fixed memory leak in user service"',
          '/help add devlog'
        ]
      };
    }

    // Get flags
    const title = parsed.flags.get('title') as string;
    const content = parsed.flags.get('content') as string;

    // No args and no flags - pull up wizard
    if (parsed.args.length === 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.PROMPT,
        message: `✨ Add New Dev Log Entry`,
        data: {
          wizardType: 'add_devlog',
          steps: [
            {
              id: 'title',
              label: 'Title',
              type: 'text',
              required: false,
              placeholder: 'Optional entry title'
            },
            {
              id: 'content',
              label: 'Content',
              type: 'textarea',
              required: true,
              placeholder: 'What did you work on today?'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_devlog'
        }
      };
    }

    // Validate required flags
    if (!title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --title flag is required',
        suggestions: [
          '/add devlog - Use wizard instead',
          '/add devlog --title="Entry Title" --content="Entry content"',
          '/help add devlog'
        ]
      };
    }

    if (!content) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --content flag is required',
        suggestions: [
          '/add devlog - Use wizard instead',
          '/add devlog --title="Entry Title" --content="Entry content"',
          '/help add devlog'
        ]
      };
    }

    const sanitizedTitle = sanitizeText(title);
    const sanitizedContent = sanitizeText(content);

    if (!sanitizedTitle || !sanitizedContent) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Title and content cannot be empty',
        suggestions: ['/help add devlog']
      };
    }

    const newEntry = {
      id: uuidv4(),
      title: sanitizedTitle,
      description: sanitizedContent,
      date: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    project.devLog.push(newEntry);
    await project.save();

    return this.buildSuccessResponse(
      `📋 Added dev log entry "${sanitizedTitle}" to ${project.name}`,
      project,
      'add_devlog',
      { preview: sanitizedContent.slice(0, 50) + (sanitizedContent.length > 50 ? '...' : '') }
    );
  }

  /**
   * Handle /add component command
   * Now requires flag-based syntax: /add component --feature="..." --category=... --type=... --title="..." --content="..."
   * Or use without flags to pull up an interactive wizard: /add component
   */
  async handleAddComponent(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (looking for "-" separator or args without flags) - this is an error
    const separatorIndex = parsed.args.indexOf('-');
    if (separatorIndex !== -1 || (parsed.args.length > 0 && parsed.flags.size === 0)) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add component - Interactive wizard',
          '/add component --feature="Auth" --category=backend --type=service --title="Login Service" --content="Handles user authentication"',
          '/add component --feature="Dashboard" --category=frontend --type=component --title="UserCard" --content="Displays user information"',
          '/help add component'
        ]
      };
    }

    // Get flags
    const feature = parsed.flags.get('feature') as string;
    const category = parsed.flags.get('category') as string;
    const type = parsed.flags.get('type') as string;
    const title = parsed.flags.get('title') as string;
    const content = parsed.flags.get('content') as string;

    // No args and no flags - pull up wizard
    if (parsed.args.length === 0 && parsed.flags.size === 0) {
      const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];
      const typesByCategory: Record<string, string[]> = {
        frontend: ['page', 'component', 'hook', 'context', 'layout', 'util', 'custom'],
        backend: ['service', 'route', 'model', 'controller', 'middleware', 'util', 'custom'],
        database: ['schema', 'migration', 'seed', 'query', 'index', 'custom'],
        infrastructure: ['deployment', 'cicd', 'env', 'config', 'monitoring', 'docker', 'custom'],
        security: ['auth', 'authz', 'encryption', 'validation', 'sanitization', 'custom'],
        api: ['client', 'integration', 'webhook', 'contract', 'graphql', 'custom'],
        documentation: ['area', 'section', 'guide', 'architecture', 'api-doc', 'readme', 'changelog', 'custom'],
        asset: ['image', 'font', 'video', 'audio', 'document', 'dependency', 'custom']
      };

      return {
        type: ResponseType.PROMPT,
        message: `✨ Add New Component`,
        data: {
          wizardType: 'add_component',
          typesByCategory,
          steps: [
            {
              id: 'feature',
              label: 'Feature',
              type: 'text',
              required: true,
              placeholder: 'Enter feature name'
            },
            {
              id: 'category',
              label: 'Category',
              type: 'select',
              options: validCategories,
              required: true,
              value: 'frontend'
            },
            {
              id: 'type',
              label: 'Type',
              type: 'select',
              options: typesByCategory.frontend,
              required: true,
              value: 'component',
              dependsOn: 'category'
            },
            {
              id: 'title',
              label: 'Component Title',
              type: 'text',
              required: true,
              placeholder: 'Enter component title'
            },
            {
              id: 'content',
              label: 'Content',
              type: 'textarea',
              required: true,
              placeholder: 'Enter component description'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_component'
        }
      };
    }

    // Validate required flags
    if (!feature) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --feature flag is required',
        suggestions: [
          '/add component - Use wizard instead',
          '/add component --feature="FeatureName" --category=backend --type=service --title="Title" --content="Description"',
          '/help add component'
        ]
      };
    }

    if (!category) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --category flag is required',
        suggestions: [
          '/add component - Use wizard instead',
          'Valid categories: frontend, backend, database, infrastructure, security, api, documentation, asset',
          '/add component --feature="Auth" --category=backend --type=service --title="Login" --content="..."',
          '/help add component'
        ]
      };
    }

    if (!type) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --type flag is required',
        suggestions: [
          '/add component - Use wizard instead',
          'Common types: component, service, schema, config, auth, client, guide, dependency',
          '/add component --feature="Auth" --category=backend --type=service --title="Login" --content="..."',
          '/help add component'
        ]
      };
    }

    if (!title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --title flag is required',
        suggestions: [
          '/add component - Use wizard instead',
          '/add component --feature="Auth" --category=backend --type=service --title="Login Service" --content="..."',
          '/help add component'
        ]
      };
    }

    if (!content) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --content flag is required',
        suggestions: [
          '/add component - Use wizard instead',
          '/add component --feature="Auth" --category=backend --type=service --title="Login" --content="Handles authentication"',
          '/help add component'
        ]
      };
    }

    // Validate category
    const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];
    if (!validCategories.includes(category.toLowerCase())) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid category "${category}". Valid categories: ${validCategories.join(', ')}`,
        suggestions: ['/add component --feature="Auth" --category=backend --type=service --title="Login" --content="..."']
      };
    }

    // Sanitize inputs
    const sanitizedFeature = sanitizeText(feature);
    const sanitizedTitle = sanitizeText(title);
    const sanitizedContent = sanitizeText(content);
    const sanitizedType = sanitizeText(type);

    if (!sanitizedFeature || !sanitizedTitle || !sanitizedContent || !sanitizedType) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Feature, title, type, and content cannot be empty',
        suggestions: ['/help add component']
      };
    }

    const newComponent = {
      id: uuidv4(),
      category: category.toLowerCase() as any,
      type: sanitizedType,
      title: sanitizedTitle,
      content: sanitizedContent,
      feature: sanitizedFeature,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    project.components.push(newComponent);
    await project.save();

    return this.buildSuccessResponse(
      `🧩 Added ${category.toLowerCase()} component "${sanitizedTitle}" to feature "${sanitizedFeature}" in ${project.name}`,
      project,
      'add_component'
    );
  }

  /**
   * Handle /view notes command
   */
  async handleViewNotes(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const notes = resolution.project.notes || [];

    if (notes.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `📝 No notes found in ${resolution.project.name}`,
        suggestions: [`/add note`, `/add note --title="Note Title" --content="Content" @${resolution.project.name}`]
      };
    }

    return this.buildDataResponse(
      `📝 Notes in ${resolution.project.name} (${notes.length})`,
      resolution.project,
      'view_notes',
      {
        notes: notes.map((note: any) => ({
          id: note.id,
          title: note.title,
          preview: note.content?.slice(0, 100) + (note.content?.length > 100 ? '...' : ''),
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        }))
      }
    );
  }

  /**
   * Handle /view todos command
   */
  async handleViewTodos(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const allTodos = resolution.project.todos || [];
    const parentTodos = allTodos.filter((t: any) => !t.parentTodoId);

    if (parentTodos.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `✅ No todos found in ${resolution.project.name}`,
        suggestions: [`/add todo`, `/add todo --title="Task" --priority=high @${resolution.project.name}`]
      };
    }

    // Build hierarchical structure with subtasks
    // Include index for each todo in the global list (for command usage)
    const todosWithSubtasks = parentTodos.map((todo: any, parentIndex: number) => {
      const subtasks = allTodos.filter((t: any) => t.parentTodoId === todo.id);
      return {
        id: todo.id,
        index: parentIndex + 1, // 1-based index for parent todos
        title: todo.title,
        description: todo.description,
        priority: todo.priority,
        status: todo.status,
        completed: todo.completed,
        dueDate: todo.dueDate,
        reminderDate: todo.reminderDate,
        assignedTo: todo.assignedTo,
        subtasks: subtasks.map((sub: any) => {
          // Find the global index of this subtask in allTodos
          const globalIndex = allTodos.findIndex((t: any) => t.id === sub.id);
          return {
            id: sub.id,
            index: globalIndex + 1, // 1-based index for subtasks in global todos list
            title: sub.title,
            description: sub.description,
            priority: sub.priority,
            status: sub.status,
            completed: sub.completed,
            dueDate: sub.dueDate,
            reminderDate: sub.reminderDate,
            assignedTo: sub.assignedTo
          };
        })
      };
    });

    const completed = parentTodos.filter((t: any) => t.completed).length;
    const pending = parentTodos.length - completed;
    const totalSubtasks = allTodos.filter((t: any) => t.parentTodoId).length;

    return this.buildDataResponse(
      `✅ Todos in ${resolution.project.name} (${pending} pending, ${completed} completed${totalSubtasks > 0 ? `, ${totalSubtasks} subtasks` : ''})`,
      resolution.project,
      'view_todos',
      {
        todos: todosWithSubtasks,
        hierarchical: true
      }
    );
  }

  /**
   * Handle /view devlog command
   */
  async handleViewDevLog(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const devLog = resolution.project.devLog || [];

    if (devLog.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `📋 No dev log entries found in ${resolution.project.name}`,
        suggestions: [`/add devlog @${resolution.project.name}`]
      };
    }

    return this.buildDataResponse(
      `📋 Dev Log in ${resolution.project.name} (${devLog.length} entries)`,
      resolution.project,
      'view_devlog',
      {
        entries: devLog.map((entry: any) => ({
          id: entry.id,
          title: entry.title,
          description: entry.description,
          date: entry.date
        })).reverse()
      }
    );
  }

  /**
   * Handle /view components command - Shows structure by default, grouped by features
   */
  async handleViewComponents(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const components = resolution.project.components || [];

    if (components.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `🧩 No components found in ${resolution.project.name}`,
        suggestions: [`/add component @${resolution.project.name}`]
      };
    }

    // Group components by feature
    const componentsByFeature: Record<string, any[]> = {};
    components.forEach((component: any) => {
      const featureKey = component.feature || 'Ungrouped';
      if (!componentsByFeature[featureKey]) {
        componentsByFeature[featureKey] = [];
      }
      componentsByFeature[featureKey].push({
        id: component.id,
        type: component.type,
        title: component.title,
        feature: component.feature,
        createdAt: component.createdAt
      });
    });

    return this.buildDataResponse(
      `🧩 Components in ${resolution.project.name} (${components.length} components, ${Object.keys(componentsByFeature).length} features)`,
      resolution.project,
      'view_components',
      {
        structure: componentsByFeature,
        components: components.map((component: any) => ({
          id: component.id,
          type: component.type,
          title: component.title,
          feature: component.feature,
          createdAt: component.createdAt
        }))
      }
    );
  }

  /**
   * Handle /search command
   */
  async handleSearch(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const query = parsed.args.join(' ').trim().toLowerCase();

    if (!query) {
      return {
        type: ResponseType.ERROR,
        message: 'Search query is required',
        suggestions: ['/help search']
      };
    }

    // If project is specified, search only in that project
    if (parsed.projectMention || currentProjectId) {
      const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
      if (!resolution.project) {
        return this.buildProjectErrorResponse(resolution);
      }

      return this.searchInProject(resolution.project, query);
    }

    // Otherwise, search across all user's projects
    return this.searchAcrossProjects(query);
  }

  /**
   * Search within a specific project
   */
  private searchInProject(project: any, query: string): CommandResponse {
    const results: any[] = [];

    // Search todos
    (project.todos || []).forEach((todo: any) => {
      if (todo.title.toLowerCase().includes(query) ||
          (todo.description && todo.description.toLowerCase().includes(query))) {
        results.push({
          type: 'todo',
          id: todo.id,
          title: todo.title,
          priority: todo.priority,
          status: todo.status,
          projectName: project.name,
          projectId: project._id.toString()
        });
      }
    });

    // Search notes
    (project.notes || []).forEach((note: any) => {
      if (note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)) {
        results.push({
          type: 'note',
          id: note.id,
          title: note.title,
          preview: note.content.substring(0, 100),
          projectName: project.name,
          projectId: project._id.toString()
        });
      }
    });

    // Search devlog
    (project.devLog || []).forEach((entry: any) => {
      if (entry.title.toLowerCase().includes(query) ||
          (entry.description && entry.description.toLowerCase().includes(query))) {
        results.push({
          type: 'devlog',
          id: entry.id,
          title: entry.title,
          preview: entry.description ? entry.description.substring(0, 100) : '',
          date: entry.date,
          projectName: project.name,
          projectId: project._id.toString()
        });
      }
    });

    // Search components
    (project.components || []).forEach((component: any) => {
      if (component.title.toLowerCase().includes(query) ||
          component.content.toLowerCase().includes(query) ||
          (component.feature && component.feature.toLowerCase().includes(query))) {
        results.push({
          type: 'component',
          id: component.id,
          componentType: component.type,
          title: component.title,
          feature: component.feature,
          preview: component.content.substring(0, 100),
          projectName: project.name,
          projectId: project._id.toString()
        });
      }
    });

    if (results.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `🔍 No results found for "${query}" in ${project.name}`,
        suggestions: [`Try a different search term`]
      };
    }

    return this.buildDataResponse(
      `🔍 Found ${results.length} results for "${query}" in ${project.name}`,
      project,
      'search',
      { results, query }
    );
  }

  /**
   * Search across all user's projects (optimized with text index)
   */
  private async searchAcrossProjects(query: string): Promise<CommandResponse> {
    const { Project } = await import('../../models/Project');

    // Use MongoDB text search for better performance
    const projects = await Project.find({
      $or: [
        { ownerId: this.userId },
        { userId: this.userId }
      ],
      $text: { $search: query }
    }, {
      score: { $meta: 'textScore' }
    })
    .select('_id name todos notes devLog components')
    .sort({ score: { $meta: 'textScore' } })
    .limit(10) // Limit to top 10 matching projects for performance
    .lean();

    // Also check team projects
    const TeamMember = (await import('../../models/TeamMember')).default;
    const teamProjectIds = await TeamMember.find({ userId: this.userId })
      .select('projectId')
      .lean();

    if (teamProjectIds.length > 0) {
      const teamProjects = await Project.find({
        _id: { $in: teamProjectIds.map(tm => tm.projectId) },
        $text: { $search: query }
      }, {
        score: { $meta: 'textScore' }
      })
      .select('_id name todos notes devLog components')
      .sort({ score: { $meta: 'textScore' } })
      .limit(10)
      .lean();

      projects.push(...teamProjects);
    }

    const results: any[] = [];
    const queryLower = query.toLowerCase();

    for (const project of projects) {
      // Search todos
      (project.todos || []).forEach((todo: any) => {
        if (todo.title.toLowerCase().includes(queryLower) ||
            (todo.description && todo.description.toLowerCase().includes(queryLower))) {
          results.push({
            type: 'todo',
            id: todo.id,
            title: todo.title,
            priority: todo.priority,
            status: todo.status,
            projectName: project.name,
            projectId: project._id.toString()
          });
        }
      });

      // Search notes
      (project.notes || []).forEach((note: any) => {
        if (note.title.toLowerCase().includes(queryLower) ||
            note.content.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'note',
            id: note.id,
            title: note.title,
            preview: note.content.substring(0, 100),
            projectName: project.name,
            projectId: project._id.toString()
          });
        }
      });

      // Search devlog
      (project.devLog || []).forEach((entry: any) => {
        if (entry.title.toLowerCase().includes(queryLower) ||
            (entry.description && entry.description.toLowerCase().includes(queryLower))) {
          results.push({
            type: 'devlog',
            id: entry.id,
            title: entry.title,
            preview: entry.description ? entry.description.substring(0, 100) : '',
            date: entry.date,
            projectName: project.name,
            projectId: project._id.toString()
          });
        }
      });

      // Search components
      (project.components || []).forEach((component: any) => {
        if (component.title.toLowerCase().includes(queryLower) ||
            component.content.toLowerCase().includes(queryLower) ||
            (component.feature && component.feature.toLowerCase().includes(queryLower))) {
          results.push({
            type: 'component',
            id: component.id,
            componentType: component.type,
            title: component.title,
            feature: component.feature,
            preview: component.content.substring(0, 100),
            projectName: project.name,
            projectId: project._id.toString()
          });
        }
      });
    }

    // Limit total results
    const limitedResults = results.slice(0, 50);

    if (limitedResults.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `🔍 No results found for "${query}" across all projects`,
        suggestions: [`Try a different search term`, `/help search`]
      };
    }

    return {
      type: ResponseType.DATA,
      message: `🔍 Found ${limitedResults.length} results for "${query}"${results.length > 50 ? ' (showing top 50)' : ''}`,
      data: { results: limitedResults, query },
      metadata: {
        action: 'search',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /complete command - Mark todo as completed
   */
  async handleCompleteTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const todoIdentifier = parsed.args.join(' ').trim();
    const todo = this.findTodo(project.todos, todoIdentifier);

    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/help complete']
      };
    }

    todo.completed = true;
    todo.status = 'completed';
    await project.save();

    return this.buildSuccessResponse(
      `✅ Marked todo as completed: "${todo.title}"`,
      project,
      'complete_todo'
    );
  }

  /**
   * Handle /assign command - Assign todo to user
   */
  async handleAssignTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    if (parsed.args.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: 'Usage: /assign [todo] [user email]',
        suggestions: ['/help assign']
      };
    }

    // Last arg is the email, everything before is the todo identifier
    const userEmail = parsed.args[parsed.args.length - 1];
    const todoIdentifier = parsed.args.slice(0, -1).join(' ').trim();

    const todo = this.findTodo(project.todos, todoIdentifier);

    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/help assign']
      };
    }

    // Find user in project members
    const { User } = await import('../../models/User');
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return {
        type: ResponseType.ERROR,
        message: `User not found: ${userEmail}`,
        suggestions: ['/view team']
      };
    }

    // Check if user is the owner or a team member
    const isOwner = project.ownerId?.toString() === user._id.toString() ||
                    project.userId?.toString() === user._id.toString();

    const TeamMember = (await import('../../models/TeamMember')).default;
    const teamMember = await TeamMember.findOne({
      projectId: project._id,
      userId: user._id
    });

    if (!teamMember && !isOwner) {
      return {
        type: ResponseType.ERROR,
        message: `${userEmail} is not a member of this project`,
        suggestions: ['/invite ' + userEmail]
      };
    }

    todo.assignedTo = user._id;
    await project.save();

    return this.buildSuccessResponse(
      `✅ Assigned todo "${todo.title}" to ${user.firstName} ${user.lastName}`,
      project,
      'assign_todo'
    );
  }

  /**
   * Handle /push command - Push completed todo to devlog
   */
  async handlePushTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const todoIdentifier = parsed.args.join(' ').trim();
    if (!todoIdentifier) {
      return {
        type: ResponseType.ERROR,
        message: 'Please specify a todo to push to devlog',
        suggestions: ['/view todos', '/help push']
      };
    }

    // Filter out subtasks - only allow pushing parent todos via numeric index
    const todo = this.findTodo(
      project.todos.filter((t: any) => !t.parentTodoId),
      todoIdentifier
    );
    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/help push']
      };
    }

    // Create devlog entry from todo - preserve todo's description
    let todoDescription = typeof todo.description === 'object'
      ? JSON.stringify(todo.description, null, 2)
      : (todo.description || '');

    // Find and aggregate subtask descriptions
    const subtasks = project.todos.filter((t: any) => t.parentTodoId === todo.id);
    if (subtasks.length > 0) {
      const subtaskDescriptions = subtasks
        .map((st: any) => {
          const stDesc = typeof st.description === 'object'
            ? JSON.stringify(st.description, null, 2)
            : (st.description || '');
          return `- ${st.title}${stDesc ? ': ' + stDesc : ''}`;
        })
        .join('\n');

      if (todoDescription) {
        todoDescription += '\n\nSubtasks:\n' + subtaskDescriptions;
      } else {
        todoDescription = 'Subtasks:\n' + subtaskDescriptions;
      }
    }

    const devlogEntry = {
      id: uuidv4(),
      title: todo.title,
      description: todoDescription,
      date: new Date()
    };

    project.devLog.push(devlogEntry);

    // Remove todo and all its subtasks from list
    project.todos = project.todos.filter((t: any) =>
      t.id !== todo.id && t.parentTodoId !== todo.id
    );

    await project.save();

    return this.buildSuccessResponse(
      `✅ Pushed todo to devlog and removed: "${todo.title}"`,
      project,
      'push_todo',
      {
        devlogEntry: {
          title: devlogEntry.title,
          description: devlogEntry.description,
          date: devlogEntry.date
        }
      }
    );
  }

  /**
   * Handle /add subtask command - Add subtask to a todo
   */
  async handleAddSubtask(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags) - this is an error
    if (parsed.args.length > 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add subtask - Interactive wizard',
          '/add subtask --parent="parent todo" --title="subtask title"',
          '/add subtask --parent="implement feature" --title="write tests" --priority=high',
          '/help add subtask'
        ]
      };
    }

    // Get flags
    const parentIdentifier = parsed.flags.get('parent') as string;
    const title = parsed.flags.get('title') as string;
    const content = parsed.flags.get('content') as string;
    const priority = parsed.flags.get('priority') as string;
    const status = parsed.flags.get('status') as string;
    const due = parsed.flags.get('due') as string;

    // No args and no flags - pull up wizard
    if (parsed.args.length === 0 && parsed.flags.size === 0) {
      // Get all parent todos (non-subtask todos)
      const parentTodos = project.todos.filter((t: any) => !t.parentTodoId);

      if (parentTodos.length === 0) {
        return {
          type: ResponseType.ERROR,
          message: 'No parent todos found. Add a todo first.',
          suggestions: ['/add todo', '/view todos']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✨ Add New Subtask`,
        data: {
          wizardType: 'add_subtask',
          steps: [
            {
              id: 'parent',
              label: 'Parent Todo',
              type: 'select',
              options: parentTodos.map((t: any) => ({ value: t.id, label: t.title })),
              required: true,
              placeholder: 'Select parent todo'
            },
            {
              id: 'title',
              label: 'Subtask Title',
              type: 'text',
              required: true,
              placeholder: 'Enter subtask title'
            },
            {
              id: 'content',
              label: 'Description',
              type: 'textarea',
              required: false,
              placeholder: 'Optional description'
            },
            {
              id: 'priority',
              label: 'Priority',
              type: 'select',
              options: ['low', 'medium', 'high'],
              required: true,
              value: 'medium'
            },
            {
              id: 'status',
              label: 'Status',
              type: 'select',
              options: ['not_started', 'in_progress', 'completed', 'blocked'],
              required: true,
              value: 'not_started'
            },
            {
              id: 'due',
              label: 'Due Date',
              type: 'text',
              required: false,
              placeholder: 'MM-DD-YYYY 8:00PM or MM-DD 21:00 (optional)'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_subtask'
        }
      };
    }

    // Validate required flags
    if (!parentIdentifier || !title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --parent and --title flags are required',
        suggestions: [
          '/add subtask - Use wizard instead',
          '/add subtask --parent="parent todo" --title="subtask title"',
          '/help add subtask'
        ]
      };
    }

    // Find parent todo using the parent identifier (could be ID or title)
    const parentTodo = this.findTodo(project.todos.filter((t: any) => !t.parentTodoId), parentIdentifier);

    if (!parentTodo) {
      return {
        type: ResponseType.ERROR,
        message: `Parent todo not found: "${parentIdentifier}"`,
        suggestions: ['/view todos', '/help add subtask']
      };
    }

    // Validate title
    const validation = validateTodoText(title);
    if (!validation.isValid) {
      return {
        type: ResponseType.ERROR,
        message: validation.error || 'Invalid subtask title',
        suggestions: ['/help add subtask']
      };
    }

    // Parse due date if provided
    let dueDate: Date | undefined;
    if (due) {
      const parsedDue = parseDueDate(due);
      if (!parsedDue.isValid) {
        return {
          type: ResponseType.ERROR,
          message: `❌ ${parsedDue.error}`,
          suggestions: ['/help add subtask']
        };
      }
      dueDate = parsedDue.date;
    }

    const newSubtask = {
      id: uuidv4(),
      title: validation.sanitized!,
      description: content || '',
      priority: (priority as any) || parentTodo.priority || 'medium' as const,
      completed: false,
      status: (status as any) || 'not_started' as const,
      parentTodoId: parentTodo.id,
      dueDate,
      createdAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    project.todos.push(newSubtask);
    await project.save();

    return this.buildSuccessResponse(
      `✅ Added subtask "${validation.sanitized}" to "${parentTodo.title}"`,
      project,
      'add_subtask',
      {
        parentTodo: parentTodo.title,
        subtask: validation.sanitized
      }
    );
  }

  /**
   * Handle /view subtasks command - View subtasks for a todo
   */
  async handleViewSubtasks(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const todoIdentifier = parsed.args.join(' ').trim();
    const parentTodo = this.findTodo(
      resolution.project.todos.filter((t: any) => !t.parentTodoId),
      todoIdentifier
    );

    if (!parentTodo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/help view subtasks']
      };
    }

    const subtasks = resolution.project.todos.filter((t: any) => t.parentTodoId === parentTodo.id);

    if (subtasks.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `No subtasks found for "${parentTodo.title}"`,
        suggestions: [`/add subtask "${parentTodo.title}" "subtask text"`]
      };
    }

    const completed = subtasks.filter((s: any) => s.completed).length;
    const pending = subtasks.length - completed;

    return this.buildDataResponse(
      `📋 Subtasks for "${parentTodo.title}" (${pending} pending, ${completed} completed)`,
      resolution.project,
      'view_subtasks',
      {
        parentTodo: {
          id: parentTodo.id,
          title: parentTodo.title
        },
        subtasks: subtasks.map((subtask: any) => ({
          id: subtask.id,
          title: subtask.title,
          description: subtask.description,
          priority: subtask.priority,
          status: subtask.status,
          completed: subtask.completed,
          dueDate: subtask.dueDate,
          reminderDate: subtask.reminderDate,
          assignedTo: subtask.assignedTo
        }))
      }
    );
  }

  /**
   * Handle /edit todo command - Edit an existing todo
   */
  async handleEditTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // If no args, show selector wizard
    if (parsed.args.length === 0) {
      const todos = project.todos || [];

      if (todos.length === 0) {
        return {
          type: ResponseType.INFO,
          message: `📋 No todos found in ${project.name}`,
          suggestions: [`/add todo`, `/add todo "Task description"`]
        };
      }

      // Build todo options with parent context for subtasks
      const todoOptions = todos.map((todo: any) => {
        let label = `${todo.completed ? '✓' : '○'} `;

        // If it's a subtask, show parent title
        if (todo.parentTodoId) {
          const parent = todos.find((t: any) => t.id === todo.parentTodoId);
          if (parent) {
            label += `subtask [${parent.title}] - ${todo.title}`;
          } else {
            label += `subtask - ${todo.title}`;
          }
        } else {
          label += todo.title;
        }

        if (todo.priority) {
          label += ` [${todo.priority}]`;
        }

        return {
          value: todo.id,
          label
        };
      });

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Todo to Edit`,
        data: {
          wizardType: 'edit_todo_selector',
          steps: [
            {
              id: 'todoId',
              label: 'Select Todo',
              type: 'select',
              required: true,
              options: todoOptions
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_todo_selector'
        }
      };
    }

    const identifier = parsed.args[0];
    const todo = this.findTodo(project.todos, identifier);

    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Todo not found: "${identifier}"`,
        suggestions: [
          '/view todos - See all todos with #IDs',
          '/help edit todo'
        ]
      };
    }

    // Check for direct flags (new syntax)
    const title = parsed.flags.get('title') as string;
    const content = parsed.flags.get('content') as string;
    const priority = parsed.flags.get('priority') as string;
    const status = parsed.flags.get('status') as string;
    const due = parsed.flags.get('due') as string;

    // If any flags are provided, update those fields
    if (title || content || priority || status || due) {
      let updated = false;

      if (title) {
        const validation = validateTodoText(title);
        if (!validation.isValid) {
          return {
            type: ResponseType.ERROR,
            message: validation.error || 'Invalid todo title',
            suggestions: ['/help edit todo']
          };
        }
        console.log(`[EDIT TODO] Updating title from "${todo.title}" to "${validation.sanitized}"`);
        todo.title = validation.sanitized!;
        updated = true;
      }

      if (content) {
        console.log(`[EDIT TODO] Updating description for todo "${todo.title}"`);
        todo.description = sanitizeText(content);
        updated = true;
      }

      if (priority) {
        if (!['low', 'medium', 'high'].includes(priority.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: 'Priority must be: low, medium, or high',
            suggestions: ['/help edit todo']
          };
        }
        console.log(`[EDIT TODO] Updating priority for todo "${todo.title}" to ${priority.toLowerCase()}`);
        todo.priority = priority.toLowerCase() as 'low' | 'medium' | 'high';
        updated = true;
      }

      if (status) {
        const validStatuses = ['not_started', 'in_progress', 'completed', 'blocked'];
        if (!validStatuses.includes(status.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: `Status must be one of: ${validStatuses.join(', ')}`,
            suggestions: ['/help edit todo']
          };
        }
        console.log(`[EDIT TODO] Updating status for todo "${todo.title}" to ${status.toLowerCase()}`);
        todo.status = status.toLowerCase() as any;
        updated = true;
      }

      if (due) {
        const dueDateParse = parseDueDate(due);
        if (!dueDateParse.isValid) {
          return {
            type: ResponseType.ERROR,
            message: `❌ ${dueDateParse.error}`,
            suggestions: [
              '/edit todo 1 --due="12-25-2025 8:00PM"',
              '/edit todo 1 --due="3-15 9:30AM" (defaults to current year)',
              '/edit todo 1 --due="12-31 21:00" (24-hour format)',
              '/help edit todo'
            ]
          };
        }
        console.log(`[EDIT TODO] Updating due date for todo "${todo.title}" to ${formatDueDate(dueDateParse.date!)}`);
        todo.dueDate = dueDateParse.date;
        updated = true;
      }

      if (updated) {
        try {
          console.log(`[EDIT TODO] Saving project "${project.name}" (ID: ${project._id})`);
          await project.save();
          console.log(`[EDIT TODO] Save successful for todo "${todo.title}"`);
        } catch (saveError) {
          console.error('[EDIT TODO] Save failed:', saveError);
          return {
            type: ResponseType.ERROR,
            message: `Failed to save todo: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
            suggestions: ['/help edit todo']
          };
        }

        return this.buildSuccessResponse(
          `✅ Updated todo: "${todo.title}"`,
          project,
          'edit_todo'
        );
      }
    }

    // No flags - return interactive wizard
    // Format dueDate for display if it exists
    let dueDateStr = '';
    if (todo.dueDate) {
      const month = todo.dueDate.getMonth() + 1;
      const day = todo.dueDate.getDate();
      const year = todo.dueDate.getFullYear();
      const hasTime = todo.dueDate.getHours() !== 0 || todo.dueDate.getMinutes() !== 0;

      dueDateStr = `${month}-${day}-${year}`;
      if (hasTime) {
        const timeStr = formatTime12Hour(todo.dueDate.getHours(), todo.dueDate.getMinutes());
        dueDateStr += ` ${timeStr}`;
      }
    }

    // Build steps array - only include subtasks if this is NOT a subtask itself
    const steps: any[] = [
      {
        id: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        value: todo.title
      },
      {
        id: 'content',
        label: 'Content',
        type: 'textarea',
        required: false,
        value: todo.description || ''
      },
      {
        id: 'priority',
        label: 'Priority',
        type: 'select',
        options: ['low', 'medium', 'high'],
        required: true,
        value: todo.priority
      },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: ['not_started', 'in_progress', 'completed', 'blocked'],
        required: true,
        value: todo.status
      },
      {
        id: 'due',
        label: 'Due Date',
        type: 'text',
        required: false,
        value: dueDateStr,
        placeholder: 'MM-DD-YYYY 8:00PM or MM-DD 21:00 (optional)'
      }
    ];

    // Only add subtasks field if this is a parent todo (not a subtask itself)
    if (!todo.parentTodoId) {
      const subtasks = project.todos.filter((t: any) => t.parentTodoId === todo.id);
      steps.push({
        id: 'subtasks',
        label: 'Subtasks',
        type: 'subtasks',
        required: false,
        value: subtasks.map((subtask: any) => ({
          id: subtask.id,
          title: subtask.title,
          description: subtask.description || '',
          priority: subtask.priority,
          status: subtask.status,
          completed: subtask.completed,
          dueDate: subtask.dueDate
        }))
      });
    }

    return {
      type: ResponseType.PROMPT,
      message: `✏️ Edit ${todo.parentTodoId ? 'Subtask' : 'Todo'}: "${todo.title}"`,
      data: {
        wizardType: 'edit_todo',
        todoId: todo.id,
        currentValues: {
          title: todo.title,
          content: todo.description || '',
          priority: todo.priority,
          status: todo.status,
          due: dueDateStr
        },
        steps
      },
      metadata: {
        projectId: project._id.toString(),
        action: 'edit_todo'
      }
    };
  }

  /**
   * Handle /edit subtask command - Edit an existing subtask
   */
  async handleEditSubtask(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // No args provided - show selector wizard
    if (parsed.args.length === 0) {
      const subtasks = project.todos.filter((t: any) => t.parentTodoId);

      if (subtasks.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No subtasks to edit',
          suggestions: ['/add subtask']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Subtask to Edit`,
        data: {
          wizardType: 'edit_subtask_selector',
          steps: [
            {
              id: 'subtaskId',
              label: 'Select Subtask',
              type: 'select',
              options: subtasks.map((s: any) => {
                const parent = project.todos.find((t: any) => t.id === s.parentTodoId);
                return {
                  value: s.id,
                  label: `${s.title} (parent: ${parent?.title || 'unknown'})`
                };
              }),
              required: true,
              placeholder: 'Select subtask to edit'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_subtask_selector'
        }
      };
    }

    // Need both parent index and subtask index
    if (parsed.args.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid syntax. Usage: /edit subtask <parent_index> <subtask_index>`,
        suggestions: [
          '/edit subtask 1 2 - Edit 2nd subtask of todo #1',
          '/edit subtask 1 2 --title="Updated title" - Direct edit',
          '/help edit subtask'
        ]
      };
    }

    const parentIndex = parseInt(parsed.args[0]);
    const subtaskIndex = parseInt(parsed.args[1]);

    // Validate parent index
    if (isNaN(parentIndex) || parentIndex < 1) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid parent todo index: "${parsed.args[0]}"`,
        suggestions: [
          '/view todos - See all todos with indices',
          '/edit subtask 1 2 - Example syntax',
          '/help edit subtask'
        ]
      };
    }

    // Get all parent todos (excluding subtasks)
    const parentTodos = project.todos.filter((t: any) => !t.parentTodoId);

    if (parentIndex > parentTodos.length) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Parent todo #${parentIndex} not found (only ${parentTodos.length} parent todos exist)`,
        suggestions: ['/view todos', '/help edit subtask']
      };
    }

    const parentTodo = parentTodos[parentIndex - 1];

    // Get subtasks for this parent
    const parentSubtasks = project.todos.filter((t: any) => t.parentTodoId === parentTodo.id);

    if (parentSubtasks.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Parent todo #${parentIndex} "${parentTodo.title}" has no subtasks`,
        suggestions: [
          `/add subtask "${parentTodo.title}" "subtask text"`,
          '/view todos',
          '/help edit subtask'
        ]
      };
    }

    // Validate subtask index
    if (isNaN(subtaskIndex) || subtaskIndex < 1) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid subtask index: "${parsed.args[1]}"`,
        suggestions: [
          `/view todos - Parent #${parentIndex} has ${parentSubtasks.length} subtask(s)`,
          '/edit subtask 1 2 - Example syntax',
          '/help edit subtask'
        ]
      };
    }

    if (subtaskIndex > parentSubtasks.length) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Subtask #${subtaskIndex} not found (parent #${parentIndex} only has ${parentSubtasks.length} subtask(s))`,
        suggestions: [
          '/view todos',
          '/help edit subtask'
        ]
      };
    }

    const subtask = parentSubtasks[subtaskIndex - 1];

    // Check for direct flags (new syntax)
    const title = parsed.flags.get('title') as string;
    const content = parsed.flags.get('content') as string;
    const priority = parsed.flags.get('priority') as string;
    const status = parsed.flags.get('status') as string;
    const due = parsed.flags.get('due') as string;

    // If any flags are provided, update those fields
    if (title || content || priority || status || due) {
      let updated = false;

      if (title) {
        const validation = validateTodoText(title);
        if (!validation.isValid) {
          return {
            type: ResponseType.ERROR,
            message: validation.error || 'Invalid subtask title',
            suggestions: ['/help edit subtask']
          };
        }
        console.log(`[EDIT SUBTASK] Updating title from "${subtask.title}" to "${validation.sanitized}"`);
        subtask.title = validation.sanitized!;
        updated = true;
      }

      if (content) {
        console.log(`[EDIT SUBTASK] Updating description for subtask "${subtask.title}"`);
        subtask.description = sanitizeText(content);
        updated = true;
      }

      if (priority) {
        if (!['low', 'medium', 'high'].includes(priority.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: 'Priority must be: low, medium, or high',
            suggestions: ['/help edit subtask']
          };
        }
        console.log(`[EDIT SUBTASK] Updating priority for subtask "${subtask.title}" to ${priority.toLowerCase()}`);
        subtask.priority = priority.toLowerCase() as 'low' | 'medium' | 'high';
        updated = true;
      }

      if (status) {
        const validStatuses = ['not_started', 'in_progress', 'completed', 'blocked'];
        if (!validStatuses.includes(status.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: `Status must be one of: ${validStatuses.join(', ')}`,
            suggestions: ['/help edit subtask']
          };
        }
        console.log(`[EDIT SUBTASK] Updating status for subtask "${subtask.title}" to ${status.toLowerCase()}`);
        subtask.status = status.toLowerCase() as any;
        updated = true;
      }

      if (due) {
        const dueDateParse = parseDueDate(due);
        if (!dueDateParse.isValid) {
          return {
            type: ResponseType.ERROR,
            message: `❌ ${dueDateParse.error}`,
            suggestions: [
              '/edit subtask 1 --due="12-25-2025 8:00PM"',
              '/edit subtask 1 --due="3-15 9:30AM" (defaults to current year)',
              '/edit subtask 1 --due="12-31 21:00" (24-hour format)',
              '/help edit subtask'
            ]
          };
        }
        console.log(`[EDIT SUBTASK] Updating due date for subtask "${subtask.title}" to ${formatDueDate(dueDateParse.date!)}`);
        subtask.dueDate = dueDateParse.date;
        updated = true;
      }

      if (updated) {
        try {
          console.log(`[EDIT SUBTASK] Saving project "${project.name}" (ID: ${project._id})`);
          await project.save();
          console.log(`[EDIT SUBTASK] Save successful for subtask "${subtask.title}"`);
        } catch (saveError) {
          console.error('[EDIT SUBTASK] Save failed:', saveError);
          return {
            type: ResponseType.ERROR,
            message: `Failed to save subtask: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
            suggestions: ['/help edit subtask']
          };
        }

        return this.buildSuccessResponse(
          `✅ Updated subtask: "${subtask.title}"`,
          project,
          'edit_subtask'
        );
      }
    }

    // No flags - return interactive wizard
    // Format dueDate for display if it exists
    let dueDateStr = '';
    if (subtask.dueDate) {
      const month = subtask.dueDate.getMonth() + 1;
      const day = subtask.dueDate.getDate();
      const year = subtask.dueDate.getFullYear();
      const hasTime = subtask.dueDate.getHours() !== 0 || subtask.dueDate.getMinutes() !== 0;

      dueDateStr = `${month}-${day}-${year}`;
      if (hasTime) {
        const timeStr = formatTime12Hour(subtask.dueDate.getHours(), subtask.dueDate.getMinutes());
        dueDateStr += ` ${timeStr}`;
      }
    }

    return {
      type: ResponseType.PROMPT,
      message: `✏️ Edit Subtask: "${subtask.title}"`,
      data: {
        wizardType: 'edit_subtask',
        subtaskId: subtask.id,
        parentTodoId: subtask.parentTodoId,
        currentValues: {
          title: subtask.title,
          content: subtask.description || '',
          priority: subtask.priority,
          status: subtask.status,
          due: dueDateStr
        },
        steps: [
          {
            id: 'title',
            label: 'Title',
            type: 'text',
            required: true,
            value: subtask.title
          },
          {
            id: 'content',
            label: 'Content',
            type: 'textarea',
            required: false,
            value: subtask.description || ''
          },
          {
            id: 'priority',
            label: 'Priority',
            type: 'select',
            options: ['low', 'medium', 'high'],
            required: true,
            value: subtask.priority
          },
          {
            id: 'status',
            label: 'Status',
            type: 'select',
            options: ['not_started', 'in_progress', 'completed', 'blocked'],
            required: true,
            value: subtask.status
          },
          {
            id: 'due',
            label: 'Due Date',
            type: 'text',
            required: false,
            value: dueDateStr,
            placeholder: 'MM-DD-YYYY 8:00PM or MM-DD 21:00 (optional)'
          }
        ]
      },
      metadata: {
        projectId: project._id.toString(),
        action: 'edit_subtask'
      }
    };
  }

  /**
   * Handle /edit note command - Edit an existing note
   */
  async handleEditNote(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // If no args, show selector wizard
    if (parsed.args.length === 0) {
      const notes = project.notes || [];

      if (notes.length === 0) {
        return {
          type: ResponseType.INFO,
          message: `📝 No notes found in ${project.name}`,
          suggestions: [`/add note`, `/add note --title="Note Title" --content="Content"`]
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Note to Edit`,
        data: {
          wizardType: 'edit_note_selector',
          steps: [
            {
              id: 'noteId',
              label: 'Select Note',
              type: 'select',
              required: true,
              options: notes.map((note: any) => ({
                value: note.id,
                label: `${note.title} - ${note.content?.slice(0, 50) || ''}${note.content?.length > 50 ? '...' : ''}`
              }))
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_note_selector'
        }
      };
    }

    const identifier = parsed.args[0];
    const note = this.findNote(project.notes, identifier);

    if (!note) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Note not found: "${identifier}"`,
        suggestions: [
          '/view notes - See all notes with #IDs',
          '/help edit note'
        ]
      };
    }

    // Check for direct flags (new syntax)
    const title = parsed.flags.get('title') as string;
    const content = parsed.flags.get('content') as string;

    // If any flags are provided, update those fields
    if (title || content) {
      let updated = false;

      if (title) {
        const sanitizedTitle = sanitizeText(title);
        console.log(`[EDIT NOTE] Updating title from "${note.title}" to "${sanitizedTitle}"`);
        note.title = sanitizedTitle;
        updated = true;
      }

      if (content) {
        console.log(`[EDIT NOTE] Updating content for note "${note.title}"`);
        note.content = sanitizeText(content);
        updated = true;
      }

      if (updated) {
        note.updatedAt = new Date();

        try {
          console.log(`[EDIT NOTE] Saving project "${project.name}" (ID: ${project._id})`);
          await project.save();
          console.log(`[EDIT NOTE] Save successful for note "${note.title}"`);
        } catch (saveError) {
          console.error('[EDIT NOTE] Save failed:', saveError);
          return {
            type: ResponseType.ERROR,
            message: `Failed to save note: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
            suggestions: ['/help edit note']
          };
        }

        return this.buildSuccessResponse(
          `📝 Updated note: "${note.title}"`,
          project,
          'edit_note'
        );
      }
    }

    // No flags - return interactive wizard
    return {
      type: ResponseType.PROMPT,
      message: `✏️ Edit Note: "${note.title}"`,
      data: {
        wizardType: 'edit_note',
        noteId: note.id,
        currentValues: {
          title: note.title,
          content: note.content
        },
        steps: [
          {
            id: 'title',
            label: 'Note Title',
            type: 'text',
            required: true,
            value: note.title
          },
          {
            id: 'content',
            label: 'Content',
            type: 'textarea',
            required: true,
            value: note.content
          }
        ]
      },
      metadata: {
        projectId: project._id.toString(),
        action: 'edit_note'
      }
    };
  }

  /**
   * Handle /edit devlog command - Edit an existing dev log entry
   */
  async handleEditDevLog(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // If no args, show selector wizard
    if (parsed.args.length === 0) {
      const entries = project.devLog || [];

      if (entries.length === 0) {
        return {
          type: ResponseType.INFO,
          message: `📓 No dev log entries found in ${project.name}`,
          suggestions: [`/add devlog`, `/push "Implemented feature X"`]
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Dev Log Entry to Edit`,
        data: {
          wizardType: 'edit_devlog_selector',
          steps: [
            {
              id: 'entryId',
              label: 'Select Entry',
              type: 'select',
              required: true,
              options: entries.map((entry: any) => ({
                value: entry.id,
                label: `${entry.title ? entry.title + ' - ' : ''}${entry.description?.slice(0, 50) || ''}${entry.description?.length > 50 ? '...' : ''}`
              }))
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_devlog_selector'
        }
      };
    }

    const identifier = parsed.args[0];
    const entry = this.findDevLogEntry(project.devLog, identifier);

    if (!entry) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Dev log entry not found: "${identifier}"`,
        suggestions: [
          '/view devlog - See all entries with #IDs',
          '/help edit devlog'
        ]
      };
    }

    // Check for direct flags (new syntax)
    const title = parsed.flags.get('title') as string;
    const content = parsed.flags.get('content') as string;

    // If any flags are provided, update those fields
    if (title || content) {
      let updated = false;

      if (title) {
        const sanitizedTitle = sanitizeText(title);
        console.log(`[EDIT DEVLOG] Updating title to "${sanitizedTitle}"`);
        entry.title = sanitizedTitle;
        updated = true;
      }

      if (content) {
        console.log(`[EDIT DEVLOG] Updating description`);
        entry.description = sanitizeText(content);
        updated = true;
      }

      if (updated) {
        entry.date = new Date();

        try {
          console.log(`[EDIT DEVLOG] Saving project "${project.name}" (ID: ${project._id})`);
          await project.save();
          console.log(`[EDIT DEVLOG] Save successful`);
        } catch (saveError) {
          console.error('[EDIT DEVLOG] Save failed:', saveError);
          return {
            type: ResponseType.ERROR,
            message: `Failed to save dev log: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
            suggestions: ['/help edit devlog']
          };
        }

        return this.buildSuccessResponse(
          `📋 Updated dev log entry`,
          project,
          'edit_devlog'
        );
      }
    }

    // No flags - return interactive wizard
    return {
      type: ResponseType.PROMPT,
      message: `✏️ Edit Dev Log Entry`,
      data: {
        wizardType: 'edit_devlog',
        entryId: entry.id,
        currentValues: {
          title: entry.title || '',
          content: entry.description || ''
        },
        steps: [
          {
            id: 'title',
            label: 'Title',
            type: 'text',
            required: false,
            value: entry.title || ''
          },
          {
            id: 'content',
            label: 'Content',
            type: 'textarea',
            required: true,
            value: entry.description || ''
          }
        ]
      },
      metadata: {
        projectId: project._id.toString(),
        action: 'edit_devlog'
      }
    };
  }

  /**
   * Handle /edit component command - Edit an existing component
   */
  async handleEditComponent(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // If no args, show selector wizard
    if (parsed.args.length === 0) {
      const components = project.components || [];

      if (components.length === 0) {
        return {
          type: ResponseType.INFO,
          message: `📦 No components found in ${project.name}`,
          suggestions: [`/add component`, `/add component --title="Component Name" --type="feature"`]
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Component to Edit`,
        data: {
          wizardType: 'edit_component_selector',
          steps: [
            {
              id: 'componentId',
              label: 'Select Component',
              type: 'select',
              required: true,
              options: components.map((comp: any) => ({
                value: comp.id,
                label: `${comp.category || 'Uncategorized'} • ${comp.title} [${comp.type}]`
              }))
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_component_selector'
        }
      };
    }

    const identifier = parsed.args[0];
    const component = this.findComponent(project.components, identifier);

    if (!component) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Component not found: "${identifier}"`,
        suggestions: [
          '/view components - See all components with #IDs',
          '/help edit component'
        ]
      };
    }

    // Check for field flags - direct update mode
    const field = parsed.flags.get('field') as string;
    const content = parsed.flags.get('content') as string;

    // Check for relationship management flags
    if (field === 'relationship' || field === 'relationships') {
      const action = parsed.flags.get('action') as string;
      const relId = parsed.flags.get('id') as string;
      const target = parsed.flags.get('target') as string;
      const relType = parsed.flags.get('type') as string;
      const description = parsed.flags.get('description') as string;

      if (!action || !['add', 'edit', 'delete'].includes(action.toLowerCase())) {
        return {
          type: ResponseType.ERROR,
          message: '❌ Relationship management requires --action=add|edit|delete (note: edit = delete + add)',
          suggestions: [
            '/edit component 1 --field=relationship --action=add --target=2 --type=uses',
            '/edit component 1 --field=relationship --action=delete --id=1'
          ]
        };
      }

      const actionLower = action.toLowerCase();

      // Add relationship
      if (actionLower === 'add') {
        if (!target || !relType) {
          return {
            type: ResponseType.ERROR,
            message: '❌ Adding relationship requires --target and --type',
            suggestions: ['/edit component 1 --field=relationship --action=add --target=2 --type=uses']
          };
        }

        const targetComponent = this.findComponent(project.components, target);
        if (!targetComponent) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Target component not found: "${target}"`,
            suggestions: ['/view components']
          };
        }

        const validTypes = ['uses', 'implements', 'extends', 'depends_on', 'calls', 'contains', 'mentions', 'similar'];
        if (!validTypes.includes(relType.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Invalid relationship type. Valid: ${validTypes.join(', ')}`,
            suggestions: ['/help edit component']
          };
        }

        if (!component.relationships) {
          component.relationships = [];
        }

        if (component.relationships.some((r: any) => r.targetId === targetComponent.id)) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Relationship already exists to "${targetComponent.title}". To change it, delete and re-add with new type.`,
            suggestions: [
              `/edit component "${component.title}" --field=relationship --action=delete --id=<relationship-id>`,
              `/edit component "${component.title}" --field=relationship --action=add --target=${targetComponent.id} --type=${relType}`
            ]
          };
        }

        component.relationships.push({
          id: uuidv4(),
          targetId: targetComponent.id,
          relationType: relType.toLowerCase() as any,
          description: sanitizeText(description || '')
        });

        component.updatedAt = new Date();
        await project.save();

        return this.buildSuccessResponse(
          `✅ Added ${relType} relationship: "${component.title}" → "${targetComponent.title}"`,
          project,
          'edit_component'
        );
      }

      // Edit relationship (implemented as delete + add)
      if (actionLower === 'edit') {
        if (!relId) {
          return {
            type: ResponseType.ERROR,
            message: '❌ Editing relationship requires --id. Note: This performs delete + add behind the scenes.',
            suggestions: ['/edit component 1 --field=relationship --action=edit --id=1 --type=depends_on']
          };
        }

        if (!component.relationships || component.relationships.length === 0) {
          return {
            type: ResponseType.ERROR,
            message: `❌ No relationships found for "${component.title}"`,
            suggestions: []
          };
        }

        let relationship: any = null;
        const relIndex = parseInt(relId);
        if (!isNaN(relIndex) && relIndex > 0 && relIndex <= component.relationships.length) {
          relationship = component.relationships[relIndex - 1];
        } else {
          relationship = component.relationships.find((r: any) => r.id === relId);
        }

        if (!relationship) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Relationship not found: "${relId}"`,
            suggestions: [`/view relationships "${component.title}"`]
          };
        }

        if (relType) {
          const validTypes = ['uses', 'implements', 'extends', 'depends_on', 'calls', 'contains', 'mentions', 'similar'];
          if (!validTypes.includes(relType.toLowerCase())) {
            return {
              type: ResponseType.ERROR,
              message: `❌ Invalid relationship type. Valid: ${validTypes.join(', ')}`,
              suggestions: ['/help edit component']
            };
          }
          relationship.relationType = relType.toLowerCase();
        }

        if (description) {
          relationship.description = sanitizeText(description);
        }

        component.updatedAt = new Date();
        await project.save();

        const targetComp = project.components.find((c: any) => c.id === relationship.targetId);
        return this.buildSuccessResponse(
          `✅ Updated relationship to "${targetComp?.title || 'unknown'}"`,
          project,
          'edit_component'
        );
      }

      // Delete relationship
      if (actionLower === 'delete') {
        if (!relId) {
          return {
            type: ResponseType.ERROR,
            message: '❌ Deleting relationship requires --id',
            suggestions: ['/edit component 1 --field=relationship --action=delete --id=1']
          };
        }

        if (!component.relationships || component.relationships.length === 0) {
          return {
            type: ResponseType.ERROR,
            message: `❌ No relationships found for "${component.title}"`,
            suggestions: []
          };
        }

        let relationshipIndex = -1;
        const relIndex = parseInt(relId);
        if (!isNaN(relIndex) && relIndex > 0 && relIndex <= component.relationships.length) {
          relationshipIndex = relIndex - 1;
        } else {
          relationshipIndex = component.relationships.findIndex((r: any) => r.id === relId);
        }

        if (relationshipIndex === -1) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Relationship not found: "${relId}"`,
            suggestions: []
          };
        }

        const relationship = component.relationships[relationshipIndex];
        const targetComp = project.components.find((c: any) => c.id === relationship.targetId);

        component.relationships.splice(relationshipIndex, 1);
        component.updatedAt = new Date();
        await project.save();

        return this.buildSuccessResponse(
          `🗑️  Deleted ${relationship.relationType} relationship to "${targetComp?.title || 'unknown'}"`,
          project,
          'edit_component'
        );
      }
    }

    // Check for direct flags (new syntax) - basic field editing
    const title = parsed.flags.get('title') as string;
    const contentFlag = parsed.flags.get('content') as string;
    const feature = parsed.flags.get('feature') as string;
    const category = parsed.flags.get('category') as string;
    const type = parsed.flags.get('type') as string;

    // If any basic field flags are provided, update those fields
    if (title || contentFlag || feature || category || type) {
      let updated = false;
      const updatedFields: string[] = [];

      if (title) {
        const sanitizedTitle = sanitizeText(title);
        console.log(`[EDIT COMPONENT] Updating title from "${component.title}" to "${sanitizedTitle}"`);
        component.title = sanitizedTitle;
        updated = true;
        updatedFields.push('title');
      }

      if (contentFlag) {
        console.log(`[EDIT COMPONENT] Updating content for component "${component.title}"`);
        component.content = sanitizeText(contentFlag);
        updated = true;
        updatedFields.push('content');
      }

      if (feature) {
        const sanitizedFeature = sanitizeText(feature);
        console.log(`[EDIT COMPONENT] Updating feature for component "${component.title}" to "${sanitizedFeature}"`);
        component.feature = sanitizedFeature;
        updated = true;
        updatedFields.push('feature');
      }

      if (category) {
        const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];
        if (!validCategories.includes(category.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Invalid category: "${category}". Valid categories: ${validCategories.join(', ')}`,
            suggestions: ['/help edit component']
          };
        }
        console.log(`[EDIT COMPONENT] Updating category for component "${component.title}" to "${category.toLowerCase()}"`);
        component.category = category.toLowerCase() as any;
        updated = true;
        updatedFields.push('category');
      }

      if (type) {
        const sanitizedType = sanitizeText(type);
        console.log(`[EDIT COMPONENT] Updating type for component "${component.title}" to "${sanitizedType}"`);
        component.type = sanitizedType;
        updated = true;
        updatedFields.push('type');
      }

      if (updated) {
        component.updatedAt = new Date();

        try {
          console.log(`[EDIT COMPONENT] Saving project "${project.name}" (ID: ${project._id})`);
          await project.save();
          console.log(`[EDIT COMPONENT] Save successful for component "${component.title}"`);
        } catch (saveError) {
          console.error('[EDIT COMPONENT] Save failed:', saveError);
          return {
            type: ResponseType.ERROR,
            message: `Failed to save component: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
            suggestions: ['/help edit component']
          };
        }

        return this.buildSuccessResponse(
          `🧩 Updated component (${updatedFields.join(', ')}): "${component.title}"`,
          project,
          'edit_component'
        );
      }
    }

    // Old --field=... --content=... syntax is now deprecated for basic fields
    // Keep it only for relationship management (already handled above)
    if (field && content && !['relationship', 'relationships'].includes(field)) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use direct flag syntax for basic fields.',
        suggestions: [
          '/edit component 1 --title="new title"',
          '/edit component 1 --content="new content" --category=backend',
          '/edit component 1 --feature="NewFeature" --type=service',
          '💡 For relationships, use: --field=relationship --action=add|edit|delete',
          '/help edit component'
        ]
      };
    }

    // No field flags - return interactive wizard with all fields including category, type, and relationships
    const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];

    // Get available types based on current category (simplified - frontend will use these as examples)
    const typesByCategory: Record<string, string[]> = {
      frontend: ['page', 'component', 'hook', 'context', 'layout', 'util', 'custom'],
      backend: ['service', 'route', 'model', 'controller', 'middleware', 'util', 'custom'],
      database: ['schema', 'migration', 'seed', 'query', 'index', 'custom'],
      infrastructure: ['deployment', 'cicd', 'env', 'config', 'monitoring', 'docker', 'custom'],
      security: ['auth', 'authz', 'encryption', 'validation', 'sanitization', 'custom'],
      api: ['client', 'integration', 'webhook', 'contract', 'graphql', 'custom'],
      documentation: ['area', 'section', 'guide', 'architecture', 'api-doc', 'readme', 'changelog', 'custom'],
      asset: ['image', 'font', 'video', 'audio', 'document', 'dependency', 'custom']
    };

    const currentTypes = typesByCategory[component.category] || ['custom'];

    return {
      type: ResponseType.PROMPT,
      message: `✏️ Edit Component: "${component.title}"`,
      data: {
        wizardType: 'edit_component',
        componentId: component.id,
        currentValues: {
          title: component.title,
          content: component.content,
          feature: component.feature,
          category: component.category,
          type: component.type,
          relationships: component.relationships || []
        },
        steps: [
          {
            id: 'title',
            label: 'Component Title',
            type: 'text',
            required: true,
            value: component.title
          },
          {
            id: 'feature',
            label: 'Feature',
            type: 'text',
            required: true,
            value: component.feature
          },
          {
            id: 'category',
            label: 'Category',
            type: 'select',
            options: validCategories,
            required: true,
            value: component.category
          },
          {
            id: 'type',
            label: 'Type',
            type: 'select',
            options: currentTypes,
            required: true,
            value: component.type,
            dependsOn: 'category'
          },
          {
            id: 'content',
            label: 'Content',
            type: 'textarea',
            required: true,
            value: component.content
          },
          {
            id: 'relationships',
            label: 'Relationships',
            type: 'relationships',
            required: false,
            value: component.relationships || [],
            availableComponents: project.components
              .filter((c: any) => c.id !== component.id)
              .map((c: any) => ({ id: c.id, title: c.title, category: c.category, type: c.type }))
          }
        ]
      },
      metadata: {
        projectId: project._id.toString(),
        action: 'edit_component'
      }
    };
  }

  /**
   * Handle /delete todo command - Delete a todo with confirmation
   */
  async handleDeleteTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const todoIdentifier = parsed.args.join(' ').trim();

    // No identifier provided - show selector wizard
    if (!todoIdentifier) {
      const todos = project.todos.filter((t: any) => !t.parentTodoId); // Don't include subtasks in selector

      if (todos.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No todos to delete',
          suggestions: ['/add todo']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Todo to Delete`,
        data: {
          wizardType: 'delete_todo_selector',
          steps: [
            {
              id: 'todoId',
              label: 'Select Todo',
              type: 'select',
              options: todos.map((t: any) => ({
                value: t.id,
                label: `${t.title}${t.completed ? ' ✓' : ''}`
              })),
              required: true,
              placeholder: 'Select todo to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_todo_selector'
        }
      };
    }

    // Filter out subtasks - only allow deleting parent todos via numeric index
    const todo = this.findTodo(
      project.todos.filter((t: any) => !t.parentTodoId),
      todoIdentifier
    );

    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/delete subtask', '/help delete todo']
      };
    }

    // Check for confirmation flag
    const hasConfirmation = parsed.flags.has('confirm') || parsed.flags.has('yes') || parsed.flags.has('y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_todo_confirm',
          confirmationData: {
            itemTitle: todo.title,
            itemType: 'todo',
            command: `/delete todo "${todo.title}" --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete the todo "${todo.title}"?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_todo_confirm'
        }
      };
    }

    // Delete the todo and any subtasks
    const todoTitle = todo.title;
    project.todos = project.todos.filter((t: any) =>
      t.id !== todo.id && t.parentTodoId !== todo.id
    );
    await project.save();

    return this.buildSuccessResponse(
      `🗑️  Deleted todo: "${todoTitle}"`,
      project,
      'delete_todo'
    );
  }

  /**
   * Handle /delete note command - Delete a note with confirmation
   */
  async handleDeleteNote(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const noteIdentifier = parsed.args.join(' ').trim();

    // No identifier provided - show selector wizard
    if (!noteIdentifier) {
      if (project.notes.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No notes to delete',
          suggestions: ['/add note']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Note to Delete`,
        data: {
          wizardType: 'delete_note_selector',
          steps: [
            {
              id: 'noteId',
              label: 'Select Note',
              type: 'select',
              options: project.notes.map((n: any) => ({
                value: n.id,
                label: n.title
              })),
              required: true,
              placeholder: 'Select note to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_note_selector'
        }
      };
    }

    const note = this.findNote(project.notes, noteIdentifier);

    if (!note) {
      return {
        type: ResponseType.ERROR,
        message: `Note not found: "${noteIdentifier}"`,
        suggestions: ['/view notes', '/help delete note']
      };
    }

    const hasConfirmation = parsed.flags.has('confirm') || parsed.flags.has('yes') || parsed.flags.has('y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_note_confirm',
          confirmationData: {
            itemTitle: note.title,
            itemType: 'note',
            command: `/delete note "${note.title}" --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete the note "${note.title}"?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_note_confirm'
        }
      };
    }

    const noteTitle = note.title;
    project.notes = project.notes.filter((n: any) => n.id !== note.id);
    await project.save();

    return this.buildSuccessResponse(
      `🗑️  Deleted note: "${noteTitle}"`,
      project,
      'delete_note'
    );
  }

  /**
   * Handle /delete devlog command - Delete a dev log entry with confirmation
   */
  async handleDeleteDevLog(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const identifier = parsed.args.join(' ').trim();

    // No identifier provided - show selector wizard
    if (!identifier) {
      if (project.devLog.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No devlog entries to delete',
          suggestions: ['/add devlog']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Devlog Entry to Delete`,
        data: {
          wizardType: 'delete_devlog_selector',
          steps: [
            {
              id: 'entryId',
              label: 'Select Entry',
              type: 'select',
              options: project.devLog.map((e: any) => ({
                value: e.id,
                label: e.title || e.description?.substring(0, 50) || 'Untitled entry'
              })),
              required: true,
              placeholder: 'Select devlog entry to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_devlog_selector'
        }
      };
    }

    const entry = this.findDevLogEntry(project.devLog, identifier);

    if (!entry) {
      return {
        type: ResponseType.ERROR,
        message: `Dev log entry not found: "${identifier}"`,
        suggestions: ['/view devlog', '/help delete devlog']
      };
    }

    const hasConfirmation = parsed.flags.has('confirm') || parsed.flags.has('yes') || parsed.flags.has('y');

    if (!hasConfirmation) {
      const entryTitle = entry.title || entry.description?.substring(0, 50) || 'Untitled entry';
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_devlog_confirm',
          confirmationData: {
            itemTitle: entryTitle,
            itemType: 'dev log entry',
            command: `/delete devlog ${identifier} --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete this dev log entry?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_devlog_confirm'
        }
      };
    }

    project.devLog = project.devLog.filter((e: any) => e.id !== entry.id);
    await project.save();

    return this.buildSuccessResponse(
      `🗑️  Deleted dev log entry`,
      project,
      'delete_devlog'
    );
  }

  /**
   * Handle /delete component command - Delete a component with confirmation
   */
  async handleDeleteComponent(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const componentIdentifier = parsed.args.join(' ').trim();

    // No identifier provided - show selector wizard
    if (!componentIdentifier) {
      if (project.components.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No components to delete',
          suggestions: ['/add component']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Component to Delete`,
        data: {
          wizardType: 'delete_component_selector',
          steps: [
            {
              id: 'componentId',
              label: 'Select Component',
              type: 'select',
              options: project.components.map((c: any) => ({
                value: c.id,
                label: `${c.title} (${c.category})`
              })),
              required: true,
              placeholder: 'Select component to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_component_selector'
        }
      };
    }

    const component = this.findComponent(project.components, componentIdentifier);

    if (!component) {
      return {
        type: ResponseType.ERROR,
        message: `Component not found: "${componentIdentifier}"`,
        suggestions: ['/view components', '/help delete component']
      };
    }

    const hasConfirmation = parsed.flags.has('confirm') || parsed.flags.has('yes') || parsed.flags.has('y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_component_confirm',
          confirmationData: {
            itemTitle: component.title,
            itemType: 'component',
            command: `/delete component "${component.title}" --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete the component "${component.title}"?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_component_confirm'
        }
      };
    }

    const componentTitle = component.title;
    const componentId = component.id;

    // Remove the component itself
    project.components = project.components.filter((c: any) => c.id !== componentId);

    // Clean up orphaned relationships: remove all relationships FROM other components TO this deleted component
    let orphanedRelationshipsCount = 0;
    project.components.forEach((c: any) => {
      if (c.relationships && c.relationships.length > 0) {
        const originalCount = c.relationships.length;
        c.relationships = c.relationships.filter((r: any) => r.targetId !== componentId);
        const removedCount = originalCount - c.relationships.length;
        if (removedCount > 0) {
          orphanedRelationshipsCount += removedCount;
          c.updatedAt = new Date();
        }
      }
    });

    await project.save();

    const message = orphanedRelationshipsCount > 0
      ? `🗑️  Deleted component: "${componentTitle}" and removed ${orphanedRelationshipsCount} orphaned relationship${orphanedRelationshipsCount > 1 ? 's' : ''}`
      : `🗑️  Deleted component: "${componentTitle}"`;

    return this.buildSuccessResponse(
      message,
      project,
      'delete_component'
    );
  }

  /**
   * Handle /delete subtask command - Delete a subtask with confirmation
   */
  async handleDeleteSubtask(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // No args provided - show selector wizard
    if (parsed.args.length === 0) {
      const subtasks = project.todos.filter((t: any) => t.parentTodoId);

      if (subtasks.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No subtasks to delete',
          suggestions: ['/add subtask']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Subtask to Delete`,
        data: {
          wizardType: 'delete_subtask_selector',
          steps: [
            {
              id: 'subtaskId',
              label: 'Select Subtask',
              type: 'select',
              options: subtasks.map((s: any) => {
                const parent = project.todos.find((t: any) => t.id === s.parentTodoId);
                return {
                  value: s.id,
                  label: `${s.title} (parent: ${parent?.title || 'unknown'})`
                };
              }),
              required: true,
              placeholder: 'Select subtask to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_subtask_selector'
        }
      };
    }

    // Need both parent index and subtask index
    if (parsed.args.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid syntax. Usage: /delete subtask <parent_index> <subtask_index>`,
        suggestions: [
          '/delete subtask 1 2 - Delete 2nd subtask of todo #1',
          '/delete subtask 1 2 --confirm - Skip confirmation',
          '/help delete subtask'
        ]
      };
    }

    const parentIndex = parseInt(parsed.args[0]);
    const subtaskIndex = parseInt(parsed.args[1]);

    // Validate parent index
    if (isNaN(parentIndex) || parentIndex < 1) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid parent todo index: "${parsed.args[0]}"`,
        suggestions: [
          '/view todos - See all todos with indices',
          '/delete subtask 1 2 - Example syntax',
          '/help delete subtask'
        ]
      };
    }

    // Get all parent todos (excluding subtasks)
    const parentTodos = project.todos.filter((t: any) => !t.parentTodoId);

    if (parentIndex > parentTodos.length) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Parent todo #${parentIndex} not found (only ${parentTodos.length} parent todos exist)`,
        suggestions: ['/view todos', '/help delete subtask']
      };
    }

    const parentTodo = parentTodos[parentIndex - 1];

    // Get subtasks for this parent
    const parentSubtasks = project.todos.filter((t: any) => t.parentTodoId === parentTodo.id);

    if (parentSubtasks.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Parent todo #${parentIndex} "${parentTodo.title}" has no subtasks`,
        suggestions: [
          '/view todos',
          '/help delete subtask'
        ]
      };
    }

    // Validate subtask index
    if (isNaN(subtaskIndex) || subtaskIndex < 1) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid subtask index: "${parsed.args[1]}"`,
        suggestions: [
          `/view todos - Parent #${parentIndex} has ${parentSubtasks.length} subtask(s)`,
          '/delete subtask 1 2 - Example syntax',
          '/help delete subtask'
        ]
      };
    }

    if (subtaskIndex > parentSubtasks.length) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Subtask #${subtaskIndex} not found (parent #${parentIndex} only has ${parentSubtasks.length} subtask(s))`,
        suggestions: [
          '/view todos',
          '/help delete subtask'
        ]
      };
    }

    const subtask = parentSubtasks[subtaskIndex - 1];

    const hasConfirmation = parsed.flags.has('confirm') || parsed.flags.has('yes') || parsed.flags.has('y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_subtask_confirm',
          confirmationData: {
            itemTitle: subtask.title,
            itemType: 'subtask',
            command: `/delete subtask ${parentIndex} ${subtaskIndex} --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete the subtask "${subtask.title}"?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_subtask_confirm'
        }
      };
    }

    const subtaskTitle = subtask.title;
    project.todos = project.todos.filter((t: any) => t.id !== subtask.id);
    await project.save();

    return this.buildSuccessResponse(
      `🗑️  Deleted subtask: "${subtaskTitle}"`,
      project,
      'delete_subtask'
    );
  }

  /**
   * Find a note by UUID, index, or title
   */
  private findNote(notes: any[], identifier: string): any | null {
    // Try to find by UUID (exact match) - PRIORITY 1
    const byUuid = notes.find((note: any) => note.id === identifier);
    if (byUuid) {
      console.log(`[FIND NOTE] Found by UUID: ${identifier}`);
      return byUuid;
    }

    // Try to find by index (1-based) - PRIORITY 2
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= notes.length) {
      console.log(`[FIND NOTE] Found by index: ${index}`);
      return notes[index - 1];
    }

    // Try to find by partial title match (case insensitive) - PRIORITY 3
    const identifierLower = identifier.toLowerCase();
    const byTitle = notes.find((note: any) =>
      note.title.toLowerCase().includes(identifierLower)
    );
    if (byTitle) {
      console.log(`[FIND NOTE] Found by title match: ${identifier}`);
    } else {
      console.log(`[FIND NOTE] Not found: ${identifier}`);
    }
    return byTitle || null;
  }

  /**
   * Find a dev log entry by UUID, index, or content
   */
  private findDevLogEntry(devLog: any[], identifier: string): any | null {
    // Try to find by UUID (exact match) - PRIORITY 1
    const byUuid = devLog.find((entry: any) => entry.id === identifier);
    if (byUuid) {
      console.log(`[FIND DEVLOG] Found by UUID: ${identifier}`);
      return byUuid;
    }

    // Try to find by index (1-based) - PRIORITY 2
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= devLog.length) {
      console.log(`[FIND DEVLOG] Found by index: ${index}`);
      return devLog[index - 1];
    }

    // Try to find by partial description match (case insensitive) - PRIORITY 3
    const identifierLower = identifier.toLowerCase();
    const byDescription = devLog.find((entry: any) =>
      entry.description && entry.description.toLowerCase().includes(identifierLower)
    );
    if (byDescription) {
      console.log(`[FIND DEVLOG] Found by description match: ${identifier}`);
    } else {
      console.log(`[FIND DEVLOG] Not found: ${identifier}`);
    }
    return byDescription || null;
  }

  /**
   * Find a component by ID, UUID, index, or title
   */
  private findComponent(components: any[], identifier: string): any | null {
    // Try to find by UUID (exact match)
    const byUuid = components.find((component: any) => component.id === identifier);
    if (byUuid) return byUuid;

    // Try to find by numeric index (1-based)
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= components.length) {
      return components[index - 1];
    }

    // Try to find by partial title match (case insensitive)
    const identifierLower = identifier.toLowerCase();
    return components.find((component: any) =>
      component.title.toLowerCase().includes(identifierLower)
    ) || null;
  }

  /**
   * Find a todo by UUID, index, or text
   */
  private findTodo(todos: any[], identifier: string): any | null {
    // Try to find by UUID (exact match) - PRIORITY 1
    const byUuid = todos.find((todo: any) => todo.id === identifier);
    if (byUuid) {
      console.log(`[FIND TODO] Found by UUID: ${identifier}`);
      return byUuid;
    }

    // Try to find by index (1-based) - PRIORITY 2
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= todos.length) {
      console.log(`[FIND TODO] Found by index: ${index}`);
      return todos[index - 1];
    }

    // Try to find by partial title match (case insensitive) - PRIORITY 3
    const identifierLower = identifier.toLowerCase();
    const byTitle = todos.find((todo: any) =>
      todo.title.toLowerCase().includes(identifierLower)
    );
    if (byTitle) {
      console.log(`[FIND TODO] Found by title match: ${identifier}`);
    } else {
      console.log(`[FIND TODO] Not found: ${identifier}`);
    }
    return byTitle || null;
  }

  /**
   * Handle /add relationship command - Add a relationship between components
   */
  async handleAddRelationship(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags) - this is an error
    if (parsed.args.length > 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add relationship - Interactive wizard',
          '/add relationship --source="component" --target="target" --type=uses',
          '/add relationship --source="Login" --target="Auth Service" --type=uses --description="Uses auth"',
          '/help add relationship'
        ]
      };
    }

    // Get flags
    const sourceIdentifier = parsed.flags.get('source') as string;
    const targetIdentifier = parsed.flags.get('target') as string;
    const relationshipType = (parsed.flags.get('type') as string)?.toLowerCase();
    const description = parsed.flags.get('description') as string;

    // No args and no flags - pull up wizard
    if (parsed.args.length === 0 && parsed.flags.size === 0) {
      if (project.components.length < 2) {
        return {
          type: ResponseType.ERROR,
          message: 'Need at least 2 components to create a relationship.',
          suggestions: ['/add component', '/view components']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✨ Add New Relationship`,
        data: {
          wizardType: 'add_relationship',
          steps: [
            {
              id: 'source',
              label: 'Source Component',
              type: 'select',
              options: project.components.map((c: any) => ({ value: c.id, label: `${c.title} (${c.category})` })),
              required: true,
              placeholder: 'Select source component'
            },
            {
              id: 'target',
              label: 'Target Component',
              type: 'select',
              options: project.components.map((c: any) => ({ value: c.id, label: `${c.title} (${c.category})` })),
              required: true,
              placeholder: 'Select target component'
            },
            {
              id: 'type',
              label: 'Relationship Type',
              type: 'select',
              options: ['uses', 'implements', 'extends', 'depends_on', 'calls', 'contains', 'mentions', 'similar'],
              required: true,
              value: 'uses'
            },
            {
              id: 'description',
              label: 'Description',
              type: 'textarea',
              required: false,
              placeholder: 'Optional description of the relationship'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_relationship'
        }
      };
    }

    // Validate required flags
    if (!sourceIdentifier || !targetIdentifier || !relationshipType) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --source, --target, and --type flags are required',
        suggestions: [
          '/add relationship - Use wizard instead',
          '/add relationship --source="component" --target="target" --type=uses',
          '/help add relationship'
        ]
      };
    }

    // Find source component
    const sourceComponent = this.findComponent(project.components, sourceIdentifier);
    if (!sourceComponent) {
      return {
        type: ResponseType.ERROR,
        message: `Source component not found: "${sourceIdentifier}"`,
        suggestions: ['/view components']
      };
    }

    // Find target component
    const targetComponent = this.findComponent(project.components, targetIdentifier);
    if (!targetComponent) {
      return {
        type: ResponseType.ERROR,
        message: `Target component not found: "${targetIdentifier}"`,
        suggestions: ['/view components']
      };
    }

    // Validate relationship type
    const validTypes = ['uses', 'implements', 'extends', 'depends_on', 'calls', 'contains', 'mentions', 'similar'];
    if (!validTypes.includes(relationshipType)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid relationship type "${relationshipType}". Valid types: ${validTypes.join(', ')}`,
        suggestions: ['/help add relationship']
      };
    }

    // Check if relationship already exists
    if (sourceComponent.relationships && sourceComponent.relationships.some((r: any) => r.targetId === targetComponent.id)) {
      return {
        type: ResponseType.ERROR,
        message: `Relationship already exists between "${sourceComponent.title}" and "${targetComponent.title}"`,
        suggestions: [`/view relationships "${sourceComponent.title}"`]
      };
    }

    // Add relationship
    if (!sourceComponent.relationships) {
      sourceComponent.relationships = [];
    }

    const newRelationship = {
      id: uuidv4(),
      targetId: targetComponent.id,
      relationType: relationshipType as any,
      description: sanitizeText(description)
    };

    sourceComponent.relationships.push(newRelationship);
    sourceComponent.updatedAt = new Date();
    await project.save();

    return this.buildSuccessResponse(
      `✅ Added ${relationshipType} relationship: "${sourceComponent.title}" → "${targetComponent.title}"`,
      project,
      'add_relationship',
      {
        source: sourceComponent.title,
        target: targetComponent.title,
        type: relationshipType,
        description: description || ''
      }
    );
  }

  /**
   * Handle /view relationships command - View all relationships for a component
   */
  async handleViewRelationships(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const componentIdentifier = parsed.args.join(' ').trim();

    // No identifier provided - show selector wizard for components with relationships
    if (!componentIdentifier) {
      const componentsWithRelationships = resolution.project.components.filter(
        (c: any) => c.relationships && c.relationships.length > 0
      );

      if (componentsWithRelationships.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No components with relationships found',
          suggestions: ['/add relationship']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🔗 Select Component to View Relationships`,
        data: {
          wizardType: 'view_relationships_selector',
          steps: [
            {
              id: 'componentId',
              label: 'Select Component',
              type: 'select',
              options: componentsWithRelationships.map((c: any) => ({
                value: c.id,
                label: `${c.title} (${c.relationships.length} relationship${c.relationships.length > 1 ? 's' : ''})`
              })),
              required: true,
              placeholder: 'Select component'
            }
          ]
        },
        metadata: {
          projectId: resolution.project._id.toString(),
          action: 'view_relationships_selector'
        }
      };
    }

    const component = this.findComponent(resolution.project.components, componentIdentifier);

    if (!component) {
      return {
        type: ResponseType.ERROR,
        message: `Component not found: "${componentIdentifier}"`,
        suggestions: ['/view components']
      };
    }

    const relationships = component.relationships || [];

    if (relationships.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `🔗 No relationships found for "${component.title}"`,
        suggestions: [`/add relationship "${component.title}" "target" "type"`]
      };
    }

    // Enrich relationships with target component info
    const enrichedRelationships = relationships.map((rel: any) => {
      const target = resolution.project!.components.find((c: any) => c.id === rel.targetId);
      return {
        id: rel.id,
        relationType: rel.relationType,
        description: rel.description,
        target: target ? {
          id: target.id,
          title: target.title,
          category: target.category,
          type: target.type
        } : null
      };
    }).filter((rel: any) => rel.target !== null);

    return this.buildDataResponse(
      `🔗 Relationships for "${component.title}" (${enrichedRelationships.length})`,
      resolution.project,
      'view_relationships',
      {
        component: {
          id: component.id,
          title: component.title,
          category: component.category,
          type: component.type
        },
        relationships: enrichedRelationships
      }
    );
  }

  /**
   * Handle /edit relationship command - Edit an existing relationship
   */
  async handleEditRelationship(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // No args - show selector to choose which relationship to edit
    if (parsed.args.length === 0) {
      // Collect all relationships from all components
      const allRelationships: Array<{
        componentId: string;
        componentTitle: string;
        relationshipIndex: number;
        relationship: any;
        targetTitle: string;
      }> = [];

      project.components.forEach((comp: any) => {
        if (comp.relationships && comp.relationships.length > 0) {
          comp.relationships.forEach((rel: any, index: number) => {
            const target = project.components.find((c: any) => c.id === rel.targetId);
            allRelationships.push({
              componentId: comp.id,
              componentTitle: comp.title,
              relationshipIndex: index + 1,
              relationship: rel,
              targetTitle: target?.title || 'unknown'
            });
          });
        }
      });

      if (allRelationships.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No relationships to edit',
          suggestions: ['/add relationship']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Relationship to Edit`,
        data: {
          wizardType: 'edit_relationship_selector',
          steps: [
            {
              id: 'relationshipData',
              label: 'Select Relationship',
              type: 'select',
              options: allRelationships.map((r) => ({
                value: `${r.componentId}|${r.relationshipIndex}`,
                label: `${r.componentTitle} ${r.relationship.relationType} ${r.targetTitle}`
              })),
              required: true,
              placeholder: 'Select relationship to edit'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_relationship_selector'
        }
      };
    }

    const componentIdentifier = parsed.args[0];
    const relationshipIdentifier = parsed.args[1];

    // If only 2 args provided, show wizard to select new type
    if (parsed.args.length === 2) {
      // Find component
      const component = this.findComponent(project.components, componentIdentifier);
      if (!component) {
        return {
          type: ResponseType.ERROR,
          message: `Component not found: "${componentIdentifier}"`,
          suggestions: ['/view components']
        };
      }

      // Find relationship
      let relationship: any = null;
      const relIndex = parseInt(relationshipIdentifier);
      if (!isNaN(relIndex) && relIndex > 0 && relIndex <= component.relationships.length) {
        relationship = component.relationships[relIndex - 1];
      } else {
        relationship = component.relationships.find((r: any) => r.id === relationshipIdentifier);
        if (!relationship) {
          relationship = component.relationships.find((r: any) => {
            const targetComp = project.components.find((c: any) => c.id === r.targetId);
            return targetComp && targetComp.title.toLowerCase() === relationshipIdentifier.toLowerCase();
          });
        }
      }

      if (!relationship) {
        return {
          type: ResponseType.ERROR,
          message: `Relationship not found: "${relationshipIdentifier}"`,
          suggestions: [`/view relationships "${component.title}"`]
        };
      }

      const targetComponent = project.components.find((c: any) => c.id === relationship.targetId);

      // Show wizard to select new relationship type
      return {
        type: ResponseType.PROMPT,
        message: `✏️  Edit Relationship: "${component.title}" → "${targetComponent?.title || 'unknown'}"`,
        data: {
          wizardType: 'edit_relationship_type',
          steps: [
            {
              id: 'relationType',
              label: `Current: ${relationship.relationType}. Select new type:`,
              type: 'select',
              options: ['uses', 'implements', 'extends', 'depends_on', 'calls', 'contains', 'mentions', 'similar'],
              required: true,
              value: relationship.relationType,
              placeholder: 'Select relationship type'
            },
            {
              id: 'description',
              label: 'Description (optional)',
              type: 'text',
              required: false,
              value: relationship.description || '',
              placeholder: 'Optional description'
            }
          ],
          componentTitle: component.title,
          targetTitle: targetComponent?.title || 'unknown',
          relationshipId: relationship.id
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_relationship_type'
        }
      };
    }

    if (parsed.args.length < 3) {
      return {
        type: ResponseType.ERROR,
        message: 'Usage: /edit relationship [source component] [target component] [new type]',
        suggestions: [
          '/edit relationship "Login" "Database" depends_on',
          '/edit relationship "Login" 1 depends_on',
          '/view relationships "Login" - to see relationships',
          '/help edit relationship'
        ]
      };
    }

    const newType = parsed.args[2].toLowerCase();

    // Find component
    const component = this.findComponent(project.components, componentIdentifier);
    if (!component) {
      return {
        type: ResponseType.ERROR,
        message: `Component not found: "${componentIdentifier}"`,
        suggestions: ['/view components']
      };
    }

    if (!component.relationships || component.relationships.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: `No relationships found for "${component.title}"`,
        suggestions: [`/add relationship "${component.title}" "target" "type"`]
      };
    }

    // Find relationship by ID, index, or target component title
    let relationship: any = null;
    const relIndex = parseInt(relationshipIdentifier);
    if (!isNaN(relIndex) && relIndex > 0 && relIndex <= component.relationships.length) {
      // Find by index
      relationship = component.relationships[relIndex - 1];
    } else {
      // Try to find by UUID
      relationship = component.relationships.find((r: any) => r.id === relationshipIdentifier);

      // If not found, try to find by target component title
      if (!relationship) {
        relationship = component.relationships.find((r: any) => {
          const targetComp = project.components.find((c: any) => c.id === r.targetId);
          return targetComp && targetComp.title.toLowerCase() === relationshipIdentifier.toLowerCase();
        });
      }
    }

    if (!relationship) {
      return {
        type: ResponseType.ERROR,
        message: `Relationship not found: "${relationshipIdentifier}"`,
        suggestions: [`/view relationships "${component.title}"`]
      };
    }

    // Validate new type
    const validTypes = ['uses', 'implements', 'extends', 'depends_on', 'calls', 'contains', 'mentions', 'similar'];
    if (!validTypes.includes(newType)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid relationship type "${newType}". Valid types: ${validTypes.join(', ')}`,
        suggestions: ['/help edit relationship']
      };
    }

    // Get target component for display
    const targetComponent = project.components.find((c: any) => c.id === relationship.targetId);
    const oldType = relationship.relationType;

    // Update relationship type
    relationship.relationType = newType;

    // Update description if provided
    if (parsed.args.length > 3) {
      relationship.description = sanitizeText(parsed.args.slice(3).join(' '));
    }

    component.updatedAt = new Date();
    await project.save();

    return this.buildSuccessResponse(
      `✅ Updated relationship: "${component.title}" ${oldType} → ${newType} "${targetComponent?.title || 'unknown'}"`,
      project,
      'edit_relationship'
    );
  }

  /**
   * Handle /delete relationship command - Delete a relationship with confirmation
   */
  async handleDeleteRelationship(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // No args provided - show selector wizard with all relationships
    if (parsed.args.length === 0) {
      // Collect all relationships from all components
      const allRelationships: Array<{ componentId: string; componentTitle: string; relationshipId: string; relationship: any; targetTitle: string }> = [];

      project.components.forEach((comp: any) => {
        if (comp.relationships && comp.relationships.length > 0) {
          comp.relationships.forEach((rel: any) => {
            const target = project.components.find((c: any) => c.id === rel.targetId);
            allRelationships.push({
              componentId: comp.id,
              componentTitle: comp.title,
              relationshipId: rel.id,
              relationship: rel,
              targetTitle: target?.title || 'unknown'
            });
          });
        }
      });

      if (allRelationships.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No relationships to delete',
          suggestions: ['/add relationship']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Relationship to Delete`,
        data: {
          wizardType: 'delete_relationship_selector',
          steps: [
            {
              id: 'relationshipData',
              label: 'Select Relationship',
              type: 'select',
              options: allRelationships.map((r) => ({
                value: `${r.componentId}|${r.relationshipId}`,
                label: `${r.componentTitle} ${r.relationship.relationType} ${r.targetTitle}`
              })),
              required: true,
              placeholder: 'Select relationship to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_relationship_selector'
        }
      };
    }

    if (parsed.args.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: 'Usage: /delete relationship [component id/title] [relationship id]',
        suggestions: [
          '/delete relationship - Interactive selector',
          '/delete relationship "Login" 1 --confirm',
          '/view relationships "Login" - to see relationship IDs',
          '/help delete relationship'
        ]
      };
    }

    const componentIdentifier = parsed.args[0];
    const relationshipIdentifier = parsed.args[1];

    // Find component
    const component = this.findComponent(project.components, componentIdentifier);
    if (!component) {
      return {
        type: ResponseType.ERROR,
        message: `Component not found: "${componentIdentifier}"`,
        suggestions: ['/view components']
      };
    }

    if (!component.relationships || component.relationships.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: `No relationships found for "${component.title}"`,
        suggestions: []
      };
    }

    // Find relationship by ID or index
    let relationshipIndex = -1;
    const relIndex = parseInt(relationshipIdentifier);
    if (!isNaN(relIndex) && relIndex > 0 && relIndex <= component.relationships.length) {
      relationshipIndex = relIndex - 1;
    } else {
      relationshipIndex = component.relationships.findIndex((r: any) => r.id === relationshipIdentifier);
    }

    if (relationshipIndex === -1) {
      return {
        type: ResponseType.ERROR,
        message: `Relationship not found: "${relationshipIdentifier}"`,
        suggestions: [`/view relationships "${component.title}"`]
      };
    }

    const relationship = component.relationships[relationshipIndex];
    const targetComponent = project.components.find((c: any) => c.id === relationship.targetId);

    // Check for confirmation flag
    const hasConfirmation = parsed.flags.has('confirm') || parsed.flags.has('yes') || parsed.flags.has('y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_relationship_confirm',
          confirmationData: {
            componentTitle: component.title,
            targetTitle: targetComponent?.title || 'unknown',
            relationType: relationship.relationType,
            command: `/delete relationship "${component.title}" ${relationshipIdentifier} --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete the ${relationship.relationType} relationship from "${component.title}" to "${targetComponent?.title || 'unknown'}"?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_relationship_confirm'
        }
      };
    }

    // Delete the relationship
    component.relationships.splice(relationshipIndex, 1);
    component.updatedAt = new Date();
    await project.save();

    // TODO : Also remove any inverse relationships if applicable

    return this.buildSuccessResponse(
      `🗑️  Deleted ${relationship.relationType} relationship: "${component.title}" → "${targetComponent?.title || 'unknown'}"`,
      project,
      'delete_relationship'
    );
  }
}
