import mongoose, { Document, Schema } from 'mongoose';

export interface IFollow extends Document {
  followerId: mongoose.Types.ObjectId;
  followingType: 'user' | 'project';
  followingUserId?: mongoose.Types.ObjectId;
  followingProjectId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const followSchema = new Schema<IFollow>({
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  followingType: {
    type: String,
    enum: ['user', 'project'],
    required: true
  },
  followingUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  followingProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound indexes to prevent duplicate follows and enable efficient queries
followSchema.index({ followerId: 1, followingUserId: 1 }, { unique: true, sparse: true });
followSchema.index({ followerId: 1, followingProjectId: 1 }, { unique: true, sparse: true });
followSchema.index({ followingUserId: 1, createdAt: -1 }); // For getting user's followers
followSchema.index({ followingProjectId: 1, createdAt: -1 }); // For getting project's followers

// Validation based on followingType
followSchema.pre('save', function(next) {
  if (this.followingType === 'user' && !this.followingUserId) {
    next(new Error('followingUserId is required when followingType is user'));
  } else if (this.followingType === 'project' && !this.followingProjectId) {
    next(new Error('followingProjectId is required when followingType is project'));
  } else if (this.followingType === 'user' && this.followingProjectId) {
    this.followingProjectId = undefined;
  } else if (this.followingType === 'project' && this.followingUserId) {
    this.followingUserId = undefined;
  }
  next();
});

const Follow = mongoose.model<IFollow>('Follow', followSchema);

export default Follow;
