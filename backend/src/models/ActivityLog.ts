import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityLog extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sessionId: string;
  action: string;
  resourceType: 'project' | 'note' | 'todo' | 'doc' | 'devlog' | 'link' | 'tech' | 'package' | 'team' | 'settings';
  resourceId?: string;
  details: {
    field?: string;
    oldValue?: any;
    newValue?: any;
    resourceName?: string; // Name of the resource being acted upon (e.g., "Meeting Notes", "Bug Fix Documentation")
    fileName?: string; // For file-specific actions
    metadata?: Record<string, any>;
  };
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  // Tiered retention fields
  planTier: 'free' | 'pro' | 'enterprise';
  expiresAt?: Date;
  isCompacted?: boolean; // Flag for summary documents
}

const activityLogSchema: Schema = new Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // CRUD operations
      'created', 'updated', 'deleted', 'viewed',
      // Specific actions
      'invited_member', 'removed_member', 'updated_role',
      'added_tech', 'removed_tech', 'added_package', 'removed_package',
      'shared_project', 'unshared_project', 'archived_project', 'unarchived_project',
      'exported_data', 'imported_data', 'project_imported',
      // Session actions
      'joined_project', 'left_project',
      // Management actions
      'cleared_activity_log'
    ]
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['project', 'note', 'todo', 'doc', 'devlog', 'link', 'tech', 'package', 'team', 'settings']
  },
  resourceId: {
    type: String,
    index: true
  },
  details: {
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    resourceName: String, // Name of the resource being acted upon
    fileName: String, // For file-specific actions
    metadata: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  userAgent: String,
  ipAddress: String,
  // Tiered retention fields
  planTier: {
    type: String,
    required: true,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  isCompacted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
activityLogSchema.index({ projectId: 1, timestamp: -1 });
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ projectId: 1, userId: 1, timestamp: -1 });

// Dynamic TTL index based on expiresAt field (plan-aware retention)
// expireAfterSeconds: 0 means MongoDB uses the expiresAt field directly
activityLogSchema.index({ expiresAt: 1 }, {
  expireAfterSeconds: 0
});

export default mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);