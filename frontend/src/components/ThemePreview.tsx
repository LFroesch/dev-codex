import React from 'react';

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

// Helper functions for theme handling (copied from AccountSettingsPage)
const hexToOklch = (hex: string) => {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) {
    return { l: 50, c: 0, h: 0 };
  }
  
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return { l: 50, c: 0, h: 0 };
  }
  
  const toLinear = (c: number) => {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  
  const rLin = toLinear(r);
  const gLin = toLinear(g);
  const bLin = toLinear(b);
  
  const l = 0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin;
  const m = 0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin;
  const s = 0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin;
  
  const l_ = Math.pow(Math.abs(l), 1/3) * Math.sign(l);
  const m_ = Math.pow(Math.abs(m), 1/3) * Math.sign(m);
  const s_ = Math.pow(Math.abs(s), 1/3) * Math.sign(s);
  
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_lab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  
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

const getContrastColor = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '13.138% 0.0392 275.75' : '89.824% 0.04364 275.75';
};

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
    '--p': `${primaryOklch.l}% ${primaryOklch.c} ${primaryOklch.h}`,
    '--pf': `${Math.max(0, primaryOklch.l - 10)}% ${primaryOklch.c * 0.8} ${primaryOklch.h}`,
    '--pc': primaryOklch.l > 60 ? '13.138% 0.0392 275.75' : '89.824% 0.04364 275.75',
    '--s': `${secondaryOklch.l}% ${secondaryOklch.c} ${secondaryOklch.h}`,
    '--sf': `${Math.max(0, secondaryOklch.l - 10)}% ${secondaryOklch.c * 0.8} ${secondaryOklch.h}`,
    '--sc': secondaryOklch.l > 60 ? '13.138% 0.0392 275.75' : '89.824% 0.04364 275.75',
    '--a': `${accentOklch.l}% ${accentOklch.c} ${accentOklch.h}`,
    '--af': `${Math.max(0, accentOklch.l - 10)}% ${accentOklch.c * 0.8} ${accentOklch.h}`,
    '--ac': accentOklch.l > 60 ? '13.138% 0.0392 275.75' : '89.824% 0.04364 275.75',
    '--n': `${neutralOklch.l}% ${neutralOklch.c} ${neutralOklch.h}`,
    '--nf': `${Math.max(0, neutralOklch.l - 10)}% ${neutralOklch.c * 0.8} ${neutralOklch.h}`,
    '--nc': neutralOklch.l > 60 ? '13.138% 0.0392 275.75' : '89.824% 0.04364 275.75',
    '--b1': `${base100Oklch.l}% ${base100Oklch.c} ${base100Oklch.h}`,
    '--b2': `${base200Oklch.l}% ${base200Oklch.c} ${base200Oklch.h}`,
    '--b3': `${base300Oklch.l}% ${base300Oklch.c} ${base300Oklch.h}`,
    '--bc': getContrastColor(colors['base-100']),
    '--in': `${infoOklch.l}% ${infoOklch.c} ${infoOklch.h}`,
    '--inc': infoOklch.l > 60 ? '13.138% 0.0392 275.75' : '89.824% 0.04364 275.75',
    '--su': `${successOklch.l}% ${successOklch.c} ${successOklch.h}`,
    '--suc': successOklch.l > 60 ? '13.138% 0.0392 275.75' : '89.824% 0.04364 275.75',
    '--wa': `${warningOklch.l}% ${warningOklch.c} ${warningOklch.h}`,
    '--wac': warningOklch.l > 60 ? '13.138% 0.0392 275.75' : '89.824% 0.04364 275.75',
    '--er': `${errorOklch.l}% ${errorOklch.c} ${errorOklch.h}`,
    '--erc': errorOklch.l > 60 ? '13.138% 0.0392 275.75' : '89.824% 0.04364 275.75',
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
            <button className="tab tab-sm tab-active text-xs font-bold">Projects</button>
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