import mongoose, { Document, Schema } from 'mongoose';

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const favoriteSchema = new Schema<IFavorite>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound index to prevent duplicate favorites
favoriteSchema.index({ userId: 1, projectId: 1 }, { unique: true });

// Index for efficient querying of user's favorites
favoriteSchema.index({ userId: 1, createdAt: -1 });

const Favorite = mongoose.model<IFavorite>('Favorite', favoriteSchema);

export default Favorite;
