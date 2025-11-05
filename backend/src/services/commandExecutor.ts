import { CommandParser, CommandType, ParsedCommand } from './commandParser';
import { logInfo, logError } from '../config/logger';
import { TodoHandlers } from './handlers/crud/TodoHandlers';
import { NoteHandlers } from './handlers/crud/NoteHandlers';
import { DevLogHandlers } from './handlers/crud/DevLogHandlers';
import { ComponentHandlers } from './handlers/crud/ComponentHandlers';
import { RelationshipHandlers } from './handlers/crud/RelationshipHandlers';
import { SearchHandlers } from './handlers/crud/SearchHandlers';
import { StackHandlers } from './handlers/StackHandlers';
import { TeamHandlers } from './handlers/TeamHandlers';
import { SettingsHandlers } from './handlers/SettingsHandlers';
import { UtilityHandlers } from './handlers/UtilityHandlers';
import { ResponseType, CommandResponse } from './types';
import { Project } from '../models/Project';

// Re-export types for backward compatibility
export { ResponseType, CommandResponse } from './types';

/**
 * Legacy interface - kept for backward compatibility
 */
export interface CommandResponseLegacy {
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
 * Command Executor Service
 * Routes commands to specialized handler modules
 */
export class CommandExecutor {
  private userId: string;
  private todoHandlers: TodoHandlers;
  private noteHandlers: NoteHandlers;
  private devLogHandlers: DevLogHandlers;
  private componentHandlers: ComponentHandlers;
  private relationshipHandlers: RelationshipHandlers;
  private searchHandlers: SearchHandlers;
  private stackHandlers: StackHandlers;
  private teamHandlers: TeamHandlers;
  private settingsHandlers: SettingsHandlers;
  private utilityHandlers: UtilityHandlers;

  constructor(userId: string) {
    this.userId = userId;
    this.todoHandlers = new TodoHandlers(userId);
    this.noteHandlers = new NoteHandlers(userId);
    this.devLogHandlers = new DevLogHandlers(userId);
    this.componentHandlers = new ComponentHandlers(userId);
    this.relationshipHandlers = new RelationshipHandlers(userId);
    this.searchHandlers = new SearchHandlers(userId);
    this.stackHandlers = new StackHandlers(userId);
    this.teamHandlers = new TeamHandlers(userId);
    this.settingsHandlers = new SettingsHandlers(userId);
    this.utilityHandlers = new UtilityHandlers(userId);
  }

  /**
   * Execute a command (supports batch chaining with && and newlines)
   * @param commandStr - Raw command string
   * @param currentProjectId - Optional current project context
   * @returns Command response
   */
  async execute(commandStr: string, currentProjectId?: string): Promise<CommandResponse> {
    try {
      // Check for batch command chaining (&& or newlines)
      if (commandStr.includes(' && ') || commandStr.includes('\n')) {
        return await this.executeBatch(commandStr, currentProjectId);
      }

      return await this.executeSingle(commandStr, currentProjectId);
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
   * Split batch commands on && and newlines while respecting quoted strings
   * @param commandStr - Raw batch command string
   * @returns Array of individual commands
   */
  private splitBatchCommands(commandStr: string): string[] {
    const commands: string[] = [];
    let currentCommand = '';
    let inQuotes = false;
    let quoteChar = '';
    let escaped = false;

    for (let i = 0; i < commandStr.length; i++) {
      const char = commandStr[i];
      const nextChar = commandStr[i + 1];
      const nextNextChar = commandStr[i + 2];

      // Handle escape sequences
      if (escaped) {
        currentCommand += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        currentCommand += char;
        escaped = true;
        continue;
      }

      // Handle quotes
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        currentCommand += char;
        continue;
      }

      if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
        currentCommand += char;
        continue;
      }

      // Check for && separator (only when not in quotes)
      if (!inQuotes && char === ' ' && nextChar === '&' && nextNextChar === '&') {
        // Found &&, save current command and skip the &&
        if (currentCommand.trim()) {
          commands.push(currentCommand.trim());
        }
        currentCommand = '';
        i += 2; // Skip the &&
        // Skip any trailing spaces and newlines after &&
        while (i + 1 < commandStr.length && (commandStr[i + 1] === ' ' || commandStr[i + 1] === '\n' || commandStr[i + 1] === '\r')) {
          i++;
        }
        continue;
      }

      // Check for newline separator (only when not in quotes)
      if (!inQuotes && (char === '\n' || char === '\r')) {
        // Save current command if not empty
        if (currentCommand.trim()) {
          commands.push(currentCommand.trim());
        }
        currentCommand = '';

        // Skip consecutive newlines/carriage returns
        while (i + 1 < commandStr.length && (commandStr[i + 1] === '\n' || commandStr[i + 1] === '\r')) {
          i++;
        }

        // Skip spaces after newline
        while (i + 1 < commandStr.length && commandStr[i + 1] === ' ') {
          i++;
        }

        // If there's a && right after, skip it (so we don't double-split)
        if (i + 2 < commandStr.length && commandStr[i + 1] === '&' && commandStr[i + 2] === '&') {
          i += 2;
          while (i + 1 < commandStr.length && commandStr[i + 1] === ' ') {
            i++;
          }
        }
        continue;
      }

      // Regular character
      currentCommand += char;
    }

    // Add the last command
    if (currentCommand.trim()) {
      commands.push(currentCommand.trim());
    }

    return commands;
  }

