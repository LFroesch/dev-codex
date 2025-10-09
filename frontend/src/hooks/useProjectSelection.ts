import { analyticsAPI } from '../api';
import type { Project } from '../api/types';
import { toast } from '../services/toast';

interface UseProjectSelectionProps {
  analyticsReady: boolean;
  analytics: any;
  setSearchTerm: (term: string) => void;
  loadProjectTimeData: () => void;
}

export const useProjectSelection = ({
  analyticsReady,
  analytics,
  setSearchTerm,
  loadProjectTimeData
}: UseProjectSelectionProps) => {

  // Helper function to select project
  const handleProjectSelect = async (
    project: Project,
    setSelectedProject: (project: Project | null) => void
  ) => {
    // Prevent project selection until analytics session is ready
    if (!analyticsReady) {
      toast.warning('Please wait for session to initialize before selecting a project...');
      return;
    }

    setSelectedProject(project);
    setSearchTerm(''); // Clear search when selecting a project

    // Save selected project to localStorage for refresh persistence
    localStorage.setItem('selectedProjectId', project.id);

    // Update analytics service current project (this handles backend time recording)
    try {
      await analytics.setCurrentProject(project.id);
    } catch (error) {

      // Fallback to direct API call if analytics service fails
      const sessionInfo = analytics.getSessionInfo();
      if (sessionInfo?.sessionId) {
        analyticsAPI.switchProject(sessionInfo.sessionId, project.id).catch(() => {
        });
      }
    }

    // Update project time data immediately after switching
    setTimeout(() => {
      loadProjectTimeData();
    }, 1000); // Small delay to allow backend time tracking to update

    // Scroll to top when selecting a project
    window.scrollTo(0, 0);
  };

  return {
    handleProjectSelect
  };
};
