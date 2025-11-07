import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { UserTheme } from '../types/shared';

export interface IIdea {
  id: string;
  title: string;
  description?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
    'base-100': string;
    'base-200': string;
    'base-300': string;
    info: string;
    success: string;
    warning: string;
    error: string;
  };
  createdAt: Date;
}

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  displayPreference: 'name' | 'username';
  theme: UserTheme;
  planTier: 'free' | 'pro' | 'premium';
  projectLimit: number;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'canceled' | 'past_due' | 'incomplete_expired';
  lastBillingUpdate?: Date;
  isAdmin: boolean;
  isBanned: boolean;
  bannedAt?: Date;
  banReason?: string;
  bannedBy?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  googleId?: string;
  bio?: string;
  isPublic: boolean;
  publicSlug?: string;
  publicDescription?: string;
  ideas: IIdea[];
  customThemes: ICustomTheme[];
  tutorialCompleted: boolean;
  tutorialProgress: {
    currentStep: number;
    completedSteps: number[];
    skipped: boolean;
    lastActiveDate: Date;
  };
  lastLogin?: Date;
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
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9_]+$/,
    minlength: 3,
    maxlength: 30
  },
  displayPreference: {
    type: String,
    enum: ['name', 'username'],
    default: 'username'
  },
  theme: {
    type: String,
    default: 'retro',
    validate: {
      validator: function(v: string) {
        const validThemes = [
          "dim", "light", "dark", "cupcake", "bumblebee", "emerald", "corporate",
          "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden",
          "forest", "aqua", "sunset", "lofi", "pastel", "fantasy", "wireframe",
          "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid",
          "lemonade", "night", "coffee", "winter", "nord"
        ];
        // Allow preset themes or custom themes (format: "custom-{id}")
        return validThemes.includes(v) || (typeof v === 'string' && v.startsWith('custom-'));
      },
      message: 'Invalid theme value'
    }
  },
  planTier: {
    type: String,
    enum: ['free', 'pro', 'premium'],
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
  isBanned: {
    type: Boolean,
    default: false
  },
  bannedAt: {
    type: Date,
    required: false
  },
  banReason: {
    type: String,
    required: false,
    maxlength: 500
  },
  bannedBy: {
    type: String,
    required: false
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
  }],
  customThemes: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    colors: {
      primary: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
      secondary: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
      accent: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
      neutral: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
      'base-100': { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
      'base-200': { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
      'base-300': { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
      info: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
      success: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
      warning: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
      error: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tutorialCompleted: {
    type: Boolean,
    default: false
  },
  tutorialProgress: {
    currentStep: {
      type: Number,
      default: 0
    },
    completedSteps: {
      type: [Number],
      default: []
    },
    skipped: {
      type: Boolean,
      default: false
    },
    lastActiveDate: {
      type: Date,
      default: Date.now
    }
  },
  lastLogin: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Critical indexes for authentication and user lookup
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ stripeCustomerId: 1 }, { sparse: true });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });
userSchema.index({ 'ideas.id': 1 });
userSchema.index({ 'customThemes.id': 1 });

// Compound indexes for common query patterns
userSchema.index({ planTier: 1, subscriptionStatus: 1 });
userSchema.index({ isPublic: 1, publicSlug: 1 });
userSchema.index({ subscriptionStatus: 1, lastBillingUpdate: 1 });
userSchema.index({ isBanned: 1 });
userSchema.index({ tutorialCompleted: 1 });

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