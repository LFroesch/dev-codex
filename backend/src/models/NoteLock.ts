import mongoose, { Document, Schema } from 'mongoose';

export interface INoteLock extends Document {
  noteId: string;
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userName: string;
  lockedAt: Date;
  expiresAt: Date;
  lastHeartbeat: Date;
}

const NoteLockSchema = new Schema<INoteLock>(
  {
    noteId: {
      type: String,
      required: true,
    },
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
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    lockedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes for efficient queries
NoteLockSchema.index({ noteId: 1, projectId: 1 }, { unique: true });
NoteLockSchema.index({ userId: 1 });
NoteLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<INoteLock>('NoteLock', NoteLockSchema);