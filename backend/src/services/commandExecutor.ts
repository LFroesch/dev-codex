import { CommandParser, CommandType, ParsedCommand } from './commandParser';
import { logInfo, logError } from '../config/logger';
import { CrudHandlers } from './handlers/CrudHandlers';
import { StackHandlers } from './handlers/StackHandlers';
import { TeamHandlers } from './handlers/TeamHandlers';
import { SettingsHandlers } from './handlers/SettingsHandlers';
import { UtilityHandlers } from './handlers/UtilityHandlers';

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
 * Command Executor Service
 * Routes commands to specialized handler modules
 */
export class CommandExecutor {
  private userId: string;
  private crudHandlers: CrudHandlers;
  private stackHandlers: StackHandlers;
  private teamHandlers: TeamHandlers;
  private settingsHandlers: SettingsHandlers;
  private utilityHandlers: UtilityHandlers;

  constructor(userId: string) {
    this.userId = userId;
    this.crudHandlers = new CrudHandlers(userId);
    this.stackHandlers = new StackHandlers(userId);
    this.teamHandlers = new TeamHandlers(userId);
    this.settingsHandlers = new SettingsHandlers(userId);
    this.utilityHandlers = new UtilityHandlers(userId);
  }

  /**
   * Execute a command (supports batch chaining with &&)
   * @param commandStr - Raw command string
   * @param currentProjectId - Optional current project context
   * @returns Command response
   */
  async execute(commandStr: string, currentProjectId?: string): Promise<CommandResponse> {
    try {
      // Check for batch command chaining (&&)
      if (commandStr.includes(' && ')) {
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
   * Execute multiple chained commands
   * @param commandStr - Command string with && separators
   * @param currentProjectId - Optional current project context
   * @returns Combined command response
   */
  private async executeBatch(commandStr: string, currentProjectId?: string): Promise<CommandResponse> {
    const commands = commandStr.split(' && ').map(cmd => cmd.trim());

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
          data: r.data
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

    // Route to appropriate handler
    switch (parsed.type) {
        // CRUD operations
        case CommandType.ADD_TODO:
          return await this.crudHandlers.handleAddTodo(parsed, currentProjectId);
        case CommandType.ADD_NOTE:
          return await this.crudHandlers.handleAddNote(parsed, currentProjectId);
        case CommandType.ADD_DEVLOG:
          return await this.crudHandlers.handleAddDevLog(parsed, currentProjectId);
        case CommandType.ADD_DOC:
          return await this.crudHandlers.handleAddDoc(parsed, currentProjectId);

        case CommandType.VIEW_NOTES:
          return await this.crudHandlers.handleViewNotes(parsed, currentProjectId);
        case CommandType.VIEW_TODOS:
          return await this.crudHandlers.handleViewTodos(parsed, currentProjectId);
        case CommandType.VIEW_DEVLOG:
          return await this.crudHandlers.handleViewDevLog(parsed, currentProjectId);
        case CommandType.VIEW_DOCS:
          return await this.crudHandlers.handleViewDocs(parsed, currentProjectId);
        case CommandType.SEARCH:
          return await this.crudHandlers.handleSearch(parsed, currentProjectId);

        // Task management
        case CommandType.COMPLETE_TODO:
          return await this.crudHandlers.handleCompleteTodo(parsed, currentProjectId);
        case CommandType.ASSIGN_TODO:
          return await this.crudHandlers.handleAssignTodo(parsed, currentProjectId);
        case CommandType.SET_PRIORITY:
          return await this.crudHandlers.handleSetPriority(parsed, currentProjectId);
        case CommandType.SET_DUE_DATE:
          return await this.crudHandlers.handleSetDueDate(parsed, currentProjectId);

        // Subtask operations
        case CommandType.ADD_SUBTASK:
          return await this.crudHandlers.handleAddSubtask(parsed, currentProjectId);
        case CommandType.VIEW_SUBTASKS:
          return await this.crudHandlers.handleViewSubtasks(parsed, currentProjectId);

        // Edit operations
        case CommandType.EDIT_TODO:
          return await this.crudHandlers.handleEditTodo(parsed, currentProjectId);
        case CommandType.EDIT_NOTE:
          return await this.crudHandlers.handleEditNote(parsed, currentProjectId);
        case CommandType.EDIT_DEVLOG:
          return await this.crudHandlers.handleEditDevLog(parsed, currentProjectId);
        case CommandType.EDIT_DOC:
          return await this.crudHandlers.handleEditDoc(parsed, currentProjectId);

        // Delete operations
        case CommandType.DELETE_TODO:
          return await this.crudHandlers.handleDeleteTodo(parsed, currentProjectId);
        case CommandType.DELETE_NOTE:
          return await this.crudHandlers.handleDeleteNote(parsed, currentProjectId);
        case CommandType.DELETE_DEVLOG:
          return await this.crudHandlers.handleDeleteDevLog(parsed, currentProjectId);
        case CommandType.DELETE_DOC:
          return await this.crudHandlers.handleDeleteDoc(parsed, currentProjectId);
        case CommandType.DELETE_SUBTASK:
          return await this.crudHandlers.handleDeleteSubtask(parsed, currentProjectId);

        // Stack operations
        case CommandType.ADD_TECH:
          return await this.stackHandlers.handleAddTech(parsed, currentProjectId);
        case CommandType.ADD_PACKAGE:
          return await this.stackHandlers.handleAddPackage(parsed, currentProjectId);
        case CommandType.VIEW_STACK:
          return await this.stackHandlers.handleViewStack(parsed, currentProjectId);
        case CommandType.REMOVE_TECH:
          return await this.stackHandlers.handleRemoveTech(parsed, currentProjectId);
        case CommandType.REMOVE_PACKAGE:
          return await this.stackHandlers.handleRemovePackage(parsed, currentProjectId);

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
          return this.utilityHandlers.handleLLMContext();
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
        case CommandType.WIZARD_NEW:
        case CommandType.WIZARD_SETUP:
        case CommandType.WIZARD_DEPLOY:
          return await this.utilityHandlers.handleWizard(parsed);

        default:
          return {
            type: ResponseType.ERROR,
            message: `Command type ${parsed.type} not yet implemented`,
            suggestions: ['/help']
          };
      }
  }
}
