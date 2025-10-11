import { BaseCommandHandler } from './BaseCommandHandler';
import { CommandResponse, ResponseType } from '../commandExecutor';
import { ParsedCommand } from '../commandParser';
import { isValidTechCategory, isValidPackageCategory } from '../../utils/validation';
import { lookupTech } from '../../utils/techStackLookup';

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

    // Try to auto-detect from techStackData
    const lookup = lookupTech(name);

    // Use user-provided values or fall back to auto-detected values
    let category = parsed.flags.get('category') as string;
    let version = parsed.flags.get('version') as string;
    let techName = name;

    if (lookup.found) {
      // Auto-detected! Use the properly cased name from data
      techName = lookup.name!;
      category = category || lookup.category!;
      version = version || lookup.version || '';
    } else {
      // Not in techStackData - require all fields
      if (!category || !version) {
        return {
          type: ResponseType.ERROR,
          message: `"${name}" not found in tech database. Please specify --category and --version`,
          suggestions: ['/add tech React --category=framework --version=18.2']
        };
      }
    }

    if (!isValidTechCategory(category)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid category "${category}". Valid: styling, database, framework, runtime, deployment, testing, tooling`,
        suggestions: ['/add tech React --category=framework']
      };
    }

    const exists = project.selectedTechnologies?.some(
      (t: any) => t.name === techName && t.category === category
    );

    if (exists) {
      return {
        type: ResponseType.ERROR,
        message: `Technology "${techName}" already exists in ${category}`,
        suggestions: [`/remove tech ${techName}`, '/view stack']
      };
    }

    if (!project.selectedTechnologies) {
      project.selectedTechnologies = [];
    }

    project.selectedTechnologies.push({ category, name: techName, version });
    await project.save();

    return this.buildSuccessResponse(
      `⚡ Added ${techName}${version ? ` v${version}` : ''}${lookup.found ? ' (auto-detected)' : ''} to tech stack`,
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

    // Try to auto-detect from techStackData
    const lookup = lookupTech(name);

    // Use user-provided values or fall back to auto-detected values
    let category = parsed.flags.get('category') as string;
    let version = parsed.flags.get('version') as string;
    let packageName = name;

    if (lookup.found) {
      // Auto-detected! Use the properly cased name from data
      packageName = lookup.name!;
      // For packages, use the package category mapping
      const packageCategory = this.mapFrontendCategoryToPackage(lookup.originalCategory!);
      category = category || packageCategory;
      version = version || lookup.version || '';
    } else {
      // Not in techStackData - require all fields
      if (!category || !version) {
        return {
          type: ResponseType.ERROR,
          message: `"${name}" not found in tech database. Please specify --category and --version`,
          suggestions: ['/add package lodash --category=utility --version=4.17']
        };
      }
    }

    if (!isValidPackageCategory(category)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid category "${category}". Valid: ui, state, routing, forms, animation, utility, api, auth, data`,
        suggestions: ['/add package express --category=api']
      };
    }

    const exists = project.selectedPackages?.some(
      (p: any) => p.name === packageName && p.category === category
    );

    if (exists) {
      return {
        type: ResponseType.ERROR,
        message: `Package "${packageName}" already exists in ${category}`,
        suggestions: [`/remove package ${packageName}`, '/view stack']
      };
    }

    if (!project.selectedPackages) {
      project.selectedPackages = [];
    }

    project.selectedPackages.push({ category, name: packageName, version });
    await project.save();

    return this.buildSuccessResponse(
      `📦 Added ${packageName}${version ? ` v${version}` : ''}${lookup.found ? ' (auto-detected)' : ''} to packages`,
      project,
      'add_package'
    );
  }

  /**
   * Map frontend category to package category
   */
  private mapFrontendCategoryToPackage(frontendCategory: string): string {
    const categoryMap: { [key: string]: string } = {
      'frontend-framework': 'ui',
      'meta-framework': 'ui',
      'ui-library': 'ui',
      'styling': 'ui',
      'backend-language': 'api',
      'backend-framework': 'api',
      'database': 'data',
      'database-orm': 'data',
      'mobile-framework': 'ui',
      'desktop-framework': 'ui',
      'hosting-deployment': 'utility',
      'development-tools': 'utility',
      'testing': 'utility',
      'authentication': 'auth',
      'payments': 'utility',
      'email': 'api',
      'file-storage': 'data',
      'analytics': 'data',
      'monitoring': 'utility',
      'cms': 'data',
      'state-management': 'state',
      'data-fetching': 'api',
      'forms': 'forms',
      'routing': 'routing',
      'animation': 'animation',
      'utilities': 'utility'
    };

    return categoryMap[frontendCategory] || 'utility';
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

    // Try to get properly cased name from techStackData
    const lookup = lookupTech(name);
    const searchName = lookup.found ? lookup.name! : name;

    const technologies = project.selectedTechnologies || [];
    // Search case-insensitively
    const index = technologies.findIndex((t: any) => t.name.toLowerCase() === searchName.toLowerCase());

    if (index === -1) {
      return {
        type: ResponseType.ERROR,
        message: `Technology "${searchName}" not found in stack`,
        suggestions: ['/view stack']
      };
    }

    const removedTech = technologies[index];
    technologies.splice(index, 1);
    project.selectedTechnologies = technologies;
    await project.save();

    return this.buildSuccessResponse(
      `🗑️ Removed ${removedTech.name} from tech stack`,
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

    // Try to get properly cased name from techStackData
    const lookup = lookupTech(name);
    const searchName = lookup.found ? lookup.name! : name;

    const packages = project.selectedPackages || [];
    // Search case-insensitively
    const index = packages.findIndex((p: any) => p.name.toLowerCase() === searchName.toLowerCase());

    if (index === -1) {
      return {
        type: ResponseType.ERROR,
        message: `Package "${searchName}" not found`,
        suggestions: ['/view stack']
      };
    }

    const removedPackage = packages[index];
    packages.splice(index, 1);
    project.selectedPackages = packages;
    await project.save();

    return this.buildSuccessResponse(
      `🗑️ Removed ${removedPackage.name} from packages`,
      project,
      'remove_package'
    );
  }
}
