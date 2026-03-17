import React, { useState, useEffect } from 'react';
import { terminalAPI } from '../api';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { toast } from '../services/toast';

interface ConfirmationWizardProps {
  message: string;
  confirmationData: {
    featureTitle?: string;
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
      <div className="mt-3 p-4 bg-success/10 rounded-lg border-thick border-l-4 border-l-success">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-success flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-bold text-base">Done!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-start gap-3 p-3 bg-error/5 rounded-lg border-thick border-l-4 border-l-error">
        <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="text-sm text-base-content/80">
          {confirmationData.relationType ? (
            <>
              Delete the <span className="font-semibold">{confirmationData.relationType}</span> relationship from{' '}
              <span className="font-semibold">"{confirmationData.featureTitle}"</span> to{' '}
              <span className="font-semibold">"{confirmationData.targetTitle}"</span>?
            </>
          ) : (
            <>
              Delete {confirmationData.itemType}{' '}
              <span className="font-semibold">"{confirmationData.itemTitle}"</span>?
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-sm btn-error border-thick"
          onClick={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Deleting...
            </>
          ) : (
            'Yes, Delete'
          )}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost border-thick"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ConfirmationWizard;
