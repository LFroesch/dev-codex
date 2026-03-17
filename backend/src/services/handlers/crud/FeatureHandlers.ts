import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { BaseCommandHandler } from '../BaseCommandHandler';
import { CommandResponse, ResponseType } from '../../types';
import { ParsedCommand, getFlag, getFlagCount, hasFlag } from '../../commandParser';
import { sanitizeText } from '../../../utils/validation';
import { AnalyticsService } from '../../../middleware/analytics';

/**
 * Handlers for Feature CRUD operations
 */
export class FeatureHandlers extends BaseCommandHandler {
  async handleAddFeature(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (looking for "-" separator or args without flags) - this is an error
    const separatorIndex = parsed.args.indexOf('-');
    if (separatorIndex !== -1 || (parsed.args.length > 0 && getFlagCount(parsed.flags) === 0)) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add feature - Interactive wizard',
          '/add feature --group="Auth" --category=backend --type=service --title="Login Service" --content="Handles user authentication"',
          '/add feature --group="Dashboard" --category=frontend --type=component --title="UserCard" --content="Displays user information"',
          '/help add feature'
        ]
      };
    }

    // Get flags
    const group = getFlag(parsed.flags, 'group') as string;
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
        message: `✨ Add New Feature`,
        data: {
          wizardType: 'add_feature',
          typesByCategory,
          steps: [
            {
              id: 'group',
              label: 'Group',
              type: 'text',
              required: true,
              placeholder: 'Enter group name'
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
              label: 'Feature Title',
              type: 'text',
              required: true,
              placeholder: 'Enter feature title'
            },
            {
              id: 'content',
              label: 'Content',
              type: 'textarea',
              required: true,
              placeholder: 'Enter feature description'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_feature'
        }
      };
    }

    // Validate required flags
    if (!group) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --group flag is required',
        suggestions: [
          '/add feature - Use wizard instead',
          '/add feature --group="GroupName" --category=backend --type=service --title="Title" --content="Description"',
          '/help add feature'
        ]
      };
    }

    if (!category) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --category flag is required',
        suggestions: [
          '/add feature - Use wizard instead',
          'Valid categories: frontend, backend, database, infrastructure, security, api, documentation, asset',
          '/add feature --group="Auth" --category=backend --type=service --title="Login" --content="..."',
          '/help add feature'
        ]
      };
    }

    if (!type) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --type flag is required',
        suggestions: [
          '/add feature - Use wizard instead',
          'Common types: component, service, schema, config, auth, client, guide, dependency',
          '/add feature --group="Auth" --category=backend --type=service --title="Login" --content="..."',
          '/help add feature'
        ]
      };
    }

    if (!title) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --title flag is required',
        suggestions: [
          '/add feature - Use wizard instead',
          '/add feature --group="Auth" --category=backend --type=service --title="Login Service" --content="..."',
          '/help add feature'
        ]
      };
    }

    if (!content) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --content flag is required',
        suggestions: [
          '/add feature - Use wizard instead',
          '/add feature --group="Auth" --category=backend --type=service --title="Login" --content="Handles authentication"',
          '/help add feature'
        ]
      };
    }

    // Validate category
    const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];
    if (!validCategories.includes(category.toLowerCase())) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Invalid category "${category}". Valid categories: ${validCategories.join(', ')}`,
        suggestions: ['/add feature --group="Auth" --category=backend --type=service --title="Login" --content="..."']
      };
    }

    // Sanitize inputs
    const sanitizedGroup = sanitizeText(group);
    const sanitizedTitle = sanitizeText(title);
    const sanitizedContent = sanitizeText(content);
    const sanitizedType = sanitizeText(type);

    if (!sanitizedGroup || !sanitizedTitle || !sanitizedContent || !sanitizedType) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Group, title, type, and content cannot be empty',
        suggestions: ['/help add feature']
      };
    }

    const newFeature = {
      id: uuidv4(),
      category: category.toLowerCase() as any,
      type: sanitizedType,
      title: sanitizedTitle,
      content: sanitizedContent,
      group: sanitizedGroup,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    project.features.push(newFeature);
    await project.save();

    // Track analytics
    try {
      await AnalyticsService.trackEvent(this.userId, 'feature_used', {
        feature: 'feature_create_terminal',
        category: 'engagement',
        projectId: project._id.toString(),
        projectName: project.name,
        metadata: {
          featureCategory: category,
          featureType: type
        }
      });
    } catch (error) {

    }

    return this.buildSuccessResponse(
      `🧩 Added ${category.toLowerCase()} feature "${sanitizedTitle}" to group "${sanitizedGroup}" in ${project.name}`,
      project,
      'add_feature'
    );
  }

  async handleViewFeatures(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const features = resolution.project.features || [];

    if (features.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `🧩 No features found in ${resolution.project.name}`,
        suggestions: [`/add feature @${resolution.project.name}`]
      };
    }

    // Group features by group
    const featuresByGroup: Record<string, any[]> = {};
    features.forEach((feature: any) => {
      const groupKey = feature.group || 'Ungrouped';
      if (!featuresByGroup[groupKey]) {
        featuresByGroup[groupKey] = [];
      }
      featuresByGroup[groupKey].push({
        id: feature.id,
        type: feature.type,
        title: feature.title,
        group: feature.group,
        createdAt: feature.createdAt
      });
    });

    return this.buildDataResponse(
      `🧩 Features in ${resolution.project.name} (${features.length} features, ${Object.keys(featuresByGroup).length} groups)`,
      resolution.project,
      'view_features',
      {
        structure: featuresByGroup,
        features: features.map((feature: any) => ({
          id: feature.id,
          type: feature.type,
          title: feature.title,
          group: feature.group,
          createdAt: feature.createdAt
        }))
      }
    );
  }

  async handleEditFeature(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // If no args, show selector wizard
    if (parsed.args.length === 0) {
      const features = project.features || [];

      if (features.length === 0) {
        return {
          type: ResponseType.INFO,
          message: `📦 No features found in ${project.name}`,
          suggestions: [`/add feature`, `/add feature --title="Feature Name" --type="service"`]
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Feature to Edit`,
        data: {
          wizardType: 'edit_feature_selector',
          steps: [
            {
              id: 'featureId',
              label: 'Select Feature',
              type: 'select',
              required: true,
              options: features.map((f: any) => ({
                value: f.id,
                label: `${f.category || 'Uncategorized'} • ${f.title} [${f.type}]`
              }))
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_feature_selector'
        }
      };
    }

    const identifier = parsed.args[0];
    const feature = this.findFeature(project.features, identifier);

    if (!feature) {
      return {
        type: ResponseType.ERROR,
        message: `❌ Feature not found: "${identifier}"`,
        suggestions: [
          '/view features - See all features with #IDs',
          '/help edit feature'
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
            '/edit feature 1 --field=relationship --action=add --target=2 --type=uses',
            '/edit feature 1 --field=relationship --action=delete --id=1'
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
            suggestions: ['/edit feature 1 --field=relationship --action=add --target=2 --type=uses']
          };
        }

        const targetFeature = this.findFeature(project.features, target);
        if (!targetFeature) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Target feature not found: "${target}"`,
            suggestions: ['/view features']
          };
        }

        const validTypes = ['uses', 'depends_on'];
        if (!validTypes.includes(relType.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Invalid relationship type. Valid: ${validTypes.join(', ')}`,
            suggestions: ['/help edit feature']
          };
        }

        if (!feature.relationships) {
          feature.relationships = [];
        }

        if (feature.relationships.some((r: any) => r.targetId === targetFeature.id)) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Relationship already exists to "${targetFeature.title}". To change it, delete and re-add with new type.`,
            suggestions: [
              `/edit feature "${feature.title}" --field=relationship --action=delete --id=<relationship-id>`,
              `/edit feature "${feature.title}" --field=relationship --action=add --target=${targetFeature.id} --type=${relType}`
            ]
          };
        }

        // Create shared relationship ID for bidirectional linking
        const sharedRelationshipId = uuidv4();

        // Create forward relationship (A -> B)
        const forwardRelationship = {
          id: sharedRelationshipId,
          targetId: targetFeature.id,
          relationType: relType.toLowerCase() as any,
          description: sanitizeText(description || '')
        };

        // Create inverse relationship (B -> A)
        const inverseRelationship = {
          id: sharedRelationshipId,
          targetId: feature.id,
          relationType: relType.toLowerCase() as any,
          description: sanitizeText(description || '')
        };

        // Add relationships to both features
        if (!targetFeature.relationships) {
          targetFeature.relationships = [];
        }

        feature.relationships.push(forwardRelationship);
        targetFeature.relationships.push(inverseRelationship);

        feature.updatedAt = new Date();
        targetFeature.updatedAt = new Date();
        await project.save();

        return this.buildSuccessResponse(
          `✅ Added ${relType} relationship: "${feature.title}" ⇄ "${targetFeature.title}"`,
          project,
          'edit_feature'
        );
      }

      // Edit relationship (implemented as delete + add)
      if (actionLower === 'edit') {
        if (!relId) {
          return {
            type: ResponseType.ERROR,
            message: '❌ Editing relationship requires --id. Note: This performs delete + add behind the scenes.',
            suggestions: ['/edit feature 1 --field=relationship --action=edit --id=1 --type=depends_on']
          };
        }

        if (!feature.relationships || feature.relationships.length === 0) {
          return {
            type: ResponseType.ERROR,
            message: `❌ No relationships found for "${feature.title}"`,
            suggestions: []
          };
        }

        let relationship: any = null;
        const relIndex = parseInt(relId);
        if (!isNaN(relIndex) && relIndex > 0 && relIndex <= feature.relationships.length) {
          relationship = feature.relationships[relIndex - 1];
        } else {
          relationship = feature.relationships.find((r: any) => r.id === relId);
        }

        if (!relationship) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Relationship not found: "${relId}"`,
            suggestions: [`/view relationships "${feature.title}"`]
          };
        }

        if (relType) {
          const validTypes = ['uses', 'depends_on'];
          if (!validTypes.includes(relType.toLowerCase())) {
            return {
              type: ResponseType.ERROR,
              message: `❌ Invalid relationship type. Valid: ${validTypes.join(', ')}`,
              suggestions: ['/help edit feature']
            };
          }
          relationship.relationType = relType.toLowerCase();
        }

        if (description !== undefined) {
          relationship.description = sanitizeText(description);
        }

        // Find and update the inverse relationship on the target feature
        const targetFeat = project.features.find((f: any) => f.id === relationship.targetId);
        if (targetFeat && targetFeat.relationships) {
          const inverseRelationship = targetFeat.relationships.find((r: any) => r.id === relationship.id);
          if (inverseRelationship) {
            if (relType) {
              inverseRelationship.relationType = relType.toLowerCase();
            }
            if (description !== undefined) {
              inverseRelationship.description = sanitizeText(description);
            }
            targetFeat.updatedAt = new Date();
          }
        }

        feature.updatedAt = new Date();
        await project.save();

        return this.buildSuccessResponse(
          `✅ Updated relationship: "${feature.title}" ⇄ "${targetFeat?.title || 'unknown'}"`,
          project,
          'edit_feature'
        );
      }

      // Delete relationship
      if (actionLower === 'delete') {
        if (!relId) {
          return {
            type: ResponseType.ERROR,
            message: '❌ Deleting relationship requires --id',
            suggestions: ['/edit feature 1 --field=relationship --action=delete --id=1']
          };
        }

        if (!feature.relationships || feature.relationships.length === 0) {
          return {
            type: ResponseType.ERROR,
            message: `❌ No relationships found for "${feature.title}"`,
            suggestions: []
          };
        }

        let relationshipIndex = -1;
        const relIndex = parseInt(relId);
        if (!isNaN(relIndex) && relIndex > 0 && relIndex <= feature.relationships.length) {
          relationshipIndex = relIndex - 1;
        } else {
          relationshipIndex = feature.relationships.findIndex((r: any) => r.id === relId);
        }

        if (relationshipIndex === -1) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Relationship not found: "${relId}"`,
            suggestions: []
          };
        }

        const relationship = feature.relationships[relationshipIndex];
        const targetFeat = project.features.find((f: any) => f.id === relationship.targetId);

        // Delete the relationship from source feature
        feature.relationships.splice(relationshipIndex, 1);
        feature.updatedAt = new Date();

        // Remove the inverse relationship from the target feature
        if (targetFeat && targetFeat.relationships) {
          const inverseRelationshipIndex = targetFeat.relationships.findIndex((r: any) => r.id === relationship.id);
          if (inverseRelationshipIndex !== -1) {
            targetFeat.relationships.splice(inverseRelationshipIndex, 1);
            targetFeat.updatedAt = new Date();
          }
        }

        await project.save();

        return this.buildSuccessResponse(
          `🗑️  Deleted ${relationship.relationType} relationship: "${feature.title}" ⇄ "${targetFeat?.title || 'unknown'}"`,
          project,
          'edit_feature'
        );
      }
    }

    // Check for direct flags (new syntax) - basic field editing
    const title = getFlag(parsed.flags, 'title') as string;
    const contentFlag = getFlag(parsed.flags, 'content') as string;
    const group = getFlag(parsed.flags, 'group') as string;
    const category = getFlag(parsed.flags, 'category') as string;
    const type = getFlag(parsed.flags, 'type') as string;

    // If any basic field flags are provided, update those fields
    if (title || contentFlag || group || category || type) {
      let updated = false;
      const updatedFields: string[] = [];

      if (title) {
        const sanitizedTitle = sanitizeText(title);
        feature.title = sanitizedTitle;
        updated = true;
        updatedFields.push('title');
      }

      if (contentFlag) {
        feature.content = sanitizeText(contentFlag);
        updated = true;
        updatedFields.push('content');
      }

      if (group) {
        const sanitizedGroup = sanitizeText(group);
        feature.group = sanitizedGroup;
        updated = true;
        updatedFields.push('group');
      }

      if (category) {
        const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];
        if (!validCategories.includes(category.toLowerCase())) {
          return {
            type: ResponseType.ERROR,
            message: `❌ Invalid category: "${category}". Valid categories: ${validCategories.join(', ')}`,
            suggestions: ['/help edit feature']
          };
        }
        feature.category = category.toLowerCase() as any;
        updated = true;
        updatedFields.push('category');
      }

      if (type) {
        const sanitizedType = sanitizeText(type);
        feature.type = sanitizedType;
        updated = true;
        updatedFields.push('type');
      }

      if (updated) {
        feature.updatedAt = new Date();

        try {
          await project.save();
        } catch (saveError) {

          return {
            type: ResponseType.ERROR,
            message: `Failed to save feature: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
            suggestions: ['/help edit feature']
          };
        }

        return this.buildSuccessResponse(
          `🧩 Updated feature (${updatedFields.join(', ')}): "${feature.title}"`,
          project,
          'edit_feature'
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
          '/edit feature 1 --title="new title"',
          '/edit feature 1 --content="new content" --category=backend',
          '/edit feature 1 --group="NewGroup" --type=service',
          '💡 For relationships, use: --field=relationship --action=add|edit|delete',
          '/help edit feature'
        ]
      };
    }

    // No field flags - return interactive wizard with all fields including category, type, and relationships
    const validCategories = ['frontend', 'backend', 'database', 'infrastructure', 'security', 'api', 'documentation', 'asset'];

    // Get available types based on current category
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

    const currentTypes = typesByCategory[feature.category] || ['custom'];

    return {
      type: ResponseType.PROMPT,
      message: `✏️ Edit Feature: "${feature.title}"`,
      data: {
        wizardType: 'edit_feature',
        featureId: feature.id,
        currentValues: {
          title: feature.title,
          content: feature.content,
          group: feature.group,
          category: feature.category,
          type: feature.type,
          relationships: feature.relationships || []
        },
        steps: [
          {
            id: 'title',
            label: 'Feature Title',
            type: 'text',
            required: true,
            value: feature.title
          },
          {
            id: 'group',
            label: 'Group',
            type: 'text',
            required: true,
            value: feature.group
          },
          {
            id: 'category',
            label: 'Category',
            type: 'select',
            options: validCategories,
            required: true,
            value: feature.category
          },
          {
            id: 'type',
            label: 'Type',
            type: 'select',
            options: currentTypes,
            required: true,
            value: feature.type,
            dependsOn: 'category'
          },
          {
            id: 'content',
            label: 'Content',
            type: 'textarea',
            required: true,
            value: feature.content
          },
          {
            id: 'relationships',
            label: 'Relationships',
            type: 'relationships',
            required: false,
            value: feature.relationships || [],
            allFeatures: project.features
              .map((f: any) => ({ id: f.id, title: f.title, category: f.category, type: f.type })),
            availableFeatures: project.features
              .filter((f: any) => f.id !== feature.id && !feature.relationships?.some((r: any) => r.targetId === f.id))
              .map((f: any) => ({ id: f.id, title: f.title, category: f.category, type: f.type }))
          }
        ]
      },
      metadata: {
        projectId: project._id.toString(),
        action: 'edit_feature'
      }
    };
  }

  async handleDeleteFeature(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    const featureIdentifier = parsed.args.join(' ').trim();

    // No identifier provided - show selector wizard
    if (!featureIdentifier) {
      if (project.features.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No features to delete',
          suggestions: ['/add feature']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Feature to Delete`,
        data: {
          wizardType: 'delete_feature_selector',
          steps: [
            {
              id: 'featureId',
              label: 'Select Feature',
              type: 'select',
              options: project.features.map((f: any) => ({
                value: f.id,
                label: `${f.title} (${f.category})`
              })),
              required: true,
              placeholder: 'Select feature to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_feature_selector'
        }
      };
    }

    const feature = this.findFeature(project.features, featureIdentifier);

    if (!feature) {
      return {
        type: ResponseType.ERROR,
        message: `Feature not found: "${featureIdentifier}"`,
        suggestions: ['/view features', '/help delete feature']
      };
    }

    const hasConfirmation = hasFlag(parsed.flags, 'confirm') || hasFlag(parsed.flags, 'yes') || hasFlag(parsed.flags, 'y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_feature_confirm',
          confirmationData: {
            itemTitle: feature.title,
            itemType: 'feature',
            command: `/delete feature "${feature.title}" --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete the feature "${feature.title}"?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_feature_confirm'
        }
      };
    }

    const featureTitle = feature.title;
    const featureId = feature.id;

    // Remove the feature itself
    project.features = project.features.filter((f: any) => f.id !== featureId);

    // Clean up orphaned relationships: remove all relationships FROM other features TO this deleted feature
    let orphanedRelationshipsCount = 0;
    project.features.forEach((f: any) => {
      if (f.relationships && f.relationships.length > 0) {
        const originalCount = f.relationships.length;
        f.relationships = f.relationships.filter((r: any) => r.targetId !== featureId);
        const removedCount = originalCount - f.relationships.length;
        if (removedCount > 0) {
          orphanedRelationshipsCount += removedCount;
          f.updatedAt = new Date();
        }
      }
    });

    await project.save();

    // Track analytics
    try {
      await AnalyticsService.trackEvent(this.userId, 'feature_used', {
        feature: 'feature_delete_terminal',
        category: 'engagement',
        projectId: project._id.toString(),
        projectName: project.name
      });
    } catch (error) {

    }

    const message = orphanedRelationshipsCount > 0
      ? `🗑️  Deleted feature: "${featureTitle}" and removed ${orphanedRelationshipsCount} orphaned relationship${orphanedRelationshipsCount > 1 ? 's' : ''}`
      : `🗑️  Deleted feature: "${featureTitle}"`;

    return this.buildSuccessResponse(
      message,
      project,
      'delete_feature'
    );
  }

  /**
   * Find a feature by UUID, index, or title
   */
  private findFeature(features: any[], identifier: string): any | null {
    // Try by UUID
    const byUuid = features.find((f: any) => f.id === identifier);
    if (byUuid) return byUuid;

    // Try by index (1-based)
    const index = parseInt(identifier);
    if (!isNaN(index) && index > 0 && index <= features.length) {
      return features[index - 1];
    }

    // Try by partial title match
    const identifierLower = identifier.toLowerCase();
    return features.find((f: any) =>
      f.title.toLowerCase().includes(identifierLower)
    ) || null;
  }
}
