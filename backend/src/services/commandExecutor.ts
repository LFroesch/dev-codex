import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { User } from '../models/User';
import TeamMember from '../models/TeamMember';
import { CommandParser, CommandType, ParsedCommand, COMMAND_METADATA } from './commandParser';
import { logInfo, logError } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

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

        case CommandType.VIEW_NOTES:
          return await this.handleViewNotes(parsed, currentProjectId);

        case CommandType.VIEW_TODOS:
          return await this.handleViewTodos(parsed, currentProjectId);

        case CommandType.VIEW_DEVLOG:
          return await this.handleViewDevLog(parsed, currentProjectId);

        case CommandType.VIEW_DOCS:
          return await this.handleViewDocs(parsed, currentProjectId);

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
   * Handle /swap-project command
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
        .map(p => `/swap-project @${p.name}`);

      return {
        type: ResponseType.ERROR,
        message: `Project "@${parsed.projectMention}" not found`,
        suggestions: suggestions.length > 0 ? suggestions : ['/swap-project']
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
}
