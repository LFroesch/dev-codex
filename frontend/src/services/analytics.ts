interface AnalyticsEvent {
  eventType: 'field_edit' | 'action' | 'page_view' | 'project_open';
  eventData: {
    projectId?: string;
    projectName?: string;
    fieldName?: string;
    fieldType?: string;
    oldValue?: any;
    newValue?: any;
    pageName?: string;
    actionName?: string;
    metadata?: Record<string, any>;
  };
}

interface SessionData {
  sessionId: string;
  userId?: string; // Track which user this session belongs to
  startTime: number;
  lastActivity: number;
  pageViews: string[];
  projectsViewed: string[];
  events: AnalyticsEvent[];
  currentProjectId?: string; // Currently active project
  currentPage?: string; // Currently active page
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private session: SessionData | null = null;
  private currentUserId: string | null = null;
  private activityTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private isOnline = navigator.onLine;
  private pendingEvents: AnalyticsEvent[] = [];
  private readonly HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds for more responsive collaboration

  private constructor() {
    this.setupEventListeners();
    this.startInactivityTimer();
    // Don't start heartbeat here - wait for session to actually start
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private setupEventListeners() {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushPendingEvents();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.onPageHide();
      } else {
        this.onPageShow();
      }
    });

    // Before unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Simple activity detection (no mouse movement)
    const activityEvents = ['click', 'keydown', 'scroll'];
    activityEvents.forEach(event => {
      document.addEventListener(event, () => this.recordActivity(), { passive: true });
    });
  }

  async startSession(): Promise<string> {
    // If session already exists, return existing session ID
    if (this.session) {
      console.log('Session already exists:', this.session.sessionId);
      return this.session.sessionId;
    }

    // Check for existing session in localStorage
    const storedSession = localStorage.getItem('analytics_session');
    if (storedSession) {
      try {
        const { sessionId, startTime, lastActivity } = JSON.parse(storedSession);
        const now = Date.now();
        const timeSinceLastActivity = now - (lastActivity || startTime);
        const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
        
        // If they were last active within 15 minutes, restore the session
        if (timeSinceLastActivity < fifteenMinutes) {
          const storedData = JSON.parse(storedSession);
          this.session = {
            sessionId,
            userId: this.currentUserId || undefined,
            startTime, // Keep the original start time to preserve total session duration
            lastActivity: now, // Update last activity to now (they're back)
            pageViews: [],
            projectsViewed: [],
            events: [],
            currentProjectId: storedData.currentProjectId,
            currentPage: storedData.currentPage
          };
          
          // Update the stored session with restored context
          localStorage.setItem('analytics_session', JSON.stringify({
            sessionId,
            startTime: this.session.startTime,
            lastActivity: this.session.lastActivity,
            currentProjectId: this.session.currentProjectId,
            currentPage: this.session.currentPage
          }));
          
          this.startHeartbeat();
          console.log(`Restored session: ${sessionId} (was away for ${Math.round(timeSinceLastActivity / 1000)}s)`);
          
          // Send immediate heartbeat to signal we're back
          await this.sendHeartbeatNow();
          
          return sessionId;
        } else {
          // Clear old session (inactive for more than 15 minutes)
          console.log(`Session expired (inactive for ${Math.round(timeSinceLastActivity / 60000)} minutes), starting new session`);
          localStorage.removeItem('analytics_session');
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('analytics_session');
      }
    }    try {
      const response = await fetch('/api/analytics/session/start', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Let backend know if we're trying to restore a recent session
          restoreSession: false
        })
      });

      if (response.ok) {
        const { sessionId } = await response.json();
        
        this.session = {
          sessionId,
          userId: this.currentUserId || undefined,
          startTime: Date.now(),
          lastActivity: Date.now(),
          pageViews: [],
          projectsViewed: [],
          events: []
        };

        // Store session in localStorage as backup
        localStorage.setItem('analytics_session', JSON.stringify({
          sessionId,
          startTime: this.session.startTime,
          lastActivity: this.session.lastActivity,
          currentProjectId: this.session.currentProjectId,
          currentPage: this.session.currentPage
        }));

        // Start heartbeat for this session and send immediately
        this.startHeartbeat();
        console.log('Started new session:', sessionId);
        
        // Send immediate heartbeat to register the session quickly
        await this.sendHeartbeatNow();

        return sessionId;
      }
    } catch (error) {
      console.error('Failed to start analytics session:', error);
    }

    // Fallback: create local session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    this.session = {
      sessionId,
      userId: this.currentUserId || undefined,
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: [],
      projectsViewed: [],
      events: []
    };

    localStorage.setItem('analytics_session', JSON.stringify({
      sessionId,
      startTime: this.session.startTime,
      lastActivity: this.session.lastActivity,
      currentProjectId: this.session.currentProjectId,
      currentPage: this.session.currentPage
    }));

    this.startHeartbeat();
    console.log('Started fallback session:', sessionId);
    
    // Send immediate heartbeat for fallback session too
    await this.sendHeartbeatNow();

    return sessionId;
  }

  async endSession() {
    if (!this.session) {
      console.log('No active session to end');
      return;
    }

    console.log('Ending session:', this.session.sessionId);
    
    // Stop heartbeat
    this.stopHeartbeat();

    try {
      await fetch('/api/analytics/session/end', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.session.sessionId
        })
      });
      console.log('Session ended successfully on server');
    } catch (error) {
      console.error('Failed to end analytics session:', error);
    }

    localStorage.removeItem('analytics_session');
    this.session = null;
    console.log('Local session cleared');
  }

  async trackEvent(event: AnalyticsEvent) {
    // Only start session if explicitly needed, not on every event
    if (!this.session) {
      console.warn('No active session for tracking event:', event.eventType);
      return;
    }

    this.recordActivity();
    
    this.session.events.push(event);

    if (this.isOnline) {
      await this.sendEvent(event);
    } else {
      this.pendingEvents.push(event);
    }
  }

  async trackFieldEdit(
    fieldName: string,
    oldValue: any,
    newValue: any,
    projectId?: string,
    projectName?: string,
    resourceName?: string,
    fileName?: string
  ) {
    // Track the event
    await this.trackEvent({
      eventType: 'field_edit',
      eventData: {
        fieldName,
        fieldType: this.getFieldType(fieldName, newValue),
        oldValue,
        newValue,
        projectId,
        projectName,
        metadata: {
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        }
      }
    });

    // Note: Activity logging is now handled by activityTracker.trackUpdate() 
    // to avoid duplication. The analytics service focuses on analytics events only.
  }

  async trackProjectOpen(projectId: string, projectName: string) {
    if (this.session) {
      if (!this.session.projectsViewed.includes(projectId)) {
        this.session.projectsViewed.push(projectId);
      }
      // Set as current project
      await this.setCurrentProject(projectId);

      // Use the smart project join logging to prevent spam
      try {
        const response = await fetch('/api/activity-logs/smart-join', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            projectId,
            sessionId: this.session.sessionId
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.logged) {
            console.log('Project join logged successfully');
            // Send instant heartbeat to update active users immediately
            await this.sendHeartbeatNow();
          } else {
            console.log('Project join skipped (user recently joined)');
          }
        }
      } catch (error) {
        console.error('Failed to log smart project join:', error);
      }
    }

    await this.trackEvent({
      eventType: 'project_open',
      eventData: {
        projectId,
        projectName,
        metadata: {
          timestamp: Date.now()
        }
      }
    });
  }

  async trackPageView(pageName: string) {
    if (this.session) {
      if (!this.session.pageViews.includes(pageName)) {
        this.session.pageViews.push(pageName);
      }
      // Set as current page
      this.setCurrentPage(pageName);
    }

    await this.trackEvent({
      eventType: 'page_view',
      eventData: {
        pageName,
        metadata: {
          timestamp: Date.now(),
          referrer: document.referrer,
          url: window.location.href
        }
      }
    });
  }

  async trackAction(actionName: string, metadata?: Record<string, any>) {
    await this.trackEvent({
      eventType: 'action',
      eventData: {
        actionName,
        metadata: {
          ...metadata,
          timestamp: Date.now()
        }
      }
    });
  }

  getSessionInfo() {
    if (!this.session) return null;

    const now = Date.now();
    const duration = now - this.session.startTime; // This will show total time including pre-refresh time
    const timeSinceLastActivity = now - this.session.lastActivity;

    return {
      sessionId: this.session.sessionId,
      duration: Math.round(duration / 1000), // seconds - total session time
      timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000), // seconds since last activity
      pageViews: this.session.pageViews.length,
      projectsViewed: this.session.projectsViewed.length,
      events: this.session.events.length,
      isActive: !document.hidden, // Active if page is visible
      startTime: new Date(this.session.startTime).toISOString(),
      lastActivity: new Date(this.session.lastActivity).toISOString()
    };
  }

  hasActiveSession(): boolean {
    return this.session !== null;
  }

  // Debug method to help troubleshoot session issues
  debugSessionState() {
    const storedSession = localStorage.getItem('analytics_session');
    const now = Date.now();
    console.log('=== Analytics Debug Info ===');
    console.log('Current session:', this.session);
    console.log('Stored session:', storedSession ? JSON.parse(storedSession) : null);
    
    if (storedSession) {
      try {
        const stored = JSON.parse(storedSession);
        const timeSinceLastActivity = now - (stored.lastActivity || stored.startTime);
        const sessionAge = now - stored.startTime;
        console.log(`Time since last activity: ${Math.round(timeSinceLastActivity / 1000)}s`);
        console.log(`Session age: ${Math.round(sessionAge / 1000)}s`);
        console.log(`Would restore? ${timeSinceLastActivity < 15 * 60 * 1000 ? 'YES' : 'NO'}`);
      } catch (e) {
        console.log('Error parsing stored session:', e);
      }
    }
    
    console.log('Heartbeat timer active:', this.heartbeatTimer !== null);
    console.log('Is online:', this.isOnline);
    console.log('Page visible:', !document.hidden);
    console.log('Pending events:', this.pendingEvents.length);
    console.log('============================');
  }

  private async sendEvent(event: AnalyticsEvent) {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.session?.sessionId || ''
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
      // Add to pending events if failed
      this.pendingEvents.push(event);
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
    if (this.session) {
      this.session.lastActivity = Date.now();
      
      // Update localStorage with the new lastActivity time
      this.updateLocalSession();
    }

    // Reset inactivity timer
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }
    this.startInactivityTimer();
  }

  private startInactivityTimer() {
    // Keep the session alive as long as the page is open
    // Only end session on page close or manual end
    // No automatic timeout
  }

  private onPageHide() {
    // Page is being hidden, pause timers
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }
    // Stop heartbeat when page is hidden
    this.stopHeartbeat();
  }

  private onPageShow() {
    // Page is visible again, resume timers
    this.recordActivity();
    this.startHeartbeat();
    // Send instant heartbeat to immediately update active status
    this.sendHeartbeatNow();
  }

  private startHeartbeat() {
    // Clear existing heartbeat timer
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    // Start heartbeat only if we have an active session
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
    if (!this.session || !this.isOnline) {
      console.log('Skipping heartbeat: no session or offline');
      return;
    }

    try {
      // Update local session activity
      this.session.lastActivity = Date.now();

      // Update localStorage with the latest activity time
      this.updateLocalSession();

      // Send heartbeat to server to update session
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
        console.error('Heartbeat failed with status:', response.status);
        // If session is invalid (401/403), clear it and let user restart
        if (response.status === 401 || response.status === 403) {
          console.log('Session appears invalid, clearing local session');
          this.session = null;
          localStorage.removeItem('analytics_session');
          this.stopHeartbeat();
        }
      } else {
        console.log('Heartbeat sent successfully');
      }
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }

  // Send heartbeat immediately (for instant updates on critical events)
  async sendHeartbeatNow(): Promise<void> {
    console.log('Sending instant heartbeat...');
    await this.sendHeartbeat();
  }

  // Set current user and handle user switching
  setCurrentUser(userId: string | null) {
    // If user is changing, end the current session
    if (this.currentUserId && this.currentUserId !== userId) {
      console.log('User changed from', this.currentUserId, 'to', userId, '- ending current session');
      this.endSession();
    }
    
    this.currentUserId = userId;
    
    // If setting a new user, clear any stored session data for the previous user
    if (userId && this.currentUserId !== userId) {
      localStorage.removeItem('analytics_session');
    }
  }

  // Clear user session data (for logout)
  clearUserSession() {
    console.log('Clearing user session for user:', this.currentUserId);
    this.currentUserId = null;
    this.endSession();
    localStorage.removeItem('analytics_session');
  }

  private getFieldType(fieldName: string, value: any): string {
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      if (fieldName.toLowerCase().includes('email')) return 'email';
      if (fieldName.toLowerCase().includes('url')) return 'url';
      if (fieldName.toLowerCase().includes('color')) return 'color';
      if (fieldName.toLowerCase().includes('date')) return 'date';
      if (fieldName.toLowerCase().includes('description') || fieldName.toLowerCase().includes('content')) return 'text_long';
      if (value.length > 100) return 'text_long';
      return 'text_short';
    }
    return 'unknown';
  }

  // Set current project (for tracking active collaborators)
  async setCurrentProject(projectId: string | null) {
    if (this.session) {
      this.session.currentProjectId = projectId || undefined;
      this.updateLocalSession();
      
      // Send immediate heartbeat to update active project status
      if (projectId && this.isOnline) {
        await this.sendHeartbeatNow();
      }
    }
  }

  // Set current page (for tracking user location)
  setCurrentPage(pageName: string | null) {
    if (this.session) {
      this.session.currentPage = pageName || undefined;
      this.updateLocalSession();
    }
  }

  // Get current project ID
  getCurrentProject(): string | null {
    return this.session?.currentProjectId || null;
  }

  // Get current page
  getCurrentPage(): string | null {
    return this.session?.currentPage || null;
  }

  private updateLocalSession() {
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

  private getResourceTypeFromField(fieldName: string): 'project' | 'note' | 'todo' | 'doc' | 'devlog' | 'link' | 'tech' | 'package' | 'team' | 'settings' {
    const field = fieldName.toLowerCase();
    
    if (field.includes('note') || field.includes('content') && field.includes('note')) {
      return 'note';
    }
    if (field.includes('todo') || field.includes('task')) {
      return 'todo';
    }
    if (field.includes('doc') || field.includes('documentation')) {
      return 'doc';
    }
    if (field.includes('devlog') || field.includes('log')) {
      return 'devlog';
    }
    if (field.includes('link') || field.includes('url')) {
      return 'link';
    }
    if (field.includes('tech') || field.includes('technology')) {
      return 'tech';
    }
    if (field.includes('package') || field.includes('dependency')) {
      return 'package';
    }
    if (field.includes('team') || field.includes('member') || field.includes('role')) {
      return 'team';
    }
    if (field.includes('setting') || field.includes('config')) {
      return 'settings';
    }
    
    // Default to project for basic fields like name, description, etc.
    return 'project';
  }
}

export default AnalyticsService.getInstance();