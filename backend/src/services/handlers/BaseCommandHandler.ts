import mongoose from 'mongoose';
import { Project } from '../../models/Project';
import TeamMember from '../../models/TeamMember';
import { logError } from '../../config/logger';
import { ResponseType, CommandResponse } from '../commandExecutor';
import { projectCache } from '../ProjectCache';

/**
 * Project resolution result
 */
export interface ProjectResolution {
  project: any | null;
  error?: string;
  needsSelection?: boolean;
  availableProjects?: any[];
  suggestions?: string[];
}

/**
 * Base handler class with common functionality for all command handlers
 */
export class BaseCommandHandler {
  protected userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Get all projects accessible by user (with caching)
   */
  protected async getUserProjects(bypassCache: boolean = false): Promise<any[]> {
    // Check cache first
    if (!bypassCache) {
      const cached = projectCache.get(this.userId);
      if (cached) {
        // Return full project objects from cache
        const projectIds = cached.map(c => new mongoose.Types.ObjectId(c._id));
        return await Project.find({ _id: { $in: projectIds } }).lean();
      }
    }

    // Cache miss - fetch from database
    const ownedProjects = await Project.find({
      $or: [
        { userId: this.userId },
        { ownerId: this.userId }
      ]
    }).select('_id name ownerId userId isArchived updatedAt')
      .lean();

    const teamProjectIds = await TeamMember.find({ userId: this.userId })
      .select('projectId')
      .lean()
      .then(memberships => memberships.map(tm => tm.projectId));

    const teamProjects = teamProjectIds.length > 0
      ? await Project.find({
          _id: { $in: teamProjectIds },
          $nor: [
            { userId: this.userId },
            { ownerId: this.userId }
          ]
        }).select('_id name ownerId userId isArchived updatedAt')
        .lean()
      : [];

    const allProjectsSummary = [...ownedProjects, ...teamProjects];

    // Cache the project summaries
    projectCache.set(
      this.userId,
      allProjectsSummary.map(p => ({
        _id: p._id.toString(),
        name: p.name,
        ownerId: p.ownerId?.toString() || p.userId.toString(),
        userId: p.userId.toString(),
        isArchived: p.isArchived || false,
        updatedAt: p.updatedAt
      }))
    );

    // Return full project objects for immediate use
    const projectIds = allProjectsSummary.map(p => p._id);
    return await Project.find({ _id: { $in: projectIds } }).lean();
  }

  /**
   * Resolve project from mention or current context (optimized)
   */
  protected async resolveProject(
    projectMention?: string,
    currentProjectId?: string
  ): Promise<ProjectResolution> {
    try {
      // Priority 1: Use @mentioned project
      if (projectMention) {
        // Use cache to find project by name (faster than DB query)
        const cached = projectCache.get(this.userId);
        let project: any = null;

        if (cached) {
          const match = cached.find(p => p.name.toLowerCase() === projectMention.toLowerCase());
          if (match) {
            project = await Project.findById(match._id);
          }
        }

        // Fallback to database if not in cache
        if (!project) {
          project = await Project.findOne({
            $or: [
              { userId: this.userId },
              { ownerId: this.userId }
            ],
            name: new RegExp(`^${projectMention}$`, 'i')
          });
        }

        // Check team projects if not found in owned
        if (!project) {
          const teamProjectIds = await TeamMember.find({ userId: this.userId })
            .select('projectId')
            .lean();

          if (teamProjectIds.length > 0) {
            project = await Project.findOne({
              _id: { $in: teamProjectIds.map(tm => tm.projectId) },
              name: new RegExp(`^${projectMention}$`, 'i')
            });
          }
        }

        if (!project) {
          const allProjects = await this.getUserProjects();
          const suggestions = allProjects
            .filter(p => p.name.toLowerCase().includes(projectMention.toLowerCase()))
            .map(p => p.name)
            .slice(0, 5);

          return {
            project: null,
            error: `Project "@${projectMention}" not found`,
            suggestions: suggestions.length > 0
              ? [`Did you mean: ${suggestions.join(', ')}?`]
              : undefined
          };
        }

        return { project };
      }

      // Priority 2: Use current project context
      if (currentProjectId) {
        const project = await Project.findById(currentProjectId);
        if (project) {
          const hasAccess = await this.verifyProjectAccess(currentProjectId);
          if (hasAccess) {
            return { project };
          }
        }
      }

      // Priority 3: Prompt user to select project
      const userProjects = await this.getUserProjects();

      if (userProjects.length === 0) {
        return {
          project: null,
          error: 'No projects found. Create a project first with /wizard new'
        };
      }

      return {
        project: null,
        needsSelection: true,
        availableProjects: userProjects.map(p => ({
          id: p._id.toString(),
          name: p.name,
          description: p.description
        }))
      };
    } catch (error) {
      logError('Project resolution error', error as Error, { userId: this.userId });
      return {
        project: null,
        error: 'Failed to resolve project'
      };
    }
  }

