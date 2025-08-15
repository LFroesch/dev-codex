import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSession extends Document {
  userId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  totalEvents: number;
  projectsViewed: string[];
  pagesVisited: string[];
  currentProjectId?: string; // Currently active project
  currentPage?: string; // Currently active page
  lastActivity: Date;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  isVisible?: boolean;
  // Project time tracking
  projectTimeBreakdown?: Array<{
    projectId: string;
    timeSpent: number; // in milliseconds
    lastSwitchTime: Date;
  }>;
  currentProjectStartTime?: Date; // When current project was started
  createdAt: Date;
  updatedAt: Date;
}

const userSessionSchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number // in milliseconds
  },
  totalEvents: {
    type: Number,
    default: 0
  },
  projectsViewed: [{
    type: String
  }],
  pagesVisited: [{
    type: String
  }],
  currentProjectId: {
    type: String,
    index: true
  },
  currentPage: {
    type: String
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  userAgent: String,
  ipAddress: String,
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  // Project time tracking
  projectTimeBreakdown: [{
    projectId: {
      type: String,
      required: true
    },
    timeSpent: {
      type: Number,
      default: 0 // in milliseconds
    },
    lastSwitchTime: {
      type: Date,
      default: Date.now
    }
  }],
  currentProjectStartTime: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes
userSessionSchema.index({ userId: 1, startTime: -1 });
userSessionSchema.index({ userId: 1, isActive: 1 });
userSessionSchema.index({ currentProjectId: 1, isActive: 1 }); // For finding active users on a project

// TTL index to clean up inactive sessions after 24 hours
userSessionSchema.index({ 
  lastActivity: 1 
}, { 
  expireAfterSeconds: 24 * 60 * 60,
  partialFilterExpression: { isActive: false }
});

export default mongoose.model<IUserSession>('UserSession', userSessionSchema);