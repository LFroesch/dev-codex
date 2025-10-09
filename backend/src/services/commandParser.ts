import { logInfo, logError } from '../config/logger';

/**
 * Supported command types
 */
export enum CommandType {
  ADD_TODO = 'add_todo',
  ADD_NOTE = 'add_note',
  ADD_DEVLOG = 'add_devlog',
  ADD_DOC = 'add_doc',
  VIEW_NOTES = 'view_notes',
  VIEW_TODOS = 'view_todos',
  VIEW_DEVLOG = 'view_devlog',
  VIEW_DOCS = 'view_docs',
  ADD_TECH = 'add_tech',
  ADD_PACKAGE = 'add_package',
  VIEW_STACK = 'view_stack',
  REMOVE_TECH = 'remove_tech',
  REMOVE_PACKAGE = 'remove_package',
  VIEW_DEPLOYMENT = 'view_deployment',
  SET_DEPLOYMENT = 'set_deployment',
  VIEW_PUBLIC = 'view_public',
  SET_PUBLIC = 'set_public',
  VIEW_TEAM = 'view_team',
  INVITE_MEMBER = 'invite_member',
  REMOVE_MEMBER = 'remove_member',
  VIEW_SETTINGS = 'view_settings',
  SET_NAME = 'set_name',
  SET_DESCRIPTION = 'set_description',
  ADD_TAG = 'add_tag',
  REMOVE_TAG = 'remove_tag',
  VIEW_NEWS = 'view_news',
  SET_THEME = 'set_theme',
  VIEW_THEMES = 'view_themes',
  SEARCH = 'search',
  COMPLETE_TODO = 'complete_todo',
  ASSIGN_TODO = 'assign_todo',
  SET_PRIORITY = 'set_priority',
  SET_DUE_DATE = 'set_due_date',
  SWAP_PROJECT = 'swap_project',
  WIZARD_NEW = 'wizard_new',
  WIZARD_SETUP = 'wizard_setup',
  WIZARD_DEPLOY = 'wizard_deploy',
  EXPORT = 'export',
  SUMMARY = 'summary',
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
  'add doc': CommandType.ADD_DOC,
  'add-doc': CommandType.ADD_DOC,
  'doc': CommandType.ADD_DOC,

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

  'summary': CommandType.SUMMARY,
  'summarize': CommandType.SUMMARY,
  'readme': CommandType.SUMMARY,
  'prompt': CommandType.SUMMARY,

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

  // Stack commands
  'add tech': CommandType.ADD_TECH,
  'add-tech': CommandType.ADD_TECH,
  'tech': CommandType.ADD_TECH,
  'add package': CommandType.ADD_PACKAGE,
  'add-package': CommandType.ADD_PACKAGE,
  'add-pkg': CommandType.ADD_PACKAGE,
  'pkg': CommandType.ADD_PACKAGE,
  'view stack': CommandType.VIEW_STACK,
  'view-stack': CommandType.VIEW_STACK,
  'stack': CommandType.VIEW_STACK,
  'remove tech': CommandType.REMOVE_TECH,
  'remove-tech': CommandType.REMOVE_TECH,
  'rm tech': CommandType.REMOVE_TECH,
  'remove package': CommandType.REMOVE_PACKAGE,
  'remove-package': CommandType.REMOVE_PACKAGE,
  'remove-pkg': CommandType.REMOVE_PACKAGE,
  'rm pkg': CommandType.REMOVE_PACKAGE,

  // Deployment commands
  'view deployment': CommandType.VIEW_DEPLOYMENT,
  'view-deployment': CommandType.VIEW_DEPLOYMENT,
  'deployment': CommandType.VIEW_DEPLOYMENT,
  'deploy': CommandType.VIEW_DEPLOYMENT,
  'set deployment': CommandType.SET_DEPLOYMENT,
  'set-deployment': CommandType.SET_DEPLOYMENT,

  // Public commands
  'view public': CommandType.VIEW_PUBLIC,
  'view-public': CommandType.VIEW_PUBLIC,
  'public': CommandType.VIEW_PUBLIC,
  'set public': CommandType.SET_PUBLIC,
  'set-public': CommandType.SET_PUBLIC,
  'make public': CommandType.SET_PUBLIC,
  'make private': CommandType.SET_PUBLIC,

