import mongoose, { Document, Schema } from 'mongoose';

export interface ICompactedAnalytics extends Document {
  date: Date; // YYYY-MM-DD (start of day)
  userId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  eventType: string;
  category: 'engagement' | 'business' | 'error';

  // Aggregated metrics
  count: number; // Total events
  totalDuration: number; // Sum of durations (ms)
  avgDuration: number; // Average duration (ms)
  uniqueSessions: number; // Distinct session IDs

  // Metadata
  planTier: 'free' | 'pro' | 'premium';
  expiresAt?: Date; // Plan-based TTL

  // Conversion tracking
  totalConversionValue: number;
  conversionCount: number;

  timestamps: {
    firstEvent: Date;
    lastEvent: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const compactedAnalyticsSchema: Schema = new Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  eventType: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['engagement', 'business', 'error'],
    index: true
  },
  // Aggregated metrics
  count: {
    type: Number,
    required: true,
    default: 0
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  avgDuration: {
    type: Number,
    default: 0
  },
  uniqueSessions: {
    type: Number,
    default: 0
  },
  // Metadata
  planTier: {
    type: String,
    required: true,
    enum: ['free', 'pro', 'premium'],
    default: 'free',
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  // Conversion tracking
  totalConversionValue: {
    type: Number,
    default: 0
  },
  conversionCount: {
    type: Number,
    default: 0
  },
  timestamps: {
    firstEvent: {
      type: Date,
      required: true
    },
    lastEvent: {
      type: Date,
      required: true
    }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
compactedAnalyticsSchema.index({ userId: 1, date: -1 });
compactedAnalyticsSchema.index({ eventType: 1, date: -1 });
compactedAnalyticsSchema.index({ category: 1, date: -1 });
compactedAnalyticsSchema.index({ date: -1, planTier: 1 });

// TTL index for automatic cleanup based on plan tier
compactedAnalyticsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<ICompactedAnalytics>('CompactedAnalytics', compactedAnalyticsSchema);
