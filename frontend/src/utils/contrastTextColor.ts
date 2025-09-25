/**
 * Determines if text should be white or black based on background color
 * for optimal contrast and readability
 */
export const getContrastTextColor = (colorValue?: string): string => {
  // Handle special DaisyUI color names
  if (colorValue && typeof colorValue === 'string' && !colorValue.startsWith('#')) {
    const specialColors: { [key: string]: string } = {
      'warning': '--wa',
      'error': '--er', 
      'success': '--su',
      'info': '--in',
      'accent': '--ac',
      'secondary': '--se'
    };

    if (specialColors[colorValue]) {
      if (typeof window !== 'undefined' && document.documentElement) {
        const computedStyle = getComputedStyle(document.documentElement);
        const colorHsl = computedStyle.getPropertyValue(specialColors[colorValue]).trim();
        
        if (colorHsl) {
          // Convert HSL to RGB for luminance calculation
          const [h, s, l] = colorHsl.split(' ').map(v => parseFloat(v.replace('%', '')));
          const lightness = l / 100;
          
          // Use lightness as a simple approximation for luminance
          return lightness > 0.5 ? '#000000' : '#ffffff';
        }
      }
      
      // Fallback for special colors
      return colorValue === 'warning' || colorValue === 'info' ? '#000000' : '#ffffff';
    }
  }
  
  // If no hex color provided, check the CSS primary color
  if (!colorValue) {
    // Get the computed primary color from CSS variables
    if (typeof window !== 'undefined' && document.documentElement) {
      const computedStyle = getComputedStyle(document.documentElement);
      const primaryHsl = computedStyle.getPropertyValue('--p').trim();
      
      if (primaryHsl) {
        // Convert HSL to RGB for luminance calculation
        const [h, s, l] = primaryHsl.split(' ').map(v => parseFloat(v.replace('%', '')));
        const lightness = l / 100;
        
        // Use lightness as a simple approximation for luminance
        return lightness > 0.5 ? '#000000' : '#ffffff';
      }
    }
    
    // Fallback to checking if primary is light or dark theme
    return 'hsl(var(--pc))';
  }
  
  // Handle hex color (existing logic)
  const color = colorValue.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  
  // Calculate luminance using the relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
};