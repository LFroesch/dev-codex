export interface EmailPreferences {
  billing: boolean;       // subscription confirmed, cancelled, expired, expiring, downgraded
  payments: boolean;      // payment receipts, payment failed, refunds
  security: boolean;      // password changed
  weeklySummary: boolean; // weekly project digest email
}

export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  billing: true,
  payments: true,
  security: true,
  weeklySummary: true,
};

export interface BaseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  displayPreference: 'name' | 'username';
  theme: string;
  planTier: 'free' | 'pro' | 'premium';
  projectLimit: number;
  isAdmin: boolean;
  isDemo?: boolean;
  bio?: string;
  isPublic: boolean;
  publicSlug?: string;
  publicDescription?: string;
  emailPreferences?: EmailPreferences;
  tutorialCompleted?: boolean;
  tutorialProgress?: {
    currentStep: number;
    completedSteps: number[];
    skipped: boolean;
    lastActiveDate: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface UserAuthData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  theme?: string;
}

export interface UserProfile extends Pick<BaseUser, 'firstName' | 'lastName' | 'bio' | 'theme' | 'isPublic' | 'publicSlug' | 'publicDescription'> {}

export interface UserBilling {
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'canceled' | 'past_due' | 'incomplete_expired';
}

export type UserTheme = 
  | "light" | "dark" | "cupcake" | "bumblebee" | "emerald" | "corporate" 
  | "synthwave" | "retro" | "cyberpunk" | "valentine" | "halloween" 
  | "garden" | "forest" | "aqua" | "lofi" | "pastel" | "fantasy" 
  | "wireframe" | "black" | "luxury" | "dracula" | "cmyk" | "autumn" 
  | "business" | "acid" | "lemonade" | "night" | "coffee" | "winter" | "dim"
  | string; // Allow custom themes with format "custom-{id}"