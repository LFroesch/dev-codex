import React, { useState } from 'react';
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
      console.error('Failed to execute command:', error);
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
    <div className="mt-3 p-4 bg-warning/10 rounded-lg border-2 border-warning/30">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl flex-shrink-0">⚠️</div>
          <div className="flex-1">
            <div className="font-bold text-lg mb-2">{message}</div>
            <div className="text-sm text-base-content/70">
              {confirmationData.relationType ? (
                // Relationship deletion
                <>
                  Are you sure you want to delete the{' '}
                  <span className="font-semibold">{confirmationData.relationType}</span> relationship from{' '}
                  <span className="font-semibold">"{confirmationData.componentTitle}"</span> to{' '}
                  <span className="font-semibold">"{confirmationData.targetTitle}"</span>?
                </>
              ) : (
                // Generic item deletion
                <>
                  Are you sure you want to delete the {confirmationData.itemType}{' '}
                  <span className="font-semibold">"{confirmationData.itemTitle}"</span>?
                </>
              )}
            </div>
            <div className="text-xs text-base-content/50 mt-2">
              This action cannot be undone.
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-error btn-sm"
            onClick={handleConfirm}
            disabled={isSubmitting}
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
        </div>
      </div>
    </div>
  );
};

export default ConfirmationWizard;
