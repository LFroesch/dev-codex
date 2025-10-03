import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { User } from '../models/User';
import TeamMember from '../models/TeamMember';
import ProjectInvitation from '../models/ProjectInvitation';
import Notification from '../models/Notification';
import { CommandParser, CommandType, ParsedCommand, COMMAND_METADATA } from './commandParser';
import { logInfo, logError } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { sendProjectInvitationEmail } from './emailService';

/**
 * Response types for terminal commands
 */
export enum ResponseType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
  DATA = 'data',
  PROMPT = 'prompt'
}

/**
 * Structured response from command execution
 */
export interface CommandResponse {
  type: ResponseType;
  message: string;
  data?: any;
  metadata?: {
    projectId?: string;
    projectName?: string;
    action?: string;
    timestamp?: Date;
  };
  suggestions?: string[];
}

/**
 * Project resolution result
 */
interface ProjectResolution {
  project: any | null;
  error?: string;
  needsSelection?: boolean;
  availableProjects?: any[];
  suggestions?: string[];
}

/**
 * Command Executor Service
 * Executes parsed commands by routing to appropriate CRUD operations
 */
export class CommandExecutor {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Execute a command
   * @param commandStr - Raw command string
   * @param currentProjectId - Optional current project context
   * @returns Command response
   */
  async execute(commandStr: string, currentProjectId?: string): Promise<CommandResponse> {
    try {
      // Parse the command
      const parsed = CommandParser.parse(commandStr);

      if (!parsed.isValid) {
        return {
          type: ResponseType.ERROR,
          message: 'Invalid command',
          data: { errors: parsed.errors },
          suggestions: ['/help']
        };
      }

      logInfo('Executing command', {
        userId: this.userId,
        type: parsed.type,
        command: parsed.command
      });

      // Route to appropriate handler
      switch (parsed.type) {
        case CommandType.ADD_TODO:
          return await this.handleAddTodo(parsed, currentProjectId);

        case CommandType.ADD_NOTE:
          return await this.handleAddNote(parsed, currentProjectId);

        case CommandType.ADD_DEVLOG:
          return await this.handleAddDevLog(parsed, currentProjectId);

        case CommandType.ADD_DOC:
          return await this.handleAddDoc(parsed, currentProjectId);

        case CommandType.VIEW_NOTES:
          return await this.handleViewNotes(parsed, currentProjectId);

        case CommandType.VIEW_TODOS:
          return await this.handleViewTodos(parsed, currentProjectId);

        case CommandType.VIEW_DEVLOG:
          return await this.handleViewDevLog(parsed, currentProjectId);

        case CommandType.VIEW_DOCS:
          return await this.handleViewDocs(parsed, currentProjectId);

        case CommandType.ADD_TECH:
          return await this.handleAddTech(parsed, currentProjectId);

        case CommandType.ADD_PACKAGE:
          return await this.handleAddPackage(parsed, currentProjectId);

        case CommandType.VIEW_STACK:
          return await this.handleViewStack(parsed, currentProjectId);

        case CommandType.REMOVE_TECH:
          return await this.handleRemoveTech(parsed, currentProjectId);

        case CommandType.REMOVE_PACKAGE:
          return await this.handleRemovePackage(parsed, currentProjectId);

        case CommandType.VIEW_DEPLOYMENT:
          return await this.handleViewDeployment(parsed, currentProjectId);

        case CommandType.SET_DEPLOYMENT:
          return await this.handleSetDeployment(parsed, currentProjectId);

        case CommandType.VIEW_PUBLIC:
          return await this.handleViewPublic(parsed, currentProjectId);

        case CommandType.SET_PUBLIC:
          return await this.handleSetPublic(parsed, currentProjectId);

        case CommandType.VIEW_TEAM:
          return await this.handleViewTeam(parsed, currentProjectId);

        case CommandType.INVITE_MEMBER:
          return await this.handleInviteMember(parsed, currentProjectId);

        case CommandType.REMOVE_MEMBER:
          return await this.handleRemoveMember(parsed, currentProjectId);

        case CommandType.VIEW_SETTINGS:
          return await this.handleViewSettings(parsed, currentProjectId);

        case CommandType.SET_NAME:
          return await this.handleSetName(parsed, currentProjectId);

        case CommandType.SET_DESCRIPTION:
          return await this.handleSetDescription(parsed, currentProjectId);

        case CommandType.ADD_TAG:
          return await this.handleAddTag(parsed, currentProjectId);

        case CommandType.REMOVE_TAG:
          return await this.handleRemoveTag(parsed, currentProjectId);

        case CommandType.VIEW_NEWS:
          return await this.handleViewNews(parsed);

        case CommandType.SET_THEME:
          return await this.handleSetTheme(parsed);

        case CommandType.VIEW_THEMES:
          return this.handleViewThemes(parsed);

        case CommandType.SWAP_PROJECT:
          return await this.handleSwapProject(parsed);

        case CommandType.EXPORT:
          return await this.handleExport(parsed, currentProjectId);

        case CommandType.HELP:
          return this.handleHelp(parsed);

        case CommandType.WIZARD_NEW:
        case CommandType.WIZARD_SETUP:
        case CommandType.WIZARD_DEPLOY:
          return this.handleWizard(parsed);

        default:
          return {
            type: ResponseType.ERROR,
            message: `Command type ${parsed.type} not yet implemented`,
            suggestions: ['/help']
          };
      }
    } catch (error) {
      logError('Command execution error', error as Error, {
        userId: this.userId,
        command: commandStr
      });

      return {
        type: ResponseType.ERROR,
        message: 'An error occurred while executing the command',
        data: { error: (error as Error).message }
      };
    }
  }

