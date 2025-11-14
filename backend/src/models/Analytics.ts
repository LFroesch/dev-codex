import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalytics extends Document {
  userId: string;
  sessionId?: string;
  eventType:
    // Existing events
    | 'project_open' | 'session_start' | 'session_end'
    // User Lifecycle
    | 'user_signup' | 'user_upgraded' | 'user_downgraded'
    // Feature Engagement
    | 'feature_used'
    // Project Engagement
    | 'project_created' | 'project_deleted'
    // Collaboration
    | 'team_invite_sent' | 'team_invite_accepted'
    // Monetization
    | 'checkout_completed'
    // Errors
    | 'error_occurred';
  eventData: {
    projectId?: string;
    projectName?: string;
    duration?: number; // For session events
    metadata?: Record<string, any>;
    // Feature usage
    feature?: string;
    // User lifecycle
    source?: string;
    referrer?: string;
    fromPlan?: string;
    toPlan?: string;
    // Monetization
    plan?: string;
    amount?: number;
    // Errors
    type?: string;
    message?: string;
    page?: string;
  };
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  planTier: 'free' | 'pro' | 'premium'; // Plan tier at time of event
  createdAt: Date;
  expiresAt?: Date; // Plan-specific expiration date

  // NEW fields for enhanced analytics
  category: 'engagement' | 'business' | 'error';
  isConversion: boolean;
  conversionValue?: number; // Dollar value for revenue tracking
}

const analyticsSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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
    enum: [
      // Existing events
      'project_open', 'session_start', 'session_end',
      // User Lifecycle
      'user_signup', 'user_upgraded', 'user_downgraded',
      // Feature Engagement
      'feature_used',
      // Project Engagement
      'project_created', 'project_deleted',
      // Collaboration
      'team_invite_sent', 'team_invite_accepted',
      // Monetization
      'checkout_completed',
      // Errors
      'error_occurred'
    ],
    index: true
  },
  eventData: {
    type: Schema.Types.Mixed,
    default: {}
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
  },
  // NEW fields for enhanced analytics
  category: {
    type: String,
    required: true,
    enum: ['engagement', 'business', 'error'],
    default: 'engagement',
    index: true
  },
  isConversion: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  conversionValue: {
    type: Number,
    default: 0
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

// NEW indexes for enhanced analytics
analyticsSchema.index({ category: 1, timestamp: -1 });
analyticsSchema.index({ eventType: 1, timestamp: -1 });
analyticsSchema.index({ isConversion: 1, timestamp: -1 });
analyticsSchema.index({ planTier: 1, category: 1, timestamp: -1 });

// Plan-based TTL index for automatic cleanup
// Free tier: expires based on expiresAt field
// Pro/Premium: no expiration (expiresAt is null) unless subscription cancelled
analyticsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IAnalytics>('Analytics', analyticsSchema);