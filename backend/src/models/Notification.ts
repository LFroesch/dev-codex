import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'project_invitation' | 'project_shared' | 'team_member_added' | 'team_member_removed' | 'todo_assigned' | 'todo_due_soon' | 'todo_overdue' | 'subtask_completed' | 'stale_items_summary' | 'daily_todo_summary' | 'projects_locked' | 'projects_unlocked' | 'admin_message' | 'comment_on_project' | 'reply_to_comment' | 'project_favorited' | 'new_follower' | 'project_followed' | 'user_post' | 'project_update' | 'post_like';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  relatedProjectId?: mongoose.Types.ObjectId;
  relatedInvitationId?: mongoose.Types.ObjectId;
  relatedUserId?: mongoose.Types.ObjectId;
  relatedTodoId?: string;
  relatedCommentId?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  // Tiered retention fields
  planTier: 'free' | 'pro' | 'premium';
  importance: 'critical' | 'standard' | 'transient';
  expiresAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['project_invitation', 'project_shared', 'team_member_added', 'team_member_removed', 'todo_assigned', 'todo_due_soon', 'todo_overdue', 'subtask_completed', 'stale_items_summary', 'daily_todo_summary', 'projects_locked', 'projects_unlocked', 'admin_message', 'comment_on_project', 'reply_to_comment', 'project_favorited', 'new_follower', 'project_followed', 'user_post', 'project_update', 'post_like'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    actionUrl: {
      type: String,
      trim: true,
    },
    relatedProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    relatedInvitationId: {
      type: Schema.Types.ObjectId,
      ref: 'ProjectInvitation',
    },
    relatedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    relatedTodoId: {
      type: String,
    },
    relatedCommentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Tiered retention fields
    planTier: {
      type: String,
      required: true,
      enum: ['free', 'pro', 'premium'],
      default: 'free',
      index: true,
    },
    importance: {
      type: String,
      required: true,
      enum: ['critical', 'standard', 'transient'],
      default: 'standard',
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ relatedInvitationId: 1 });

// Dynamic TTL index based on expiresAt field (plan and importance-aware retention)
// expireAfterSeconds: 0 means MongoDB uses the expiresAt field directly
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<INotification>('Notification', NotificationSchema);