import React from 'react';
import { getContrastTextColor } from '../../utils/contrastTextColor';

interface Tech {
  name: string;
  category: string;
  version?: string;
}

interface StackRendererProps {
  stack: {
    technologies: Tech[];
    packages: Tech[];
  };
  projectId?: string;
  onNavigate: (path: string) => void;
}

export const StackRenderer: React.FC<StackRendererProps> = ({ stack, projectId, onNavigate }) => {
  const { technologies = [], packages = [] } = stack;

  return (
    <div className="mt-3 space-y-3">
      {technologies.length > 0 && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {technologies.map((tech, index) => (
              <div
                key={index}
                className="h-16 flex items-center gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
              >
                <span className="text-xs px-2 py-0.5 bg-primary/30 rounded border-2 border-primary/40 flex-shrink-0">{tech.category}</span>
                <div className="flex-1 min-w-0 text-sm font-medium text-base-content/80 break-words">{tech.name}</div>
                {tech.version && (
                  <span className="text-xs text-base-content/60 flex-shrink-0">{tech.version}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {packages.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-primary mb-2">Packages ({packages.length})</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {packages.map((pkg, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
              >
                <span className="text-xs px-2 py-0.5 bg-secondary/30 rounded border-2 border-secondary/40 flex-shrink-0">{pkg.category}</span>
                <div className="flex-1 min-w-0 text-sm font-medium text-base-content/80 break-words">{pkg.name}</div>
                {pkg.version && (
                  <span className="text-xs text-base-content/60 flex-shrink-0">{pkg.version}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {projectId && (
        <button
          onClick={() => onNavigate('/stack')}
          className="btn-primary-sm gap-2 border-thick"
          style={{ color: getContrastTextColor('primary') }}
        >
          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          View Full Stack
        </button>
      )}
    </div>
  );
};