  /**
   * Resolve project from mention or current context
   */
  private async resolveProject(
    projectMention?: string,
    currentProjectId?: string
  ): Promise<ProjectResolution> {
    try {
      let targetProjectId: string | undefined;

      // Priority 1: Use @mentioned project
      if (projectMention) {
        // Find project by name (case-insensitive)
        const project = await Project.findOne({
          $or: [
            { userId: this.userId },
            { ownerId: this.userId }
          ],
          name: new RegExp(`^${projectMention}$`, 'i')
        });

        // Also check team projects
        if (!project) {
          const teamMembership = await TeamMember.findOne({
            userId: this.userId
          });

          if (teamMembership) {
            const teamProject = await Project.findOne({
              _id: teamMembership.projectId,
              name: new RegExp(`^${projectMention}$`, 'i')
            });

            if (teamProject) {
              return { project: teamProject };
            }
          }
        }

        if (!project) {
          // Try fuzzy match
          const allProjects = await this.getUserProjects();
          const suggestions = allProjects
            .filter(p => p.name.toLowerCase().includes(projectMention.toLowerCase()))
            .map(p => p.name)
            .slice(0, 5);

          return {
            project: null,
            error: `Project "@${projectMention}" not found`,
            suggestions: suggestions.length > 0
              ? [`Did you mean: ${suggestions.join(', ')}?`]
              : undefined
          };
        }

        return { project };
      }

      // Priority 2: Use current project context
      if (currentProjectId) {
        const project = await Project.findById(currentProjectId);
        if (project) {
          // Verify user has access
          const hasAccess = await this.verifyProjectAccess(currentProjectId);
          if (hasAccess) {
            return { project };
          }
        }
      }

      // Priority 3: Prompt user to select project
      const userProjects = await this.getUserProjects();

      if (userProjects.length === 0) {
        return {
          project: null,
          error: 'No projects found. Create a project first with /wizard new'
        };
      }

      return {
        project: null,
        needsSelection: true,
        availableProjects: userProjects.map(p => ({
          id: p._id.toString(),
          name: p.name,
          description: p.description
        }))
      };
    } catch (error) {
      logError('Project resolution error', error as Error, { userId: this.userId });
      return {
        project: null,
        error: 'Failed to resolve project'
      };
    }
  }

  /**
   * Get all projects accessible by user
   */
  private async getUserProjects(): Promise<any[]> {
    const ownedProjects = await Project.find({
      $or: [
        { userId: this.userId },
        { ownerId: this.userId }
      ]
    });

    const teamProjectIds = await TeamMember.find({ userId: this.userId })
      .select('projectId')
      .lean()
      .then(memberships => memberships.map(tm => tm.projectId));

    const teamProjects = teamProjectIds.length > 0
      ? await Project.find({
          _id: { $in: teamProjectIds },
          $nor: [
            { userId: this.userId },
            { ownerId: this.userId }
          ]
        })
      : [];

    return [...ownedProjects, ...teamProjects];
  }

  /**
   * Verify user has access to a project
   */
  private async verifyProjectAccess(projectId: string): Promise<boolean> {
    const project = await Project.findById(projectId);
    if (!project) return false;

    // Check ownership
    if (project.userId?.toString() === this.userId ||
        project.ownerId?.toString() === this.userId) {
      return true;
    }

    // Check team membership
    const teamMember = await TeamMember.findOne({
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(this.userId)
    });

    return !!teamMember;
  }

