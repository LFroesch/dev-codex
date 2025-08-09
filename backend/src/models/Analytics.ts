import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalytics extends Document {
  userId: string;
  sessionId?: string;
  eventType: 'project_open' | 'field_edit' | 'session_start' | 'session_end' | 'page_view' | 'action' | 'feature_usage' | 'navigation' | 'search' | 'error' | 'performance' | 'ui_interaction';
  eventData: {
    projectId?: string;
    projectName?: string;
    fieldName?: string;
    fieldType?: string;
    oldValue?: any;
    newValue?: any;
    pageName?: string;
    actionName?: string;
    duration?: number; // For session events
    metadata?: Record<string, any>;
    // New event data fields
    featureName?: string;
    componentName?: string;
    navigationSource?: string;
    navigationTarget?: string;
    searchTerm?: string;
    searchResultsCount?: number;
    errorType?: string;
    errorMessage?: string;
    actionType?: string;
    interactionType?: string;
    elementId?: string;
  };
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
}

const analyticsSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['project_open', 'field_edit', 'session_start', 'session_end', 'page_view', 'action', 'feature_usage', 'navigation', 'search', 'error', 'performance', 'ui_interaction'],
    index: true
  },
  eventData: {
    projectId: String,
    projectName: String,
    fieldName: String,
    fieldType: String,
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    pageName: String,
    actionName: String,
    duration: Number,
    metadata: Schema.Types.Mixed,
    // New event data fields
    featureName: String,
    componentName: String,
    navigationSource: String,
    navigationTarget: String,
    searchTerm: String,
    searchResultsCount: Number,
    errorType: String,
    errorMessage: String,
    actionType: String,
    interactionType: String,
    elementId: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  userAgent: String,
  ipAddress: String
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound indexes for efficient queries
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
analyticsSchema.index({ 'eventData.projectId': 1, timestamp: -1 });

// TTL index to automatically clean up old analytics data after 6 months
analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 6 * 30 * 24 * 60 * 60 });

export default mongoose.model<IAnalytics>('Analytics', analyticsSchema);