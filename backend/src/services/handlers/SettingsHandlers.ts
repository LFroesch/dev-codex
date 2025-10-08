import { BaseCommandHandler } from './BaseCommandHandler';
import { CommandResponse, ResponseType } from '../commandExecutor';
import { ParsedCommand } from '../commandParser';
import { sanitizeText, validateProjectName, isValidUrl, isValidDeploymentStatus } from '../../utils/validation';

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

    if (parsed.flags.has('url')) {
      const url = parsed.flags.get('url') as string;
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

    if (parsed.flags.has('platform')) {
      deploymentData.deploymentPlatform = parsed.flags.get('platform') as string;
      updated = true;
    }

    if (parsed.flags.has('status')) {
      const status = parsed.flags.get('status') as string;
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

    if (parsed.flags.has('branch')) {
      deploymentData.deploymentBranch = parsed.flags.get('branch') as string;
      updated = true;
    }

    if (!updated) {
      return {
        type: ResponseType.ERROR,
        message: 'No deployment data provided. Use flags like --url, --platform, --status, --branch',
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

    if (parsed.flags.has('enabled')) {
      resolution.project.isPublic = parsed.flags.get('enabled') === 'true';
      updated = true;
    }

    if (parsed.flags.has('slug')) {
      resolution.project.publicSlug = sanitizeText(parsed.flags.get('slug') as string);
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
}
