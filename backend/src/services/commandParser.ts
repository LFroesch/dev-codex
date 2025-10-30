import { logInfo, logError } from '../config/logger';

/**
 * Supported command types
 */
export enum CommandType {
  ADD_TODO = 'add_todo',
  ADD_NOTE = 'add_note',
  ADD_DEVLOG = 'add_devlog',
  ADD_COMPONENT = 'add_component',
  VIEW_NOTES = 'view_notes',
  VIEW_TODOS = 'view_todos',
  VIEW_DEVLOG = 'view_devlog',
  VIEW_COMPONENTS = 'view_components',
  ADD_STACK = 'add_stack',
  REMOVE_STACK = 'remove_stack',
  VIEW_STACK = 'view_stack',
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
  PUSH_TODO = 'push_todo',
  SWAP_PROJECT = 'swap_project',
  WIZARD_NEW = 'wizard_new',
  EXPORT = 'export',
  SUMMARY = 'summary',
  VIEW_NOTIFICATIONS = 'view_notifications',
  CLEAR_NOTIFICATIONS = 'clear_notifications',
  LLM_CONTEXT = 'llm_context',

  // Subtask commands
  ADD_SUBTASK = 'add_subtask',
  VIEW_SUBTASKS = 'view_subtasks',

  // Edit commands
  EDIT_TODO = 'edit_todo',
  EDIT_NOTE = 'edit_note',
  EDIT_DEVLOG = 'edit_devlog',
  EDIT_COMPONENT = 'edit_component',
  EDIT_SUBTASK = 'edit_subtask',

  // Delete commands
  DELETE_TODO = 'delete_todo',
  DELETE_NOTE = 'delete_note',
  DELETE_DEVLOG = 'delete_devlog',
  DELETE_COMPONENT = 'delete_component',
  DELETE_SUBTASK = 'delete_subtask',

  // Relationship commands
  ADD_RELATIONSHIP = 'add_relationship',
  EDIT_RELATIONSHIP = 'edit_relationship',
  DELETE_RELATIONSHIP = 'delete_relationship',
  VIEW_RELATIONSHIPS = 'view_relationships',

  // Navigation & Workflow
  GOTO = 'goto',
  TODAY = 'today',
  WEEK = 'week',
  STANDUP = 'standup',
  INFO = 'info',

  // User ideas
  ADD_IDEA = 'add_idea',
  VIEW_IDEAS = 'view_ideas',
  EDIT_IDEA = 'edit_idea',
  DELETE_IDEA = 'delete_idea',

  // Project management
  ADD_PROJECT = 'add_project',
  VIEW_PROJECTS = 'view_projects',

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
  flags: Map<string, string | boolean> | Record<string, string | boolean>;
  isValid: boolean;
  errors: string[];
}

/**
 * Helper function to get flag value from either Map or Record
 */
export function getFlag(flags: Map<string, string | boolean> | Record<string, string | boolean>, key: string): string | boolean | undefined {
  if (flags instanceof Map) {
    return flags.get(key);
  }
  return flags[key];
}

/**
 * Helper function to get flag count from either Map or Record
 */
export function getFlagCount(flags: Map<string, string | boolean> | Record<string, string | boolean>): number {
  if (flags instanceof Map) {
    return flags.size;
  }
  return Object.keys(flags).length;
}

/**
 * Helper function to check if flag exists in either Map or Record
 */
export function hasFlag(flags: Map<string, string | boolean> | Record<string, string | boolean>, key: string): boolean {
  if (flags instanceof Map) {
    return flags.has(key);
  }
  return key in flags && flags[key] !== undefined;
}

/**
 * Command aliases for easier typing
 */
