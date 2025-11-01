import mongoose, { Document, Schema } from 'mongoose';

export interface INewsPost extends Document {
  title: string;
  content: string;
  summary?: string;
  type: 'news' | 'update' | 'dev_log' | 'announcement' | 'important';
  isPublished: boolean;
  publishedAt?: Date;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

const newsPostSchema = new Schema<INewsPost>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  summary: {
    type: String,
    required: false,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['news', 'update', 'dev_log', 'announcement', 'important'],
    default: 'news'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date,
    required: false
  },
  authorId: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

newsPostSchema.index({ publishedAt: -1 });
newsPostSchema.index({ type: 1, publishedAt: -1 });

export const NewsPost = mongoose.model<INewsPost>('NewsPost', newsPostSchema);