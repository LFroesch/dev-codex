import { BaseCommandHandler } from './BaseCommandHandler';
import { CommandResponse, ResponseType } from '../commandExecutor';
import { ParsedCommand, CommandParser, COMMAND_METADATA } from '../commandParser';
import { User } from '../../models/User';
import { Project } from '../../models/Project';
import { logError } from '../../config/logger';

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
      'Add Items': [],
      'Remove Items': [],
      'View Items': [],
      'Project Management': [],
      'Other': []
    };

    commands.forEach(cmd => {
      const cmdType = cmd.type.toString();

      if (cmdType.startsWith('add_')) {
        grouped['Add Items'].push(cmd);
      } else if (cmdType.startsWith('remove_') && cmdType !== 'remove_member') {
        grouped['Remove Items'].push(cmd);
      } else if (cmdType.startsWith('view_')) {
        grouped['View Items'].push(cmd);
      } else if ([
        'swap_project',
        'export',
        'set_name',
        'set_description',
        'set_deployment',
        'set_public',
        'invite_member',
        'remove_member'
      ].includes(cmdType)) {
        grouped['Project Management'].push(cmd);
      } else {
        grouped['Other'].push(cmd);
      }
    });

    return {
      type: ResponseType.INFO,
      message: '📚 Available Commands',
      data: { grouped }
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
   * Generate project summary in different formats
   */
  private generateProjectSummary(project: any, format: string): string {
    const todos = project.todos || [];
    const notes = project.notes || [];
    const devLog = project.devLog || [];
    const docs = project.docs || [];
    const tech = project.selectedTechnologies || [];
    const packages = project.selectedPackages || [];

    // Count stats
    const completedTodos = todos.filter((t: any) => t.completed).length;
    const highPriorityTodos = todos.filter((t: any) => t.priority === 'high' && !t.completed).length;
    const activeTodos = todos.filter((t: any) => !t.completed);

    switch (format) {
      case 'json':
        return JSON.stringify({
          name: project.name,
          description: project.description,
          category: project.category,
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
            docs: docs.length
          },
          techStack: {
            technologies: tech,
            packages: packages
          },
          todos: activeTodos.map((t: any) => ({
            text: t.text,
            description: t.description,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate
          })),
          recentActivity: devLog.slice(0, 5).map((e: any) => ({
            title: e.title,
            entry: e.entry,
            date: e.date
          })),
          deployment: project.deploymentData || null,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }, null, 2);

      case 'prompt':
        let prompt = `# AI Assistant Context for "${project.name}"\n\n`;
        prompt += `## 🤖 REQUEST:\n[Replace this with your specific request or question about the project]\n\n`;
        prompt += `## 📋 PROJECT OVERVIEW\n\n`;
        prompt += `**Name:** ${project.name}\n`;
        if (project.description) prompt += `**Description:** ${project.description}\n`;
        prompt += `**Category:** ${project.category || 'General'}\n`;
        if (project.tags && project.tags.length > 0) {
          prompt += `**Tags:** ${project.tags.join(', ')}\n`;
        }

        // Tech Stack
        if (tech.length > 0 || packages.length > 0) {
          prompt += `\n## ⚡ TECH STACK\n\n`;
          if (tech.length > 0) {
            prompt += `**Technologies:** ${tech.map((t: any) => `${t.name}${t.version ? ` v${t.version}` : ''}`).join(', ')}\n`;
          }
          if (packages.length > 0) {
            prompt += `**Packages:** ${packages.map((p: any) => p.name).join(', ')}\n`;
          }
        }

        // Tasks
        if (todos.length > 0) {
          prompt += `\n## ✅ TASKS (${completedTodos}/${todos.length} completed)\n\n`;
          if (activeTodos.length > 0) {
            prompt += `**🚧 Active Tasks:**\n`;
            activeTodos.slice(0, 10).forEach((todo: any) => {
              prompt += `- ${todo.text}`;
              if (todo.priority) prompt += ` [${todo.priority.toUpperCase()}]`;
              if (todo.dueDate) prompt += ` (Due: ${new Date(todo.dueDate).toLocaleDateString()})`;
              prompt += `\n`;
            });
          }
        }

        // Recent Activity
        if (devLog.length > 0) {
          prompt += `\n## 📝 RECENT DEVELOPMENT LOG\n\n`;
          devLog.slice(0, 5).forEach((entry: any) => {
            prompt += `**${entry.title || 'Entry'}** (${new Date(entry.date).toLocaleDateString()})\n`;
            prompt += `${entry.entry.substring(0, 200)}${entry.entry.length > 200 ? '...' : ''}\n\n`;
          });
        }

        // Deployment
        if (project.deploymentData?.liveUrl) {
          prompt += `## 🚀 DEPLOYMENT\n\n`;
          prompt += `**Live URL:** ${project.deploymentData.liveUrl}\n`;
          prompt += `**Platform:** ${project.deploymentData.deploymentPlatform || 'N/A'}\n`;
          prompt += `**Status:** ${project.deploymentData.deploymentStatus || 'N/A'}\n`;
        }

        return prompt;

      case 'markdown':
        let md = `# ${project.name}\n\n`;
        if (project.description) md += `${project.description}\n\n`;
        md += `**Category:** ${project.category || 'Uncategorized'}\n`;
        if (project.tags && project.tags.length > 0) {
          md += `**Tags:** ${project.tags.join(', ')}\n`;
        }
        md += `\n---\n\n`;

        // Stats
        md += `## 📊 Project Stats\n\n`;
        md += `- **Todos:** ${completedTodos}/${todos.length} completed\n`;
        md += `- **High Priority:** ${highPriorityTodos} remaining\n`;
        md += `- **Notes:** ${notes.length}\n`;
        md += `- **Dev Log Entries:** ${devLog.length}\n`;
        md += `- **Docs:** ${docs.length}\n\n`;

        // Tech Stack
        if (tech.length > 0 || packages.length > 0) {
          md += `## 🛠️ Tech Stack\n\n`;
          if (tech.length > 0) {
            md += `### Technologies\n`;
            tech.forEach((t: any) => {
              md += `- **${t.name}** (${t.category})${t.version ? ` v${t.version}` : ''}\n`;
            });
            md += `\n`;
          }
          if (packages.length > 0) {
            md += `### Packages\n`;
            packages.forEach((p: any) => {
              md += `- ${p.name}${p.version ? ` v${p.version}` : ''}\n`;
            });
            md += `\n`;
          }
        }

        // Active Todos
        if (activeTodos.length > 0) {
          md += `## ✅ Active Todos\n\n`;
          activeTodos.slice(0, 15).forEach((todo: any) => {
            const priority = todo.priority === 'high' ? '🔴' : todo.priority === 'medium' ? '🟡' : '🟢';
            md += `- ${priority} ${todo.text}`;
            if (todo.dueDate) md += ` (Due: ${new Date(todo.dueDate).toLocaleDateString()})`;
            md += `\n`;
          });
          if (activeTodos.length > 15) {
            md += `\n*...and ${activeTodos.length - 15} more*\n`;
          }
          md += `\n`;
        }

        // Recent Dev Log
        if (devLog.length > 0) {
          md += `## 📝 Recent Activity\n\n`;
          devLog.slice(0, 5).forEach((entry: any) => {
            md += `### ${entry.title}\n`;
            md += `${entry.entry}\n`;
            md += `*${new Date(entry.date).toLocaleDateString()}*\n\n`;
          });
        }

        // Deployment
        if (project.deploymentData?.liveUrl) {
          md += `## 🚀 Deployment\n\n`;
          md += `- **Live URL:** ${project.deploymentData.liveUrl}\n`;
          md += `- **Platform:** ${project.deploymentData.deploymentPlatform || 'N/A'}\n`;
          md += `- **Status:** ${project.deploymentData.deploymentStatus || 'N/A'}\n\n`;
        }

        return md;

      case 'text':
      default:
        let text = `${project.name}\n${'='.repeat(project.name.length)}\n\n`;
        if (project.description) text += `${project.description}\n\n`;
        text += `Category: ${project.category || 'Uncategorized'}\n`;
        if (project.tags && project.tags.length > 0) {
          text += `Tags: ${project.tags.join(', ')}\n`;
        }
        text += `\n`;
        text += `STATISTICS\n`;
        text += `----------\n`;
        text += `Todos: ${completedTodos}/${todos.length} completed\n`;
        text += `High Priority: ${highPriorityTodos} remaining\n`;
        text += `Notes: ${notes.length}\n`;
        text += `Dev Log Entries: ${devLog.length}\n`;
        text += `Docs: ${docs.length}\n\n`;

        if (tech.length > 0) {
          text += `TECH STACK\n`;
          text += `----------\n`;
          tech.forEach((t: any) => {
            text += `- ${t.name} (${t.category})\n`;
          });
          text += `\n`;
        }

        if (activeTodos.length > 0) {
          text += `ACTIVE TODOS\n`;
          text += `------------\n`;
          activeTodos.slice(0, 10).forEach((todo: any) => {
            text += `[${todo.priority?.toUpperCase() || 'MED'}] ${todo.text}\n`;
          });
          text += `\n`;
        }

        return text;
    }
  }

  /**
   * Handle /view news command
   */
  async handleViewNews(): Promise<CommandResponse> {
    try {
      const News = require('../../models/News').default;

      const newsPosts = await News.find({ status: 'published' })
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
      { name: 'dim', description: 'Dim gray theme' },
      { name: 'light', description: 'Light theme' },
      { name: 'dark', description: 'Dark theme' },
      { name: 'cupcake', description: 'Sweet pink theme' },
      { name: 'bumblebee', description: 'Yellow and black' },
      { name: 'emerald', description: 'Green theme' },
      { name: 'retro', description: 'Vintage style' },
      { name: 'cyberpunk', description: 'Futuristic neon' },
      { name: 'synthwave', description: 'Retrowave style' },
      { name: 'forest', description: 'Nature green' },
      { name: 'aqua', description: 'Ocean blue' },
      { name: 'lofi', description: 'Calm and minimal' },
      { name: 'pastel', description: 'Soft colors' },
      { name: 'fantasy', description: 'Purple fantasy' },
      { name: 'wireframe', description: 'Minimal lines' },
      { name: 'black', description: 'Pure black' },
      { name: 'luxury', description: 'Gold and black' },
      { name: 'dracula', description: 'Dracula purple' },
      { name: 'cmyk', description: 'Print colors' },
      { name: 'autumn', description: 'Fall colors' },
      { name: 'business', description: 'Professional blue' },
      { name: 'acid', description: 'Bright lime' },
      { name: 'lemonade', description: 'Lemon yellow' },
      { name: 'night', description: 'Deep night blue' },
      { name: 'coffee', description: 'Brown coffee' },
      { name: 'winter', description: 'Cool winter' },
      { name: 'nord', description: 'Nordic theme' },
      { name: 'sunset', description: 'Sunset orange' }
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
            type: 'preset'
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
            type: 'preset'
          })),
          customThemes: []
        },
        suggestions: ['/set theme dark', '/set theme light']
      };
    }
  }

  /**
   * Handle wizard commands
   */
  handleWizard(parsed: ParsedCommand): CommandResponse {
    return {
      type: ResponseType.INFO,
      message: `🧙 ${parsed.command} wizard coming soon!`,
      suggestions: ['/help']
    };
  }
}
