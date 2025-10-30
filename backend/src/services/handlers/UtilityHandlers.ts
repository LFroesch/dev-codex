import { BaseCommandHandler } from './BaseCommandHandler';
import { CommandResponse, ResponseType } from '../types';
import { ParsedCommand, CommandParser, COMMAND_METADATA, CommandType, hasFlag } from '../commandParser';
import { User } from '../../models/User';
import { Project } from '../../models/Project';
import { logError } from '../../config/logger';
import NotificationService from '../notificationService';
import { NewsPost } from '../../models/NewsPost';
import { calculateTextMetrics } from '../../utils/textMetrics';

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
      '4. 🧩 Features & Components': [],
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
        syntax: '📖 Basic Syntax',
        description: 'All commands start with / (e.g., /help, /add todo, /view notes)',
        examples: []
      },
      {
        type: 'syntax_tip',
        syntax: '🔗 Batch Commands',
        description: 'Chain commands with && or newlines (max 10 per batch). Execution stops on first error. Newlines are easier to read/edit.',
        examples: [
          '/add todo task 1\n/add todo task 2\n/add note architecture',
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

      // Features & Components - CRUD for components, then CRUD for relationships
      'add_component': 1,
      'view_components': 2,
      'edit_component': 3,
      'delete_component': 4,
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

      // 4. Features & Components
      else if ([
        'add_component',
        'view_components',
        'edit_component',
        'delete_component',
        'add_relationship',
        'view_relationships',
        'edit_relationship',
        'delete_relationship'
      ].includes(cmdType)) {
        grouped['4. 🧩 Features & Components'].push(cmd);
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
   * Handle /export command
   */
  async handleExport(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
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
   * Handle /summary command - Generate downloadable project summary
   */
  async handleSummary(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const project = resolution.project;
    const format = parsed.args[0]?.toLowerCase() || 'markdown';
    let entity = parsed.args[1]?.toLowerCase() || 'all';

    // Validate format
    const validFormats = ['markdown', 'json', 'prompt', 'text'];
    if (!validFormats.includes(format)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid format "${format}". Available formats: markdown, json, prompt, text`,
        suggestions: ['/help summary']
      };
    }

    // Normalize entity aliases (handle plurals)
    const entityAliases: Record<string, string> = {
      'todo': 'todos',
      'todos': 'todos',
      'note': 'notes',
      'notes': 'notes',
      'devlog': 'devlog',
      'devlogs': 'devlog',
      'component': 'components',
      'components': 'components',
      'stack': 'stack',
      'team': 'team',
      'deployment': 'deployment',
      'deploy': 'deployment',
      'setting': 'settings',
      'settings': 'settings',
      'all': 'all'
    };

    if (entity && !entityAliases[entity]) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid entity "${entity}". Available: all, todos, notes, devlog, components, stack, team, deployment, settings`,
        suggestions: ['/help summary']
      };
    }

    // Normalize to canonical form
    entity = entityAliases[entity] || 'all';

    // Generate filtered summary
    const summary = this.generateFilteredSummary(project, format, entity);

    // Calculate text metrics (character count and token estimation)
    const metrics = calculateTextMetrics(summary);

    // Determine file extension
    const extensions: Record<string, string> = {
      markdown: 'md',
      json: 'json',
      prompt: 'txt',
      text: 'txt'
    };

    const fileExtension = extensions[format];
    const entitySuffix = entity === 'all' ? 'summary' : entity;
    const fileName = `${project.name.replace(/\s+/g, '-')}-${entitySuffix}.${fileExtension}`;

    return {
      type: ResponseType.DATA,
      message: `📄 Generated ${format} ${entity === 'all' ? 'summary' : entity + ' export'} for ${project.name}`,
      data: {
        summary,
        format,
        fileName,
        projectName: project.name,
        entityType: entity,
        downloadable: true,
        textMetrics: metrics
      },
      metadata: {
        projectId: project._id.toString(),
        projectName: project.name,
        action: 'summary'
      }
    };
  }

  /**
   * Generate filtered summary based on entity type
   */
  private generateFilteredSummary(project: any, format: string, entity: string): string {
    // Create a filtered project object based on entity
    const filteredProject: any = {
      name: project.name,
      description: project.description,
      category: project.category,
      stagingEnvironment: project.stagingEnvironment,
      color: project.color,
      tags: project.tags,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      _id: project._id
    };

    // Add only requested entity data
    switch (entity) {
      case 'todos':
        filteredProject.todos = project.todos || [];
        filteredProject.notes = [];
        filteredProject.devLog = [];
        filteredProject.components = [];
        filteredProject.stack = [];
        break;
      case 'notes':
        filteredProject.todos = [];
        filteredProject.notes = project.notes || [];
        filteredProject.devLog = [];
        filteredProject.components = [];
        filteredProject.stack = [];
        break;
      case 'devlog':
        filteredProject.todos = [];
        filteredProject.notes = [];
        filteredProject.devLog = project.devLog || [];
        filteredProject.components = [];
        filteredProject.stack = [];
        break;
      case 'components':
        filteredProject.todos = [];
        filteredProject.notes = [];
        filteredProject.devLog = [];
        filteredProject.components = project.components || [];
        filteredProject.stack = [];
        break;
      case 'stack':
        filteredProject.todos = [];
        filteredProject.notes = [];
        filteredProject.devLog = [];
        filteredProject.components = [];
        filteredProject.stack = project.stack || [];
        break;
      case 'team':
        filteredProject.todos = [];
        filteredProject.notes = [];
        filteredProject.devLog = [];
        filteredProject.components = [];
        filteredProject.stack = [];
        filteredProject.team = project.team || [];
        break;
      case 'deployment':
        filteredProject.todos = [];
        filteredProject.notes = [];
        filteredProject.devLog = [];
        filteredProject.components = [];
        filteredProject.stack = [];
        filteredProject.deploymentData = project.deploymentData || null;
        break;
      case 'settings':
        filteredProject.todos = [];
        filteredProject.notes = [];
        filteredProject.devLog = [];
        filteredProject.components = [];
        filteredProject.stack = [];
        // Settings includes basic project metadata
        filteredProject.tags = project.tags || [];
        filteredProject.category = project.category;
        filteredProject.stagingEnvironment = project.stagingEnvironment;
        break;
      case 'all':
      default:
        filteredProject.todos = project.todos || [];
        filteredProject.notes = project.notes || [];
        filteredProject.devLog = project.devLog || [];
        filteredProject.components = project.components || [];
        filteredProject.stack = project.stack || [];
        filteredProject.team = project.team || [];
        filteredProject.deploymentData = project.deploymentData;
        filteredProject.publicPageData = project.publicPageData;
        break;
    }

    // Use existing summary generator with filtered data
    return this.generateProjectSummary(filteredProject, format);
  }

  /**
   * Generate project summary in different formats (with all data included)
   */
  private generateProjectSummary(project: any, format: string): string {
    const todos = project.todos || [];
    const notes = project.notes || [];
    const devLog = project.devLog || [];
    const components = project.components || [];
    const stack = project.stack || [];
    const team = project.team || [];

    // Count stats
    const completedTodos = todos.filter((t: any) => t.completed).length;
    const highPriorityTodos = todos.filter((t: any) => t.priority === 'high' && !t.completed).length;
    const activeTodos = todos.filter((t: any) => !t.completed);

    switch (format) {
      case 'json':
        return JSON.stringify({
          basicInfo: {
            name: project.name,
            category: project.category,
            stagingEnvironment: project.stagingEnvironment,
          },
          description: project.description,
          notes: notes,
          todos: todos,
          devLog: devLog,
          components: components,
          techStack: {
            stack: stack,
          },
          team: team,
          deploymentData: project.deploymentData || null,
          publicPageData: project.publicPageData || null,
          timestamps: {
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
          }
        }, null, 2);

      case 'prompt':
        let prompt = `# Project Context for AI Assistant for "${project.name}"\n\n`;
        if (project.description) prompt += `**Description:** ${project.description}\n\n`;
        prompt += `## 🤖 MY REQUEST:\n[Please replace this text with what you need help with regarding this project]\n\n`;
        prompt += `## 📋 PROJECT OVERVIEW\n\n`;
        prompt += `**Project Name:** ${project.name}\n`;
        if (project.category) prompt += `**Category:** ${project.category}\n`;
        if (project.stagingEnvironment) prompt += `**Current Environment:** ${project.stagingEnvironment}\n`;

        // Tech Stack
        if (stack.length > 0) {
          prompt += `\n## ⚡ TECH STACK\n\n`;
          prompt += `**Stack:** ${stack.map((t: any) => t.name).join(' • ')}\n`;
        }

        // Tasks
        if (todos.length > 0) {
          prompt += `\n## ✅ CURRENT TASKS (${completedTodos} completed, ${activeTodos.length} pending)\n\n`;
          if (activeTodos.length > 0) {
            prompt += `**🚧 Pending Tasks:**\n`;
            activeTodos.forEach((todo: any) => {
              if (todo?.title) {
                prompt += `• ${todo.title}`;
                if (todo.content) prompt += ` - ${todo.content}`;
                if (todo.priority) prompt += ` [${todo.priority.toUpperCase()} PRIORITY]`;
                if (todo.dueDate) prompt += ` (Due: ${new Date(todo.dueDate).toLocaleDateString()})`;
                prompt += `\n`;
              }
            });
          }
          if (completedTodos > 0) {
            prompt += `\n**✅ Completed Tasks:**\n`;
            todos.filter((t: any) => t.completed).forEach((todo: any) => {
              if (todo?.title) {
                prompt += `• ${todo.title}`;
                if (todo.content) prompt += ` - ${todo.content}`;
                prompt += `\n`;
              }
            });
          }
        }

        // Recent Development Log
        if (devLog.length > 0) {
          const recentEntries = devLog.slice(-5);
          prompt += `\n## 📝 RECENT DEVELOPMENT LOG\n`;
          recentEntries.forEach((entry: any) => {
            const entryContent = entry.content?.length > 500 ?
              entry.content.substring(0, 500) + '...' :
              entry.content || '';
            prompt += `\n**${entry.date}${entry.title ? ' - ' + entry.title : ''}**\n`;
            prompt += `${entryContent}\n`;
          });
          if (devLog.length > 5) {
            prompt += `\n*(Showing ${recentEntries.length} most recent entries out of ${devLog.length} total)*\n`;
          }
        }

        // Notes
        if (notes.length > 0) {
          prompt += `\n## 📋 PROJECT NOTES\n`;
          notes.forEach((note: any) => {
            const noteContent = note.content?.length > 1000 ?
              note.content.substring(0, 1000) + '...' :
              note.content || '';
            prompt += `\n**${note.title || 'Untitled Note'}**\n`;
            prompt += `${noteContent}\n`;
          });
        }

        // Components - Grouped by features
        if (components.length > 0) {
          prompt += `\n## 🧩 COMPONENTS (Grouped by Features)\n`;

          // Group components by feature
          const componentsByFeature: Record<string, any[]> = {};
          components.forEach((component: any) => {
            const featureKey = component.feature || 'Ungrouped';
            if (!componentsByFeature[featureKey]) componentsByFeature[featureKey] = [];
            componentsByFeature[featureKey].push(component);
          });

          // Show all features with their components
          Object.entries(componentsByFeature).sort().forEach(([feature, componentList]: [string, any]) => {
            prompt += `\n**FEATURE: ${feature}**\n`;
            componentList.forEach((component: any) => {
              const componentContent = component.content?.length > 800 ?
                component.content.substring(0, 800) + '...' :
                component.content || '';
              prompt += `• [${component.type}] **${component.title || 'Untitled'}:** ${componentContent}\n`;
            });
          });
        }

        // Team
        if (team.length > 0) {
          prompt += `\n## 👥 TEAM MEMBERS\n`;
          prompt += `**Total Members:** ${team.length}\n\n`;
          team.forEach((member: any) => {
            const name = member.userId ?
              `${member.userId.firstName || ''} ${member.userId.lastName || ''}`.trim() ||
              member.userId.email :
              'Unknown';
            const role = member.role || 'member';
            prompt += `• **${name}** - ${role}\n`;
          });
        }

        // Deployment
        if (project.deploymentData) {
          prompt += `\n## 🚀 DEPLOYMENT INFO\n`;
          if (project.deploymentData.liveUrl) prompt += `**Live URL:** ${project.deploymentData.liveUrl}\n`;
          if (project.deploymentData.githubUrl) prompt += `**GitHub Repository:** ${project.deploymentData.githubUrl}\n`;
          if (project.deploymentData.deploymentPlatform) prompt += `**Hosting Platform:** ${project.deploymentData.deploymentPlatform}\n`;
          if (project.deploymentData.deploymentStatus) prompt += `**Status:** ${project.deploymentData.deploymentStatus}\n`;
          if (project.deploymentData.deploymentBranch) prompt += `**Branch:** ${project.deploymentData.deploymentBranch}\n`;
        }

        // Public Page Data
        if (project.publicPageData?.isPublic) {
          prompt += `\n## 🌐 PUBLIC PAGE INFO\n`;
          if (project.publicPageData.publicTitle) prompt += `**Public Title:** ${project.publicPageData.publicTitle}\n`;
          if (project.publicPageData.publicDescription) prompt += `**Public Description:** ${project.publicPageData.publicDescription}\n`;
          if (project.publicPageData.publicTags?.length) prompt += `**Public Tags:** ${project.publicPageData.publicTags.join(' • ')}\n`;
        }

        // Timestamps
        if (project.createdAt || project.updatedAt) {
          const created = new Date(project.createdAt);
          const updated = new Date(project.updatedAt);
          const daysSinceCreated = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
          const daysSinceUpdated = Math.floor((Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24));

          prompt += `\n## ⏱️ PROJECT TIMELINE\n`;
          prompt += `**Created:** ${created.toLocaleDateString()} (${daysSinceCreated} days ago)\n`;
          prompt += `**Last Updated:** ${updated.toLocaleDateString()} (${daysSinceUpdated} days ago)\n`;
        }

        prompt += `\n---\n`;
        return prompt;

      case 'markdown':
        let md = `# ${project.name}\n\n`;

        // Basic Info
        md += `## Basic Information\n\n`;
        md += `- **Name:** ${project.name}\n`;
        if (project.category) md += `- **Category:** ${project.category}\n`;
        if (project.stagingEnvironment) md += `- **Environment:** ${project.stagingEnvironment}\n`;
        md += `\n`;

        // Description
        if (project.description) {
          md += `## Description\n\n${project.description}\n\n`;
        }


        // Notes
        if (notes.length > 0) {
          md += `## Notes\n\n`;
          notes.forEach((note: any) => {
            const noteContent = note.content?.length > 2000 ?
              note.content.substring(0, 2000) + '...' :
              note.content || '';
            md += `### ${note.title || 'Untitled Note'}\n${noteContent}\n\n`;
          });
        }

        // Todo Items
        if (todos.length > 0) {
          md += `## Todo Items\n\n`;
          todos.forEach((todo: any) => {
            const todoDesc = todo.content?.length > 200 ?
              todo.content.substring(0, 200) + '...' :
              todo.content;
            md += `- [${todo.completed ? 'x' : ' '}] **${todo.title || 'Untitled Task'}**${todoDesc ? `: ${todoDesc}` : ''}`;
            if (todo.priority) md += ` [${todo.priority.toUpperCase()}]`;
            md += `\n`;
          });
          md += `\n`;
        }

        // Development Log
        if (devLog.length > 0) {
          md += `## Development Log\n\n`;
          devLog.forEach((entry: any) => {
            const entryContent = entry.content?.length > 1500 ?
              entry.content.substring(0, 1500) + '...' :
              entry.content || '';
            md += `### ${entry.date} - ${entry.title || 'Development Entry'}\n${entryContent}\n\n`;
          });
        }

        // Components
        if (components.length > 0) {
          md += `## Components\n\n`;
          components.forEach((component: any) => {
            const componentContent = component.content?.length > 2000 ?
              component.content.substring(0, 2000) + '...' :
              component.content || '';
            md += `### ${component.title || 'Untitled'} (${component.type}) - Feature: ${component.feature}\n${componentContent}\n\n`;
          });
        }

        // Tech Stack
        if (stack.length > 0) {
          md += `## Tech Stack\n\n`;
          md += `${stack.map((t: any) => `- **${t.name}** (${t.category})${t.version ? ` - v${t.version}` : ''}`).join('\n')}\n\n`;
        }

        // Team
        if (team.length > 0) {
          md += `## Team Members\n\n`;
          team.forEach((member: any) => {
            const name = member.userId ?
              `${member.userId.firstName || ''} ${member.userId.lastName || ''}`.trim() ||
              member.userId.email :
              'Unknown';
            const role = member.role || 'member';
            md += `- **${name}** - ${role}\n`;
          });
          md += `\n`;
        }

        // Deployment
        if (project.deploymentData) {
          md += `## Deployment\n\n`;
          if (project.deploymentData.liveUrl) md += `- **Live URL:** ${project.deploymentData.liveUrl}\n`;
          if (project.deploymentData.githubUrl) md += `- **GitHub:** ${project.deploymentData.githubUrl}\n`;
          if (project.deploymentData.deploymentPlatform) md += `- **Platform:** ${project.deploymentData.deploymentPlatform}\n`;
          if (project.deploymentData.deploymentStatus) md += `- **Status:** ${project.deploymentData.deploymentStatus}\n`;
          md += `\n`;
        }

        // Public Page Data
        if (project.publicPageData?.isPublic) {
          md += `## Public Page Info\n\n`;
          if (project.publicPageData.publicTitle) md += `- **Title:** ${project.publicPageData.publicTitle}\n`;
          if (project.publicPageData.publicDescription) md += `- **Description:** ${project.publicPageData.publicDescription}\n`;
          if (project.publicPageData.publicTags?.length) md += `- **Tags:** ${project.publicPageData.publicTags.join(', ')}\n`;
          md += `\n`;
        }

        // Timestamps
        if (project.createdAt || project.updatedAt) {
          md += `## Timestamps\n\n`;
          md += `- **Created:** ${new Date(project.createdAt).toLocaleDateString()}\n`;
          md += `- **Updated:** ${new Date(project.updatedAt).toLocaleDateString()}\n`;
        }

        return md;

      case 'text':
      default:
        let text = `${project.name}\n${'='.repeat(project.name.length)}\n\n`;

        // Basic Info
        text += `BASIC INFORMATION\n`;
        text += `-----------------\n`;
        text += `Name: ${project.name}\n`;
        if (project.category) text += `Category: ${project.category}\n`;
        if (project.stagingEnvironment) text += `Environment: ${project.stagingEnvironment}\n`;
        text += `\n`;

        // Description
        if (project.description) {
          text += `DESCRIPTION\n`;
          text += `-----------\n`;
          text += `${project.description}\n\n`;
        }

        // Notes
        if (notes.length > 0) {
          text += `NOTES\n`;
          text += `-----\n`;
          notes.forEach((note: any) => {
            text += `${note.title || 'Untitled'}: ${note.content?.substring(0, 200) || ''}${note.content?.length > 200 ? '...' : ''}\n`;
          });
          text += `\n`;
        }

        // Todos
        if (todos.length > 0) {
          text += `TODO ITEMS\n`;
          text += `----------\n`;
          todos.forEach((todo: any) => {
            text += `[${todo.completed ? 'X' : ' '}] [${todo.priority?.toUpperCase() || 'MED'}] ${todo.title}\n`;
          });
          text += `\n`;
        }

        // Dev Log
        if (devLog.length > 0) {
          text += `DEVELOPMENT LOG\n`;
          text += `---------------\n`;
          devLog.forEach((entry: any) => {
            text += `${entry.date} - ${entry.title || 'Entry'}: ${entry.content?.substring(0, 150) || ''}${entry.content?.length > 150 ? '...' : ''}\n`;
          });
          text += `\n`;
        }

        // Components
        if (components.length > 0) {
          text += `COMPONENTS\n`;
          text += `----------\n`;
          components.forEach((component: any) => {
            text += `${component.title || 'Untitled'} (${component.type}) [${component.feature}]: ${component.content?.substring(0, 150) || ''}${component.content?.length > 150 ? '...' : ''}\n`;
          });
          text += `\n`;
        }

        // Tech Stack
        if (stack.length > 0) {
          text += `TECH STACK\n`;
          text += `----------\n`;
          stack.forEach((t: any) => {
            text += `- ${t.name} (${t.category})${t.version ? ` v${t.version}` : ''}\n`;
          });
          text += `\n`;
        }

        // Team
        if (team.length > 0) {
          text += `TEAM MEMBERS\n`;
          text += `------------\n`;
          team.forEach((member: any) => {
            const name = member.userId ?
              `${member.userId.firstName || ''} ${member.userId.lastName || ''}`.trim() ||
              member.userId.email :
              'Unknown';
            const role = member.role || 'member';
            text += `- ${name} (${role})\n`;
          });
          text += `\n`;
        }

        // Deployment
        if (project.deploymentData) {
          text += `DEPLOYMENT\n`;
          text += `----------\n`;
          if (project.deploymentData.liveUrl) text += `Live URL: ${project.deploymentData.liveUrl}\n`;
          if (project.deploymentData.githubUrl) text += `GitHub: ${project.deploymentData.githubUrl}\n`;
          if (project.deploymentData.deploymentPlatform) text += `Platform: ${project.deploymentData.deploymentPlatform}\n`;
          if (project.deploymentData.deploymentStatus) text += `Status: ${project.deploymentData.deploymentStatus}\n`;
          text += `\n`;
        }

        // Public Page Data
        if (project.publicPageData?.isPublic) {
          text += `PUBLIC PAGE INFO\n`;
          text += `----------------\n`;
          if (project.publicPageData.publicTitle) text += `Title: ${project.publicPageData.publicTitle}\n`;
          if (project.publicPageData.publicDescription) text += `Description: ${project.publicPageData.publicDescription}\n`;
          text += `\n`;
        }

        // Timestamps
        if (project.createdAt || project.updatedAt) {
          text += `TIMESTAMPS\n`;
          text += `----------\n`;
          text += `Created: ${new Date(project.createdAt).toLocaleDateString()}\n`;
          text += `Updated: ${new Date(project.updatedAt).toLocaleDateString()}\n`;
        }

        return text;
    }
  }

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
   * Handle /llm command - Generate LLM context guide
   */
  handleLLMContext(): CommandResponse {
    const guide = `# Terminal Command Reference for AI

## Workflow: User → AI → Terminal → Repeat
1. User runs \`/summary prompt [entity]\` to get project context
2. User pastes context + this guide into AI chat
3. AI generates commands, user pastes back into terminal
4. Repeat as needed

## Core Syntax
- Commands: \`/command "args" @project --flag="value"\`
- Batch: Chain with \`&&\` or newlines (max 10 commands per batch, stops on error)
- Quotes: Multi-word args need quotes
- Escapes: \`\\n\` for newlines in content
- Projects: \`@ProjectName\` at end of command
- Item matching: UUID > Index (1-based) > Partial text match (case-insensitive)

## Commands (Syntax Only)

\`/add todo --title="..." [--content="..." --priority=low|medium|high --status=not_started|in_progress|blocked|completed --due="MM-DD-YYYY HH:MM"]\`
\`/edit todo "idx|text" [--title --content --priority --status --due]\`
\`/delete todo "idx|text" [--confirm]\`
\`/complete "idx|text"\`
\`/assign "idx|text" "email"\`
\`/push "idx|text"\` (push to devlog)
\`/add subtask --parent="idx|text" --title="..." [same flags as todo]\`
\`/edit subtask parent_idx subtask_idx [--flags]\`
\`/delete subtask parent_idx subtask_idx [--confirm]\`

### Notes & DevLog
\`/add note --title="..." --content="..."\`
\`/edit note "idx|text"\`
\`/delete note "idx|text"\`
\`/add devlog --title="..." --content="..."\`
\`/edit devlog "idx|text"\`
\`/delete devlog "idx|text"\`

### Components & Relationships
\`/add component --feature="..." --category=frontend|backend|database|infrastructure|security|api|documentation|asset --type="..." --title="..." --content="..."\`
\`/edit component "idx|text"\`
\`/delete component "idx|text"\`
\`/add relationship --source="..." --target="..." --type=uses|implements|extends|depends_on|calls|contains|mentions|similar [--description="..."]\`
\`/edit relationship "component" "rel_idx" "new_type" [--description]\`
\`/delete relationship "component_idx" "rel_idx"\`

**Component types by category:**
frontend: page|component|hook|context|layout|util|custom
backend: service|route|model|controller|middleware|util|custom
database: schema|migration|seed|query|index|custom
infrastructure: deployment|cicd|env|config|monitoring|docker|custom
security: auth|authz|encryption|validation|sanitization|custom
api: client|integration|webhook|contract|graphql|custom
documentation: area|section|guide|architecture|api-doc|readme|changelog|custom
asset: image|font|video|audio|document|dependency|custom

### Stack
\`/add stack --name="..." --category=framework|runtime|database|styling|deployment|testing|tooling|ui|state|routing|forms|animation|api|auth|data|utility [--version="..." --description="..."]\`
\`/remove stack --name="..."\`

### Insights
\`/info\` \`/today\` \`/week\` \`/standup\` \`/search "query"\`
\`/summary [format] [entity]\` - formats: markdown|json|prompt|text; entities: all|todos|notes|devlog|components|stack|team|deployment|settings

### Team & Deployment
\`/invite "email" --role=editor|viewer\`
\`/remove member "email"\`
\`/set deployment --url="..." --platform="..." --status=active|inactive|error [--github --build --start --branch --lastDeploy]\`
\`/set public --enabled=true|false --slug="..."\`

### Project
\`/swap @project\`
\`/export\`
\`/set name "..."\`
\`/set description "..."\`
\`/add tag "..."\`
\`/remove tag "..."\`

## Critical Rules
1. Components MUST have --feature flag
2. Use /search before editing/deleting to verify items exist
3. Batch commands: Use \`&&\` or newlines (max 10 per batch, stops on error). Split large batches into sets of 10.
4. Dates: "MM-DD-YYYY HH:MMAM/PM" or "MM-DD HH:MM" (24hr)
5. Markdown supported in content: \`--content="Line1\\nLine2"\`
6. Item matching: UUID → Index → Partial text (case-insensitive)

## Error Examples
\`❌ --title flag is required\` → Add --title="..."
\`❌ Component not found: "login"\` → Run /view components first
\`❌ Invalid priority\` → Use low|medium|high
\`❌ Target component not found\` → Both components must exist
\`❌ --feature flag is required\` → Components need --feature="..."

This terminal provides a powerful CLI for project management with support for tasks, documentation, team collaboration, and deployment tracking. All operations are command-based with support for both interactive wizards and direct flag-based execution.`;

    // Calculate text metrics for the guide
    const metrics = calculateTextMetrics(guide);

    return {
      type: ResponseType.DATA,
      message: '🤖 LLM Terminal Interaction Guide',
      data: {
        summary: guide,
        format: 'text',
        fileName: 'llm-terminal-guide.txt',
        projectName: 'Terminal Guide',
        downloadable: true,
        textMetrics: metrics
      }
    };
  }

  /**
   * Handle wizard commands
   */
  async handleWizard(parsed: ParsedCommand): Promise<CommandResponse> {
    switch (parsed.type) {
      case CommandType.WIZARD_NEW:
        return this.handleWizardNew();
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
  private handleWizardNew(): CommandResponse {
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
            description: 'Pick a color theme for your project'
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
    const components = project.components || [];
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
          components: {
            total: components.length
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
}
