import { useEffect, useRef, useCallback, useState } from 'react';
import analyticsService from '../services/analytics';

interface UseAnalyticsOptions {
  projectId?: string;
  projectName?: string;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  void options; // Suppress unused parameter warning

  const sessionInitialized = useRef(false);
  const [, setSessionReady] = useState(false);
  const sessionCheckInterval = useRef<number | null>(null);

  // Start session and monitor session state
  useEffect(() => {
    const initializeSession = async () => {
      if (!sessionInitialized.current) {
        try {
          await analyticsService.startSession();
          setSessionReady(true);
        } catch (error) {
          console.error('Failed to initialize analytics session:', error);
          setSessionReady(true); // Set to true anyway to avoid blocking
        }
        sessionInitialized.current = true;
      }
    };

    initializeSession();

    // Check session state periodically and restart if needed
    sessionCheckInterval.current = window.setInterval(() => {
      const hasActiveSession = analyticsService.hasActiveSession();
      if (!hasActiveSession && sessionInitialized.current) {
        // Session ended, allow it to restart on next activity
        setSessionReady(false);
        // Don't reset sessionInitialized to prevent immediate restart
        // Let recordActivity() handle restart when user interacts
        
        // Re-enable session ready when session restarts
        const checkRestart = () => {
          if (analyticsService.hasActiveSession()) {
            setSessionReady(true);
          } else {
            setTimeout(checkRestart, 1000);
          }
        };
        setTimeout(checkRestart, 1000);
      }
    }, 5000); // Check every 5 seconds

    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
    };
  }, []);

  // Get current session info
  const getSessionInfo = useCallback(() => {
    return analyticsService.getSessionInfo();
  }, []);

  return {
    // Existing methods
    getSessionInfo,
    hasActiveSession: () => analyticsService.hasActiveSession(),
    endSession: () => analyticsService.endSession(),
    startSession: () => analyticsService.startSession(),
    setCurrentUser: (userId: string | null) => analyticsService.setCurrentUser(userId),
    setCurrentProject: (projectId: string | null) => analyticsService.setCurrentProject(projectId),
    clearUserSession: () => analyticsService.clearUserSession(),

    // Debug methods
    getAnalyticsStats: () => analyticsService.getAnalyticsStats(),
    flushEvents: () => analyticsService.flushEvents()
  };
};