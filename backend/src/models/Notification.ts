import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'project_invitation' | 'project_shared' | 'team_member_added' | 'team_member_removed' | 'todo_assigned' | 'todo_due_soon' | 'todo_overdue' | 'subtask_completed';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  relatedProjectId?: mongoose.Types.ObjectId;
  relatedInvitationId?: mongoose.Types.ObjectId;
  relatedUserId?: mongoose.Types.ObjectId;
  relatedTodoId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
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
      enum: ['project_invitation', 'project_shared', 'team_member_added', 'team_member_removed', 'todo_assigned', 'todo_due_soon', 'todo_overdue', 'subtask_completed'],
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
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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

// TTL index to automatically clean up old notifications after 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });


export default mongoose.model<INotification>('Notification', NotificationSchema);