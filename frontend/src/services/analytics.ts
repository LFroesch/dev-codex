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
  startTime: number;
  lastActivity: number;
  pageViews: string[];
  projectsViewed: string[];
  events: AnalyticsEvent[];
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private session: SessionData | null = null;
  private activityTimer: NodeJS.Timeout | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private isOnline = navigator.onLine;
  private pendingEvents: AnalyticsEvent[] = [];

  private constructor() {
    this.setupEventListeners();
    this.startInactivityTimer();
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
    try {
      const response = await fetch('/api/analytics/session/start', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const { sessionId } = await response.json();
        
        this.session = {
          sessionId,
          startTime: Date.now(),
          lastActivity: Date.now(),
          pageViews: [],
          projectsViewed: [],
          events: []
        };

        // Store session in localStorage as backup
        localStorage.setItem('analytics_session', JSON.stringify({
          sessionId,
          startTime: this.session.startTime
        }));

        return sessionId;
      }
    } catch (error) {
      console.error('Failed to start analytics session:', error);
    }

    // Fallback: create local session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.session = {
      sessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: [],
      projectsViewed: [],
      events: []
    };

    return sessionId;
  }

  async endSession() {
    if (!this.session) return;

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
    } catch (error) {
      console.error('Failed to end analytics session:', error);
    }

    localStorage.removeItem('analytics_session');
    this.session = null;
  }

  async trackEvent(event: AnalyticsEvent) {
    if (!this.session) {
      await this.startSession();
    }

    this.recordActivity();
    
    if (this.session) {
      this.session.events.push(event);
    }

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
    projectName?: string
  ) {
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
  }

  async trackProjectOpen(projectId: string, projectName: string) {
    if (this.session) {
      if (!this.session.projectsViewed.includes(projectId)) {
        this.session.projectsViewed.push(projectId);
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
    const duration = now - this.session.startTime;
    const activeTime = now - this.session.lastActivity;

    return {
      sessionId: this.session.sessionId,
      duration: Math.round(duration / 1000), // seconds
      activeTime: Math.round(activeTime / 1000), // seconds
      pageViews: this.session.pageViews.length,
      projectsViewed: this.session.projectsViewed.length,
      events: this.session.events.length,
      isActive: !document.hidden // Active if page is visible
    };
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
  }

  private onPageShow() {
    // Page is visible again, resume timers
    this.recordActivity();
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