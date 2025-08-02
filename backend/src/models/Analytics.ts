import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalytics extends Document {
  userId: string;
  sessionId?: string;
  eventType: 'project_open' | 'field_edit' | 'session_start' | 'session_end' | 'page_view' | 'action';
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
    enum: ['project_open', 'field_edit', 'session_start', 'session_end', 'page_view', 'action'],
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
    metadata: Schema.Types.Mixed
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

// TTL index to automatically clean up old analytics data (optional)
// Uncomment if you want to auto-delete old data after 1 year
// analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export default mongoose.model<IAnalytics>('Analytics', analyticsSchema);