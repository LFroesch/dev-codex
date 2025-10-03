import { logInfo, logError } from '../config/logger';

/**
 * Supported command types
 */
export enum CommandType {
  ADD_TODO = 'add_todo',
  ADD_NOTE = 'add_note',
  ADD_DEVLOG = 'add_devlog',
  VIEW_NOTES = 'view_notes',
  VIEW_TODOS = 'view_todos',
  VIEW_DEVLOG = 'view_devlog',
  VIEW_DOCS = 'view_docs',
  SWAP_PROJECT = 'swap_project',
  WIZARD_NEW = 'wizard_new',
  WIZARD_SETUP = 'wizard_setup',
  WIZARD_DEPLOY = 'wizard_deploy',
  EXPORT = 'export',
  HELP = 'help',
  UNKNOWN = 'unknown'
}

/**
 * Parsed command structure
 */
export interface ParsedCommand {
  type: CommandType;
  raw: string;
  command: string;
  subcommand?: string;
  args: string[];
  projectMention?: string;
  flags: Map<string, string | boolean>;
  isValid: boolean;
  errors: string[];
}

/**
 * Command aliases for easier typing
 */
const COMMAND_ALIASES: Record<string, CommandType> = {
  // Add commands
  'add todo': CommandType.ADD_TODO,
  'add-todo': CommandType.ADD_TODO,
  'todo': CommandType.ADD_TODO,
  'add note': CommandType.ADD_NOTE,
  'add-note': CommandType.ADD_NOTE,
  'note': CommandType.ADD_NOTE,
  'add devlog': CommandType.ADD_DEVLOG,
  'add-devlog': CommandType.ADD_DEVLOG,
  'devlog': CommandType.ADD_DEVLOG,

  // View commands
  'view notes': CommandType.VIEW_NOTES,
  'view-notes': CommandType.VIEW_NOTES,
  'notes': CommandType.VIEW_NOTES,
  'list notes': CommandType.VIEW_NOTES,
  'view todos': CommandType.VIEW_TODOS,
  'view-todos': CommandType.VIEW_TODOS,
  'todos': CommandType.VIEW_TODOS,
  'list todos': CommandType.VIEW_TODOS,
  'view devlog': CommandType.VIEW_DEVLOG,
  'view-devlog': CommandType.VIEW_DEVLOG,
  'list devlog': CommandType.VIEW_DEVLOG,
  'view docs': CommandType.VIEW_DOCS,
  'view-docs': CommandType.VIEW_DOCS,
  'docs': CommandType.VIEW_DOCS,
  'list docs': CommandType.VIEW_DOCS,

  // Project commands
  'swap-project': CommandType.SWAP_PROJECT,
  'swap': CommandType.SWAP_PROJECT,
  'switch': CommandType.SWAP_PROJECT,
  'switch-project': CommandType.SWAP_PROJECT,
  'project': CommandType.SWAP_PROJECT,

  // Wizard commands
  'wizard new': CommandType.WIZARD_NEW,
  'wizard-new': CommandType.WIZARD_NEW,
  'new': CommandType.WIZARD_NEW,
  'create': CommandType.WIZARD_NEW,
  'wizard setup': CommandType.WIZARD_SETUP,
  'wizard-setup': CommandType.WIZARD_SETUP,
  'setup': CommandType.WIZARD_SETUP,
  'wizard deploy': CommandType.WIZARD_DEPLOY,
  'wizard-deploy': CommandType.WIZARD_DEPLOY,
  'deploy-wizard': CommandType.WIZARD_DEPLOY,

  // Export commands
  'export': CommandType.EXPORT,
  'download': CommandType.EXPORT,

  // Help
  'help': CommandType.HELP,
  '?': CommandType.HELP,
  'commands': CommandType.HELP,
};

/**
 * Command metadata for validation and help
 */
export interface CommandMetadata {
  type: CommandType;
  syntax: string;
  description: string;
  examples: string[];
  requiresProject: boolean;
  requiresArgs: boolean;
}

