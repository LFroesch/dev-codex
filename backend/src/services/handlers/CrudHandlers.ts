import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { BaseCommandHandler } from './BaseCommandHandler';
import { CommandResponse, ResponseType } from '../commandExecutor';
import { ParsedCommand } from '../commandParser';
import { sanitizeText, validateTodoText } from '../../utils/validation';

/**
 * Handlers for CRUD operations on todos, notes, devlog, and docs
 */
export class CrudHandlers extends BaseCommandHandler {
  /**
   * Handle /add todo command
   * Now requires flag-based syntax: /add todo --title="..." [--content="..."] [--priority=...] [--status=...]
   */
  async handleAddTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags)
    if (parsed.args.length > 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax.',
        suggestions: [
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

    // Validate required flags
    if (!title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --title flag is required',
        suggestions: [
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

    const newTodo = {
      id: uuidv4(),
      title: validation.sanitized!,
      description: content ? sanitizeText(content) : '',
      priority: (priority?.toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
      completed: false,
      status: (status?.toLowerCase() as 'not_started' | 'in_progress' | 'completed' | 'blocked') || 'not_started',
      createdAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    project.todos.push(newTodo);
    await project.save();

    return this.buildSuccessResponse(
      `✅ Added todo: "${validation.sanitized}" to ${project.name}`,
      project,
      'add_todo'
    );
  }

  /**
   * Handle /add note command
   * Now requires flag-based syntax: /add note --title="..." --content="..."
   */
  async handleAddNote(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags)
    if (parsed.args.length > 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax.',
        suggestions: [
          '/add note --title="Note Title" --content="Note content"',
          '/add note --title="Meeting Notes" --content="Discussed project architecture..."',
          '/help add note'
        ]
      };
    }

    // Get flags
    const title = parsed.flags.get('title') as string;
    const content = parsed.flags.get('content') as string;

    // Validate required flags
    if (!title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --title flag is required',
        suggestions: [
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
   */
  async handleAddDevLog(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags)
    if (parsed.args.length > 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax.',
        suggestions: [
          '/add devlog --title="Entry Title" --content="What I worked on today..."',
          '/add devlog --title="Bug Fix" --content="Fixed memory leak in user service"',
          '/help add devlog'
        ]
      };
    }

    // Get flags
    const title = parsed.flags.get('title') as string;
    const content = parsed.flags.get('content') as string;

    // Validate required flags
    if (!title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --title flag is required',
        suggestions: [
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
   */
  async handleAddComponent(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (looking for "-" separator or args without flags)
    const separatorIndex = parsed.args.indexOf('-');
    if (separatorIndex !== -1 || (parsed.args.length > 0 && parsed.flags.size === 0)) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax.',
        suggestions: [
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

    // Validate required flags
    if (!feature) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --feature flag is required',
        suggestions: [
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
        suggestions: [`/add note [text] @${resolution.project.name}`]
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
        suggestions: [`/add todo [text] @${resolution.project.name}`]
      };
    }

    // Build hierarchical structure with subtasks
    const todosWithSubtasks = parentTodos.map((todo: any) => {
      const subtasks = allTodos.filter((t: any) => t.parentTodoId === todo.id);
      return {
        id: todo.id,
        title: todo.title,
        priority: todo.priority,
        status: todo.status,
        completed: todo.completed,
        dueDate: todo.dueDate,
        subtasks: subtasks.map((sub: any) => ({
          id: sub.id,
          title: sub.title,
          priority: sub.priority,
          status: sub.status,
          completed: sub.completed,
          dueDate: sub.dueDate
        }))
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
        suggestions: [`/add devlog [text] @${resolution.project.name}`]
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
        suggestions: [`/add component [feature] [type] [title] - [content]`]
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

    // Check if user is a member of the project
    const isMember = project.members.some((m: any) => m.userId.toString() === user._id.toString());
    const isOwner = project.owner.toString() === user._id.toString();

    if (!isMember && !isOwner) {
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
   * Handle /priority command - Set todo priority
   */
  async handleSetPriority(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    if (parsed.args.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: 'Usage: /priority [todo] [low/medium/high]',
        suggestions: ['/help priority']
      };
    }

    // Last arg is the priority, everything before is the todo identifier
    const priorityStr = parsed.args[parsed.args.length - 1].toLowerCase();
    const todoIdentifier = parsed.args.slice(0, -1).join(' ').trim();

    if (!['low', 'medium', 'high'].includes(priorityStr)) {
      return {
        type: ResponseType.ERROR,
        message: 'Priority must be: low, medium, or high',
        suggestions: ['/help priority']
      };
    }

    const todo = this.findTodo(project.todos, todoIdentifier);

    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/help priority']
      };
    }

    todo.priority = priorityStr as 'low' | 'medium' | 'high';
    await project.save();

    return this.buildSuccessResponse(
      `✅ Set priority to ${priorityStr} for todo: "${todo.title}"`,
      project,
      'set_priority'
    );
  }

  /**
   * Handle /due command - Set todo due date
   */
  async handleSetDueDate(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    if (parsed.args.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: 'Usage: /due [todo] [date]',
        suggestions: ['/help due']
      };
    }

    // Last arg is the date, everything before is the todo identifier
    const dateStr = parsed.args[parsed.args.length - 1];
    const todoIdentifier = parsed.args.slice(0, -1).join(' ').trim();

    const todo = this.findTodo(project.todos, todoIdentifier);

    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/help due']
      };
    }

    // Parse date - support YYYY-MM-DD, relative dates like "tomorrow", etc.
    let dueDate: Date;

    if (dateStr.toLowerCase() === 'today') {
      dueDate = new Date();
      dueDate.setHours(23, 59, 59, 999);
    } else if (dateStr.toLowerCase() === 'tomorrow') {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);
      dueDate.setHours(23, 59, 59, 999);
    } else {
      dueDate = new Date(dateStr);
      if (isNaN(dueDate.getTime())) {
        return {
          type: ResponseType.ERROR,
          message: `Invalid date format: ${dateStr}. Use YYYY-MM-DD, "today", or "tomorrow"`,
          suggestions: ['/help due']
        };
      }
    }

    todo.dueDate = dueDate;
    await project.save();

    return this.buildSuccessResponse(
      `✅ Set due date to ${dueDate.toLocaleDateString()} for todo: "${todo.title}"`,
      project,
      'set_due_date'
    );
  }

  /**
   * Handle /add subtask command - Add subtask to a todo
   */
  async handleAddSubtask(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    if (parsed.args.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: 'Usage: /add subtask [parent todo] [subtask text]',
        suggestions: ['/help add subtask']
      };
    }

    // First word/phrase is the parent todo identifier
    // Rest is the subtask text
    // We need to intelligently split - try to find the parent todo
    let parentTodo: any = null;
    let subtaskText = '';

    // Try different split points to find a matching parent todo
    for (let i = 1; i <= Math.min(5, parsed.args.length - 1); i++) {
      const potentialParent = parsed.args.slice(0, i).join(' ');
      const foundTodo = this.findTodo(project.todos.filter((t: any) => !t.parentTodoId), potentialParent);

      if (foundTodo) {
        parentTodo = foundTodo;
        subtaskText = parsed.args.slice(i).join(' ');
        break;
      }
    }

    if (!parentTodo) {
      return {
        type: ResponseType.ERROR,
        message: `Parent todo not found. Try: /add subtask "[parent todo text]" [subtask text]`,
        suggestions: ['/view todos', '/help add subtask']
      };
    }

    if (!subtaskText || subtaskText.trim().length === 0) {
      return {
        type: ResponseType.ERROR,
        message: 'Subtask text is required',
        suggestions: ['/help add subtask']
      };
    }

    const validation = validateTodoText(subtaskText);
    if (!validation.isValid) {
      return {
        type: ResponseType.ERROR,
        message: validation.error || 'Invalid subtask text',
        suggestions: ['/help add subtask']
      };
    }

    const newSubtask = {
      id: uuidv4(),
      title: validation.sanitized!,
      description: '',
      priority: parentTodo.priority || 'medium' as const,
      completed: false,
      status: 'not_started' as const,
      parentTodoId: parentTodo.id,
      createdAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    project.todos.push(newSubtask);
    await project.save();

    return this.buildSuccessResponse(
      `✅ Added subtask "${validation.sanitized}" to "${parentTodo.title}"`,
      project,
      'add_subtask',
      { parentTodo: parentTodo.title, subtask: validation.sanitized }
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
        suggestions: [`/add subtask "${parentTodo.title}" [subtask text]`]
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
          priority: subtask.priority,
          status: subtask.status,
          completed: subtask.completed,
          dueDate: subtask.dueDate
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

    // Require ID as first argument
    if (parsed.args.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Todo ID is required',
        suggestions: [
          '/view todos - See all todos with #IDs',
          '💡 Edit with wizard: /edit todo 1',
          '💡 Edit specific field: /edit todo 1 --field=title --content="new title"',
          '/help edit todo'
        ]
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

    // Check for field flags - direct update mode
    const field = parsed.flags.get('field') as string;
    const content = parsed.flags.get('content') as string;

    if (field && content) {
      // Direct field update
      const validFields = ['title', 'content', 'priority', 'status'];

      if (!validFields.includes(field)) {
        return {
          type: ResponseType.ERROR,
          message: `❌ Invalid field: "${field}". Valid fields: ${validFields.join(', ')}`,
          suggestions: ['/help edit todo']
        };
      }

      // Validate and update based on field
      if (field === 'title') {
        const validation = validateTodoText(content);
        if (!validation.isValid) {
          return {
            type: ResponseType.ERROR,
            message: validation.error || 'Invalid todo title',
            suggestions: ['/help edit todo']
          };
        }
        console.log(`[EDIT TODO] Updating title from "${todo.title}" to "${validation.sanitized}"`);
        todo.title = validation.sanitized!;
      } else if (field === 'content') {
        console.log(`[EDIT TODO] Updating description for todo "${todo.title}"`);
        todo.description = sanitizeText(content);
      } else if (field === 'priority') {
        if (!['low', 'medium', 'high'].includes(content.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: 'Priority must be: low, medium, or high',
            suggestions: ['/help edit todo']
          };
        }
        console.log(`[EDIT TODO] Updating priority for todo "${todo.title}" to ${content.toLowerCase()}`);
        todo.priority = content.toLowerCase() as 'low' | 'medium' | 'high';
      } else if (field === 'status') {
        const validStatuses = ['not_started', 'in_progress', 'completed', 'blocked'];
        if (!validStatuses.includes(content.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: `Status must be one of: ${validStatuses.join(', ')}`,
            suggestions: ['/help edit todo']
          };
        }
        console.log(`[EDIT TODO] Updating status for todo "${todo.title}" to ${content.toLowerCase()}`);
        todo.status = content.toLowerCase() as any;
      }

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
        `✅ Updated todo ${field}: "${todo.title}"`,
        project,
        'edit_todo'
      );
    }

    // No field flags - return interactive wizard
    return {
      type: ResponseType.PROMPT,
      message: `✏️ Edit Todo: "${todo.title}"`,
      data: {
        wizardType: 'edit_todo',
        todoId: todo.id,
        currentValues: {
          title: todo.title,
          content: todo.description || '',
          priority: todo.priority,
          status: todo.status
        },
        steps: [
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
          }
        ]
      },
      metadata: {
        projectId: project._id.toString(),
        action: 'edit_todo'
      }
    };
  }

  /**
   * Handle /edit note command - Edit an existing note
   */
  async handleEditNote(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Require ID as first argument
    if (parsed.args.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Note ID is required',
        suggestions: [
          '/view notes - See all notes with #IDs',
          '💡 Edit with wizard: /edit note 1',
          '💡 Edit specific field: /edit note 1 --field=content --content="new content"',
          '/help edit note'
        ]
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

    // Check for field flags - direct update mode
    const field = parsed.flags.get('field') as string;
    const content = parsed.flags.get('content') as string;

    if (field && content) {
      // Direct field update
      const validFields = ['title', 'content'];

      if (!validFields.includes(field)) {
        return {
          type: ResponseType.ERROR,
          message: `❌ Invalid field: "${field}". Valid fields: ${validFields.join(', ')}`,
          suggestions: ['/help edit note']
        };
      }

      // Update the specified field
      const sanitizedContent = sanitizeText(content);
      if (field === 'title') {
        console.log(`[EDIT NOTE] Updating title from "${note.title}" to "${sanitizedContent}"`);
        note.title = sanitizedContent;
      } else if (field === 'content') {
        console.log(`[EDIT NOTE] Updating content for note "${note.title}"`);
        note.content = sanitizedContent;
      }

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
        `📝 Updated note ${field}: "${note.title}"`,
        project,
        'edit_note'
      );
    }

    // No field flags - return interactive wizard
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

    // Require ID as first argument
    if (parsed.args.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Dev log entry ID is required',
        suggestions: [
          '/view devlog - See all entries with #IDs',
          '💡 Edit with wizard: /edit devlog 1',
          '💡 Edit specific field: /edit devlog 1 --field=content --content="new content"',
          '/help edit devlog'
        ]
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

    // Check for field flags - direct update mode
    const field = parsed.flags.get('field') as string;
    const content = parsed.flags.get('content') as string;

    if (field && content) {
      // Direct field update
      const validFields = ['title', 'content'];

      if (!validFields.includes(field)) {
        return {
          type: ResponseType.ERROR,
          message: `❌ Invalid field: "${field}". Valid fields: ${validFields.join(', ')}`,
          suggestions: ['/help edit devlog']
        };
      }

      // Update the specified field
      const sanitizedContent = sanitizeText(content);
      if (field === 'title') {
        console.log(`[EDIT DEVLOG] Updating title to "${sanitizedContent}"`);
        entry.title = sanitizedContent;
      } else if (field === 'content') {
        console.log(`[EDIT DEVLOG] Updating description`);
        entry.description = sanitizedContent;
      }

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
        `📋 Updated dev log ${field}`,
        project,
        'edit_devlog'
      );
    }

    // No field flags - return interactive wizard
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

    // Require ID as first argument
    if (parsed.args.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Component ID is required',
        suggestions: [
          '/view components - See all components with #IDs',
          '💡 Edit with wizard: /edit component 1',
          '💡 Edit specific field: /edit component 1 --field=content --content="new content"',
          '/help edit component'
        ]
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

    if (field && content) {
      // Direct field update
      const validFields = ['title', 'content', 'feature', 'category', 'type'];

      if (!validFields.includes(field)) {
        return {
          type: ResponseType.ERROR,
          message: `❌ Invalid field: "${field}". Valid fields: ${validFields.join(', ')}, relationship`,
          suggestions: ['/help edit component']
        };
      }

      // Update the specified field
      const sanitizedContent = sanitizeText(content);
      if (field === 'title') {
        console.log(`[EDIT COMPONENT] Updating title from "${component.title}" to "${sanitizedContent}"`);
        component.title = sanitizedContent;
      } else if (field === 'content') {
        console.log(`[EDIT COMPONENT] Updating content for component "${component.title}"`);
        component.content = sanitizedContent;
      } else if (field === 'feature') {
        console.log(`[EDIT COMPONENT] Updating feature for component "${component.title}" to "${sanitizedContent}"`);
        component.feature = sanitizedContent;
      } else if (field === 'category') {
        const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];
        if (!validCategories.includes(sanitizedContent.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Invalid category: "${sanitizedContent}". Valid categories: ${validCategories.join(', ')}`,
            suggestions: ['/help edit component']
          };
        }
        console.log(`[EDIT COMPONENT] Updating category for component "${component.title}" to "${sanitizedContent.toLowerCase()}"`);
        component.category = sanitizedContent.toLowerCase() as any;
      } else if (field === 'type') {
        console.log(`[EDIT COMPONENT] Updating type for component "${component.title}" to "${sanitizedContent}"`);
        component.type = sanitizedContent;
      }

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
        `🧩 Updated component ${field}: "${component.title}"`,
        project,
        'edit_component'
      );
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
    const todo = this.findTodo(project.todos, todoIdentifier);

    if (!todo) {
      return {
        type: ResponseType.ERROR,
        message: `Todo not found: "${todoIdentifier}"`,
        suggestions: ['/view todos', '/help delete todo']
      };
    }

    // Check for confirmation flag
    const hasConfirmation = parsed.flags.has('confirm') || parsed.flags.has('yes') || parsed.flags.has('y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Are you sure you want to delete todo "${todo.title}"?\nUse --confirm to proceed: /delete todo "${todo.title}" --confirm`,
        data: { todo: { id: todo.id, title: todo.title } }
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
        message: `⚠️  Are you sure you want to delete note "${note.title}"?\nUse --confirm to proceed: /delete note "${note.title}" --confirm`,
        data: { note: { id: note.id, title: note.title } }
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
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Are you sure you want to delete this dev log entry?\nUse --confirm to proceed: /delete devlog ${identifier} --confirm`,
        data: { entry: { id: entry.id, preview: entry.description ? entry.description.substring(0, 50) : '' } }
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
        message: `⚠️  Are you sure you want to delete component "${component.title}"?\nUse --confirm to proceed: /delete component "${component.title}" --confirm`,
        data: { component: { id: component.id, title: component.title } }
      };
    }

    const componentTitle = component.title;
    project.components = project.components.filter((c: any) => c.id !== component.id);
    await project.save();

    return this.buildSuccessResponse(
      `🗑️  Deleted component: "${componentTitle}"`,
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

    const subtaskIdentifier = parsed.args.join(' ').trim();
    const subtask = this.findTodo(
      project.todos.filter((t: any) => t.parentTodoId),
      subtaskIdentifier
    );

    if (!subtask) {
      return {
        type: ResponseType.ERROR,
        message: `Subtask not found: "${subtaskIdentifier}"`,
        suggestions: ['/help delete subtask']
      };
    }

    const hasConfirmation = parsed.flags.has('confirm') || parsed.flags.has('yes') || parsed.flags.has('y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Are you sure you want to delete subtask "${subtask.title}"?\nUse --confirm to proceed: /delete subtask "${subtask.title}" --confirm`,
        data: { subtask: { id: subtask.id, title: subtask.title } }
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

    if (parsed.args.length < 3) {
      return {
        type: ResponseType.ERROR,
        message: 'Usage: /add relationship [component id/title] [target id/title] [type]',
        suggestions: [
          '/add relationship "Login" "Auth Service" uses',
          '/add relationship 1 2 implements',
          '/help add relationship'
        ]
      };
    }

    // Parse args: source component, target component, relationship type
    const sourceIdentifier = parsed.args[0];
    const targetIdentifier = parsed.args[1];
    const relationshipType = parsed.args[2].toLowerCase();

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

    // Get description if provided (rest of args)
    const description = parsed.args.slice(3).join(' ') || '';

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
      'add_relationship'
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
        suggestions: [`/add relationship "${component.title}" [target] [type]`]
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

    if (parsed.args.length < 3) {
      return {
        type: ResponseType.ERROR,
        message: 'Usage: /edit relationship [component id/title] [relationship id] [new type]',
        suggestions: [
          '/edit relationship "Login" 1 depends_on',
          '/view relationships "Login" - to see relationship IDs',
          '/help edit relationship'
        ]
      };
    }

    const componentIdentifier = parsed.args[0];
    const relationshipIdentifier = parsed.args[1];
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
        suggestions: [`/add relationship "${component.title}" [target] [type]`]
      };
    }

    // Find relationship by ID or index
    let relationship: any = null;
    const relIndex = parseInt(relationshipIdentifier);
    if (!isNaN(relIndex) && relIndex > 0 && relIndex <= component.relationships.length) {
      relationship = component.relationships[relIndex - 1];
    } else {
      relationship = component.relationships.find((r: any) => r.id === relationshipIdentifier);
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

    if (parsed.args.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: 'Usage: /delete relationship [component id/title] [relationship id]',
        suggestions: [
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
        message: `⚠️  Are you sure you want to delete the ${relationship.relationType} relationship from "${component.title}" to "${targetComponent?.title || 'unknown'}"?\nUse --confirm to proceed: /delete relationship "${component.title}" ${relationshipIdentifier} --confirm`,
        data: { relationship: { id: relationship.id, type: relationship.relationType } }
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
