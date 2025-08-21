import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { UserTheme } from '../../../shared/types';

export interface IIdea {
  id: string;
  title: string;
  description?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  theme: UserTheme;
  planTier: 'free' | 'pro' | 'enterprise';
  projectLimit: number;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'canceled' | 'past_due' | 'incomplete_expired';
  lastBillingUpdate?: Date;
  isAdmin: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  googleId?: string;
  bio?: string;
  isPublic: boolean;
  publicSlug?: string;
  publicDescription?: string;
  ideas: IIdea[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  theme: {
    type: String,
    default: 'retro',
    enum: [
      "dim", "light", "dark", "cupcake", "bumblebee", "emerald", "corporate",
      "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden",
      "forest", "aqua", "sunset", "lofi", "pastel", "fantasy", "wireframe",
      "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid",
      "lemonade", "night", "coffee", "winter", "nord"
    ]
  },
  planTier: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  projectLimit: {
    type: Number,
    default: 3
  },
  stripeCustomerId: {
    type: String,
    required: false
  },
  subscriptionId: {
    type: String,
    required: false
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'canceled', 'past_due', 'incomplete_expired'],
    default: 'inactive'
  },
  lastBillingUpdate: {
    type: Date,
    required: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: {
    type: String,
    required: false
  },
  resetPasswordExpires: {
    type: Date,
    required: false
  },
  googleId: {
    type: String,
    required: false
  },
  bio: {
    type: String,
    required: false,
    maxlength: 500
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  publicSlug: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/
  },
  publicDescription: {
    type: String,
    required: false,
    maxlength: 200
  },
  ideas: [{
    id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// Override toJSON to exclude sensitive fields from logs
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.stripeCustomerId;
  delete user.subscriptionId;
  delete user.googleId;
  return user;
};

export const User = mongoose.model<IUser>('User', userSchema);