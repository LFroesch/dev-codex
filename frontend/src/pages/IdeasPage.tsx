import React, { useState, useEffect, useRef } from 'react';
import EnhancedTextEditor from '../components/EnhancedTextEditor';
import { unsavedChangesManager } from '../utils/unsavedChanges';

interface Idea {
  id: string;
  title: string;
  description?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const IdeasPage: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedIdeas, setExpandedIdeas] = useState<Set<string>>(new Set());

  const loadIdeas = async () => {
    try {
      // For now, store ideas in localStorage until backend support is added
      const savedIdeas = localStorage.getItem('userIdeas');
      if (savedIdeas) {
        setIdeas(JSON.parse(savedIdeas));
      }
    } catch (err) {
      console.error('Failed to load ideas:', err);
      setError('Failed to load ideas');
    } finally {
      setLoading(false);
    }
  };

  const saveIdeas = (updatedIdeas: Idea[]) => {
    localStorage.setItem('userIdeas', JSON.stringify(updatedIdeas));
    setIdeas(updatedIdeas);
  };

  useEffect(() => {
    loadIdeas();
  }, []);

  const handleCreateIdea = (title: string, description: string, content: string) => {
    const newIdea: Idea = {
      id: Date.now().toString(),
      title,
      description,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedIdeas = [newIdea, ...ideas];
    saveIdeas(updatedIdeas);
  };

  const handleUpdateIdea = (ideaId: string, title: string, description: string, content: string) => {
    const updatedIdeas = ideas.map(idea =>
      idea.id === ideaId
        ? { ...idea, title, description, content, updatedAt: new Date().toISOString() }
        : idea
    );
    saveIdeas(updatedIdeas);
  };

  const handleDeleteIdea = (ideaId: string) => {
    const updatedIdeas = ideas.filter(idea => idea.id !== ideaId);
    saveIdeas(updatedIdeas);
  };

  const toggleIdeaExpanded = (ideaId: string) => {
    const newExpanded = new Set(expandedIdeas);
    if (newExpanded.has(ideaId)) {
      newExpanded.delete(ideaId);
    } else {
      newExpanded.add(ideaId);
    }
    setExpandedIdeas(newExpanded);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Ideas Section */}
      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
          Ideas ({ideas.length})
        </div>
        <div className="collapse-content">
          <div className="pt-4">
            <NewIdeaForm onAdd={handleCreateIdea} />
            
            <div className="space-y-3">
              {ideas.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">💡</div>
                  <p className="text-base-content/60">No ideas yet. Create one above!</p>
                </div>
              ) : (
                ideas
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((idea) => (
                    <IdeaItem
                      key={idea.id}
                      idea={idea}
                      onUpdate={handleUpdateIdea}
                      onDelete={handleDeleteIdea}
                      isExpanded={expandedIdeas.has(idea.id)}
                      onToggleExpand={() => toggleIdeaExpanded(idea.id)}
                    />
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface IdeaItemProps {
  idea: Idea;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (ideaId: string, title: string, description: string, content: string) => void;
  onDelete: (ideaId: string) => void;
}

const IdeaItem: React.FC<IdeaItemProps> = ({
  idea,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(idea.title);
  const [editDescription, setEditDescription] = useState(idea.description || '');
  const [editContent, setEditContent] = useState(idea.content);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Create unique component ID for unsaved changes tracking
  const componentId = `idea-${idea.id}`;
  
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const editingContainerRef = useRef<HTMLDivElement>(null);
  const isCancelingRef = useRef(false);
  const isSavingRef = useRef(false);

  // Reset form when idea changes or editing is cancelled
  React.useEffect(() => {
    setEditTitle(idea.title);
    setEditDescription(idea.description || '');
    setEditContent(idea.content);
  }, [idea.title, idea.description, idea.content]);

  // Track unsaved changes and register with the manager
  React.useEffect(() => {
    if (isEditing) {
      const hasChanges = editTitle.trim() !== idea.title || 
                        editDescription.trim() !== (idea.description || '') || 
                        editContent.trim() !== idea.content;
      
      unsavedChangesManager.setUnsavedChanges(componentId, hasChanges);
    } else {
      // Clear unsaved changes when not editing
      unsavedChangesManager.setUnsavedChanges(componentId, false);
    }
  }, [isEditing, editTitle, editDescription, editContent, idea.title, idea.description, idea.content, componentId]);

  // Cleanup: remove from unsaved changes when component unmounts
  React.useEffect(() => {
    return () => {
      unsavedChangesManager.setUnsavedChanges(componentId, false);
    };
  }, [componentId]);

  // Auto-save functionality
  const scheduleAutoSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      if (isEditing && (editTitle.trim() !== idea.title || editDescription.trim() !== (idea.description || '') || editContent.trim() !== idea.content)) {
        handleSave();
      }
    }, 30000); // 30 seconds
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
        if (editTitle.trim() !== idea.title || editDescription.trim() !== (idea.description || '') || editContent.trim() !== idea.content) {
          event.preventDefault();
          // Changes will now be handled by the global unsaved changes manager
          // Just prevent the click from proceeding - navigation blocking will handle the rest
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
  }, [isEditing, editTitle, editDescription, editContent, idea.title, idea.description, idea.content]);

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
      onUpdate(idea.id, editTitle.trim(), editDescription.trim(), editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update idea:', error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        isSavingRef.current = false;
      }, 0);
    }
  };

  const handleDelete = async () => {
    try {
      onDelete(idea.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete idea:', error);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancel = () => {
    isCancelingRef.current = true;
    setEditTitle(idea.title);
    setEditDescription(idea.description || '');
    setEditContent(idea.content);
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
    setShowDeleteConfirm(true);
  };

  // Enhanced markdown to HTML converter (same as NoteItem)
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
              <h3 className="font-semibold text-lg">{idea.title}</h3>
              {idea.description && (
                <p className="text-sm text-base-content/70">{idea.description}</p>
              )}
              <div className="text-xs text-base-content/50 mt-1">
                {idea.updatedAt !== idea.createdAt && (
                  <>Updated: {new Date(idea.updatedAt).toLocaleDateString()} • </>
                )}
                {idea.createdAt && (
                  <>Created: {new Date(idea.createdAt).toLocaleDateString()}</>
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
                      placeholder="Idea title..."
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
                    placeholder="Enter your idea content here... (Markdown supported)"
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
                    __html: renderMarkdown(idea.content) 
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-error/10 rounded-full">
              <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-center mb-4">Delete Idea</h3>
            
            <p className="text-center text-base-content/70 mb-6">
              Are you sure you want to delete "<strong>{idea.title}</strong>"? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button 
                className="btn btn-ghost flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-error flex-1"
                onClick={handleDelete}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Idea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface NewIdeaFormProps {
  onAdd: (title: string, description: string, content: string) => void;
}

const NewIdeaForm: React.FC<NewIdeaFormProps> = ({ onAdd }) => {
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
      onAdd(title.trim(), description.trim(), content.trim());
      setTitle('');
      setDescription('');
      setContent('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Failed to create idea:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10 mb-4">
      <input 
        type="checkbox" 
        checked={isExpanded}
        onChange={(e) => setIsExpanded(e.target.checked)}
      />
      <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
        Create New Idea
      </div>
      
      <div className="collapse-content">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Idea Title</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input input-bordered border-base-300"
                placeholder="Enter idea title..."
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
                <span className="label-text font-medium">Idea Content</span>
              </label>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={loading || !title.trim() || !content.trim()}
              >
                {loading ? 'Adding...' : 'Add Idea'}
              </button>
            </div>
            <div className="space-y-2">
              <EnhancedTextEditor
                value={content}
                onChange={setContent}
                placeholder="Enter your idea content here... (Markdown supported)"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={loading || !title.trim() || !content.trim()}
                >
                  {loading ? 'Adding...' : 'Add Idea'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IdeasPage;