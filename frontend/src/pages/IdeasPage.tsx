import React, { useState, useEffect } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';
import { ideasAPI, type Idea } from '../api/ideas';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface IdeasPageProps {
  onIdeasCountChange?: (count: number) => void;
}

const IdeasPage: React.FC<IdeasPageProps> = ({ onIdeasCountChange }) => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

  const loadIdeas = async () => {
    try {
      const response = await ideasAPI.getAll();
      setIdeas(response.ideas);
      onIdeasCountChange?.(response.ideas.length);
    } catch (err) {
      console.error('Failed to load ideas:', err);
      setError('Failed to load ideas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdeas();
  }, []);

  // Effect to update selectedIdea when ideas data changes
  useEffect(() => {
    if (selectedIdea && ideas.length > 0 && isModalOpen) {
      const updatedIdea = ideas.find(idea => idea.id === selectedIdea.id);
      if (updatedIdea) {
        setSelectedIdea(updatedIdea);
      }
    }
  }, [ideas, selectedIdea?.id, isModalOpen]);

  const handleCreateIdea = async (title: string, description: string, content: string) => {
    try {
      const response = await ideasAPI.create({ title, description, content });
      setIdeas(prevIdeas => {
        const newIdeas = [response.idea, ...prevIdeas];
        onIdeasCountChange?.(newIdeas.length);
        return newIdeas;
      });
    } catch (err) {
      console.error('Failed to create idea:', err);
      setError('Failed to create idea');
    }
  };

  const handleUpdateIdea = async () => {
    // Refresh the ideas data first
    await loadIdeas();
  };

  const handleDeleteIdea = async (ideaId: string) => {
    try {
      await ideasAPI.deleteIdea(ideaId);
      setIdeas(prevIdeas => {
        const newIdeas = prevIdeas.filter(idea => idea.id !== ideaId);
        onIdeasCountChange?.(newIdeas.length);
        return newIdeas;
      });
    } catch (err) {
      console.error('Failed to delete idea:', err);
      setError('Failed to delete idea');
    }
  };

  const handleIdeaClick = (idea: Idea) => {
    setSelectedIdea(idea);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIdea(null);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Create New Idea Form */}
      <NewIdeaForm onAdd={handleCreateIdea} />

      {/* Ideas Grid */}
      {ideas.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2 text-base-content/80">No ideas yet</h3>
          <p className="text-sm text-base-content/60">Create your first idea to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ideas
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .map((idea) => (
              <div
                key={idea.id}
                className="card-interactive group cursor-pointer h-36 flex flex-col"
                onClick={() => handleIdeaClick(idea)}
              >
                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-base-content truncate px-2 py-1 rounded-md bg-primary inline-block w-fit border-thick"
                      style={{ color: getContrastTextColor() }}>
                      {idea.title}
                    </h3>
                  </div>

                  {idea.description && (
                    <p className="text-sm text-base-content/70 mb-2 line-clamp-2 flex-1">
                      {idea.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-base-content/50 pt-2 mt-auto">
                    <span>Created {new Date(idea.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>Idea</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Idea Modal */}
      {selectedIdea && (
        <IdeaModal
          idea={selectedIdea}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onUpdate={handleUpdateIdea}
          onDelete={handleDeleteIdea}
          mode={modalMode}
          onModeChange={setModalMode}
        />
      )}
    </div>
  );
};

interface NewIdeaFormProps {
  onAdd: (title: string, description: string, content: string) => void;
}

const NewIdeaForm: React.FC<NewIdeaFormProps> = ({ onAdd }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      onAdd(title.trim(), description.trim(), content.trim());
      setTitle('');
      setDescription('');
      setContent('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create idea:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-base-content/20 rounded-lg mb-4">
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-base-200/40 transition-colors rounded-lg"
        >
          <div className="w-8 h-8 bg-success/50 border-thick rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-base-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <span className="text-base-content/60">Create a new idea...</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm text-base-content/70">New Idea</h4>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setTitle('');
                setDescription('');
                setContent('');
              }}
              className="text-base-content/40 hover:text-base-content/60 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input input-bordered input-sm text-base-content/40 w-full"
            placeholder="What's your idea?"
            required
            autoFocus
          />

          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input input-bordered input-sm text-base-content/40 w-full"
            placeholder="Brief description (optional)..."
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="textarea textarea-bordered textarea-sm w-full"
            placeholder="Describe your idea in detail... (Markdown supported)"
            rows={3}
            required
          />

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ color: getContrastTextColor('primary') }}
              disabled={loading || !title.trim() || !content.trim()}
            >
              {loading ? 'Creating...' : 'Create Idea'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setTitle('');
                setDescription('');
                setContent('');
              }}
              className="btn btn-ghost btn-sm"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

interface IdeaModalProps {
  idea: Idea;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (ideaId: string) => void;
  mode: 'view' | 'edit';
  onModeChange: (mode: 'view' | 'edit') => void;
}

const IdeaModal: React.FC<IdeaModalProps> = ({
  idea,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  mode,
  onModeChange
}) => {
  const [editTitle, setEditTitle] = useState(idea.title);
  const [editDescription, setEditDescription] = useState(idea.description || '');
  const [editContent, setEditContent] = useState(idea.content);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset form when idea changes
  useEffect(() => {
    setEditTitle(idea.title);
    setEditDescription(idea.description || '');
    setEditContent(idea.content);
  }, [idea]);

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;

    setLoading(true);
    try {
      await ideasAPI.update(idea.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        content: editContent.trim()
      });
      onModeChange('view');
      onUpdate();
    } catch (error) {
      console.error('Failed to update idea:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    onDelete(idea.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const renderMarkdown = (text: string): string => {
    if (!text) return '<p class="text-base-content/60 italic">No content...</p>';
    
    let processedText = text;
    
    // Basic markdown processing (simplified)
    processedText = processedText
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-base-200 rounded p-3 my-2 overflow-x-auto"><code class="text-sm font-mono">$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-base-200 px-2 py-1 rounded text-sm font-mono">$1</code>')
      // Bold and Italic
      .replace(/\*\*([^*]+)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/\*([^*]+)\*/gim, '<em class="italic">$1</em>')
      // Lists
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc list-inside">$1</li>')
      .replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc list-inside">$1</li>')
      // Line breaks
      .replace(/\n/gim, '<br>');
    
    return processedText;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-200">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h2 className="text-xl font-semibold">
              {mode === 'edit' ? 'Edit Idea' : 'Idea Details'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'view' && (
              <>
                <button
                  onClick={() => onModeChange('edit')}
                  className="btn btn-ghost btn-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-ghost btn-sm text-error"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </>
            )}
            <button onClick={onClose} className="btn btn-ghost btn-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {mode === 'edit' ? (
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Title</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input input-bordered"
                  placeholder="Idea title..."
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Description</span>
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="input input-bordered"
                  placeholder="Brief description (optional)..."
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Content</span>
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="textarea textarea-bordered"
                  rows={10}
                  placeholder="Describe your idea in detail... (Markdown supported)"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => onModeChange('view')}
                  className="btn btn-ghost"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn btn-primary"
                  style={{ color: getContrastTextColor('primary') }}
                  disabled={loading || !editTitle.trim() || !editContent.trim()}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold mb-2 px-2 py-1 rounded-md bg-base-300 inline-block w-fit">{idea.title}</h1>
                {idea.description && (
                  <p className="text-base-content/70 mt-2">{idea.description}</p>
                )}
              </div>

              <div className="text-xs text-base-content/50 border-b border-base-200 pb-2">
                Created: {new Date(idea.createdAt).toLocaleString()}
                {idea.updatedAt !== idea.createdAt && (
                  <> • Updated: {new Date(idea.updatedAt).toLocaleString()}</>
                )}
              </div>

              <div
                className="prose prose-sm max-w-none text-base-content bg-base-50 rounded-lg p-4"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(idea.content)
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
        title="Delete Idea"
        message={`Are you sure you want to delete "${idea.title}"?`}
        confirmText="Delete"
        variant="error"
      />
    </div>
  );
};

export default IdeasPage;