const COMMAND_ALIASES: Record<string, CommandType> = {
  // Add commands - with plural/singular support
  'add todo': CommandType.ADD_TODO,
  'add todos': CommandType.ADD_TODO,
  'add-todo': CommandType.ADD_TODO,
  'add note': CommandType.ADD_NOTE,
  'add notes': CommandType.ADD_NOTE,
  'add-note': CommandType.ADD_NOTE,
  'add devlog': CommandType.ADD_DEVLOG,
  'add devlogs': CommandType.ADD_DEVLOG,
  'add-devlog': CommandType.ADD_DEVLOG,
  'devlog': CommandType.ADD_DEVLOG,
  'add component': CommandType.ADD_COMPONENT,
  'add components': CommandType.ADD_COMPONENT,
  'add-component': CommandType.ADD_COMPONENT,

  // Natural action verbs for adding
  'create todo': CommandType.ADD_TODO,
  'create note': CommandType.ADD_NOTE,
  'create devlog': CommandType.ADD_DEVLOG,
  'create component': CommandType.ADD_COMPONENT,

  // View commands - with plural/singular support
  'view notes': CommandType.VIEW_NOTES,
  'view note': CommandType.VIEW_NOTES,
  'view-notes': CommandType.VIEW_NOTES,
  'notes': CommandType.VIEW_NOTES,
  'note': CommandType.VIEW_NOTES,
  'list notes': CommandType.VIEW_NOTES,
  'list note': CommandType.VIEW_NOTES,
  'view todos': CommandType.VIEW_TODOS,
  'view todo': CommandType.VIEW_TODOS,
  'view-todos': CommandType.VIEW_TODOS,
  'todos': CommandType.VIEW_TODOS,
  'todo': CommandType.VIEW_TODOS,
  'list todos': CommandType.VIEW_TODOS,
  'list todo': CommandType.VIEW_TODOS,
  'view devlog': CommandType.VIEW_DEVLOG,
  'view devlogs': CommandType.VIEW_DEVLOG,
  'view-devlog': CommandType.VIEW_DEVLOG,
  'list devlog': CommandType.VIEW_DEVLOG,
  'list devlogs': CommandType.VIEW_DEVLOG,
  'view components': CommandType.VIEW_COMPONENTS,
  'view component': CommandType.VIEW_COMPONENTS,
  'view-components': CommandType.VIEW_COMPONENTS,
  'component': CommandType.VIEW_COMPONENTS,
  'components': CommandType.VIEW_COMPONENTS,
  'list components': CommandType.VIEW_COMPONENTS,
  'list component': CommandType.VIEW_COMPONENTS,
  'features': CommandType.VIEW_COMPONENTS,
  'feature': CommandType.VIEW_COMPONENTS,

  // Natural viewing aliases
  'show notes': CommandType.VIEW_NOTES,
  'show note': CommandType.VIEW_NOTES,
  'show todos': CommandType.VIEW_TODOS,
  'show todo': CommandType.VIEW_TODOS,
  'show devlog': CommandType.VIEW_DEVLOG,
  'show devlogs': CommandType.VIEW_DEVLOG,
  'show components': CommandType.VIEW_COMPONENTS,
  'show component': CommandType.VIEW_COMPONENTS,
  'display notes': CommandType.VIEW_NOTES,
  'display note': CommandType.VIEW_NOTES,
  'display todos': CommandType.VIEW_TODOS,
  'display todo': CommandType.VIEW_TODOS,
  'display devlog': CommandType.VIEW_DEVLOG,
  'display devlogs': CommandType.VIEW_DEVLOG,
  'display components': CommandType.VIEW_COMPONENTS,
  'display component': CommandType.VIEW_COMPONENTS,
  'ls notes': CommandType.VIEW_NOTES,
  'ls todos': CommandType.VIEW_TODOS,
  'ls devlog': CommandType.VIEW_DEVLOG,
  'ls components': CommandType.VIEW_COMPONENTS,

  // Short form aliases
  't': CommandType.VIEW_TODOS,
  'n': CommandType.VIEW_NOTES,
  'dl': CommandType.VIEW_DEVLOG,
  'c': CommandType.VIEW_COMPONENTS,
  's': CommandType.VIEW_STACK,

  // Natural phrases
  'show me notes': CommandType.VIEW_NOTES,
  'show me todos': CommandType.VIEW_TODOS,
  'show me devlog': CommandType.VIEW_DEVLOG,
  'show me components': CommandType.VIEW_COMPONENTS,
  'give me notes': CommandType.VIEW_NOTES,
  'give me todos': CommandType.VIEW_TODOS,
  'give me devlog': CommandType.VIEW_DEVLOG,
  'give me components': CommandType.VIEW_COMPONENTS,
  'get notes': CommandType.VIEW_NOTES,
  'get todos': CommandType.VIEW_TODOS,
  'get devlog': CommandType.VIEW_DEVLOG,
  'get components': CommandType.VIEW_COMPONENTS,

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
  'wizard project': CommandType.WIZARD_NEW,
  'wizard-project': CommandType.WIZARD_NEW,
  'new project': CommandType.WIZARD_NEW,
  'new': CommandType.WIZARD_NEW,

  // Export commands
  'export': CommandType.EXPORT,
  'download': CommandType.EXPORT,

  // Stack commands - unified
  'add stack': CommandType.ADD_STACK,
  'add-stack': CommandType.ADD_STACK,
  'remove stack': CommandType.REMOVE_STACK,
  'remove-stack': CommandType.REMOVE_STACK,
  'rm stack': CommandType.REMOVE_STACK,
  'view stack': CommandType.VIEW_STACK,
  'view-stack': CommandType.VIEW_STACK,
  'stack': CommandType.VIEW_STACK,

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
  'push': CommandType.PUSH_TODO,
  'push todo': CommandType.PUSH_TODO,
  'todo2devlog': CommandType.PUSH_TODO,
  'promote': CommandType.PUSH_TODO,

  // Notifications
  'view notifications': CommandType.VIEW_NOTIFICATIONS,
  'view-notifications': CommandType.VIEW_NOTIFICATIONS,
  'notifications': CommandType.VIEW_NOTIFICATIONS,
  'notifs': CommandType.VIEW_NOTIFICATIONS,
  'clear notifications': CommandType.CLEAR_NOTIFICATIONS,
  'clear-notifications': CommandType.CLEAR_NOTIFICATIONS,
  'clear notifs': CommandType.CLEAR_NOTIFICATIONS,

  // LLM Context
  'llm': CommandType.LLM_CONTEXT,
  'llm context': CommandType.LLM_CONTEXT,
  'llm-context': CommandType.LLM_CONTEXT,
  'ai': CommandType.LLM_CONTEXT,
  'ai context': CommandType.LLM_CONTEXT,

  // Subtask commands - with plural/singular support
  'add subtask': CommandType.ADD_SUBTASK,
  'add subtasks': CommandType.ADD_SUBTASK,
  'add-subtask': CommandType.ADD_SUBTASK,
  'subtask': CommandType.ADD_SUBTASK,
  'view subtasks': CommandType.VIEW_SUBTASKS,
  'view subtask': CommandType.VIEW_SUBTASKS,
  'view-subtasks': CommandType.VIEW_SUBTASKS,
  'subtasks': CommandType.VIEW_SUBTASKS,
  'list subtasks': CommandType.VIEW_SUBTASKS,
  'list subtask': CommandType.VIEW_SUBTASKS,

  // Edit commands - with plural/singular support
  'edit todo': CommandType.EDIT_TODO,
  'edit todos': CommandType.EDIT_TODO,
  'edit-todo': CommandType.EDIT_TODO,
  'edit note': CommandType.EDIT_NOTE,
  'edit notes': CommandType.EDIT_NOTE,
  'edit-note': CommandType.EDIT_NOTE,
  'edit devlog': CommandType.EDIT_DEVLOG,
  'edit devlogs': CommandType.EDIT_DEVLOG,
  'edit-devlog': CommandType.EDIT_DEVLOG,
  'edit component': CommandType.EDIT_COMPONENT,
  'edit components': CommandType.EDIT_COMPONENT,
  'edit-component': CommandType.EDIT_COMPONENT,
  'edit subtask': CommandType.EDIT_SUBTASK,
  'edit subtasks': CommandType.EDIT_SUBTASK,
  'edit-subtask': CommandType.EDIT_SUBTASK,

  // Natural edit aliases
  'update todo': CommandType.EDIT_TODO,
  'update note': CommandType.EDIT_NOTE,
  'update devlog': CommandType.EDIT_DEVLOG,
  'update component': CommandType.EDIT_COMPONENT,
  'update subtask': CommandType.EDIT_SUBTASK,
  'modify todo': CommandType.EDIT_TODO,
  'modify note': CommandType.EDIT_NOTE,
  'modify devlog': CommandType.EDIT_DEVLOG,
  'modify component': CommandType.EDIT_COMPONENT,
  'modify subtask': CommandType.EDIT_SUBTASK,

  // Delete commands - with plural/singular and rm support
  'delete todo': CommandType.DELETE_TODO,
  'delete todos': CommandType.DELETE_TODO,
  'delete-todo': CommandType.DELETE_TODO,
  'remove todo': CommandType.DELETE_TODO,
  'remove todos': CommandType.DELETE_TODO,
  'rm todo': CommandType.DELETE_TODO,
  'rm todos': CommandType.DELETE_TODO,
  'delete note': CommandType.DELETE_NOTE,
  'delete notes': CommandType.DELETE_NOTE,
  'delete-note': CommandType.DELETE_NOTE,
  'remove note': CommandType.DELETE_NOTE,
  'remove notes': CommandType.DELETE_NOTE,
  'rm note': CommandType.DELETE_NOTE,
  'rm notes': CommandType.DELETE_NOTE,
  'delete devlog': CommandType.DELETE_DEVLOG,
  'delete devlogs': CommandType.DELETE_DEVLOG,
  'delete-devlog': CommandType.DELETE_DEVLOG,
  'remove devlog': CommandType.DELETE_DEVLOG,
  'remove devlogs': CommandType.DELETE_DEVLOG,
  'rm devlog': CommandType.DELETE_DEVLOG,
  'rm devlogs': CommandType.DELETE_DEVLOG,
  'delete component': CommandType.DELETE_COMPONENT,
  'delete components': CommandType.DELETE_COMPONENT,
  'delete-component': CommandType.DELETE_COMPONENT,
  'remove component': CommandType.DELETE_COMPONENT,
  'remove components': CommandType.DELETE_COMPONENT,
  'rm component': CommandType.DELETE_COMPONENT,
  'rm components': CommandType.DELETE_COMPONENT,
  'delete subtask': CommandType.DELETE_SUBTASK,
  'delete subtasks': CommandType.DELETE_SUBTASK,
  'delete-subtask': CommandType.DELETE_SUBTASK,
  'remove subtask': CommandType.DELETE_SUBTASK,
  'remove subtasks': CommandType.DELETE_SUBTASK,
  'rm subtask': CommandType.DELETE_SUBTASK,
  'rm subtasks': CommandType.DELETE_SUBTASK,

  // Short delete aliases
  'del todo': CommandType.DELETE_TODO,
  'del note': CommandType.DELETE_NOTE,
  'del devlog': CommandType.DELETE_DEVLOG,
  'del component': CommandType.DELETE_COMPONENT,
  'del subtask': CommandType.DELETE_SUBTASK,

  // Relationship commands - with plural/singular and rm support
  'add relationship': CommandType.ADD_RELATIONSHIP,
  'add relationships': CommandType.ADD_RELATIONSHIP,
  'add-relationship': CommandType.ADD_RELATIONSHIP,
  'relationship add': CommandType.ADD_RELATIONSHIP,
  'view relationships': CommandType.VIEW_RELATIONSHIPS,
  'view relationship': CommandType.VIEW_RELATIONSHIPS,
  'view-relationships': CommandType.VIEW_RELATIONSHIPS,
  'relationships': CommandType.VIEW_RELATIONSHIPS,
  'list relationships': CommandType.VIEW_RELATIONSHIPS,
  'edit relationship': CommandType.EDIT_RELATIONSHIP,
  'edit relationships': CommandType.EDIT_RELATIONSHIP,
  'edit-relationship': CommandType.EDIT_RELATIONSHIP,
  'delete relationship': CommandType.DELETE_RELATIONSHIP,
  'delete relationships': CommandType.DELETE_RELATIONSHIP,
  'delete-relationship': CommandType.DELETE_RELATIONSHIP,
  'remove relationship': CommandType.DELETE_RELATIONSHIP,
  'remove relationships': CommandType.DELETE_RELATIONSHIP,
  'rm relationship': CommandType.DELETE_RELATIONSHIP,
  'rm relationships': CommandType.DELETE_RELATIONSHIP,

  // Navigation & Workflow
  'goto': CommandType.GOTO,
  'go': CommandType.GOTO,
  'navigate': CommandType.GOTO,
  'today': CommandType.TODAY,
  'week': CommandType.WEEK,
  'weekly': CommandType.WEEK,
  'standup': CommandType.STANDUP,
  'stand-up': CommandType.STANDUP,
  'daily': CommandType.STANDUP,
  'info': CommandType.INFO,
  'overview': CommandType.INFO,

  // User ideas
  'add idea': CommandType.ADD_IDEA,
  'add-idea': CommandType.ADD_IDEA,
  'new idea': CommandType.ADD_IDEA,
  'create idea': CommandType.ADD_IDEA,
  'view ideas': CommandType.VIEW_IDEAS,
  'view-ideas': CommandType.VIEW_IDEAS,
  'ideas': CommandType.VIEW_IDEAS,
  'list ideas': CommandType.VIEW_IDEAS,
  'edit idea': CommandType.EDIT_IDEA,
  'edit-idea': CommandType.EDIT_IDEA,
  'update idea': CommandType.EDIT_IDEA,
  'delete idea': CommandType.DELETE_IDEA,
  'delete-idea': CommandType.DELETE_IDEA,
  'remove idea': CommandType.DELETE_IDEA,
  'rm idea': CommandType.DELETE_IDEA,

  // Project management
  'add project': CommandType.ADD_PROJECT,
  'add-project': CommandType.ADD_PROJECT,
  'create project': CommandType.ADD_PROJECT,
  'view projects': CommandType.VIEW_PROJECTS,
  'view-projects': CommandType.VIEW_PROJECTS,
  'projects': CommandType.VIEW_PROJECTS,
  'list projects': CommandType.VIEW_PROJECTS,

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
  simpleSyntax: string;  // Simple version shown at the top (e.g., "/add todo")
  description: string;
  examples: string[];
  requiresProject: boolean;
  requiresArgs: boolean;
}

