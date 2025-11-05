import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalytics extends Document {
  userId: string;
  sessionId?: string;
  eventType: 'project_open' | 'session_start' | 'session_end';
  eventData: {
    projectId?: string;
    projectName?: string;
    duration?: number; // For session events
    metadata?: Record<string, any>;
  };
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  planTier: 'free' | 'pro' | 'premium'; // Plan tier at time of event
  createdAt: Date;
  expiresAt?: Date; // Plan-specific expiration date
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
    enum: ['project_open', 'session_start', 'session_end'],
    index: true
  },
  eventData: {
    projectId: String,
    projectName: String,
    duration: Number,
    metadata: Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  userAgent: String,
  ipAddress: String,
  planTier: {
    type: String,
    required: true,
    enum: ['free', 'pro', 'premium'],
    default: 'free',
    index: true
  },
  expiresAt: {
    type: Date,
    index: true // MongoDB will automatically delete documents when this date is reached
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound indexes for efficient queries
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, planTier: 1, timestamp: -1 });
analyticsSchema.index({ 'eventData.projectId': 1, timestamp: -1 });
analyticsSchema.index({ planTier: 1, timestamp: -1 });

// Plan-based TTL index for automatic cleanup
// Free tier: expires based on expiresAt field
// Pro/Premium: no expiration (expiresAt is null) unless subscription cancelled
analyticsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IAnalytics>('Analytics', analyticsSchema);