  /**
   * Handle /add todo command
   */
  private async handleAddTodo(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const todoText = parsed.args.join(' ').trim();
    if (!todoText) {
      return {
        type: ResponseType.ERROR,
        message: 'Todo text is required',
        suggestions: ['/help add todo']
      };
    }

    // Create todo
    const newTodo = {
      id: uuidv4(),
      text: todoText,
      description: '',
      priority: 'medium' as const,
      completed: false,
      status: 'not_started' as const,
      createdAt: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    resolution.project.todos.push(newTodo);
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `✅ Added todo: "${todoText}" to ${resolution.project.name}`,
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'add_todo',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /add note command
   */
  private async handleAddNote(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const noteText = parsed.args.join(' ').trim();
    if (!noteText) {
      return {
        type: ResponseType.ERROR,
        message: 'Note text is required',
        suggestions: ['/help add note']
      };
    }

    // Create note with title from first few words
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

    resolution.project.notes.push(newNote);
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `📝 Added note to ${resolution.project.name}`,
      data: { title, preview: noteText.slice(0, 50) + (noteText.length > 50 ? '...' : '') },
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'add_note',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /add devlog command
   */
  private async handleAddDevLog(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const entryText = parsed.args.join(' ').trim();
    if (!entryText) {
      return {
        type: ResponseType.ERROR,
        message: 'Dev log entry is required',
        suggestions: ['/help add devlog']
      };
    }

    // Create dev log entry
    const newEntry = {
      id: uuidv4(),
      title: '',
      description: '',
      entry: entryText,
      date: new Date(),
      createdBy: new mongoose.Types.ObjectId(this.userId)
    };

    resolution.project.devLog.push(newEntry);
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `📋 Added dev log entry to ${resolution.project.name}`,
      data: { preview: entryText.slice(0, 50) + (entryText.length > 50 ? '...' : '') },
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'add_devlog',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /add doc command
   */
  private async handleAddDoc(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    // Parse: /add doc [type] [title] - [content]
    // Format: type title - content
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
    const docType = firstPart[0]; // Model, Route, API, etc
    const title = firstPart.slice(1).join(' ');
    const content = parts.slice(1).join(' - ').trim();

    if (!docType || !title || !content) {
      return {
        type: ResponseType.ERROR,
        message: 'Type, title, and content are all required',
        suggestions: ['/help add doc']
      };
    }

    // Valid doc types
    const validTypes = ['Model', 'Route', 'API', 'Util', 'ENV', 'Auth', 'Runtime', 'Framework'];
    if (!validTypes.includes(docType)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid doc type "${docType}". Valid types: ${validTypes.join(', ')}`,
        suggestions: validTypes.map(t => `/add doc ${t} [title] - [content]`)
      };
    }

    // Create doc
    const newDoc = {
      id: uuidv4(),
      type: docType as any,
      title,
      content,
      createdAt: new Date()
    };

    resolution.project.docs.push(newDoc);
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `📚 Added ${docType} doc: "${title}" to ${resolution.project.name}`,
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'add_doc',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /view notes command
   */
  private async handleViewNotes(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const notes = resolution.project.notes || [];

    if (notes.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `📝 No notes found in ${resolution.project.name}`,
        suggestions: [`/add note [text] @${resolution.project.name}`]
      };
    }

    return {
      type: ResponseType.DATA,
      message: `📝 Notes in ${resolution.project.name} (${notes.length})`,
      data: {
        notes: notes.map((note: any) => ({
          id: note.id,
          title: note.title,
          preview: note.content?.slice(0, 100) + (note.content?.length > 100 ? '...' : ''),
          createdAt: note.createdAt,
          updatedAt: note.updatedAt
        }))
      },
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'view_notes'
      }
    };
  }

  /**
   * Handle /view todos command
   */
  private async handleViewTodos(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const todos = resolution.project.todos || [];

    if (todos.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `✅ No todos found in ${resolution.project.name}`,
        suggestions: [`/add todo [text] @${resolution.project.name}`]
      };
    }

    const completed = todos.filter((t: any) => t.completed).length;
    const pending = todos.length - completed;

    return {
      type: ResponseType.DATA,
      message: `✅ Todos in ${resolution.project.name} (${pending} pending, ${completed} completed)`,
      data: {
        todos: todos.map((todo: any) => ({
          id: todo.id,
          text: todo.text,
          priority: todo.priority,
          status: todo.status,
          completed: todo.completed,
          dueDate: todo.dueDate
        }))
      },
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'view_todos'
      }
    };
  }

  /**
   * Handle /view devlog command
   */
  private async handleViewDevLog(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const devLog = resolution.project.devLog || [];

    if (devLog.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `📋 No dev log entries found in ${resolution.project.name}`,
        suggestions: [`/add devlog [text] @${resolution.project.name}`]
      };
    }

    return {
      type: ResponseType.DATA,
      message: `📋 Dev Log in ${resolution.project.name} (${devLog.length} entries)`,
      data: {
        entries: devLog.map((entry: any) => ({
          id: entry.id,
          title: entry.title,
          entry: entry.entry,
          date: entry.date
        })).reverse() // Most recent first
      },
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'view_devlog'
      }
    };
  }

  /**
   * Handle /view docs command
   */
  private async handleViewDocs(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const docs = resolution.project.docs || [];

    if (docs.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `📚 No documentation found in ${resolution.project.name}`
      };
    }

    return {
      type: ResponseType.DATA,
      message: `📚 Documentation in ${resolution.project.name} (${docs.length} docs)`,
      data: {
        docs: docs.map((doc: any) => ({
          id: doc.id,
          type: doc.type,
          title: doc.title,
          createdAt: doc.createdAt
        }))
      },
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'view_docs'
      }
    };
  }

  /**
   * Handle /swap command
   */
  private async handleSwapProject(parsed: ParsedCommand): Promise<CommandResponse> {
    // Use @project mention if provided, otherwise show project list
    if (!parsed.projectMention) {
      // List all projects
      const projects = await this.getUserProjects();
      return {
        type: ResponseType.PROMPT,
        message: 'Select a project to switch to:',
        data: {
          projects: projects.map(p => ({
            id: p._id.toString(),
            name: p.name,
            description: p.description,
            category: p.category
          }))
        }
      };
    }

    // Find project by name from @mention
    const project = await Project.findOne({
      $or: [
        { userId: this.userId },
        { ownerId: this.userId }
      ],
      name: new RegExp(`^${parsed.projectMention}$`, 'i')
    });

    if (!project) {
      // Try fuzzy match
      const allProjects = await this.getUserProjects();
      const suggestions = allProjects
        .filter(p => p.name.toLowerCase().includes(parsed.projectMention!.toLowerCase()))
        .map(p => `/swap @${p.name}`);

      return {
        type: ResponseType.ERROR,
        message: `Project "@${parsed.projectMention}" not found`,
        suggestions: suggestions.length > 0 ? suggestions : ['/swap']
      };
    }

    return {
      type: ResponseType.SUCCESS,
      message: `🔄 Switched to ${project.name}`,
      data: {
        project: {
          id: project._id.toString(),
          name: project.name,
          description: project.description,
          color: project.color
        }
      },
      metadata: {
        projectId: project._id.toString(),
        projectName: project.name,
        action: 'swap_project'
      }
    };
  }

  /**
   * Handle /export command
   */
  private async handleExport(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    return {
      type: ResponseType.SUCCESS,
      message: `📦 Preparing export for ${resolution.project.name}`,
      data: {
        exportUrl: `/api/projects/${resolution.project._id}/export`,
        projectName: resolution.project.name
      },
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'export'
      }
    };
  }

  /**
   * Handle /help command
   */
  private handleHelp(parsed: ParsedCommand): CommandResponse {
    if (parsed.args.length > 0) {
      // Help for specific command
      const commandName = parsed.args.join(' ').toLowerCase();
      const metadata = Object.values(COMMAND_METADATA).find(
        cmd => cmd.syntax.toLowerCase().includes(commandName)
      );

      if (metadata) {
        return {
          type: ResponseType.INFO,
          message: `📖 Help for ${commandName}`,
          data: {
            syntax: metadata.syntax,
            description: metadata.description,
            examples: metadata.examples
          }
        };
      }

      return {
        type: ResponseType.ERROR,
        message: `Command "${commandName}" not found`,
        suggestions: ['/help']
      };
    }

    // General help
    const commands = CommandParser.getAllCommands();
    const grouped: Record<string, any[]> = {
      'Add Items': [],
      'View Items': [],
      'Project Management': [],
      'Settings & Configuration': [],
      'Wizards': [],
      'Other': []
    };

    commands.forEach(cmd => {
      if (cmd.type.toString().startsWith('add_')) {
        grouped['Add Items'].push(cmd);
      } else if (cmd.type.toString().startsWith('view_')) {
        grouped['View Items'].push(cmd);
      } else if (cmd.type.toString().startsWith('wizard_')) {
        grouped['Wizards'].push(cmd);
      } else if (['swap_project', 'export'].includes(cmd.type.toString())) {
        grouped['Project Management'].push(cmd);
      } else if (cmd.type.toString().startsWith('set_') || cmd.type.toString().startsWith('remove_')) {
        grouped['Settings & Configuration'].push(cmd);
      } else {
        grouped['Other'].push(cmd);
      }
    });

    return {
      type: ResponseType.INFO,
      message: '📖 Available Commands',
      data: { grouped }
    };
  }

  /**
   * Handle wizard commands (placeholder)
   */
  private handleWizard(parsed: ParsedCommand): CommandResponse {
    return {
      type: ResponseType.INFO,
      message: `🧙 ${parsed.command} wizard coming soon!`,
      suggestions: ['/help']
    };
  }

  /**
   * Handle /add tech command
   */
  private async handleAddTech(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const name = parsed.args[0];
    if (!name) {
      return {
        type: ResponseType.ERROR,
        message: 'Technology name is required',
        suggestions: ['/help add tech']
      };
    }

    const category = (parsed.flags.get('category') as string) || 'framework';
    const version = (parsed.flags.get('version') as string) || '';

    // Check if already exists
    const exists = resolution.project.selectedTechnologies?.some(
      (t: any) => t.name === name && t.category === category
    );

    if (exists) {
      return {
        type: ResponseType.ERROR,
        message: `Technology "${name}" already exists in ${category}`,
        suggestions: [`/remove tech ${name}`, '/view stack']
      };
    }

    // Add technology
    const newTech = {
      category,
      name,
      version
    };

    if (!resolution.project.selectedTechnologies) {
      resolution.project.selectedTechnologies = [];
    }

    resolution.project.selectedTechnologies.push(newTech);
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `⚡ Added ${name}${version ? ` v${version}` : ''} to tech stack`,
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'add_tech',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /add package command
   */
  private async handleAddPackage(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const name = parsed.args[0];
    if (!name) {
      return {
        type: ResponseType.ERROR,
        message: 'Package name is required',
        suggestions: ['/help add package']
      };
    }

    const category = (parsed.flags.get('category') as string) || 'utility';
    const version = (parsed.flags.get('version') as string) || '';

    // Check if already exists
    const exists = resolution.project.selectedPackages?.some(
      (p: any) => p.name === name && p.category === category
    );

    if (exists) {
      return {
        type: ResponseType.ERROR,
        message: `Package "${name}" already exists in ${category}`,
        suggestions: [`/remove package ${name}`, '/view stack']
      };
    }

    // Add package
    const newPackage = {
      category,
      name,
      version
    };

    if (!resolution.project.selectedPackages) {
      resolution.project.selectedPackages = [];
    }

    resolution.project.selectedPackages.push(newPackage);
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `📦 Added ${name}${version ? ` v${version}` : ''} to packages`,
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'add_package',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /view stack command
   */
  private async handleViewStack(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const technologies = resolution.project.selectedTechnologies || [];
    const packages = resolution.project.selectedPackages || [];

    if (technologies.length === 0 && packages.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `⚡ No tech stack defined for ${resolution.project.name}`,
        suggestions: ['/add tech React --category=framework', '/add package express --category=api']
      };
    }

    return {
      type: ResponseType.DATA,
      message: `⚡ Tech Stack for ${resolution.project.name}`,
      data: {
        stack: {
          technologies: technologies.map((t: any) => ({
            name: t.name,
            category: t.category,
            version: t.version
          })),
          packages: packages.map((p: any) => ({
            name: p.name,
            category: p.category,
            version: p.version
          }))
        }
      },
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'view_stack'
      }
    };
  }

  /**
   * Handle /remove tech command
   */
  private async handleRemoveTech(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const name = parsed.args[0];
    if (!name) {
      return {
        type: ResponseType.ERROR,
        message: 'Technology name is required',
        suggestions: ['/help remove tech']
      };
    }

    const technologies = resolution.project.selectedTechnologies || [];
    const index = technologies.findIndex((t: any) => t.name === name);

    if (index === -1) {
      return {
        type: ResponseType.ERROR,
        message: `Technology "${name}" not found in stack`,
        suggestions: ['/view stack']
      };
    }

    technologies.splice(index, 1);
    resolution.project.selectedTechnologies = technologies;
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `🗑️ Removed ${name} from tech stack`,
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'remove_tech',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /remove package command
   */
  private async handleRemovePackage(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const name = parsed.args[0];
    if (!name) {
      return {
        type: ResponseType.ERROR,
        message: 'Package name is required',
        suggestions: ['/help remove package']
      };
    }

    const packages = resolution.project.selectedPackages || [];
    const index = packages.findIndex((p: any) => p.name === name);

    if (index === -1) {
      return {
        type: ResponseType.ERROR,
        message: `Package "${name}" not found`,
        suggestions: ['/view stack']
      };
    }

    packages.splice(index, 1);
    resolution.project.selectedPackages = packages;
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `🗑️ Removed ${name} from packages`,
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'remove_package',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /view deployment command
   */
  private async handleViewDeployment(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const dd = resolution.project.deploymentData || {};

    return {
      type: ResponseType.DATA,
      message: `🚀 Deployment info for ${resolution.project.name}`,
      data: {
        deployment: {
          liveUrl: dd.liveUrl || 'Not set',
          platform: dd.deploymentPlatform || 'Not set',
          status: dd.deploymentStatus || 'inactive',
          lastDeploy: dd.lastDeployDate || 'Never',
          branch: dd.deploymentBranch || 'main',
          buildCommand: dd.buildCommand || 'Not set',
          startCommand: dd.startCommand || 'Not set'
        }
      },
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'view_deployment'
      }
    };
  }

  /**
   * Handle /set deployment command
   */
  private async handleSetDeployment(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const deploymentData = resolution.project.deploymentData || {};
    let updated = false;

    // Update fields from flags
    if (parsed.flags.has('url')) {
      deploymentData.liveUrl = parsed.flags.get('url') as string;
      updated = true;
    }
    if (parsed.flags.has('platform')) {
      deploymentData.deploymentPlatform = parsed.flags.get('platform') as string;
      updated = true;
    }
    if (parsed.flags.has('status')) {
      deploymentData.deploymentStatus = parsed.flags.get('status') as any;
      updated = true;
    }
    if (parsed.flags.has('branch')) {
      deploymentData.deploymentBranch = parsed.flags.get('branch') as string;
      updated = true;
    }

    if (!updated) {
      return {
        type: ResponseType.ERROR,
        message: 'No deployment data provided. Use flags like --url, --platform, --status, --branch',
        suggestions: ['/help set deployment']
      };
    }

    resolution.project.deploymentData = deploymentData;
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `🚀 Updated deployment settings for ${resolution.project.name}`,
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'set_deployment',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /view public command
   */
  private async handleViewPublic(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    return {
      type: ResponseType.DATA,
      message: `🌐 Public settings for ${resolution.project.name}`,
      data: {
        publicSettings: {
          isPublic: resolution.project.isPublic || false,
          slug: resolution.project.publicSlug || 'Not set',
          description: resolution.project.publicDescription || 'Not set',
          url: resolution.project.isPublic && resolution.project.publicSlug
            ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/public/${resolution.project.publicSlug}`
            : 'Not available (project is private)'
        }
      },
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'view_public'
      }
    };
  }

  /**
   * Handle /set public command
   */
  private async handleSetPublic(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    let updated = false;

    // Check for "make public/private" command
    if (parsed.command.includes('make public')) {
      resolution.project.isPublic = true;
      updated = true;
    } else if (parsed.command.includes('make private')) {
      resolution.project.isPublic = false;
      updated = true;
    }

    // Update from flags
    if (parsed.flags.has('enabled')) {
      resolution.project.isPublic = parsed.flags.get('enabled') === 'true';
      updated = true;
    }
    if (parsed.flags.has('slug')) {
      resolution.project.publicSlug = parsed.flags.get('slug') as string;
      updated = true;
    }

    if (!updated) {
      return {
        type: ResponseType.ERROR,
        message: 'Use --enabled=true/false or --slug=your-slug',
        suggestions: ['/make public --slug=my-project', '/make private']
      };
    }

    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `🌐 Project is now ${resolution.project.isPublic ? 'public' : 'private'}`,
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'set_public',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /view team command
   */
  private async handleViewTeam(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    // Get team members
    const members = await TeamMember.find({ projectId: resolution.project._id })
      .populate('userId', 'firstName lastName email')
      .lean();

    if (members.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `👥 No team members in ${resolution.project.name} (you're the owner)`,
        suggestions: ['/invite user@example.com --role=editor']
      };
    }

    return {
      type: ResponseType.DATA,
      message: `👥 Team members in ${resolution.project.name} (${members.length})`,
      data: {
        members: members.map((m: any) => ({
          name: `${m.userId.firstName} ${m.userId.lastName}`,
          email: m.userId.email,
          role: m.role,
          isOwner: m.isOwner || false
        }))
      },
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'view_team'
      }
    };
  }

