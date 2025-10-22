import { BaseCommandHandler } from './BaseCommandHandler';
import { CommandResponse, ResponseType } from '../commandExecutor';
import { ParsedCommand } from '../commandParser';
import { isValidStackCategory } from '../../utils/validation';
import { lookupTech } from '../../utils/techStackLookup';

/**
 * Handlers for unified tech stack management commands
 */
export class StackHandlers extends BaseCommandHandler {
  /**
   * Unified /add stack command (replaces /add tech and /add package)
   */
  async handleAddStack(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags) - this is an error
    if (parsed.args.length > 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add stack - Interactive wizard',
          '/add stack --name="React" --category=framework --version=18.2.0',
          '/add stack --name="Express" --category=api',
          '/help add stack'
        ]
      };
    }

    // No args and no flags - pull up wizard
    if (parsed.args.length === 0 && parsed.flags.size === 0) {
      return {
        type: ResponseType.PROMPT,
        message: `✨ Add New Stack Item`,
        data: {
          wizardType: 'add_stack',
          steps: [
            {
              id: 'name',
              label: 'Name',
              type: 'text',
              required: true,
              placeholder: 'Enter technology/package name (e.g., React, Express)'
            },
            {
              id: 'category',
              label: 'Category',
              type: 'select',
              options: ['framework', 'runtime', 'database', 'styling', 'deployment', 'testing', 'tooling', 'ui', 'state', 'routing', 'forms', 'animation', 'api', 'auth', 'data', 'utility'],
              required: true,
              value: 'framework'
            },
            {
              id: 'version',
              label: 'Version',
              type: 'text',
              required: false,
              placeholder: 'Optional version (e.g., 18.2.0)'
            },
            {
              id: 'description',
              label: 'Description',
              type: 'textarea',
              required: false,
              placeholder: 'Optional description'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_stack'
        }
      };
    }

    // Get name from flags (new syntax)
    const name = parsed.flags.get('name') as string;
    if (!name) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --name flag is required',
        suggestions: [
          '/add stack - Use wizard instead',
          '/add stack --name="React" --category=framework',
          '/help add stack'
        ]
      };
    }

    // Try to auto-detect from techStackData
    const lookup = lookupTech(name);

    // Use user-provided values or fall back to auto-detected values
    let category = parsed.flags.get('category') as string;
    let version = parsed.flags.get('version') as string;
    let description = parsed.flags.get('description') as string || '';
    let stackName = name;

    if (lookup.found) {
      // Auto-detected! Use the properly cased name from data
      stackName = lookup.name!;
      // Map the original category to one of our unified categories
      category = category || this.mapToUnifiedCategory(lookup.originalCategory!);
      version = version || lookup.version || '';
    } else {
      // Not in techStackData - require all fields
      if (!category) {
        return {
          type: ResponseType.ERROR,
          message: `"${name}" not found in tech database. Please specify --category`,
          suggestions: [
            '/add stack MyTech --category=framework --version=1.0',
            'Valid categories: framework, runtime, database, styling, deployment, testing, tooling, ui, state, routing, forms, animation, api, auth, data, utility'
          ]
        };
      }
    }

    if (!isValidStackCategory(category)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid category "${category}". Valid categories: framework, runtime, database, styling, deployment, testing, tooling, ui, state, routing, forms, animation, api, auth, data, utility`,
        suggestions: ['/add stack --name="React" --category=framework']
      };
    }

    const exists = project.stack?.some(
      (item: any) => item.name.toLowerCase() === stackName.toLowerCase()
    );

    if (exists) {
      return {
        type: ResponseType.ERROR,
        message: `"${stackName}" already exists in stack`,
        suggestions: [`/remove stack "${stackName}"`, '/view stack']
      };
    }

    if (!project.stack) {
      project.stack = [];
    }

    project.stack.push({ category, name: stackName, version, description });
    await project.save();

    return this.buildSuccessResponse(
      `⚡ Added ${stackName}${version ? ` v${version}` : ''} to stack${lookup.found ? ' (auto-detected)' : ''}`,
      project,
      'add_stack'
    );
  }

  /**
   * Map original category from techStackData to unified category
   */
  private mapToUnifiedCategory(originalCategory: string): string {
    const categoryMap: { [key: string]: string } = {
      // Frontend frameworks/libraries
      'frontend-framework': 'framework',
      'meta-framework': 'framework',
      'ui-library': 'ui',

      // Styling
      'styling': 'styling',

      // Backend
      'backend-language': 'runtime',
      'backend-framework': 'framework',

      // Database
      'database': 'database',
      'database-orm': 'data',

      // Mobile/Desktop
      'mobile-framework': 'framework',
      'desktop-framework': 'framework',

      // Infrastructure
      'hosting-deployment': 'deployment',
      'development-tools': 'tooling',

      // Testing
      'testing': 'testing',

      // Authentication
      'authentication': 'auth',

      // Utilities
      'payments': 'utility',
      'email': 'api',
      'file-storage': 'data',
      'analytics': 'data',
      'monitoring': 'utility',
      'cms': 'data',

      // Frontend-specific
      'state-management': 'state',
      'data-fetching': 'api',
      'forms': 'forms',
      'routing': 'routing',
      'animation': 'animation',
      'utilities': 'utility'
    };

    return categoryMap[originalCategory] || 'utility';
  }

  /**
   * Handle /view stack command
   */
  async handleViewStack(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const stack = resolution.project.stack || [];

    if (stack.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `⚡ No stack items defined for ${resolution.project.name}`,
        suggestions: ['/add stack', '/add stack --name="React" --category=framework', '/help add stack']
      };
    }

    return this.buildDataResponse(
      `⚡ Tech Stack for ${resolution.project.name} (${stack.length} items)`,
      resolution.project,
      'view_stack',
      {
        stack: stack.map((item: any) => ({
          name: item.name,
          category: item.category,
          version: item.version,
          description: item.description || ''
        }))
      }
    );
  }

  /**
   * Unified /remove stack command (replaces /remove tech and /remove package)
   */
  async handleRemoveStack(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const name = parsed.args.join(' ').trim();
    if (!name) {
      return {
        type: ResponseType.ERROR,
        message: 'Stack item name is required',
        suggestions: ['/help remove stack']
      };
    }

    // Try to get properly cased name from techStackData
    const lookup = lookupTech(name);
    const searchName = lookup.found ? lookup.name! : name;

    const stack = project.stack || [];
    // Search case-insensitively
    const index = stack.findIndex((item: any) => item.name.toLowerCase() === searchName.toLowerCase());

    if (index === -1) {
      return {
        type: ResponseType.ERROR,
        message: `"${searchName}" not found in stack`,
        suggestions: ['/view stack']
      };
    }

    const removedItem = stack[index];
    stack.splice(index, 1);
    project.stack = stack;
    await project.save();

    return this.buildSuccessResponse(
      `🗑️  Removed ${removedItem.name} from stack`,
      project,
      'remove_stack'
    );
  }
}
