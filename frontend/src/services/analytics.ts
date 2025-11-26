import { csrfFetch } from '../utils/csrf';

// Represents a user action or system event for analytics tracking
interface AnalyticsEvent {
  eventType: 'field_edit' | 'action' | 'page_view' | 'project_open' | 'feature_usage' | 'navigation' | 'search' | 'error' | 'performance' | 'ui_interaction';
  timestamp: number;
  eventData: {
    projectId?: string;
    projectName?: string;
    fieldName?: string;
    fieldType?: string;
    oldValue?: any;
    newValue?: any;
    pageName?: string;
    actionName?: string;
    featureName?: string;
    componentName?: string;
    buttonName?: string;
    searchTerm?: string;
    searchResultsCount?: number;
    navigationSource?: string;
    navigationTarget?: string;
    errorType?: string;
    errorMessage?: string;
    loadTime?: number;
    actionType?: string;
    duration?: number;
    interactionType?: 'click' | 'hover' | 'scroll' | 'keyboard' | 'drag' | 'resize';
    elementId?: string;
    elementText?: string;
    screenSize?: string;
    metadata?: Record<string, any>;
  };
}

// Tracks user session data and activity for analytics
interface SessionData {
  sessionId: string;
  userId?: string;
  startTime: number;
  lastActivity: number;
  pageViews: string[];
  projectsViewed: string[];
  events: AnalyticsEvent[];
  currentProjectId?: string;
  currentPage?: string;
  userAgent?: string;
  timezone?: string;
  sessionDuration?: number;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private session: SessionData | null = null;
  private currentUserId: string | null = null;
  private activityTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private isOnline = navigator.onLine;
  private pendingEvents: AnalyticsEvent[] = [];
  private readonly HEARTBEAT_INTERVAL = 90 * 1000;
  private readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_PENDING_EVENTS = 100;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000;
  private isAuthenticated = false;
  private isHandlingTimeout = false;

  // Initializes the analytics service and restores any existing session
  private constructor() {
    this.setupEventListeners();
    this.checkAuthenticationStatus();
    this.initializeProjectSync();
    
    const stored = localStorage.getItem('analytics_session');
    if (stored && this.isAuthenticated) {
      try {
        const data = JSON.parse(stored);
        const now = Date.now();
        const timeSinceLastActivity = now - (data.lastActivity || data.startTime);
        
        if (timeSinceLastActivity < this.SESSION_TIMEOUT) {
          this.session = {
            sessionId: data.sessionId,
            userId: this.currentUserId || undefined,
            startTime: data.startTime,
            lastActivity: now,
            pageViews: [],
            projectsViewed: [],
            events: [],
            currentProjectId: data.currentProjectId,
            currentPage: data.currentPage
          };
          this.updateStorage();
          this.startHeartbeat();
          this.startInactivityTimer();
        }
      } catch (e) {
        localStorage.removeItem('analytics_session');
      }
    }
  }

  // Returns the singleton instance of the analytics service
  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private updateStorage() {
    if (this.session) {
      localStorage.setItem('analytics_session', JSON.stringify({
        sessionId: this.session.sessionId,
        startTime: this.session.startTime,
        lastActivity: this.session.lastActivity,
        currentProjectId: this.session.currentProjectId,
        currentPage: this.session.currentPage
      }));
    }
  }

