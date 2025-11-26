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
          '/add relationship --source="component" --target="target" --type=uses',
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
      if (project.components.length < 2) {
        return {
          type: ResponseType.ERROR,
          message: 'Need at least 2 components to create a relationship.',
          suggestions: ['/add component', '/view components']
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
              label: 'Source Component',
              type: 'select',
              options: project.components.map((c: any) => ({ value: c.id, label: `${c.title} (${c.category})` })),
              required: true,
              placeholder: 'Select source component'
            },
            {
              id: 'target',
              label: 'Target Component',
              type: 'select',
              options: project.components.map((c: any) => ({ value: c.id, label: `${c.title} (${c.category})` })),
              required: true,
              placeholder: 'Select target component'
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

    // Find source component
    const sourceComponent = this.findComponent(project.components, sourceIdentifier);
    if (!sourceComponent) {
      return {
        type: ResponseType.ERROR,
        message: `Source component not found: "${sourceIdentifier}"`,
        suggestions: ['/view components']
      };
    }

    // Find target component
    const targetComponent = this.findComponent(project.components, targetIdentifier);
    if (!targetComponent) {
      return {
        type: ResponseType.ERROR,
        message: `Target component not found: "${targetIdentifier}"`,
        suggestions: ['/view components']
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
    if (sourceComponent.relationships && sourceComponent.relationships.some((r: any) => r.targetId === targetComponent.id)) {
      return {
        type: ResponseType.ERROR,
        message: `Relationship already exists between "${sourceComponent.title}" and "${targetComponent.title}"`,
        suggestions: [`/view relationships "${sourceComponent.title}"`]
      };
    }

    // Create shared relationship ID for bidirectional linking
    const sharedRelationshipId = uuidv4();

    // Create forward relationship (A -> B)
    const forwardRelationship = {
      id: sharedRelationshipId,
      targetId: targetComponent.id,
      relationType: relationshipType as any,
      description: sanitizeText(description)
    };

    // Create inverse relationship (B -> A)
    const inverseRelationship = {
      id: sharedRelationshipId, // Same ID for linking
      targetId: sourceComponent.id,
      relationType: relationshipType as any,
      description: sanitizeText(description)
    };

    // Add relationships to both components
    if (!sourceComponent.relationships) {
      sourceComponent.relationships = [];
    }
    if (!targetComponent.relationships) {
      targetComponent.relationships = [];
    }

    sourceComponent.relationships.push(forwardRelationship);
    targetComponent.relationships.push(inverseRelationship);

    sourceComponent.updatedAt = new Date();
    targetComponent.updatedAt = new Date();
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
      `✅ Added ${relationshipType} relationship: "${sourceComponent.title}" ⇄ "${targetComponent.title}"`,
      project,
      'add_relationship',
      {
        source: sourceComponent.title,
        target: targetComponent.title,
        type: relationshipType,
        description: description || ''
      }
    );
  }

  /**
   * Handle /view relationships command - View all relationships for a component
   */

  async handleViewRelationships(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const componentIdentifier = parsed.args.join(' ').trim();

    // No identifier provided - show selector wizard for components with relationships
    if (!componentIdentifier) {
      const componentsWithRelationships = resolution.project.components.filter(
        (c: any) => c.relationships && c.relationships.length > 0
      );

      if (componentsWithRelationships.length === 0) {
        return {
          type: ResponseType.INFO,
          message: 'No components with relationships found',
          suggestions: ['/add relationship']
        };
      }

      return {
        type: ResponseType.PROMPT,
        message: `🔗 Select Component to View Relationships`,
        data: {
          wizardType: 'view_relationships_selector',
          steps: [
            {
              id: 'componentId',
              label: 'Select Component',
              type: 'select',
              options: componentsWithRelationships.map((c: any) => ({
                value: c.id,
                label: `${c.title} (${c.relationships.length} relationship${c.relationships.length > 1 ? 's' : ''})`
              })),
              required: true,
              placeholder: 'Select component'
            }
          ]
        },
        metadata: {
          projectId: resolution.project._id.toString(),
          action: 'view_relationships_selector'
        }
      };
    }

    const component = this.findComponent(resolution.project.components, componentIdentifier);

    if (!component) {
      return {
        type: ResponseType.ERROR,
        message: `Component not found: "${componentIdentifier}"`,
        suggestions: ['/view components']
      };
    }

    const relationships = component.relationships || [];

    if (relationships.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `🔗 No relationships found for "${component.title}"`,
        suggestions: [`/add relationship "${component.title}" "target" "type"`]
      };
    }

    // Enrich relationships with target component info
    const enrichedRelationships = relationships.map((rel: any) => {
      const target = resolution.project!.components.find((c: any) => c.id === rel.targetId);
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
      `🔗 Relationships for "${component.title}" (${enrichedRelationships.length})`,
      resolution.project,
      'view_relationships',
      {
        component: {
          id: component.id,
          title: component.title,
          category: component.category,
          type: component.type
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
      // Collect all relationships from all components
      const allRelationships: Array<{
        componentId: string;
        componentTitle: string;
        relationshipIndex: number;
        relationship: any;
        targetTitle: string;
      }> = [];

      project.components.forEach((comp: any) => {
        if (comp.relationships && comp.relationships.length > 0) {
          comp.relationships.forEach((rel: any, index: number) => {
            const target = project.components.find((c: any) => c.id === rel.targetId);
            allRelationships.push({
              componentId: comp.id,
              componentTitle: comp.title,
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
                value: `${r.componentId}|${r.relationshipIndex}`,
                label: `${r.componentTitle} ${r.relationship.relationType} ${r.targetTitle}`
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

    const componentIdentifier = parsed.args[0];
    const relationshipIdentifier = parsed.args[1];

    // If only 2 args provided, show wizard to select new type
    if (parsed.args.length === 2) {
      // Find component
      const component = this.findComponent(project.components, componentIdentifier);
      if (!component) {
        return {
          type: ResponseType.ERROR,
          message: `Component not found: "${componentIdentifier}"`,
          suggestions: ['/view components']
        };
      }

      // Find relationship
      let relationship: any = null;
      const relIndex = parseInt(relationshipIdentifier);
      if (!isNaN(relIndex) && relIndex > 0 && relIndex <= component.relationships.length) {
        relationship = component.relationships[relIndex - 1];
      } else {
        relationship = component.relationships.find((r: any) => r.id === relationshipIdentifier);
        if (!relationship) {
          relationship = component.relationships.find((r: any) => {
            const targetComp = project.components.find((c: any) => c.id === r.targetId);
            return targetComp && targetComp.title.toLowerCase() === relationshipIdentifier.toLowerCase();
          });
        }
      }

      if (!relationship) {
        return {
          type: ResponseType.ERROR,
          message: `Relationship not found: "${relationshipIdentifier}"`,
          suggestions: [`/view relationships "${component.title}"`]
        };
      }

      const targetComponent = project.components.find((c: any) => c.id === relationship.targetId);

      // Show wizard to select new relationship type
      return {
        type: ResponseType.PROMPT,
        message: `✏️  Edit Relationship: "${component.title}" → "${targetComponent?.title || 'unknown'}"`,
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
          componentTitle: component.title,
          targetTitle: targetComponent?.title || 'unknown',
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
        message: 'Usage: /edit relationship [source component] [target component] [new type]',
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

    // Find component
    const component = this.findComponent(project.components, componentIdentifier);
    if (!component) {
      return {
        type: ResponseType.ERROR,
        message: `Component not found: "${componentIdentifier}"`,
        suggestions: ['/view components']
      };
    }

    if (!component.relationships || component.relationships.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: `No relationships found for "${component.title}"`,
        suggestions: [`/add relationship "${component.title}" "target" "type"`]
      };
    }

    // Find relationship by ID, index, or target component title
    let relationship: any = null;
    const relIndex = parseInt(relationshipIdentifier);
    if (!isNaN(relIndex) && relIndex > 0 && relIndex <= component.relationships.length) {
      // Find by index
      relationship = component.relationships[relIndex - 1];
    } else {
      // Try to find by UUID
      relationship = component.relationships.find((r: any) => r.id === relationshipIdentifier);

      // If not found, try to find by target component title
      if (!relationship) {
        relationship = component.relationships.find((r: any) => {
          const targetComp = project.components.find((c: any) => c.id === r.targetId);
          return targetComp && targetComp.title.toLowerCase() === relationshipIdentifier.toLowerCase();
        });
      }
    }

    if (!relationship) {
      return {
        type: ResponseType.ERROR,
        message: `Relationship not found: "${relationshipIdentifier}"`,
        suggestions: [`/view relationships "${component.title}"`]
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

    // Get target component for display
    const targetComponent = project.components.find((c: any) => c.id === relationship.targetId);
    const oldType = relationship.relationType;

    // Update relationship type on source side
    relationship.relationType = newType;

    // Update description if provided via flag, otherwise keep existing
    if (newDescription !== undefined) {
      relationship.description = sanitizeText(newDescription);
    }

    // Find and update the inverse relationship on the target component
    if (targetComponent && targetComponent.relationships) {
      const inverseRelationship = targetComponent.relationships.find((r: any) => r.id === relationship.id);
      if (inverseRelationship) {
        inverseRelationship.relationType = newType;
        if (newDescription !== undefined) {
          inverseRelationship.description = sanitizeText(newDescription);
        }
        targetComponent.updatedAt = new Date();
      }
    }

    component.updatedAt = new Date();
    await project.save();

    return this.buildSuccessResponse(
      `✅ Updated relationship: "${component.title}" ⇄ "${targetComponent?.title || 'unknown'}" (${oldType} → ${newType})`,
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
      // Collect all relationships from all components
      const allRelationships: Array<{ componentId: string; componentTitle: string; relationshipId: string; relationship: any; targetTitle: string }> = [];

      project.components.forEach((comp: any) => {
        if (comp.relationships && comp.relationships.length > 0) {
          comp.relationships.forEach((rel: any) => {
            const target = project.components.find((c: any) => c.id === rel.targetId);
            allRelationships.push({
              componentId: comp.id,
              componentTitle: comp.title,
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
                value: `${r.componentId}|${r.relationshipId}`,
                label: `${r.componentTitle} ${r.relationship.relationType} ${r.targetTitle}`
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
        message: 'Usage: /delete relationship [component id/title] [relationship id]',
        suggestions: [
          '/delete relationship - Interactive selector',
          '/delete relationship "Login" 1 --confirm',
          '/view relationships "Login" - to see relationship IDs',
          '/help delete relationship'
        ]
      };
    }

    const componentIdentifier = parsed.args[0];
    const relationshipIdentifier = parsed.args[1];

    // Find component
    const component = this.findComponent(project.components, componentIdentifier);
    if (!component) {
      return {
        type: ResponseType.ERROR,
        message: `Component not found: "${componentIdentifier}"`,
        suggestions: ['/view components']
      };
    }

    if (!component.relationships || component.relationships.length === 0) {
      return {
        type: ResponseType.ERROR,
        message: `No relationships found for "${component.title}"`,
        suggestions: []
      };
    }

    // Find relationship by ID or index
    let relationshipIndex = -1;
    const relIndex = parseInt(relationshipIdentifier);
    if (!isNaN(relIndex) && relIndex > 0 && relIndex <= component.relationships.length) {
      relationshipIndex = relIndex - 1;
    } else {
      relationshipIndex = component.relationships.findIndex((r: any) => r.id === relationshipIdentifier);
    }

    if (relationshipIndex === -1) {
      return {
        type: ResponseType.ERROR,
        message: `Relationship not found: "${relationshipIdentifier}"`,
        suggestions: [`/view relationships "${component.title}"`]
      };
    }

    const relationship = component.relationships[relationshipIndex];
    const targetComponent = project.components.find((c: any) => c.id === relationship.targetId);

    // Check for confirmation flag
    const hasConfirmation = hasFlag(parsed.flags, 'confirm') || hasFlag(parsed.flags, 'yes') || hasFlag(parsed.flags, 'y');

    if (!hasConfirmation) {
      return {
        type: ResponseType.PROMPT,
        message: `⚠️  Confirm Deletion`,
        data: {
          wizardType: 'delete_relationship_confirm',
          confirmationData: {
            componentTitle: component.title,
            targetTitle: targetComponent?.title || 'unknown',
            relationType: relationship.relationType,
            command: `/delete relationship "${component.title}" ${relationshipIdentifier} --confirm`
          },
          steps: [
            {
              id: 'confirmation',
              label: `Are you sure you want to delete the ${relationship.relationType} relationship from "${component.title}" to "${targetComponent?.title || 'unknown'}"?`,
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

    // Delete the relationship from source component
    component.relationships.splice(relationshipIndex, 1);
    component.updatedAt = new Date();

    // Remove the inverse relationship from the target component
    if (targetComponent && targetComponent.relationships) {
      const inverseRelationshipIndex = targetComponent.relationships.findIndex((r: any) => r.id === relationship.id);
      if (inverseRelationshipIndex !== -1) {
        targetComponent.relationships.splice(inverseRelationshipIndex, 1);
        targetComponent.updatedAt = new Date();
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
      `🗑️  Deleted ${relationship.relationType} relationship: "${component.title}" ⇄ "${targetComponent?.title || 'unknown'}"`,
      project,
      'delete_relationship'
    );
  }

  /**
   * Helper method to find a component by ID or title (case-insensitive partial match)
   */
  private findComponent(components: any[], identifier: string): any | undefined {
    // Try exact UUID match first
    let found = components.find((c: any) => c.id === identifier);
    if (found) return found;

    // Try exact title match (case-insensitive)
    found = components.find((c: any) => c.title.toLowerCase() === identifier.toLowerCase());
    if (found) return found;

    // Try partial title match (case-insensitive)
    found = components.find((c: any) => c.title.toLowerCase().includes(identifier.toLowerCase()));
    return found;
  }
}
