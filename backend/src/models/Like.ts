import mongoose, { Document, Schema } from 'mongoose';

export interface ILike extends Document {
  userId: mongoose.Types.ObjectId;
  likeableType: 'Post' | 'Comment';
  likeableId: mongoose.Types.ObjectId;
  // Deprecated fields for backward compatibility
  postId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const likeSchema = new Schema<ILike>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  likeableType: {
    type: String,
    enum: ['Post', 'Comment'],
    required: true,
    index: true
  },
  likeableId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  // Keep postId for backward compatibility with existing data
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound index to ensure a user can only like a specific item once
likeSchema.index({ userId: 1, likeableType: 1, likeableId: 1 }, { unique: true });

// Index for efficient querying
likeSchema.index({ likeableType: 1, likeableId: 1, createdAt: -1 });
likeSchema.index({ userId: 1, createdAt: -1 });

const Like = mongoose.model<ILike>('Like', likeSchema);

export default Like;
