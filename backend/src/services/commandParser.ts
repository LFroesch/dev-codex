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
    syntax: '/add todo --title="text" --content="text" --priority="low|medium|high" --status="not_started|in_progress|blocked" --due="MM-DD-YYYY TIME" @project',
    description: 'Create a new todo item with flags',
    examples: [
      '/add todo --title="fix authentication bug" @myproject',
      '/add todo --title="implement user dashboard" --priority=high --content="Add responsive design"',
      '/add todo --title="review pull request" --status=in_progress @frontend',
      '/add todo --title="finish report" --due="12-25-2025 8:00PM" --priority=high',
      '/add todo --title="team meeting" --due="3-15 9:30AM" @myproject',
      '/add todo --title="deploy to production" --due="12-31 21:00"'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.ADD_NOTE]: {
    type: CommandType.ADD_NOTE,
    syntax: '/add note --title="text" --content="text" @project',
    description: 'Create a new note with title and content',
    examples: [
      '/add note --title="API Architecture" --content="REST API design decisions..." @backend',
      '/add note --title="Meeting Notes" --content="Discussed project timeline and milestones"',
      '/add note --title="Database Schema" --content="User table structure and relationships" @myproject'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.ADD_DEVLOG]: {
    type: CommandType.ADD_DEVLOG,
    syntax: '/add devlog --title="text" --content="text" @project',
    description: 'Create a new dev log entry with title and content',
    examples: [
      '/add devlog --title="Memory Leak Fix" --content="Fixed memory leak in user service by clearing event listeners" @backend',
      '/add devlog --title="Query Optimization" --content="Optimized database queries, reduced load time by 40%"',
      '/add devlog --title="Auth Refactor" --content="Refactored authentication flow to use JWT tokens" @myproject'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.ADD_COMPONENT]: {
    type: CommandType.ADD_COMPONENT,
    syntax: '/add component --feature="name" --category="category" --type="type" --title="title" --content="content" @project',
    description: 'Add a component to a feature (categories: frontend, backend, database, infrastructure, security, api, documentation, asset)',
    examples: [
      '/add component --feature="Auth" --category=backend --type=service --title="Login Service" --content="Handles user authentication" @myproject',
      '/add component --feature="Users" --category=api --type=endpoint --title="GET /users" --content="Retrieve all users endpoint"',
      '/add component --feature="Dashboard" --category=frontend --type=component --title="Header" --content="Top navigation bar with user menu"'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_NOTES]: {
    type: CommandType.VIEW_NOTES,
    syntax: '/view notes @project',
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
    syntax: '/view todos @project',
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
    syntax: '/view devlog @project',
    description: 'List dev log entries',
    examples: [
      '/view devlog @myproject',
      '/devlog',
      '/list devlog @backend'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_COMPONENTS]: {
    type: CommandType.VIEW_COMPONENTS,
    syntax: '/view components @project',
    description: 'List components grouped by features',
    examples: [
      '/view components @myproject',
      '/components',
      '/features @api',
      '/list components'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.SWAP_PROJECT]: {
    type: CommandType.SWAP_PROJECT,
    syntax: '/swap @project',
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
  [CommandType.EXPORT]: {
    type: CommandType.EXPORT,
    syntax: '/export @project',
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
    syntax: '/summary "markdown|json|prompt|text" @project',
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
  [CommandType.ADD_STACK]: {
    type: CommandType.ADD_STACK,
    syntax: '/add stack "name" --category="category" --version="version" --type="tech|package" @project',
    description: 'Add a technology or package to the stack (unified command)',
    examples: [
      '/add stack React --category=framework --version=18.2.0 --type=tech @myproject',
      '/add stack express --category=api --version=4.18.0 --type=package @backend',
      '/add-stack PostgreSQL --category=database --type=tech'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.REMOVE_STACK]: {
    type: CommandType.REMOVE_STACK,
    syntax: '/remove stack --name="name" @project',
    description: 'Remove a technology or package from the stack (unified command)',
    examples: [
      '/remove stack --name="React" @myproject',
      '/rm stack --name="express" @backend',
      '/remove-stack --name="PostgreSQL"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_STACK]: {
    type: CommandType.VIEW_STACK,
    syntax: '/view stack @project',
    description: 'View the tech stack and packages',
    examples: [
      '/view stack @myproject',
      '/stack',
      '/view-stack @backend'
    ],
    requiresProject: true,
    requiresArgs: false
  },
  [CommandType.VIEW_DEPLOYMENT]: {
    type: CommandType.VIEW_DEPLOYMENT,
    syntax: '/view deployment @project',
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
    syntax: '/set deployment --url="url" --platform="platform" --status="status" @project',
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
    syntax: '/view public @project',
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
    syntax: '/set public --enabled="true/false" --slug="slug" @project',
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
    syntax: '/view team @project',
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
    syntax: '/invite "email/username" --role="editor/viewer" @project',
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
    syntax: '/remove member "email/username" @project',
    description: 'Remove a team member by email or username',
    examples: [
      '/remove member "user@example.com" @myproject',
      '/kick "johndoe" @myproject',
      '/kick "colleague@company.com"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_SETTINGS]: {
    type: CommandType.VIEW_SETTINGS,
    syntax: '/view settings @project',
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
    syntax: '/set name "new name" @project',
    description: 'Update project name',
    examples: [
      '/set name "My Awesome Project" @myproject',
      '/rename "New Project Name"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.SET_DESCRIPTION]: {
    type: CommandType.SET_DESCRIPTION,
    syntax: '/set description "new description" @project',
    description: 'Update project description',
    examples: [
      '/set description "A web app for managing tasks" @myproject',
      '/describe "This is my new project"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.ADD_TAG]: {
    type: CommandType.ADD_TAG,
    syntax: '/add tag "tag name" @project',
    description: 'Add a tag to the project',
    examples: [
      '/add tag "react" @myproject',
      '/tag "typescript"',
      '/add-tag "web-app"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.REMOVE_TAG]: {
    type: CommandType.REMOVE_TAG,
    syntax: '/remove tag "tag name" @project',
    description: 'Remove a tag from the project',
    examples: [
      '/remove tag "react" @myproject',
      '/untag "typescript"'
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
    syntax: '/set theme "theme name"',
    description: 'Change the application theme',
    examples: [
      '/set theme "dark"',
      '/theme "light"',
      '/set-theme "cyberpunk"'
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
    syntax: '/search "query" @project',
    description: 'Search across all project content (todos, notes, devlog, components)',
    examples: [
      '/search "authentication bug" @myproject',
      '/find "database schema"',
      '/search "api design"'
    ],
    requiresProject: false,
    requiresArgs: true
  },
  [CommandType.COMPLETE_TODO]: {
    type: CommandType.COMPLETE_TODO,
    syntax: '/complete "todo text/id" @project',
    description: 'Mark a todo as completed',
    examples: [
      '/complete "fix authentication bug" @myproject',
      '/done "implement user dashboard"',
      '/complete 1'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.ASSIGN_TODO]: {
    type: CommandType.ASSIGN_TODO,
    syntax: '/assign "todo text/id" "user email" @project',
    description: 'Assign a todo to a team member',
    examples: [
      '/assign "fix bug" "user@example.com" @myproject',
      '/assign 1 "john@example.com"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_NOTIFICATIONS]: {
    type: CommandType.VIEW_NOTIFICATIONS,
    syntax: '/view notifications [--unread]',
    description: 'View your notifications',
    examples: [
      '/view notifications',
      '/notifications',
      '/notifs',
      '/view notifications --unread'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.CLEAR_NOTIFICATIONS]: {
    type: CommandType.CLEAR_NOTIFICATIONS,
    syntax: '/clear notifications',
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
    description: 'Generate comprehensive terminal interaction guide for local LLMs',
    examples: [
      '/llm',
      '/llm context',
      '/ai context'
    ],
    requiresProject: false,
    requiresArgs: false
  },

  // Subtask commands
  [CommandType.ADD_SUBTASK]: {
    type: CommandType.ADD_SUBTASK,
    syntax: '/add subtask "parent todo" "subtask text" @project',
    description: 'Add a subtask to an existing todo',
    examples: [
      '/add subtask "fix bug" "add tests" @myproject',
      '/subtask "implement feature" "write documentation"',
      '/add-subtask 1 "review code"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_SUBTASKS]: {
    type: CommandType.VIEW_SUBTASKS,
    syntax: '/view subtasks "todo text/id" @project',
    description: 'View all subtasks for a todo',
    examples: [
      '/view subtasks "fix bug" @myproject',
      '/subtasks implement feature',
      '/list subtasks 1'
    ],
    requiresProject: true,
    requiresArgs: true
  },

  // Edit commands
  [CommandType.EDIT_TODO]: {
    type: CommandType.EDIT_TODO,
    syntax: '/edit todo "todo id" @project',
    description: 'Open interactive wizard to edit an existing todo, or use flags for direct updates',
    examples: [
      '/edit todo 1 @myproject',
      '/edit-todo 1',
      '/edit todo 1 --title="Updated title" @myproject',
      '/edit todo 1 --due="12-25-2025 8:00PM" --priority=high',
      '/edit todo 1 --due="3-15 14:30" --status=in_progress'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.EDIT_NOTE]: {
    type: CommandType.EDIT_NOTE,
    syntax: '/edit note "note id" @project',
    description: 'Open interactive wizard to edit an existing note, or use --field and --content for direct updates',
    examples: [
      '/edit note 1 @myproject',
      '/edit-note 1',
      '/edit note 1 --field=content --content="Updated content" @myproject'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.EDIT_DEVLOG]: {
    type: CommandType.EDIT_DEVLOG,
    syntax: '/edit devlog "entry id" @project',
    description: 'Open interactive wizard to edit an existing dev log entry, or use --field and --content for direct updates',
    examples: [
      '/edit devlog 1 @myproject',
      '/edit-devlog 2',
      '/edit devlog 1 --field=content --content="Updated entry" @myproject'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.EDIT_COMPONENT]: {
    type: CommandType.EDIT_COMPONENT,
    syntax: '/edit component "component id" @project',
    description: 'Open interactive wizard to edit an existing component, or use --field and --content for direct updates',
    examples: [
      '/edit component 1 @myproject',
      '/edit-component 1',
      '/edit component 1 --field=title --content="Updated title" @myproject'
    ],
    requiresProject: true,
    requiresArgs: true
  },

  // Delete commands
  [CommandType.DELETE_TODO]: {
    type: CommandType.DELETE_TODO,
    syntax: '/delete todo "todo text/id" @project',
    description: 'Delete a todo (with confirmation)',
    examples: [
      '/delete todo "fix bug" @myproject',
      '/delete-todo 1',
      '/rm todo "implement feature"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.DELETE_NOTE]: {
    type: CommandType.DELETE_NOTE,
    syntax: '/delete note "note id/title" @project',
    description: 'Delete a note (with confirmation)',
    examples: [
      '/delete note "meeting notes" @myproject',
      '/delete-note 1',
      '/rm note "old note"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.DELETE_DEVLOG]: {
    type: CommandType.DELETE_DEVLOG,
    syntax: '/delete devlog "entry id" @project',
    description: 'Delete a dev log entry (with confirmation)',
    examples: [
      '/delete devlog 1 @myproject',
      '/delete-devlog 2',
      '/rm devlog "old entry"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.DELETE_COMPONENT]: {
    type: CommandType.DELETE_COMPONENT,
    syntax: '/delete component "component id/title" @project',
    description: 'Delete a component (with confirmation)',
    examples: [
      '/delete component "old Login" @myproject',
      '/delete-component 1',
      '/rm component "deprecated"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.DELETE_SUBTASK]: {
    type: CommandType.DELETE_SUBTASK,
    syntax: '/delete subtask "subtask text/id" @project',
    description: 'Delete a subtask (with confirmation)',
    examples: [
      '/delete subtask "old subtask" @myproject',
      '/delete-subtask 1',
      '/rm subtask "completed task"'
    ],
    requiresProject: true,
    requiresArgs: true
  },

  // Relationship commands
  [CommandType.ADD_RELATIONSHIP]: {
    type: CommandType.ADD_RELATIONSHIP,
    syntax: '/add relationship "component id/title" "target id/title" "type" @project',
    description: 'Add a relationship between two components',
    examples: [
      '/add relationship "Login" "Auth Service" uses @myproject',
      '/add relationship 1 2 implements',
      '/relationship add "Header" "Footer" contains'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.VIEW_RELATIONSHIPS]: {
    type: CommandType.VIEW_RELATIONSHIPS,
    syntax: '/view relationships "component id/title" @project',
    description: 'View all relationships for a component',
    examples: [
      '/view relationships "Login" @myproject',
      '/relationships 1',
      '/list relationships "Auth Service"'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.EDIT_RELATIONSHIP]: {
    type: CommandType.EDIT_RELATIONSHIP,
    syntax: '/edit relationship "component id/title" "relationship id" "new type" @project',
    description: 'Edit an existing relationship',
    examples: [
      '/edit relationship "Login" 1 depends_on @myproject',
      '/edit-relationship 1 abc123 implements',
      '/edit relationship "Header" 2 contains'
    ],
    requiresProject: true,
    requiresArgs: true
  },
  [CommandType.DELETE_RELATIONSHIP]: {
    type: CommandType.DELETE_RELATIONSHIP,
    syntax: '/delete relationship "component id/title" "relationship id" @project',
    description: 'Delete a relationship (with confirmation)',
    examples: [
      '/delete relationship "Login" 1 @myproject',
      '/rm relationship 1 abc123',
      '/remove-relationship "Header" 2'
    ],
    requiresProject: true,
    requiresArgs: true
  },

  // Navigation & Workflow
  [CommandType.GOTO]: {
    type: CommandType.GOTO,
    syntax: '/goto "page" @project',
    description: 'Navigate to a specific page in the app',
    examples: [
      '/goto "notes" @myproject',
      '/goto "stack"',
      '/goto "deployment"',
      '/go "settings"',
      '/navigate "features" @myproject'
    ],
    requiresProject: false,
    requiresArgs: true
  },
  [CommandType.TODAY]: {
    type: CommandType.TODAY,
    syntax: '/today @project',
    description: 'View today\'s tasks and activity',
    examples: [
      '/today',
      '/today @myproject'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.WEEK]: {
    type: CommandType.WEEK,
    syntax: '/week @project',
    description: 'View weekly summary and upcoming tasks',
    examples: [
      '/week',
      '/week @myproject',
      '/weekly'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.STANDUP]: {
    type: CommandType.STANDUP,
    syntax: '/standup @project',
    description: 'Generate standup report (what I did yesterday, working on today, stuck on)',
    examples: [
      '/standup',
      '/standup @myproject',
      '/daily @myproject'
    ],
    requiresProject: false,
    requiresArgs: false
  },
  [CommandType.INFO]: {
    type: CommandType.INFO,
    syntax: '/info @project',
    description: 'Quick project overview and statistics',
    examples: [
      '/info',
      '/info @myproject',
      '/overview'
    ],
    requiresProject: false,
    requiresArgs: false
  },

  [CommandType.HELP]: {
    type: CommandType.HELP,
    syntax: '/help "command"',
    description: 'Show help for all commands or a specific command',
    examples: [
      '/help',
      '/help "add todo"',
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
        // Add escaped character literally
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        // Next character is escaped
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
        const flagValue = flagMatch[2] !== undefined ? flagMatch[2] : true;
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

    // Extract remaining tokens as arguments
    const remainingTokens = tokens.slice(commandLength);
    result.args = remainingTokens;

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
