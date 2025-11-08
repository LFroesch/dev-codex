/**
 * Determines if text should be white or black based on background color
 * for optimal contrast and readability
 *
 * Supports opacity modifiers (e.g., "primary/20", "info/40")
 * Low opacity backgrounds always return black text for better readability
 */
export const getContrastTextColor = (colorValue?: string): string => {

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    // Convert HSL to RGB
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 1/6) {
      r = c; g = x; b = 0;
    } else if (1/6 <= h && h < 2/6) {
      r = x; g = c; b = 0;
    } else if (2/6 <= h && h < 3/6) {
      r = 0; g = c; b = x;
    } else if (3/6 <= h && h < 4/6) {
      r = 0; g = x; b = c;
    } else if (4/6 <= h && h < 5/6) {
      r = x; g = 0; b = c;
    } else if (5/6 <= h && h < 1) {
      r = c; g = 0; b = x;
    }

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  };

  const calculateLuminance = (r: number, g: number, b: number): number => {
    // Convert to relative luminance
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // Default to primary if no color specified
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

  // Handle DaisyUI color names by getting their actual computed values
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
      const hslString = styles.getPropertyValue(colorMap[colorValue]).trim();
      
      if (hslString) {
        // Parse DaisyUI format: "lightness% saturation hue" e.g. "37.45% 0.189 325.02"
        const matches = hslString.match(/[\d.]+/g);
        if (matches && matches.length >= 3) {
          // DaisyUI order is: lightness%, saturation, hue
          const l = parseFloat(matches[0]); // lightness (already in %)
          let s = parseFloat(matches[1]); // saturation (decimal)
          const h = parseFloat(matches[2]); // hue (degrees)
          
          // Convert saturation from decimal to percentage
          if (s <= 1) s *= 100;

          let [r, g, b] = hslToRgb(h, s, l);

          // Blend with base background if opacity < 1
          if (opacity < 1) {
            const baseHslString = styles.getPropertyValue('--b1').trim() || styles.getPropertyValue('--b').trim();

            if (baseHslString) {
              const baseMatches = baseHslString.match(/[\d.]+/g);
              if (baseMatches && baseMatches.length >= 3) {
                const baseL = parseFloat(baseMatches[0]);
                let baseS = parseFloat(baseMatches[1]);
                const baseH = parseFloat(baseMatches[2]);

                if (baseS <= 1) baseS *= 100;

                const [baseR, baseG, baseB] = hslToRgb(baseH, baseS, baseL);

                // Blend foreground with base background
                r = Math.round(r * opacity + baseR * (1 - opacity));
                g = Math.round(g * opacity + baseG * (1 - opacity));
                b = Math.round(b * opacity + baseB * (1 - opacity));
              }
            }
          }

          const luminance = calculateLuminance(r, g, b);

          return luminance > 0.35 ? '#000000' : '#ffffff';
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