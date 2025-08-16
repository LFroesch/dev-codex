import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Note, projectAPI } from '../api';
import EnhancedTextEditor from './EnhancedTextEditor';
import ConfirmationModal from './ConfirmationModal';
import { unsavedChangesManager } from '../utils/unsavedChanges';
import activityTracker from '../services/activityTracker';
import { lockSignaling } from '../services/lockSignaling';

interface NoteItemProps {
  note: Note;
  projectId: string;
  onUpdate: () => void;
  onClick: () => void;
}

interface NoteModalProps {
  note: Note | null;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  mode: 'view' | 'edit';
  onModeChange: (mode: 'view' | 'edit') => void;
}

const NoteItem: React.FC<NoteItemProps> = ({ 
  note, 
  projectId, 
  onUpdate,
  onClick
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await projectAPI.deleteNote(projectId, note.id);
      
      // Track note deletion
      await activityTracker.trackDelete(
        'note',
        note.id,
        note.title, // resourceName
        undefined, // no fileName for notes
        { originalTitle: note.title } // metadata
      );
      
      onUpdate();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete note:', error);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(note.content);
    } catch (error) {
      console.error('Failed to copy note content:', error);
    }
  };

  return (
    <>
      <div 
        className="bg-base-100 shadow-lg border-subtle rounded-lg p-4 cursor-pointer hover:shadow-xl transition-shadow duration-200 group"
        onClick={onClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-2 text-base-content truncate group-hover:text-primary transition-colors">
              {note.title}
            </h3>
            {note.description && (
              <p className="text-sm text-base-content/70 mb-3">{note.description}</p>
            )}
            <div className="text-xs text-base-content/50">
              {note.updatedAt !== note.createdAt && (
                <>Updated: {new Date(note.updatedAt).toLocaleDateString()}{note.updatedBy && ` by ${note.updatedBy}`} • </>
              )}
              {note.createdAt && (
                <>Created: {new Date(note.createdAt).toLocaleDateString()}{note.createdBy && ` by ${note.createdBy}`}</>
              )}
            </div>
          </div>
          
          <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="btn btn-xs btn-ghost"
              title="Copy content"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={handleDeleteClick}
              className="btn btn-xs btn-ghost text-error hover:bg-error/20"
              title="Delete note"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Note"
        message={`Are you sure you want to delete "<strong>${note.title}</strong>"? This action cannot be undone.`}
        confirmText="Delete Note"
        variant="error"
      />
    </>
  );
};

