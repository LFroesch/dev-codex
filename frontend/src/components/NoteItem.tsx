import React, { useState, useRef, useEffect } from 'react';
import { Note, projectAPI } from '../api/client';
import EnhancedTextEditor from './EnhancedTextEditor';

interface NoteItemProps {
  note: Note;
  projectId: string;
  onUpdate: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const NoteItem: React.FC<NoteItemProps> = ({ 
  note, 
  projectId, 
  onUpdate, 
  isExpanded, 
  onToggleExpand 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editDescription, setEditDescription] = useState(note.description || '');
  const [editContent, setEditContent] = useState(note.content);
  const [loading, setLoading] = useState(false);
  
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const editingContainerRef = useRef<HTMLDivElement>(null);
  const isCancelingRef = useRef(false);
  const isSavingRef = useRef(false);

  // Reset form when note changes or editing is cancelled
  React.useEffect(() => {
    setEditTitle(note.title);
    setEditDescription(note.description || '');
    setEditContent(note.content);
  }, [note.title, note.description, note.content]);

  // Auto-save functionality
  const scheduleAutoSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      if (isEditing && (editTitle.trim() !== note.title || editDescription.trim() !== (note.description || '') || editContent.trim() !== note.content)) {
        handleSave();
      }
    }, 15000); // 15 seconds
  };

  // Handle blur events (clicking outside)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditing && editingContainerRef.current && !editingContainerRef.current.contains(event.target as Node)) {
        // Check if clicked on a save or cancel button
        const target = event.target as Element;
        const isClickingButton = target.closest('button');
        const buttonText = isClickingButton?.textContent?.toLowerCase();
        
        if (buttonText?.includes('save') || buttonText?.includes('cancel')) {
          return; // Let the button handle it
        }
        
        // Check if there are changes before asking to save
        if (editTitle.trim() !== note.title || editDescription.trim() !== (note.description || '') || editContent.trim() !== note.content) {
          event.preventDefault();
          const shouldSave = window.confirm('You have unsaved changes. Do you want to save them?');
          if (shouldSave) {
            handleSave();
          } else {
            handleCancel();
          }
        } else {
          setIsEditing(false);
        }
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      scheduleAutoSave(); // Start the timer when entering edit mode
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isEditing, editTitle, editDescription, editContent, note.title, note.description, note.content]);

  // Reset auto-save timer on input changes
  const handleInputChange = (field: 'title' | 'description' | 'content', value: string) => {
    if (field === 'title') setEditTitle(value);
    else if (field === 'description') setEditDescription(value);
    else if (field === 'content') setEditContent(value);
    
    // Reset the auto-save timer whenever user types
    scheduleAutoSave();
  };

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;

    isSavingRef.current = true;
    setLoading(true);
    try {
      await projectAPI.updateNote(projectId, note.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        content: editContent.trim()
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update note:', error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isSavingRef.current = false;
      }, 0);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await projectAPI.deleteNote(projectId, note.id);
        onUpdate();
      } catch (error) {
        console.error('Failed to delete note:', error);
      }
    }
  };

  const handleCancel = () => {
    isCancelingRef.current = true;
    setEditTitle(note.title);
    setEditDescription(note.description || '');
    setEditContent(note.content);
    setIsEditing(false);
    setTimeout(() => {
      isCancelingRef.current = false;
    }, 0);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling expand when clicking edit
    setIsEditing(true);
    if (!isExpanded) {
      onToggleExpand(); // Expand if not already expanded
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling expand when clicking delete
    handleDelete();
  };

  // Enhanced markdown to HTML converter
  const renderMarkdown = (text: string): string => {
    if (!text) return '<p class="text-base-content/60 italic">No content...</p>';
    
    let processedText = text;
    
    // Helper function to ensure URL has protocol
    const ensureProtocol = (url: string): string => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      return 'https://' + url;
    };
    
    // Process in order to avoid conflicts
    
    // 1. Headers
    processedText = processedText
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
    
    // 2. Code blocks (must come before inline code and links)
    processedText = processedText
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-base-200 rounded p-3 my-2 overflow-x-auto"><code class="text-sm font-mono">$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-base-200 px-2 py-1 rounded text-sm font-mono">$1</code>');
    
    // 3. Markdown-style links [text](url) - process before auto-linking
    processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (match, text, url) => {
      const fullUrl = ensureProtocol(url);
      return `<a href="${fullUrl}" class="link link-primary" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });
    
    // 4. Auto-detect plain URLs (avoid URLs already in markdown links or code blocks)
    processedText = processedText.replace(
      /(?<!<[^>]*|`[^`]*|\[[^\]]*\]\()[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(?:\/[^\s<]*)?/gi,
      (match) => {
        return `<a href="${ensureProtocol(match)}" class="link link-primary" target="_blank" rel="noopener noreferrer">${match}</a>`;
      }
    );
    
    // 5. Auto-detect URLs starting with http/https
    processedText = processedText.replace(
      /(?<!<[^>]*|`[^`]*|\[[^\]]*\]\()https?:\/\/[^\s<]+/gi,
      (match) => {
        return `<a href="${match}" class="link link-primary" target="_blank" rel="noopener noreferrer">${match}</a>`;
      }
    );
    
    // 6. Bold and Italic
    processedText = processedText
      .replace(/\*\*([^*]+)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/\*([^*]+)\*/gim, '<em class="italic">$1</em>');
    
    // 7. Blockquotes
    processedText = processedText
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 my-2 italic text-base-content/80">$1</blockquote>');
    
    // 8. Lists
    processedText = processedText
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc list-inside">$1</li>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc list-inside">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal list-inside">$1</li>');
    
    // 9. Line breaks - preserve single breaks, avoid double spacing with block elements
    processedText = processedText.replace(/\n(?![<\/])/gim, '<br>');
    
    return processedText;
  };

  return (
    <div className="bg-base-100 shadow-lg border border-base-content/10 rounded-lg mb-4">
      <div className="p-4">
        {/* Header with title and controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-3 flex-1 text-left hover:bg-base-200 p-2 -m-2 rounded-lg transition-colors"
            disabled={isEditing}
          >
            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
              <svg className="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{note.title}</h3>
              {note.description && (
                <p className="text-sm text-base-content/70">{note.description}</p>
              )}
              <div className="text-xs text-base-content/50 mt-1">
                {note.updatedAt !== note.createdAt && (
                  <>Updated: {new Date(note.updatedAt).toLocaleDateString()} • </>
                )}
                {note.createdAt && (
                  <>Created: {new Date(note.createdAt).toLocaleDateString()}</>
                )}
              </div>
            </div>
          </button>
          
          <div className="flex gap-2 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="btn btn-sm btn-primary"
                  disabled={loading || !editTitle.trim() || !editContent.trim()}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="btn btn-sm btn-ghost"
                  disabled={loading}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditClick}
                  className="btn btn-sm btn-ghost"
                  disabled={isEditing}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="btn btn-sm btn-error btn-outline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Collapsible content */}
        {isExpanded && (
          <div className="mt-4 border-t border-base-300 pt-4">
            {isEditing ? (
              <div className="space-y-4" ref={editingContainerRef}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Title</span>
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="input input-bordered"
                      placeholder="Note title..."
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Description</span>
                    </label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="input input-bordered"
                      placeholder="Brief description (optional)..."
                    />
                  </div>
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Content</span>
                  </label>
                  <EnhancedTextEditor
                    value={editContent}
                    onChange={(value) => handleInputChange('content', value)}
                    placeholder="Enter your note content here... (Markdown supported)"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancel}
                    className="btn btn-ghost btn-sm"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn btn-primary btn-sm"
                    disabled={loading || !editTitle.trim() || !editContent.trim()}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-base-200 rounded-lg p-4 border border-base-300">
                <div 
                  className="prose prose-sm max-w-none text-base-content"
                  dangerouslySetInnerHTML={{ 
                    __html: renderMarkdown(note.content) 
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

interface NewNoteFormProps {
  projectId: string;
  onAdd: () => void;
}

const NewNoteForm: React.FC<NewNoteFormProps> = ({ projectId, onAdd }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      await projectAPI.createNote(projectId, {
        title: title.trim(),
        description: description.trim(),
        content: content.trim()
      });
      setTitle('');
      setDescription('');
      setContent('');
      onAdd();
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10 mb-4">
      <input type="checkbox" />
      <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
        Create New Note
      </div>
      
      <div className="collapse-content">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Note Title</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input input-bordered border-base-300"
                placeholder="Enter note title..."
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Description (Optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input input-bordered border-base-300"
                placeholder="Brief description..."
              />
            </div>
          </div>
          
          <div className="form-control">
            <div className="flex justify-between items-center mb-2">
              <label className="label">
                <span className="label-text font-medium">Note Content</span>
              </label>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={loading || !title.trim() || !content.trim()}
              >
                {loading ? 'Adding...' : 'Add Note'}
              </button>
            </div>
            <div className="space-y-2">
              <EnhancedTextEditor
                value={content}
                onChange={setContent}
                placeholder="Enter your note content here... (Markdown supported)"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={loading || !title.trim() || !content.trim()}
                >
                  {loading ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export { NoteItem, NewNoteForm };