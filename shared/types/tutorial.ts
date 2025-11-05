export interface TutorialStep {
  stepNumber: number;
  title: string;
  route: string;
  content: {
    heading: string;
    body: string;
    tips?: string[];
    actionRequired?: string;
  };
  requiresProjectSelection: boolean;
}

export interface TutorialProgress {
  currentStep: number;
  completedSteps: number[];
  skipped: boolean;
  lastActiveDate: string;
}

export interface TutorialState {
  steps: TutorialStep[];
  currentStep: number;
  isActive: boolean;
  isLoading: boolean;
  completedSteps: number[];
}
