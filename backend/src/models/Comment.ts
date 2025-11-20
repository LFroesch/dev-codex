import mongoose, { Document, Schema } from 'mongoose';
import { SOCIAL_CONSTANTS } from '../config/socialConstants';

export interface IComment extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  parentCommentId?: mongoose.Types.ObjectId;
  likes: number;
  isEdited: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>({
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
  content: {
    type: String,
    required: true,
    maxlength: SOCIAL_CONSTANTS.COMMENT_MAX_LENGTH,
    trim: true
  },
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true
  },
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
  }
}, {
  timestamps: true
});

// Index for efficient querying of project comments
commentSchema.index({ projectId: 1, createdAt: -1 });
commentSchema.index({ projectId: 1, parentCommentId: 1 });

// Note: Soft-deleted comments are kept indefinitely for now
// Can be purged manually or with a scheduled job if storage becomes an issue

const Comment = mongoose.model<IComment>('Comment', commentSchema);

export default Comment;
