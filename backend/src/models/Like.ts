import mongoose, { Document, Schema } from 'mongoose';

export interface ILike extends Document {
  userId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const likeSchema = new Schema<ILike>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound index to ensure a user can only like a post once
likeSchema.index({ userId: 1, postId: 1 }, { unique: true });

// Index for efficient querying
likeSchema.index({ postId: 1, createdAt: -1 });
likeSchema.index({ userId: 1, createdAt: -1 });

const Like = mongoose.model<ILike>('Like', likeSchema);

export default Like;
