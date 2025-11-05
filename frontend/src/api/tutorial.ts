import { BaseApiService } from './base';
import { TutorialStep, TutorialProgress } from '../../../shared/types';

interface TutorialStepsResponse {
  steps: TutorialStep[];
}

interface TutorialProgressResponse {
  tutorialCompleted: boolean;
  tutorialProgress: TutorialProgress;
}

interface UpdateProgressRequest {
  currentStep: number;
  completedSteps: number[];
}

class TutorialService extends BaseApiService {
  constructor() {
    super('/tutorial');
  }

  async getSteps(): Promise<TutorialStepsResponse> {
    return this.get('/steps');
  }

  async getProgress(): Promise<TutorialProgressResponse> {
    return this.get('/progress');
  }

  async updateProgress(data: UpdateProgressRequest): Promise<TutorialProgressResponse> {
    return this.patch('/progress', data);
  }

  async completeTutorial(): Promise<{ tutorialCompleted: boolean; message: string }> {
    return this.post('/complete', {});
  }

  async skipTutorial(): Promise<{ message: string; tutorialProgress: TutorialProgress }> {
    return this.patch('/skip', {});
  }

  async resetTutorial(): Promise<{ message: string; tutorialProgress: TutorialProgress }> {
    return this.post('/reset', {});
  }
}

export const tutorialAPI = new TutorialService();
