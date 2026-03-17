import React from 'react';

interface WizardStepperProps {
  steps: Array<{ id?: string; label: string; [key: string]: any }>;
  currentStep: number;
  title: string;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({ steps, currentStep, title }) => {
  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-base-200 rounded-lg border-thick border-l-4 border-l-primary">
        <span className="text-base font-bold">{title}</span>
        <span className="text-sm text-base-content/50 font-mono ml-auto">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      {/* Numbered stepper */}
      <div className="flex items-center gap-1 px-2">
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          const isFuture = idx > currentStep;

          return (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                  isActive ? 'bg-primary text-primary-content' :
                  isCompleted ? 'bg-success text-success-content' :
                  'bg-base-300 text-base-content/40'
                }`}>
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className={`text-[10px] font-medium truncate max-w-[5rem] text-center ${
                  isActive ? 'text-primary' :
                  isCompleted ? 'text-success' :
                  'text-base-content/30'
                }`}>
                  {step.label.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 rounded-full mt-[-1rem] min-w-[1rem] ${
                  idx < currentStep ? 'bg-success' : 'bg-base-300'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
