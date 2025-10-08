import React from 'react';
import { getContrastTextColor } from '../../utils/contrastTextColor';

interface DevLogEntry {
  id: string;
  title?: string;
  entry: string;
  date: Date;
}

interface DevLogRendererProps {
  entries: DevLogEntry[];
  projectId?: string;
  onNavigate: (path: string) => void;
}

export const DevLogRenderer: React.FC<DevLogRendererProps> = ({ entries, projectId, onNavigate }) => {
  return (
    <div className="mt-3 space-y-2">
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={index}
            className="p-3 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-l-4 border-primary/50"
          >
            <div className="text-sm text-base-content/80 break-words">{entry.entry}</div>
            <div className="text-xs text-base-content/60 mt-2">
              {new Date(entry.date).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      {projectId && (
        <button
          onClick={() => onNavigate('/notes?section=devlog')}
          className="btn-primary-sm gap-2 border-thick"
          style={{ color: getContrastTextColor('primary') }}
        >
          <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          View Dev Log
        </button>
      )}
    </div>
  );
};