export const COMMAND_METADATA: Record<CommandType, CommandMetadata> = {
  [CommandType.ADD_TODO]: {
    type: CommandType.ADD_TODO,
    syntax: '/add todo [text] [@project]',
    description: 'Create a new todo item',
    examples: [
      '/add todo fix authentication bug @myproject',
      '/todo implement user dashboard',
      '/add-todo review pull request @frontend'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.ADD_NOTE]: {
    type: CommandType.ADD_NOTE,
    syntax: '/add note [text] [@project]',
    description: 'Create a new note',
    examples: [
      '/add note API architecture decisions @backend',
      '/note meeting notes from standup',
      '/add-note database schema design @myproject'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.ADD_DEVLOG]: {
    type: CommandType.ADD_DEVLOG,
    syntax: '/add devlog [text] [@project]',
    description: 'Create a new dev log entry',
    examples: [
      '/add devlog fixed memory leak in user service @backend',
      '/devlog optimized database queries',
      '/add-devlog refactored authentication flow @myproject'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_NOTES]: {
    type: CommandType.VIEW_NOTES,
    syntax: '/view notes [@project]',
    description: 'List all notes in a project',
    examples: [
      '/view notes @myproject',
      '/notes',
      '/list notes @frontend'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_TODOS]: {
    type: CommandType.VIEW_TODOS,
    syntax: '/view todos [@project]',
    description: 'List all todos in a project',
    examples: [
      '/view todos @myproject',
      '/todos',
      '/list todos @backend'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_DEVLOG]: {
    type: CommandType.VIEW_DEVLOG,
    syntax: '/view devlog [@project]',
    description: 'List dev log entries',
    examples: [
      '/view devlog @myproject',
      '/devlog',
      '/list devlog @backend'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_DOCS]: {
    type: CommandType.VIEW_DOCS,
    syntax: '/view docs [@project]',
    description: 'List documentation',
    examples: [
      '/view docs @myproject',
      '/docs',
      '/list docs @api'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.SWAP_PROJECT]: {
    type: CommandType.SWAP_PROJECT,
    syntax: '/swap-project [@project]',
    description: 'Switch to a different project',
    examples: [
      '/swap-project @myproject',
      '/swap @frontend',
      '/switch-project @backend'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.WIZARD_NEW]: {
    type: CommandType.WIZARD_NEW,
    syntax: '/wizard new',
    description: 'Start interactive wizard to create new project',
    examples: [
      '/wizard new',
      '/new',
      '/create'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.WIZARD_SETUP]: {
    type: CommandType.WIZARD_SETUP,
    syntax: '/wizard setup [@project]',
    description: 'Start interactive wizard to setup project',
    examples: [
      '/wizard setup @myproject',
      '/setup',
      '/wizard-setup @frontend'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.WIZARD_DEPLOY]: {
    type: CommandType.WIZARD_DEPLOY,
    syntax: '/wizard deploy [@project]',
    description: 'Start interactive deployment wizard',
    examples: [
      '/wizard deploy @myproject',
      '/deploy-wizard',
      '/wizard-deploy @backend'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.EXPORT]: {
    type: CommandType.EXPORT,
    syntax: '/export [@project]',
    description: 'Export project data',
    examples: [
      '/export @myproject',
      '/export',
      '/download @frontend'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.HELP]: {
    type: CommandType.HELP,
    syntax: '/help [command]',
    description: 'Show help for all commands or a specific command',
    examples: [
      '/help',
      '/help add todo',
      '/?'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.UNKNOWN]: {
    type: CommandType.UNKNOWN,
    syntax: '',
    description: 'Unknown command',
    examples: [],
    requiresProject: false,
    requiresArgs: false
  }
};

/**
 * Command Parser Service
 * Parses terminal command strings into structured command objects
 */
export class CommandParser {
  /**
   * Parse a command string
   * @param commandStr - Raw command string from user input
   * @returns Parsed command object with validation
   */
  static parse(commandStr: string): ParsedCommand {
    const trimmed = commandStr.trim();

    // Initialize result
    const result: ParsedCommand = {
      type: CommandType.UNKNOWN,
      raw: commandStr,
      command: '',
      args: [],
      flags: new Map(),
      isValid: false,
      errors: []
    };

    // Must start with /
    if (!trimmed.startsWith('/')) {
      result.errors.push('Commands must start with /');
      return result;
    }

    // Remove leading /
    const withoutSlash = trimmed.slice(1);

    // Extract @project mention if present (handles spaces in project names)
    // Captures everything after @ until we hit --, another @, or end of string
    const projectMatch = withoutSlash.match(/@([^@]+?)(?:\s+--|\s+@|$)/);
    if (projectMatch) {
      result.projectMention = projectMatch[1].trim();
    }

    // Remove @project mention to parse rest of command
    const withoutProject = withoutSlash.replace(/@[^@]+?(?=\s+--|@|$)/g, '').trim();

    // Extract flags (--flag or -f)
    const flagMatches = withoutProject.matchAll(/--?(\w+)(?:=(\S+))?/g);
    for (const match of flagMatches) {
      const flagName = match[1];
      const flagValue = match[2] || true;
      result.flags.set(flagName, flagValue);
    }

    // Remove flags to parse command and args
    const withoutFlags = withoutProject.replace(/--?\w+(?:=\S+)?/g, '').trim();

    // Split into words for command detection
    const words = withoutFlags.split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) {
      result.errors.push('No command specified');
      return result;
    }

    // Try to match command (support multi-word commands like "add todo")
    let commandMatch: CommandType | null = null;
    let commandLength = 0;

    // Try matching 2-word commands first (e.g., "add todo")
    if (words.length >= 2) {
      const twoWordCmd = `${words[0]} ${words[1]}`.toLowerCase();
      if (COMMAND_ALIASES[twoWordCmd]) {
        commandMatch = COMMAND_ALIASES[twoWordCmd];
        commandLength = 2;
        result.command = twoWordCmd;
        result.subcommand = words[1];
      }
    }

    // Try matching 1-word commands
    if (!commandMatch && words.length >= 1) {
      const oneWordCmd = words[0].toLowerCase();
      if (COMMAND_ALIASES[oneWordCmd]) {
        commandMatch = COMMAND_ALIASES[oneWordCmd];
        commandLength = 1;
        result.command = oneWordCmd;
      }
    }

    if (!commandMatch) {
      result.errors.push(`Unknown command: ${words[0]}. Type /help for available commands.`);
      return result;
    }

    result.type = commandMatch;

    // Extract remaining words as arguments
    const remainingWords = words.slice(commandLength);
    result.args = remainingWords;

    // Validate command based on metadata
    const metadata = COMMAND_METADATA[result.type];

    if (metadata.requiresArgs && result.args.length === 0) {
      result.errors.push(`Command requires arguments. Usage: ${metadata.syntax}`);
    }

    if (metadata.requiresProject && !result.projectMention) {
      // Project mention is optional if current project context exists
      // The executor will handle this
    }

    // Command is valid if no errors
    result.isValid = result.errors.length === 0;

    logInfo('Command parsed', {
      type: result.type,
      command: result.command,
      args: result.args,
      projectMention: result.projectMention,
      isValid: result.isValid
    });

    return result;
  }

  /**
   * Get all available commands
   * @returns Array of command metadata
   */
  static getAllCommands(): CommandMetadata[] {
    return Object.values(COMMAND_METADATA).filter(
      cmd => cmd.type !== CommandType.UNKNOWN
    );
  }

  /**
   * Get command metadata by type
   * @param type - Command type
   * @returns Command metadata or undefined
   */
  static getCommandMetadata(type: CommandType): CommandMetadata | undefined {
    return COMMAND_METADATA[type];
  }

  /**
   * Validate a command string without full parsing
   * @param commandStr - Raw command string
   * @returns Validation result
   */
  static validate(commandStr: string): { isValid: boolean; errors: string[] } {
    const parsed = this.parse(commandStr);
    return {
      isValid: parsed.isValid,
      errors: parsed.errors
    };
  }

  /**
   * Get command suggestions based on partial input
   * @param partial - Partial command string (e.g., "/ad")
   * @returns Array of suggested command strings
   */
  static getSuggestions(partial: string): string[] {
    if (!partial.startsWith('/')) {
      return [];
    }

    const withoutSlash = partial.slice(1).toLowerCase();
    const suggestions: string[] = [];

    // Match against all command aliases
    for (const [alias, type] of Object.entries(COMMAND_ALIASES)) {
      if (alias.startsWith(withoutSlash)) {
        const metadata = COMMAND_METADATA[type];
        suggestions.push(`/${alias} - ${metadata.description}`);
      }
    }

    return suggestions.slice(0, 10); // Limit to 10 suggestions
  }
}
