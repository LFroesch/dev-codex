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

  // Start session only once per app lifecycle
  useEffect(() => {
    if (!sessionInitialized.current) {
      analyticsService.startSession().then(() => {
        setSessionReady(true);
      }).catch(error => {
        console.error('Failed to initialize analytics session:', error);
        setSessionReady(true); // Set to true anyway to avoid blocking
      });
      sessionInitialized.current = true;
    }
  }, []);

  // Track page views - only after session is ready
  useEffect(() => {
    if (trackPageViews && sessionReady) {
      analyticsService.trackPageView(location.pathname);
    }
  }, [location.pathname, trackPageViews, sessionReady]);

  // Track project opens
  useEffect(() => {
    if (projectId && projectName) {
      analyticsService.trackProjectOpen(projectId, projectName);
    }
  }, [projectId, projectName]);

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
    trackFieldEdit,
    trackAction,
    trackFormField,
    getSessionInfo,
    debugSession: () => analyticsService.debugSessionState(),
    hasActiveSession: () => analyticsService.hasActiveSession(),
    trackPageView: (pageName: string) => analyticsService.trackPageView(pageName),
    trackProjectOpen: (id: string, name: string) => analyticsService.trackProjectOpen(id, name),
    endSession: () => analyticsService.endSession(),
    startSession: () => analyticsService.startSession(),
    setCurrentUser: (userId: string | null) => analyticsService.setCurrentUser(userId),
    clearUserSession: () => analyticsService.clearUserSession()
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