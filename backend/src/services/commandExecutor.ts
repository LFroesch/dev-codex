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
   * Execute a command
   * @param commandStr - Raw command string
   * @param currentProjectId - Optional current project context
   * @returns Command response
   */
  async execute(commandStr: string, currentProjectId?: string): Promise<CommandResponse> {
    try {
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
        case CommandType.WIZARD_NEW:
        case CommandType.WIZARD_SETUP:
        case CommandType.WIZARD_DEPLOY:
          return this.utilityHandlers.handleWizard(parsed);

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
}
