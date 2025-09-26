import React from 'react';
import { hexToOklch, oklchToCssValue, generateFocusVariant, generateContrastingTextColor } from '../utils/colorUtils';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface ThemePreviewProps {
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

const ThemePreview: React.FC<ThemePreviewProps> = ({ colors }) => {
  // Convert colors to OKLCH format for CSS variables
  const primaryOklch = hexToOklch(colors.primary);
  const secondaryOklch = hexToOklch(colors.secondary);
  const accentOklch = hexToOklch(colors.accent);
  const neutralOklch = hexToOklch(colors.neutral);
  const base100Oklch = hexToOklch(colors['base-100']);
  const base200Oklch = hexToOklch(colors['base-200']);
  const base300Oklch = hexToOklch(colors['base-300']);
  const infoOklch = hexToOklch(colors.info);
  const successOklch = hexToOklch(colors.success);
  const warningOklch = hexToOklch(colors.warning);
  const errorOklch = hexToOklch(colors.error);

  // Generate CSS custom properties for the preview
  const previewStyles = {
    '--p': oklchToCssValue(primaryOklch),
    '--pf': oklchToCssValue(generateFocusVariant(primaryOklch)),
    '--pc': generateContrastingTextColor(primaryOklch),
    '--s': oklchToCssValue(secondaryOklch),
    '--sf': oklchToCssValue(generateFocusVariant(secondaryOklch)),
    '--sc': generateContrastingTextColor(secondaryOklch),
    '--a': oklchToCssValue(accentOklch),
    '--af': oklchToCssValue(generateFocusVariant(accentOklch)),
    '--ac': generateContrastingTextColor(accentOklch),
    '--n': oklchToCssValue(neutralOklch),
    '--nf': oklchToCssValue(generateFocusVariant(neutralOklch)),
    '--nc': generateContrastingTextColor(neutralOklch),
    '--b1': oklchToCssValue(base100Oklch),
    '--b2': oklchToCssValue(base200Oklch),
    '--b3': oklchToCssValue(base300Oklch),
    '--bc': generateContrastingTextColor(base100Oklch),
    '--in': oklchToCssValue(infoOklch),
    '--inc': generateContrastingTextColor(infoOklch),
    '--su': oklchToCssValue(successOklch),
    '--suc': generateContrastingTextColor(successOklch),
    '--wa': oklchToCssValue(warningOklch),
    '--wac': generateContrastingTextColor(warningOklch),
    '--er': oklchToCssValue(errorOklch),
    '--erc': generateContrastingTextColor(errorOklch),
  } as React.CSSProperties;

  return (
    <div className="bg-base-100 rounded-lg p-4 border border-base-300">
      <h4 className="font-semibold mb-3">Live Theme Preview</h4>
      <div 
        className="bg-base-100 rounded-lg p-4 border border-base-300 space-y-4"
        style={previewStyles}
      >
        {/* Navigation Bar Preview */}
        <div className="bg-base-200 border-subtle rounded-xl px-3 py-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-3 h-3 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <span className="font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-sm">Dev Codex</span>
            </div>
            <div className="flex gap-1">
              <button className="btn btn-primary btn-xs">Menu</button>
            </div>
          </div>
        </div>

        {/* Buttons & Tabs */}
        <div className="space-y-2">
          <div className="tabs tabs-boxed border-subtle shadow-sm">
            <button className="tab tab-sm tab-active text-xs font-bold" style={{color: getContrastTextColor()}}>Projects</button>
            <button className="tab tab-sm text-xs font-bold">Details</button>
            <button className="tab tab-sm text-xs font-bold">Discover</button>
          </div>
          <div className="flex flex-wrap gap-1">
            <button className="btn btn-primary btn-xs">Primary</button>
            <button className="btn btn-secondary btn-xs">Secondary</button>
            <button className="btn btn-accent btn-xs">Accent</button>
            <button className="btn btn-outline btn-xs">Outline</button>
          </div>
        </div>

        {/* Cards Preview */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-base-100 rounded-xl p-3 border-subtle shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.primary }}></div>
              <h4 className="text-xs font-bold">Sample Project</h4>
            </div>
            <p className="text-xs text-base-content/60 mb-2">Web App project preview</p>
            <button className="btn btn-primary btn-xs">View</button>
          </div>
          <div className="bg-gradient-to-br from-base-50 to-base-100/50 rounded-xl p-3 border-subtle shadow-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.secondary }}></div>
              <h4 className="text-xs font-bold">Another Project</h4>
            </div>
            <p className="text-xs text-base-content/60 mb-2">Mobile app project</p>
            <button className="btn btn-secondary btn-xs">Edit</button>
          </div>
        </div>

        {/* Status Messages & Forms */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1">
            <div className="alert alert-info py-1 text-xs">
              <span>Info</span>
            </div>
            <div className="alert alert-success py-1 text-xs">
              <span>Success</span>
            </div>
            <div className="alert alert-warning py-1 text-xs">
              <span>Warning</span>
            </div>
            <div className="alert alert-error py-1 text-xs">
              <span>Error</span>
            </div>
          </div>
          <div className="form-control">
            <input type="text" placeholder="Sample input" className="input input-bordered input-sm text-xs" />
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-1">
              <div className="badge badge-primary badge-sm">Primary</div>
              <div className="badge badge-secondary badge-sm">Secondary</div>
              <div className="badge badge-accent badge-sm">Accent</div>
            </div>
            <input type="checkbox" className="toggle toggle-primary toggle-sm" defaultChecked />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePreview;