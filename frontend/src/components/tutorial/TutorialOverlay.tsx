import React from 'react';
import { useTutorialContext } from '../../contexts/TutorialContext';

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
    if (window.confirm('Are you sure you want to skip the tutorial permanently? You can restart it anytime from the Help page.')) {
      skipTutorial();
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      completeTutorial();
    } else {
      nextStep();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 w-full max-w-md animate-slide-in-right">
      <div className="card bg-base-100 shadow-2xl border-thick">
        {/* Header */}
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-base-content/70">
              Step {currentStep} of {totalSteps}
            </div>
            <button
              onClick={handleClose}
              className="btn btn-ghost btn-xs btn-circle"
              aria-label="Close tutorial"
              title="Hide tutorial (you can resume later)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <progress
            className="progress progress-primary w-full"
            value={progress}
            max="100"
          />

          {/* Content */}
          <div className="mt-4">
            <h3 className="text-lg font-bold mb-2">{currentStepData.content.heading}</h3>
            <p className="text-sm text-base-content/80 mb-3">{currentStepData.content.body}</p>

            {/* Tips */}
            {currentStepData.content.tips && currentStepData.content.tips.length > 0 && (
              <div className="bg-base-200 rounded-lg p-3 mb-3 border-thick border-base-300">
                <div className="text-xs font-semibold mb-2">💡 Tips:</div>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  {currentStepData.content.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action required badge */}
            {currentStepData.content.actionRequired && (
              <div className="alert alert-info py-2 px-3 text-xs mb-3 border-thick border-info">
                <div>
                  <div className="font-semibold mb-1">⚡ Action Required:</div>
                  <div>{currentStepData.content.actionRequired}</div>
                  <div className="mt-1 text-xs opacity-70">Click "Next" when you're ready to continue</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={previousStep}
              disabled={isFirstStep}
              className="btn btn-sm btn-ghost border-thick"
            >
              Previous
            </button>

            {/* Progress dots */}
            <div className="flex gap-1">
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
              className="btn btn-sm btn-primary border-thick"
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>

          {/* Skip link */}
          <div className="text-center mt-2">
            <button
              onClick={handleSkip}
              className="text-xs text-base-content/50 hover:text-base-content/80 transition-colors underline"
            >
              Skip tutorial permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
