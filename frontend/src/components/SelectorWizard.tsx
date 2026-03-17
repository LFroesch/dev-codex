import React, { useState, useEffect } from 'react';
import { terminalAPI } from '../api';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { toast } from '../services/toast';

interface SelectorWizardProps {
  wizardType: string;
  step: {
    label: string;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
  };
  projectId?: string;
  entryId: string;
  onSelectorTransition?: (entryId: string, itemType: string, itemId: string) => Promise<void>;
  onCommandClick?: (command: string) => void;
}

const SelectorWizard: React.FC<SelectorWizardProps> = ({ wizardType, step, projectId, entryId, onSelectorTransition, onCommandClick }) => {
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Only used for delete

  // Detect selector type
  const isEditSelector = wizardType?.includes('edit_');
  const isDeleteSelector = wizardType?.includes('delete_');
  const isViewSelector = wizardType?.includes('view_');

  // Handle Escape key - for delete selectors, mark as finished; otherwise close/do nothing
  useEffect(() => {
    if (isFinished) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        if (isDeleteSelector) {
          setIsFinished(true);
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFinished, isSubmitting, isDeleteSelector]);

  // Filter out deleted items from options (only for delete selectors)
  const availableOptions = isDeleteSelector
    ? (step.options?.filter((opt) => !deletedIds.includes(opt.value)) || [])
    : (step.options || []);

  const getItemTypeName = () => {
    if (wizardType === 'delete_feature_selector' || wizardType === 'edit_feature_selector') return 'feature';
    if (wizardType === 'delete_devlog_selector' || wizardType === 'edit_devlog_selector') return 'devlog';
    if (wizardType === 'delete_todo_selector' || wizardType === 'edit_todo_selector') return 'todo';
    if (wizardType === 'delete_note_selector' || wizardType === 'edit_note_selector') return 'note';
    if (wizardType === 'view_relationships_selector') return 'relationships';
    if (wizardType === 'delete_relationship_selector' || wizardType === 'edit_relationship_selector') return 'relationship';
    return 'item';
  };

  const handleView = async () => {
    if (!selectedValue || !onCommandClick) return;

    const itemType = getItemTypeName();

    // For relationships selector, the value is a feature ID, so view relationships for that feature
    if (wizardType === 'view_relationships_selector') {
      // Get the feature title from the label
      const selectedOption = availableOptions.find(opt => opt.value === selectedValue);
      const featureTitle = selectedOption?.label.split(' (')[0] || selectedValue;
      const command = `/view relationships "${featureTitle}"`;
      onCommandClick(command);
    } else {
      const command = `/view ${itemType.replace(' entry', '')} "${selectedValue}"`;
      onCommandClick(command);
    }
  };

  const handleEdit = async () => {
    if (!selectedValue) return;

    // For view_relationships_selector, edit the feature (not individual relationship)
    if (wizardType === 'view_relationships_selector') {
      // Get the feature title from the label
      const selectedOption = availableOptions.find(opt => opt.value === selectedValue);
      const featureTitle = selectedOption?.label.split(' (')[0] || selectedValue;
      if (onCommandClick) {
        onCommandClick(`/edit feature "${featureTitle}"`);
      }
      return;
    }

    // Special handling for edit_relationship_selector (format: featureId|relationshipIndex)
    if (wizardType === 'edit_relationship_selector') {
      const [featureId, relationshipIndex] = selectedValue.split('|');
      if (onCommandClick) {
        // Get the full label to extract both feature and target titles
        const selectedOption = availableOptions.find(opt => opt.value === selectedValue);
        const label = selectedOption?.label || '';
        // Label format: "FeatureTitle relationType TargetTitle"
        const parts = label.split(' ');
        const featureTitle = parts[0];
        const targetTitle = parts.slice(2).join(' '); // Everything after relationType
        // Execute command to open the wizard (no trailing space)
        onCommandClick(`/edit relationship "${featureTitle}" "${targetTitle}"`);
      }
      return;
    }

    // Find the index of the selected item in the options (1-based)
    const selectedIndex = availableOptions.findIndex(opt => opt.value === selectedValue);
    const itemIndex = selectedIndex + 1; // Convert to 1-based index

    // For edit selectors, transition to edit wizard using index
    if (onSelectorTransition) {
      await onSelectorTransition(entryId, getItemTypeName(), itemIndex.toString());
    } else if (onCommandClick) {
      // Fallback: execute edit command with index
      const itemType = getItemTypeName();
      const command = `/edit ${itemType.replace(' entry', '')} ${itemIndex}`;
      onCommandClick(command);
    }
  };

  const handleDelete = async () => {
    if (!selectedValue) return;

    let command: string;

    // Special handling for delete_relationship_selector (format: featureId|relationshipIndex)
    if (wizardType === 'delete_relationship_selector') {
      const [featureId, relationshipIndex] = selectedValue.split('|');
      // Get the feature title from the label
      const selectedOption = availableOptions.find(opt => opt.value === selectedValue);
      const label = selectedOption?.label || '';
      const featureTitle = label.split(' ')[0];
      command = `/delete relationship "${featureTitle}" ${relationshipIndex} --confirm`;
    } else {
      command = `/delete ${getItemTypeName().replace(' entry', '')} "${selectedValue}" --confirm`;
    }

    setIsSubmitting(true);
    try {
      const result = await terminalAPI.executeCommand(command, projectId);

      if (result.type === 'error') {
        toast.error(result.message || 'Failed to delete');
        setIsSubmitting(false);
      } else {
        toast.success(result.message || 'Deleted successfully!');
        // Add to deleted list and reset selection
        setDeletedIds([...deletedIds, selectedValue]);
        setSelectedValue('');
        setIsSubmitting(false);
      }
    } catch (error) {
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSubmitting(false);
    }
  };

  // Show completion screen
  if (isFinished) {
    return (
      <div className="mt-3 p-4 bg-success/10 rounded-lg border-thick border-l-4 border-l-success">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-bold text-base">All Done!</span>
        </div>
        <div className="text-sm text-base-content/70 ml-8">
          {deletedIds.length > 0
            ? `Successfully deleted ${deletedIds.length} ${getItemTypeName()}${deletedIds.length !== 1 ? 's' : ''}.`
            : 'No items were deleted.'}
        </div>
      </div>
    );
  }

  // Show "no items left" message if all deleted
  if (availableOptions.length === 0) {
    return (
      <div className="mt-3 p-4 bg-success/10 rounded-lg border-thick border-l-4 border-l-success">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-bold text-base">All Items Deleted!</span>
        </div>
        <div className="text-sm text-base-content/70 ml-8">
          You've deleted all {deletedIds.length} {getItemTypeName()}{deletedIds.length !== 1 ? 's' : ''}.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 bg-base-200 rounded-lg border-thick">
      <div className="space-y-4">
        {deletedIds.length > 0 && (
          <div className="text-xs text-success font-semibold">
            ✓ {deletedIds.length} {getItemTypeName()}{deletedIds.length !== 1 ? 's' : ''} deleted
          </div>
        )}

        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-semibold">{step.label}</span>
            <span className="label-text-alt text-base-content/60">
              {availableOptions.length} remaining
            </span>
          </label>
          <select
            className="select select-bordered w-full border-thick"
            value={selectedValue}
            onChange={(e) => setSelectedValue(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">{step.placeholder || 'Select an option...'}</option>
            {availableOptions.map((option: { value: string; label: string }) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 justify-between">
          {isDeleteSelector && (
            <button
              type="button"
              className="btn btn-ghost btn-sm border-thick"
              onClick={() => setIsFinished(true)}
            >
              I'm Finished
            </button>
          )}
          {isViewSelector ? (
            // View selector: only show View button (relationships are edited in the detail view)
            <button
              type="button"
              className="btn btn-info btn-sm border-thick ml-auto"
              onClick={handleView}
              disabled={!selectedValue}
            >
              View
            </button>
          ) : isEditSelector ? (
            <button
              type="button"
              className="btn btn-primary btn-sm border-thick ml-auto"
              onClick={handleEdit}
              disabled={!selectedValue}
              style={{ color: getContrastTextColor('primary') }}
            >
              Edit Selected
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-error btn-sm border-thick"
              onClick={handleDelete}
              disabled={!selectedValue || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectorWizard;