  /**
   * Handle /invite command
   */
  private async handleInviteMember(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const email = parsed.args[0];
    if (!email || !email.includes('@')) {
      return {
        type: ResponseType.ERROR,
        message: 'Valid email is required',
        suggestions: ['/invite user@example.com --role=editor @myproject']
      };
    }

    const role = (parsed.flags.get('role') as string) || 'editor';

    if (!['editor', 'viewer'].includes(role)) {
      return {
        type: ResponseType.ERROR,
        message: 'Role must be editor or viewer',
        suggestions: ['/invite user@example.com --role=editor']
      };
    }

    // Check if user is trying to invite themselves
    const inviter = await User.findById(this.userId);
    if (inviter?.email.toLowerCase() === email.toLowerCase()) {
      return {
        type: ResponseType.ERROR,
        message: 'Cannot invite yourself to the project'
      };
    }

    // Check if user is already a member
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const existingMember = await TeamMember.findOne({
        projectId: resolution.project._id,
        userId: existingUser._id,
      });

      if (existingMember) {
        return {
          type: ResponseType.ERROR,
          message: 'User is already a team member',
          suggestions: ['/view team']
        };
      }

      // Check if user is the owner
      if (resolution.project.ownerId?.toString() === existingUser._id.toString()) {
        return {
          type: ResponseType.ERROR,
          message: 'User is already the project owner'
        };
      }
    }