  // Sets up browser event listeners for online/offline, visibility, and activity tracking
  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushPendingEvents();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Keep heartbeat running even when hidden - only stop on true inactivity
        // Record when we go hidden to preserve real activity time
        if (this.session) {
          this.session.lastActivity = Date.now();
          this.updateStorage();
        }
      } else {
        // When coming back from hidden, simply resume heartbeats
        // Let backend gap detection handle any time gaps automatically
        this.startHeartbeat();
        this.sendHeartbeatNow();
      }
    });

    // Handle cross-tab project synchronization
    window.addEventListener('storage', (e) => {
      if (e.key === 'current_project_sync') {
        const newProjectId = e.newValue;
        
        if (this.session && this.session.currentProjectId !== newProjectId) {
          this.syncToProject(newProjectId);
        }
      }
    });

    // Session persists through page refreshes
    // Only cleared on explicit logout via clearUserSession()

    const activityEvents = ['click', 'keydown', 'scroll'];
    activityEvents.forEach(event => {
      document.addEventListener(event, () => this.recordActivity(), { passive: true });
    });
  }

  // Starts a new analytics session or resumes an existing one
  async startSession(): Promise<string> {
    // Don't start session if not authenticated
    if (!this.isAuthenticated) {
      return 'offline_unauthenticated';
    }

    if (this.session) {
      // Reset activity timer when starting/resuming session
      this.startInactivityTimer();
      return this.session.sessionId;
    }

    try {
      const response = await this.makeAnalyticsRequest('/session/start', {
        method: 'POST'
      });

      if (response.status === 401) {
        this.isAuthenticated = false;
        return 'offline_unauthenticated';
      }

      if (response.ok) {
        const { sessionId } = await response.json();
        
        // Check if we have stored session data for this session ID
        const stored = localStorage.getItem('analytics_session');
        let restoredSession = false;
        
        if (stored) {
          try {
            const data = JSON.parse(stored);
            if (data.sessionId === sessionId) {
              // Restore the existing session data
              this.session = {
                sessionId,
                userId: this.currentUserId || data.userId,
                startTime: data.startTime || Date.now(),
                lastActivity: Date.now(),
                pageViews: data.pageViews || [],
                projectsViewed: data.projectsViewed || [],
                events: [],
                currentProjectId: data.currentProjectId,
                currentPage: data.currentPage,
                userAgent: navigator.userAgent,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
              };
              restoredSession = true;
            }
          } catch (e) {
          }
        }
        
        // If we didn't restore from storage, create new session data
        if (!restoredSession) {
          this.session = {
            sessionId,
            userId: this.currentUserId || undefined,
            startTime: Date.now(),
            lastActivity: Date.now(),
            pageViews: [],
            projectsViewed: [],
            events: [],
            userAgent: navigator.userAgent,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          };
        }

        this.updateStorage();
        this.startHeartbeat();
        this.startInactivityTimer();
        await this.sendHeartbeatNow();
        return sessionId;
      }
    } catch (error) {
    }

    // Fallback to offline session
    const sessionId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    this.session = {
      sessionId,
      userId: this.currentUserId || undefined,
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: [],
      projectsViewed: [],
      events: [],
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    this.updateStorage();
    this.startHeartbeat();
    this.startInactivityTimer();
    await this.sendHeartbeatNow();
    return sessionId;
  }

  // Ends the current analytics session and sends final data to the server
  async endSession() {
    if (!this.session) return;

    this.stopHeartbeat();
    
    // Clear the inactivity timer to prevent multiple calls
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }

    // Calculate final session stats
    const sessionDuration = Date.now() - this.session.startTime;
    this.session.sessionDuration = sessionDuration;

    try {
      // Send final session data
      await this.makeAnalyticsRequest('/session/end', {
        method: 'POST',
        body: JSON.stringify({ 
          sessionId: this.session.sessionId,
          duration: sessionDuration,
          pageViews: this.session.pageViews.length,
          projectsViewed: this.session.projectsViewed.length,
          events: this.session.events.length
        })
      });

      // Flush any remaining pending events
      if (this.pendingEvents.length > 0) {
        await this.flushPendingEvents();
      }
    } catch (error) {
    }

    localStorage.removeItem('analytics_session');
    this.session = null;
  }

  // Records an analytics event and sends it to the server
  async trackEvent(event: AnalyticsEvent) {
    if (!this.isAuthenticated) {
      return;
    }

    if (!this.session) {
      await this.startSession();
      if (!this.session) {
        return;
      }
    }

    // Add timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }

    this.recordActivity();
    this.session.events.push(event);

    // Prevent memory leaks from too many pending events
    if (this.pendingEvents.length >= this.MAX_PENDING_EVENTS) {
      this.pendingEvents.shift(); // Remove oldest event
    }

    if (this.isOnline) {
      await this.sendEventWithRetry(event);
    } else {
      this.pendingEvents.push(event);
    }
  }


  // Tracks when a user opens a project and logs smart join activity
  async trackProjectOpen(projectId: string, projectName: string) {
    if (!projectId || !projectName) {
      return;
    }
    
    if (this.session) {
      if (!this.session.projectsViewed.includes(projectId)) {
        this.session.projectsViewed.push(projectId);
      }
      await this.setCurrentProject(projectId);

      try {
        const response = await csrfFetch('/api/activity-logs/smart-join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, sessionId: this.session.sessionId })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.logged) {
            await this.sendHeartbeatNow();
          }
        }
      } catch (error) {
      }
    }

    await this.trackEvent({
      eventType: 'project_open',
      timestamp: Date.now(),
      eventData: { 
        projectId, 
        projectName,
        metadata: {
          projectsViewedCount: this.session?.projectsViewed.length || 0
        }
      }
    });
  }



  // Returns detailed information about the current session
  getSessionInfo() {
    if (!this.session) return null;

    const now = Date.now();
    const timeSinceLastActivity = now - this.session.lastActivity;
    const duration = now - this.session.startTime;

    return {
      sessionId: this.session.sessionId,
      userId: this.session.userId,
      duration: Math.round(duration / 1000),
      timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000),
      pageViews: this.session.pageViews.length,
      projectsViewed: this.session.projectsViewed.length,
      events: this.session.events.length,
      pendingEvents: this.pendingEvents.length,
      isActive: this.session !== null && timeSinceLastActivity < this.SESSION_TIMEOUT,
      isOnline: this.isOnline,
      startTime: new Date(this.session.startTime).toISOString(),
      lastActivity: new Date(this.session.lastActivity).toISOString(),
      timezone: this.session.timezone,
      userAgent: this.session.userAgent
    };
  }

  // Checks if there is an active analytics session
  hasActiveSession(): boolean {
    return this.session !== null;
  }

  // Returns current analytics service status and statistics
  getAnalyticsStats() {
    return {
      hasActiveSession: this.hasActiveSession(),
      pendingEventsCount: this.pendingEvents.length,
      isOnline: this.isOnline,
      sessionInfo: this.getSessionInfo(),
      heartbeatActive: this.heartbeatTimer !== null,
      lastError: null // Could be extended to track last error
    };
  }

  // Manually sends all pending events to the server
  async flushEvents(): Promise<void> {
    await this.flushPendingEvents();
  }












  // Updates the current user and manages session state accordingly
  setCurrentUser(userId: string | null) {
    this.currentUserId = userId;
    this.isAuthenticated = userId !== null;
    
    if (this.session && userId && !this.session.userId) {
      this.session.userId = userId;
      this.updateStorage();
    }
    
    // If user logged out, end session
    if (!userId && this.session) {
      this.endSession();
    }
  }

  // Clears user session data and ends analytics tracking
  clearUserSession() {
    this.currentUserId = null;
    this.isAuthenticated = false;
    this.endSession();
    localStorage.removeItem('analytics_session');
  }

  // Verifies if the user is authenticated by checking with the server
  private async checkAuthenticationStatus() {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
      });
      this.isAuthenticated = response.ok;
      if (response.ok) {
        const data = await response.json();
        this.currentUserId = data.user?.id || null;
      }
    } catch {
      this.isAuthenticated = false;
    }
  }

  // Updates the current project and tracks time spent in previous project
  async setCurrentProject(projectId: string | null) {
    if (this.session && this.isAuthenticated) {
      const previousProjectId = this.session.currentProjectId;
      
      // Call backend to record time spent on previous project
      if (this.isOnline && (previousProjectId !== projectId)) {
        try {
          const response = await this.makeAnalyticsRequest('/project/switch', {
            method: 'POST',
            body: JSON.stringify({
              sessionId: this.session.sessionId,
              newProjectId: projectId
            })
          });
          
          if (response.status === 401 || response.status === 403) {
            this.isAuthenticated = false;
            return;
          }
        } catch (error) {
        }
      }
      
      this.session.currentProjectId = projectId || undefined;
      this.updateStorage();
      
      // Broadcast project change to all other tabs
      localStorage.setItem('current_project_sync', projectId || '');
      
      if (projectId && this.isOnline && this.isAuthenticated) {
        await this.sendHeartbeatNow();
      }
    }
  }

  // Initialize project sync - check if another tab has already set a project
  private initializeProjectSync() {
    const syncedProject = localStorage.getItem('current_project_sync');
    if (syncedProject) {
      // This will be handled when the session is restored
    }
  }

  // Handle project sync from other tabs
  private async syncToProject(projectId: string | null) {
    if (!this.session || !this.isAuthenticated) return;
    
    const previousProjectId = this.session.currentProjectId;
    
    if (previousProjectId !== projectId) {
      
      // Update session without calling backend (the originating tab already did that)
      this.session.currentProjectId = projectId || undefined;
      this.updateStorage();
      
      // Trigger UI update by dispatching a custom event
      window.dispatchEvent(new CustomEvent('projectSync', { 
        detail: { 
          previousProjectId, 
          newProjectId: projectId 
        } 
      }));
      
    }
  }

  setCurrentPage(pageName: string | null) {
    if (this.session) {
      this.session.currentPage = pageName || undefined;
      this.updateStorage();
    }
  }

  getCurrentProject(): string | null {
    return this.session?.currentProjectId || null;
  }

  getCurrentPage(): string | null {
    return this.session?.currentPage || null;
  }

  // Helper method for making authenticated requests to analytics API
  private async makeAnalyticsRequest(path: string, options: any = {}): Promise<Response> {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Session-ID': this.session?.sessionId || ''
    };

    return csrfFetch(`/api/analytics${path}`, {
      headers: { ...defaultHeaders, ...options.headers },
      ...options
    });
  }

  private async sendEvent(event: AnalyticsEvent) {
    try {
      const response = await this.makeAnalyticsRequest('/track', {
        method: 'POST',
        body: JSON.stringify(event)
      });
      
      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }
    } catch (error) {
      this.pendingEvents.push(event);
    }
  }

  private async sendEventWithRetry(event: AnalyticsEvent, attempt: number = 1): Promise<void> {
    try {
      await this.sendEvent(event);
    } catch (error) {
      if (attempt < this.RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
        return this.sendEventWithRetry(event, attempt + 1);
      }
    }
  }


  private async flushPendingEvents() {
    if (this.pendingEvents.length === 0) return;

    const eventsToSend = [...this.pendingEvents];
    this.pendingEvents = [];

    for (const event of eventsToSend) {
      await this.sendEvent(event);
    }
  }

  private async recordActivity() {
    // Only start sessions if user is authenticated
    if (!this.session && this.isAuthenticated) {
      await this.startSession().catch(() => {});
    }

    if (this.session) {
      this.session.lastActivity = Date.now();
      this.updateStorage();
    }

    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }
    this.startInactivityTimer();
  }

  private startInactivityTimer() {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }
    
    // Only start timer if there's an active session
    if (this.session) {
      this.activityTimer = window.setTimeout(async () => {
        // Prevent multiple timeout handlers from running
        if (this.isHandlingTimeout) {
          return;
        }
        this.isHandlingTimeout = true;
        
        try {
          // First, explicitly save time for current project by "switching" to null
          // This triggers the same logic as when switching between projects
          if (this.session?.currentProjectId) {
            await this.setCurrentProject(null);
          }
          
          // Then end the session completely
          await this.endSession();
          
          // Dispatch event to notify Layout component
          window.dispatchEvent(new CustomEvent('sessionTimeout', { 
            detail: { handledByAnalytics: true } 
          }));
          
          // Also dispatch a separate event to force project clearing
          window.dispatchEvent(new CustomEvent('forceProjectClear'));
        } finally {
          this.isHandlingTimeout = false;
        }
      }, this.SESSION_TIMEOUT);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    if (this.session) {
      this.heartbeatTimer = window.setInterval(() => {
        this.sendHeartbeat();
      }, this.HEARTBEAT_INTERVAL);
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private async sendHeartbeat() {
    if (!this.session || !this.isOnline || !this.isAuthenticated) return;

    try {
      // Don't update lastActivity in heartbeat - only track real user activity
      this.updateStorage();

      const response = await this.makeAnalyticsRequest('/heartbeat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: this.session.sessionId,
          lastActivity: this.session.lastActivity,
          isVisible: !document.hidden,
          currentProjectId: this.session.currentProjectId,
          currentPage: this.session.currentPage
        })
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.isAuthenticated = false;
          this.session = null;
          localStorage.removeItem('analytics_session');
          this.stopHeartbeat();
        } else {
          throw new Error(`Analytics heartbeat error: ${response.status}`);
        }
      } else {
        // Emit event when heartbeat succeeds to trigger time data updates
        window.dispatchEvent(new CustomEvent('analyticsHeartbeat', { 
          detail: { sessionId: this.session.sessionId } 
        }));
      }
    } catch (error) {
      // Don't terminate session on network errors, just log
    }
  }

  async sendHeartbeatNow(): Promise<void> {
    await this.sendHeartbeat();
  }


  // Project Time Tracking Methods
  
  async getProjectsTimeData(days: number = 30): Promise<any> {
    try {
      const response = await this.makeAnalyticsRequest(`/projects/time?days=${days}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch projects time data: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return { projects: [], period: `${days} days` };
    }
  }

  async getProjectTimeData(projectId: string, days: number = 30): Promise<any> {
    try {
      const response = await this.makeAnalyticsRequest(`/project/${projectId}/time?days=${days}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project time data: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return { projectId, totalTime: 0, dailyBreakdown: [], period: `${days} days` };
    }
  }


  // Helper method to track feature usage
  async trackFeatureUsage(feature: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.session?.sessionId || !this.isAuthenticated || !this.isOnline) {
      return;
    }

    try {
      await this.makeAnalyticsRequest('/track', {
        method: 'POST',
        body: JSON.stringify({
          eventType: 'feature_used',
          eventData: {
            feature,
            category: 'engagement',
            metadata
          }
        })
      });
    } catch (error) {
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();
export default analyticsService;