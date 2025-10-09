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
   */
  async handleAddTodo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const todoText = parsed.args.join(' ').trim();
    const validation = validateTodoText(todoText);

    if (!validation.isValid) {
      return {
        type: ResponseType.ERROR,
        message: validation.error || 'Invalid todo text',
        suggestions: ['/help add todo']
      };
    }

    const newTodo = {
      id: uuidv4(),
      text: validation.sanitized!,
      description: '',
      priority: 'medium' as const,
      completed: false,
      status: 'not_started' as const,
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
   */
  async handleAddNote(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const noteText = sanitizeText(parsed.args.join(' ').trim());
    if (!noteText) {
      return {
        type: ResponseType.ERROR,
        message: 'Note text is required',
        suggestions: ['/help add note']
      };
    }

    const words = noteText.split(' ');
    const title = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');

    const newNote = {
      id: uuidv4(),
      title,
      description: '',
      content: noteText,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    project.notes.push(newNote);
    await project.save();

    return this.buildSuccessResponse(
      `📝 Added note to ${project.name}`,
      project,
      'add_note',
      { title, preview: noteText.slice(0, 50) + (noteText.length > 50 ? '...' : '') }
    );
  }

  /**
   * Handle /add devlog command
   */
  async handleAddDevLog(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const entryText = sanitizeText(parsed.args.join(' ').trim());
    if (!entryText) {
      return {
        type: ResponseType.ERROR,
        message: 'Dev log entry is required',
        suggestions: ['/help add devlog']
      };
    }

    const newEntry = {
      id: uuidv4(),
      title: '',
      description: '',
      entry: entryText,
      date: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    project.devLog.push(newEntry);
    await project.save();

    return this.buildSuccessResponse(
      `📋 Added dev log entry to ${project.name}`,
      project,
      'add_devlog',
      { preview: entryText.slice(0, 50) + (entryText.length > 50 ? '...' : '') }
    );
  }

  /**
   * Handle /add doc command
   */
  async handleAddDoc(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const fullText = parsed.args.join(' ').trim();
    const parts = fullText.split(' - ');

    if (parts.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: 'Invalid format. Use: /add doc [type] [title] - [content]',
        suggestions: [
          '/add doc Model User - id, name, email',
          '/add doc API /users - GET all users endpoint',
          '/help add doc'
        ]
      };
    }

    const firstPart = parts[0].trim().split(' ');
    const docType = firstPart[0];
    const title = sanitizeText(firstPart.slice(1).join(' '));
    const content = sanitizeText(parts.slice(1).join(' - '));

    if (!docType || !title || !content) {
      return {
        type: ResponseType.ERROR,
        message: 'Type, title, and content are all required',
        suggestions: ['/help add doc']
      };
    }

    const validTypes = ['Model', 'Route', 'API', 'Util', 'ENV', 'Auth', 'Runtime', 'Framework'];
    if (!validTypes.includes(docType)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid doc type "${docType}". Valid types: ${validTypes.join(', ')}`,
        suggestions: validTypes.map(t => `/add doc ${t} [title] - [content]`)
      };
    }

    const newDoc = {
      id: uuidv4(),
      type: docType as any,
      title,
      content,
      createdAt: new Date()
    };

    project.docs.push(newDoc);
    await project.save();

    return this.buildSuccessResponse(
      `📚 Added ${docType} doc: "${title}" to ${project.name}`,
      project,
      'add_doc'
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
    const todos = allTodos.filter((t: any) => !t.parentTodoId);

    if (todos.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `✅ No todos found in ${resolution.project.name}`,
        suggestions: [`/add todo [text] @${resolution.project.name}`]
      };
    }

    const completed = todos.filter((t: any) => t.completed).length;
    const pending = todos.length - completed;

    return this.buildDataResponse(
      `✅ Todos in ${resolution.project.name} (${pending} pending, ${completed} completed)`,
      resolution.project,
      'view_todos',
      {
        todos: todos.map((todo: any) => ({
          id: todo.id,
          text: todo.text,
          priority: todo.priority,
          status: todo.status,
          completed: todo.completed,
          dueDate: todo.dueDate
        }))
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
          entry: entry.entry,
          date: entry.date
        })).reverse()
      }
    );
  }

  /**
   * Handle /view docs command
   */
  async handleViewDocs(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const docs = resolution.project.docs || [];

    if (docs.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `📚 No documentation found in ${resolution.project.name}`
      };
    }

    return this.buildDataResponse(
      `📚 Documentation in ${resolution.project.name} (${docs.length} docs)`,
      resolution.project,
      'view_docs',
      {
        docs: docs.map((doc: any) => ({
          id: doc.id,
          type: doc.type,
          title: doc.title,
          createdAt: doc.createdAt
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
      if (todo.text.toLowerCase().includes(query) ||
          (todo.description && todo.description.toLowerCase().includes(query))) {
        results.push({
          type: 'todo',
          id: todo.id,
          text: todo.text,
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
          entry.entry.toLowerCase().includes(query)) {
        results.push({
          type: 'devlog',
          id: entry.id,
          title: entry.title,
          preview: entry.entry.substring(0, 100),
          date: entry.date,
          projectName: project.name,
          projectId: project._id.toString()
        });
      }
    });

    // Search docs
    (project.docs || []).forEach((doc: any) => {
      if (doc.title.toLowerCase().includes(query) ||
          doc.content.toLowerCase().includes(query)) {
        results.push({
          type: 'doc',
          id: doc.id,
          docType: doc.type,
          title: doc.title,
          preview: doc.content.substring(0, 100),
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
    .select('_id name todos notes devLog docs')
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
      .select('_id name todos notes devLog docs')
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
        if (todo.text.toLowerCase().includes(queryLower) ||
            (todo.description && todo.description.toLowerCase().includes(queryLower))) {
          results.push({
            type: 'todo',
            id: todo.id,
            text: todo.text,
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
            entry.entry.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'devlog',
            id: entry.id,
            title: entry.title,
            preview: entry.entry.substring(0, 100),
            date: entry.date,
            projectName: project.name,
            projectId: project._id.toString()
          });
        }
      });

      // Search docs
      (project.docs || []).forEach((doc: any) => {
        if (doc.title.toLowerCase().includes(queryLower) ||
            doc.content.toLowerCase().includes(queryLower)) {
          results.push({
            type: 'doc',
            id: doc.id,
            docType: doc.type,
            title: doc.title,
            preview: doc.content.substring(0, 100),
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
      `✅ Marked todo as completed: "${todo.text}"`,
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
      `✅ Assigned todo "${todo.text}" to ${user.firstName} ${user.lastName}`,
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
      `✅ Set priority to ${priorityStr} for todo: "${todo.text}"`,
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
      `✅ Set due date to ${dueDate.toLocaleDateString()} for todo: "${todo.text}"`,
      project,
      'set_due_date'
    );
  }

  /**
   * Find a todo by text or index
   */
  private findTodo(todos: any[], identifier: string): any | null {
    // Try to find by index (1-based)
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= todos.length) {
      return todos[index - 1];
    }

    // Try to find by partial text match (case insensitive)
    const identifierLower = identifier.toLowerCase();
    return todos.find((todo: any) =>
      todo.text.toLowerCase().includes(identifierLower)
    ) || null;
  }
}