    // Check if there's already a pending invitation
    const existingInvitation = await ProjectInvitation.findOne({
      projectId: resolution.project._id,
      inviteeEmail: email.toLowerCase(),
      status: 'pending',
    });

    if (existingInvitation) {
      return {
        type: ResponseType.ERROR,
        message: 'Invitation already sent to this email',
        suggestions: ['/view team']
      };
    }

    // Create invitation
    const invitation = new ProjectInvitation({
      projectId: resolution.project._id,
      inviterUserId: this.userId,
      inviteeEmail: email.toLowerCase(),
      inviteeUserId: existingUser?._id,
      role,
      token: require('crypto').randomBytes(32).toString('hex'),
    });

    await invitation.save();

    // Create notification if user exists
    if (existingUser) {
      await Notification.create({
        userId: existingUser._id,
        type: 'project_invitation',
        title: 'Project Invitation',
        message: `${inviter?.firstName} ${inviter?.lastName} invited you to collaborate on "${resolution.project.name}"`,
        actionUrl: `/notifications/invitation/${invitation._id}`,
        relatedProjectId: resolution.project._id,
        relatedInvitationId: invitation._id,
      });
    }

    // Send invitation email
    try {
      const inviterName = `${inviter?.firstName || ''} ${inviter?.lastName || ''}`.trim() || 'Someone';
      await sendProjectInvitationEmail(
        email,
        inviterName,
        resolution.project.name,
        invitation.token,
        role
      );
    } catch (emailError) {
      logError('Failed to send invitation email', emailError as Error);
      // Continue without failing the invitation creation
    }

