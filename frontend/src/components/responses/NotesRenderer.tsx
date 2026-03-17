import React, { useState } from 'react';
import { getContrastTextColor } from '../../utils/contrastTextColor';
import { InlineEdit } from '../shared/InlineEdit';

interface Note {
  id: string;
  title: string;
  preview?: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface NotesRendererProps {
  notes: Note[];
  projectId?: string;
  onNavigate: (path: string) => void;
  onCommandExecute?: (command: string) => void;
}

export const NotesRenderer: React.FC<NotesRendererProps> = ({ notes, projectId, onNavigate, onCommandExecute }) => {
  const [localNotes, setLocalNotes] = useState(notes);

  const exec = (cmd: string) => onCommandExecute?.(cmd);

  const handleTitleSave = (index: number, newTitle: string) => {
    setLocalNotes(prev => prev.map((n, i) =>
      i === index ? { ...n, title: newTitle } : n
    ));
    exec(`/edit note ${index + 1} --title="${newTitle.replace(/"/g, '\\"')}"`);
  };

  const handleDelete = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    exec(`/delete note ${index + 1} --confirm`);
    setLocalNotes(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Header card */}
      <div className="flex items-center justify-between px-4 py-3 bg-base-200/60 rounded-lg border-thick border-l-4 border-l-primary">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-base-content">Notes</span>
          <span className="text-xs font-mono bg-secondary/10 text-secondary border border-secondary/30 px-1.5 py-0.5 rounded">
            {localNotes.length}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {localNotes.map((note, index) => (
          <div
            key={index}
            className="group w-full text-left px-4 py-3 bg-base-200/60 rounded-lg hover:bg-base-200 transition-colors border-thick"
          >
            <div className="flex items-start gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded border border-secondary/30 flex-shrink-0">
                #{index + 1}
              </span>
              <div className="font-semibold text-sm text-base-content/90 break-words flex-1">
                <InlineEdit
                  value={note.title}
                  onSave={(val) => handleTitleSave(index, val)}
                  inputClassName="text-sm font-semibold"
                />
              </div>
              <button
                onClick={(e) => handleDelete(e, index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-error/70 hover:text-error px-1.5 py-0.5 rounded hover:bg-error/10 flex-shrink-0"
                title="Delete note"
              >
                ✕
              </button>
            </div>
            {note.preview && (
              <div className="text-xs text-base-content/60 line-clamp-3 break-words ml-8">
                {note.preview}
              </div>
            )}
            <div className="text-xs font-mono text-base-content/50 mt-2 ml-8">
              {new Date(note.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-base-200/40 rounded-lg border-thick">
        <span className="text-xs text-base-content/40 font-mono">
          click to edit title · inline save
        </span>
        {projectId && (
          <button
            onClick={() => onNavigate('/notes?section=notes')}
            className="btn-primary-sm gap-2 border-thick"
            style={{ color: getContrastTextColor('primary') }}
          >
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Notes
          </button>
        )}
      </div>
    </div>
  );
};
