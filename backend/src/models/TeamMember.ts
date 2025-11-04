import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamMember extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'owner' | 'editor' | 'viewer';
  invitedBy: mongoose.Types.ObjectId;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Soft deletion fields
  isActive: boolean;
  removedAt?: Date;
  removalReason?: 'left' | 'removed_by_owner' | 'project_deleted';
  expiresAt?: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      required: true,
      default: 'viewer',
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    // Soft deletion fields
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    removedAt: {
      type: Date,
    },
    removalReason: {
      type: String,
      enum: ['left', 'removed_by_owner', 'project_deleted'],
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

// Ensure unique team membership per user per project
TeamMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

// Index for efficient queries
TeamMemberSchema.index({ userId: 1 });
TeamMemberSchema.index({ projectId: 1 });
TeamMemberSchema.index({ isActive: 1, removedAt: 1 });

// TTL index for soft-deleted members
TeamMemberSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema);