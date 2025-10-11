import { useEffect } from 'react';
import type { Project } from '../api/types';
import { toast } from '../services/toast';
import { NavigateFunction } from 'react-router-dom';

interface UseLayoutEventsProps {
  projects: Project[];
  user: any;
  setSelectedProject: (project: Project | null) => void;
  loadProjectsWrapper: () => void;
  loadProjectTimeData: () => void;
  analytics: any;
  isHandlingTimeout: boolean;
  setIsHandlingTimeout: (value: boolean) => void;
  navigate: NavigateFunction;
}

export const useLayoutEvents = ({
  projects,
  user,
  setSelectedProject,
  loadProjectsWrapper,
  loadProjectTimeData,
  analytics,
  isHandlingTimeout,
  setIsHandlingTimeout,
  navigate
}: UseLayoutEventsProps) => {

  // Listen for custom project selection events from notifications
  useEffect(() => {
    const handleSelectProject = (event: CustomEvent) => {
      const { projectId } = event.detail;
      if (projects.length > 0) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          setSelectedProject(project);
        }
      }
    };

    const handleRefreshProject = () => {
      if (user) {
        loadProjectsWrapper();
      }
    };

    const handleProjectSync = (event: CustomEvent) => {
      const { newProjectId } = event.detail;

      if (projects.length > 0 && newProjectId) {
        const project = projects.find(p => p.id === newProjectId);
        if (project) {
          setSelectedProject(project);

          // Show subtle feedback
          toast.success(`Switched to ${project.name}`);

          // Update project time data
          setTimeout(() => {
            loadProjectTimeData();
          }, 500);
        }
      }
    };

    const handleSessionTimeout = async (event?: Event) => {
      // Check if analytics service already handled this timeout
      const handledByAnalytics = (event as CustomEvent)?.detail?.handledByAnalytics;

      // Prevent multiple timeout handlers from running
      if (isHandlingTimeout) {
        return;
      }
      setIsHandlingTimeout(true);

      try {
        // ALWAYS clear the selected project UI state and localStorage
        setSelectedProject(null);
        localStorage.removeItem('selectedProjectId');

        // If analytics didn't handle it, we need to end the session ourselves
        if (!handledByAnalytics && analytics.hasActiveSession()) {
          await analytics.endSession();
        }

        // Don't reload projects here - we're navigating away and it might restore the selected project
        // Force refresh of time data only
        await loadProjectTimeData();

        // Navigate to projects view
        navigate('/notes?view=projects');

        // Show unique feedback to user
        toast.info('Session timed out due to inactivity. Time has been saved. Please select a project to continue.', 5000, true);
      } finally {
        setIsHandlingTimeout(false);
      }
    };

    const handleForceProjectClear = () => {
      setSelectedProject(null);
      localStorage.removeItem('selectedProjectId');
    };

    window.addEventListener('selectProject', handleSelectProject as EventListener);
    window.addEventListener('refreshProject', handleRefreshProject as EventListener);
    window.addEventListener('projectSync', handleProjectSync as EventListener);
    window.addEventListener('sessionTimeout', handleSessionTimeout as EventListener);
    window.addEventListener('forceProjectClear', handleForceProjectClear as EventListener);

    return () => {
      window.removeEventListener('selectProject', handleSelectProject as EventListener);
      window.removeEventListener('refreshProject', handleRefreshProject as EventListener);
      window.removeEventListener('projectSync', handleProjectSync as EventListener);
      window.removeEventListener('sessionTimeout', handleSessionTimeout as EventListener);
      window.removeEventListener('forceProjectClear', handleForceProjectClear as EventListener);
    };
  }, [projects, user, setSelectedProject, loadProjectsWrapper, loadProjectTimeData, analytics, isHandlingTimeout, setIsHandlingTimeout, navigate]);

  // Update project time data on analytics heartbeat for real-time updates
  useEffect(() => {
    if (!user) return;

    const handleHeartbeat = () => {
      loadProjectTimeData();
    };

    window.addEventListener('analyticsHeartbeat', handleHeartbeat);

    return () => {
      window.removeEventListener('analyticsHeartbeat', handleHeartbeat);
    };
  }, [user, loadProjectTimeData]);

  // Update project time data when user becomes active
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User became active, refresh project time data
        loadProjectTimeData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, loadProjectTimeData]);
};
