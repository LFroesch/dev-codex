import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamMember extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'owner' | 'editor' | 'viewer';
  invitedBy: mongoose.Types.ObjectId;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
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

export default mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema);