import { BaseCommandHandler } from './BaseCommandHandler';
import { CommandResponse, ResponseType } from '../types';
import { ParsedCommand, getFlag, getFlagCount, hasFlag } from '../commandParser';
import { sanitizeText, validateProjectName, isValidUrl, isValidDeploymentStatus } from '../../utils/validation';
import { User as UserModel } from '../../models/User';

/**
 * Handlers for project settings and configuration commands
 */
export class SettingsHandlers extends BaseCommandHandler {
  /**
   * Handle /view settings command
   */
  async handleViewSettings(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    return this.buildDataResponse(
      `⚙️ Settings for ${resolution.project.name}`,
      resolution.project,
      'view_settings',
      {
        settings: {
          name: resolution.project.name,
          description: resolution.project.description,
          category: resolution.project.category,
          tags: resolution.project.tags || [],
          color: resolution.project.color,
          environment: resolution.project.stagingEnvironment
        }
      }
    );
  }

  /**
   * Handle /set name command
   */
  async handleSetName(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const newName = parsed.args.join(' ').trim();
    const validation = validateProjectName(newName);

    if (!validation.isValid) {
      return {
        type: ResponseType.ERROR,
        message: validation.error!,
        suggestions: ['/set name My New Project Name']
      };
    }

    const oldName = resolution.project.name;
    resolution.project.name = validation.sanitized;
    await resolution.project.save();

    return this.buildSuccessResponse(
      `✏️ Renamed "${oldName}" to "${validation.sanitized}"`,
      resolution.project,
      'set_name'
    );
  }

  /**
   * Handle /set description command
   */
  async handleSetDescription(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const newDescription = sanitizeText(parsed.args.join(' ').trim());
    if (!newDescription) {
      return {
        type: ResponseType.ERROR,
        message: 'New description is required',
        suggestions: ['/set description A web app for managing tasks']
      };
    }

    resolution.project.description = newDescription;
    await resolution.project.save();

    return this.buildSuccessResponse(
      `📝 Updated description for ${resolution.project.name}`,
      resolution.project,
      'set_description'
    );
  }

  /**
   * Handle /add tag command
   */
  async handleAddTag(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const tag = sanitizeText(parsed.args[0]);
    if (!tag) {
      return {
        type: ResponseType.ERROR,
        message: 'Tag name is required',
        suggestions: ['/add tag react']
      };
    }

    if (!resolution.project.tags) {
      resolution.project.tags = [];
    }

    if (resolution.project.tags.includes(tag)) {
      return {
        type: ResponseType.ERROR,
        message: `Tag "${tag}" already exists`,
        suggestions: ['/view settings']
      };
    }

    resolution.project.tags.push(tag);
    await resolution.project.save();

    return this.buildSuccessResponse(
      `🏷️ Added tag "${tag}" to ${resolution.project.name}`,
      resolution.project,
      'add_tag'
    );
  }

  /**
   * Handle /remove tag command
   */
  async handleRemoveTag(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const tag = parsed.args[0];
    if (!tag) {
      return {
        type: ResponseType.ERROR,
        message: 'Tag name is required',
        suggestions: ['/remove tag react']
      };
    }

    const tags = resolution.project.tags || [];
    const index = tags.indexOf(tag);

    if (index === -1) {
      return {
        type: ResponseType.ERROR,
        message: `Tag "${tag}" not found`,
        suggestions: ['/view settings']
      };
    }

    tags.splice(index, 1);
    resolution.project.tags = tags;
    await resolution.project.save();

    return this.buildSuccessResponse(
      `🗑️ Removed tag "${tag}" from ${resolution.project.name}`,
      resolution.project,
      'remove_tag'
    );
  }

  /**
   * Handle /view deployment command
   */
  async handleViewDeployment(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const dd = resolution.project.deploymentData || {};

    return this.buildDataResponse(
      `🚀 Deployment info for ${resolution.project.name}`,
      resolution.project,
      'view_deployment',
      {
        deployment: {
          liveUrl: dd.liveUrl || 'Not set',
          githubRepo: dd.githubRepo || 'Not set',
          platform: dd.deploymentPlatform || 'Not set',
          status: dd.deploymentStatus || 'inactive',
          lastDeploy: dd.lastDeployDate || 'Never',
          branch: dd.deploymentBranch || 'main',
          buildCommand: dd.buildCommand || 'Not set',
          startCommand: dd.startCommand || 'Not set'
        }
      }
    );
  }

  /**
   * Handle /set deployment command
   */
  async handleSetDeployment(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const deploymentData = project.deploymentData || {};
    let updated = false;

    if (hasFlag(parsed.flags, 'url')) {
      const url = getFlag(parsed.flags, 'url') as string;
      if (url && !isValidUrl(url)) {
        return {
          type: ResponseType.ERROR,
          message: 'Invalid URL format. Must start with http:// or https://',
          suggestions: ['/set deployment --url=https://example.com']
        };
      }
      deploymentData.liveUrl = url;
      updated = true;
    }

    if (hasFlag(parsed.flags, 'platform')) {
      deploymentData.deploymentPlatform = getFlag(parsed.flags, 'platform') as string;
      updated = true;
    }

    if (hasFlag(parsed.flags, 'status')) {
      const status = getFlag(parsed.flags, 'status') as string;
      if (!isValidDeploymentStatus(status)) {
        return {
          type: ResponseType.ERROR,
          message: 'Invalid status. Must be: active, inactive, or error',
          suggestions: ['/set deployment --status=active']
        };
      }
      deploymentData.deploymentStatus = status;
      updated = true;
    }

    if (hasFlag(parsed.flags, 'branch')) {
      deploymentData.deploymentBranch = getFlag(parsed.flags, 'branch') as string;
      updated = true;
    }

    if (hasFlag(parsed.flags, 'github')) {
      deploymentData.githubRepo = getFlag(parsed.flags, 'github') as string;
      updated = true;
    }

    if (hasFlag(parsed.flags, 'build')) {
      deploymentData.buildCommand = getFlag(parsed.flags, 'build') as string;
      updated = true;
    }

    if (hasFlag(parsed.flags, 'start')) {
      deploymentData.startCommand = getFlag(parsed.flags, 'start') as string;
      updated = true;
    }

    if (hasFlag(parsed.flags, 'lastDeploy')) {
      const dateStr = getFlag(parsed.flags, 'lastDeploy') as string;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return {
          type: ResponseType.ERROR,
          message: 'Invalid date format for --lastDeploy',
          suggestions: ['/set deployment --lastDeploy="2025-10-25"']
        };
      }
      deploymentData.lastDeployDate = date;
      updated = true;
    }

    if (!updated) {
      return {
        type: ResponseType.ERROR,
        message: 'No deployment data provided. Use flags like --url, --platform, --status, --branch, --github, --build, --start, --lastDeploy',
        suggestions: ['/help set deployment']
      };
    }

    project.deploymentData = deploymentData;
    await project.save();

    return this.buildSuccessResponse(
      `🚀 Updated deployment settings for ${project.name}`,
      project,
      'set_deployment'
    );
  }

  /**
   * Handle /view public command
   */
  async handleViewPublic(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    return this.buildDataResponse(
      `🌐 Public settings for ${resolution.project.name}`,
      resolution.project,
      'view_public',
      {
        publicSettings: {
          isPublic: resolution.project.isPublic || false,
          slug: resolution.project.publicSlug || 'Not set',
          description: resolution.project.publicDescription || 'Not set',
          url: resolution.project.isPublic && resolution.project.publicSlug
            ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/public/${resolution.project.publicSlug}`
            : 'Not available (project is private)'
        }
      }
    );
  }

  /**
   * Handle /set public command
   */
  async handleSetPublic(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    let updated = false;

    if (parsed.command.includes('make public')) {
      resolution.project.isPublic = true;
      updated = true;
    } else if (parsed.command.includes('make private')) {
      resolution.project.isPublic = false;
      updated = true;
    }

    if (hasFlag(parsed.flags, 'enabled')) {
      resolution.project.isPublic = getFlag(parsed.flags, 'enabled') === 'true';
      updated = true;
    }

    if (hasFlag(parsed.flags, 'slug')) {
      resolution.project.publicSlug = sanitizeText(getFlag(parsed.flags, 'slug') as string);
      updated = true;
    }

    if (!updated) {
      return {
        type: ResponseType.ERROR,
        message: 'Use --enabled=true/false or --slug=your-slug',
        suggestions: ['/make public --slug=my-project', '/make private']
      };
    }

    await resolution.project.save();

    return this.buildSuccessResponse(
      `🌐 Project is now ${resolution.project.isPublic ? 'public' : 'private'}`,
      resolution.project,
      'set_public'
    );
  }

  /**
   * Handle /set ai command — configure AI context limits
   */
  async handleSetAI(parsed: ParsedCommand): Promise<CommandResponse> {
    const user = await UserModel.findById(this.userId);
    if (!user) {
      return { type: ResponseType.ERROR, message: 'User not found' };
    }

    const maxTodos = getFlag(parsed.flags, 'max-todos');
    const maxNotes = getFlag(parsed.flags, 'max-notes');
    const maxDevLogs = getFlag(parsed.flags, 'max-devlogs');
    const maxFeatures = getFlag(parsed.flags, 'max-features');

    const hasChanges = maxTodos || maxNotes || maxDevLogs || maxFeatures;

    if (!hasChanges) {
      // Show current settings
      const ctx = user.aiContext || { maxTodos: 25, maxNotes: 15, maxDevLogs: 10, maxFeatures: 15 };
      return {
        type: ResponseType.DATA,
        message: 'AI Context Settings',
        data: {
          action: 'view_ai_settings',
          settings: [
            { label: 'Max Todos', value: ctx.maxTodos, flag: '--max-todos' },
            { label: 'Max Notes', value: ctx.maxNotes, flag: '--max-notes' },
            { label: 'Max Dev Logs', value: ctx.maxDevLogs, flag: '--max-devlogs' },
            { label: 'Max Features', value: ctx.maxFeatures, flag: '--max-features' },
          ],
          hint: 'These control how many items of each type are included in AI context. Higher = more informed AI but more tokens.',
        },
        suggestions: ['/set ai --max-todos=50', '/set ai --max-notes=25 --max-devlogs=20']
      };
    }

    // Validate and apply changes
    const clamp = (val: string | boolean | undefined, min: number, max: number): number | null => {
      if (!val || typeof val === 'boolean') return null;
      const n = parseInt(val, 10);
      if (isNaN(n)) return null;
      return Math.max(min, Math.min(max, n));
    };

    const updates: string[] = [];
    if (maxTodos) {
      const v = clamp(maxTodos, 0, 100);
      if (v !== null) { user.aiContext.maxTodos = v; updates.push(`maxTodos=${v}`); }
    }
    if (maxNotes) {
      const v = clamp(maxNotes, 0, 50);
      if (v !== null) { user.aiContext.maxNotes = v; updates.push(`maxNotes=${v}`); }
    }
    if (maxDevLogs) {
      const v = clamp(maxDevLogs, 0, 50);
      if (v !== null) { user.aiContext.maxDevLogs = v; updates.push(`maxDevLogs=${v}`); }
    }
    if (maxFeatures) {
      const v = clamp(maxFeatures, 0, 50);
      if (v !== null) { user.aiContext.maxFeatures = v; updates.push(`maxFeatures=${v}`); }
    }

    if (updates.length === 0) {
      return { type: ResponseType.ERROR, message: 'Invalid values. Use numbers, e.g. --max-todos=50', suggestions: ['/set ai --max-todos=50'] };
    }

    await user.save();

    return {
      type: ResponseType.SUCCESS,
      message: `AI context updated: ${updates.join(', ')}`,
      suggestions: ['/set ai']
    };
  }
}
