import React, { useState } from 'react';
import { getContrastTextColor } from '../../utils/contrastTextColor';
import { InlineEdit, InlineDate, toCommandDate } from '../shared/InlineEdit';

interface DevLogEntry {
  id: string;
  title?: string;
  description: string;
  date: Date;
}

interface DevLogRendererProps {
  entries: DevLogEntry[];
  projectId?: string;
  onNavigate: (path: string) => void;
  onCommandExecute?: (command: string) => void;
}

export const DevLogRenderer: React.FC<DevLogRendererProps> = ({ entries, projectId, onNavigate, onCommandExecute }) => {
  const [localEntries, setLocalEntries] = useState(entries);
  const dates = localEntries.map(e => new Date(e.date));
  const earliest = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
  const latest = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
  const formatShortDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const exec = (cmd: string) => onCommandExecute?.(cmd);

  const handleTitleSave = (index: number, newTitle: string) => {
    setLocalEntries(prev => prev.map((e, i) =>
      i === index ? { ...e, title: newTitle } : e
    ));
    exec(`/edit devlog ${index + 1} --title="${newTitle.replace(/"/g, '\\"')}"`);
  };

  const handleDescriptionSave = (index: number, newDesc: string) => {
    setLocalEntries(prev => prev.map((e, i) =>
      i === index ? { ...e, description: newDesc } : e
    ));
    exec(`/edit devlog ${index + 1} --content="${newDesc.replace(/"/g, '\\"')}"`);
  };

  const handleDateSave = (index: number, isoDate: string) => {
    setLocalEntries(prev => prev.map((e, i) =>
      i === index ? { ...e, date: new Date(isoDate) } : e
    ));
    exec(`/edit devlog ${index + 1} --date="${toCommandDate(isoDate)}"`);
  };

  const handleDelete = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    exec(`/delete devlog ${index + 1} --confirm`);
    setLocalEntries(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Header card */}
      <div className="flex items-center justify-between px-4 py-3 bg-base-200/60 rounded-lg border-thick border-l-4 border-l-primary">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-base-content">Dev Log</span>
          <span className="text-xs font-mono bg-accent/10 text-accent border border-accent/30 px-1.5 py-0.5 rounded">
            {localEntries.length}
          </span>
        </div>
        {earliest && latest && (
          <span className="text-xs font-mono text-base-content/50">
            {formatShortDate(earliest)} — {formatShortDate(latest)}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {localEntries.map((entry, index) => (
          <div
            key={index}
            className="group w-full text-left px-4 py-3 bg-base-200/60 rounded-lg hover:bg-base-200 transition-colors border-thick"
          >
            <div className="flex items-start gap-2 mb-2">
              <span className="text-xs font-mono font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/30 flex-shrink-0">
                #{index + 1}
              </span>
              <div className="text-xs font-mono text-base-content/50 flex-1">
                <InlineDate
                  value={entry.date}
                  onSave={(isoDate) => handleDateSave(index, isoDate)}
                />
              </div>
              <button
                onClick={(e) => handleDelete(e, index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-error/70 hover:text-error px-1.5 py-0.5 rounded hover:bg-error/10 flex-shrink-0"
                title="Delete entry"
              >
                ✕
              </button>
            </div>
            <div className="ml-8 space-y-1">
              <div className="text-sm font-semibold text-base-content/90 break-words">
                <InlineEdit
                  value={entry.title || ''}
                  onSave={(val) => handleTitleSave(index, val)}
                  inputClassName="text-sm font-semibold"
                  placeholder="Add title..."
                />
              </div>
              <div className="text-sm text-base-content/60 break-words">
                <InlineEdit
                  value={entry.description || ''}
                  onSave={(val) => handleDescriptionSave(index, val)}
                  inputClassName="text-sm text-base-content/60"
                  multiline
                  placeholder="Add description..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-base-200/40 rounded-lg border-thick">
        <span className="text-xs text-base-content/40 font-mono">
          click to edit · inline save
        </span>
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
    </div>
  );
};
