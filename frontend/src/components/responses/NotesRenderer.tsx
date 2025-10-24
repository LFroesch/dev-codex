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
  onCommandClick?: (command: string) => void;
}

export const NotesRenderer: React.FC<NotesRendererProps> = ({ notes, projectId, onNavigate, onCommandClick }) => {
  return (
    <div className="mt-3 space-y-2">
      <div className="space-y-2">
        {notes.map((note, index) => (
          <button
            key={index}
            onClick={() => onCommandClick?.(`/edit note ${index + 1}`)}
            className="w-full text-left p-3 bg-base-200 rounded-lg hover:bg-primary/10 hover:border-primary/50 transition-colors border-thick cursor-pointer"
          >
            <div className="flex items-start gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded border border-secondary/30 flex-shrink-0">
                #{index + 1}
              </span>
              <div className="font-medium text-sm text-base-content/80 break-words flex-1">
                {note.title}
              </div>
            </div>
            {note.preview && (
              <div className="text-xs text-base-content/70 line-clamp-3 break-words ml-8">
                {note.preview}
              </div>
            )}
            <div className="text-xs text-base-content/60 mt-2 ml-8">
              {new Date(note.createdAt).toLocaleString()}
            </div>
          </button>
        ))}
      </div>
      <div className="text-xs text-base-content/60 mt-3 p-2 bg-base-200/50 rounded border-thick">
        💡 <strong>Tip:</strong> Use the <code className="bg-base-300 px-1 rounded">#ID</code> to reference notes:
        <div className="mt-1 space-y-0.5 ml-4">
          <div>• <code className="bg-base-300 px-1 rounded">/edit note 1 new content</code></div>
          <div>• <code className="bg-base-300 px-1 rounded">/edit note title to new content</code></div>
          <div>• <code className="bg-base-300 px-1 rounded">/delete note 1 --confirm</code></div>
        </div>
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
