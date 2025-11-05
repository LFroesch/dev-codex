import React, { createContext, useContext, ReactNode } from 'react';
import { useTutorial } from '../hooks/useTutorial';
import { TutorialStep } from '../../../shared/types';

interface TutorialContextValue {
  tutorialSteps: TutorialStep[];
  currentStep: number;
  currentStepData: TutorialStep | null;
  isActive: boolean;
  isLoading: boolean;
  completedSteps: number[];
  totalSteps: number;
  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  goToStep: (stepNumber: number) => void;
  closeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

export const useTutorialContext = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorialContext must be used within a TutorialProvider');
  }
  return context;
};

interface TutorialProviderProps {
  children: ReactNode;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
  const tutorial = useTutorial();

  return (
    <TutorialContext.Provider value={tutorial}>
      {children}
    </TutorialContext.Provider>
  );
};
