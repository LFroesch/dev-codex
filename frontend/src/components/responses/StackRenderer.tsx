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
  onCommandExecute?: (command: string) => void;
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  frontend: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/30' },
  backend: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' },
  database: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30' },
  devops: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent/30' },
  testing: { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/30' },
  infrastructure: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
};

const defaultColor = { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' };

export const StackRenderer: React.FC<StackRendererProps> = ({ stack = [], projectId, onNavigate, onCommandExecute }) => {
  const exec = (cmd: string) => onCommandExecute?.(cmd);

  return (
    <div className="mt-3 space-y-2">
      {/* Header card */}
      <div className="flex items-center justify-between px-4 py-3 bg-base-200/60 rounded-lg border-thick border-l-4 border-l-primary">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-base-content">Tech Stack</span>
          <span className="text-xs font-mono bg-primary/10 text-primary border border-primary/30 px-1.5 py-0.5 rounded">
            {stack.length}
          </span>
        </div>
      </div>

      {stack.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {stack.map((item, index) => {
            const colors = categoryColors[item.category.toLowerCase()] || defaultColor;
            return (
              <div
                key={index}
                className="group h-16 flex items-center gap-3 px-4 py-3 bg-base-200/60 rounded-lg hover:bg-base-200 transition-colors border-thick relative"
              >
                <span className={`text-xs px-2 py-0.5 ${colors.bg} ${colors.text} border ${colors.border} rounded flex-shrink-0`}>
                  {item.category}
                </span>
                <div className="flex-1 min-w-0 text-sm font-semibold text-base-content/90 break-words">{item.name}</div>
                {item.version && (
                  <span className="text-xs font-mono text-base-content/50 flex-shrink-0 group-hover:hidden">{item.version}</span>
                )}
                <button
                  onClick={() => exec(`/remove tech ${item.name}`)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-error/70 hover:text-error px-1.5 py-0.5 rounded hover:bg-error/10 flex-shrink-0 absolute right-2"
                  title={`Remove ${item.name}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-base-200/40 rounded-lg border-thick">
        <div className="text-xs text-base-content/50">
          💡 <code className="bg-base-300 px-1 rounded">/add tech category name</code> or <code className="bg-base-300 px-1 rounded">/remove tech name</code>
        </div>
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
    </div>
  );
};