  // Team commands
  'view team': CommandType.VIEW_TEAM,
  'view-team': CommandType.VIEW_TEAM,
  'team': CommandType.VIEW_TEAM,
  'invite': CommandType.INVITE_MEMBER,
  'invite member': CommandType.INVITE_MEMBER,
  'remove member': CommandType.REMOVE_MEMBER,
  'remove-member': CommandType.REMOVE_MEMBER,
  'kick': CommandType.REMOVE_MEMBER,

  // Settings commands
  'view settings': CommandType.VIEW_SETTINGS,
  'view-settings': CommandType.VIEW_SETTINGS,
  'settings': CommandType.VIEW_SETTINGS,
  'set name': CommandType.SET_NAME,
  'set-name': CommandType.SET_NAME,
  'rename': CommandType.SET_NAME,
  'set description': CommandType.SET_DESCRIPTION,
  'set-description': CommandType.SET_DESCRIPTION,
  'describe': CommandType.SET_DESCRIPTION,
  'add tag': CommandType.ADD_TAG,
  'add-tag': CommandType.ADD_TAG,
  'tag': CommandType.ADD_TAG,
  'remove tag': CommandType.REMOVE_TAG,
  'remove-tag': CommandType.REMOVE_TAG,
  'untag': CommandType.REMOVE_TAG,

  // News commands
  'view news': CommandType.VIEW_NEWS,
  'view-news': CommandType.VIEW_NEWS,
  'news': CommandType.VIEW_NEWS,
  'updates': CommandType.VIEW_NEWS,

  // Theme commands
  'set theme': CommandType.SET_THEME,
  'set-theme': CommandType.SET_THEME,
  'theme': CommandType.SET_THEME,
  'view themes': CommandType.VIEW_THEMES,
  'view-themes': CommandType.VIEW_THEMES,
  'themes': CommandType.VIEW_THEMES,

  // Search
  'search': CommandType.SEARCH,
  'find': CommandType.SEARCH,

