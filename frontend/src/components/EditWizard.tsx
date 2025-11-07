import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectAPI, terminalAPI } from '../api';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { toast } from '../services/toast';
import { RelationshipType } from '../../../shared/types/project';
import ConfirmationModal from './ConfirmationModal';

interface EditWizardProps {
  wizardData: {
    wizardType: 'edit_todo' | 'edit_note' | 'edit_devlog' | 'edit_component' | 'edit_subtask';
    todoId?: string;
    noteId?: string;
    entryId?: string;
    componentId?: string;
    subtaskId?: string;
    parentTodoId?: string;
    currentValues: Record<string, any>;
    wizardCompleted?: boolean;
    wizardData?: Record<string, any>;
    steps: Array<{
      id: string;
      label: string;
      type: string;
      required?: boolean;
      value?: any;
      options?: string[];
      placeholder?: string;
      allComponents?: any[];
      availableComponents?: any[];
      dependsOn?: string;
    }>;
  };
  currentProjectId?: string;
  entryId?: string;
  onWizardComplete?: (entryId: string, wizardData: Record<string, any>) => void;
}

const EditWizard: React.FC<EditWizardProps> = ({ wizardData, currentProjectId, entryId, onWizardComplete }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(wizardData.wizardData || wizardData.currentValues || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Relationship editing state (for inline edit)
  const [editingRelIndex, setEditingRelIndex] = useState<number | null>(null);
  const [editRelData, setEditRelData] = useState<{ relationType: RelationshipType; description: string }>({
    relationType: 'uses',
    description: ''
  });

  // Subtask editing state (for inline edit)
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number | null>(null);
  const [editSubtaskData, setEditSubtaskData] = useState<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  }>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'not_started'
  });

  // Handle Escape key to go back
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCompleted && !isSubmitting) {
        // If we're editing a relationship or subtask, cancel that first
        if (editingRelIndex !== null) {
          handleCancelEditRelationship();
        } else if (editingSubtaskIndex !== null) {
          handleCancelEditSubtask();
        } else if (currentStep > 0) {
          // Otherwise, go back a step
          handleBack();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [currentStep, isCompleted, isSubmitting, editingRelIndex, editingSubtaskIndex]);

  // Confirmation modal state for delete relationship
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    relationshipId: string | null;
    targetTitle: string;
  }>({
    isOpen: false,
    relationshipId: null,
    targetTitle: ''
  });

  // Confirmation modal state for delete subtask
  const [deleteSubtaskConfirmation, setDeleteSubtaskConfirmation] = useState<{
    isOpen: boolean;
    subtaskId: string | null;
    subtaskTitle: string;
  }>({
    isOpen: false,
    subtaskId: null,
    subtaskTitle: ''
  });

  const steps = wizardData.steps;
  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleEditRelationship = useCallback((index: number, relationType: RelationshipType, description: string) => {
    setEditingRelIndex(index);
    setEditRelData({ relationType, description: description || '' });
  }, []);

  const handleSaveRelationship = useCallback(async () => {
    if (editingRelIndex === null || !currentProjectId) return;

    const { componentId } = wizardData;
    if (!componentId) return;

    const currentRelationships = formData[step.id] || step.value || [];
    const relationship = currentRelationships[editingRelIndex];
    if (!relationship) {
      toast.error('Relationship not found');
      return;
    }

    // OPTIMISTIC UPDATE - Update local state immediately
    const updatedRelationships = [...currentRelationships];
    updatedRelationships[editingRelIndex] = {
      ...relationship,
      relationType: editRelData.relationType,
      description: editRelData.description || ''
    };
    setFormData({ ...formData, [step.id]: updatedRelationships });

    try {
      // Delete old relationship
      await projectAPI.deleteRelationship(currentProjectId, componentId, relationship.id);

      // Create new relationship with updated data
      const newRelationship = await projectAPI.createRelationship(currentProjectId, componentId, {
        targetId: relationship.targetId,
        relationType: editRelData.relationType,
        description: editRelData.description || undefined,
      });

      // Update with real relationship ID from server
      const finalRelationships = [...updatedRelationships];
      finalRelationships[editingRelIndex] = {
        ...finalRelationships[editingRelIndex],
        id: newRelationship.id || relationship.id
      };
      setFormData({ ...formData, [step.id]: finalRelationships });

      toast.success('Relationship updated');
      setEditingRelIndex(null);
      setEditRelData({ relationType: 'uses', description: '' });

    } catch (error) {
      console.error('Failed to update relationship:', error);
      toast.error('Failed to update relationship');

      // ROLLBACK - Restore original state on error
      setFormData({ ...formData, [step.id]: currentRelationships });
    }
  }, [editingRelIndex, currentProjectId, wizardData, formData, step.id, step.value, editRelData]);

  const handleCancelEditRelationship = useCallback(() => {
    setEditingRelIndex(null);
    setEditRelData({ relationType: 'uses', description: '' });
  }, []);

  const handleEditSubtask = useCallback((index: number, subtask: any) => {
    setEditingSubtaskIndex(index);
    setEditSubtaskData({
      title: subtask.title || '',
      description: subtask.description || '',
      priority: subtask.priority || 'medium',
      status: subtask.status || 'not_started'
    });
  }, []);

  const handleSaveSubtask = useCallback(async () => {
    if (editingSubtaskIndex === null || !currentProjectId) return;

    const { todoId } = wizardData;
    if (!todoId) return;

    const currentSubtasks = formData[step.id] || step.value || [];
    const subtask = currentSubtasks[editingSubtaskIndex];
    if (!subtask) {
      toast.error('Subtask not found');
      return;
    }

    // OPTIMISTIC UPDATE - Update local state immediately
    const updatedSubtasks = [...currentSubtasks];
    updatedSubtasks[editingSubtaskIndex] = {
      ...subtask,
      title: editSubtaskData.title,
      description: editSubtaskData.description,
      priority: editSubtaskData.priority,
      status: editSubtaskData.status
    };
    setFormData({ ...formData, [step.id]: updatedSubtasks });

    try {
      // Update subtask via API
      await projectAPI.updateTodo(currentProjectId, subtask.id, {
        text: editSubtaskData.title,
        description: editSubtaskData.description,
        priority: editSubtaskData.priority,
        status: editSubtaskData.status
      });

      toast.success('Subtask updated');
      setEditingSubtaskIndex(null);
      setEditSubtaskData({ title: '', description: '', priority: 'medium', status: 'not_started' });

    } catch (error) {
      console.error('Failed to update subtask:', error);
      toast.error('Failed to update subtask');

      // ROLLBACK - Restore original state on error
      setFormData({ ...formData, [step.id]: currentSubtasks });
    }
  }, [editingSubtaskIndex, currentProjectId, wizardData, formData, step.id, step.value, editSubtaskData]);

  const handleCancelEditSubtask = useCallback(() => {
    setEditingSubtaskIndex(null);
    setEditSubtaskData({ title: '', description: '', priority: 'medium', status: 'not_started' });
  }, []);

  const handleDeleteSubtask = useCallback(async () => {
    if (!currentProjectId || !deleteSubtaskConfirmation.subtaskId) return;

    const { todoId } = wizardData;
    if (!todoId) return;

    const subtaskId = deleteSubtaskConfirmation.subtaskId;
    const currentSubtasks = formData[step.id] || step.value || [];

    // Close modal
    setDeleteSubtaskConfirmation({ isOpen: false, subtaskId: null, subtaskTitle: '' });

    // OPTIMISTIC UPDATE - Remove from local state immediately
    const updatedSubtasks = currentSubtasks.filter((s: any) => s.id !== subtaskId);
    setFormData({ ...formData, [step.id]: updatedSubtasks });

    try {
      await projectAPI.deleteTodo(currentProjectId, subtaskId);
      toast.success('Subtask deleted');

    } catch (error) {
      console.error('Failed to delete subtask:', error);
      toast.error('Failed to delete subtask');

      // ROLLBACK - Restore original state on error
      setFormData({ ...formData, [step.id]: currentSubtasks });
    }
  }, [currentProjectId, wizardData, formData, step.id, step.value, deleteSubtaskConfirmation.subtaskId]);

  const handleDeleteRelationship = useCallback(async () => {
    if (!currentProjectId || !deleteConfirmation.relationshipId) return;

    const { componentId } = wizardData;
    if (!componentId) return;

    const relationshipId = deleteConfirmation.relationshipId;
    const currentRelationships = formData[step.id] || step.value || [];

    // Close modal
    setDeleteConfirmation({ isOpen: false, relationshipId: null, targetTitle: '' });

    // OPTIMISTIC UPDATE - Remove from local state immediately
    const updatedRelationships = currentRelationships.filter((r: any) => r.id !== relationshipId);
    setFormData({ ...formData, [step.id]: updatedRelationships });

    try {
      await projectAPI.deleteRelationship(currentProjectId, componentId, relationshipId);
      toast.success('Relationship deleted');

    } catch (error) {
      console.error('Failed to delete relationship:', error);
      toast.error('Failed to delete relationship');

      // ROLLBACK - Restore original state on error
      setFormData({ ...formData, [step.id]: currentRelationships });
    }
  }, [currentProjectId, wizardData, formData, step.id, step.value, deleteConfirmation.relationshipId]);

  /**
   * Escape special characters for command construction
   * Handles backslashes, quotes, and newlines to work with the command parser
   */
  const escapeForCommand = (value: string): string => {
    return String(value)
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/\n/g, '\\n')    // Escape newlines
      .replace(/\r/g, '\\r')    // Escape carriage returns
      .replace(/"/g, '\\"');    // Then escape quotes
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Validate that we have a project context
    if (!currentProjectId) {
      console.error('❌ No currentProjectId provided to EditWizard!');
      toast.error('No project context. Please refresh and try again.');
      setIsSubmitting(false);
      return;
    }

    try {
      const { wizardType, todoId, noteId, entryId, componentId } = wizardData;
      const itemId = todoId || noteId || entryId || componentId;

      const commandMap: Record<string, string> = {
        'edit_todo': 'todo',
        'edit_note': 'note',
        'edit_devlog': 'devlog',
        'edit_component': 'component'
      };

      const itemType = commandMap[wizardType];
      let successCount = 0;
      let errorCount = 0;

      // Build a single edit command with all flags
      const flags: string[] = [];
      for (const [field, value] of Object.entries(formData)) {
        // Skip temp fields, relationships, and subtasks (handled separately)
        if (field.includes('_temp') || field === 'relationships' || field === 'subtasks') continue;

        // Only include if value differs from original or is non-empty
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          const escapedValue = escapeForCommand(String(value));
          flags.push(`--${field}="${escapedValue}"`);
        }
      }

      // Execute single edit command if there are changes
      if (flags.length > 0) {
        try {
          const editCommand = `/edit ${itemType} ${itemId} ${flags.join(' ')}`;

          const response = await terminalAPI.executeCommand(editCommand, currentProjectId);

          if (response.type === 'error') {
            errorCount++;
            toast.error(`Failed to update: ${response.message}`);
          } else {
            successCount++;
          }
        } catch (cmdError) {
          console.error('Failed to execute edit command:', cmdError);
          errorCount++;
          toast.error('Failed to update');
        }
      }

      // Handle relationships separately for components
      // Note: Modified relationships are saved immediately via handleSaveRelationship
      // Deleted relationships are removed immediately via handleDeleteRelationship
      // Here we only handle new additions (temp IDs)
      if (wizardType === 'edit_component' && formData.relationships) {
        const newRels = formData.relationships || [];

        // Find new relationships (temp IDs only - everything else already saved)
        for (const newRel of newRels) {
          if (newRel.id?.startsWith('temp-')) {
            try {
              const desc = newRel.description
                ? ` --description="${escapeForCommand(newRel.description)}"`
                : '';
              const addCmd = `/edit component ${itemId} --field=relationship --action=add --target=${newRel.targetId} --type=${newRel.relationType}${desc}`;

              const response = await terminalAPI.executeCommand(addCmd, currentProjectId);

              if (response.type === 'error') {
                errorCount++;
                toast.error(`Failed to add relationship: ${response.message}`);
              } else {
                successCount++;
              }

              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (relError) {
              console.error('Failed to add relationship:', relError);
              errorCount++;
              toast.error('Failed to add relationship');
            }
          }
        }
      }

      // Show final result and mark as completed
      if (errorCount === 0 && successCount > 0) {
        toast.success(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} updated successfully!`);
        setIsCompleted(true);
        // Update the entry in parent to persist completion state
        if (onWizardComplete && entryId) {
          onWizardComplete(entryId, formData);
        }
      } else if (successCount > 0) {
        toast.warning(`Updated with ${errorCount} error(s). ${successCount} field(s) succeeded.`);
        setIsCompleted(true);
        // Update the entry in parent to persist completion state
        if (onWizardComplete && entryId) {
          onWizardComplete(entryId, formData);
        }
      } else {
        toast.error('Failed to update item');
      }

    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error(`Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    if (step.required) {
      const value = formData[step.id];
      return value !== undefined && value !== '' && value !== null;
    }
    return true;
  };

  // Get navigation path based on wizard type
  const getNavigationPath = () => {
    const { wizardType } = wizardData;
    switch (wizardType) {
      case 'edit_todo':
        return '/notes?section=todos';
      case 'edit_note':
        return '/notes';
      case 'edit_devlog':
        return '/notes?section=devlog';
      case 'edit_component':
        return '/features';
      default:
        return '/';
    }
  };

  // Get display name for the item type
  const getItemTypeName = () => {
    const { wizardType } = wizardData;
    switch (wizardType) {
      case 'edit_todo':
        return 'Todo';
      case 'edit_note':
        return 'Note';
      case 'edit_devlog':
        return 'Dev Log Entry';
      case 'edit_component':
        return 'Component';
      default:
        return 'Item';
    }
  };

  // If completed, show success screen
  if (isCompleted) {
    return (
      <div className="mt-3 space-y-4">
        <div className="p-6 bg-success/10 rounded-lg border-2 border-success/30 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-bold mb-2">Update Complete!</h3>
          <p className="text-sm text-base-content/70 mb-4">
            Your {getItemTypeName().toLowerCase()} has been updated successfully.
          </p>

          {/* Show updated data preview */}
          <div className="p-4 bg-base-200 rounded-lg border-thick text-left mb-4">
            <div className="text-xs font-semibold text-base-content/60 mb-2">Updated Fields:</div>
            <div className="space-y-1">
              {Object.entries(formData).filter(([key]) => !key.includes('_temp') && key !== 'relationships' && key !== 'subtasks').map(([key, value]) => {
                const formatValue = (val: any): string => {
                  if (val === null || val === undefined) return 'N/A';
                  if (typeof val === 'object') {
                    if (Array.isArray(val)) return `[${val.length} items]`;
                    return JSON.stringify(val, null, 2);
                  }
                  const str = String(val);
                  return str.slice(0, 50) + (str.length > 50 ? '...' : '');
                };
                return (
                  <div key={key} className="text-sm">
                    <span className="font-semibold capitalize">{key}:</span>{' '}
                    <span className="text-base-content/80">{formatValue(value)}</span>
                  </div>
                );
              })}
              {/* Always show subtasks count for todos, even if not edited */}
              {wizardData.wizardType === 'edit_todo' && (() => {
                // Get subtasks from either formData or the original step value
                const subtasksStep = wizardData.steps.find((s: any) => s.id === 'subtasks');
                const subtasks = formData.subtasks || subtasksStep?.value || [];
                return (
                  <div className="text-sm">
                    <span className="font-semibold capitalize">subtasks:</span>{' '}
                    <span className="text-base-content/80">
                      {`[${subtasks.length} item${subtasks.length !== 1 ? 's' : ''}]`}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(getNavigationPath())}
            className="btn btn-primary w-full border-thick"
            style={{ color: getContrastTextColor('primary') }}
          >
            View {getItemTypeName()}s Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-base-content/60">
          Step {currentStep + 1} of {steps.length}
        </div>
        <div className="flex gap-1">
          {steps.map((_: any, idx: number) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full ${
                idx === currentStep ? 'bg-primary' :
                idx < currentStep ? 'bg-success' :
                'bg-base-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="p-4 bg-base-200 rounded-lg border-thick">
        <div className="text-sm font-semibold text-base-content mb-2">{step.label}</div>

        {step.type === 'text' && (
          <input
            type="text"
            value={formData[step.id] || step.value || ''}
            onChange={(e) => setFormData({ ...formData, [step.id]: e.target.value })}
            placeholder={step.placeholder}
            className="input input-bordered w-full"
          />
        )}

        {step.type === 'textarea' && (
          <textarea
            value={formData[step.id] || step.value || ''}
            onChange={(e) => setFormData({ ...formData, [step.id]: e.target.value })}
            placeholder={step.placeholder}
            rows={6}
            className="textarea textarea-bordered w-full resize-none font-mono text-sm"
          />
        )}

        {step.type === 'select' && (
          <select
            value={formData[step.id] || step.value || ''}
            onChange={(e) => setFormData({ ...formData, [step.id]: e.target.value })}
            className="select select-bordered w-full"
          >
            {step.options?.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )}

        {step.type === 'relationships' && (
          <div className="space-y-3">
            {/* Current relationships */}
            {(formData[step.id] || step.value || []).length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-base-content/70">Current Relationships ({(formData[step.id] || step.value || []).length})</div>
                {(formData[step.id] || step.value || []).map((rel: any, index: number) => {
                  const targetComp = (step.allComponents || step.availableComponents)?.find((c: any) => c.id === rel.targetId);
                  const isEditing = editingRelIndex === index;

                  // Relationship type colors
                  const relationshipColors: Record<string, string> = {
                    uses: '#3b82f6',
                    depends_on: '#f97316',
                  };

                  return (
                    <div key={rel.id || index} className="bg-base-300 p-2.5 rounded space-y-1.5 border border-base-content/10">
                      {isEditing ? (
                        <>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-medium truncate">{targetComp?.title || rel.targetId || 'Unknown'}</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={handleSaveRelationship}
                                className="btn btn-ghost btn-xs border-thick text-success hover:bg-success/20"
                                title="Save changes"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditRelationship}
                                className="btn btn-ghost btn-xs border-thick text-error hover:bg-error/20"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <select
                            value={editRelData.relationType}
                            onChange={(e) => setEditRelData({ ...editRelData, relationType: e.target.value as RelationshipType })}
                            className="select select-bordered select-xs w-full"
                          >
                            <option value="uses">Uses</option>
                            <option value="implements">Implements</option>
                            <option value="extends">Extends</option>
                            <option value="depends_on">Depends On</option>
                            <option value="calls">Calls</option>
                            <option value="contains">Contains</option>
                            <option value="mentions">Mentions</option>
                            <option value="similar">Similar</option>
                          </select>
                          <textarea
                            value={editRelData.description}
                            onChange={(e) => setEditRelData({ ...editRelData, description: e.target.value })}
                            placeholder="Optional description..."
                            className="textarea textarea-bordered textarea-xs w-full h-12 resize-none"
                          />
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{targetComp?.title || rel.targetId || 'Unknown'}</div>
                              <div className="flex items-center gap-2 text-xs text-base-content/60 mt-0.5">
                                <span
                                  className="badge badge-xs"
                                  style={{
                                    backgroundColor: relationshipColors[rel.relationType] || '#3b82f6',
                                    color: 'white',
                                    borderColor: relationshipColors[rel.relationType] || '#3b82f6'
                                  }}
                                >
                                  {rel.relationType}
                                </span>
                                {rel.description && <span className="truncate italic">{rel.description}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  handleEditRelationship(index, rel.relationType, rel.description || '');
                                }}
                                className="btn btn-ghost btn-xs border-thick hover:bg-primary/20"
                                title="Edit relationship"
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfirmation({
                                    isOpen: true,
                                    relationshipId: rel.id,
                                    targetTitle: targetComp?.title || rel.targetId || 'Unknown'
                                  });
                                }}
                                className="btn btn-ghost btn-xs border-thick text-error hover:bg-error/20"
                                title="Delete relationship"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-base-content/50 italic py-2">No relationships yet</div>
            )}

            {/* Add new relationship */}
            <div className="border-t border-base-content/10 pt-3">
              <div className="text-xs font-semibold text-base-content/70 mb-2">Add Relationship</div>
              <div className="space-y-2">
                <select
                  className="select select-bordered select-sm w-full"
                  value={formData[`${step.id}_temp`]?.targetId || ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const targetId = e.target.value;
                    const targetComp = step.availableComponents?.find((c: any) => c.id === targetId);

                    // Initialize temp relationship data
                    const tempData = {
                      targetId,
                      targetTitle: targetComp?.title || '',
                      relationType: 'uses',
                      description: ''
                    };
                    setFormData({ ...formData, [`${step.id}_temp`]: tempData });
                  }}
                >
                  <option value="">Select component...</option>
                  {step.availableComponents?.map((comp: any) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.category} • {comp.title}
                    </option>
                  ))}
                </select>

                {formData[`${step.id}_temp`] && (
                  <>
                    <select
                      className="select select-bordered select-sm w-full"
                      value={formData[`${step.id}_temp`].relationType}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          [`${step.id}_temp`]: { ...formData[`${step.id}_temp`], relationType: e.target.value }
                        });
                      }}
                    >
                      <option value="uses">Uses</option>
                      <option value="implements">Implements</option>
                      <option value="extends">Extends</option>
                      <option value="depends_on">Depends On</option>
                      <option value="calls">Calls</option>
                      <option value="contains">Contains</option>
                      <option value="mentions">Mentions</option>
                      <option value="similar">Similar</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Description (optional)"
                      className="input input-bordered input-sm w-full"
                      value={formData[`${step.id}_temp`].description || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          [`${step.id}_temp`]: { ...formData[`${step.id}_temp`], description: e.target.value }
                        });
                      }}
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const temp = formData[`${step.id}_temp`];
                          const newRel = {
                            id: `temp-${Date.now()}`,
                            targetId: temp.targetId,
                            relationType: temp.relationType,
                            description: temp.description
                          };
                          const updated = [...(formData[step.id] || step.value || []), newRel];
                          const newData = { ...formData, [step.id]: updated };
                          delete newData[`${step.id}_temp`];
                          setFormData(newData);
                        }}
                        className="btn btn-primary btn-sm border-thick flex-1"
                        style={{ color: getContrastTextColor('primary') }}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newData = { ...formData };
                          delete newData[`${step.id}_temp`];
                          setFormData(newData);
                        }}
                        className="btn btn-ghost btn-sm border-thick"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {step.type === 'subtasks' && (
          <div className="space-y-3">
            {/* Current subtasks */}
            {(formData[step.id] || step.value || []).length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-base-content/70">Current Subtasks ({(formData[step.id] || step.value || []).length})</div>
                {(formData[step.id] || step.value || []).map((subtask: any, index: number) => {
                  const isEditing = editingSubtaskIndex === index;

                  // Priority colors
                  const priorityColors: Record<string, string> = {
                    low: '#3b82f6',
                    medium: '#eab308',
                    high: '#ef4444',
                  };

                  // Status colors
                  const statusColors: Record<string, string> = {
                    not_started: '#6b7280',
                    in_progress: '#3b82f6',
                    completed: '#10b981',
                    blocked: '#ef4444',
                  };

                  return (
                    <div key={subtask.id || index} className="bg-base-300 p-2.5 rounded space-y-1.5 border border-base-content/10">
                      {isEditing ? (
                        <>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-medium">Edit Subtask</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={handleSaveSubtask}
                                className="btn btn-ghost btn-xs border-thick text-success hover:bg-success/20"
                                title="Save changes"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditSubtask}
                                className="btn btn-ghost btn-xs border-thick text-error hover:bg-error/20"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={editSubtaskData.title}
                            onChange={(e) => setEditSubtaskData({ ...editSubtaskData, title: e.target.value })}
                            placeholder="Subtask title"
                            className="input input-bordered input-xs w-full"
                          />
                          <textarea
                            value={editSubtaskData.description}
                            onChange={(e) => setEditSubtaskData({ ...editSubtaskData, description: e.target.value })}
                            placeholder="Optional description..."
                            className="textarea textarea-bordered textarea-xs w-full h-12 resize-none"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={editSubtaskData.priority}
                              onChange={(e) => setEditSubtaskData({ ...editSubtaskData, priority: e.target.value as any })}
                              className="select select-bordered select-xs w-full"
                            >
                              <option value="low">Low Priority</option>
                              <option value="medium">Medium Priority</option>
                              <option value="high">High Priority</option>
                            </select>
                            <select
                              value={editSubtaskData.status}
                              onChange={(e) => setEditSubtaskData({ ...editSubtaskData, status: e.target.value as any })}
                              className="select select-bordered select-xs w-full"
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="blocked">Blocked</option>
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{subtask.title || 'Untitled'}</div>
                              {subtask.description && (
                                <div className="text-xs text-base-content/60 mt-0.5 truncate italic">{subtask.description}</div>
                              )}
                              <div className="flex items-center gap-2 text-xs text-base-content/60 mt-1">
                                <span
                                  className="badge badge-xs"
                                  style={{
                                    backgroundColor: priorityColors[subtask.priority] || '#eab308',
                                    color: 'white',
                                    borderColor: priorityColors[subtask.priority] || '#eab308'
                                  }}
                                >
                                  {subtask.priority}
                                </span>
                                <span
                                  className="badge badge-xs"
                                  style={{
                                    backgroundColor: statusColors[subtask.status] || '#6b7280',
                                    color: 'white',
                                    borderColor: statusColors[subtask.status] || '#6b7280'
                                  }}
                                >
                                  {subtask.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  handleEditSubtask(index, subtask);
                                }}
                                className="btn btn-ghost btn-xs border-thick hover:bg-primary/20"
                                title="Edit subtask"
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteSubtaskConfirmation({
                                    isOpen: true,
                                    subtaskId: subtask.id,
                                    subtaskTitle: subtask.title || 'Untitled'
                                  });
                                }}
                                className="btn btn-ghost btn-xs border-thick text-error hover:bg-error/20"
                                title="Delete subtask"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-base-content/50 italic py-2">No subtasks yet</div>
            )}

            {/* Add new subtask */}
            <div className="border-t border-base-content/10 pt-3">
              <div className="text-xs font-semibold text-base-content/70 mb-2">Add Subtask</div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Subtask title"
                  className="input input-bordered input-sm w-full"
                  value={formData[`${step.id}_temp`]?.title || ''}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      [`${step.id}_temp`]: {
                        title: e.target.value,
                        description: formData[`${step.id}_temp`]?.description || '',
                        priority: formData[`${step.id}_temp`]?.priority || 'medium',
                        status: formData[`${step.id}_temp`]?.status || 'not_started'
                      }
                    });
                  }}
                />

                {formData[`${step.id}_temp`]?.title && (
                  <>
                    <textarea
                      placeholder="Optional description..."
                      className="textarea textarea-bordered textarea-sm w-full h-16 resize-none"
                      value={formData[`${step.id}_temp`]?.description || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          [`${step.id}_temp`]: { ...formData[`${step.id}_temp`], description: e.target.value }
                        });
                      }}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="select select-bordered select-sm w-full"
                        value={formData[`${step.id}_temp`]?.priority || 'medium'}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            [`${step.id}_temp`]: { ...formData[`${step.id}_temp`], priority: e.target.value }
                          });
                        }}
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>

                      <select
                        className="select select-bordered select-sm w-full"
                        value={formData[`${step.id}_temp`]?.status || 'not_started'}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            [`${step.id}_temp`]: { ...formData[`${step.id}_temp`], status: e.target.value }
                          });
                        }}
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const temp = formData[`${step.id}_temp`];

                          // Create subtask via API
                          try {
                            const newSubtask = await projectAPI.createTodo(currentProjectId!, {
                              text: temp.title,
                              description: temp.description || '',
                              priority: temp.priority,
                              status: temp.status,
                              parentTodoId: wizardData.todoId
                            });

                            // Add to local state
                            const updated = [...(formData[step.id] || step.value || []), {
                              id: newSubtask.todo.id,
                              title: temp.title,
                              description: temp.description || '',
                              priority: temp.priority,
                              status: temp.status
                            }];
                            const newData = { ...formData, [step.id]: updated };
                            delete newData[`${step.id}_temp`];
                            setFormData(newData);
                            toast.success('Subtask added');
                          } catch (error) {
                            console.error('Failed to add subtask:', error);
                            toast.error('Failed to add subtask');
                          }
                        }}
                        className="btn btn-primary btn-sm border-thick flex-1"
                        style={{ color: getContrastTextColor('primary') }}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newData = { ...formData };
                          delete newData[`${step.id}_temp`];
                          setFormData(newData);
                        }}
                        className="btn btn-ghost btn-sm border-thick"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="btn btn-outline border-thick"
        >
          Back
        </button>
        {currentStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid()}
            className="btn btn-primary border-thick"
            style={{ color: getContrastTextColor('primary') }}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isStepValid() || isSubmitting}
            className="btn btn-primary border-thick"
            style={{ color: getContrastTextColor('primary') }}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Updating...
              </>
            ) : (
              'Update'
            )}
          </button>
        )}
      </div>

      {/* Confirmation Modal for Delete Relationship */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onConfirm={handleDeleteRelationship}
        onCancel={() => setDeleteConfirmation({ isOpen: false, relationshipId: null, targetTitle: '' })}
        title="Delete Relationship"
        message={`Are you sure you want to delete the relationship to "<strong>${deleteConfirmation.targetTitle}</strong>"?<br/><br/>This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="error"
      />

      {/* Confirmation Modal for Delete Subtask */}
      <ConfirmationModal
        isOpen={deleteSubtaskConfirmation.isOpen}
        onConfirm={handleDeleteSubtask}
        onCancel={() => setDeleteSubtaskConfirmation({ isOpen: false, subtaskId: null, subtaskTitle: '' })}
        title="Delete Subtask"
        message={`Are you sure you want to delete the subtask "<strong>${deleteSubtaskConfirmation.subtaskTitle}</strong>"?<br/><br/>This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="error"
      />
    </div>
  );
};

export default EditWizard;
