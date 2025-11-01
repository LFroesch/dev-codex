import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { BaseCommandHandler } from '../BaseCommandHandler';
import { CommandResponse, ResponseType } from '../../types';
import { ParsedCommand, getFlag, getFlagCount, hasFlag } from '../../commandParser';
import { sanitizeText } from '../../../utils/validation';

/**
 * Handlers for Component CRUD operations
 */
export class ComponentHandlers extends BaseCommandHandler {
  async handleAddComponent(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (looking for "-" separator or args without flags) - this is an error
    const separatorIndex = parsed.args.indexOf('-');
    if (separatorIndex !== -1 || (parsed.args.length > 0 && getFlagCount(parsed.flags) === 0)) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add component - Interactive wizard',
          '/add component --feature="Auth" --category=backend --type=service --title="Login Service" --content="Handles user authentication"',
          '/add component --feature="Dashboard" --category=frontend --type=component --title="UserCard" --content="Displays user information"',
          '/help add component'
        ]
      };
    }

    // Get flags
    const feature = getFlag(parsed.flags, 'feature') as string;
    const category = getFlag(parsed.flags, 'category') as string;
    const type = getFlag(parsed.flags, 'type') as string;
    const title = getFlag(parsed.flags, 'title') as string;
    const content = getFlag(parsed.flags, 'content') as string;

    // No args and no flags - pull up wizard
    if (parsed.args.length === 0 && getFlagCount(parsed.flags) === 0) {
      const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];
      const typesByCategory: Record<string, string[]> = {
        frontend: ['page', 'component', 'hook', 'context', 'layout', 'util', 'custom'],
        backend: ['service', 'route', 'model', 'controller', 'middleware', 'util', 'custom'],
        database: ['schema', 'migration', 'seed', 'query', 'index', 'custom'],
        infrastructure: ['deployment', 'cicd', 'env', 'config', 'monitoring', 'docker', 'custom'],
        security: ['auth', 'authz', 'encryption', 'validation', 'sanitization', 'custom'],
        api: ['client', 'integration', 'webhook', 'contract', 'graphql', 'custom'],
        documentation: ['area', 'section', 'guide', 'architecture', 'api-doc', 'readme', 'changelog', 'custom'],
        asset: ['image', 'font', 'video', 'audio', 'document', 'dependency', 'custom']
      };

      return {
        type: ResponseType.PROMPT,
        message: `✨ Add New Component`,
        data: {
          wizardType: 'add_component',
          typesByCategory,
          steps: [
            {
              id: 'feature',
              label: 'Feature',
              type: 'text',
              required: true,
              placeholder: 'Enter feature name'
            },
            {
              id: 'category',
              label: 'Category',
              type: 'select',
              options: validCategories,
              required: true,
              value: 'frontend'
            },
            {
              id: 'type',
              label: 'Type',
              type: 'select',
              options: typesByCategory.frontend,
              required: true,
              value: 'component',
              dependsOn: 'category'
            },
            {
              id: 'title',
              label: 'Component Title',
              type: 'text',
              required: true,
              placeholder: 'Enter component title'
            },
            {
              id: 'content',
              label: 'Content',
              type: 'textarea',
              required: true,
              placeholder: 'Enter component description'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_component'
        }
      };
    }

    // Validate required flags
    if (!feature) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --feature flag is required',
        suggestions: [
          '/add component - Use wizard instead',
          '/add component --feature="FeatureName" --category=backend --type=service --title="Title" --content="Description"',
          '/help add component'
        ]
      };
    }

    if (!category) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --category flag is required',
        suggestions: [
          '/add component - Use wizard instead',
          'Valid categories: frontend, backend, database, infrastructure, security, api, documentation, asset',
          '/add component --feature="Auth" --category=backend --type=service --title="Login" --content="..."',
          '/help add component'
        ]
      };
    }

    if (!type) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --type flag is required',
        suggestions: [
          '/add component - Use wizard instead',
          'Common types: component, service, schema, config, auth, client, guide, dependency',
          '/add component --feature="Auth" --category=backend --type=service --title="Login" --content="..."',
          '/help add component'
        ]
      };
    }

    if (!title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --title flag is required',
        suggestions: [
          '/add component - Use wizard instead',
          '/add component --feature="Auth" --category=backend --type=service --title="Login Service" --content="..."',
          '/help add component'
        ]
      };
    }

    if (!content) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --content flag is required',
        suggestions: [
          '/add component - Use wizard instead',
          '/add component --feature="Auth" --category=backend --type=service --title="Login" --content="Handles authentication"',
          '/help add component'
        ]
      };
    }

    // Validate category
    const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];
    if (!validCategories.includes(category.toLowerCase())) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid category "${category}". Valid categories: ${validCategories.join(', ')}`,
        suggestions: ['/add component --feature="Auth" --category=backend --type=service --title="Login" --content="..."']
      };
    }

    // Sanitize inputs
    const sanitizedFeature = sanitizeText(feature);
    const sanitizedTitle = sanitizeText(title);
    const sanitizedContent = sanitizeText(content);
    const sanitizedType = sanitizeText(type);

    if (!sanitizedFeature || !sanitizedTitle || !sanitizedContent || !sanitizedType) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Feature, title, type, and content cannot be empty',
        suggestions: ['/help add component']
      };
    }

    const newComponent = {
      id: uuidv4(),
      category: category.toLowerCase() as any,
      type: sanitizedType,
      title: sanitizedTitle,
      content: sanitizedContent,
      feature: sanitizedFeature,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    project.components.push(newComponent);
    await project.save();

    return this.buildSuccessResponse(
      `🧩 Added ${category.toLowerCase()} component "${sanitizedTitle}" to feature "${sanitizedFeature}" in ${project.name}`,
      project,
      'add_component'
    );
  }

  /**
   * Handle /view notes command
   */

  async handleViewComponents(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const components = resolution.project.components || [];

    if (components.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `🧩 No components found in ${resolution.project.name}`,
        suggestions: [`/add component @${resolution.project.name}`]
      };
    }

    // Group components by feature
    const componentsByFeature: Record<string, any[]> = {};
    components.forEach((component: any) => {
      const featureKey = component.feature || 'Ungrouped';
      if (!componentsByFeature[featureKey]) {
        componentsByFeature[featureKey] = [];
      }
      componentsByFeature[featureKey].push({
        id: component.id,
        type: component.type,
        title: component.title,
        feature: component.feature,
        createdAt: component.createdAt
      });
    });

    return this.buildDataResponse(
      `🧩 Components in ${resolution.project.name} (${components.length} components, ${Object.keys(componentsByFeature).length} features)`,
      resolution.project,
      'view_components',
      {
        structure: componentsByFeature,
        components: components.map((component: any) => ({
          id: component.id,
          type: component.type,
          title: component.title,
          feature: component.feature,
          createdAt: component.createdAt
        }))
      }
    );
  }

  /**
   * Handle /search command
   */

  async handleEditComponent(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // If no args, show selector wizard
    if (parsed.args.length === 0) {
      const components = project.components || [];

      if (components.length === 0) {
        return {
          type: ResponseType.INFO,
          message: `📦 No components found in ${project.name}`,
          suggestions: [`/add component`, `/add component --title="Component Name" --type="feature"`]
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Component to Edit`,
        data: {
          wizardType: 'edit_component_selector',
          steps: [
            {
              id: 'componentId',
              label: 'Select Component',
              type: 'select',
              required: true,
              options: components.map((comp: any) => ({
                value: comp.id,
                label: `${comp.category || 'Uncategorized'} • ${comp.title} [${comp.type}]`
              }))
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_component_selector'
        }
      };
    }

    const identifier = parsed.args[0];
    const component = this.findComponent(project.components, identifier);

    if (!component) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Component not found: "${identifier}"`,
        suggestions: [
          '/view components - See all components with #IDs',
          '/help edit component'
        ]
      };
    }

    // Check for field flags - direct update mode
    const field = getFlag(parsed.flags, 'field') as string;
    const content = getFlag(parsed.flags, 'content') as string;

    // Check for relationship management flags
    if (field === 'relationship' || field === 'relationships') {
      const action = getFlag(parsed.flags, 'action') as string;
      const relId = getFlag(parsed.flags, 'id') as string;
      const target = getFlag(parsed.flags, 'target') as string;
      const relType = getFlag(parsed.flags, 'type') as string;
      const description = getFlag(parsed.flags, 'description') as string;

      if (!action || !['add', 'edit', 'delete'].includes(action.toLowerCase())) {
        return {
          type: ResponseType.ERROR,
          message: '❌ Relationship management requires --action=add|edit|delete (note: edit = delete + add)',
          suggestions: [
            '/edit component 1 --field=relationship --action=add --target=2 --type=uses',
            '/edit component 1 --field=relationship --action=delete --id=1'
          ]
        };
      }

      const actionLower = action.toLowerCase();

      // Add relationship
      if (actionLower === 'add') {
        if (!target || !relType) {
          return {
            type: ResponseType.ERROR,
            message: '❌ Adding relationship requires --target and --type',
            suggestions: ['/edit component 1 --field=relationship --action=add --target=2 --type=uses']
          };
        }

        const targetComponent = this.findComponent(project.components, target);
        if (!targetComponent) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Target component not found: "${target}"`,
            suggestions: ['/view components']
          };
        }

        const validTypes = ['uses', 'implements', 'extends', 'depends_on', 'calls', 'contains', 'mentions', 'similar'];
        if (!validTypes.includes(relType.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Invalid relationship type. Valid: ${validTypes.join(', ')}`,
            suggestions: ['/help edit component']
          };
        }

        if (!component.relationships) {
          component.relationships = [];
        }

        if (component.relationships.some((r: any) => r.targetId === targetComponent.id)) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Relationship already exists to "${targetComponent.title}". To change it, delete and re-add with new type.`,
            suggestions: [
              `/edit component "${component.title}" --field=relationship --action=delete --id=<relationship-id>`,
              `/edit component "${component.title}" --field=relationship --action=add --target=${targetComponent.id} --type=${relType}`
            ]
          };
        }

        // Create shared relationship ID for bidirectional linking
        const sharedRelationshipId = uuidv4();

        // Create forward relationship (A -> B)
        const forwardRelationship = {
          id: sharedRelationshipId,
          targetId: targetComponent.id,
          relationType: relType.toLowerCase() as any,
          description: sanitizeText(description || '')
        };

        // Create inverse relationship (B -> A)
        const inverseRelationship = {
          id: sharedRelationshipId,
          targetId: component.id,
          relationType: relType.toLowerCase() as any,
          description: sanitizeText(description || '')
        };

        // Add relationships to both components
        if (!targetComponent.relationships) {
          targetComponent.relationships = [];
        }

        component.relationships.push(forwardRelationship);
        targetComponent.relationships.push(inverseRelationship);

        component.updatedAt = new Date();
        targetComponent.updatedAt = new Date();
        await project.save();

        return this.buildSuccessResponse(
          `✅ Added ${relType} relationship: "${component.title}" ⇄ "${targetComponent.title}"`,
          project,
          'edit_component'
        );
      }

      // Edit relationship (implemented as delete + add)
      if (actionLower === 'edit') {
        if (!relId) {
          return {
            type: ResponseType.ERROR,
            message: '❌ Editing relationship requires --id. Note: This performs delete + add behind the scenes.',
            suggestions: ['/edit component 1 --field=relationship --action=edit --id=1 --type=depends_on']
          };
        }

        if (!component.relationships || component.relationships.length === 0) {
          return {
            type: ResponseType.ERROR,
            message: `❌ No relationships found for "${component.title}"`,
            suggestions: []
          };
        }

        let relationship: any = null;
        const relIndex = parseInt(relId);
        if (!isNaN(relIndex) && relIndex > 0 && relIndex <= component.relationships.length) {
          relationship = component.relationships[relIndex - 1];
        } else {
          relationship = component.relationships.find((r: any) => r.id === relId);
        }

        if (!relationship) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Relationship not found: "${relId}"`,
            suggestions: [`/view relationships "${component.title}"`]
          };
        }

        if (relType) {
          const validTypes = ['uses', 'implements', 'extends', 'depends_on', 'calls', 'contains', 'mentions', 'similar'];
          if (!validTypes.includes(relType.toLowerCase())) {
            return {
              type: ResponseType.ERROR,
              message: `❌ Invalid relationship type. Valid: ${validTypes.join(', ')}`,
              suggestions: ['/help edit component']
            };
          }
          relationship.relationType = relType.toLowerCase();
        }

        if (description !== undefined) {
          relationship.description = sanitizeText(description);
        }

        // Find and update the inverse relationship on the target component
        const targetComp = project.components.find((c: any) => c.id === relationship.targetId);
        if (targetComp && targetComp.relationships) {
          const inverseRelationship = targetComp.relationships.find((r: any) => r.id === relationship.id);
          if (inverseRelationship) {
            if (relType) {
              inverseRelationship.relationType = relType.toLowerCase();
            }
            if (description !== undefined) {
              inverseRelationship.description = sanitizeText(description);
            }
            targetComp.updatedAt = new Date();
          }
        }

        component.updatedAt = new Date();
        await project.save();

        return this.buildSuccessResponse(
          `✅ Updated relationship: "${component.title}" ⇄ "${targetComp?.title || 'unknown'}"`,
          project,
          'edit_component'
        );
      }

      // Delete relationship
      if (actionLower === 'delete') {
        if (!relId) {
          return {
            type: ResponseType.ERROR,
            message: '❌ Deleting relationship requires --id',
            suggestions: ['/edit component 1 --field=relationship --action=delete --id=1']
          };
        }

        if (!component.relationships || component.relationships.length === 0) {
          return {
            type: ResponseType.ERROR,
            message: `❌ No relationships found for "${component.title}"`,
            suggestions: []
          };
        }

        let relationshipIndex = -1;
        const relIndex = parseInt(relId);
        if (!isNaN(relIndex) && relIndex > 0 && relIndex <= component.relationships.length) {
          relationshipIndex = relIndex - 1;
        } else {
          relationshipIndex = component.relationships.findIndex((r: any) => r.id === relId);
        }

        if (relationshipIndex === -1) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Relationship not found: "${relId}"`,
            suggestions: []
          };
        }

        const relationship = component.relationships[relationshipIndex];
        const targetComp = project.components.find((c: any) => c.id === relationship.targetId);

        // Delete the relationship from source component
        component.relationships.splice(relationshipIndex, 1);
        component.updatedAt = new Date();

        // Remove the inverse relationship from the target component
        if (targetComp && targetComp.relationships) {
          const inverseRelationshipIndex = targetComp.relationships.findIndex((r: any) => r.id === relationship.id);
          if (inverseRelationshipIndex !== -1) {
            targetComp.relationships.splice(inverseRelationshipIndex, 1);
            targetComp.updatedAt = new Date();
          }
        }

        await project.save();

        return this.buildSuccessResponse(
          `🗑️  Deleted ${relationship.relationType} relationship: "${component.title}" ⇄ "${targetComp?.title || 'unknown'}"`,
          project,
          'edit_component'
        );
      }
    }

    // Check for direct flags (new syntax) - basic field editing
    const title = getFlag(parsed.flags, 'title') as string;
    const contentFlag = getFlag(parsed.flags, 'content') as string;
    const feature = getFlag(parsed.flags, 'feature') as string;
    const category = getFlag(parsed.flags, 'category') as string;
    const type = getFlag(parsed.flags, 'type') as string;

    // If any basic field flags are provided, update those fields
    if (title || contentFlag || feature || category || type) {
      let updated = false;
      const updatedFields: string[] = [];

      if (title) {
        const sanitizedTitle = sanitizeText(title);
        component.title = sanitizedTitle;
        updated = true;
        updatedFields.push('title');
      }

      if (contentFlag) {
        component.content = sanitizeText(contentFlag);
        updated = true;
        updatedFields.push('content');
      }

      if (feature) {
        const sanitizedFeature = sanitizeText(feature);
        component.feature = sanitizedFeature;
        updated = true;
        updatedFields.push('feature');
      }

      if (category) {
        const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];
        if (!validCategories.includes(category.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Invalid category: "${category}". Valid categories: ${validCategories.join(', ')}`,
            suggestions: ['/help edit component']
          };
        }
        component.category = category.toLowerCase() as any;
        updated = true;
        updatedFields.push('category');
      }

      if (type) {
        const sanitizedType = sanitizeText(type);
        component.type = sanitizedType;
        updated = true;
        updatedFields.push('type');
      }

      if (updated) {
        component.updatedAt = new Date();

        try {
          await project.save();
        } catch (saveError) {
          console.error('[EDIT COMPONENT] Save failed:', saveError);
          return {
            type: ResponseType.ERROR,
            message: `Failed to save component: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
            suggestions: ['/help edit component']
          };
        }

        return this.buildSuccessResponse(
          `🧩 Updated component (${updatedFields.join(', ')}): "${component.title}"`,
          project,
          'edit_component'
        );
      }
    }

    // Old --field=... --content=... syntax is now deprecated for basic fields
    // Keep it only for relationship management (already handled above)
    if (field && content && !['relationship', 'relationships'].includes(field)) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use direct flag syntax for basic fields.',
        suggestions: [
          '/edit component 1 --title="new title"',
          '/edit component 1 --content="new content" --category=backend',
          '/edit component 1 --feature="NewFeature" --type=service',
          '💡 For relationships, use: --field=relationship --action=add|edit|delete',
          '/help edit component'
        ]
      };
    }

    // No field flags - return interactive wizard with all fields including category, type, and relationships
    const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];

    // Get available types based on current category (simplified - frontend will use these as examples)
    const typesByCategory: Record<string, string[]> = {
      frontend: ['page', 'component', 'hook', 'context', 'layout', 'util', 'custom'],
      backend: ['service', 'route', 'model', 'controller', 'middleware', 'util', 'custom'],
      database: ['schema', 'migration', 'seed', 'query', 'index', 'custom'],
      infrastructure: ['deployment', 'cicd', 'env', 'config', 'monitoring', 'docker', 'custom'],
      security: ['auth', 'authz', 'encryption', 'validation', 'sanitization', 'custom'],
      api: ['client', 'integration', 'webhook', 'contract', 'graphql', 'custom'],
      documentation: ['area', 'section', 'guide', 'architecture', 'api-doc', 'readme', 'changelog', 'custom'],
      asset: ['image', 'font', 'video', 'audio', 'document', 'dependency', 'custom']
    };

    const currentTypes = typesByCategory[component.category] || ['custom'];

    return {
      type: ResponseType.PROMPT,
      message: `✏️ Edit Component: "${component.title}"`,
      data: {
        wizardType: 'edit_component',
        componentId: component.id,
        currentValues: {
          title: component.title,
          content: component.content,
          feature: component.feature,
          category: component.category,
          type: component.type,
          relationships: component.relationships || []
        },
        steps: [
          {
            id: 'title',
            label: 'Component Title',
            type: 'text',
            required: true,
            value: component.title
          },
          {
            id: 'feature',
            label: 'Feature',
            type: 'text',
            required: true,
            value: component.feature
          },
          {
            id: 'category',
            label: 'Category',
            type: 'select',
            options: validCategories,
            required: true,
            value: component.category
          },
          {
            id: 'type',
            label: 'Type',
            type: 'select',
            options: currentTypes,
            required: true,
            value: component.type,
            dependsOn: 'category'
          },
          {
            id: 'content',
            label: 'Content',
            type: 'textarea',
            required: true,
            value: component.content
          },
          {
            id: 'relationships',
            label: 'Relationships',
            type: 'relationships',
            required: false,
            value: component.relationships || [],
            allComponents: project.components
              .map((c: any) => ({ id: c.id, title: c.title, category: c.category, type: c.type })),
            availableComponents: project.components
              .filter((c: any) => c.id !== component.id && !component.relationships?.some((r: any) => r.targetId === c.id))
              .map((c: any) => ({ id: c.id, title: c.title, category: c.category, type: c.type }))
          }
        ]
      },
      metadata: {
        projectId: project._id.toString(),
        action: 'edit_component'
      }
    };
  }

  /**
   * Handle /delete todo command - Delete a todo with confirmation
   */

  async handleDeleteComponent(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const componentIdentifier = parsed.args.join(' ').trim();

    // No identifier provided - show selector wizard
    if (!componentIdentifier) {
      if (project.components.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No components to delete',
          suggestions: ['/add component']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Component to Delete`,
        data: {
          wizardType: 'delete_component_selector',
          steps: [
            {
              id: 'componentId',
              label: 'Select Component',
              type: 'select',
              options: project.components.map((c: any) => ({
                value: c.id,
                label: `${c.title} (${c.category})`
              })),
              required: true,
              placeholder: 'Select component to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_component_selector'
        }
      };
    }

    const component = this.findComponent(project.components, componentIdentifier);

    if (!component) {
      return {
        type: ResponseType.ERROR,
        message: `Component not found: "${componentIdentifier}"`,
        suggestions: ['/view components', '/help delete component']
      };
    }

    const hasConfirmation = hasFlag(parsed.flags, 'confirm') || hasFlag(parsed.flags, 'yes') || hasFlag(parsed.flags, 'y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_component_confirm',
          confirmationData: {
            itemTitle: component.title,
            itemType: 'component',
            command: `/delete component "${component.title}" --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete the component "${component.title}"?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_component_confirm'
        }
      };
    }

    const componentTitle = component.title;
    const componentId = component.id;

    // Remove the component itself
    project.components = project.components.filter((c: any) => c.id !== componentId);

    // Clean up orphaned relationships: remove all relationships FROM other components TO this deleted component
    let orphanedRelationshipsCount = 0;
    project.components.forEach((c: any) => {
      if (c.relationships && c.relationships.length > 0) {
        const originalCount = c.relationships.length;
        c.relationships = c.relationships.filter((r: any) => r.targetId !== componentId);
        const removedCount = originalCount - c.relationships.length;
        if (removedCount > 0) {
          orphanedRelationshipsCount += removedCount;
          c.updatedAt = new Date();
        }
      }
    });

    await project.save();

    const message = orphanedRelationshipsCount > 0
      ? `🗑️  Deleted component: "${componentTitle}" and removed ${orphanedRelationshipsCount} orphaned relationship${orphanedRelationshipsCount > 1 ? 's' : ''}`
      : `🗑️  Deleted component: "${componentTitle}"`;

    return this.buildSuccessResponse(
      message,
      project,
      'delete_component'
    );
  }

  /**
   * Find a component by UUID, index, or title
   */
  private findComponent(components: any[], identifier: string): any | null {
    // Try by UUID
    const byUuid = components.find((comp: any) => comp.id === identifier);
    if (byUuid) return byUuid;

    // Try by index (1-based)
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= components.length) {
      return components[index - 1];
    }

    // Try by partial title match
    const identifierLower = identifier.toLowerCase();
    return components.find((comp: any) =>
      comp.title.toLowerCase().includes(identifierLower)
    ) || null;
  }
}
