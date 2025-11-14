import React, { useState } from 'react';
import { useTutorialContext } from '../../contexts/TutorialContext';
import ConfirmationModal from '../ConfirmationModal';

export const TutorialOverlay: React.FC = () => {
  const {
    currentStepData,
    currentStep,
    totalSteps,
    isActive,
    isLoading,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    closeTutorial
  } = useTutorialContext();

  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Don't show if not active, still loading, or no step data
  if (!isActive || isLoading || !currentStepData || totalSteps === 0) {
    return null;
  }

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  const progress = (currentStep / totalSteps) * 100;

  const handleClose = () => {
    // Just hide the tutorial, don't skip it permanently
    closeTutorial();
  };

  const handleSkip = () => {
    setShowSkipConfirm(true);
  };

  const handleConfirmSkip = () => {
    skipTutorial();
    setShowSkipConfirm(false);
  };

  const handleNext = () => {
    if (isLastStep) {
      completeTutorial();
    } else {
      nextStep();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 w-full max-w-xs sm:max-w-md animate-slide-in-right px-4 sm:px-0">
      <div className="card bg-base-100 shadow-2xl border-thick">
        {/* Header */}
        <div className="card-body p-2 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs sm:text-sm font-semibold text-base-content/70">
              Step {currentStep}/{totalSteps}
            </div>
            <button
              onClick={handleClose}
              className="btn btn-ghost btn-xs"
              aria-label="Minimize tutorial"
              title="Minimize tutorial (you can resume later)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              <span className="hidden sm:inline ml-1">Minimize</span>
            </button>
          </div>

          {/* Progress bar */}
          <progress
            className="progress progress-primary w-full mb-2"
            value={progress}
            max="100"
          />

          {/* Content */}
          <div>
            <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2">{currentStepData.content.heading}</h3>
            <p className="text-xs sm:text-sm text-base-content/80 mb-2">{currentStepData.content.body}</p>

            {/* Tips */}
            {currentStepData.content.tips && currentStepData.content.tips.length > 0 && (
              <div className="bg-base-200 rounded-lg p-2 mb-2 border-thick border-base-300">
                <div className="text-xs font-semibold mb-1">💡 Tips:</div>
                <ul className="text-xs space-y-0.5 list-disc list-inside">
                  {currentStepData.content.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action required badge */}
            {currentStepData.content.actionRequired && (
              <div className="alert alert-info py-1.5 px-2 text-xs mb-2 border-thick border-info">
                <div>
                  <div className="font-semibold mb-0.5">⚡ Action Required:</div>
                  <div className="text-xs">{currentStepData.content.actionRequired}</div>
                  <div className="mt-0.5 text-xs opacity-70 hidden sm:block">Click "Next" when ready</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 sm:mt-4">
            <button
              onClick={previousStep}
              disabled={isFirstStep}
              className="btn btn-xs sm:btn-sm btn-ghost border-thick"
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>

            {/* Progress dots - hide on mobile */}
            <div className="hidden sm:flex gap-1">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index + 1 === currentStep
                      ? 'bg-primary'
                      : index + 1 < currentStep
                      ? 'bg-primary/40'
                      : 'bg-base-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="btn btn-xs sm:btn-sm btn-primary border-thick"
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>

          {/* Skip link */}
          <div className="text-center mt-1 sm:mt-2">
            <button
              onClick={handleSkip}
              className="text-xs text-base-content/50 hover:text-base-content/80 transition-colors underline"
            >
              Skip permanently
            </button>
          </div>
        </div>
      </div>

      {/* Skip Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSkipConfirm}
        onConfirm={handleConfirmSkip}
        onCancel={() => setShowSkipConfirm(false)}
        title="Skip Tutorial Permanently?"
        message="Are you sure you want to skip the tutorial? You can restart it anytime from the Help page."
        confirmText="Skip Tutorial"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};
