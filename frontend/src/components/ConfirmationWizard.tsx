import React, { useState, useEffect } from 'react';
import { terminalAPI } from '../api';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { toast } from '../services/toast';

interface ConfirmationWizardProps {
  message: string;
  confirmationData: {
    componentTitle?: string;
    targetTitle?: string;
    relationType?: string;
    itemTitle?: string;
    itemType?: string;
    command: string;
  };
  projectId?: string;
  onCommandClick?: (command: string) => void;
}

const ConfirmationWizard: React.FC<ConfirmationWizardProps> = ({
  message,
  confirmationData,
  projectId,
  onCommandClick
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Handle Escape key to cancel
  useEffect(() => {
    if (isCompleted) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isCompleted, isSubmitting]);

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      const result = await terminalAPI.executeCommand(confirmationData.command, projectId);

      if (result.type === 'error') {
        toast.error(result.message || 'Failed to delete');
        setIsSubmitting(false);
      } else {
        toast.success(result.message || 'Deleted successfully!');
        setIsCompleted(true);
      }
    } catch (error) {
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Just mark as completed to close the wizard
    setIsCompleted(true);
  };

  if (isCompleted) {
    return (
      <div className="mt-3 p-4 bg-base-200 rounded-lg border-thick">
        <div className="text-center space-y-3">
          <div className="text-4xl">✅</div>
          <div className="font-bold text-lg">Done!</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="text-sm text-base-content/80">
        {confirmationData.relationType ? (
          // Relationship deletion
          <>
            Delete the <span className="font-semibold">{confirmationData.relationType}</span> relationship from{' '}
            <span className="font-semibold">"{confirmationData.componentTitle}"</span> to{' '}
            <span className="font-semibold">"{confirmationData.targetTitle}"</span>?
          </>
        ) : (
          // Generic item deletion
          <>
            Delete {confirmationData.itemType}{' '}
            <span className="font-semibold">"{confirmationData.itemTitle}"</span>?
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-sm btn-error"
          onClick={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Deleting...
            </>
          ) : (
            'Yes'
          )}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          No
        </button>
      </div>
    </div>
  );
};

export default ConfirmationWizard;