    // Mark project as shared if not already
    let wasShared = resolution.project.isShared;
    if (!resolution.project.isShared) {
      resolution.project.isShared = true;
      await resolution.project.save();
    }

    const sharedMessage = wasShared ? '' : ' (Project is now shared)';
    return {
      type: ResponseType.SUCCESS,
      message: `📧 Invitation sent to ${email} as ${role}${sharedMessage}`,
      suggestions: ['/view team'],
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'invite_member',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /remove member command
   */
  private async handleRemoveMember(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const email = parsed.args[0];
    if (!email || !email.includes('@')) {
      return {
        type: ResponseType.ERROR,
        message: 'Valid email is required',
        suggestions: ['/remove member user@example.com', '/rm user@example.com']
      };
    }

    // Find user by email
    const userToRemove = await User.findOne({ email: email.toLowerCase() });
    if (!userToRemove) {
      return {
        type: ResponseType.ERROR,
        message: `User with email "${email}" not found`,
        suggestions: ['/view team']
      };
    }

    // Check if user is the owner
    if (resolution.project.ownerId?.toString() === userToRemove._id.toString() ||
        resolution.project.userId?.toString() === userToRemove._id.toString()) {
      return {
        type: ResponseType.ERROR,
        message: 'Cannot remove the project owner'
      };
    }

    // Find and remove team member
    const teamMember = await TeamMember.findOne({
      projectId: resolution.project._id,
      userId: userToRemove._id
    });

    if (!teamMember) {
      return {
        type: ResponseType.ERROR,
        message: `${email} is not a member of this project`,
        suggestions: ['/view team']
      };
    }

    // Remove the team member
    await TeamMember.findByIdAndDelete(teamMember._id);

    // Create notification for removed user
    await Notification.create({
      userId: userToRemove._id,
      type: 'team_update',
      title: 'Removed from Project',
      message: `You have been removed from the project "${resolution.project.name}"`,
      relatedProjectId: resolution.project._id
    });

    // Check if there are any remaining team members
    const remainingMembers = await TeamMember.countDocuments({
      projectId: resolution.project._id
    });

    // If no team members left, mark project as not shared
    if (remainingMembers === 0) {
      resolution.project.isShared = false;
      await resolution.project.save();
    }

    return {
      type: ResponseType.SUCCESS,
      message: `🗑️ Removed ${email} from ${resolution.project.name}`,
      suggestions: ['/view team'],
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'remove_member',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /view settings command
   */
  private async handleViewSettings(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    return {
      type: ResponseType.DATA,
      message: `⚙️ Settings for ${resolution.project.name}`,
      data: {
        settings: {
          name: resolution.project.name,
          description: resolution.project.description,
          category: resolution.project.category,
          tags: resolution.project.tags || [],
          color: resolution.project.color,
          environment: resolution.project.stagingEnvironment
        }
      },
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'view_settings'
      }
    };
  }

  /**
   * Handle /set name command
   */
  private async handleSetName(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const newName = parsed.args.join(' ').trim();
    if (!newName) {
      return {
        type: ResponseType.ERROR,
        message: 'New name is required',
        suggestions: ['/set name My New Project Name']
      };
    }

    const oldName = resolution.project.name;
    resolution.project.name = newName;
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `✏️ Renamed "${oldName}" to "${newName}"`,
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: newName,
        action: 'set_name',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /set description command
   */
  private async handleSetDescription(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const newDescription = parsed.args.join(' ').trim();
    if (!newDescription) {
      return {
        type: ResponseType.ERROR,
        message: 'New description is required',
        suggestions: ['/set description A web app for managing tasks']
      };
    }

    resolution.project.description = newDescription;
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `📝 Updated description for ${resolution.project.name}`,
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'set_description',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /add tag command
   */
  private async handleAddTag(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const tag = parsed.args[0];
    if (!tag) {
      return {
        type: ResponseType.ERROR,
        message: 'Tag name is required',
        suggestions: ['/add tag react']
      };
    }

    if (!resolution.project.tags) {
      resolution.project.tags = [];
    }

    if (resolution.project.tags.includes(tag)) {
      return {
        type: ResponseType.ERROR,
        message: `Tag "${tag}" already exists`,
        suggestions: ['/view settings']
      };
    }

    resolution.project.tags.push(tag);
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `🏷️ Added tag "${tag}" to ${resolution.project.name}`,
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'add_tag',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /remove tag command
   */
  private async handleRemoveTag(
    parsed: ParsedCommand,
    currentProjectId?: string
  ): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          type: ResponseType.PROMPT,
          message: 'Please specify a project using @projectname or select from:',
          data: { projects: resolution.availableProjects }
        };
      }
      return {
        type: ResponseType.ERROR,
        message: resolution.error || 'Project not found',
        suggestions: resolution.suggestions
      };
    }

    const tag = parsed.args[0];
    if (!tag) {
      return {
        type: ResponseType.ERROR,
        message: 'Tag name is required',
        suggestions: ['/remove tag react']
      };
    }

    const tags = resolution.project.tags || [];
    const index = tags.indexOf(tag);

    if (index === -1) {
      return {
        type: ResponseType.ERROR,
        message: `Tag "${tag}" not found`,
        suggestions: ['/view settings']
      };
    }

    tags.splice(index, 1);
    resolution.project.tags = tags;
    await resolution.project.save();

    return {
      type: ResponseType.SUCCESS,
      message: `🗑️ Removed tag "${tag}" from ${resolution.project.name}`,
      metadata: {
        projectId: resolution.project._id.toString(),
        projectName: resolution.project.name,
        action: 'remove_tag',
        timestamp: new Date()
      }
    };
  }

  /**
   * Handle /view news command
   */
  private async handleViewNews(parsed: ParsedCommand): Promise<CommandResponse> {
    try {
      // Import news model dynamically
      const News = require('../models/News').default;

      // Fetch published news posts
      const newsPosts = await News.find({ status: 'published' })
        .sort({ publishedAt: -1 })
        .limit(5)
        .select('title type summary publishedAt')
        .lean();

      if (newsPosts.length === 0) {
        return {
          type: ResponseType.INFO,
          message: '📰 No news available at the moment'
        };
      }

      return {
        type: ResponseType.DATA,
        message: `📰 Latest news (${newsPosts.length})`,
        data: {
          news: newsPosts.map((post: any) => ({
            title: post.title,
            type: post.type,
            summary: post.summary,
            date: post.publishedAt
          }))
        }
      };
    } catch (error) {
      logError('Error fetching news', error as Error);
      return {
        type: ResponseType.ERROR,
        message: 'Unable to fetch news at this time'
      };
    }
  }

  /**
   * Handle /set theme command
   */
  private async handleSetTheme(parsed: ParsedCommand): Promise<CommandResponse> {
    const themeName = parsed.args[0];

    if (!themeName) {
      return {
        type: ResponseType.ERROR,
        message: 'Theme name is required',
        suggestions: ['/set theme dark', '/view themes']
      };
    }

    // List of valid themes (DaisyUI themes)
    const validThemes = [
      'dim', 'light', 'dark', 'cupcake', 'bumblebee', 'emerald',
      'retro', 'cyberpunk', 'synthwave', 'forest', 'aqua', 'lofi',
      'pastel', 'fantasy', 'wireframe', 'black', 'luxury', 'dracula',
      'cmyk', 'autumn', 'business', 'acid', 'lemonade', 'night',
      'coffee', 'winter', 'nord', 'sunset'
    ];

    if (!validThemes.includes(themeName.toLowerCase())) {
      return {
        type: ResponseType.ERROR,
        message: `Theme "${themeName}" not found`,
        suggestions: ['/view themes', '/set theme dark']
      };
    }

    try {
      // Update user settings
      const user = await User.findById(this.userId);
      if (!user) {
        return {
          type: ResponseType.ERROR,
          message: 'User not found'
        };
      }

      // Update theme in user settings
      await user.save();

      return {
        type: ResponseType.SUCCESS,
        message: `🎨 Theme changed to ${themeName}`,
        data: {
          theme: themeName.toLowerCase(),
          needsReload: true // Signal frontend to apply theme
        }
      };
    } catch (error) {
      logError('Error setting theme', error as Error);
      return {
        type: ResponseType.ERROR,
        message: 'Unable to set theme at this time'
      };
    }
  }

  /**
   * Handle /view themes command
   */
  private handleViewThemes(parsed: ParsedCommand): CommandResponse {
    const themes = [
      { name: 'dim', description: 'Dim gray theme' },
      { name: 'light', description: 'Light theme' },
      { name: 'dark', description: 'Dark theme' },
      { name: 'cupcake', description: 'Sweet pink theme' },
      { name: 'bumblebee', description: 'Yellow and black' },
      { name: 'emerald', description: 'Green theme' },
      { name: 'retro', description: 'Vintage style' },
      { name: 'cyberpunk', description: 'Futuristic neon' },
      { name: 'synthwave', description: 'Retrowave style' },
      { name: 'forest', description: 'Nature green' },
      { name: 'aqua', description: 'Ocean blue' },
      { name: 'lofi', description: 'Calm and minimal' },
      { name: 'pastel', description: 'Soft colors' },
      { name: 'fantasy', description: 'Purple fantasy' },
      { name: 'wireframe', description: 'Minimal lines' },
      { name: 'black', description: 'Pure black' },
      { name: 'luxury', description: 'Gold and black' },
      { name: 'dracula', description: 'Dracula purple' },
      { name: 'cmyk', description: 'Print colors' },
      { name: 'autumn', description: 'Fall colors' },
      { name: 'business', description: 'Professional blue' },
      { name: 'acid', description: 'Bright lime' },
      { name: 'lemonade', description: 'Lemon yellow' },
      { name: 'night', description: 'Deep night blue' },
      { name: 'coffee', description: 'Brown coffee' },
      { name: 'winter', description: 'Cool winter' },
      { name: 'nord', description: 'Nordic theme' },
      { name: 'sunset', description: 'Sunset orange' }
    ];

    return {
      type: ResponseType.DATA,
      message: '🎨 Available themes',
      data: {
        themes: themes.map(t => ({
          name: t.name,
          description: t.description
        }))
      },
      suggestions: ['/set theme dark', '/set theme light']
    };
  }
}
