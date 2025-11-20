import mongoose, { Document, Schema } from 'mongoose';
import { SOCIAL_CONSTANTS } from '../config/socialConstants';

export interface IPost extends Document {
  userId: mongoose.Types.ObjectId;
  postType: 'profile' | 'project';
  projectId?: mongoose.Types.ObjectId;
  linkedProjectId?: mongoose.Types.ObjectId;
  content: string;
  mediaUrls?: string[];
  likes: number;
  isEdited: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  visibility: 'public' | 'followers' | 'private';
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  postType: {
    type: String,
    enum: ['profile', 'project'],
    required: true,
    default: 'profile'
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  linkedProjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: SOCIAL_CONSTANTS.POST_MAX_LENGTH,
    trim: true
  },
  mediaUrls: [{
    type: String,
    trim: true
  }],
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ projectId: 1, createdAt: -1 });
postSchema.index({ linkedProjectId: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });
postSchema.index({ isDeleted: 1, visibility: 1, createdAt: -1 });

// Note: Soft-deleted posts are kept indefinitely for now
// Can be purged manually or with a scheduled job if storage becomes an issue

// Validation: projectId required when postType is 'project'
postSchema.pre('save', function(next) {
  if (this.postType === 'project' && !this.projectId) {
    next(new Error('projectId is required when postType is project'));
  } else if (this.postType === 'profile' && this.projectId) {
    this.projectId = undefined;
  }
  next();
});

const Post = mongoose.model<IPost>('Post', postSchema);

export default Post;
