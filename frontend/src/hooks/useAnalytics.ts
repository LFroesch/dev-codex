import { useEffect, useRef, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import analyticsService from '../services/analytics';

interface UseAnalyticsOptions {
  trackPageViews?: boolean;
  trackFieldEdits?: boolean;
  projectId?: string;
  projectName?: string;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const {
    trackPageViews = true,
    trackFieldEdits = true,
    projectId,
    projectName
  } = options;

  const location = useLocation();
  const previousValues = useRef<Record<string, any>>({});
  const sessionInitialized = useRef(false);
  const [sessionReady, setSessionReady] = useState(false);
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

  // Track page views - only after session is ready
  useEffect(() => {
    if (trackPageViews && sessionReady) {
      analyticsService.trackPageView(location.pathname);
    }
  }, [location.pathname, trackPageViews, sessionReady]);

  // Track project opens - also trigger when session restarts
  useEffect(() => {
    if (projectId && projectName && sessionReady) {
      analyticsService.trackProjectOpen(projectId, projectName);
    }
  }, [projectId, projectName, sessionReady]);

  // Function to track field edits
  const trackFieldEdit = useCallback((
    fieldName: string,
    oldValue: any,
    newValue: any,
    customProjectId?: string,
    customProjectName?: string
  ) => {
    if (!trackFieldEdits) return;

    analyticsService.trackFieldEdit(
      fieldName,
      oldValue,
      newValue,
      customProjectId || projectId,
      customProjectName || projectName
    );
  }, [trackFieldEdits, projectId, projectName]);

  // Function to track custom actions
  const trackAction = useCallback((actionName: string, metadata?: Record<string, any>) => {
    analyticsService.trackAction(actionName, {
      ...metadata,
      projectId,
      projectName
    });
  }, [projectId, projectName]);

  // Function to track form field changes automatically
  const trackFormField = useCallback((fieldName: string, value: any) => {
    const key = `${projectId || 'global'}_${fieldName}`;
    const oldValue = previousValues.current[key];
    
    if (oldValue !== undefined && oldValue !== value) {
      trackFieldEdit(fieldName, oldValue, value);
    }
    
    previousValues.current[key] = value;
  }, [trackFieldEdit, projectId]);

  // Get current session info
  const getSessionInfo = useCallback(() => {
    return analyticsService.getSessionInfo();
  }, []);

  return {
    // Existing methods
    trackFieldEdit,
    trackAction,
    trackFormField,
    getSessionInfo,
    hasActiveSession: () => analyticsService.hasActiveSession(),
    trackPageView: (pageName: string) => analyticsService.trackPageView(pageName),
    trackProjectOpen: (id: string, name: string) => analyticsService.trackProjectOpen(id, name),
    endSession: () => analyticsService.endSession(),
    startSession: () => analyticsService.startSession(),
    setCurrentUser: (userId: string | null) => analyticsService.setCurrentUser(userId),
    clearUserSession: () => analyticsService.clearUserSession(),
    
    // New comprehensive analytics methods
    trackFeatureUsage: (featureName: string, componentName?: string, metadata?: Record<string, any>) => 
      analyticsService.trackFeatureUsage(featureName, componentName, metadata),
    trackNavigation: (source: string, target: string, metadata?: Record<string, any>) => 
      analyticsService.trackNavigation(source, target, metadata),
    trackSearch: (searchTerm: string, resultsCount: number, componentName?: string) => 
      analyticsService.trackSearch(searchTerm, resultsCount, componentName),
    trackError: (errorType: string, errorMessage: string, componentName?: string, metadata?: Record<string, any>) => 
      analyticsService.trackError(errorType, errorMessage, componentName, metadata),
    trackPerformance: (actionName: string, loadTime: number, componentName?: string, metadata?: Record<string, any>) => 
      analyticsService.trackPerformance(actionName, loadTime, componentName, metadata),
    trackUIInteraction: (
      interactionType: 'click' | 'hover' | 'scroll' | 'keyboard' | 'drag' | 'resize',
      elementId?: string,
      elementText?: string,
      componentName?: string,
      metadata?: Record<string, any>
    ) => analyticsService.trackUIInteraction(interactionType, elementId, elementText, componentName, metadata),
    trackButtonClick: (buttonName: string, componentName?: string, metadata?: Record<string, any>) => 
      analyticsService.trackButtonClick(buttonName, componentName, metadata),
    trackTabSwitch: (fromTab: string, toTab: string, componentName?: string) => 
      analyticsService.trackTabSwitch(fromTab, toTab, componentName),
    trackFormSubmission: (formName: string, success: boolean, errorMessage?: string, metadata?: Record<string, any>) => 
      analyticsService.trackFormSubmission(formName, success, errorMessage, metadata),
    trackModalInteraction: (modalName: string, action: 'open' | 'close' | 'submit' | 'cancel', metadata?: Record<string, any>) => 
      analyticsService.trackModalInteraction(modalName, action, metadata),
    trackFileOperation: (operation: 'upload' | 'download' | 'delete' | 'share', fileName?: string, fileSize?: number, success?: boolean) => 
      analyticsService.trackFileOperation(operation, fileName, fileSize, success),
    
    // Debug methods
    getAnalyticsStats: () => analyticsService.getAnalyticsStats(),
    flushEvents: () => analyticsService.flushEvents()
  };
};

// Hook specifically for form fields with automatic change detection
export const useFieldAnalytics = (
  fieldName: string,
  value: any,
  projectId?: string,
  projectName?: string
) => {
  const { trackFormField } = useAnalytics({ projectId, projectName });
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current !== value) {
      trackFormField(fieldName, value);
      previousValue.current = value;
    }
  }, [value, fieldName, trackFormField]);
};