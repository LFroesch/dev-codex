import { BaseCommandHandler } from './BaseCommandHandler';
import { CommandResponse, ResponseType } from '../commandExecutor';
import { ParsedCommand } from '../commandParser';
import { isValidTechCategory, isValidPackageCategory } from '../../utils/validation';

/**
 * Handlers for tech stack and package management commands
 */
export class StackHandlers extends BaseCommandHandler {
  /**
   * Handle /add tech command
   */
  async handleAddTech(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const name = parsed.args[0];
    if (!name) {
      return {
        type: ResponseType.ERROR,
        message: 'Technology name is required',
        suggestions: ['/help add tech']
      };
    }

    const category = (parsed.flags.get('category') as string) || 'framework';
    const version = (parsed.flags.get('version') as string) || '';

    if (!isValidTechCategory(category)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid category "${category}". Valid: styling, database, framework, runtime, deployment, testing, tooling`,
        suggestions: ['/add tech React --category=framework']
      };
    }

    const exists = project.selectedTechnologies?.some(
      (t: any) => t.name === name && t.category === category
    );

    if (exists) {
      return {
        type: ResponseType.ERROR,
        message: `Technology "${name}" already exists in ${category}`,
        suggestions: [`/remove tech ${name}`, '/view stack']
      };
    }

    if (!project.selectedTechnologies) {
      project.selectedTechnologies = [];
    }

    project.selectedTechnologies.push({ category, name, version });
    await project.save();

    return this.buildSuccessResponse(
      `⚡ Added ${name}${version ? ` v${version}` : ''} to tech stack`,
      project,
      'add_tech'
    );
  }

  /**
   * Handle /add package command
   */
  async handleAddPackage(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const name = parsed.args[0];
    if (!name) {
      return {
        type: ResponseType.ERROR,
        message: 'Package name is required',
        suggestions: ['/help add package']
      };
    }

    const category = (parsed.flags.get('category') as string) || 'utility';
    const version = (parsed.flags.get('version') as string) || '';

    if (!isValidPackageCategory(category)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid category "${category}". Valid: ui, state, routing, forms, animation, utility, api, auth, data`,
        suggestions: ['/add package express --category=api']
      };
    }

    const exists = project.selectedPackages?.some(
      (p: any) => p.name === name && p.category === category
    );

    if (exists) {
      return {
        type: ResponseType.ERROR,
        message: `Package "${name}" already exists in ${category}`,
        suggestions: [`/remove package ${name}`, '/view stack']
      };
    }

    if (!project.selectedPackages) {
      project.selectedPackages = [];
    }

    project.selectedPackages.push({ category, name, version });
    await project.save();

    return this.buildSuccessResponse(
      `📦 Added ${name}${version ? ` v${version}` : ''} to packages`,
      project,
      'add_package'
    );
  }

  /**
   * Handle /view stack command
   */
  async handleViewStack(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const technologies = resolution.project.selectedTechnologies || [];
    const packages = resolution.project.selectedPackages || [];

    if (technologies.length === 0 && packages.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `⚡ No tech stack defined for ${resolution.project.name}`,
        suggestions: ['/add tech React --category=framework', '/add package express --category=api']
      };
    }

    return this.buildDataResponse(
      `⚡ Tech Stack for ${resolution.project.name}`,
      resolution.project,
      'view_stack',
      {
        stack: {
          technologies: technologies.map((t: any) => ({
            name: t.name,
            category: t.category,
            version: t.version
          })),
          packages: packages.map((p: any) => ({
            name: p.name,
            category: p.category,
            version: p.version
          }))
        }
      }
    );
  }

  /**
   * Handle /remove tech command
   */
  async handleRemoveTech(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const name = parsed.args[0];
    if (!name) {
      return {
        type: ResponseType.ERROR,
        message: 'Technology name is required',
        suggestions: ['/help remove tech']
      };
    }

    const technologies = project.selectedTechnologies || [];
    const index = technologies.findIndex((t: any) => t.name === name);

    if (index === -1) {
      return {
        type: ResponseType.ERROR,
        message: `Technology "${name}" not found in stack`,
        suggestions: ['/view stack']
      };
    }

    technologies.splice(index, 1);
    project.selectedTechnologies = technologies;
    await project.save();

    return this.buildSuccessResponse(
      `🗑️ Removed ${name} from tech stack`,
      project,
      'remove_tech'
    );
  }

  /**
   * Handle /remove package command
   */
  async handleRemovePackage(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const name = parsed.args[0];
    if (!name) {
      return {
        type: ResponseType.ERROR,
        message: 'Package name is required',
        suggestions: ['/help remove package']
      };
    }

    const packages = project.selectedPackages || [];
    const index = packages.findIndex((p: any) => p.name === name);

    if (index === -1) {
      return {
        type: ResponseType.ERROR,
        message: `Package "${name}" not found`,
        suggestions: ['/view stack']
      };
    }

    packages.splice(index, 1);
    project.selectedPackages = packages;
    await project.save();

    return this.buildSuccessResponse(
      `🗑️ Removed ${name} from packages`,
      project,
      'remove_package'
    );
  }
}