  // Task management
  'complete': CommandType.COMPLETE_TODO,
  'complete todo': CommandType.COMPLETE_TODO,
  'done': CommandType.COMPLETE_TODO,
  'assign': CommandType.ASSIGN_TODO,
  'assign todo': CommandType.ASSIGN_TODO,
  'priority': CommandType.SET_PRIORITY,
  'set priority': CommandType.SET_PRIORITY,
  'due': CommandType.SET_DUE_DATE,
  'set due': CommandType.SET_DUE_DATE,
  'due date': CommandType.SET_DUE_DATE,

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
  [CommandType.ADD_DOC]: {
    type: CommandType.ADD_DOC,
    syntax: '/add doc [type] [title] - [content] [@project]',
    description: 'Create a new documentation template',
    examples: [
      '/add doc Model User - id, name, email @myproject',
      '/doc API /api/users - GET all users endpoint',
      '/add-doc ENV DATABASE_URL - MongoDB connection string'
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
    syntax: '/swap [@project]',
    description: 'Switch to a different project',
    examples: [
      '/swap @myproject',
      '/swap frontend',
      '/switch backend'
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
  [CommandType.SUMMARY]: {
    type: CommandType.SUMMARY,
    syntax: '/summary [markdown|json|prompt|text] [@project]',
    description: 'Generate downloadable project summary in various formats',
    examples: [
      '/summary markdown - README-style documentation',
      '/summary json - Structured data export',
      '/summary prompt - AI assistant template',
      '/summary text - Plain text overview',
      '/readme @myproject - Alias for markdown format'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.ADD_TECH]: {
    type: CommandType.ADD_TECH,
    syntax: '/add tech [name] --category=[category] --version=[version] [@project]',
    description: 'Add a technology to the tech stack',
    examples: [
      '/add tech React --category=framework --version=18.2.0 @myproject',
      '/tech Node.js --category=runtime',
      '/add-tech PostgreSQL --category=database @backend'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.ADD_PACKAGE]: {
    type: CommandType.ADD_PACKAGE,
    syntax: '/add package [name] --category=[category] --version=[version] [@project]',
    description: 'Add a package to the project',
    examples: [
      '/add package express --category=api --version=4.18.0 @backend',
      '/pkg axios --category=api',
      '/add-pkg tailwindcss --category=ui @frontend'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_STACK]: {
    type: CommandType.VIEW_STACK,
    syntax: '/view stack [@project]',
    description: 'View the tech stack and packages',
    examples: [
      '/view stack @myproject',
      '/stack',
      '/view-stack @backend'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.REMOVE_TECH]: {
    type: CommandType.REMOVE_TECH,
    syntax: '/remove tech [name] [@project]',
    description: 'Remove a technology from the stack',
    examples: [
      '/remove tech React @myproject',
      '/rm tech Node.js',
      '/remove-tech PostgreSQL @backend'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.REMOVE_PACKAGE]: {
    type: CommandType.REMOVE_PACKAGE,
    syntax: '/remove package [name] [@project]',
    description: 'Remove a package from the project',
    examples: [
      '/remove package express @backend',
      '/rm pkg axios',
      '/remove-pkg tailwindcss @frontend'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_DEPLOYMENT]: {
    type: CommandType.VIEW_DEPLOYMENT,
    syntax: '/view deployment [@project]',
    description: 'View deployment information',
    examples: [
      '/view deployment @myproject',
      '/deployment',
      '/deploy'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.SET_DEPLOYMENT]: {
    type: CommandType.SET_DEPLOYMENT,
    syntax: '/set deployment --url=[url] --platform=[platform] --status=[status] [@project]',
    description: 'Update deployment settings',
    examples: [
      '/set deployment --url=https://myapp.com --platform=vercel',
      '/set-deployment --status=active --branch=main',
      '/set deployment --url=https://api.example.com @backend'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_PUBLIC]: {
    type: CommandType.VIEW_PUBLIC,
    syntax: '/view public [@project]',
    description: 'View public settings',
    examples: [
      '/view public @myproject',
      '/public'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.SET_PUBLIC]: {
    type: CommandType.SET_PUBLIC,
    syntax: '/set public --enabled=[true/false] --slug=[slug] [@project]',
    description: 'Toggle public visibility and set slug',
    examples: [
      '/set public --enabled=true --slug=my-awesome-project',
      '/make public --slug=my-project @myproject',
      '/make private @myproject'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_TEAM]: {
    type: CommandType.VIEW_TEAM,
    syntax: '/view team [@project]',
    description: 'View team members',
    examples: [
      '/view team @myproject',
      '/team'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.INVITE_MEMBER]: {
    type: CommandType.INVITE_MEMBER,
    syntax: '/invite [email/username] --role=[editor/viewer] [@project]',
    description: 'Invite a user to the project by email or username',
    examples: [
      '/invite user@example.com --role=editor @myproject',
      '/invite johndoe --role=editor @myproject',
      '/invite colleague@company.com @myproject',
      '/invite friend@email.com --role=viewer'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.REMOVE_MEMBER]: {
    type: CommandType.REMOVE_MEMBER,
    syntax: '/remove member [email/username] [@project]',
    description: 'Remove a team member by email or username',
    examples: [
      '/remove member user@example.com @myproject',
      '/kick johndoe @myproject',
      '/kick colleague@company.com'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_SETTINGS]: {
    type: CommandType.VIEW_SETTINGS,
    syntax: '/view settings [@project]',
    description: 'View project settings',
    examples: [
      '/view settings @myproject',
      '/settings'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.SET_NAME]: {
    type: CommandType.SET_NAME,
    syntax: '/set name [new name] [@project]',
    description: 'Update project name',
    examples: [
      '/set name My Awesome Project @myproject',
      '/rename New Project Name'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.SET_DESCRIPTION]: {
    type: CommandType.SET_DESCRIPTION,
    syntax: '/set description [new description] [@project]',
    description: 'Update project description',
    examples: [
      '/set description A web app for managing tasks @myproject',
      '/describe This is my new project'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.ADD_TAG]: {
    type: CommandType.ADD_TAG,
    syntax: '/add tag [tag name] [@project]',
    description: 'Add a tag to the project',
    examples: [
      '/add tag react @myproject',
      '/tag typescript',
      '/add-tag web-app'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.REMOVE_TAG]: {
    type: CommandType.REMOVE_TAG,
    syntax: '/remove tag [tag name] [@project]',
    description: 'Remove a tag from the project',
    examples: [
      '/remove tag react @myproject',
      '/untag typescript'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_NEWS]: {
    type: CommandType.VIEW_NEWS,
    syntax: '/view news',
    description: 'View latest news and updates',
    examples: [
      '/view news',
      '/news',
      '/updates'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.SET_THEME]: {
    type: CommandType.SET_THEME,
    syntax: '/set theme [theme name]',
    description: 'Change the application theme',
    examples: [
      '/set theme dark',
      '/theme light',
      '/set-theme cyberpunk'
    ],
    requiresProject: false,
    requiresArgs: true
  },
  [CommandType.VIEW_THEMES]: {
    type: CommandType.VIEW_THEMES,
    syntax: '/view themes',
    description: 'List all available themes',
    examples: [
      '/view themes',
      '/themes'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.SEARCH]: {
    type: CommandType.SEARCH,
    syntax: '/search [query] [@project]',
    description: 'Search across all project content (todos, notes, devlog, docs)',
    examples: [
      '/search authentication bug @myproject',
      '/find database schema',
      '/search api design'
    ],
    requiresProject: false,
    requiresArgs: true
  },
  [CommandType.COMPLETE_TODO]: {
    type: CommandType.COMPLETE_TODO,
    syntax: '/complete [todo text/id] [@project]',
    description: 'Mark a todo as completed',
    examples: [
      '/complete fix authentication bug @myproject',
      '/done implement user dashboard',
      '/complete 1'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.ASSIGN_TODO]: {
    type: CommandType.ASSIGN_TODO,
    syntax: '/assign [todo text/id] [user email] [@project]',
    description: 'Assign a todo to a team member',
    examples: [
      '/assign fix bug user@example.com @myproject',
      '/assign 1 john@example.com'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.SET_PRIORITY]: {
    type: CommandType.SET_PRIORITY,
    syntax: '/priority [todo text/id] [low/medium/high] [@project]',
    description: 'Set the priority of a todo',
    examples: [
      '/priority fix bug high @myproject',
      '/set priority 1 low',
      '/priority implement feature medium'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.SET_DUE_DATE]: {
    type: CommandType.SET_DUE_DATE,
    syntax: '/due [todo text/id] [date] [@project]',
    description: 'Set the due date of a todo',
    examples: [
      '/due fix bug 2025-12-31 @myproject',
      '/set due 1 2025-10-15',
      '/due date implement feature tomorrow'
    ],
    requiresProject: true,
    requiresArgs: true
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
    // Must be preceded by whitespace or start of string to avoid matching emails
    // Captures everything after @ until we hit --, another @, or end of string
    const projectMatch = withoutSlash.match(/(?:^|\s)@([^@]+?)(?:\s+--|\s+@|$)/);
    if (projectMatch) {
      result.projectMention = projectMatch[1].trim();
    }

    // Remove @project mention to parse rest of command (only those preceded by whitespace/start)
    const withoutProject = withoutSlash.replace(/(?:^|\s)@[^@]+?(?=\s+--|@|$)/g, '').trim();

    // Extract flags (--flag or -f) - only match if preceded by whitespace or at start
    const flagMatches = withoutProject.matchAll(/(?:^|\s)(--?(\w+)(?:=(\S+))?)/g);
    for (const match of flagMatches) {
      const flagName = match[2];
      const flagValue = match[3] || true;
      result.flags.set(flagName, flagValue);
    }

    // Remove flags to parse command and args - only remove if preceded by whitespace or at start
    const withoutFlags = withoutProject.replace(/(?:^|\s)--?\w+(?:=\S+)?/g, '').trim();

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
