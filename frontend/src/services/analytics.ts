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
  private readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_PENDING_EVENTS = 100;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000;

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
          events: [],
          userAgent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        this.updateStorage();
        this.startHeartbeat();
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
    await this.sendHeartbeatNow();
    return sessionId;
  }

  async endSession() {
    if (!this.session) return;

    this.stopHeartbeat();

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
    if (!this.session) {
      console.warn('Analytics: No active session, event ignored');
      return;
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

  async trackFieldEdit(fieldName: string, oldValue: any, newValue: any, projectId?: string, projectName?: string) {
    // Sanitize sensitive data
    const sanitizedOldValue = this.sanitizeValue(oldValue);
    const sanitizedNewValue = this.sanitizeValue(newValue);
    
    await this.trackEvent({
      eventType: 'field_edit',
      timestamp: Date.now(),
      eventData: {
        fieldName,
        fieldType: this.getFieldType(fieldName, newValue),
        oldValue: sanitizedOldValue,
        newValue: sanitizedNewValue,
        projectId,
        projectName,
        metadata: { 
          changeSize: JSON.stringify(sanitizedNewValue).length - JSON.stringify(sanitizedOldValue).length
        }
      }
    });
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

  async trackPageView(pageName: string) {
    if (this.session) {
      if (!this.session.pageViews.includes(pageName)) {
        this.session.pageViews.push(pageName);
      }
      this.setCurrentPage(pageName);
    }

    await this.trackEvent({
      eventType: 'page_view',
      timestamp: Date.now(),
      eventData: {
        pageName,
        metadata: {
          referrer: document.referrer,
          url: window.location.href,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          screenWidth: screen.width,
          screenHeight: screen.height
        }
      }
    });
  }

  async trackAction(actionName: string, metadata?: Record<string, any>) {
    await this.trackEvent({
      eventType: 'action',
      timestamp: Date.now(),
      eventData: {
        actionName,
        metadata: metadata || {}
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
      userId: this.session.userId,
      duration: Math.round(duration / 1000),
      timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000),
      pageViews: this.session.pageViews.length,
      projectsViewed: this.session.projectsViewed.length,
      events: this.session.events.length,
      pendingEvents: this.pendingEvents.length,
      isActive: !document.hidden,
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

  // Feature Usage Analytics
  async trackFeatureUsage(featureName: string, componentName?: string, metadata?: Record<string, any>) {
    await this.trackEvent({
      eventType: 'feature_usage',
      timestamp: Date.now(),
      eventData: {
        featureName,
        componentName,
        projectId: this.getCurrentProject() || undefined || undefined,
        metadata: {
          ...metadata,
          screenSize: `${window.innerWidth}x${window.innerHeight}`
        }
      }
    });
  }

  // Navigation Analytics
  async trackNavigation(source: string, target: string, metadata?: Record<string, any>) {
    await this.trackEvent({
      eventType: 'navigation',
      timestamp: Date.now(),
      eventData: {
        navigationSource: source,
        navigationTarget: target,
        projectId: this.getCurrentProject() || undefined || undefined,
        metadata
      }
    });
  }

  // Search Analytics
  async trackSearch(searchTerm: string, resultsCount: number, componentName?: string) {
    await this.trackEvent({
      eventType: 'search',
      timestamp: Date.now(),
      eventData: {
        searchTerm,
        searchResultsCount: resultsCount,
        componentName,
        projectId: this.getCurrentProject() || undefined
      }
    });
  }

  // Error Analytics
  async trackError(errorType: string, errorMessage: string, componentName?: string, metadata?: Record<string, any>) {
    await this.trackEvent({
      eventType: 'error',
      timestamp: Date.now(),
      eventData: {
        errorType,
        errorMessage,
        componentName,
        projectId: this.getCurrentProject() || undefined || undefined,
        pageName: this.getCurrentPage() || undefined,
        metadata
      }
    });
  }

  // Performance Analytics
  async trackPerformance(actionName: string, loadTime: number, componentName?: string, metadata?: Record<string, any>) {
    await this.trackEvent({
      eventType: 'performance',
      timestamp: Date.now(),
      eventData: {
        actionType: actionName,
        duration: loadTime,
        componentName,
        projectId: this.getCurrentProject() || undefined || undefined,
        metadata
      }
    });
  }

  // UI Interaction Analytics
  async trackUIInteraction(
    interactionType: 'click' | 'hover' | 'scroll' | 'keyboard' | 'drag' | 'resize',
    elementId?: string,
    elementText?: string,
    componentName?: string,
    metadata?: Record<string, any>
  ) {
    await this.trackEvent({
      eventType: 'ui_interaction',
      timestamp: Date.now(),
      eventData: {
        interactionType,
        elementId,
        elementText,
        componentName,
        projectId: this.getCurrentProject() || undefined || undefined,
        pageName: this.getCurrentPage() || undefined,
        metadata
      }
    });
  }

  // Button/Link Click Analytics
  async trackButtonClick(buttonName: string, componentName?: string, metadata?: Record<string, any>) {
    await this.trackUIInteraction('click', undefined, buttonName, componentName, {
      buttonName,
      ...metadata
    });
  }

  // Tab Switch Analytics
  async trackTabSwitch(fromTab: string, toTab: string, componentName?: string) {
    await this.trackNavigation(fromTab, toTab, {
      interactionType: 'tab_switch',
      componentName
    });
  }

  // Form Analytics
  async trackFormSubmission(formName: string, success: boolean, errorMessage?: string, metadata?: Record<string, any>) {
    if (success) {
      await this.trackFeatureUsage('form_submit', formName, {
        formName,
        success,
        ...metadata
      });
    } else {
      await this.trackError('form_submission_failed', errorMessage || 'Unknown form error', formName, {
        formName,
        ...metadata
      });
    }
  }

  // Modal/Dialog Analytics
  async trackModalInteraction(modalName: string, action: 'open' | 'close' | 'submit' | 'cancel', metadata?: Record<string, any>) {
    await this.trackFeatureUsage('modal_interaction', modalName, {
      modalName,
      action,
      ...metadata
    });
  }

  // File Operation Analytics
  async trackFileOperation(operation: 'upload' | 'download' | 'delete' | 'share', fileName?: string, fileSize?: number, success: boolean = true) {
    if (success) {
      await this.trackFeatureUsage('file_operation', operation, {
        operation,
        fileName,
        fileSize,
        success
      });
    } else {
      await this.trackError('file_operation_failed', `Failed to ${operation} file`, operation, {
        operation,
        fileName,
        fileSize
      });
    }
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

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Remove potential sensitive patterns
      return value
        .replace(/\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g, '[CARD_NUMBER]')
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
        .replace(/\b\d{3}[\s-]\d{2}[\s-]\d{4}\b/g, '[SSN]');
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeValue(value[key]);
        }
      }
      return sanitized;
    }
    
    return value;
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

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn('Analytics: Session unauthorized, ending session');
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