  /**
   * Execute multiple chained commands
   * @param commandStr - Command string with && separators
   * @param currentProjectId - Optional current project context
   * @returns Combined command response
   */
  private async executeBatch(commandStr: string, currentProjectId?: string): Promise<CommandResponse> {
    const commands = this.splitBatchCommands(commandStr);

    if (commands.length > 10) {
      return {
        type: ResponseType.ERROR,
        message: 'Too many chained commands. Maximum is 10 commands per batch.',
        suggestions: ['Break up your commands into smaller batches']
      };
    }

    const results: CommandResponse[] = [];
    let hasError = false;

    logInfo('Executing batch commands', {
      userId: this.userId,
      count: commands.length
    });

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const result = await this.executeSingle(command, currentProjectId);
      results.push(result);

      // Stop on error
      if (result.type === ResponseType.ERROR) {
        hasError = true;
        break;
      }
    }

    const successCount = results.filter(r => r.type === ResponseType.SUCCESS).length;
    const errorCount = results.filter(r => r.type === ResponseType.ERROR).length;

    return {
      type: hasError ? ResponseType.WARNING : ResponseType.SUCCESS,
      message: `Batch execution: ${successCount} succeeded, ${errorCount} failed`,
      data: {
        batch: true,
        total: commands.length,
        executed: results.length,
        results: results.map((r, i) => ({
          command: commands[i],
          type: r.type,
          message: r.message,
          data: r.data,
          metadata: r.metadata
        }))
      },
      metadata: {
        action: 'batch_execute',
        timestamp: new Date()
      }
    };
  }

