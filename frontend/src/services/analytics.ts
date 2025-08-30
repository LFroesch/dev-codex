interface AnalyticsEvent {
  eventType: 'field_edit' | 'action' | 'page_view' | 'project_open' | 'feature_usage' | 'navigation' | 'search' | 'error' | 'performance' | 'ui_interaction';
  timestamp: number;
  eventData: {
    // Existing fields
    projectId?: string;
    projectName?: string;
    fieldName?: string;
    fieldType?: string;
    oldValue?: any;
    newValue?: any;
    pageName?: string;
    actionName?: string;
    
    // New analytics fields
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
  private readonly HEARTBEAT_INTERVAL = 30 * 1000;
  private readonly SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_PENDING_EVENTS = 100;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000;
  private isAuthenticated = false;

  private constructor() {
    this.setupEventListeners();
    
    // Check if user is already authenticated (has cookie)
    this.checkAuthenticationStatus();
    
    // Try to restore existing session only if authenticated
    const stored = localStorage.getItem('analytics_session');
    if (stored && this.isAuthenticated) {
      try {
        const data = JSON.parse(stored);
        const now = Date.now();
        const timeSinceLastActivity = now - (data.lastActivity || data.startTime);
        
        // If active within session timeout, restore it
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
        this.stopHeartbeat();
      } else {
        // When coming back from hidden (potential sleep/wake), reset activity
        this.recordActivity();
        this.startHeartbeat();
        this.sendHeartbeatNow();
        
        // Check for potential sleep period and reset lastActivity if needed
        if (this.session) {
          const now = Date.now();
          const timeSinceLastActivity = now - this.session.lastActivity;
          const SLEEP_THRESHOLD = 5 * 60 * 1000; // 5 minutes
          
          if (timeSinceLastActivity > SLEEP_THRESHOLD) {
            // Likely woke from sleep, update lastActivity to current time
            this.session.lastActivity = now;
            this.updateStorage();
          }
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
      const response = await fetch('/api/analytics/session/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
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
            console.warn('Analytics: Failed to restore session from storage');
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
      console.error('Failed to start analytics session:', error);
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
      await fetch('/api/analytics/session/end', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
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
      console.error('Analytics: Failed to end session:', error);
    }

    localStorage.removeItem('analytics_session');
    this.session = null;
  }

  async trackEvent(event: AnalyticsEvent) {
    if (!this.isAuthenticated) {
      return;
    }

    if (!this.session) {
      await this.startSession();
      if (!this.session) {
        console.warn('Analytics: Failed to start session, event ignored');
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


  async trackProjectOpen(projectId: string, projectName: string) {
    if (!projectId || !projectName) {
      console.warn('Analytics: Invalid project data provided');
      return;
    }
    
    if (this.session) {
      if (!this.session.projectsViewed.includes(projectId)) {
        this.session.projectsViewed.push(projectId);
      }
      await this.setCurrentProject(projectId);

      try {
        const response = await fetch('/api/activity-logs/smart-join', {
          method: 'POST',
          credentials: 'include',
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
        console.error('Analytics: Failed to log smart project join:', error);
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



  getSessionInfo() {
    if (!this.session) return null;

    const now = Date.now();
    const timeSinceLastActivity = now - this.session.lastActivity;
    
    // Detect if system was asleep (gap > 5 minutes since last activity)
    const SLEEP_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    let adjustedDuration = now - this.session.startTime;
    
    if (timeSinceLastActivity > SLEEP_THRESHOLD) {
      // System was likely asleep, adjust the session start time to exclude sleep period
      const sleepTime = timeSinceLastActivity - SLEEP_THRESHOLD;
      adjustedDuration = adjustedDuration - sleepTime;
      
      // Update session start time to reflect the adjustment (only for display)
      // Don't modify the actual session.startTime to avoid affecting backend tracking
    }
    
    const duration = Math.max(adjustedDuration, 0); // Ensure duration is never negative

    return {
      sessionId: this.session.sessionId,
      userId: this.session.userId,
      duration: Math.round(duration / 1000),
      timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000),
      pageViews: this.session.pageViews.length,
      projectsViewed: this.session.projectsViewed.length,
      events: this.session.events.length,
      pendingEvents: this.pendingEvents.length,
      isActive: this.session !== null && !document.hidden && timeSinceLastActivity < this.SESSION_TIMEOUT,
      isOnline: this.isOnline,
      startTime: new Date(this.session.startTime).toISOString(),
      lastActivity: new Date(this.session.lastActivity).toISOString(),
      timezone: this.session.timezone,
      userAgent: this.session.userAgent
    };
  }

  hasActiveSession(): boolean {
    return this.session !== null;
  }

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

  // Method to manually flush events (useful for debugging)
  async flushEvents(): Promise<void> {
    await this.flushPendingEvents();
  }












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

  clearUserSession() {
    this.currentUserId = null;
    this.isAuthenticated = false;
    this.endSession();
    localStorage.removeItem('analytics_session');
  }

  // Check authentication status by trying to make a simple auth request
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

  async setCurrentProject(projectId: string | null) {
    if (this.session && this.isAuthenticated) {
      const previousProjectId = this.session.currentProjectId;
      
      // Call backend to record time spent on previous project
      if (this.isOnline && (previousProjectId !== projectId)) {
        try {
          const response = await fetch('/api/analytics/project/switch', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
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
          console.warn('Failed to record project switch:', error);
        }
      }
      
      this.session.currentProjectId = projectId || undefined;
      this.updateStorage();
      
      if (projectId && this.isOnline && this.isAuthenticated) {
        await this.sendHeartbeatNow();
      }
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

  private async sendEvent(event: AnalyticsEvent) {
    try {
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.session?.sessionId || ''
        },
        body: JSON.stringify(event)
      });
      
      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }
    } catch (error) {
      console.warn('Analytics: Failed to send event, adding to pending queue:', error);
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
      console.error(`Analytics: Failed to send event after ${this.RETRY_ATTEMPTS} attempts:`, error);
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

  private recordActivity() {
    // Only start sessions if user is authenticated
    if (!this.session && this.isAuthenticated) {
      this.startSession().catch(console.error);
      return;
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
        await this.endSession();
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
      this.session.lastActivity = Date.now();
      this.updateStorage();

      const response = await fetch('/api/analytics/heartbeat', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.session.sessionId
        },
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
          console.warn('Analytics: Session unauthorized, ending session and stopping heartbeat');
          this.isAuthenticated = false;
          this.session = null;
          localStorage.removeItem('analytics_session');
          this.stopHeartbeat();
        } else {
          console.warn(`Analytics: Heartbeat failed with status ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Analytics: Heartbeat network error:', error);
      // Don't terminate session on network errors, just log
    }
  }

  async sendHeartbeatNow(): Promise<void> {
    await this.sendHeartbeat();
  }


  // Project Time Tracking Methods
  
  async getProjectsTimeData(days: number = 30): Promise<any> {
    try {
      const response = await fetch(`/api/analytics/projects/time?days=${days}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch projects time data: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch projects time data:', error);
      return { projects: [], period: `${days} days` };
    }
  }

  async getProjectTimeData(projectId: string, days: number = 30): Promise<any> {
    try {
      const response = await fetch(`/api/analytics/project/${projectId}/time?days=${days}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project time data: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch project time data:', error);
      return { projectId, totalTime: 0, dailyBreakdown: [], period: `${days} days` };
    }
  }

  // Error tracking method
  async trackError(errorData: {
    name: string;
    message: string;
    stack?: string;
    context?: any;
    severity?: string;
    componentStack?: string;
    errorBoundary?: boolean;
  }): Promise<void> {
    if (!this.isAuthenticated || !this.isOnline) {
      return;
    }

    try {
      const event = {
        eventType: 'error' as const,
        timestamp: Date.now(),
        eventData: {
          errorName: errorData.name,
          errorMessage: errorData.message,
          errorStack: errorData.stack,
          context: errorData.context,
          severity: errorData.severity || 'medium',
          componentStack: errorData.componentStack,
          fromErrorBoundary: errorData.errorBoundary || false,
          userAgent: navigator.userAgent,
          url: window.location.href,
          currentProjectId: this.session?.currentProjectId
        }
      };

      await this.sendEventWithRetry(event);
    } catch (error) {
      console.error('Failed to track error:', error);
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();
export default analyticsService;