import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tutorialAPI } from '../api/tutorial';
import { TutorialStep } from '../../../shared/types';
import { toast } from '../services/toast';

interface UseTutorialReturn {
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

export const useTutorial = (): UseTutorialReturn => {
  const navigate = useNavigate();
  const [tutorialSteps, setTutorialSteps] = useState<TutorialStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Load tutorial steps on mount, then load progress
  useEffect(() => {
    const init = async () => {
      await loadTutorialSteps();
      await loadUserProgress();
    };
    init();
  }, []);

  const loadTutorialSteps = async () => {
    try {
      setIsLoading(true);
      const { steps } = await tutorialAPI.getSteps();
      setTutorialSteps(steps);
    } catch (error) {
      console.error('Failed to load tutorial steps:', error);
      toast.error('Failed to load tutorial');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProgress = async () => {
    try {
      const { tutorialCompleted, tutorialProgress } = await tutorialAPI.getProgress();

      if (!tutorialCompleted && !tutorialProgress.skipped) {
        setCurrentStep(tutorialProgress.currentStep);
        setCompletedSteps(tutorialProgress.completedSteps);

        // If user has started the tutorial (currentStep > 0), resume it
        if (tutorialProgress.currentStep > 0) {
          setIsActive(true);
        }
      }
    } catch (error) {
      console.error('Failed to load tutorial progress:', error);
    }
  };

  const saveProgress = useCallback(async (step: number, completed: number[]) => {
    try {
      await tutorialAPI.updateProgress({
        currentStep: step,
        completedSteps: completed
      });
    } catch (error) {
      console.error('Failed to save tutorial progress:', error);
    }
  }, []);

  const startTutorial = useCallback(() => {
    if (tutorialSteps.length === 0) {
      console.warn('Cannot start tutorial: steps not loaded yet');
      return;
    }

    setIsActive(true);
    setCurrentStep(1);
    setCompletedSteps([]);

    // Navigate to first step's route
    const firstStep = tutorialSteps[0];
    if (firstStep) {
      navigate(firstStep.route);
      saveProgress(1, []);
    }
  }, [tutorialSteps, navigate, saveProgress]);

  const nextStep = useCallback(() => {
    if (currentStep >= tutorialSteps.length) {
      completeTutorial();
      return;
    }

    const newStep = currentStep + 1;
    const newCompleted = [...completedSteps, currentStep];

    setCurrentStep(newStep);
    setCompletedSteps(newCompleted);

    // Navigate to next step's route
    const nextStepData = tutorialSteps[newStep - 1];
    if (nextStepData) {
      navigate(nextStepData.route);
      saveProgress(newStep, newCompleted);
    }
  }, [currentStep, tutorialSteps, completedSteps, navigate, saveProgress]);

  const previousStep = useCallback(() => {
    if (currentStep <= 1) return;

    const newStep = currentStep - 1;
    setCurrentStep(newStep);

    // Navigate to previous step's route
    const prevStepData = tutorialSteps[newStep - 1];
    if (prevStepData) {
      navigate(prevStepData.route);
      saveProgress(newStep, completedSteps);
    }
  }, [currentStep, tutorialSteps, completedSteps, navigate, saveProgress]);

  const skipTutorial = useCallback(async () => {
    try {
      await tutorialAPI.skipTutorial();
      setIsActive(false);
      setCurrentStep(0); // Reset currentStep so resume button doesn't show
      setCompletedSteps([]);
      // Clear session storage so modal won't show again
      sessionStorage.setItem('tutorialWelcomeShown', 'true');
      toast.info('Tutorial skipped. You can restart it anytime from the Help page.');
    } catch (error) {
      console.error('Failed to skip tutorial:', error);
      toast.error('Failed to skip tutorial');
    }
  }, []);

  const completeTutorial = useCallback(async () => {
    try {
      await tutorialAPI.completeTutorial();
      setIsActive(false);
      setCurrentStep(0);
      setCompletedSteps(tutorialSteps.map(s => s.stepNumber));
      // Clear session storage
      sessionStorage.setItem('tutorialWelcomeShown', 'true');
      toast.success('🎉 Tutorial completed! You\'re all set to explore on your own.');
    } catch (error) {
      console.error('Failed to complete tutorial:', error);
      toast.error('Failed to complete tutorial');
    }
  }, [tutorialSteps]);

  const goToStep = useCallback((stepNumber: number) => {
    if (stepNumber < 1 || stepNumber > tutorialSteps.length) return;

    setIsActive(true);
    setCurrentStep(stepNumber);

    // Navigate to step's route
    const stepData = tutorialSteps[stepNumber - 1];
    if (stepData) {
      navigate(stepData.route);
      saveProgress(stepNumber, completedSteps);
    }
  }, [tutorialSteps, completedSteps, navigate, saveProgress]);

  const closeTutorial = useCallback(() => {
    setIsActive(false);
    saveProgress(currentStep, completedSteps);
  }, [currentStep, completedSteps, saveProgress]);

  const currentStepData = tutorialSteps[currentStep - 1] || null;

  return {
    tutorialSteps,
    currentStep,
    currentStepData,
    isActive,
    isLoading,
    completedSteps,
    totalSteps: tutorialSteps.length,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    goToStep,
    closeTutorial
  };
};
