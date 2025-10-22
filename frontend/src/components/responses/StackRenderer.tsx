import React from 'react';
import { getContrastTextColor } from '../../utils/contrastTextColor';

interface StackItem {
  name: string;
  category: string;
  version?: string;
}

interface StackRendererProps {
  stack: StackItem[];
  projectId?: string;
  onNavigate: (path: string) => void;
}

export const StackRenderer: React.FC<StackRendererProps> = ({ stack = [], projectId, onNavigate }) => {
  return (
    <div className="mt-3 space-y-3">
      {stack.length > 0 && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {stack.map((item, index) => (
              <div
                key={index}
                className="h-16 flex items-center gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
              >
                <span className="text-xs px-2 py-0.5 bg-primary/30 rounded border-2 border-primary/40 flex-shrink-0">{item.category}</span>
                <div className="flex-1 min-w-0 text-sm font-medium text-base-content/80 break-words">{item.name}</div>
                {item.version && (
                  <span className="text-xs text-base-content/60 flex-shrink-0">{item.version}</span>
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
