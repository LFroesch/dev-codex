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
}
