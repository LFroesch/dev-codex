/**
 * Color utility functions for theme handling
 */

export interface OklchColor {
  l: number; // lightness
  c: number; // chroma
  h: number; // hue
}

/**
 * Convert hex color to OKLCH format for DaisyUI theme variables
 * @param hex - Hex color string (e.g., "#ff0000")
 * @returns OKLCH color object
 */
export const hexToOklch = (hex: string): OklchColor => {
  // Validate hex format
  if (!hex || !hex.startsWith('#') || hex.length !== 7) {
    return { l: 50, c: 0, h: 0 };
  }
  
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return { l: 50, c: 0, h: 0 };
  }
  
  // Convert RGB to linear RGB
  const toLinear = (c: number) => {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  
  const rLin = toLinear(r);
  const gLin = toLinear(g);
  const bLin = toLinear(b);
  
  // Convert to OKLab (simplified matrix transformation)
  const l = 0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin;
  const m = 0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin;
  const s = 0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin;
  
  const l_ = Math.pow(Math.abs(l), 1/3) * Math.sign(l);
  const m_ = Math.pow(Math.abs(m), 1/3) * Math.sign(m);
  const s_ = Math.pow(Math.abs(s), 1/3) * Math.sign(s);
  
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_lab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  
  // Convert to OKLCH
  const lightness = L * 100;
  const chroma = Math.sqrt(a * a + b_lab * b_lab);
  let hue = Math.atan2(b_lab, a) * 180 / Math.PI;
  if (hue < 0) hue += 360;
  
  return {
    l: Math.round(lightness * 100) / 100,
    c: Math.round(chroma * 1000) / 1000,
    h: Math.round(hue * 100) / 100
  };
};

/**
 * Generate CSS custom properties for a color in OKLCH format
 * @param oklch - OKLCH color object
 * @returns CSS value string
 */
export const oklchToCssValue = (oklch: OklchColor): string => {
  return `${oklch.l}% ${oklch.c} ${oklch.h}`;
};

/**
 * Generate focus/hover variant of a color (slightly darker)
 * @param oklch - Original OKLCH color
 * @returns Modified OKLCH color for focus/hover state
 */
export const generateFocusVariant = (oklch: OklchColor): OklchColor => {
  return {
    l: Math.max(0, oklch.l - 10),
    c: oklch.c * 0.8,
    h: oklch.h
  };
};

/**
 * Generate contrasting text color (black or white) based on lightness
 * @param oklch - Background color in OKLCH
 * @returns CSS value for contrasting text color
 */
export const generateContrastingTextColor = (oklch: OklchColor): string => {
  return oklch.l > 60 ? '13.138% 0.0392 275.75' : '89.824% 0.04364 275.75';
};