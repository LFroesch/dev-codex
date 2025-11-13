import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Note, projectAPI } from '../api';
import EnhancedTextEditor from './EnhancedTextEditor';
import ConfirmationModal from './ConfirmationModal';
import { unsavedChangesManager } from '../utils/unsavedChanges';
import activityTracker from '../services/activityTracker';
import { lockSignaling } from '../services/lockSignaling';
import { toast } from '../services/toast';

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
  project?: any; // Project with permission info
  type?: 'note' | 'devlog'; // Add type to distinguish between notes and dev logs
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
      toast.success('Note deleted successfully!');
    } catch (error) {
      console.error('Failed to delete note:', error);
      setShowDeleteConfirm(false);
      toast.error('Failed to delete note. Please try again.');
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
      toast.success('Note content copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard.');
      console.error('Failed to copy note content:', error);
    }
  };

  return (
    <>
      <div 
        className="bg-base-100 shadow-lg border-2 rounded-lg p-3 sm:p-4 cursor-pointer hover:shadow-xl transition-shadow duration-200 group"
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
                <>Updated: {new Date(note.updatedAt).toLocaleDateString()}{note.updatedBy && ` by ${typeof note.updatedBy === 'object' ? `${note.updatedBy.firstName} ${note.updatedBy.lastName}` : note.updatedBy}`} • </>
              )}
              {note.createdAt && (
                <>Created: {new Date(note.createdAt).toLocaleDateString()}{note.createdBy && ` by ${typeof note.createdBy === 'object' ? `${note.createdBy.firstName} ${note.createdBy.lastName}` : note.createdBy}`}</>
              )}
            </div>
          </div>
          
          <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="btn btn-xs btn-ghost "
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
  onModeChange,
  project,
  type = 'note'
}) => {
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
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
          // In edit mode, Escape checks for changes and prompts to save
          const hasChanges = editTitle.trim() !== note.title || 
                            editDescription.trim() !== (note.description || '') || 
                            editContent.trim() !== note.content;
          if (hasChanges) {
            // Show save confirmation modal
            setShowSaveConfirm(true);
          } else {
            // No changes, just go back to view mode
            onModeChange('view');
          }
        } else {
          // In view mode, Escape closes the modal
          onClose();
        }
      } else if (e.key === 'e' && mode === 'view') {
        await handleEnterEditMode();
      } else if (e.key === 'c' && mode === 'view' && !e.ctrlKey && !e.metaKey) {
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
      clearAutoSave(); // Clear auto-save timeout on unmount
    };
  }, [componentId]);

  // Check lock status when modal opens or note changes, and set up WebSocket listeners
  useEffect(() => {
    if (isOpen && note) {
      checkLockStatus();
      
      // Only set up WebSocket for notes, not dev logs
      if (type === 'note') {
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
    }
  }, [isOpen, note?.id, mode, projectId, type]);

  // Start heartbeat when entering edit mode
  useEffect(() => {
    if (mode === 'edit' && note && lockedBy?.isCurrentUser) {
      startHeartbeat();
    } else {
      stopHeartbeat();
      clearAutoSave(); // Clear auto-save timeout when leaving edit mode
    }
    
    return () => {
      stopHeartbeat();
      clearAutoSave();
    };
  }, [mode, lockedBy?.isCurrentUser]);

  const checkLockStatus = async () => {
    if (!note || type === 'devlog') return; // Skip locking for dev logs for now
    
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
    
    // Skip locking for dev logs for now
    if (type === 'devlog') {
      setIsLocked(false);
      setLockedBy(null);
      setLockError('');
      return true;
    }
    
    try {
      await projectAPI.lockNote(projectId, note.id);
      setIsLocked(true);
      setLockedBy({ email: '', name: '', isCurrentUser: true }); // Will be updated by checkLockStatus
      setLockError('');
      return true;
    } catch (error: any) {
      // At this point, type can only be 'note' since we returned early for 'devlog'
      if (error.response?.status === 423) {
        setLockError(`Note is being edited by ${error.response.data.lockedBy?.name || 'another user'}`);
        setIsLocked(true);
        setLockedBy(error.response.data.lockedBy);
        toast.warning(`Note is currently being edited by ${error.response.data.lockedBy?.name || 'another user'}`, 4000);
      } else if (error.response?.status === 403) {
        const errorData = error.response?.data;
        if (errorData?.isLocked) {
          toast.error(errorData.message || 'This project is locked and cannot be edited', 5000);
        } else {
          toast.error('You do not have permission to edit this note', 5000);
        }
      } else if (error.response?.status === 401) {
        toast.error('You need to be logged in to edit notes', 5000);
      } else {
        setLockError('Failed to acquire lock');
        toast.error('Failed to start editing. Please try again.', 4000);
      }
      return false;
    }
  };

  const releaseLock = async () => {
    if (!note || type === 'devlog') return; // Skip locking for dev logs for now
    
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
    if (heartbeatIntervalRef.current || type === 'devlog') return; // Skip heartbeat for dev logs
    
    heartbeatIntervalRef.current = window.setInterval(async () => {
      if (note && mode === 'edit' && type === 'note') {
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

  // Clear auto-save timeout
  const clearAutoSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  };

  if (!isOpen || !note) return null;

  // Auto-save functionality
  const scheduleAutoSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      // Additional safety checks to prevent stale auto-saves
      if (mode === 'edit' && 
          isOpen && 
          note && 
          !isSavingRef.current && 
          !isCancelingRef.current &&
          (editTitle.trim() !== note.title || editDescription.trim() !== (note.description || '') || editContent.trim() !== note.content)) {
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
    // Check permissions first
    if (project && project.canEdit === false) {
      if (project.isLocked) {
        toast.error(project.lockedReason || 'This project is locked and cannot be edited', 5000);
      } else if (project.userRole === 'viewer') {
        toast.error(`You need editor access to edit ${type}s in this project`, 5000);
      } else {
        toast.error(`You do not have permission to edit this ${type}`, 5000);
      }
      return;
    }
    
    if (isLocked && !lockedBy?.isCurrentUser) {
      setLockError(`${type === 'devlog' ? 'Dev log entry' : 'Note'} is being edited by ${lockedBy?.name || 'another user'}`);
      return;
    }
    
    const lockAcquired = await acquireLock();
    if (lockAcquired) {
      onModeChange('edit');
    }
  };

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;

    // Check permissions before saving
    if (project && project.canEdit === false) {
      if (project.isLocked) {
        toast.error(project.lockedReason || 'This project is locked and cannot be edited', 5000);
      } else if (project.userRole === 'viewer') {
        toast.error(`You need editor access to save changes to ${type}s`, 5000);
      } else {
        toast.error(`You do not have permission to save changes to this ${type}`, 5000);
      }
      return;
    }

    isSavingRef.current = true;
    setLoading(true);
    try {
      if (type === 'devlog') {
        await projectAPI.updateDevLogEntry(projectId, note.id, {
          title: editTitle.trim(),
          description: editContent.trim() // For dev logs, content goes to description field
        });
      } else {
        await projectAPI.updateNote(projectId, note.id, {
          title: editTitle.trim(),
          description: editDescription.trim(),
          content: editContent.trim()
        });
      }
      
      // Track the activity for different field changes
      if (editTitle.trim() !== note.title) {
        await activityTracker.trackUpdate(
          type,
          note.id,
          'title',
          note.title,
          editTitle.trim(),
          note.title, // resourceName is the old title
          undefined // no fileName for notes/devlogs
        );
      }
      
      if (type === 'note' && editDescription.trim() !== (note.description || '')) {
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
          type,
          note.id,
          type === 'devlog' ? 'description' : 'content',
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
      toast.success(`${type === 'devlog' ? 'Dev log entry' : 'Note'} saved successfully!`);
    } catch (error: any) {
      if (error.response?.status === 423) {
        setLockError(`${type === 'devlog' ? 'Dev log entry' : 'Note'} is being edited by ${error.response.data.lockedBy?.name || 'another user'}`);
      } else if (error.response?.status === 403) {
        const errorData = error.response?.data;
        if (errorData?.isLocked) {
          toast.error(errorData.message || 'This project is locked and cannot be edited', 5000);
        } else {
          toast.error(`You do not have permission to edit this ${type}`, 5000);
        }
      } else if (error.response?.status === 401) {
        toast.error(`You need to be logged in to edit ${type}s`, 5000);
      } else {
        console.error(`Failed to update ${type}:`, error);
        toast.error(`Failed to save ${type}. Please try again.`, 5000);
      }
    } finally {
      setLoading(false);
      clearAutoSave(); // Clear auto-save timeout after manual save
      setTimeout(() => {
        isSavingRef.current = false;
      }, 0);
    }
  };

  const handleDelete = async () => {
    try {
      if (type === 'devlog') {
        await projectAPI.deleteDevLogEntry(projectId, note.id);
      } else {
        await projectAPI.deleteNote(projectId, note.id);
      }
      
      // Track deletion
      await activityTracker.trackDelete(
        type,
        note.id,
        note.title, // resourceName
        undefined, // no fileName for notes/devlogs
        { originalTitle: note.title } // metadata
      );
      
      onUpdate();
      onClose();
      setShowDeleteConfirm(false);
      toast.success(`${type === 'devlog' ? 'Dev log entry' : 'Note'} deleted successfully!`);
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error);
      setShowDeleteConfirm(false);
      toast.error(`Failed to delete ${type}. Please try again.`);
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
    clearAutoSave(); // Clear auto-save timeout when canceling
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

  const handleSaveAndExit = async () => {
    setShowSaveConfirm(false);
    await handleSave();
  };

  const handleDiscardAndExit = async () => {
    setShowSaveConfirm(false);
    
    // Directly discard changes without showing another confirmation
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

  const handleCancelSavePrompt = () => {
    setShowSaveConfirm(false);
    // Stay in edit mode
  };

  const handleCancelClick = () => {
    // Check for unsaved changes
    const hasChanges = editTitle.trim() !== note.title || 
                      editDescription.trim() !== (note.description || '') || 
                      editContent.trim() !== note.content;
    
    if (hasChanges) {
      // Show save confirmation modal
      setShowSaveConfirm(true);
    } else {
      // No changes, just cancel normally
      handleCancel();
    }
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
        <div className="p-3 sm:p-4 border-b border-base-300 flex-shrink-0">
          <div className="flex-1 min-w-0 w-full mb-3">
            <h2 className="text-lg sm:text-2xl font-bold text-base-content truncate">{note.title}</h2>
            {note.description && (
              <p className="text-base-content/70 mt-1">{note.description}</p>
            )}
            <div className="text-sm text-base-content/50 mt-2">
              {note.updatedAt !== note.createdAt && (
                <>Updated: {new Date(note.updatedAt).toLocaleDateString()}{note.updatedBy && ` by ${typeof note.updatedBy === 'object' ? `${note.updatedBy.firstName} ${note.updatedBy.lastName}` : note.updatedBy}`} • </>
              )}
              {note.createdAt && (
                <>Created: {new Date(note.createdAt).toLocaleDateString()}{note.createdBy && ` by ${typeof note.createdBy === 'object' ? `${note.createdBy.firstName} ${note.createdBy.lastName}` : note.createdBy}`}</>
              )}
            </div>
          </div>
          
          {/* Action buttons - All aligned together */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end w-full gap-1 sm:gap-2">
            {mode === 'edit' ? (
              <>
                <button
                  onClick={handleSave}
                  className="border-thick btn btn-primary btn-xs sm:btn-sm"
                  title="Save (Ctrl+S)"
                  disabled={loading || !editTitle.trim() || !editContent.trim()}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="hidden sm:inline">{loading ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={handleCancelClick}
                  className="border-thick btn btn-primary btn-xs sm:btn-sm"
                  disabled={loading}
                >
                  <span className="hidden sm:inline">Cancel</span>
                  <span className="sm:hidden">✕</span>
                </button>
                <button
                  onClick={async () => {
                    if (mode === 'edit') {
                      // In edit mode, check for unsaved changes before closing
                      const hasChanges = editTitle.trim() !== note.title || 
                                        editDescription.trim() !== (note.description || '') || 
                                        editContent.trim() !== note.content;
                      if (hasChanges) {
                        // Show save confirmation modal instead of using unsavedChangesManager
                        setShowSaveConfirm(true);
                        return;
                      }
                      // No changes, release lock and close
                      await releaseLock();
                    }
                    // In view mode, just close directly
                    onClose();
                  }}
                  className="border-thick btn btn-primary btn-xs sm:btn-sm gap-1 sm:gap-2"
                  title="Back (Esc)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Back</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCopy}
                  className="border-thick btn btn-primary btn-xs sm:btn-sm"
                  title="Copy content (C)"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Copy</span>
                </button>
                <button
                  onClick={handleEnterEditMode}
                  className={`border-thick btn btn-xs sm:btn-sm ${
                    (isLocked && !lockedBy?.isCurrentUser) || (project && project.canEdit === false) 
                      ? 'btn-disabled' 
                      : 'btn-primary'
                  }`}
                  title={
                    project && project.canEdit === false 
                      ? (project.userRole === 'viewer' ? `You need editor access to edit ${type}s` : 'No edit permission')
                      : isLocked && !lockedBy?.isCurrentUser 
                        ? `Being edited by ${lockedBy?.name}` 
                        : `Edit ${type} (E)`
                  }
                  disabled={(isLocked && !lockedBy?.isCurrentUser) || (project && project.canEdit === false)}
                >
                  {project && project.canEdit === false ? (
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                    </svg>
                  ) : isLocked && !lockedBy?.isCurrentUser ? (
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">
                    {project && project.canEdit === false 
                      ? 'No Access' 
                      : isLocked && !lockedBy?.isCurrentUser 
                        ? 'Locked' 
                        : 'Edit'
                    }
                  </span>
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="border-thick btn btn-primary btn-xs sm:btn-sm"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Delete</span>
                </button>
                <button
                  onClick={onClose}
                  className="border-thick btn btn-primary btn-xs sm:btn-sm"
                  title="Back (Esc)"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Back</span>
                </button>
              </>
            )}
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
            <div className="h-full p-3 sm:p-4">
              <div className="space-y-2 h-full flex flex-col">
                <div className={`grid gap-4 flex-shrink-0 ${type === 'devlog' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Title</span>
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="input-field"
                      placeholder={`${type === 'devlog' ? 'Dev log entry' : 'Note'} title...`}
                      required
                    />
                  </div>
                  {type === 'note' && (
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
                  )}
                </div>
                
                <div className="form-control flex-1 flex flex-col">
                  <label className="label">
                    <span className="label-text font-medium">{type === 'devlog' ? 'Description' : 'Content'}</span>
                  </label>
                  <div className="flex-1">
                    <EnhancedTextEditor
                      value={editContent}
                      onChange={(value) => handleInputChange('content', value)}
                      placeholder={`${type === 'devlog' ? 'Describe your development progress...' : 'Enter your note content here...'} (Markdown supported)`}
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
        title={`Delete ${type === 'devlog' ? 'Dev Log Entry' : 'Note'}`}
        message={`Are you sure you want to delete "<strong>${note.title}</strong>"? This action cannot be undone.`}
        confirmText={`Delete ${type === 'devlog' ? 'Entry' : 'Note'}`}
        variant="error"
      />

      {/* Save Confirmation Modal */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-warning/10 rounded-full">
              <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-center mb-4">Unsaved Changes</h3>
            
            <div className="text-center text-base-content/70 mb-6">
              You have unsaved changes. What would you like to do?
            </div>

            <div className="flex flex-col gap-3">
              <button 
                className="btn btn-primary"
                onClick={handleSaveAndExit}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save & Exit'}
              </button>
              <button 
                className="btn btn-error btn-outline"
                onClick={handleDiscardAndExit}
                disabled={loading}
              >
                Discard Changes
              </button>
              <button 
                className="btn btn-ghost"
                onClick={handleCancelSavePrompt}
                disabled={loading}
              >
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}
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
      toast.success('Note created successfully!');
    } catch (error) {
      console.error('Failed to create note:', error);
      toast.error('Failed to create note. Please try again.');
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
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="textarea textarea-bordered border-base-300 w-full"
                placeholder="Enter your note content here... (Markdown supported)"
                rows={4}
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