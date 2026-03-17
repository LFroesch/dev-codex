import { BaseCommandHandler } from './BaseCommandHandler';
import { CommandResponse, ResponseType } from '../types';
import { ParsedCommand, CommandParser, COMMAND_METADATA, CommandType, hasFlag, getFlag } from '../commandParser';
import { User } from '../../models/User';
import { Project } from '../../models/Project';
import ActivityLog from '../../models/ActivityLog';
import { logError } from '../../config/logger';
import NotificationService from '../notificationService';
import { NewsPost } from '../../models/NewsPost';
import { calculateTextMetrics } from '../../utils/textMetrics';
import staleItemService from '../staleItemService';
import { AIContextBuilder } from '../AIContextBuilder';

/**
 * Handlers for utility commands (help, themes, swap, export, news, wizards)
 */
export class UtilityHandlers extends BaseCommandHandler {
  /**
   * Handle /help command
   */
  handleHelp(parsed: ParsedCommand): CommandResponse {
    if (parsed.args.length > 0) {
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
      '1. ⚡ Getting Started': [],
      '2. 📋 Tasks & Todos': [],
      '3. 📝 Notes & Dev Log': [],
      '4. 🧩 Features': [],
      '5. 📦 Tech Stack': [],
      '6. 📊 Project Insights': [],
      '7. 👥 Team & Deployment': [],
      '8. ⚙️ Project Management': [],
      '9. 🔔 System & Preferences': []
    };

    // Add syntax tips to Getting Started section
    grouped['1. ⚡ Getting Started'] = [
      {
        type: 'syntax_tip',
        syntax: '🧠 Built-in AI',
        description: 'Just type naturally — no slash needed. The AI reads your project context and proposes actions you can confirm with one click.',
        examples: [
          '"finished the auth page, used JWT tokens" → AI proposes devlog + todo updates',
          '"what should I work on next?" → AI analyzes your todos and suggests priorities',
          '"break down the payment feature into tasks" → AI creates todo list',
          'Follow-up: type again to continue the conversation (session persists until /clear)'
        ]
      },
      {
        type: 'syntax_tip',
        syntax: '📖 Slash Commands',
        description: 'Type / to use 50+ direct commands with autocomplete (e.g., /help, /add todo, /view notes). Power-user shortcuts.',
        examples: []
      },
      {
        type: 'syntax_tip',
        syntax: '🤖 Use With External AI (Claude, ChatGPT, Cursor)',
        description: 'Export your project to use with your own AI tools. /bridge gives the command spec, /context gives your project data.',
        examples: [
          '/bridge - Command reference for AI tools (paste into CLAUDE.md / .cursorrules)',
          '/context - Current project state (todos, features, stack, devlog)',
          '/context full - Full project dump (no truncation)',
          '/bridge + /context → paste both into AI → get commands back → paste here'
        ]
      },
      {
        type: 'syntax_tip',
        syntax: '🔗 Batch Commands',
        description: 'Chain commands with && or newlines (max 10 per batch). Execution stops on first error. Newlines are easier to read/edit.',
        examples: [
          '/add todo task 1 && /add todo task 2 && /add note architecture',
          '/add todo implement feature && /add note architecture decisions',
          '/add stack React && /view stack'
        ]
      },
      {
        type: 'syntax_tip',
        syntax: '@ Project Mentions',
        description: 'Reference projects using @projectname. Works with spaces in project names.',
        examples: [
          '/add todo fix bug @project',
          '/swap @My Cool Project',
          '/view todos @project'
        ]
      },
      {
        type: 'syntax_tip',
        syntax: '-- Flags & Options',
        description: 'Use flags to modify command behavior (e.g., --category=api, --role=editor)',
        examples: [
          '/add stack React --category=framework --version=18.2.0',
          '/invite user@email.com --role=editor',
          '/set deployment --url=https://myapp.com --platform=vercel'
        ]
      },
      {
        type: 'syntax_tip',
        syntax: '🧙 Interactive Wizards',
        description: 'Many commands support interactive wizards. Trigger wizards by omitting arguments or IDs.',
        examples: [
          '/wizard new - Interactive project creation',
          '/add todo - Opens wizard to create todo with form fields',
          '/edit todo 1 - Opens wizard to edit todo #1 with subtask management',
          '/edit subtask 1 2 - Opens wizard to edit subtask',
          '/add note - Opens wizard for adding notes',
          '/delete todo 1 - Opens confirmation wizard before deleting'
        ]
      },
      {
        type: 'command',
        syntax: COMMAND_METADATA[CommandType.HELP].syntax,
        description: COMMAND_METADATA[CommandType.HELP].description,
        examples: COMMAND_METADATA[CommandType.HELP].examples
      }
    ];

    // Define sort order for commands within each group
    const sortOrder: Record<string, number> = {
      // Tasks & Todos - CRUD for todos, then actions, then CRUD for subtasks
      'add_todo': 1,
      'view_todos': 2,
      'edit_todo': 3,
      'delete_todo': 4,
      'complete_todo': 5,
      'assign_todo': 6,
      'add_subtask': 7,
      'view_subtasks': 8,
      'edit_subtask': 9,
      'delete_subtask': 10,

      // Notes & Dev Log - CRUD for notes, then CRUD for devlog
      'add_note': 1,
      'view_notes': 2,
      'edit_note': 3,
      'delete_note': 4,
      'add_devlog': 5,
      'view_devlog': 6,
      'edit_devlog': 7,
      'delete_devlog': 8,

      // Features - CRUD for features, then CRUD for relationships
      'add_feature': 1,
      'view_features': 2,
      'edit_feature': 3,
      'delete_feature': 4,
      'add_relationship': 5,
      'view_relationships': 6,
      'edit_relationship': 7,
      'delete_relationship': 8,

      // Tech Stack - add, view, remove
      'add_stack': 1,
      'view_stack': 2,
      'remove_stack': 3,

      // Project Insights - info first, time-based views, then summary/search
      'info': 1,
      'today': 2,
      'week': 3,
      'standup': 4,
      'summary': 5,
      'search': 6,

      // Team & Deployment - team first, then deployment, then public
      'view_team': 1,
      'invite_member': 2,
      'remove_member': 3,
      'view_deployment': 4,
      'set_deployment': 5,
      'view_public': 6,
      'set_public': 7,

      // Project Management - wizard, swap, view settings, update settings, tags, export
      'wizard_new': 1,
      'swap_project': 2,
      'view_settings': 3,
      'set_name': 4,
      'set_description': 5,
      'add_tag': 6,
      'remove_tag': 7,
      'export': 8,

      // System & Preferences - themes, notifications, navigation
      'view_themes': 1,
      'set_theme': 2,
      'view_notifications': 3,
      'clear_notifications': 4,
      'view_news': 5,
      'goto': 6,
      'llm_context': 7
    };

    commands.forEach(cmd => {
      const cmdType = cmd.type.toString();

      // Skip help - already added to Getting Started
      if (cmdType === 'help') {
        return;
      }

      // 2. Tasks & Todos
      if ([
        'add_todo',
        'view_todos',
        'edit_todo',
        'delete_todo',
        'complete_todo',
        'assign_todo',
        'add_subtask',
        'view_subtasks',
        'edit_subtask',
        'delete_subtask'
      ].includes(cmdType)) {
        grouped['2. 📋 Tasks & Todos'].push(cmd);
      }

      // 3. Notes & Dev Log
      else if ([
        'add_note',
        'view_notes',
        'edit_note',
        'delete_note',
        'add_devlog',
        'view_devlog',
        'edit_devlog',
        'delete_devlog'
      ].includes(cmdType)) {
        grouped['3. 📝 Notes & Dev Log'].push(cmd);
      }

      // 4. Features
      else if ([
        'add_feature',
        'view_features',
        'edit_feature',
        'delete_feature',
        'add_relationship',
        'view_relationships',
        'edit_relationship',
        'delete_relationship'
      ].includes(cmdType)) {
        grouped['4. 🧩 Features'].push(cmd);
      }

      // 5. Tech Stack
      else if ([
        'add_stack',
        'view_stack',
        'remove_stack'
      ].includes(cmdType)) {
        grouped['5. 📦 Tech Stack'].push(cmd);
      }

      // 6. Project Insights
      else if ([
        'info',
        'today',
        'week',
        'standup',
        'summary',
        'search'
      ].includes(cmdType)) {
        grouped['6. 📊 Project Insights'].push(cmd);
      }

      // 7. Team & Deployment
      else if ([
        'view_team',
        'invite_member',
        'remove_member',
        'view_deployment',
        'set_deployment',
        'view_public',
        'set_public'
      ].includes(cmdType)) {
        grouped['7. 👥 Team & Deployment'].push(cmd);
      }

      // 8. Project Management
      else if ([
        'wizard_new',
        'swap_project',
        'view_settings',
        'set_name',
        'set_description',
        'add_tag',
        'remove_tag',
        'export'
      ].includes(cmdType)) {
        grouped['8. ⚙️ Project Management'].push(cmd);
      }

      // 9. System & Preferences
      else if ([
        'set_theme',
        'view_themes',
        'view_notifications',
        'clear_notifications',
        'view_news',
        'goto',
        'llm_context'
      ].includes(cmdType)) {
        grouped['9. 🔔 System & Preferences'].push(cmd);
      }
    });

    // Sort commands within each group based on the defined order
    Object.keys(grouped).forEach(groupKey => {
      grouped[groupKey].sort((a, b) => {
        const aType = a.type?.toString() || '';
        const bType = b.type?.toString() || '';
        const aOrder = sortOrder[aType] || 999;
        const bOrder = sortOrder[bType] || 999;
        return aOrder - bOrder;
      });
    });

    return {
      type: ResponseType.INFO,
      message: '📚 Available Commands - 50+ commands to manage your projects',
      data: {
        grouped,
        tip: 'Use /help "command" for detailed help. Most add/edit commands support interactive wizards - just omit the arguments to trigger the wizard UI!'
      }
    };
  }

