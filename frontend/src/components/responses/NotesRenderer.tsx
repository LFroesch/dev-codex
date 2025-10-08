import React from 'react';
import { getContrastTextColor } from '../../utils/contrastTextColor';

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
}

export const NotesRenderer: React.FC<NotesRendererProps> = ({ notes, projectId, onNavigate }) => {
  return (
    <div className="mt-3 space-y-2">
      <div className="space-y-2">
        {notes.map((note, index) => (
          <div
            key={index}
            className="p-3 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
          >
            <div className="font-medium text-sm mb-1 text-base-content/80 break-words">{note.title}</div>
            {note.preview && (
              <div className="text-xs text-base-content/70 line-clamp-3 break-words">
                {note.preview}
              </div>
            )}
            <div className="text-xs text-base-content/60 mt-2">
              {new Date(note.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
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
  );
};
