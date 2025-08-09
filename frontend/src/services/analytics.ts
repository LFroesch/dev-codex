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
  userId?: string;
  startTime: number;
  lastActivity: number;
  pageViews: string[];
  projectsViewed: string[];
  events: AnalyticsEvent[];
  currentProjectId?: string;
  currentPage?: string;
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

  private constructor() {
    this.setupEventListeners();
    this.startInactivityTimer();
    
    // Try to restore existing session
    const stored = localStorage.getItem('analytics_session');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const now = Date.now();
        const timeSinceLastActivity = now - (data.lastActivity || data.startTime);
        
        // If active within 15 minutes, restore it
        if (timeSinceLastActivity < 15 * 60 * 1000) {
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
        this.recordActivity();
        this.startHeartbeat();
        this.sendHeartbeatNow();
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
    if (this.session) {
      return this.session.sessionId;
    }

    try {
      const response = await fetch('/api/analytics/session/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
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

        this.updateStorage();
        this.startHeartbeat();
        await this.sendHeartbeatNow();
        return sessionId;
      }
    } catch (error) {
      console.error('Failed to start analytics session:', error);
    }

    // Fallback
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

    this.updateStorage();
    this.startHeartbeat();
    await this.sendHeartbeatNow();
    return sessionId;
  }

  async endSession() {
    if (!this.session) return;

    this.stopHeartbeat();

    try {
      await fetch('/api/analytics/session/end', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: this.session.sessionId })
      });
    } catch (error) {
      console.error('Failed to end analytics session:', error);
    }

    localStorage.removeItem('analytics_session');
    this.session = null;
  }

  async trackEvent(event: AnalyticsEvent) {
    if (!this.session) return;

    this.recordActivity();
    this.session.events.push(event);

    if (this.isOnline) {
      await this.sendEvent(event);
    } else {
      this.pendingEvents.push(event);
    }
  }

  async trackFieldEdit(fieldName: string, oldValue: any, newValue: any, projectId?: string, projectName?: string) {
    await this.trackEvent({
      eventType: 'field_edit',
      eventData: {
        fieldName,
        fieldType: this.getFieldType(fieldName, newValue),
        oldValue,
        newValue,
        projectId,
        projectName,
        metadata: { timestamp: Date.now() }
      }
    });
  }

  async trackProjectOpen(projectId: string, projectName: string) {
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
        console.error('Failed to log smart project join:', error);
      }
    }

    await this.trackEvent({
      eventType: 'project_open',
      eventData: { projectId, projectName, metadata: { timestamp: Date.now() } }
    });
  }

  async trackPageView(pageName: string) {
    if (this.session) {
      if (!this.session.pageViews.includes(pageName)) {
        this.session.pageViews.push(pageName);
      }
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
        metadata: { ...metadata, timestamp: Date.now() }
      }
    });
  }

  getSessionInfo() {
    if (!this.session) return null;

    const now = Date.now();
    const duration = now - this.session.startTime;
    const timeSinceLastActivity = now - this.session.lastActivity;

    return {
      sessionId: this.session.sessionId,
      duration: Math.round(duration / 1000),
      timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000),
      pageViews: this.session.pageViews.length,
      projectsViewed: this.session.projectsViewed.length,
      events: this.session.events.length,
      isActive: !document.hidden,
      startTime: new Date(this.session.startTime).toISOString(),
      lastActivity: new Date(this.session.lastActivity).toISOString()
    };
  }

  hasActiveSession(): boolean {
    return this.session !== null;
  }

  setCurrentUser(userId: string | null) {
    this.currentUserId = userId;
    
    if (this.session && userId && !this.session.userId) {
      this.session.userId = userId;
      this.updateStorage();
    }
  }

  clearUserSession() {
    this.currentUserId = null;
    this.endSession();
    localStorage.removeItem('analytics_session');
  }

  async setCurrentProject(projectId: string | null) {
    if (this.session) {
      this.session.currentProjectId = projectId || undefined;
      this.updateStorage();
      
      if (projectId && this.isOnline) {
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
      this.updateStorage();
    }

    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }
    this.startInactivityTimer();
  }

  private startInactivityTimer() {
    // Keep session alive as long as page is open
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
    if (!this.session || !this.isOnline) return;

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

      if (!response.ok && (response.status === 401 || response.status === 403)) {
        this.session = null;
        localStorage.removeItem('analytics_session');
        this.stopHeartbeat();
      }
    } catch (error) {
      console.error('Failed to send heartbeat:', error);
    }
  }

  async sendHeartbeatNow(): Promise<void> {
    await this.sendHeartbeat();
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
}

export default AnalyticsService.getInstance();