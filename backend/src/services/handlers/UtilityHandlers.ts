import { BaseCommandHandler } from './BaseCommandHandler';
import { CommandResponse, ResponseType } from '../commandExecutor';
import { ParsedCommand, CommandParser, COMMAND_METADATA, CommandType } from '../commandParser';
import { User } from '../../models/User';
import { Project } from '../../models/Project';
import { logError } from '../../config/logger';
import NotificationService from '../notificationService';

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
      '⚡ Command Syntax': [],
      '📝 Create': [],
      '👀 View & Search': [],
      '✏️ Edit': [],
      '🗑️ Delete': [],
      '✅ Task Management': [],
      '📊 Workflow & Planning': [],
      '📦 Tech Stack': [],
      '👥 Team': [],
      '⚙️ Settings & Deployment': [],
      '🔧 Utilities': []
    };

    // Add syntax tips to the Command Syntax section
    grouped['⚡ Command Syntax'] = [
      {
        type: 'syntax_tip',
        syntax: '📖 Basic Syntax',
        description: 'All commands start with / (e.g., /help, /add todo, /view notes)',
        examples: []
      },
      {
        type: 'syntax_tip',
        syntax: '🔗 Chained Commands',
        description: 'Chain multiple commands with && to execute them sequentially. Execution stops on first error.',
        examples: [
          '/add todo implement feature && /add note architecture decisions',
          '/add tech React && /add package axios && /view stack',
          '/complete 1 && /add devlog completed user authentication'
        ]
      },
      {
        type: 'syntax_tip',
        syntax: '@ Project Mentions',
        description: 'Reference projects using @projectname. Works with spaces in project names.',
        examples: [
          '/add todo fix bug @myproject',
          '/swap @My Cool Project',
          '/view todos @frontend'
        ]
      },
      {
        type: 'syntax_tip',
        syntax: '-- Flags & Options',
        description: 'Use flags to modify command behavior (e.g., --category=api, --role=editor)',
        examples: [
          '/add tech React --category=framework --version=18.2.0',
          '/invite user@email.com --role=editor',
          '/set deployment --url=https://myapp.com --platform=vercel'
        ]
      }
    ];

    commands.forEach(cmd => {
      const cmdType = cmd.type.toString();

      // Wizards go in Create
      if (cmdType.startsWith('wizard_')) {
        grouped['📝 Create'].push(cmd);
      }
      // Create operations
      else if (cmdType.startsWith('add_')) {
        grouped['📝 Create'].push(cmd);
        // Also add task-related creates to Task Management
        if (cmdType === 'add_todo' || cmdType === 'add_subtask') {
          grouped['✅ Task Management'].push(cmd);
        }
        // Also add tech stack creates to Tech Stack
        if (cmdType === 'add_tech' || cmdType === 'add_package') {
          grouped['📦 Tech Stack'].push(cmd);
        }
      }
      // View & Search
      else if (cmdType.startsWith('view_') || cmdType === 'search') {
        grouped['👀 View & Search'].push(cmd);
        // Also add task views to Task Management
        if (cmdType === 'view_todos' || cmdType === 'view_subtasks') {
          grouped['✅ Task Management'].push(cmd);
        }
        // Also add tech stack views to Tech Stack
        if (cmdType === 'view_stack') {
          grouped['📦 Tech Stack'].push(cmd);
        }
        // Also add team/settings views to their sections
        if (cmdType === 'view_team') {
          grouped['👥 Team'].push(cmd);
        }
        if (cmdType === 'view_settings' || cmdType === 'view_deployment' || cmdType === 'view_public') {
          grouped['⚙️ Settings & Deployment'].push(cmd);
        }
      }
      // Edit operations
      else if (cmdType.startsWith('edit_')) {
        grouped['✏️ Edit'].push(cmd);
        // Also add todo edits to Task Management
        if (cmdType === 'edit_todo') {
          grouped['✅ Task Management'].push(cmd);
        }
      }
      // Delete operations
      else if (cmdType.startsWith('delete_')) {
        grouped['🗑️ Delete'].push(cmd);
        // Also add todo/subtask deletes to Task Management
        if (cmdType === 'delete_todo' || cmdType === 'delete_subtask') {
          grouped['✅ Task Management'].push(cmd);
        }
      }
      // Task management operations
      else if ([
        'complete_todo',
        'assign_todo',
      ].includes(cmdType)) {
        grouped['✅ Task Management'].push(cmd);
      }
      // Tech stack remove operations
      else if (cmdType === 'remove_tech' || cmdType === 'remove_package') {
        grouped['📦 Tech Stack'].push(cmd);
        grouped['🗑️ Delete'].push(cmd);
      }
      // Team operations
      else if ([
        'invite_member',
        'remove_member'
      ].includes(cmdType)) {
        grouped['👥 Team'].push(cmd);
      }
      // Settings & Deployment
      else if ([
        'set_name',
        'set_description',
        'set_deployment',
        'set_public',
        'add_tag',
        'remove_tag'
      ].includes(cmdType)) {
        grouped['⚙️ Settings & Deployment'].push(cmd);
      }
      // Workflow & Planning
      else if ([
        'today',
        'week',
        'standup',
        'info'
      ].includes(cmdType)) {
        grouped['📊 Workflow & Planning'].push(cmd);
      }
      // Navigation (goto)
      else if (cmdType === 'goto') {
        grouped['🔧 Utilities'].push(cmd);
      }
      // Utilities (swap, export, themes, etc.)
      else {
        grouped['🔧 Utilities'].push(cmd);
      }
    });

    return {
      type: ResponseType.INFO,
      message: '📚 Available Commands - 50+ commands to manage your projects',
      data: {
        grouped,
        tip: 'Use /help "command" for detailed help on a specific command. Chain commands with && for batch execution.'
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

    // Validate format
    const validFormats = ['markdown', 'json', 'prompt', 'text'];
    if (!validFormats.includes(format)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid format "${format}". Available formats: markdown, json, prompt, text`,
        suggestions: ['/help summary']
      };
    }

    // Build summary content
    const summary = this.generateProjectSummary(project, format);

    // Determine file extension
    const extensions: Record<string, string> = {
      markdown: 'md',
      json: 'json',
      prompt: 'txt',
      text: 'txt'
    };

    const fileExtension = extensions[format];
    const fileName = `${project.name.replace(/\s+/g, '-')}-summary.${fileExtension}`;

    return {
      type: ResponseType.DATA,
      message: `📄 Generated ${format} summary for ${project.name}`,
      data: {
        summary,
        format,
        fileName,
        projectName: project.name,
        downloadable: true
      },
      metadata: {
        projectId: project._id.toString(),
        projectName: project.name,
        action: 'summary'
      }
    };
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
            color: project.color,
          },
          description: project.description,
          tags: project.tags || [],
          stats: {
            todos: {
              total: todos.length,
              completed: completedTodos,
              active: activeTodos.length,
              highPriority: highPriorityTodos
            },
            notes: notes.length,
            devLog: devLog.length,
            components: components.length
          },
          notes: notes,
          todos: todos,
          devLog: devLog,
          components: components,
          techStack: {
            stack: stack,
          },
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
        if (project.color) prompt += `**Theme Color:** ${project.color}\n`;
        if (project.tags && project.tags.length > 0) {
          prompt += `\n**Tags/Keywords:** ${project.tags.join(' • ')}\n`;
        }

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

        // Deployment
        if (project.deploymentData) {
          prompt += `\n## 🚀 DEPLOYMENT INFO\n`;
          if (project.deploymentData.liveUrl) prompt += `**Live URL:** ${project.deploymentData.liveUrl}\n`;
          if (project.deploymentData.githubUrl) prompt += `**GitHub Repository:** ${project.deploymentData.githubUrl}\n`;
          if (project.deploymentData.deploymentPlatform) prompt += `**Hosting Platform:** ${project.deploymentData.deploymentPlatform}\n`;
          if (project.deploymentData.environment) prompt += `**Environment:** ${project.deploymentData.environment}\n`;
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

        // Tags
        if (project.tags?.length) {
          md += `## Tags\n\n${project.tags.map((tag: string) => `\`${tag}\``).join(', ')}\n\n`;
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
          md += `### Stack\n${stack.map((t: any) => `- ${t.name}`).join('\n')}\n\n`;
        }

        // Deployment
        if (project.deploymentData) {
          md += `## Deployment\n\n`;
          if (project.deploymentData.liveUrl) md += `- **Live URL:** ${project.deploymentData.liveUrl}\n`;
          if (project.deploymentData.githubUrl) md += `- **GitHub:** ${project.deploymentData.githubUrl}\n`;
          if (project.deploymentData.deploymentPlatform) md += `- **Platform:** ${project.deploymentData.deploymentPlatform}\n`;
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

        // Tags
        if (project.tags?.length) {
          text += `TAGS\n`;
          text += `----\n`;
          text += `${project.tags.join(', ')}\n\n`;
        }

        // Statistics
        text += `STATISTICS\n`;
        text += `----------\n`;
        text += `Todos: ${completedTodos}/${todos.length} completed\n`;
        text += `High Priority: ${highPriorityTodos} remaining\n`;
        text += `Notes: ${notes.length}\n`;
        text += `Dev Log Entries: ${devLog.length}\n`;
        text += `Components: ${components.length}\n\n`;

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
          if (stack.length > 0) {
            text += `Technologies:\n`;
            stack.forEach((t: any) => {
              text += `- ${t.name}\n`;
            });
          }
          text += `\n`;
        }

        // Deployment
        if (project.deploymentData) {
          text += `DEPLOYMENT\n`;
          text += `----------\n`;
          if (project.deploymentData.liveUrl) text += `Live URL: ${project.deploymentData.liveUrl}\n`;
          if (project.deploymentData.githubUrl) text += `GitHub: ${project.deploymentData.githubUrl}\n`;
          if (project.deploymentData.deploymentPlatform) text += `Platform: ${project.deploymentData.deploymentPlatform}\n`;
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
      const NewsPost = require('../../models/NewsPost').default;

      const newsPosts = await NewsPost.find({ status: 'published' })
        .sort({ publishedAt: -1 })
        .limit(5)
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
      const unreadOnly = parsed.flags.has('unread');

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
    const guide = `# Terminal Command System - LLM Interaction Guide

## Overview
This is a project management terminal interface that accepts natural language-like commands to manage projects, tasks, notes, documentation, and more. All commands start with "/" and follow a structured syntax.

## Core Command Syntax

### Basic Structure
\`\`\`
/command "arguments" @project --flags="value"
\`\`\`

- **Commands**: Start with "/" (e.g., /help, /add todo)
- **Arguments**: Text or values following the command (use quotes for multi-word arguments)
- **Project Mentions**: Reference projects using @ syntax (e.g., @myproject, @My Project Name)
- **Flags**: Modify behavior with -- flags (e.g., --category="api", --role="editor")

### Batch Commands
Chain multiple commands with && to execute sequentially:
\`\`\`
/add todo implement feature && /add note architecture decisions && /view todos
/add tech React --category=framework && /add package axios && /view stack
\`\`\`
Execution stops on first error.

## Command Categories

### 1. Project Management
- \`/wizard new\` - Interactive project creation wizard
- \`/swap @project\` - Switch to different project
- \`/view settings @project\` - View project settings
- \`/set name "new name" @project\` - Update project name
- \`/set description "text" @project\` - Update description
- \`/add tag "tag" @project\` - Add project tag
- \`/remove tag "tag" @project\` - Remove project tag

### 2. Task Management
- \`/add todo\` or \`/add todo --title="text" --content="text" --priority="low|medium|high" --status="not_started|in_progress|blocked" @project\` - Create new todo (with wizard or flags)
- \`/view todos @project\` - List all todos
- \`/edit todo "id" @project\` - Open interactive wizard to edit todo (or use --field= and --content= for direct updates)
- \`/delete todo "id/text" @project\` - Delete todo
- \`/complete "id/text" @project\` - Mark todo complete
- \`/assign "id/text" "email" @project\` - Assign to team member

### 3. Subtasks
- \`/add subtask "parent todo" "text" @project\` - Add subtask
- \`/view subtasks "todo id/text" @project\` - View subtasks
- \`/delete subtask "id/text" @project\` - Delete subtask

### 4. Notes & Documentation
- \`/add note\` or \`/add note --title="text" --content="text" @project\` - Create note (with wizard or flags)
- \`/view notes @project\` - List notes
- \`/edit note "id" @project\` - Open interactive wizard to edit note title and content (or use --field= and --content= for direct updates)
- \`/delete note "id/title" @project\` - Delete note
- \`/add devlog\` or \`/add devlog --title="text" --content="text" @project\` - Add dev log entry (with wizard or flags)
- \`/view devlog @project\` - View dev log
- \`/edit devlog "id" @project\` - Open interactive wizard to edit dev log entry
- \`/delete devlog "id" @project\` - Delete dev log entry
- \`/add component\` or \`/add component --feature="name" --category="category" --type="type" --title="title" --content="content" @project\` - Add component (with wizard or flags)
- \`/view components @project\` - View components grouped by features
- \`/edit component "id" @project\` - Open interactive wizard to edit component
- \`/delete component "id" @project\` - Delete component

### 5. Tech Stack
- \`/add stack\` or \`/add stack --name="name" --category="category" --version="version" @project\` - Add to tech stack (with wizard or flags)
- \`/view stack @project\` - View tech stack
- \`/remove stack --name="name" @project\` - Remove from stack

### 6. Team & Collaboration
- \`/view team @project\` - View team members
- \`/invite "email/username" --role="editor/viewer" @project\` - Invite member
- \`/remove member "email/username" @project\` - Remove member

### 7. Deployment & Public Settings
- \`/view deployment @project\` - View deployment info
- \`/set deployment --url="url" --platform="platform" @project\` - Set deployment
- \`/view public @project\` - View public settings
- \`/set public --enabled="true/false" --slug="slug" @project\` - Set public visibility

### 8. Search & Export
- \`/search "query" @project\` - Search across all content
- \`/export @project\` - Export project data
- \`/summary "markdown|json|prompt|text" @project\` - Generate downloadable summary

### 9. Utilities
- \`/help "command"\` - Show all commands or specific command help
- \`/view themes\` - List available themes
- \`/set theme "name"\` - Change theme
- \`/view news\` - View latest updates
- \`/view notifications\` - View notifications
- \`/clear notifications\` - Clear all notifications

## Usage Examples

### Creating a Full Project Setup
\`\`\`
/wizard new
/add stack --name="React" --category=framework --version=18.2.0 @MyProject
/add stack --name="axios" --category=api @MyProject
/add todo --title="setup authentication" --priority=high @MyProject
/add todo --title="create dashboard" --priority=medium @MyProject
/add note --title="Architecture Decisions" --content="Initial architecture decisions and technology choices" @MyProject
\`\`\`

### Managing Tasks (Wizard or Flags)
\`\`\`
/add todo                          # Opens wizard
/add todo --title="fix login bug" --priority=high --content="Fix validation issues in login form" @Frontend
/assign "fix login bug" dev@example.com @Frontend
/add subtask "fix login bug" update validation @Frontend
/edit todo 1 @Frontend                                    # Opens interactive wizard
/edit todo 1 --field=title --content="Updated task title" @Frontend   # Direct field update
\`\`\`

### Editing Content
\`\`\`
/edit note 1                                              # Opens interactive wizard for editing all fields
/edit note 2 --field=title --content="New Title"         # Direct field update
/edit component 1 --field=content --content="Updated content"     # Update specific field
/edit devlog 1 --field=entry --content="New entry text"  # Update devlog entry
\`\`\`

### Managing Component Relationships
Component relationships can be added or removed. "Editing" a relationship means deleting the old one and adding a new one:
\`\`\`
/edit component 1 --field=relationship --action=add --target=2 --type=uses
/edit component 1 --field=relationship --action=delete --id=<relationship-id>

# To "edit" a relationship: delete it, then add the updated version
/edit component 1 --field=relationship --action=delete --id=abc123
/edit component 1 --field=relationship --action=add --target=2 --type=depends_on
\`\`\`

Note: The interactive component wizard provides inline editing UI for relationships, but behind the scenes it performs delete+add operations.

### Component Documentation Workflow (Wizard or Flags)
\`\`\`
/add component                     # Opens wizard
/add component --feature="Auth" --category=api --type=endpoint --title="Login" --content="POST endpoint for user authentication with JWT tokens" @Backend
/add devlog --title="JWT Token Refresh" --content="Implemented JWT token refresh mechanism for persistent sessions" @Backend
/add note --title="API Rate Limiting" --content="Consider adding rate limiting to prevent abuse of authentication endpoints" @Backend
\`\`\`

### Batch Operations
\`\`\`
/add todo --title="implement feature" --priority=high && /view todos
/add stack --name="PostgreSQL" --category=database && /add stack --name="pg" --version=8.0.0 && /view stack
\`\`\`

## Project References
- Use @ syntax: \`@projectname\` or \`@My Project Name\`
- Works with spaces in project names
- Can be placed anywhere in command
- If omitted, uses current project context (if available)

## Flags & Options
Common flags:
- \`--category=\` - Categorize items (tech, packages, etc.)
- \`--version=\` - Specify version numbers
- \`--role=\` - Set user roles (editor, viewer)
- \`--enabled=\` - Enable/disable features (true, false)
- \`--url=\` - Set URLs (deployment, etc.)
- \`--platform=\` - Specify platforms
- \`--slug=\` - Set URL slugs
- \`--priority=\` - Set priorities (low, medium, high)
- \`--unread\` - Filter unread items

## Response Types
The system returns different response types:
- **success** ✅ - Operation completed successfully
- **error** ❌ - Operation failed
- **info** ℹ️ - Informational message
- **data** 📊 - Data response (lists, etc.)
- **prompt** ❓ - Interactive prompt for user input
- **warning** ⚠️ - Warning message

## Tips for LLMs
1. Always include "/" before commands
2. Use @ for project mentions: \`@ProjectName\`
3. Chain related commands with && for efficiency
4. Use flags to provide additional context
5. Reference items by ID or text content
6. Use quotes for multi-word arguments when needed
7. Check /help for specific command syntax
8. Use /search to find content across projects
9. Generate summaries with /summary "format" for sharing project context
10. Use /wizard new for interactive project creation
11. Use /edit "type" "id" for interactive editing wizards, or add --field and --content flags for direct updates

## Common Patterns

### Setting up a new feature
\`\`\`
/add todo --title="implement new feature" --priority=high --content="Feature description and requirements" && /add note --title="Implementation Details" --content="Technical approach and considerations"
\`\`\`

### Editing content interactively
\`\`\`
/edit todo 1              # Opens wizard to edit all todo fields
/edit note 1              # Opens wizard to edit note title and content
\`\`\`

### Editing specific fields directly
\`\`\`
/edit todo 1 --field=title --content="Updated task text"
/edit note 1 --field=title --content="New Title"
/edit note 1 --field=content --content="Updated note content"
\`\`\`

### Documenting a component
\`\`\`
/add component --feature="Auth" --category=backend --type=service --title="OAuth Service" --content="Handles OAuth authentication flow" && /add devlog --title="OAuth Implementation" --content="Implemented OAuth 2.0 authentication service"
\`\`\`

### Managing tech stack (Wizard or Flags)
\`\`\`
/add stack                         # Opens wizard
/add stack --name="technology" --category="type" --version="1.0" && /view stack
/remove stack --name="old-package"
\`\`\`

## Error Handling
- Commands validate required arguments
- Projects must exist for project-specific commands
- Batch commands stop on first error
- Suggestions provided for similar commands/projects
- Use /help "command" for specific command help

## Best Practices
1. Use descriptive task and note names
2. Set priorities for important tasks
3. Add subtasks to break down complex todos
4. Use dev log to track progress
5. Document important decisions in notes
6. Keep tech stack updated
7. Use search to find content quickly
8. Export/summarize projects for sharing
9. Chain commands for related operations
10. Use the wizard for guided workflows

This terminal system is designed for efficient project management through a command-line interface. All operations are text-based and support natural language patterns while maintaining structured syntax.`;

    return {
      type: ResponseType.DATA,
      message: '🤖 LLM Terminal Interaction Guide',
      data: {
        summary: guide,
        format: 'text',
        fileName: 'llm-terminal-guide.txt',
        projectName: 'Terminal Guide',
        downloadable: true
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