  /**
   * Verify user has access to a project
   */
  protected async verifyProjectAccess(projectId: string): Promise<boolean> {
    const project = await Project.findById(projectId);
    if (!project) return false;

    if (project.userId?.toString() === this.userId ||
        project.ownerId?.toString() === this.userId) {
      return true;
    }

    const teamMember = await TeamMember.findOne({
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(this.userId)
    });

    return !!teamMember;
  }

  /**
   * Get user's role in a project
   */
  protected async getUserRole(projectId: string): Promise<'owner' | 'editor' | 'viewer' | null> {
    const project = await Project.findById(projectId);
    if (!project) return null;

    if (project.userId?.toString() === this.userId ||
        project.ownerId?.toString() === this.userId) {
      return 'owner';
    }

    const teamMember = await TeamMember.findOne({
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(this.userId)
    });

    return teamMember?.role || null;
  }

  /**
   * Check if user can edit a project
   */
  protected async canEditProject(projectId: string): Promise<{ canEdit: boolean; role: string | null }> {
    const role = await this.getUserRole(projectId);
    if (!role) {
      return { canEdit: false, role: null };
    }
    return { canEdit: role !== 'viewer', role };
  }

  /**
   * Resolve project and check edit permissions
   */
  protected async resolveProjectWithEditCheck(
    projectMention?: string,
    currentProjectId?: string
  ): Promise<{ project: any | null; error?: CommandResponse }> {
    const resolution = await this.resolveProject(projectMention, currentProjectId);

    if (!resolution.project) {
      if (resolution.needsSelection) {
        return {
          project: null,
          error: {
            type: ResponseType.PROMPT,
            message: 'Please specify a project using @projectname or select from:',
            data: { projects: resolution.availableProjects }
          }
        };
      }
      return {
        project: null,
        error: {
          type: ResponseType.ERROR,
          message: resolution.error || 'Project not found',
          suggestions: resolution.suggestions
        }
      };
    }

    const { canEdit, role } = await this.canEditProject(resolution.project._id.toString());
    if (!canEdit) {
      return {
        project: null,
        error: {
          type: ResponseType.ERROR,
          message: `❌ You are a ${role} and do not have edit permissions for this project`,
          suggestions: []
        }
      };
    }

    return { project: resolution.project };
  }

  /**
   * Build standard error response for project resolution
   */
  protected buildProjectErrorResponse(resolution: ProjectResolution): CommandResponse {
    if (resolution.needsSelection) {
      return {
        type: ResponseType.PROMPT,
        message: 'Please specify a project using @projectname or select from:',
        data: { projects: resolution.availableProjects }
      };
    }

    return {
      type: ResponseType.ERROR,
      message: resolution.error || 'Project not found',
      suggestions: resolution.suggestions
    };
  }

  /**
   * Build success response with project metadata
   */
  protected buildSuccessResponse(
    message: string,
    project: any,
    action: string,
    data?: any
  ): CommandResponse {
    return {
      type: ResponseType.SUCCESS,
      message,
      data,
      metadata: {
        projectId: project._id.toString(),
        projectName: project.name,
        action,
        timestamp: new Date()
      }
    };
  }

  /**
   * Build data response with project metadata
   */
  protected buildDataResponse(
    message: string,
    project: any,
    action: string,
    data: any
  ): CommandResponse {
    return {
      type: ResponseType.DATA,
      message,
      data,
      metadata: {
        projectId: project._id.toString(),
        projectName: project.name,
        action
      }
    };
  }
}