export const COMMAND_METADATA: Record<CommandType, CommandMetadata> = {
  [CommandType.ADD_TODO]: {
    type: CommandType.ADD_TODO,
    syntax: '/add todo --title="text" --content="text" --priority="low|medium|high" --status="not_started|in_progress|blocked" --due="MM-DD-YYYY TIME" @project',
    simpleSyntax: '/add todo',
    description: 'Create a new todo item with flags',
    examples: [
      '/add todo --title="fix authentication bug" --priority=high',
      '/add todo --title="implement user dashboard" --content="Add responsive design"',
      '/add todo --title="team meeting" --due="12-25-2025 8:00PM"'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.ADD_NOTE]: {
    type: CommandType.ADD_NOTE,
    syntax: '/add note --title="text" --content="text" @project',
    simpleSyntax: '/add note',
    description: 'Create a new note with title and content',
    examples: [
      '/add note --title="API Architecture" --content="REST API design decisions..." @project',
      '/add note --title="Meeting Notes" --content="Discussed project timeline and milestones"',
      '/add note --title="Database Schema" --content="User table structure and relationships" @project'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.ADD_DEVLOG]: {
    type: CommandType.ADD_DEVLOG,
    syntax: '/add devlog --title="text" --content="text" @project',
    simpleSyntax: '/add devlog',
    description: 'Create a new dev log entry with title and content',
    examples: [
      '/add devlog --title="Memory Leak Fix" --content="Fixed memory leak in user service by clearing event listeners" @project',
      '/add devlog --title="Query Optimization" --content="Optimized database queries, reduced load time by 40%"',
      '/add devlog --title="Auth Refactor" --content="Refactored authentication flow to use JWT tokens" @project'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.ADD_COMPONENT]: {
    type: CommandType.ADD_COMPONENT,
    syntax: '/add component --feature="name" --category="category" --type="type" --title="title" --content="content" @project',
    simpleSyntax: '/add component',
    description: 'Add a component to a feature (categories: frontend, backend, database, infrastructure, security, api, documentation, asset)',
    examples: [
      '/add component --feature="Auth" --category=backend --type=service --title="Login Service" --content="Handles user authentication" @project',
      '/add component --feature="Users" --category=api --type=endpoint --title="GET /users" --content="Retrieve all users endpoint"',
      '/add component --feature="Dashboard" --category=frontend --type=component --title="Header" --content="Top navigation bar with user menu"'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_NOTES]: {
    type: CommandType.VIEW_NOTES,
    syntax: '/view notes @project',
    simpleSyntax: '/view notes',
    description: 'List all notes in a project',
    examples: [
      '/view notes @project',
      '/notes',
      '/list notes @project'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_TODOS]: {
    type: CommandType.VIEW_TODOS,
    syntax: '/view todos @project',
    simpleSyntax: '/view todos',
    description: 'List all todos in a project',
    examples: [
      '/view todos @project',
      '/todos',
      '/list todos @project'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_DEVLOG]: {
    type: CommandType.VIEW_DEVLOG,
    syntax: '/view devlog @project',
    simpleSyntax: '/view devlog',
    description: 'List dev log entries',
    examples: [
      '/view devlog @project',
      '/devlog',
      '/list devlog @project'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_COMPONENTS]: {
    type: CommandType.VIEW_COMPONENTS,
    syntax: '/view components @project',
    simpleSyntax: '/view components',
    description: 'List components grouped by features',
    examples: [
      '/view components',
      '/components @project',
      '/features'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.SWAP_PROJECT]: {
    type: CommandType.SWAP_PROJECT,
    syntax: '/swap @project',
    simpleSyntax: '/swap',
    description: 'Switch to a different project',
    examples: [
      '/swap @project',
      '/swap frontend',
      '/switch backend'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.WIZARD_NEW]: {
    type: CommandType.WIZARD_NEW,
    syntax: '/wizard new',
    simpleSyntax: '/wizard new',
    description: 'Start interactive wizard to create new project',
    examples: [
      '/wizard new',
      '/wizard project',
      '/new project',
      '/new'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.EXPORT]: {
    type: CommandType.EXPORT,
    syntax: '/export @project',
    simpleSyntax: '/export',
    description: 'Export project data',
    examples: [
      '/export @project',
      '/export',
      '/download @project'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.SUMMARY]: {
    type: CommandType.SUMMARY,
    syntax: '/summary "[format]" "[entity]" @project',
    simpleSyntax: '/summary',
    description: 'Generate downloadable project summary in various formats (markdown/json/prompt/text), optionally filtered by entity (todos/notes/devlog/components/stack/team/deployment/settings/projects/all)',
    examples: [
      '/summary - Full project summary in markdown',
      '/summary "prompt" - Full summary in AI-friendly format',
      '/summary "json" "todos" - Export only todos in JSON',
      '/summary "markdown" "components" - Export components as markdown',
      '/summary "prompt" "projects" - List all projects and ideas for LLM',
      '/summary "json" "projects" - Export all projects as JSON',
      '/summary "json" "team" - Export team members as JSON',
      '/summary "prompt" "deployment" - Export deployment config for AI',
      '/summary "markdown" "settings" - Export project settings as markdown'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.ADD_STACK]: {
    type: CommandType.ADD_STACK,
    syntax: '/add stack --name="name" --category="category" --version="version" --description="optional" @project',
    simpleSyntax: '/add stack',
    description: 'Add a technology or package to the stack (unified command)',
    examples: [
      '/add stack --name="React" --category=framework --version=18.2.0 @project',
      '/add stack --name="express" --category=api --version=4.18.0 --description="Backend framework" @project',
      '/add-stack --name="PostgreSQL" --category=database'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.REMOVE_STACK]: {
    type: CommandType.REMOVE_STACK,
    syntax: '/remove stack --name="name" @project',
    simpleSyntax: '/remove stack',
    description: 'Remove a technology or package from the stack (unified command)',
    examples: [
      '/remove stack --name="React" @project',
      '/rm stack --name="express" @project',
      '/remove-stack --name="PostgreSQL"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_STACK]: {
    type: CommandType.VIEW_STACK,
    syntax: '/view stack @project',
    simpleSyntax: '/view stack',
    description: 'View the tech stack and packages',
    examples: [
      '/view stack @project',
      '/stack',
      '/view-stack @project'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_DEPLOYMENT]: {
    type: CommandType.VIEW_DEPLOYMENT,
    syntax: '/view deployment @project',
    simpleSyntax: '/view deployment',
    description: 'View deployment information',
    examples: [
      '/view deployment @project',
      '/deployment',
      '/deploy'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.SET_DEPLOYMENT]: {
    type: CommandType.SET_DEPLOYMENT,
    syntax: '/set deployment --url="url" --github="repo" --platform="platform" --status="status" --branch="branch" --build="cmd" --start="cmd" --lastDeploy="date" @project',
    simpleSyntax: '/set deployment',
    description: 'Update deployment settings',
    examples: [
      '/set deployment --url=https://myapp.com --platform=vercel --github=user/repo',
      '/set-deployment --status=active --branch=main --build="npm run build" --start="npm start"',
      '/set deployment --url=https://api.example.com --lastDeploy="2025-10-25" @project'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_PUBLIC]: {
    type: CommandType.VIEW_PUBLIC,
    syntax: '/view public @project',
    simpleSyntax: '/view public',
    description: 'View public settings',
    examples: [
      '/view public @project',
      '/public'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.SET_PUBLIC]: {
    type: CommandType.SET_PUBLIC,
    syntax: '/set public --enabled="true/false" --slug="slug" @project',
    simpleSyntax: '/set public',
    description: 'Toggle public visibility and set slug',
    examples: [
      '/set public --enabled=true --slug=my-awesome-project',
      '/make public --slug=my-project @project',
      '/make private @project'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_TEAM]: {
    type: CommandType.VIEW_TEAM,
    syntax: '/view team @project',
    simpleSyntax: '/view team',
    description: 'View team members',
    examples: [
      '/view team @project',
      '/team'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.INVITE_MEMBER]: {
    type: CommandType.INVITE_MEMBER,
    syntax: '/invite "[email/username]" --role="editor/viewer" @project',
    simpleSyntax: '/invite',
    description: 'Invite a user to the project by email or username',
    examples: [
      '/invite "[email/username]"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.REMOVE_MEMBER]: {
    type: CommandType.REMOVE_MEMBER,
    syntax: '/remove member "[email/username]" @project',
    simpleSyntax: '/remove member',
    description: 'Remove a team member by email or username',
    examples: [
      '/remove member "[email/username]"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_SETTINGS]: {
    type: CommandType.VIEW_SETTINGS,
    syntax: '/view settings @project',
    simpleSyntax: '/view settings',
    description: 'View project settings',
    examples: [
      '/view settings @project',
      '/settings'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.SET_NAME]: {
    type: CommandType.SET_NAME,
    syntax: '/set name "[new name]" @project',
    simpleSyntax: '/set name',
    description: 'Update project name',
    examples: [
      '/set name "[new name]"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.SET_DESCRIPTION]: {
    type: CommandType.SET_DESCRIPTION,
    syntax: '/set description "[new description]" @project',
    simpleSyntax: '/set description',
    description: 'Update project description',
    examples: [
      '/set description "[new description]"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.ADD_TAG]: {
    type: CommandType.ADD_TAG,
    syntax: '/add tag "[tag name]" @project',
    simpleSyntax: '/add tag',
    description: 'Add a tag to the project',
    examples: [
      '/add tag "[tag name]"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.REMOVE_TAG]: {
    type: CommandType.REMOVE_TAG,
    syntax: '/remove tag "[tag name]" @project',
    simpleSyntax: '/remove tag',
    description: 'Remove a tag from the project',
    examples: [
      '/remove tag "[tag name]"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_NEWS]: {
    type: CommandType.VIEW_NEWS,
    syntax: '/view news',
    simpleSyntax: '/view news',
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
    syntax: '/set theme "[theme name]"',
    simpleSyntax: '/set theme',
    description: 'Change the application theme',
    examples: [
      '/set theme "[theme name]"'
    ],
    requiresProject: false,
    requiresArgs: true
  },
  [CommandType.VIEW_THEMES]: {
    type: CommandType.VIEW_THEMES,
    syntax: '/view themes',
    simpleSyntax: '/view themes',
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
    syntax: '/search "[query]" @project',
    simpleSyntax: '/search',
    description: 'Search across all project content (todos, notes, devlog, components)',
    examples: [
      '/search "[query]"'
    ],
    requiresProject: false,
    requiresArgs: true
  },
  [CommandType.COMPLETE_TODO]: {
    type: CommandType.COMPLETE_TODO,
    syntax: '/complete "[todo text/id]" @project',
    simpleSyntax: '/complete',
    description: 'Mark a todo as completed',
    examples: [
      '/complete "[todo text/id]"',
      '/complete [#]'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.ASSIGN_TODO]: {
    type: CommandType.ASSIGN_TODO,
    syntax: '/assign "[todo text/id]" "[user email]" @project',
    simpleSyntax: '/assign',
    description: 'Assign a todo to a team member',
    examples: [
      '/assign "[todo text/id]" "[user email]"',
      '/assign [#] "[user email]"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.PUSH_TODO]: {
    type: CommandType.PUSH_TODO,
    syntax: '/push "[todo text/id]" @project',
    simpleSyntax: '/push',
    description: 'Push a completed todo to devlog (converts todo to dev log entry)',
    examples: [
      '/push "[todo text/id]"',
      '/push [#]'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_NOTIFICATIONS]: {
    type: CommandType.VIEW_NOTIFICATIONS,
    syntax: '/view notifications [--unread]',
    simpleSyntax: '/view notifications',
    description: 'View your notifications',
    examples: [
      '/view notifications',
      '/notifications --unread',
      '/notifs'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.CLEAR_NOTIFICATIONS]: {
    type: CommandType.CLEAR_NOTIFICATIONS,
    syntax: '/clear notifications',
    simpleSyntax: '/clear notifications',
    description: 'Clear all notifications',
    examples: [
      '/clear notifications',
      '/clear notifs',
      '/clear-notifications'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.LLM_CONTEXT]: {
    type: CommandType.LLM_CONTEXT,
    syntax: '/llm',
    simpleSyntax: '/llm',
    description: 'Generate comprehensive terminal interaction guide for local LLMs',
    examples: [
      '/llm',
      '/ai',
      '/llm context'
    ],
    requiresProject: false,
    requiresArgs: false
  },

  // Subtask commands
  [CommandType.ADD_SUBTASK]: {
    type: CommandType.ADD_SUBTASK,
    syntax: '/add subtask "[parent todo]" "[subtask text]" @project',
    simpleSyntax: '/add subtask',
    description: 'Add a subtask to an existing todo',
    examples: [
      '/add subtask "[parent todo]" "[subtask text]"',
      '/add subtask [#] "[subtask text]"'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_SUBTASKS]: {
    type: CommandType.VIEW_SUBTASKS,
    syntax: '/view subtasks "[todo text/id]" @project',
    simpleSyntax: '/view subtasks',
    description: 'View all subtasks for a todo',
    examples: [
      '/view subtasks "[todo text/id]"',
      '/view subtasks [#]'
    ],
    requiresProject: true,
    requiresArgs: true
  },

  // Edit commands
  [CommandType.EDIT_TODO]: {
    type: CommandType.EDIT_TODO,
    syntax: '/edit todo "[todo id]" --title= --priority= --due= --status= @project',
    simpleSyntax: '/edit todo',
    description: 'Open interactive wizard to edit an existing todo, or use flags for direct updates',
    examples: [
      '/edit todo "[todo id]"',
      '/edit todo [#]'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.EDIT_SUBTASK]: {
    type: CommandType.EDIT_SUBTASK,
    syntax: '/edit subtask "[parent_index]" "[subtask_index]" --title= --priority= --due= --status= @project',
    simpleSyntax: '/edit subtask',
    description: 'Open interactive wizard to edit a subtask, or use flags for direct updates (per-parent indexing)',
    examples: [
      '/edit subtask "[parent #]" "[subtask #]"',
      '/edit subtask [#] [#]'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.EDIT_NOTE]: {
    type: CommandType.EDIT_NOTE,
    syntax: '/edit note "[note id]" @project',
    simpleSyntax: '/edit note',
    description: 'Open interactive wizard to edit an existing note, or use --field and --content for direct updates',
    examples: [
      '/edit note "[note id]"',
      '/edit note [#]'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.EDIT_DEVLOG]: {
    type: CommandType.EDIT_DEVLOG,
    syntax: '/edit devlog "[entry id]" @project',
    simpleSyntax: '/edit devlog',
    description: 'Open interactive wizard to edit an existing dev log entry, or use --field and --content for direct updates',
    examples: [
      '/edit devlog "[entry id]"',
      '/edit devlog [#]'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.EDIT_COMPONENT]: {
    type: CommandType.EDIT_COMPONENT,
    syntax: '/edit component "[component id]" @project',
    simpleSyntax: '/edit component',
    description: 'Open interactive wizard to edit an existing component, or use --field and --content for direct updates',
    examples: [
      '/edit component "[component id]"',
      '/edit component [#]'
    ],
    requiresProject: true,
    requiresArgs: false
  },

  // Delete commands
  [CommandType.DELETE_TODO]: {
    type: CommandType.DELETE_TODO,
    syntax: '/delete todo "[todo text/id]" @project',
    simpleSyntax: '/delete todo',
    description: 'Delete a todo (with confirmation)',
    examples: [
      '/delete todo "[todo text/id]"',
      '/delete todo [#]'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.DELETE_NOTE]: {
    type: CommandType.DELETE_NOTE,
    syntax: '/delete note "[note id/title]" @project',
    simpleSyntax: '/delete note',
    description: 'Delete a note (with confirmation)',
    examples: [
      '/delete note "[note id/title]"',
      '/delete note [#]'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.DELETE_DEVLOG]: {
    type: CommandType.DELETE_DEVLOG,
    syntax: '/delete devlog "[entry id]" @project',
    simpleSyntax: '/delete devlog',
    description: 'Delete a dev log entry (with confirmation)',
    examples: [
      '/delete devlog "[entry id]"',
      '/delete devlog [#]'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.DELETE_COMPONENT]: {
    type: CommandType.DELETE_COMPONENT,
    syntax: '/delete component "[component id/title]" @project',
    simpleSyntax: '/delete component',
    description: 'Delete a component (with confirmation)',
    examples: [
      '/delete component "[component id/title]"',
      '/delete component [#]'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.DELETE_SUBTASK]: {
    type: CommandType.DELETE_SUBTASK,
    syntax: '/delete subtask "[parent_index]" "[subtask_index]" @project',
    simpleSyntax: '/delete subtask',
    description: 'Delete a subtask (with confirmation, per-parent indexing)',
    examples: [
      '/delete subtask "[parent #]" "[subtask #]"',
      '/delete subtask [#] [#]'
    ],
    requiresProject: true,
    requiresArgs: false
  },

  // Relationship commands
  [CommandType.ADD_RELATIONSHIP]: {
    type: CommandType.ADD_RELATIONSHIP,
    syntax: '/add relationship --source="component" --target="target" --type=uses --description="optional" @project',
    simpleSyntax: '/add relationship',
    description: 'Add a relationship between two components',
    examples: [
      '/add relationship --source="Login" --target="Auth Service" --type=uses',
      '/add relationship --source="Dashboard" --target="API" --type=depends_on --description="Fetches user data"'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_RELATIONSHIPS]: {
    type: CommandType.VIEW_RELATIONSHIPS,
    syntax: '/view relationships "[component id/title]" @project',
    simpleSyntax: '/view relationships',
    description: 'View all relationships for a component',
    examples: [
      '/view relationships "[component id/title]"',
      '/view relationships [#]'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.EDIT_RELATIONSHIP]: {
    type: CommandType.EDIT_RELATIONSHIP,
    syntax: '/edit relationship "[component id/title]" "[relationship id]" "[new type]" --description="optional" @project',
    simpleSyntax: '/edit relationship',
    description: 'Edit an existing relationship',
    examples: [
      '/edit relationship "Login" 1 depends_on',
      '/edit relationship "Dashboard" 2 uses --description="Fetches user data"'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.DELETE_RELATIONSHIP]: {
    type: CommandType.DELETE_RELATIONSHIP,
    syntax: '/delete relationship "[component id/title]" "[relationship id]" @project',
    simpleSyntax: '/delete relationship',
    description: 'Delete a relationship (with confirmation)',
    examples: [
      '/delete relationship "[component id/title]" "[relationship id]"',
      '/delete relationship [#] "[relationship id]"'
    ],
    requiresProject: true,
    requiresArgs: false
  },

  // Navigation & Workflow
  [CommandType.GOTO]: {
    type: CommandType.GOTO,
    syntax: '/goto "[page]" @project',
    simpleSyntax: '/goto',
    description: 'Navigate to a specific page in the app',
    examples: [
      '/goto "[page]"'
    ],
    requiresProject: false,
    requiresArgs: true
  },
  [CommandType.TODAY]: {
    type: CommandType.TODAY,
    syntax: '/today @project',
    simpleSyntax: '/today',
    description: 'View today\'s tasks and activity',
    examples: [
      '/today',
      '/today @project'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.WEEK]: {
    type: CommandType.WEEK,
    syntax: '/week @project',
    simpleSyntax: '/week',
    description: 'View weekly summary and upcoming tasks',
    examples: [
      '/week',
      '/week @project',
      '/weekly'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.STANDUP]: {
    type: CommandType.STANDUP,
    syntax: '/standup @project',
    simpleSyntax: '/standup',
    description: 'Generate standup report (what I did yesterday, working on today, stuck on)',
    examples: [
      '/standup',
      '/standup @project',
      '/daily @project'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.INFO]: {
    type: CommandType.INFO,
    syntax: '/info @project',
    simpleSyntax: '/info',
    description: 'Quick project overview and statistics',
    examples: [
      '/info',
      '/info @project',
      '/overview'
    ],
    requiresProject: false,
    requiresArgs: false
  },

  // User ideas
  [CommandType.ADD_IDEA]: {
    type: CommandType.ADD_IDEA,
    syntax: '/add idea --title="title" --description="description" --content="content"',
    simpleSyntax: '/add idea',
    description: 'Add a new idea to your personal idea list',
    examples: [
      '/add idea --title="Mobile App" --content="Build a mobile app for the platform"',
      '/add idea --title="AI Integration" --description="Add AI features" --content="Integrate GPT for smart suggestions"'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.VIEW_IDEAS]: {
    type: CommandType.VIEW_IDEAS,
    syntax: '/view ideas',
    simpleSyntax: '/view ideas',
    description: 'View all your personal ideas',
    examples: [
      '/view ideas',
      '/ideas',
      '/list ideas'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.EDIT_IDEA]: {
    type: CommandType.EDIT_IDEA,
    syntax: '/edit idea "[idea id]" --title="new title" --description="new description" --content="new content"',
    simpleSyntax: '/edit idea',
    description: 'Edit an existing idea',
    examples: [
      '/edit idea "[idea id]" --title="Updated Title"',
      '/edit idea [#] --content="Updated content"'
    ],
    requiresProject: false,
    requiresArgs: true
  },
  [CommandType.DELETE_IDEA]: {
    type: CommandType.DELETE_IDEA,
    syntax: '/delete idea "[idea id]"',
    simpleSyntax: '/delete idea',
    description: 'Delete an idea',
    examples: [
      '/delete idea "[idea id]"',
      '/delete idea [#]',
      '/rm idea [#]'
    ],
    requiresProject: false,
    requiresArgs: true
  },

  // Project management
  [CommandType.ADD_PROJECT]: {
    type: CommandType.ADD_PROJECT,
    syntax: '/add project --name="name" --description="description" --category="category" --color="color"',
    simpleSyntax: '/add project',
    description: 'Create a new project with specified properties',
    examples: [
      '/add project --name="My App" --description="A new web app"',
      '/add project --name="API Service" --category=backend --color=#3B82F6'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.VIEW_PROJECTS]: {
    type: CommandType.VIEW_PROJECTS,
    syntax: '/view projects',
    simpleSyntax: '/view projects',
    description: 'List all your projects',
    examples: [
      '/view projects',
      '/projects',
      '/list projects'
    ],
    requiresProject: false,
    requiresArgs: false
  },

  [CommandType.HELP]: {
    type: CommandType.HELP,
    syntax: '/help "[command]"',
    simpleSyntax: '/help',
    description: 'Show help for all commands or a specific command',
    examples: [
      '/help',
      '/help "[command]"'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.UNKNOWN]: {
    type: CommandType.UNKNOWN,
    syntax: '',
    simpleSyntax: '',
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
   * Tokenize a string respecting quotes and escape sequences
   * @param str - String to tokenize
   * @returns Array of tokens
   */
  private static tokenize(str: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let escaped = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escaped) {
        // Add both backslash and escaped character to preserve escape sequences
        current += '\\' + char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        // Next character is escaped - mark it but don't add backslash yet
        escaped = true;
        continue;
      }

      if ((char === '"' || char === "'") && !inQuotes) {
        // Start of quoted string
        inQuotes = true;
        quoteChar = char;
        continue;
      }

      if (char === quoteChar && inQuotes) {
        // End of quoted string
        inQuotes = false;
        quoteChar = '';
        continue;
      }

      if (char === ' ' && !inQuotes) {
        // Space outside quotes = token boundary
        if (current.length > 0) {
          tokens.push(current);
          current = '';
        }
        continue;
      }

      // Regular character
      current += char;
    }

    // Add final token
    if (current.length > 0) {
      tokens.push(current);
    }

    return tokens;
  }

  /**
   * Extract @project mention from tokens, handling spaces in project names
   * @param tokens - Array of tokens
   * @returns Object with projectMention and remaining tokens
   */
  private static extractProjectMention(tokens: string[]): { projectMention?: string; tokens: string[] } {
    const remainingTokens: string[] = [];
    let projectMention: string | undefined = undefined;
    let inProjectName = false;
    let projectTokens: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Check if this token starts with @
      if (token.startsWith('@') && !inProjectName) {
        inProjectName = true;
        projectTokens = [token.slice(1)]; // Remove @ and start collecting
        continue;
      }

      // If we're in a project name, keep collecting until we hit a flag or end
      if (inProjectName) {
        // Check if this token is a flag (starts with --)
        if (token.startsWith('--') || token.startsWith('-')) {
          // End of project name
          projectMention = projectTokens.join(' ').trim();
          inProjectName = false;
          projectTokens = [];
          remainingTokens.push(token); // Add the flag to remaining
          continue;
        }
        // Otherwise, it's part of the project name
        projectTokens.push(token);
        continue;
      }

      // Not part of project mention
      remainingTokens.push(token);
    }

    // Handle case where project mention goes to end of string
    if (inProjectName && projectTokens.length > 0) {
      projectMention = projectTokens.join(' ').trim();
    }

    return { projectMention, tokens: remainingTokens };
  }

  /**
   * Process escape sequences in a string value
   * @param value - String value that may contain escape sequences
   * @returns Processed string with escape sequences converted
   */
  private static processEscapeSequences(value: string): string {
    // Use a placeholder for escaped backslashes to prevent double-processing
    return value
      .replace(/\\\\/g, '\x00')  // placeholder for escaped backslash (\\)
      .replace(/\\n/g, '\n')     // newline
      .replace(/\\t/g, '\t')     // tab
      .replace(/\\r/g, '\r')     // carriage return
      .replace(/\\"/g, '"')      // escaped quote
      .replace(/\\'/g, "'")      // escaped single quote
      .replace(/\x00/g, '\\');   // restore escaped backslash
  }

  /**
   * Extract flags from tokens
   * @param tokens - Array of tokens
   * @returns Object with flags map and remaining tokens
   */
  private static extractFlags(tokens: string[]): { flags: Map<string, string | boolean>; tokens: string[] } {
    const flags = new Map<string, string | boolean>();
    const remainingTokens: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Check for --flag=value or -f=value
      const flagMatch = token.match(/^--?(\w+)(?:=(.+))?$/);
      if (flagMatch) {
        const flagName = flagMatch[1];
        let flagValue: string | boolean = flagMatch[2] !== undefined ? flagMatch[2] : true;

        // Process escape sequences in string values
        if (typeof flagValue === 'string') {
          flagValue = this.processEscapeSequences(flagValue);
        }

        flags.set(flagName, flagValue);
        continue;
      }

      // Not a flag
      remainingTokens.push(token);
    }

    return { flags, tokens: remainingTokens };
  }

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

    // Remove leading / and tokenize
    const withoutSlash = trimmed.slice(1);
    let tokens = this.tokenize(withoutSlash);

    if (tokens.length === 0) {
      result.errors.push('No command specified');
      return result;
    }

    // Extract @project mention (handles spaces in project names)
    const projectExtraction = this.extractProjectMention(tokens);
    result.projectMention = projectExtraction.projectMention;
    tokens = projectExtraction.tokens;

    // Extract flags (preserves quoted values)
    const flagExtraction = this.extractFlags(tokens);
    result.flags = flagExtraction.flags;
    tokens = flagExtraction.tokens;

    // Now tokens contains only command and arguments
    if (tokens.length === 0) {
      result.errors.push('No command specified');
      return result;
    }

    // Try to match command (support multi-word commands like "add todo")
    let commandMatch: CommandType | null = null;
    let commandLength = 0;

    // Try matching 2-word commands first (e.g., "add todo")
    if (tokens.length >= 2) {
      const twoWordCmd = `${tokens[0]} ${tokens[1]}`.toLowerCase();
      if (COMMAND_ALIASES[twoWordCmd]) {
        commandMatch = COMMAND_ALIASES[twoWordCmd];
        commandLength = 2;
        result.command = twoWordCmd;
        result.subcommand = tokens[1];
      }
    }

    // Try matching 1-word commands
    if (!commandMatch && tokens.length >= 1) {
      const oneWordCmd = tokens[0].toLowerCase();
      if (COMMAND_ALIASES[oneWordCmd]) {
        commandMatch = COMMAND_ALIASES[oneWordCmd];
        commandLength = 1;
        result.command = oneWordCmd;
      }
    }

    if (!commandMatch) {
      result.errors.push(`Unknown command: ${tokens[0]}. Type /help for available commands.`);
      return result;
    }

    result.type = commandMatch;

    // Extract remaining tokens as arguments and process escape sequences
    const remainingTokens = tokens.slice(commandLength);
    result.args = remainingTokens.map(arg => this.processEscapeSequences(arg));

    // Validate command based on metadata
    const metadata = COMMAND_METADATA[result.type];

    // For requiresArgs, check both args AND flags (flags count as arguments too)
    if (metadata.requiresArgs && result.args.length === 0 && result.flags.size === 0) {
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
      flags: Array.from(result.flags.entries()),
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
   * Get all command aliases mapped to their command types
   * @returns Map of alias to command type
   */
  static getAllAliases(): Record<string, CommandType> {
    return { ...COMMAND_ALIASES };
  }

  /**
   * Get aliases for a specific command type
   * @param type - Command type
   * @returns Array of aliases for the command type
   */
  static getAliasesForType(type: CommandType): string[] {
    return Object.entries(COMMAND_ALIASES)
      .filter(([_, cmdType]) => cmdType === type)
      .map(([alias, _]) => alias);
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
