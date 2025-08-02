import mongoose, { Document, Schema } from 'mongoose';

export interface IRateLimit extends Document {
  identifier: string; // IP address or user ID
  type: 'ip' | 'user'; // Type of rate limiting
  endpoint?: string; // Optional: specific endpoint
  count: number;
  windowStart: Date;
  windowDurationMs: number;
  createdAt: Date;
  updatedAt: Date;
}

const rateLimitSchema: Schema = new Schema({
  identifier: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['ip', 'user'],
    required: true
  },
  endpoint: {
    type: String,
    index: true
  },
  count: {
    type: Number,
    required: true,
    default: 1
  },
  windowStart: {
    type: Date,
    required: true,
    default: Date.now
  },
  windowDurationMs: {
    type: Number,
    required: true,
    default: 60000 // 1 minute
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
rateLimitSchema.index({ identifier: 1, type: 1, endpoint: 1 });

// TTL index to automatically clean up old rate limit records
rateLimitSchema.index({ 
  windowStart: 1 
}, { 
  expireAfterSeconds: 3600 // Clean up after 1 hour
});

export default mongoose.model<IRateLimit>('RateLimit', rateLimitSchema);