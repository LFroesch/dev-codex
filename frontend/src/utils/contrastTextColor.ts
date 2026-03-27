/**
 * Determines if text should be white or black based on background color
 * for optimal contrast and readability
 *
 * Supports opacity modifiers (e.g., "primary/20", "info/40")
 * Low opacity backgrounds blend with base before deciding contrast
 *
 * Uses OKLCH lightness directly — matches generateContrastingTextColor threshold (l > 60)
 */
export const getContrastTextColor = (colorValue?: string): string => {

  const LIGHTNESS_THRESHOLD = 60;

  const parseOklchLightness = (oklchString: string): number | null => {
    const matches = oklchString.match(/[\d.]+/g);
    if (matches && matches.length >= 1) {
      return parseFloat(matches[0]); // first value is lightness %
    }
    return null;
  };

  const calculateLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  if (!colorValue) {
    colorValue = 'primary';
  }

  // Handle opacity modifiers (e.g., "primary/20", "info/40")
  let opacity = 1;
  if (colorValue.includes('/')) {
    const [color, opacityStr] = colorValue.split('/');
    opacity = parseInt(opacityStr) / 100;
    colorValue = color;
  }

  // Handle DaisyUI color names — read OKLCH values from CSS vars
  if (colorValue && typeof colorValue === 'string' && !colorValue.startsWith('#')) {
    const colorMap: { [key: string]: string } = {
      'primary': '--p',
      'secondary': '--s',
      'accent': '--a',
      'neutral': '--n',
      'info': '--in',
      'success': '--su',
      'warning': '--wa',
      'error': '--er',
      'base': '--b',
    };

    if (colorMap[colorValue] && typeof window !== 'undefined') {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      const oklchString = styles.getPropertyValue(colorMap[colorValue]).trim();

      if (oklchString) {
        let lightness = parseOklchLightness(oklchString);

        if (lightness !== null) {
          // Blend with base background lightness if opacity < 1
          if (opacity < 1) {
            const baseString = styles.getPropertyValue('--b1').trim() || styles.getPropertyValue('--b').trim();
            const baseLightness = baseString ? parseOklchLightness(baseString) : null;

            if (baseLightness !== null) {
              lightness = lightness * opacity + baseLightness * (1 - opacity);
            }
          }

          return lightness > LIGHTNESS_THRESHOLD ? '#000000' : '#ffffff';
        }
      }
    }
  }

  // Handle hex colors
  if (colorValue && colorValue.startsWith('#')) {
    const hex = colorValue.slice(1);
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);

      const luminance = calculateLuminance(r, g, b);
      return luminance > 0.35 ? '#000000' : '#ffffff';
    }
  }

  // Fallback to primary if we couldn't parse the color
  if (colorValue !== 'primary') {
    return getContrastTextColor('primary');
  }

  // Final fallback
  return '#ffffff';
};
