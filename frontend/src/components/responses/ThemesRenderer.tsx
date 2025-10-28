import React from 'react';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface Theme {
  name: string;
  displayName?: string;
  description: string;
  colors?: ThemeColors;
}

interface ThemesRendererProps {
  themes: Theme[];
  customThemes?: Theme[];
  onDirectThemeChange?: (themeName: string) => Promise<void>;
}

const ThemesRenderer: React.FC<ThemesRendererProps> = ({ themes, customThemes = [], onDirectThemeChange }) => {
  return (
    <div className="mt-3 space-y-4">
      {/* Preset Themes */}
      <div>
        <div className="text-xs font-semibold text-base-content/70 mb-2">Preset Themes ({themes.length})</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {themes.map((theme, index) => (
            <div
              key={index}
              className="p-2 bg-base-200 rounded-lg hover:bg-primary/20 hover:border-primary/50 transition-all border-2 border-base-content/20 cursor-pointer flex items-center gap-2"
              onClick={() => onDirectThemeChange?.(theme.name)}
              title={`Click to apply ${theme.name} theme`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs text-base-content/80 break-words">{theme.name}</div>
                <div className="text-xs text-base-content/60 break-words line-clamp-1">
                  {theme.description}
                </div>
              </div>
              {theme.colors && (
                <div className="flex gap-1 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full border-thick" style={{ backgroundColor: theme.colors.primary }} title="Primary" />
                  <div className="w-3 h-3 rounded-full border-thick" style={{ backgroundColor: theme.colors.secondary }} title="Secondary" />
                  <div className="w-3 h-3 rounded-full border-thick" style={{ backgroundColor: theme.colors.accent }} title="Accent" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Custom Themes */}
      {customThemes.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-base-content/70 mb-2">Custom Themes ({customThemes.length})</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {customThemes.map((theme, index) => (
              <div
                key={index}
                className="p-2 bg-base-200 rounded-lg hover:bg-secondary/20 hover:border-secondary/50 transition-all border-2 border-base-content/20 cursor-pointer flex items-center gap-2"
                onClick={() => onDirectThemeChange?.(theme.name)}
                title={`Click to apply ${theme.displayName} theme`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs text-base-content/80 flex items-center gap-1 break-words">
                    <span className="flex-shrink-0">🎨</span>
                    <span className="break-words">{theme.displayName}</span>
                  </div>
                  <div className="text-xs text-base-content/60 break-words line-clamp-1">
                    {theme.description}
                  </div>
                </div>
                {theme.colors && (
                  <div className="flex gap-1 flex-shrink-0">
                    <div className="w-3 h-3 rounded-full border-thick" style={{ backgroundColor: theme.colors.primary }} title="Primary" />
                    <div className="w-3 h-3 rounded-full border-thick" style={{ backgroundColor: theme.colors.secondary }} title="Secondary" />
                    <div className="w-3 h-3 rounded-full border-thick" style={{ backgroundColor: theme.colors.accent }} title="Accent" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-base-content/60">
        💡 Click any theme to apply it immediately
      </div>
    </div>
  );
};

export default ThemesRenderer;
