import { useState, useEffect } from 'react';
import { authAPI } from '../api';
import {
  hexToOklch,
  oklchToCssValue,
  generateFocusVariant,
  generateContrastingTextColor
} from '../utils/colorUtils';

interface CustomTheme {
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
}

export const useThemeManager = () => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'retro';
  });

  // Apply theme on mount and when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  // Helper function to apply custom theme
  const applyUserCustomTheme = async (themeName: string) => {
    try {
      // Load custom themes from database or localStorage
      let customThemes: CustomTheme[] = [];
      try {
        const response = await authAPI.getCustomThemes();
        customThemes = response.customThemes || [];
      } catch (error) {
        // Fallback to localStorage
        const saved = localStorage.getItem('customThemes');
        if (saved) {
          customThemes = JSON.parse(saved);
        }
      }

      const themeId = themeName.replace('custom-', '');
      const customTheme = customThemes.find((t: CustomTheme) => t.id === themeId);

      if (customTheme) {
        // Remove existing custom theme styles
        const existingStyle = document.getElementById('custom-theme-style');
        if (existingStyle) {
          existingStyle.remove();
        }

        // Convert colors to OKLCH and create CSS
        const style = document.createElement('style');
        style.id = 'custom-theme-style';

        const primaryOklch = hexToOklch(customTheme.colors.primary);
        const secondaryOklch = hexToOklch(customTheme.colors.secondary);
        const accentOklch = hexToOklch(customTheme.colors.accent);
        const neutralOklch = hexToOklch(customTheme.colors.neutral);
        const base100Oklch = hexToOklch(customTheme.colors['base-100']);
        const base200Oklch = hexToOklch(customTheme.colors['base-200']);
        const base300Oklch = hexToOklch(customTheme.colors['base-300']);
        const infoOklch = hexToOklch(customTheme.colors.info);
        const successOklch = hexToOklch(customTheme.colors.success);
        const warningOklch = hexToOklch(customTheme.colors.warning);
        const errorOklch = hexToOklch(customTheme.colors.error);

        const css = `
          [data-theme="${themeName}"] {
            color-scheme: light;
            --p: ${oklchToCssValue(primaryOklch)};
            --pf: ${oklchToCssValue(generateFocusVariant(primaryOklch))};
            --pc: ${generateContrastingTextColor(primaryOklch)};
            --s: ${oklchToCssValue(secondaryOklch)};
            --sf: ${oklchToCssValue(generateFocusVariant(secondaryOklch))};
            --sc: ${generateContrastingTextColor(secondaryOklch)};
            --a: ${oklchToCssValue(accentOklch)};
            --af: ${oklchToCssValue(generateFocusVariant(accentOklch))};
            --ac: ${generateContrastingTextColor(accentOklch)};
            --n: ${oklchToCssValue(neutralOklch)};
            --nf: ${oklchToCssValue(generateFocusVariant(neutralOklch))};
            --nc: ${generateContrastingTextColor(neutralOklch)};
            --b1: ${oklchToCssValue(base100Oklch)};
            --b2: ${oklchToCssValue(base200Oklch)};
            --b3: ${oklchToCssValue(base300Oklch)};
            --bc: ${generateContrastingTextColor(base100Oklch)};
            --in: ${oklchToCssValue(infoOklch)};
            --inc: ${generateContrastingTextColor(infoOklch)};
            --su: ${oklchToCssValue(successOklch)};
            --suc: ${generateContrastingTextColor(successOklch)};
            --wa: ${oklchToCssValue(warningOklch)};
            --wac: ${generateContrastingTextColor(warningOklch)};
            --er: ${oklchToCssValue(errorOklch)};
            --erc: ${generateContrastingTextColor(errorOklch)};
          }
        `;

        style.textContent = css;
        document.head.appendChild(style);
        document.documentElement.setAttribute('data-theme', themeName);
      } else {
        // Custom theme not found, fall back to retro
        document.documentElement.setAttribute('data-theme', 'retro');
        setCurrentTheme('retro');
      }
    } catch (error) {
      // Fall back to retro theme on error
      document.documentElement.setAttribute('data-theme', 'retro');
      setCurrentTheme('retro');
    }
  };

  return {
    currentTheme,
    setCurrentTheme,
    applyUserCustomTheme
  };
};
