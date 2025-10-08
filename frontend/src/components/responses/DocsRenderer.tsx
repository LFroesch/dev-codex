import React from 'react';
import { getContrastTextColor } from '../../utils/contrastTextColor';

interface Doc {
  id: string;
  type: string;
  title: string;
  createdAt: Date;
}

interface DocsRendererProps {
  docs: Doc[];
  projectId?: string;
  onNavigate: (path: string) => void;
}

export const DocsRenderer: React.FC<DocsRendererProps> = ({ docs, projectId, onNavigate }) => {
  return (
    <div className="mt-3 space-y-2">
      <div className="space-y-1">
        {docs.map((doc, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
          >
            <span className="text-xs px-2 py-0.5 bg-primary/30 rounded border-2 border-primary/40 flex-shrink-0">{doc.type}</span>
            <div className="flex-1 min-w-0 text-sm font-medium text-base-content/80 break-words">{doc.title}</div>
          </div>
        ))}
      </div>
      {projectId && (
        <button
          onClick={() => onNavigate('/docs')}
          className="btn-primary-sm gap-2 border-thick"
          style={{ color: getContrastTextColor('primary') }}
        >
          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          View Docs
        </button>
      )}
    </div>
  );
};
