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
        <div className="card-body p-3 sm:p-4">
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
            className="progress progress-primary w-full mb-3"
            value={progress}
            max="100"
          />

          {/* Content */}
          <div className="mb-3 text-center">
            <h3 className="text-base sm:text-lg font-bold mb-1.5 sm:mb-2">{currentStepData.content.heading}</h3>
            <p className="text-xs sm:text-sm text-base-content/80 mb-2">{currentStepData.content.body}</p>

            {/* Tips */}
            {currentStepData.content.tips && currentStepData.content.tips.length > 0 && (
              <div className="bg-base-200 rounded-2xl p-2 sm:p-3 mb-2 border-thick">
                <ul className="text-xs sm:text-sm space-y-0.5 sm:space-y-1 list-disc list-inside text-base-content/80">
                  {currentStepData.content.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action required badge */}
            {currentStepData.content.actionRequired && (
              <div className="alert alert-info p-2 sm:p-3 mb-2 border-thick flex justify-center items-center">
                <div className="w-full text-center">
                  <div className="text-xs sm:text-sm font-semibold mb-1">
                    Action Required
                  </div>
                  <div className="text-xs sm:text-sm">{currentStepData.content.actionRequired}</div>
                  <div className="mt-1 text-xs sm:text-sm opacity-70">Click "Next" when ready</div>
                </div>
              </div>
            )}
          </div>

          {/* Progress dots - show above buttons on larger screens */}
          <div className="hidden sm:flex gap-1 justify-center mb-2">
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

          {/* Footer */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={previousStep}
              disabled={isFirstStep}
              className="btn btn-xs sm:btn-sm btn-ghost"
            >
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>

            <button
              onClick={handleSkip}
              className="btn btn-xs sm:btn-sm btn-ghost text-base-content/60 hover:text-base-content/80"
            >
              Skip Tutorial
            </button>

            <button
              onClick={handleNext}
              className="btn btn-xs sm:btn-sm btn-primary"
            >
              {isLastStep ? 'Finish' : 'Next'}
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