  /**
   * Handle /swap command
   */
  async handleSwapProject(parsed: ParsedCommand): Promise<CommandResponse> {
    if (!parsed.projectMention) {
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

    const project = await Project.findOne({
      $or: [
        { userId: this.userId },
        { ownerId: this.userId }
      ],
      name: new RegExp(`^${parsed.projectMention}$`, 'i')
    });

    if (!project) {
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
   * Legacy handleSummary - now delegates to handleContext. Kept for test compatibility.
   */
  async handleSummary(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    return this.handleContext(parsed, currentProjectId);
  }

  // NOTE: Old handleExport (JSON URL), handleSummary (multi-format), generateProjectSummary,
  // generateFilteredSummary, generateProjectsAndIdeasSummary were removed.
  // /export and /summary are now aliases for /context (always .md output).
  // JSON export/import remains on SettingsPage via /api/projects/:id/export route.

  /**
   * Handle /view news command
   */
  async handleViewNews(): Promise<CommandResponse> {
    try {
      const newsPosts = await NewsPost.find({ isPublished: true })
        .sort({ publishedAt: -1 })
        .limit(10)
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
        },
        metadata: {
          action: 'view_news'
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
  async handleSetTheme(parsed: ParsedCommand): Promise<CommandResponse> {
    const themeName = parsed.args[0];

    if (!themeName) {
      return {
        type: ResponseType.ERROR,
        message: 'Theme name is required',
        suggestions: ['/set theme dark', '/view themes']
      };
    }

    const validThemes = [
      'dim', 'light', 'dark', 'cupcake', 'bumblebee', 'emerald',
      'retro', 'cyberpunk', 'synthwave', 'forest', 'aqua', 'lofi',
      'pastel', 'fantasy', 'wireframe', 'black', 'luxury', 'dracula',
      'cmyk', 'autumn', 'business', 'acid', 'lemonade', 'night',
      'coffee', 'winter', 'nord', 'sunset'
    ];

    const isCustomTheme = themeName.startsWith('custom-');

    if (!validThemes.includes(themeName.toLowerCase()) && !isCustomTheme) {
      return {
        type: ResponseType.ERROR,
        message: `Theme "${themeName}" not found`,
        suggestions: ['/view themes', '/set theme dark']
      };
    }

    try {
      const user = await User.findById(this.userId);
      if (!user) {
        return {
          type: ResponseType.ERROR,
          message: 'User not found'
        };
      }

      if (isCustomTheme) {
        const customThemeId = themeName.replace('custom-', '');
        const customThemeExists = user.customThemes?.some((ct: any) => ct.id === customThemeId);

        if (!customThemeExists) {
          return {
            type: ResponseType.ERROR,
            message: `Custom theme "${themeName}" not found`,
            suggestions: ['/view themes']
          };
        }
      }

      user.theme = themeName.toLowerCase() as any;
      await user.save();

      return {
        type: ResponseType.SUCCESS,
        message: `🎨 Theme changed to ${themeName}`,
        data: {
          theme: themeName.toLowerCase()
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
  async handleViewThemes(): Promise<CommandResponse> {
    const themes = [
      { name: 'dim', description: 'Dim gray theme', colors: { primary: '#9333ea', secondary: '#f000b8', accent: '#1dcdbc' } },
      { name: 'light', description: 'Light theme', colors: { primary: '#570df8', secondary: '#f000b8', accent: '#37cdbe' } },
      { name: 'dark', description: 'Dark theme', colors: { primary: '#661ae6', secondary: '#d926aa', accent: '#1fb2a6' } },
      { name: 'cupcake', description: 'Sweet pink theme', colors: { primary: '#65c3c8', secondary: '#ef9fbc', accent: '#eeaf3a' } },
      { name: 'bumblebee', description: 'Yellow and black', colors: { primary: '#f9d72f', secondary: '#df7e07', accent: '#181830' } },
      { name: 'emerald', description: 'Green theme', colors: { primary: '#66cc8a', secondary: '#377cfb', accent: '#ea5234' } },
      { name: 'retro', description: 'Vintage style', colors: { primary: '#ef9995', secondary: '#a4cbb4', accent: '#ebdc99' } },
      { name: 'cyberpunk', description: 'Futuristic neon', colors: { primary: '#ff7598', secondary: '#75d1f0', accent: '#c7f500' } },
      { name: 'synthwave', description: 'Retrowave style', colors: { primary: '#e779c1', secondary: '#58c7f3', accent: '#f3cc30' } },
      { name: 'forest', description: 'Nature green', colors: { primary: '#1eb854', secondary: '#1fd65f', accent: '#1db88e' } },
      { name: 'aqua', description: 'Ocean blue', colors: { primary: '#09ecf3', secondary: '#966fb3', accent: '#fbb8b5' } },
      { name: 'lofi', description: 'Calm and minimal', colors: { primary: '#0d0d0d', secondary: '#1a1919', accent: '#262626' } },
      { name: 'pastel', description: 'Soft colors', colors: { primary: '#d1c1d7', secondary: '#f6cbd1', accent: '#b4e9d6' } },
      { name: 'fantasy', description: 'Purple fantasy', colors: { primary: '#6e0b75', secondary: '#007ebd', accent: '#f57e20' } },
      { name: 'wireframe', description: 'Minimal lines', colors: { primary: '#b8b8b8', secondary: '#b8b8b8', accent: '#b8b8b8' } },
      { name: 'black', description: 'Pure black', colors: { primary: '#343232', secondary: '#343232', accent: '#343232' } },
      { name: 'luxury', description: 'Gold and black', colors: { primary: '#ffffff', secondary: '#152747', accent: '#513448' } },
      { name: 'dracula', description: 'Dracula purple', colors: { primary: '#ff79c6', secondary: '#bd93f9', accent: '#ffb86c' } },
      { name: 'cmyk', description: 'Print colors', colors: { primary: '#45AEEE', secondary: '#E8488A', accent: '#FFF232' } },
      { name: 'autumn', description: 'Fall colors', colors: { primary: '#8C0327', secondary: '#D85251', accent: '#D59B6A' } },
      { name: 'business', description: 'Professional blue', colors: { primary: '#1C4E80', secondary: '#7C909A', accent: '#EA6947' } },
      { name: 'acid', description: 'Bright lime', colors: { primary: '#FF00F4', secondary: '#FF7400', accent: '#CBFD03' } },
      { name: 'lemonade', description: 'Lemon yellow', colors: { primary: '#519903', secondary: '#E9E92E', accent: '#F7A300' } },
      { name: 'night', description: 'Deep night blue', colors: { primary: '#38bdf8', secondary: '#818cf8', accent: '#f471b5' } },
      { name: 'coffee', description: 'Brown coffee', colors: { primary: '#DB924B', secondary: '#6F4C3E', accent: '#263E3F' } },
      { name: 'winter', description: 'Cool winter', colors: { primary: '#047AFF', secondary: '#463AA2', accent: '#C148AC' } },
      { name: 'nord', description: 'Nordic theme', colors: { primary: '#5E81AC', secondary: '#81A1C1', accent: '#88C0D0' } },
      { name: 'sunset', description: 'Sunset orange', colors: { primary: '#FF865B', secondary: '#FD6585', accent: '#FFFB8D' } }
    ];

    try {
      const user = await User.findById(this.userId).select('customThemes');
      const customThemes = user?.customThemes || [];

      return {
        type: ResponseType.DATA,
        message: '🎨 Available themes',
        data: {
          themes: themes.map(t => ({
            name: t.name,
            description: t.description,
            type: 'preset',
            colors: t.colors
          })),
          customThemes: customThemes.map((ct: any) => ({
            name: `custom-${ct.id}`,
            displayName: ct.name,
            description: 'Custom theme',
            type: 'custom',
            colors: ct.colors
          }))
        },
        suggestions: ['/set theme dark', '/set theme light']
      };
    } catch (error) {
      logError('Error fetching custom themes', error as Error);
      return {
        type: ResponseType.DATA,
        message: '🎨 Available themes',
        data: {
          themes: themes.map(t => ({
            name: t.name,
            description: t.description,
            type: 'preset',
            colors: t.colors
          })),
          customThemes: []
        },
        suggestions: ['/set theme dark', '/set theme light']
      };
    }
  }

  /**
   * Handle /view notifications command
   */
  async handleViewNotifications(parsed: ParsedCommand): Promise<CommandResponse> {
    try {
      const notificationService = NotificationService.getInstance();
      const unreadOnly = hasFlag(parsed.flags, 'unread');

      const result = await notificationService.getNotifications(this.userId, {
        limit: 50,
        skip: 0,
        unreadOnly
      });

      if (result.notifications.length === 0) {
        return {
          type: ResponseType.INFO,
          message: unreadOnly ? '🔔 No unread notifications' : '🔔 No notifications',
          data: {
            notifications: [],
            unreadCount: 0,
            total: 0
          }
        };
      }

      return {
        type: ResponseType.DATA,
        message: `🔔 ${unreadOnly ? 'Unread notifications' : 'Notifications'} (${result.notifications.length} shown, ${result.unreadCount} unread)`,
        data: {
          notifications: result.notifications.map((notif: any) => ({
            id: notif._id.toString(),
            type: notif.type,
            title: notif.title,
            message: notif.message,
            isRead: notif.isRead,
            actionUrl: notif.actionUrl,
            relatedProject: notif.relatedProjectId ? {
              id: notif.relatedProjectId._id?.toString(),
              name: notif.relatedProjectId.name,
              color: notif.relatedProjectId.color
            } : null,
            relatedUser: notif.relatedUserId ? {
              id: notif.relatedUserId._id?.toString(),
              firstName: notif.relatedUserId.firstName,
              lastName: notif.relatedUserId.lastName
            } : null,
            createdAt: notif.createdAt
          })),
          unreadCount: result.unreadCount,
          total: result.total
        },
        suggestions: ['/clear notifications']
      };
    } catch (error) {
      logError('Error fetching notifications', error as Error);
      return {
        type: ResponseType.ERROR,
        message: 'Unable to fetch notifications at this time'
      };
    }
  }

  /**
   * Handle /clear notifications command
   */
  async handleClearNotifications(): Promise<CommandResponse> {
    try {
      const notificationService = NotificationService.getInstance();
      const deletedCount = await notificationService.clearAllNotifications(this.userId);

      if (deletedCount === 0) {
        return {
          type: ResponseType.INFO,
          message: '🔔 No notifications to clear'
        };
      }

      return {
        type: ResponseType.SUCCESS,
        message: `✅ Cleared ${deletedCount} notification${deletedCount !== 1 ? 's' : ''}`
      };
    } catch (error) {
      logError('Error clearing notifications', error as Error);
      return {
        type: ResponseType.ERROR,
        message: 'Unable to clear notifications at this time'
      };
    }
  }

  /**
   * Handle /stale command - View stale items (notes/todos without activity)
   */
  async handleStaleItems(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    try {
      const summary = await staleItemService.findStaleItems(this.userId.toString());

      // Determine which project to filter by (only from explicit @project mention)
      let targetProjectId: string | undefined;
      let projectName: string | undefined;

      if (parsed.projectMention) {
        // Look up project by name from the mention
        const project = await Project.findOne({
          $or: [
            { ownerId: this.userId },
            { 'teamMembers.userId': this.userId }
          ],
          name: { $regex: new RegExp(`^${parsed.projectMention}$`, 'i') }
        }).lean();

        if (project) {
          targetProjectId = project._id.toString();
          projectName = project.name;
        } else {
          return {
            type: ResponseType.ERROR,
            message: `Project "${parsed.projectMention}" not found`
          };
        }
      }
      // Default to all projects unless explicitly mentioned

      // Filter by project if specified
      let filteredNotes = summary.staleNotes;
      let filteredTodos = summary.staleTodos;

      if (targetProjectId) {
        filteredNotes = summary.staleNotes.filter(n => n.projectId === targetProjectId);
        filteredTodos = summary.staleTodos.filter(t => t.projectId === targetProjectId);

        // Get project name from the filtered items if not already set
        if (!projectName) {
          projectName = filteredNotes[0]?.projectName || filteredTodos[0]?.projectName;
        }
      }

      const totalCount = filteredNotes.length + filteredTodos.length;

      if (totalCount === 0) {
        const msg = targetProjectId
          ? `✨ No stale items found in ${projectName || 'this project'}! All notes and todos are up to date.`
          : '✨ No stale items found! All your notes and todos are up to date.';

        return {
          type: ResponseType.INFO,
          message: msg,
          data: {
            staleNotes: [],
            staleTodos: [],
            totalCount: 0
          },
          suggestions: ['/view notes', '/view todos']
        };
      }

      // Group by project for better organization
      const notesByProject: Record<string, typeof summary.staleNotes> = {};
      const todosByProject: Record<string, typeof summary.staleTodos> = {};

      filteredNotes.forEach(note => {
        if (!notesByProject[note.projectId]) {
          notesByProject[note.projectId] = [];
        }
        notesByProject[note.projectId].push(note);
      });

      filteredTodos.forEach(todo => {
        if (!todosByProject[todo.projectId]) {
          todosByProject[todo.projectId] = [];
        }
        todosByProject[todo.projectId].push(todo);
      });

      const noteText = filteredNotes.length === 1 ? 'note' : 'notes';
      const todoText = filteredTodos.length === 1 ? 'todo' : 'todos';

      let message = targetProjectId
        ? `⏰ Stale Items in ${projectName}\n\n`
        : '⏰ Stale Items Found\n\n';

      if (filteredNotes.length > 0 && filteredTodos.length > 0) {
        message += `${filteredNotes.length} ${noteText} (14+ days) and ${filteredTodos.length} ${todoText} (7+ days) need attention`;
      } else if (filteredNotes.length > 0) {
        message += `${filteredNotes.length} ${noteText} haven't been updated in 14+ days`;
      } else {
        message += `${filteredTodos.length} ${todoText} haven't been updated in 7+ days`;
      }

      return {
        type: ResponseType.DATA,
        message,
        data: {
          staleNotes: filteredNotes,
          staleTodos: filteredTodos,
          notesByProject,
          todosByProject,
          totalCount
        },
        suggestions: ['/view notes', '/view todos']
      };
    } catch (error) {
      logError('Error fetching stale items', error as Error);
      return {
        type: ResponseType.ERROR,
        message: 'Unable to fetch stale items at this time'
      };
    }
  }

  /**
   * Handle /activitylog command - View recent activity logs
   */
  async handleActivityLog(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    try {
      // Determine which project to filter by (from @project mention or current project)
      let targetProjectId: string | undefined;
      let projectName: string | undefined;

      if (parsed.projectMention) {
        // Look up project by name from the mention
        const project = await Project.findOne({
          $or: [
            { ownerId: this.userId },
            { 'teamMembers.userId': this.userId }
          ],
          name: { $regex: new RegExp(`^${parsed.projectMention}$`, 'i') }
        }).lean();

        if (project) {
          targetProjectId = project._id.toString();
          projectName = project.name;
        } else {
          return {
            type: ResponseType.ERROR,
            message: `Project "${parsed.projectMention}" not found`
          };
        }
      } else if (currentProjectId) {
        targetProjectId = currentProjectId;
      }

      // Build query
      const query: any = {};

      if (targetProjectId) {
        // Filter by specific project
        query.projectId = targetProjectId;
      } else {
        // Show user's recent activity across all their projects
        const userProjects = await Project.find({
          $or: [
            { ownerId: this.userId },
            { 'teamMembers.userId': this.userId }
          ]
        }).select('_id name').lean();

        const projectIds = userProjects.map(p => p._id.toString());
        query.projectId = { $in: projectIds };
      }

      // Fetch recent activity logs (limit to 50 for performance)
      const logs = await ActivityLog.find(query)
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();

      if (logs.length === 0) {
        const msg = targetProjectId
          ? `📊 No activity found for project "${projectName}"`
          : '📊 No recent activity found';

        return {
          type: ResponseType.INFO,
          message: msg
        };
      }

      // Get project names for all logs
      const projectIds = [...new Set(logs.map(log => log.projectId))];
      const projects = await Project.find({
        _id: { $in: projectIds }
      }).select('_id name').lean();

      const projectMap: Record<string, string> = {};
      projects.forEach(p => {
        projectMap[p._id.toString()] = p.name;
      });

      // Get user names for all logs
      const userIds = [...new Set(logs.map(log => log.userId))];
      const users = await User.find({
        _id: { $in: userIds }
      }).select('_id firstName lastName').lean();

      const userMap: Record<string, string> = {};
      users.forEach(u => {
        userMap[u._id.toString()] = `${u.firstName} ${u.lastName}`;
      });

      // Format the activity log as structured data for clean rendering
      const header = targetProjectId
        ? `📊 Activity Log for "${projectName}" (${logs.length} entries)`
        : `📊 Recent Activity (${logs.length} entries)`;

      const activityEntries = logs.slice(0, 20).map((log, idx) => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const userName = userMap[log.userId.toString()] || 'Unknown User';
        const projName = projectMap[log.projectId.toString()] || 'Unknown Project';
        const resourceName = log.details?.resourceName || 'unnamed';
        const projectInfo = !targetProjectId ? ` (@${projName})` : '';

        return {
          timestamp,
          user: userName,
          action: log.action,
          resourceType: log.resourceType,
          resourceName,
          project: !targetProjectId ? projName : undefined
        };
      });

      return {
        type: ResponseType.DATA,
        message: header,
        data: {
          activityEntries,
          hasMore: logs.length > 20,
          remainingCount: logs.length > 20 ? logs.length - 20 : 0
        }
      };
    } catch (error) {
      logError('Error fetching activity log', error as Error);
      return {
        type: ResponseType.ERROR,
        message: 'Unable to fetch activity log at this time'
      };
    }
  }

  private generateGeneralLLMGuide(): string {
    return `## Your Role

Generate valid Dev Codex terminal commands. The user will paste project context — use it to reference existing items by name or # index.

## Syntax Rules

- Format: \`/command "args" @project --flag="value"\`
- Batch: chain with \`&&\` or newlines (max 10, stops on first error)
- Quotes: required for multi-word args
- Newlines in content: use \`\\n\`
- Item matching: UUID > Index (1-based) > Partial text match

## Command Reference

### Project Management
\`/add project --name="..." [--description="..." --category="..." --color="#HEXCODE"]\`
\`/view projects\` - List all projects
\`/edit project --name="..." --description="..."\` (uses current project)
\`/delete project @projectname\` - Delete a project
\`/add idea --title="..." --content="..." [--description="..."]\`
\`/view ideas\` - List all ideas
\`/edit idea "idx|text" [...flags]\`
\`/delete idea "idx|text"\`
\`/swap @project\` - Switch to different project context
\`/goto /path\` - Navigate to a specific page (e.g., /goto /notes, /goto /features)
\`/wizard new\` - Interactive project creation wizard
\`/context projects\` - List all projects and ideas as .md

### Tasks & Todos
\`/add todo --title="..." [--content="..." --priority=low|medium|high --status=not_started|in_progress|blocked|completed --due="MM-DD-YYYY HH:MM"]\`
\`/view todos\` - List all todos for current project
\`/edit todo "idx|text" [...flags]\`
\`/delete todo "idx|text"\`
\`/complete "idx|text"\` - Mark todo as completed
\`/assign "idx|text" "email"\` - Assign todo to team member
\`/push "idx|text"\` - Push todo to devlog
\`/add subtask --parent="idx|text" --title="..."\`
\`/view subtasks "parent_idx"\` - View subtasks for a todo
\`/edit subtask parent_idx subtask_idx\`
\`/delete subtask parent_idx subtask_idx\`

### Notes & Dev Log
\`/add note --title="..." --content="..."\`
\`/view notes\` - List all notes
\`/edit note "idx|text"\`
\`/delete note "idx|text"\`
**Note:** Notes support full Markdown formatting (headers, lists, code blocks, links, etc.)
\`/add devlog --title="..." --content="..."\`
\`/view devlog\` - List dev log entries
\`/edit devlog "idx|text"\`
\`/delete devlog "idx|text"\`

### Features & Architecture
\`/add feature --group="..." --category="..." --type="..." --title="..." --content="..."\`
\`/view features\` - List all features
\`/edit feature "idx|text"\`
\`/delete feature "idx|text"\`
\`/add relationship --source="..." --target="..." --type=uses|depends_on\`
\`/view relationships\` - View feature relationships
\`/edit relationship "idx"\`
\`/delete relationship "idx"\`

**Feature types by category:**
frontend: page|component|hook|context|layout|util|custom
backend: service|route|model|controller|middleware|util|custom
database: schema|migration|seed|query|index|custom
infrastructure: deployment|cicd|env|config|monitoring|docker|custom
security: auth|authz|encryption|validation|sanitization|custom
api: client|integration|webhook|contract|graphql|custom
documentation: area|section|guide|architecture|api-doc|readme|changelog|custom
asset: image|font|video|audio|document|dependency|custom

### Tech Stack
\`/add stack --name="..." --category=framework|runtime|database|styling|deployment|testing|tooling|ui|state|routing|forms|animation|api|auth|data|utility [--version="..." --description="..."]\`
\`/view stack\` - List tech stack
\`/remove stack "name"\`

### Insights & Reports
\`/info\` - Project overview with stats
\`/today\` - Today's tasks and activity
\`/week\` - Weekly summary and upcoming tasks
\`/standup\` - Standup report (yesterday/today/blockers)
\`/search "query"\` - Search across project
\`/stale\` - View stale items (todos, notes that haven't been updated)
\`/activity\` - View activity log for current project
\`/context [entity]\` - Export project as .md (aliases: /export, /summary). Entities: all|full|todos|notes|devlog|features|stack|team|deployment|settings|projects

### Team & Deployment
\`/invite "email" --role=editor|viewer\`
\`/view team\` - List team members
\`/remove member "email"\`
\`/set deployment --url="..." --platform="..." --status=active|inactive|error\`
\`/view deployment\` - View deployment settings
\`/set public --enabled=true|false --slug="..."\`
\`/view public\` - View public sharing settings

### Project Settings
\`/set name "..."\` - Update project name
\`/set description "..."\` - Update project description
\`/add tag "..."\` - Add a tag to the project
\`/remove tag "..."\` - Remove a tag from the project
\`/view settings\` - View all project settings
\`/export\` - Alias for /context (export project as .md)

### Notifications & Themes
\`/view notifications\` - View recent notifications
\`/clear notifications\` - Clear all notifications
\`/view news\` - View latest news and updates
\`/view themes\` - View available themes
\`/set theme "theme_name"\` - Change theme

## Key Rules
**MUST:** Features need \`--group\` flag | Dates: "MM-DD-YYYY HH:MM" | Priorities: low/medium/high | Max 10 batch commands
**ALWAYS:** Use \`/context\` commands before edit/delete | Validate item existence | Use quotes for multi-word args | Prefer newlines over \`&&\`
**DATA SIZE:** \`/context\` includes FULL content (no truncation). For large projects, use entity filtering: \`/context todos\` or \`/context notes\` instead of \`/context\`
**TIPS:** Start with \`/context projects\` to see all projects → get details with \`/context\` (or specific entity) → generate commands → ask clarifying questions if uncertain`;
  }

  /**
   * Handle /bridge command — generates protocol spec for external AI tools
   */
  async handleBridge(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const guide = this.generateGeneralLLMGuide();
    const output = `# Dev Codex — Command Reference

> Paste this file into your AI tool's project config (CLAUDE.md, .cursorrules, etc.)
> so it can generate valid Dev Codex terminal commands.

## How To Use

1. Paste this file into your AI config (e.g. \`CLAUDE.md\`)
2. Run \`/context\` in Dev Codex → paste the output into your AI conversation
3. Ask the AI to generate commands → paste them back into the Dev Codex terminal

## Getting Project Context

Run these in the Dev Codex terminal, then paste the output to your AI:

| Command | What it exports |
|---------|----------------|
| \`/context\` | Current project state as .md (todos, features, stack, devlog) |
| \`/context full\` | Full project dump, no truncation |
| \`/context projects\` | List all projects and ideas |

---

${guide}`;

    const metrics = calculateTextMetrics(output);

    return {
      type: ResponseType.DATA,
      message: '🔗 Dev Codex Bridge Protocol — Command reference for external AI tools',
      data: {
        summary: output,
        format: 'text',
        fileName: 'dev-codex-bridge.md',
        projectName: 'Bridge Protocol',
        downloadable: true,
        textMetrics: metrics
      },
      metadata: {
        action: 'bridge'
      }
    };
  }

  /**
   * Handle /context command — outputs dynamic project state
   */
  async handleContext(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    // "projects" entity doesn't need a selected project
    const entity = (parsed.args[0] || parsed.subcommand || '').toLowerCase();

    if (entity === 'projects') {
      return this.handleContextProjects();
    }

    if (!currentProjectId) {
      const projects = await this.getUserProjects();
      return {
        type: ResponseType.PROMPT,
        message: 'Select a project first:',
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

    const validEntities = ['', 'all', 'full', 'todos', 'notes', 'devlog', 'features', 'components', 'stack', 'team', 'deployment', 'settings'];
    const entityAliases: Record<string, string> = {
      'todo': 'todos', 'note': 'notes', 'devlogs': 'devlog',
      'feature': 'features', 'deploy': 'deployment', 'setting': 'settings',
    };
    const normalized = entityAliases[entity] || entity;

    if (normalized && !validEntities.includes(normalized)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid entity "${entity}". Available: all, full, todos, notes, devlog, features, stack, team, deployment, settings, projects`,
        suggestions: ['/context todos', '/context full']
      };
    }

    try {
      // Always use buildFull for /context — it's user-facing markdown.
      // build() is for AI system prompts (compact, no markdown formatting).
      const rawContext = await AIContextBuilder.buildFull(this.userId, currentProjectId, normalized || undefined);

      const entityLabel = normalized && normalized !== 'all' && normalized !== 'full' ? normalized : 'Full';
      const contextText = `# Dev Codex — Project Context\n\n> Exported ${new Date().toLocaleDateString()}. Paste this into your AI conversation alongside the bridge protocol (\`/bridge\`).\n\n${rawContext}`;

      const metrics = calculateTextMetrics(contextText);

      return {
        type: ResponseType.DATA,
        message: `📋 Project Context (${entityLabel})`,
        data: {
          summary: contextText,
          format: 'text',
          fileName: `project-context-${entityLabel.toLowerCase()}.md`,
          projectName: 'Project Context',
          downloadable: true,
          textMetrics: metrics
        },
        metadata: {
          action: 'context',
          projectId: currentProjectId
        }
      };
    } catch (error) {
      logError('Context generation failed', error as Error, {
        userId: this.userId,
        projectId: currentProjectId
      });
      return {
        type: ResponseType.ERROR,
        message: 'Failed to generate project context',
        data: { error: (error as Error).message }
      };
    }
  }

  /**
   * Handle /context projects — list all user projects (no project selection needed)
   */
  private async handleContextProjects(): Promise<CommandResponse> {
    try {
      const projects = await Project.find(
        { $or: [{ userId: this.userId }, { ownerId: this.userId }] },
        'name description category tags'
      ).lean().limit(50);

      const sections: string[] = ['## All Projects'];
      if (projects.length === 0) {
        sections.push('No projects found.');
      } else {
        projects.forEach((p: any, i: number) => {
          sections.push(`#${i + 1} "${p.name}"${p.category ? ` (${p.category})` : ''}${p.description ? ` — ${p.description}` : ''}`);
        });
      }

      const contextText = `# Dev Codex — Project Context\n\n> Exported ${new Date().toLocaleDateString()}.\n\n${sections.join('\n')}`;
      const metrics = calculateTextMetrics(contextText);

      return {
        type: ResponseType.DATA,
        message: `📋 All Projects (${projects.length})`,
        data: {
          summary: contextText,
          format: 'text',
          fileName: 'project-context-projects.md',
          projectName: 'All Projects',
          downloadable: true,
          textMetrics: metrics
        },
        metadata: { action: 'context' }
      };
    } catch (error) {
      logError('Context projects failed', error as Error, { userId: this.userId });
      return {
        type: ResponseType.ERROR,
        message: 'Failed to list projects',
        data: { error: (error as Error).message }
      };
    }
  }

  /**
   * Handle /usage command — show AI token usage stats
   */
  async handleAIUsage(): Promise<CommandResponse> {
    try {
      const user = await User.findById(this.userId).select('planTier aiUsage').lean();
      if (!user) {
        return { type: ResponseType.ERROR, message: 'User not found' };
      }

      const tier = user.planTier || 'free';
      const usage = user.aiUsage || { tokensUsedThisMonth: 0, queryCount: 0, lastResetDate: new Date() };
      const isSelfHosted = process.env.SELF_HOSTED === 'true';

      const tierLimits: Record<string, { tokens: number; queriesPerMin: number; inputChars: number }> = {
        free: { tokens: 0, queriesPerMin: 0, inputChars: 0 },
        pro: { tokens: 500_000, queriesPerMin: 15, inputChars: 5_000 },
        premium: { tokens: 2_000_000, queriesPerMin: 30, inputChars: 10_000 }
      };

      const limits = tierLimits[tier] || tierLimits.free;
      const tokensUsed = usage.tokensUsedThisMonth || 0;
      const queryCount = usage.queryCount || 0;
      const lastReset = usage.lastResetDate ? new Date(usage.lastResetDate).toLocaleDateString() : 'N/A';
      const lastQuery = usage.lastQueryAt ? new Date(usage.lastQueryAt).toLocaleString() : 'Never';

      const pct = limits.tokens > 0 ? Math.round((tokensUsed / limits.tokens) * 100) : 0;

      return {
        type: ResponseType.DATA,
        message: `AI Usage — ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
        data: {
          usageData: {
            planTier: tier,
            tokensUsed,
            tokensLimit: isSelfHosted ? 'unlimited' : limits.tokens,
            queryCount,
            queriesPerMin: limits.queriesPerMin,
            inputCharsLimit: limits.inputChars,
            lastQuery,
            lastReset,
            isSelfHosted,
            usagePercent: isSelfHosted ? 0 : pct
          }
        },
        metadata: {
          action: 'ai-usage'
        }
      };
    } catch (error) {
      logError('AI usage check failed', error as Error, { userId: this.userId });
      return {
        type: ResponseType.ERROR,
        message: 'Failed to retrieve AI usage stats'
      };
    }
  }

  /**
   * Handle wizard commands
   */
  async handleWizard(parsed: ParsedCommand): Promise<CommandResponse> {
    switch (parsed.type) {
      case CommandType.WIZARD_NEW:
        return this.handleWizardNew(parsed);
      default:
        return {
          type: ResponseType.INFO,
          message: `🧙 ${parsed.command} wizard coming soon!`,
          suggestions: ['/help']
        };
    }
  }

  /**
   * Handle /wizard new command - Interactive project creation wizard
   */
  async handleWizardNew(parsed: ParsedCommand): Promise<CommandResponse> {
    try {
      const user = await User.findById(this.userId);
      if (!user) {
        return {
          type: ResponseType.ERROR,
          message: 'User not found'
        };
      }

      // Check project limit
      if (!user.isAdmin && user.projectLimit !== -1) {
        const currentProjectCount = await Project.countDocuments({ userId: this.userId });
        if (currentProjectCount >= user.projectLimit) {
          return {
            type: ResponseType.ERROR,
            message: `Project limit reached. Your ${user.planTier} plan allows ${user.projectLimit} projects.`,
            suggestions: ['Upgrade your plan', '/view projects']
          };
        }
      }

      return {
        type: ResponseType.PROMPT,
        message: '🧙 Project Creation Wizard',
        data: {
          wizardType: 'new_project',
          steps: [
            {
              id: 'name',
              type: 'text',
              label: 'Project Name',
              placeholder: 'Enter your project name...',
              required: true,
              description: 'Choose a descriptive name for your project'
            },
            {
              id: 'description',
              type: 'textarea',
              label: 'Description',
              placeholder: 'Describe your project...',
              required: true,
              description: 'Explain what your project is about'
            },
            {
              id: 'category',
              type: 'text',
              label: 'Category',
              placeholder: 'e.g., Web App, Mobile, API...',
              defaultValue: 'general',
              required: false,
            description: 'Categorize your project type'
          },
          {
            id: 'stagingEnvironment',
            type: 'select',
            label: 'Environment',
            options: [
              { value: 'development', label: 'Development' },
              { value: 'staging', label: 'Staging' },
              { value: 'production', label: 'Production' }
            ],
            defaultValue: 'development',
            required: false,
            description: 'Current staging environment'
          },
          {
            id: 'color',
            type: 'color',
            label: 'Project Color',
            defaultValue: '#3B82F6',
            required: false,
            description: 'Pick a color theme for your project (MUST be hex format like #3B82F6)'
          },
          {
            id: 'tags',
            type: 'tags',
            label: 'Tags',
            placeholder: 'Add tags...',
            defaultValue: [],
            required: false,
            description: 'Add relevant tags (press Enter to add each tag)'
          }
        ],
        submitEndpoint: '/api/projects',
        submitMethod: 'POST',
        successMessage: 'Project created successfully!',
        successRedirect: '/'
      }
    };
    } catch (error) {
      logError('Error starting wizard', error as Error, { userId: this.userId });
      return {
        type: ResponseType.ERROR,
        message: 'Failed to start project creation wizard'
      };
    }
  }

  /**
   * Handle /goto command - Navigate to different pages
   */
  async handleGoto(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const pageName = parsed.args[0]?.toLowerCase();

    if (!pageName) {
      return {
        type: ResponseType.ERROR,
        message: 'Page name is required',
        suggestions: ['/goto notes', '/goto stack', '/goto deployment']
      };
    }

    // Map of page names to routes
    const pageRoutes: Record<string, { path: string, needsProject: boolean, name: string }> = {
      'notes': { path: '/notes', needsProject: true, name: 'Notes' },
      'todos': { path: '/notes?section=todos', needsProject: true, name: 'Todos' },
      'devlog': { path: '/notes?section=devlog', needsProject: true, name: 'Dev Log' },
      'features': { path: '/features', needsProject: true, name: 'Features' },
      'stack': { path: '/stack', needsProject: true, name: 'Tech Stack' },
      'deployment': { path: '/deployment', needsProject: true, name: 'Deployment' },
      'settings': { path: '/settings', needsProject: true, name: 'Settings' },
      'sharing': { path: '/sharing', needsProject: true, name: 'Team & Sharing' },
      'public': { path: '/public', needsProject: true, name: 'Public Page' },
      'ideas': { path: '/ideas', needsProject: true, name: 'Ideas' },
      'terminal': { path: '/terminal', needsProject: false, name: 'Terminal' },
      'discover': { path: '/discover', needsProject: false, name: 'Discover' },
      'help': { path: '/help', needsProject: false, name: 'Help' },
      'news': { path: '/news', needsProject: false, name: 'News' },
      'account': { path: '/account-settings', needsProject: false, name: 'Account Settings' },
      'account-settings': { path: '/account-settings', needsProject: false, name: 'Account Settings' }
    };

    const route = pageRoutes[pageName];

    if (!route) {
      const suggestions = Object.keys(pageRoutes).slice(0, 5).map(p => `/goto ${p}`);
      return {
        type: ResponseType.ERROR,
        message: `Page "${pageName}" not found`,
        suggestions
      };
    }

    // If page needs a project, resolve it
    if (route.needsProject) {
      const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
      if (!resolution.project) {
        return this.buildProjectErrorResponse(resolution);
      }

      return {
        type: ResponseType.SUCCESS,
        message: `📍 Navigating to ${route.name}`,
        data: {
          redirect: route.path,
          page: pageName,
          pageName: route.name
        },
        metadata: {
          projectId: resolution.project._id.toString(),
          projectName: resolution.project.name,
          action: 'goto'
        }
      };
    }

    // Account-wide pages don't need project context
    return {
      type: ResponseType.SUCCESS,
      message: `📍 Navigating to ${route.name}`,
      data: {
        redirect: route.path,
        page: pageName,
        pageName: route.name
      },
      metadata: {
        action: 'goto'
      }
    };
  }

  /**
   * Handle /today command - Show today's tasks and activity
   */
  async handleToday(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const project = resolution.project;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get todos due today or overdue
    const todaysTodos = project.todos?.filter((todo: any) => {
      if (todo.completed) return false;
      if (!todo.dueDate) return false;
      const dueDate = new Date(todo.dueDate);
      return dueDate <= tomorrow;
    }) || [];

    // Sort by priority and due date
    const sortedTodos = todaysTodos.sort((a: any, b: any) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const overdue = sortedTodos.filter((t: any) => new Date(t.dueDate) < today);
    const dueToday = sortedTodos.filter((t: any) => {
      const due = new Date(t.dueDate);
      return due >= today && due < tomorrow;
    });

    // Get today's activity (devlog entries from today)
    const todaysDevLog = project.devLog?.filter((entry: any) => {
      const entryDate = new Date(entry.createdAt || entry.date);
      return entryDate >= today;
    }) || [];

    return {
      type: ResponseType.DATA,
      message: `📅 Today's overview for ${project.name}`,
      data: {
        date: today.toLocaleDateString(),
        overdue: overdue.map((t: any) => ({
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
          content: t.content
        })),
        dueToday: dueToday.map((t: any) => ({
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
          content: t.content
        })),
        activity: todaysDevLog.map((entry: any) => ({
          title: entry.title,
          content: entry.content,
          date: entry.date
        })),
        stats: {
          totalOverdue: overdue.length,
          totalDueToday: dueToday.length,
          totalActivity: todaysDevLog.length
        }
      },
      metadata: {
        projectId: project._id.toString(),
        projectName: project.name,
        action: 'today'
      }
    };
  }

  /**
   * Handle /week command - Weekly summary and planning
   */
  async handleWeek(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const project = resolution.project;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Get upcoming todos (due within the next 7 days)
    const upcomingTodos = project.todos?.filter((todo: any) => {
      if (todo.completed) return false;
      if (!todo.dueDate) return false;
      const dueDate = new Date(todo.dueDate);
      return dueDate >= today && dueDate < weekFromNow;
    }) || [];

    // Group by day
    const todosByDay: Record<string, any[]> = {};
    upcomingTodos.forEach((todo: any) => {
      const dueDate = new Date(todo.dueDate);
      const dayKey = dueDate.toLocaleDateString();
      if (!todosByDay[dayKey]) todosByDay[dayKey] = [];
      todosByDay[dayKey].push(todo);
    });

    // Get week's activity
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay()); // Start of week (Sunday)
    const weekActivity = project.devLog?.filter((entry: any) => {
      const entryDate = new Date(entry.createdAt || entry.date);
      return entryDate >= weekStart;
    }) || [];

    // Get completed todos this week
    const completedThisWeek = project.todos?.filter((todo: any) => {
      if (!todo.completed || !todo.completedAt) return false;
      const completedDate = new Date(todo.completedAt);
      return completedDate >= weekStart;
    }) || [];

    return {
      type: ResponseType.DATA,
      message: `📊 Weekly overview for ${project.name}`,
      data: {
        weekStart: weekStart.toLocaleDateString(),
        weekEnd: weekFromNow.toLocaleDateString(),
        upcomingTodos: todosByDay,
        completedThisWeek: completedThisWeek.map((t: any) => ({
          title: t.title,
          completedAt: t.completedAt
        })),
        activity: weekActivity.map((entry: any) => ({
          title: entry.title,
          date: entry.date
        })),
        stats: {
          totalUpcoming: upcomingTodos.length,
          totalCompleted: completedThisWeek.length,
          totalActivity: weekActivity.length
        }
      },
      metadata: {
        projectId: project._id.toString(),
        projectName: project.name,
        action: 'week'
      }
    };
  }

  /**
   * Handle /standup command - Generate standup report
   */
  async handleStandup(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const project = resolution.project;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // What I did yesterday (completed todos + devlog entries)
    const completedYesterday = project.todos?.filter((todo: any) => {
      if (!todo.completed || !todo.completedAt) return false;
      const completedDate = new Date(todo.completedAt);
      return completedDate >= yesterday && completedDate < today;
    }) || [];

    const yesterdayActivity = project.devLog?.filter((entry: any) => {
      const entryDate = new Date(entry.createdAt || entry.date);
      return entryDate >= yesterday && entryDate < today;
    }) || [];

    // What I'm working on today (todos due today or in progress)
    const todaysTasks = project.todos?.filter((todo: any) => {
      if (todo.completed) return false;
      if (!todo.dueDate) return false;
      const dueDate = new Date(todo.dueDate);
      return dueDate >= today && dueDate < tomorrow;
    }) || [];

    // Stuck on / Need help (high priority overdue tasks)
    const stuckTasks = project.todos?.filter((todo: any) => {
      if (todo.completed) return false;
      if (!todo.dueDate) return false;
      const dueDate = new Date(todo.dueDate);
      return dueDate < today && todo.priority === 'high';
    }) || [];

    return {
      type: ResponseType.DATA,
      message: `🗣️ Standup report for ${project.name}`,
      data: {
        date: today.toLocaleDateString(),
        yesterday: {
          completed: completedYesterday.map((t: any) => ({
            title: t.title,
            priority: t.priority
          })),
          activity: yesterdayActivity.map((entry: any) => ({
            title: entry.title,
            content: entry.content?.substring(0, 200)
          }))
        },
        today: {
          tasks: todaysTasks.map((t: any) => ({
            title: t.title,
            priority: t.priority,
            dueDate: t.dueDate
          }))
        },
        stuckOn: stuckTasks.map((t: any) => ({
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
          content: t.content
        })),
        stats: {
          completedYesterday: completedYesterday.length,
          activityYesterday: yesterdayActivity.length,
          tasksToday: todaysTasks.length,
          stuckOn: stuckTasks.length
        }
      },
      metadata: {
        projectId: project._id.toString(),
        projectName: project.name,
        action: 'standup'
      },
      suggestions: ['/view todos', '/add devlog']
    };
  }

  /**
   * Handle /info command - Quick project overview
   */
  async handleInfo(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);

    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const project = resolution.project;
    const todos = project.todos || [];
    const notes = project.notes || [];
    const devLog = project.devLog || [];
    const features = project.features || [];
    const tech = project.selectedTechnologies || [];
    const packages = project.selectedPackages || [];

    const completedTodos = todos.filter((t: any) => t.completed).length;
    const activeTodos = todos.filter((t: any) => !t.completed);
    const highPriorityTodos = activeTodos.filter((t: any) => t.priority === 'high').length;
    const overdueTodos = activeTodos.filter((t: any) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    const daysSinceCreated = Math.floor((Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const daysSinceUpdated = Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24));

    return {
      type: ResponseType.DATA,
      message: `ℹ️ Project overview: ${project.name}`,
      data: {
        basicInfo: {
          name: project.name,
          description: project.description,
          category: project.category,
          stagingEnvironment: project.stagingEnvironment,
          color: project.color,
          tags: project.tags || []
        },
        stats: {
          todos: {
            total: todos.length,
            completed: completedTodos,
            active: activeTodos.length,
            highPriority: highPriorityTodos,
            overdue: overdueTodos
          },
          notes: {
            total: notes.length
          },
          devLog: {
            total: devLog.length
          },
          features: {
            total: features.length
          },
          techStack: {
            total: tech.length + packages.length,
            technologies: tech.length,
            packages: packages.length
          }
        },
        timeline: {
          created: project.createdAt,
          updated: project.updatedAt,
          daysSinceCreated,
          daysSinceUpdated
        },
        team: {
          members: project.team?.length || 0,
          isPublic: project.publicPageData?.isPublic || false
        },
        deployment: {
          hasDeployment: !!project.deploymentData?.liveUrl,
          url: project.deploymentData?.liveUrl,
          platform: project.deploymentData?.deploymentPlatform
        }
      },
      metadata: {
        projectId: project._id.toString(),
        projectName: project.name,
        action: 'info'
      },
      suggestions: ['/view todos', '/view notes', '/view stack']
    };
  }

  /**
   * Handle /add idea command
   */
  async handleAddIdea(parsed: ParsedCommand): Promise<CommandResponse> {
    try {
      const user = await User.findById(this.userId);
      if (!user) {
        return {
          type: ResponseType.ERROR,
          message: 'User not found'
        };
      }

      const title = getFlag(parsed.flags, 'title') as string;
      const description = getFlag(parsed.flags, 'description') as string;
      const content = getFlag(parsed.flags, 'content') as string;

      if (!title || !content) {
        return {
          type: ResponseType.ERROR,
          message: 'Title and content are required',
          suggestions: ['/add idea --title="Title" --content="Content"']
        };
      }

      const newIdea = {
        id: Date.now().toString(),
        title: title.substring(0, 200),
        description: description ? description.substring(0, 500) : '',
        content: content.substring(0, 10000),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      user.ideas.push(newIdea);
      await user.save();

      return {
        type: ResponseType.SUCCESS,
        message: `💡 Idea "${title}" added successfully`,
        data: { idea: newIdea },
        suggestions: ['/view ideas']
      };
    } catch (error) {
      logError('Error adding idea', error as Error, { userId: this.userId });
      return {
        type: ResponseType.ERROR,
        message: 'Failed to add idea'
      };
    }
  }

  /**
   * Handle /view ideas command
   */
  async handleViewIdeas(parsed: ParsedCommand): Promise<CommandResponse> {
    try {
      const user = await User.findById(this.userId);
      if (!user) {
        return {
          type: ResponseType.ERROR,
          message: 'User not found'
        };
      }

      if (!user.ideas || user.ideas.length === 0) {
        return {
          type: ResponseType.INFO,
          message: '💡 No ideas yet',
          suggestions: ['/add idea --title="Title" --content="Content"']
        };
      }

      return {
        type: ResponseType.DATA,
        message: `💡 Your ideas (${user.ideas.length})`,
        data: {
          ideas: user.ideas.map((idea, index) => ({
            index: index + 1,
            id: idea.id,
            title: idea.title,
            description: idea.description,
            content: idea.content,
            createdAt: idea.createdAt,
            updatedAt: idea.updatedAt
          }))
        },
        suggestions: ['/add idea', '/edit idea [#]', '/delete idea [#]']
      };
    } catch (error) {
      logError('Error viewing ideas', error as Error, { userId: this.userId });
      return {
        type: ResponseType.ERROR,
        message: 'Failed to fetch ideas'
      };
    }
  }

  /**
   * Handle /edit idea command
   */
  async handleEditIdea(parsed: ParsedCommand): Promise<CommandResponse> {
    try {
      const user = await User.findById(this.userId);
      if (!user) {
        return {
          type: ResponseType.ERROR,
          message: 'User not found'
        };
      }

      const ideaIdentifier = parsed.args[0];
      if (!ideaIdentifier) {
        return {
          type: ResponseType.ERROR,
          message: 'Idea identifier required',
          suggestions: ['/edit idea [#]', '/edit idea "[idea id]"']
        };
      }

      let ideaIndex = -1;
      if (ideaIdentifier.match(/^\d+$/)) {
        ideaIndex = parseInt(ideaIdentifier, 10) - 1;
      } else {
        ideaIndex = user.ideas.findIndex(i => i.id === ideaIdentifier);
      }

      if (ideaIndex === -1 || ideaIndex >= user.ideas.length) {
        return {
          type: ResponseType.ERROR,
          message: 'Idea not found',
          suggestions: ['/view ideas']
        };
      }

      const idea = user.ideas[ideaIndex];
      const title = getFlag(parsed.flags, 'title') as string;
      const description = getFlag(parsed.flags, 'description') as string;
      const content = getFlag(parsed.flags, 'content') as string;

      if (title) idea.title = title.substring(0, 200);
      if (description !== undefined) idea.description = description.substring(0, 500);
      if (content) idea.content = content.substring(0, 10000);
      idea.updatedAt = new Date();

      await user.save();

      return {
        type: ResponseType.SUCCESS,
        message: `💡 Idea "${idea.title}" updated successfully`,
        data: { idea },
        suggestions: ['/view ideas']
      };
    } catch (error) {
      logError('Error editing idea', error as Error, { userId: this.userId });
      return {
        type: ResponseType.ERROR,
        message: 'Failed to edit idea'
      };
    }
  }

  /**
   * Handle /delete idea command
   */
  async handleDeleteIdea(parsed: ParsedCommand): Promise<CommandResponse> {
    try {
      const user = await User.findById(this.userId);
      if (!user) {
        return {
          type: ResponseType.ERROR,
          message: 'User not found'
        };
      }

      const ideaIdentifier = parsed.args[0];
      if (!ideaIdentifier) {
        return {
          type: ResponseType.ERROR,
          message: 'Idea identifier required',
          suggestions: ['/delete idea [#]', '/delete idea "[idea id]"']
        };
      }

      let ideaIndex = -1;
      if (ideaIdentifier.match(/^\d+$/)) {
        ideaIndex = parseInt(ideaIdentifier, 10) - 1;
      } else {
        ideaIndex = user.ideas.findIndex(i => i.id === ideaIdentifier);
      }

      if (ideaIndex === -1 || ideaIndex >= user.ideas.length) {
        return {
          type: ResponseType.ERROR,
          message: 'Idea not found',
          suggestions: ['/view ideas']
        };
      }

      const deletedIdea = user.ideas[ideaIndex];
      user.ideas.splice(ideaIndex, 1);
      await user.save();

      return {
        type: ResponseType.SUCCESS,
        message: `💡 Idea "${deletedIdea.title}" deleted successfully`,
        suggestions: ['/view ideas']
      };
    } catch (error) {
      logError('Error deleting idea', error as Error, { userId: this.userId });
      return {
        type: ResponseType.ERROR,
        message: 'Failed to delete idea'
      };
    }
  }

  /**
   * Handle /add project command
   */
  async handleAddProject(parsed: ParsedCommand): Promise<CommandResponse> {
    try {
      const user = await User.findById(this.userId);
      if (!user) {
        return {
          type: ResponseType.ERROR,
          message: 'User not found'
        };
      }

      // Check project limit
      if (!user.isAdmin && user.projectLimit !== -1) {
        const currentProjectCount = await Project.countDocuments({ userId: this.userId });
        if (currentProjectCount >= user.projectLimit) {
          return {
            type: ResponseType.ERROR,
            message: `Project limit reached. Your ${user.planTier} plan allows ${user.projectLimit} projects.`,
            suggestions: ['/view projects', 'Upgrade your plan']
          };
        }
      }

      const name = getFlag(parsed.flags, 'name') as string;
      const description = (getFlag(parsed.flags, 'description') as string) || '';
      const category = (getFlag(parsed.flags, 'category') as string) || 'general';
      let color = (getFlag(parsed.flags, 'color') as string) || '#3B82F6';

      // Validate color is hex format, fallback to default if invalid
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!hexRegex.test(color)) {
        color = '#3B82F6'; // Default blue if invalid
      }

      if (!name) {
        return {
          type: ResponseType.ERROR,
          message: 'Project name is required',
          suggestions: ['/add project --name="My Project"']
        };
      }

      const newProject = new Project({
        name: name.substring(0, 100),
        description: description.substring(0, 500),
        category,
        color,
        userId: this.userId,
        ownerId: this.userId,
        todos: [],
        notes: [],
        devLog: [],
        features: [],
        stack: []
      });

      await newProject.save();

      return {
        type: ResponseType.SUCCESS,
        message: `✅ Project "${name}" created successfully`,
        data: {
          project: {
            id: newProject._id.toString(),
            name: newProject.name,
            description: newProject.description,
            category: newProject.category,
            color: newProject.color
          }
        },
        suggestions: ['/swap @' + name, '/view projects']
      };
    } catch (error) {
      logError('Error adding project', error as Error, { userId: this.userId });
      return {
        type: ResponseType.ERROR,
        message: 'Failed to create project'
      };
    }
  }

  /**
   * Handle /view projects command
   */
  async handleViewProjects(parsed: ParsedCommand): Promise<CommandResponse> {
    try {
      const projects = await Project.find({ userId: this.userId }).select('name description category color createdAt updatedAt isArchived').sort({ createdAt: -1 });

      if (!projects || projects.length === 0) {
        return {
          type: ResponseType.INFO,
          message: '📁 No projects yet',
          suggestions: ['/add project --name="My Project"', '/wizard new']
        };
      }

      return {
        type: ResponseType.DATA,
        message: `📁 Your projects (${projects.length})`,
        data: {
          projects: projects.map((project, index) => ({
            index: index + 1,
            id: project._id.toString(),
            name: project.name,
            description: project.description,
            category: project.category,
            color: project.color,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            isArchived: project.isArchived
          }))
        },
        suggestions: ['/swap @[project name]', '/add project']
      };
    } catch (error) {
      logError('Error viewing projects', error as Error, { userId: this.userId });
      return {
        type: ResponseType.ERROR,
        message: 'Failed to fetch projects'
      };
    }
  }

}