const NoteModal: React.FC<NoteModalProps> = ({ 
  note, 
  projectId, 
  isOpen, 
  onClose, 
  onUpdate, 
  mode, 
  onModeChange 
}) => {
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Locking states
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<{ email: string; name: string; isCurrentUser: boolean } | null>(null);
  const [lockError, setLockError] = useState('');

  // Create unique component ID for unsaved changes tracking
  const componentId = note ? `note-modal-${note.id}` : 'note-modal';
  
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const isCancelingRef = useRef(false);
  const isSavingRef = useRef(false);
  const heartbeatIntervalRef = useRef<number | null>(null);

  // Effect to handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!isOpen || !note) return;
      
      if (e.key === 'Escape') {
        if (mode === 'edit') {
          // In edit mode, Escape goes back to view mode (with unsaved changes check)
          const hasChanges = editTitle.trim() !== note.title || 
                            editDescription.trim() !== (note.description || '') || 
                            editContent.trim() !== note.content;
          if (hasChanges) {
            const canProceed = await unsavedChangesManager.checkNavigationAllowed();
            if (!canProceed) return;
          }
          handleCancel();
        } else {
          // In view mode, Escape closes the modal
          onClose();
        }
      } else if (e.key === 'e' && mode === 'view') {
        await handleEnterEditMode();
      } else if (e.key === 'c' && mode === 'view') {
        handleCopy();
      } else if (e.ctrlKey && e.key === 's' && mode === 'edit') {
        e.preventDefault();
        handleSave();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, mode, onModeChange, editTitle, editDescription, editContent, note?.title, note?.description, note?.content]);

  // Reset form when note changes
  useEffect(() => {
    if (note) {
      setEditTitle(note.title);
      setEditDescription(note.description || '');
      setEditContent(note.content);
    }
  }, [note]);

  // Track unsaved changes and register with the manager
  useEffect(() => {
    if (mode === 'edit' && note) {
      const hasChanges = editTitle.trim() !== note.title || 
                        editDescription.trim() !== (note.description || '') || 
                        editContent.trim() !== note.content;
      
      unsavedChangesManager.setUnsavedChanges(componentId, hasChanges);
    } else {
      // Clear unsaved changes when not editing
      unsavedChangesManager.setUnsavedChanges(componentId, false);
    }
  }, [mode, editTitle, editDescription, editContent, note?.title, note?.description, note?.content, componentId]);

  // Cleanup: remove from unsaved changes when component unmounts
  useEffect(() => {
    return () => {
      unsavedChangesManager.setUnsavedChanges(componentId, false);
    };
  }, [componentId]);

  // Check lock status when modal opens or note changes, and set up WebSocket listeners
  useEffect(() => {
    if (isOpen && note) {
      checkLockStatus();
      
      // Connect to lock signaling and join project
      lockSignaling.connect();
      lockSignaling.joinProject(projectId);
      
      // Set up WebSocket event listeners for this specific note
      const handleNoteLocked = (data: { noteId: string; lockedBy: { email: string; name: string } }) => {
        if (data.noteId === note.id) {
          setIsLocked(true);
          setLockedBy({ ...data.lockedBy, isCurrentUser: false });
          setLockError(`Note is being edited by ${data.lockedBy.name}`);
        }
      };
      
      const handleNoteUnlocked = (data: { noteId: string }) => {
        if (data.noteId === note.id) {
          setIsLocked(false);
          setLockedBy(null);
          setLockError('');
        }
      };
      
      const handleNoteUpdated = (data: { noteId: string; note: any }) => {
        if (data.noteId === note.id && mode === 'view') {
          // Trigger a refresh of the project data to get the updated note
          window.dispatchEvent(new CustomEvent('refreshProject'));
        }
      };
      
      lockSignaling.on('note-locked', handleNoteLocked);
      lockSignaling.on('note-unlocked', handleNoteUnlocked);
      lockSignaling.on('note-updated', handleNoteUpdated);
      
      return () => {
        lockSignaling.off('note-locked', handleNoteLocked);
        lockSignaling.off('note-unlocked', handleNoteUnlocked);
        lockSignaling.off('note-updated', handleNoteUpdated);
      };
    }
  }, [isOpen, note?.id, mode, projectId]);

  // Start heartbeat when entering edit mode
  useEffect(() => {
    if (mode === 'edit' && note && lockedBy?.isCurrentUser) {
      startHeartbeat();
    } else {
      stopHeartbeat();
    }
    
    return () => stopHeartbeat();
  }, [mode, lockedBy?.isCurrentUser]);

  const checkLockStatus = async () => {
    if (!note) return;
    
    try {
      const lockStatus = await projectAPI.checkNoteLock(projectId, note.id);
      setIsLocked(lockStatus.locked);
      setLockedBy(lockStatus.lockedBy || null);
    } catch (error) {
      console.error('Failed to check lock status:', error);
    }
  };

  const acquireLock = async () => {
    if (!note) return false;
    
    try {
      await projectAPI.lockNote(projectId, note.id);
      setIsLocked(true);
      setLockedBy({ email: '', name: '', isCurrentUser: true }); // Will be updated by checkLockStatus
      setLockError('');
      return true;
    } catch (error: any) {
      if (error.response?.status === 423) {
        setLockError(`Note is being edited by ${error.response.data.lockedBy?.name || 'another user'}`);
        setIsLocked(true);
        setLockedBy(error.response.data.lockedBy);
      } else {
        setLockError('Failed to acquire lock');
      }
      return false;
    }
  };

  const releaseLock = async () => {
    if (!note) return;
    
    try {
      await projectAPI.unlockNote(projectId, note.id);
      setIsLocked(false);
      setLockedBy(null);
      setLockError('');
    } catch (error) {
      console.error('Failed to release lock:', error);
    }
  };

  const startHeartbeat = () => {
    if (heartbeatIntervalRef.current) return;
    
    heartbeatIntervalRef.current = window.setInterval(async () => {
      if (note && mode === 'edit') {
        try {
          await projectAPI.heartbeatNoteLock(projectId, note.id);
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      }
    }, 60000); // Every minute
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  if (!isOpen || !note) return null;

  // Auto-save functionality
  const scheduleAutoSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      if (mode === 'edit' && (editTitle.trim() !== note.title || editDescription.trim() !== (note.description || '') || editContent.trim() !== note.content)) {
        handleSave();
      }
    }, 30000); // 30 seconds
  };

  // Reset auto-save timer on input changes
  const handleInputChange = (field: 'title' | 'description' | 'content', value: string) => {
    if (field === 'title') setEditTitle(value);
    else if (field === 'description') setEditDescription(value);
    else if (field === 'content') setEditContent(value);
    
    // Reset the auto-save timer whenever user types
    scheduleAutoSave();
  };

  const handleEnterEditMode = async () => {
    if (isLocked && !lockedBy?.isCurrentUser) {
      setLockError(`Note is being edited by ${lockedBy?.name || 'another user'}`);
      return;
    }
    
    const lockAcquired = await acquireLock();
    if (lockAcquired) {
      onModeChange('edit');
    }
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
      
      // Track the activity for different field changes
      if (editTitle.trim() !== note.title) {
        await activityTracker.trackUpdate(
          'note',
          note.id,
          'title',
          note.title,
          editTitle.trim(),
          note.title, // resourceName is the old title
          undefined // no fileName for notes
        );
      }
      
      if (editDescription.trim() !== (note.description || '')) {
        await activityTracker.trackUpdate(
          'note',
          note.id,
          'description',
          note.description || '',
          editDescription.trim(),
          note.title, // resourceName
          undefined
        );
      }
      
      if (editContent.trim() !== note.content) {
        await activityTracker.trackUpdate(
          'note',
          note.id,
          'content',
          note.content,
          editContent.trim(),
          note.title, // resourceName
          undefined
        );
      }
      
      // Release lock and switch to view mode
      await releaseLock();
      onModeChange('view');
      onUpdate();
    } catch (error: any) {
      if (error.response?.status === 423) {
        setLockError(`Note is being edited by ${error.response.data.lockedBy?.name || 'another user'}`);
      } else {
        console.error('Failed to update note:', error);
      }
    } finally {
      setLoading(false);
      setTimeout(() => {
        isSavingRef.current = false;
      }, 0);
    }
  };

  const handleDelete = async () => {
    try {
      await projectAPI.deleteNote(projectId, note.id);
      
      // Track note deletion
      await activityTracker.trackDelete(
        'note',
        note.id,
        note.title, // resourceName
        undefined, // no fileName for notes
        { originalTitle: note.title } // metadata
      );
      
      onUpdate();
      onClose();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete note:', error);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancel = async () => {
    const hasChanges = editTitle.trim() !== note.title || 
                      editDescription.trim() !== (note.description || '') || 
                      editContent.trim() !== note.content;
    if (hasChanges) {
      const canProceed = await unsavedChangesManager.checkNavigationAllowed();
      if (!canProceed) return;
    }
    
    isCancelingRef.current = true;
    setEditTitle(note.title);
    setEditDescription(note.description || '');
    setEditContent(note.content);
    
    // Release lock when canceling
    await releaseLock();
    onModeChange('view');
    
    setTimeout(() => {
      isCancelingRef.current = false;
    }, 0);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note.content);
    } catch (error) {
      console.error('Failed to copy note content:', error);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
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
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
    
    // 2. Code blocks (must come before inline code and links)
    processedText = processedText
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-base-200 rounded p-3 my-2 overflow-x-auto"><code class="text-sm font-mono">$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-base-200 px-2 py-1 rounded text-sm font-mono">$1</code>');
    
    // 3. Markdown-style links [text](url) - process before auto-linking
    processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (_, text, url) => {
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
      .replace(/\*\*([^*]+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em class="italic">$1</em>');
    
    // 7. Blockquotes
    processedText = processedText
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 my-2 italic text-base-content/80">$1</blockquote>');
    
    // 8. Lists
    processedText = processedText
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc list-inside">$1</li>')
      .replace(/^\* (.*$)/gm, '<li class="ml-4 list-disc list-inside">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal list-inside">$1</li>');

    // Remove newlines after list items and headers to prevent double spacing
    processedText = processedText.replace(/<\/li>\n/g, '</li>');
    processedText = processedText.replace(/<\/h[1-6]>\n/g, (match) => match.replace('\n', ''));
    
    // 9. Line breaks - preserve single breaks, avoid double spacing with block elements
    processedText = processedText.replace(/\n(?!<\/)/gim, '<br>');
    
    return processedText;
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999]">
      <div className="bg-base-100 w-full h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-base-content truncate">{note.title}</h2>
            {note.description && (
              <p className="text-base-content/70 mt-1">{note.description}</p>
            )}
            <div className="text-sm text-base-content/50 mt-2">
              {note.updatedAt !== note.createdAt && (
                <>Updated: {new Date(note.updatedAt).toLocaleDateString()}{note.updatedBy && ` by ${note.updatedBy}`} • </>
              )}
              {note.createdAt && (
                <>Created: {new Date(note.createdAt).toLocaleDateString()}{note.createdBy && ` by ${note.createdBy}`}</>
              )}
            </div>
          </div>
          
          {/* Side panel with options */}
          <div className="flex items-center gap-2 ml-6 flex-shrink-0">
            {mode === 'edit' ? (
              <>
                <button
                  onClick={handleSave}
                  className="btn btn-primary"
                  disabled={loading || !editTitle.trim() || !editContent.trim()}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="btn btn-ghost"
                  disabled={loading}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCopy}
                  className="btn btn-ghost"
                  title="Copy content (C)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
                <button
                  onClick={handleEnterEditMode}
                  className={`btn ${isLocked && !lockedBy?.isCurrentUser ? 'btn-disabled' : 'btn-ghost'}`}
                  title={isLocked && !lockedBy?.isCurrentUser ? `Being edited by ${lockedBy?.name}` : "Edit note (E)"}
                  disabled={isLocked && !lockedBy?.isCurrentUser}
                >
                  {isLocked && !lockedBy?.isCurrentUser ? (
                    <svg className="w-4 h-4 mr-2 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  )}
                  {isLocked && !lockedBy?.isCurrentUser ? 'Locked' : 'Edit'}
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="btn btn-error btn-outline"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </>
            )}
            <button
              onClick={async () => {
                if (mode === 'edit') {
                  const hasChanges = editTitle.trim() !== note.title || 
                                    editDescription.trim() !== (note.description || '') || 
                                    editContent.trim() !== note.content;
                  if (hasChanges) {
                    const canProceed = await unsavedChangesManager.checkNavigationAllowed();
                    if (!canProceed) return;
                  }
                }
                onClose();
              }}
              className="btn btn-primary gap-2"
              title={mode === 'view' ? "Back (Esc) • E to edit • C to copy" : "Back (Esc) • Ctrl+S to save"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
        </div>

        {/* Lock Error Alert */}
        {lockError && (
          <div className="px-4 py-2 bg-warning/10 border-b border-warning/20">
            <div className="flex items-center gap-2 text-warning">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm font-medium">{lockError}</span>
              <button 
                onClick={() => setLockError('')}
                className="ml-auto btn btn-xs btn-ghost text-warning hover:bg-warning/20"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {mode === 'edit' ? (
            <div className="h-full p-4">
              <div className="space-y-2 h-full flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Title</span>
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="input-field"
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
                      className="input-field"
                      placeholder="Brief description (optional)..."
                    />
                  </div>
                </div>
                
                <div className="form-control flex-1 flex flex-col">
                  <label className="label">
                    <span className="label-text font-medium">Content</span>
                  </label>
                  <div className="flex-1">
                    <EnhancedTextEditor
                      value={editContent}
                      onChange={(value) => handleInputChange('content', value)}
                      placeholder="Enter your note content here... (Markdown supported)"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full p-6 overflow-auto">
              <div 
                className="prose prose-lg max-w-none text-base-content mb-4"
                dangerouslySetInnerHTML={{ 
                  __html: renderMarkdown(note.content) 
                }}
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Note"
        message={`Are you sure you want to delete "<strong>${note.title}</strong>"? This action cannot be undone.`}
        confirmText="Delete Note"
        variant="error"
      />
    </div>
  );

  return createPortal(modalContent, document.body);
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
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      const newNote = await projectAPI.createNote(projectId, {
        title: title.trim(),
        description: description.trim(),
        content: content.trim()
      });
      
      // Track note creation
      await activityTracker.trackCreate(
        'note',
        newNote.note?.id || 'unknown', // use the returned note ID if available
        title.trim(), // resourceName
        undefined, // no fileName for notes
        { 
          hasDescription: !!description.trim(),
          contentLength: content.trim().length
        }
      );
      
      setTitle('');
      setDescription('');
      setContent('');
      setIsExpanded(false);
      onAdd();
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow-lg border-subtle mb-4">
      <input 
        type="checkbox" 
        checked={isExpanded}
        onChange={(e) => setIsExpanded(e.target.checked)}
      />
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
                className="input-field border-base-300"
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
                className="input-field border-base-300"
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
                className="btn-primary-sm"
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
                  className="btn-primary-sm"
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

export { NoteItem, NewNoteForm, NoteModal };