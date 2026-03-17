import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { BaseCommandHandler } from '../BaseCommandHandler';
import { CommandResponse, ResponseType } from '../../types';
import { ParsedCommand, getFlag, getFlagCount, hasFlag } from '../../commandParser';
import { sanitizeText } from '../../../utils/validation';
import { AnalyticsService } from '../../../middleware/analytics';

/**
 * Handlers for Relationship CRUD operations
 */
export class RelationshipHandlers extends BaseCommandHandler {
  async handleAddRelationship(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // Check if using old syntax (args without flags) - this is an error
    if (parsed.args.length > 0 && getFlagCount(parsed.flags) === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          '/add relationship - Interactive wizard',
          '/add relationship --source="feature" --target="target" --type=uses',
          '/add relationship --source="Login" --target="Auth Service" --type=uses --description="Uses auth"',
          '/help add relationship'
        ]
      };
    }

    // Get flags
    const sourceIdentifier = getFlag(parsed.flags, 'source') as string;
    const targetIdentifier = getFlag(parsed.flags, 'target') as string;
    const relationshipType = (getFlag(parsed.flags, 'type') as string)?.toLowerCase();
    const description = getFlag(parsed.flags, 'description') as string;

    // No args and no flags - pull up wizard
    if (parsed.args.length === 0 && getFlagCount(parsed.flags) === 0) {
      if (project.features.length < 2) {
        return {
          type: ResponseType.ERROR,
          message: 'Need at least 2 features to create a relationship.',
          suggestions: ['/add feature', '/view features']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✨ Add New Relationship`,
        data: {
          wizardType: 'add_relationship',
          steps: [
            {
              id: 'source',
              label: 'Source Feature',
              type: 'select',
              options: project.features.map((c: any) => ({ value: c.id, label: `${c.title} (${c.category})` })),
              required: true,
              placeholder: 'Select source feature'
            },
            {
              id: 'target',
              label: 'Target Feature',
              type: 'select',
              options: project.features.map((c: any) => ({ value: c.id, label: `${c.title} (${c.category})` })),
              required: true,
              placeholder: 'Select target feature'
            },
            {
              id: 'type',
              label: 'Relationship Type',
              type: 'select',
              options: ['uses', 'implements', 'extends', 'depends_on', 'calls', 'contains', 'mentions', 'similar'],
              required: true,
              value: 'uses'
            },
            {
              id: 'description',
              label: 'Description',
              type: 'textarea',
              required: false,
              placeholder: 'Optional description of the relationship'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'add_relationship'
        }
      };
    }

    // Validate required flags
    if (!sourceIdentifier || !targetIdentifier || !relationshipType) {
      return {
        type: ResponseType.ERROR,
        message: '❌ --source, --target, and --type flags are required',
        suggestions: [
          '/add relationship - Use wizard instead',
          '/add relationship --source="component" --target="target" --type=uses',
          '/help add relationship'
        ]
      };
    }

    // Find source feature
    const sourceFeature = this.findFeature(project.features, sourceIdentifier);
    if (!sourceFeature) {
      return {
        type: ResponseType.ERROR,
        message: `Source feature not found: "${sourceIdentifier}"`,
        suggestions: ['/view features']
      };
    }

    // Find target feature
    const targetFeature = this.findFeature(project.features, targetIdentifier);
    if (!targetFeature) {
      return {
        type: ResponseType.ERROR,
        message: `Target feature not found: "${targetIdentifier}"`,
        suggestions: ['/view features']
      };
    }

    // Validate relationship type
    const validTypes = ['uses', 'depends_on'];
    if (!validTypes.includes(relationshipType)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid relationship type "${relationshipType}". Valid types: ${validTypes.join(', ')}`,
        suggestions: ['/help add relationship']
      };
    }

    // Check if relationship already exists
    if (sourceFeature.relationships && sourceFeature.relationships.some((r: any) => r.targetId === targetFeature.id)) {
      return {
        type: ResponseType.ERROR,
        message: `Relationship already exists between "${sourceFeature.title}" and "${targetFeature.title}"`,
        suggestions: [`/view relationships "${sourceFeature.title}"`]
      };
    }

    // Create shared relationship ID for bidirectional linking
    const sharedRelationshipId = uuidv4();

    // Create forward relationship (A -> B)
    const forwardRelationship = {
      id: sharedRelationshipId,
      targetId: targetFeature.id,
      relationType: relationshipType as any,
      description: sanitizeText(description)
    };

    // Create inverse relationship (B -> A)
    const inverseRelationship = {
      id: sharedRelationshipId, // Same ID for linking
      targetId: sourceFeature.id,
      relationType: relationshipType as any,
      description: sanitizeText(description)
    };

    // Add relationships to both components
    if (!sourceFeature.relationships) {
      sourceFeature.relationships = [];
    }
    if (!targetFeature.relationships) {
      targetFeature.relationships = [];
    }

    sourceFeature.relationships.push(forwardRelationship);
    targetFeature.relationships.push(inverseRelationship);

    sourceFeature.updatedAt = new Date();
    targetFeature.updatedAt = new Date();
    await project.save();

    // Track analytics
    try {
      await AnalyticsService.trackEvent(this.userId, 'feature_used', {
        feature: 'relationship_create_terminal',
        category: 'engagement',
        projectId: project._id.toString(),
        projectName: project.name,
        metadata: {
          relationType: relationshipType
        }
      });
    } catch (error) {
      
    }

    return this.buildSuccessResponse(
      `✅ Added ${relationshipType} relationship: "${sourceFeature.title}" ⇄ "${targetFeature.title}"`,
      project,
      'add_relationship',
      {
        source: sourceFeature.title,
        target: targetFeature.title,
        type: relationshipType,
        description: description || ''
      }
    );
  }

  /**
   * Handle /view relationships command - View all relationships for a feature
   */

  async handleViewRelationships(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const featureIdentifier = parsed.args.join(' ').trim();

    // No identifier provided - show selector wizard for features with relationships
    if (!featureIdentifier) {
      const featuresWithRelationships = resolution.project.features.filter(
        (c: any) => c.relationships && c.relationships.length > 0
      );

      if (featuresWithRelationships.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No features with relationships found',
          suggestions: ['/add relationship']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🔗 Select Feature to View Relationships`,
        data: {
          wizardType: 'view_relationships_selector',
          steps: [
            {
              id: 'featureId',
              label: 'Select Feature',
              type: 'select',
              options: featuresWithRelationships.map((c: any) => ({
                value: c.id,
                label: `${c.title} (${c.relationships.length} relationship${c.relationships.length > 1 ? 's' : ''})`
              })),
              required: true,
              placeholder: 'Select feature'
            }
          ]
        },
        metadata: {
          projectId: resolution.project._id.toString(),
          action: 'view_relationships_selector'
        }
      };
    }

    const feature = this.findFeature(resolution.project.features, featureIdentifier);

    if (!feature) {
      return {
        type: ResponseType.ERROR,
        message: `Feature not found: "${featureIdentifier}"`,
        suggestions: ['/view features']
      };
    }

    const relationships = feature.relationships || [];

    if (relationships.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `🔗 No relationships found for "${feature.title}"`,
        suggestions: [`/add relationship "${feature.title}" "target" "type"`]
      };
    }

    // Enrich relationships with target feature info
    const enrichedRelationships = relationships.map((rel: any) => {
      const target = resolution.project!.features.find((c: any) => c.id === rel.targetId);
      return {
        id: rel.id,
        relationType: rel.relationType,
        description: rel.description,
        target: target ? {
          id: target.id,
          title: target.title,
          category: target.category,
          type: target.type
        } : null
      };
    }).filter((rel: any) => rel.target !== null);

    return this.buildDataResponse(
      `🔗 Relationships for "${feature.title}" (${enrichedRelationships.length})`,
      resolution.project,
      'view_relationships',
      {
        feature: {
          id: feature.id,
          title: feature.title,
          category: feature.category,
          type: feature.type
        },
        relationships: enrichedRelationships
      }
    );
  }

  /**
   * Handle /edit relationship command - Edit an existing relationship
   */

  async handleEditRelationship(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // No args - show selector to choose which relationship to edit
    if (parsed.args.length === 0) {
      // Collect all relationships from all features
      const allRelationships: Array<{
        featureId: string;
        featureTitle: string;
        relationshipIndex: number;
        relationship: any;
        targetTitle: string;
      }> = [];

      project.features.forEach((comp: any) => {
        if (comp.relationships && comp.relationships.length > 0) {
          comp.relationships.forEach((rel: any, index: number) => {
            const target = project.features.find((c: any) => c.id === rel.targetId);
            allRelationships.push({
              featureId: comp.id,
              featureTitle: comp.title,
              relationshipIndex: index + 1,
              relationship: rel,
              targetTitle: target?.title || 'unknown'
            });
          });
        }
      });

      if (allRelationships.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No relationships to edit',
          suggestions: ['/add relationship']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `✏️  Select Relationship to Edit`,
        data: {
          wizardType: 'edit_relationship_selector',
          steps: [
            {
              id: 'relationshipData',
              label: 'Select Relationship',
              type: 'select',
              options: allRelationships.map((r) => ({
                value: `${r.featureId}|${r.relationshipIndex}`,
                label: `${r.featureTitle} ${r.relationship.relationType} ${r.targetTitle}`
              })),
              required: true,
              placeholder: 'Select relationship to edit'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_relationship_selector'
        }
      };
    }

    const featureIdentifier = parsed.args[0];
    const relationshipIdentifier = parsed.args[1];

    // If only 2 args provided, show wizard to select new type
    if (parsed.args.length === 2) {
      // Find feature
      const feature = this.findFeature(project.features, featureIdentifier);
      if (!feature) {
        return {
          type: ResponseType.ERROR,
          message: `Feature not found: "${featureIdentifier}"`,
          suggestions: ['/view features']
        };
      }

      // Find relationship
      let relationship: any = null;
      const relIndex = parseInt(relationshipIdentifier);
      if (!isNaN(relIndex) && relIndex > 0 && relIndex <= feature.relationships.length) {
        relationship = feature.relationships[relIndex - 1];
      } else {
        relationship = feature.relationships.find((r: any) => r.id === relationshipIdentifier);
        if (!relationship) {
          relationship = feature.relationships.find((r: any) => {
            const targetComp = project.features.find((c: any) => c.id === r.targetId);
            return targetComp && targetComp.title.toLowerCase() === relationshipIdentifier.toLowerCase();
          });
        }
      }

      if (!relationship) {
        return {
          type: ResponseType.ERROR,
          message: `Relationship not found: "${relationshipIdentifier}"`,
          suggestions: [`/view relationships "${feature.title}"`]
        };
      }

      const targetFeature = project.features.find((c: any) => c.id === relationship.targetId);

      // Show wizard to select new relationship type
      return {
        type: ResponseType.PROMPT,
        message: `✏️  Edit Relationship: "${feature.title}" → "${targetFeature?.title || 'unknown'}"`,
        data: {
          wizardType: 'edit_relationship_type',
          steps: [
            {
              id: 'relationType',
              label: `Current: ${relationship.relationType}. Select new type:`,
              type: 'select',
              options: ['uses', 'implements', 'extends', 'depends_on', 'calls', 'contains', 'mentions', 'similar'],
              required: true,
              value: relationship.relationType,
              placeholder: 'Select relationship type'
            },
            {
              id: 'description',
              label: 'Description (optional)',
              type: 'text',
              required: false,
              value: relationship.description || '',
              placeholder: 'Optional description'
            }
          ],
          featureTitle: feature.title,
          targetTitle: targetFeature?.title || 'unknown',
          relationshipId: relationship.id
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'edit_relationship_type'
        }
      };
    }

    if (parsed.args.length < 3) {
      return {
        type: ResponseType.ERROR,
        message: 'Usage: /edit relationship [source feature] [target feature] [new type]',
        suggestions: [
          '/edit relationship "Login" "Database" depends_on',
          '/edit relationship "Login" 1 depends_on',
          '/edit relationship "Login" 1 depends_on --description="Uses for auth"',
          '/view relationships "Login" - to see relationships',
          '/help edit relationship'
        ]
      };
    }

    const newType = parsed.args[2].toLowerCase();
    const newDescription = getFlag(parsed.flags, 'description') as string;

    // Find feature
    const feature = this.findFeature(project.features, featureIdentifier);
    if (!feature) {
      return {
        type: ResponseType.ERROR,
        message: `Feature not found: "${featureIdentifier}"`,
        suggestions: ['/view features']
      };
    }

    if (!feature.relationships || feature.relationships.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: `No relationships found for "${feature.title}"`,
        suggestions: [`/add relationship "${feature.title}" "target" "type"`]
      };
    }

    // Find relationship by ID, index, or target feature title
    let relationship: any = null;
    const relIndex = parseInt(relationshipIdentifier);
    if (!isNaN(relIndex) && relIndex > 0 && relIndex <= feature.relationships.length) {
      // Find by index
      relationship = feature.relationships[relIndex - 1];
    } else {
      // Try to find by UUID
      relationship = feature.relationships.find((r: any) => r.id === relationshipIdentifier);

      // If not found, try to find by target feature title
      if (!relationship) {
        relationship = feature.relationships.find((r: any) => {
          const targetComp = project.features.find((c: any) => c.id === r.targetId);
          return targetComp && targetComp.title.toLowerCase() === relationshipIdentifier.toLowerCase();
        });
      }
    }

    if (!relationship) {
      return {
        type: ResponseType.ERROR,
        message: `Relationship not found: "${relationshipIdentifier}"`,
        suggestions: [`/view relationships "${feature.title}"`]
      };
    }

    // Validate new type
    const validTypes = ['uses', 'depends_on'];
    if (!validTypes.includes(newType)) {
      return {
        type: ResponseType.ERROR,
        message: `Invalid relationship type "${newType}". Valid types: ${validTypes.join(', ')}`,
        suggestions: ['/help edit relationship']
      };
    }

    // Get target feature for display
    const targetFeature = project.features.find((c: any) => c.id === relationship.targetId);
    const oldType = relationship.relationType;

    // Update relationship type on source side
    relationship.relationType = newType;

    // Update description if provided via flag, otherwise keep existing
    if (newDescription !== undefined) {
      relationship.description = sanitizeText(newDescription);
    }

    // Find and update the inverse relationship on the target feature
    if (targetFeature && targetFeature.relationships) {
      const inverseRelationship = targetFeature.relationships.find((r: any) => r.id === relationship.id);
      if (inverseRelationship) {
        inverseRelationship.relationType = newType;
        if (newDescription !== undefined) {
          inverseRelationship.description = sanitizeText(newDescription);
        }
        targetFeature.updatedAt = new Date();
      }
    }

    feature.updatedAt = new Date();
    await project.save();

    return this.buildSuccessResponse(
      `✅ Updated relationship: "${feature.title}" ⇄ "${targetFeature?.title || 'unknown'}" (${oldType} → ${newType})`,
      project,
      'edit_relationship'
    );
  }

  /**
   * Handle /delete relationship command - Delete a relationship with confirmation
   */

  async handleDeleteRelationship(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const { project, error } = await this.resolveProjectWithEditCheck(parsed.projectMention, currentProjectId);
    if (error) return error;

    // No args provided - show selector wizard with all relationships
    if (parsed.args.length === 0) {
      // Collect all relationships from all features
      const allRelationships: Array<{ featureId: string; featureTitle: string; relationshipId: string; relationship: any; targetTitle: string }> = [];

      project.features.forEach((comp: any) => {
        if (comp.relationships && comp.relationships.length > 0) {
          comp.relationships.forEach((rel: any) => {
            const target = project.features.find((c: any) => c.id === rel.targetId);
            allRelationships.push({
              featureId: comp.id,
              featureTitle: comp.title,
              relationshipId: rel.id,
              relationship: rel,
              targetTitle: target?.title || 'unknown'
            });
          });
        }
      });

      if (allRelationships.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No relationships to delete',
          suggestions: ['/add relationship']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🗑️  Select Relationship to Delete`,
        data: {
          wizardType: 'delete_relationship_selector',
          steps: [
            {
              id: 'relationshipData',
              label: 'Select Relationship',
              type: 'select',
              options: allRelationships.map((r) => ({
                value: `${r.featureId}|${r.relationshipId}`,
                label: `${r.featureTitle} ${r.relationship.relationType} ${r.targetTitle}`
              })),
              required: true,
              placeholder: 'Select relationship to delete'
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_relationship_selector'
        }
      };
    }

    if (parsed.args.length < 2) {
      return {
        type: ResponseType.ERROR,
        message: 'Usage: /delete relationship [feature id/title] [relationship id]',
        suggestions: [
          '/delete relationship - Interactive selector',
          '/delete relationship "Login" 1 --confirm',
          '/view relationships "Login" - to see relationship IDs',
          '/help delete relationship'
        ]
      };
    }

    const featureIdentifier = parsed.args[0];
    const relationshipIdentifier = parsed.args[1];

    // Find feature
    const feature = this.findFeature(project.features, featureIdentifier);
    if (!feature) {
      return {
        type: ResponseType.ERROR,
        message: `Feature not found: "${featureIdentifier}"`,
        suggestions: ['/view features']
      };
    }

    if (!feature.relationships || feature.relationships.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: `No relationships found for "${feature.title}"`,
        suggestions: []
      };
    }

    // Find relationship by ID or index
    let relationshipIndex = -1;
    const relIndex = parseInt(relationshipIdentifier);
    if (!isNaN(relIndex) && relIndex > 0 && relIndex <= feature.relationships.length) {
      relationshipIndex = relIndex - 1;
    } else {
      relationshipIndex = feature.relationships.findIndex((r: any) => r.id === relationshipIdentifier);
    }

    if (relationshipIndex === -1) {
      return {
        type: ResponseType.ERROR,
        message: `Relationship not found: "${relationshipIdentifier}"`,
        suggestions: [`/view relationships "${feature.title}"`]
      };
    }

    const relationship = feature.relationships[relationshipIndex];
    const targetFeature = project.features.find((c: any) => c.id === relationship.targetId);

    // Check for confirmation flag
    const hasConfirmation = hasFlag(parsed.flags, 'confirm') || hasFlag(parsed.flags, 'yes') || hasFlag(parsed.flags, 'y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_relationship_confirm',
          confirmationData: {
            featureTitle: feature.title,
            targetTitle: targetFeature?.title || 'unknown',
            relationType: relationship.relationType,
            command: `/delete relationship "${feature.title}" ${relationshipIdentifier} --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete the ${relationship.relationType} relationship from "${feature.title}" to "${targetFeature?.title || 'unknown'}"?`,
              type: 'confirmation',
              required: true
            }
          ]
        },
        metadata: {
          projectId: project._id.toString(),
          action: 'delete_relationship_confirm'
        }
      };
    }

    // Delete the relationship from source feature
    feature.relationships.splice(relationshipIndex, 1);
    feature.updatedAt = new Date();

    // Remove the inverse relationship from the target feature
    if (targetFeature && targetFeature.relationships) {
      const inverseRelationshipIndex = targetFeature.relationships.findIndex((r: any) => r.id === relationship.id);
      if (inverseRelationshipIndex !== -1) {
        targetFeature.relationships.splice(inverseRelationshipIndex, 1);
        targetFeature.updatedAt = new Date();
      }
    }

    await project.save();

    // Track analytics
    try {
      await AnalyticsService.trackEvent(this.userId, 'feature_used', {
        feature: 'relationship_delete_terminal',
        category: 'engagement',
        projectId: project._id.toString(),
        projectName: project.name
      });
    } catch (error) {
      
    }

    return this.buildSuccessResponse(
      `🗑️  Deleted ${relationship.relationType} relationship: "${feature.title}" ⇄ "${targetFeature?.title || 'unknown'}"`,
      project,
      'delete_relationship'
    );
  }

  /**
   * Helper method to find a feature by ID or title (case-insensitive partial match)
   */
  private findFeature(features: any[], identifier: string): any | undefined {
    // Try exact UUID match first
    let found = features.find((c: any) => c.id === identifier);
    if (found) return found;

    // Try exact title match (case-insensitive)
    found = features.find((c: any) => c.title.toLowerCase() === identifier.toLowerCase());
    if (found) return found;

    // Try partial title match (case-insensitive)
    found = features.find((c: any) => c.title.toLowerCase().includes(identifier.toLowerCase()));
    return found;
  }
}
