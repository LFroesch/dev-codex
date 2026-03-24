// Local copy of shared types to avoid rootDir issues
export type UserTheme =
  | "light" | "dark" | "cupcake" | "bumblebee" | "emerald" | "corporate"
  | "synthwave" | "retro" | "cyberpunk" | "valentine" | "halloween"
  | "garden" | "forest" | "aqua" | "lofi" | "pastel" | "fantasy"
  | "wireframe" | "black" | "luxury" | "dracula" | "cmyk" | "autumn"
  | "business" | "acid" | "lemonade" | "night" | "coffee" | "winter" | "dim";

export interface EmailPreferences {
  billing: boolean;
  payments: boolean;
  security: boolean;
  weeklySummary: boolean;
}

export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  billing: true,
  payments: true,
  security: true,
  weeklySummary: true,
};