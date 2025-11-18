import React, { useEffect, useState } from 'react';
import { useTutorialContext } from '../../contexts/TutorialContext';
import type { User } from '../../api/types';

interface WelcomeModalProps {
  user: User | null;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ user }) => {
  const { startTutorial, skipTutorial } = useTutorialContext();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if we've already shown the modal this session
    const modalShown = sessionStorage.getItem('tutorialWelcomeShown');

    // Show welcome modal if user hasn't completed or skipped tutorial
    if (user && !user.tutorialCompleted && !user.tutorialProgress?.skipped && !modalShown) {
      // Only show if they haven't started (currentStep is 0)
      const currentStep = user.tutorialProgress?.currentStep ?? 0;
      if (currentStep === 0) {
        setIsOpen(true);
        // Mark as shown for this session
        sessionStorage.setItem('tutorialWelcomeShown', 'true');
      }
    }
  }, [user]);

  if (!isOpen) {
    return null;
  }

  const handleStart = () => {
    setIsOpen(false);
    startTutorial();
  };

  const handleSkip = () => {
    setIsOpen(false);
    skipTutorial();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="card bg-base-100 shadow-2xl w-full max-w-lg mx-4">
        <div className="card-body">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="card-title text-2xl justify-center mb-2">
            Welcome to Project Manager!
          </h2>

          {/* Description */}
          <p className="text-center text-base-content/70 mb-6">
            This is a quick interactive tutorial to help you jump in and explore all of the features.
            It will only take a few minutes!
          </p>

          {/* Features list */}
          <div className="bg-base-200 rounded-lg p-4 mb-6">
            <div className="text-sm font-semibold mb-2">You'll learn how to:</div>
            <ul className="text-sm space-y-1.5 list-disc list-inside text-base-content/80">
              <li>Create and manage projects</li>
              <li>Use the terminal interface</li>
              <li>Organize notes, todos, and devlogs</li>
              <li>Collaborate with your team</li>
              <li>And much more...</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="card-actions justify-center gap-3">
            <button
              onClick={handleSkip}
              className="btn btn-ghost"
            >
              Skip for now
            </button>
            <button
              onClick={handleStart}
              className="btn btn-primary"
            >
              Start Tutorial
            </button>
          </div>

          <p className="text-xs text-center text-base-content/50 mt-4">
            You can restart/replay the tutorial anytime from the Help page
          </p>
        </div>
      </div>
    </div>
  );
};
