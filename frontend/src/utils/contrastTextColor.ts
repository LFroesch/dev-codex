/**
 * Determines if text should be white or black based on background color
 * for optimal contrast and readability
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
      'base': '--bc',
      
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
          
          const [r, g, b] = hslToRgb(h, s, l);
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