export interface BaseAnalytics {
  userId: string;
  sessionId?: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
  projectId?: string;
  projectName?: string;
}

export interface BaseUserSession {
  userId: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
  projectId?: string;
  projectName?: string;
  lastActivity: string;
  pageViews: number;
  events: number;
}