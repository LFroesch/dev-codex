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
  bio?: string;
  isPublic: boolean;
  publicSlug?: string;
  publicDescription?: string;
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