  /**
   * Execute a single command
   * @param commandStr - Raw command string
   * @param currentProjectId - Optional current project context
   * @returns Command response
   */
  private async executeSingle(commandStr: string, currentProjectId?: string): Promise<CommandResponse> {
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

    // Check if project is locked before executing write commands
    const writeCommands = [
      CommandType.ADD_TODO, CommandType.COMPLETE_TODO, CommandType.ASSIGN_TODO,
      CommandType.PUSH_TODO, CommandType.EDIT_TODO, CommandType.DELETE_TODO,
      CommandType.ADD_SUBTASK, CommandType.EDIT_SUBTASK, CommandType.DELETE_SUBTASK,
      CommandType.ADD_NOTE, CommandType.EDIT_NOTE, CommandType.DELETE_NOTE,
      CommandType.ADD_DEVLOG, CommandType.EDIT_DEVLOG, CommandType.DELETE_DEVLOG,
      CommandType.ADD_COMPONENT, CommandType.EDIT_COMPONENT, CommandType.DELETE_COMPONENT,
      CommandType.ADD_RELATIONSHIP, CommandType.EDIT_RELATIONSHIP, CommandType.DELETE_RELATIONSHIP,
      CommandType.ADD_STACK, CommandType.REMOVE_STACK,
      CommandType.INVITE_MEMBER, CommandType.REMOVE_MEMBER,
      CommandType.SET_NAME, CommandType.SET_DESCRIPTION, CommandType.ADD_TAG,
      CommandType.REMOVE_TAG, CommandType.SET_DEPLOYMENT, CommandType.SET_PUBLIC
    ];

    if (writeCommands.includes(parsed.type) && currentProjectId) {
      try {
        const project = await Project.findById(currentProjectId);

        if (project && project.isLocked) {
          return {
            type: ResponseType.ERROR,
            message: project.lockedReason || 'This project is locked and cannot be modified. Please upgrade your plan to unlock it.',
            data: {
              isLocked: true,
              message: project.lockedReason
            }
          };
        }
      } catch (error) {
        logError('Project lock check error', error as Error, {
          userId: this.userId,
          projectId: currentProjectId
        });
      }
    }

    // Route to appropriate handler
    switch (parsed.type) {
        // Todo operations
        case CommandType.ADD_TODO:
          return await this.todoHandlers.handleAddTodo(parsed, currentProjectId);
        case CommandType.VIEW_TODOS:
          return await this.todoHandlers.handleViewTodos(parsed, currentProjectId);
        case CommandType.COMPLETE_TODO:
          return await this.todoHandlers.handleCompleteTodo(parsed, currentProjectId);
        case CommandType.ASSIGN_TODO:
          return await this.todoHandlers.handleAssignTodo(parsed, currentProjectId);
        case CommandType.PUSH_TODO:
          return await this.todoHandlers.handlePushTodo(parsed, currentProjectId);
        case CommandType.EDIT_TODO:
          return await this.todoHandlers.handleEditTodo(parsed, currentProjectId);
        case CommandType.DELETE_TODO:
          return await this.todoHandlers.handleDeleteTodo(parsed, currentProjectId);

        // Subtask operations
        case CommandType.ADD_SUBTASK:
          return await this.todoHandlers.handleAddSubtask(parsed, currentProjectId);
        case CommandType.VIEW_SUBTASKS:
          return await this.todoHandlers.handleViewSubtasks(parsed, currentProjectId);
        case CommandType.EDIT_SUBTASK:
          return await this.todoHandlers.handleEditSubtask(parsed, currentProjectId);
        case CommandType.DELETE_SUBTASK:
          return await this.todoHandlers.handleDeleteSubtask(parsed, currentProjectId);

        // Note operations
        case CommandType.ADD_NOTE:
          return await this.noteHandlers.handleAddNote(parsed, currentProjectId);
        case CommandType.VIEW_NOTES:
          return await this.noteHandlers.handleViewNotes(parsed, currentProjectId);
        case CommandType.EDIT_NOTE:
          return await this.noteHandlers.handleEditNote(parsed, currentProjectId);
        case CommandType.DELETE_NOTE:
          return await this.noteHandlers.handleDeleteNote(parsed, currentProjectId);

        // DevLog operations
        case CommandType.ADD_DEVLOG:
          return await this.devLogHandlers.handleAddDevLog(parsed, currentProjectId);
        case CommandType.VIEW_DEVLOG:
          return await this.devLogHandlers.handleViewDevLog(parsed, currentProjectId);
        case CommandType.EDIT_DEVLOG:
          return await this.devLogHandlers.handleEditDevLog(parsed, currentProjectId);
        case CommandType.DELETE_DEVLOG:
          return await this.devLogHandlers.handleDeleteDevLog(parsed, currentProjectId);

        // Component operations
        case CommandType.ADD_COMPONENT:
          return await this.componentHandlers.handleAddComponent(parsed, currentProjectId);
        case CommandType.VIEW_COMPONENTS:
          return await this.componentHandlers.handleViewComponents(parsed, currentProjectId);
        case CommandType.EDIT_COMPONENT:
          return await this.componentHandlers.handleEditComponent(parsed, currentProjectId);
        case CommandType.DELETE_COMPONENT:
          return await this.componentHandlers.handleDeleteComponent(parsed, currentProjectId);

        // Relationship operations
        case CommandType.ADD_RELATIONSHIP:
          return await this.relationshipHandlers.handleAddRelationship(parsed, currentProjectId);
        case CommandType.VIEW_RELATIONSHIPS:
          return await this.relationshipHandlers.handleViewRelationships(parsed, currentProjectId);
        case CommandType.EDIT_RELATIONSHIP:
          return await this.relationshipHandlers.handleEditRelationship(parsed, currentProjectId);
        case CommandType.DELETE_RELATIONSHIP:
          return await this.relationshipHandlers.handleDeleteRelationship(parsed, currentProjectId);

        // Search operations
        case CommandType.SEARCH:
          return await this.searchHandlers.handleSearch(parsed, currentProjectId);

        // Stack operations - unified
        case CommandType.ADD_STACK:
          return await this.stackHandlers.handleAddStack(parsed, currentProjectId);
        case CommandType.REMOVE_STACK:
          return await this.stackHandlers.handleRemoveStack(parsed, currentProjectId);
        case CommandType.VIEW_STACK:
          return await this.stackHandlers.handleViewStack(parsed, currentProjectId);

        // Team operations
        case CommandType.VIEW_TEAM:
          return await this.teamHandlers.handleViewTeam(parsed, currentProjectId);
        case CommandType.INVITE_MEMBER:
          return await this.teamHandlers.handleInviteMember(parsed, currentProjectId);
        case CommandType.REMOVE_MEMBER:
          return await this.teamHandlers.handleRemoveMember(parsed, currentProjectId);

        // Settings operations
        case CommandType.VIEW_SETTINGS:
          return await this.settingsHandlers.handleViewSettings(parsed, currentProjectId);
        case CommandType.SET_NAME:
          return await this.settingsHandlers.handleSetName(parsed, currentProjectId);
        case CommandType.SET_DESCRIPTION:
          return await this.settingsHandlers.handleSetDescription(parsed, currentProjectId);
        case CommandType.ADD_TAG:
          return await this.settingsHandlers.handleAddTag(parsed, currentProjectId);
        case CommandType.REMOVE_TAG:
          return await this.settingsHandlers.handleRemoveTag(parsed, currentProjectId);
        case CommandType.VIEW_DEPLOYMENT:
          return await this.settingsHandlers.handleViewDeployment(parsed, currentProjectId);
        case CommandType.SET_DEPLOYMENT:
          return await this.settingsHandlers.handleSetDeployment(parsed, currentProjectId);
        case CommandType.VIEW_PUBLIC:
          return await this.settingsHandlers.handleViewPublic(parsed, currentProjectId);
        case CommandType.SET_PUBLIC:
          return await this.settingsHandlers.handleSetPublic(parsed, currentProjectId);

        // Utility operations
        case CommandType.HELP:
          return this.utilityHandlers.handleHelp(parsed);
        case CommandType.SWAP_PROJECT:
          return await this.utilityHandlers.handleSwapProject(parsed);
        case CommandType.EXPORT:
          return await this.utilityHandlers.handleExport(parsed, currentProjectId);
        case CommandType.SUMMARY:
          return await this.utilityHandlers.handleSummary(parsed, currentProjectId);
        case CommandType.VIEW_NEWS:
          return await this.utilityHandlers.handleViewNews();
        case CommandType.SET_THEME:
          return await this.utilityHandlers.handleSetTheme(parsed);
        case CommandType.VIEW_THEMES:
          return await this.utilityHandlers.handleViewThemes();
        case CommandType.VIEW_NOTIFICATIONS:
          return await this.utilityHandlers.handleViewNotifications(parsed);
        case CommandType.CLEAR_NOTIFICATIONS:
          return await this.utilityHandlers.handleClearNotifications();
        case CommandType.LLM_CONTEXT:
          return await this.utilityHandlers.handleLLMContext(parsed, currentProjectId);
        case CommandType.GOTO:
          return await this.utilityHandlers.handleGoto(parsed, currentProjectId);
        case CommandType.TODAY:
          return await this.utilityHandlers.handleToday(parsed, currentProjectId);
        case CommandType.WEEK:
          return await this.utilityHandlers.handleWeek(parsed, currentProjectId);
        case CommandType.STANDUP:
          return await this.utilityHandlers.handleStandup(parsed, currentProjectId);
        case CommandType.INFO:
          return await this.utilityHandlers.handleInfo(parsed, currentProjectId);

        // User ideas
        case CommandType.ADD_IDEA:
          return await this.utilityHandlers.handleAddIdea(parsed);
        case CommandType.VIEW_IDEAS:
          return await this.utilityHandlers.handleViewIdeas(parsed);
        case CommandType.EDIT_IDEA:
          return await this.utilityHandlers.handleEditIdea(parsed);
        case CommandType.DELETE_IDEA:
          return await this.utilityHandlers.handleDeleteIdea(parsed);

        // Project management
        case CommandType.ADD_PROJECT:
          return await this.utilityHandlers.handleAddProject(parsed);
        case CommandType.VIEW_PROJECTS:
          return await this.utilityHandlers.handleViewProjects(parsed);
        case CommandType.WIZARD_NEW:
          return await this.utilityHandlers.handleWizardNew(parsed);

        default:
          return {
            type: ResponseType.ERROR,
            message: `Command type ${parsed.type} not yet implemented`,
            suggestions: ['/help']
          };
      }
  }
}
