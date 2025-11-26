import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/base';

interface PostComposerProps {
  postType: 'profile' | 'project';
  projectId?: string;
  onPostCreated?: (post: any) => void;
}

const PostComposer: React.FC<PostComposerProps> = ({ postType, projectId, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [linkedProjectId, setLinkedProjectId] = useState<string>('');
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  useEffect(() => {
    if (showProjectPicker && availableProjects.length === 0) {
      fetchProjects();
    }
  }, [showProjectPicker]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await apiClient.get('/projects');
      if (response.data.projects) {
        // Filter to only public projects or own projects
        const publicProjects = response.data.projects.filter((p: any) => p.isPublic);
        setAvailableProjects(publicProjects);
      }
    } catch (err) {
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Please write something');
      return;
    }

    if (content.length > 2000) {
      setError('Post is too long (max 2000 characters)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/posts', {
        content: content.trim(),
        postType,
        projectId,
        linkedProjectId: linkedProjectId || undefined,
        visibility
      });

      if (response.data.success) {
        setContent('');
        setVisibility('public');
        setLinkedProjectId('');
        setShowProjectPicker(false);
        if (onPostCreated) {
          onPostCreated(response.data.post);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 border-2 border-base-content/20 shadow-sm border-thick">
      <div className="card-body p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            className="textarea textarea-bordered w-full border-thick"
            rows={3}
            placeholder={postType === 'project' ? "Share a project update..." : "What's on your mind?"}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            disabled={loading}
          />

          {error && (
            <div className="alert alert-error py-2 border-thick">
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Project Picker */}
          {showProjectPicker && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Link a project:</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    setShowProjectPicker(false);
                    setLinkedProjectId('');
                  }}
                >
                  ✕
                </button>
              </div>
              {loadingProjects ? (
                <div className="flex justify-center py-2">
                  <span className="loading loading-spinner loading-sm"></span>
                </div>
              ) : (
                <select
                  className="select select-bordered select-sm w-full border-thick"
                  value={linkedProjectId}
                  onChange={(e) => setLinkedProjectId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select a project...</option>
                  {availableProjects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} {proj.category ? `(${proj.category})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Selected Project Display */}
          {linkedProjectId && !showProjectPicker && (
            <div className="flex items-center gap-2 p-2 bg-base-200 rounded-lg border-2 border-base-content/20">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-sm flex-1">
                {availableProjects.find(p => p.id === linkedProjectId)?.name || 'Project linked'}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setLinkedProjectId('');
                  setShowProjectPicker(false);
                }}
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!linkedProjectId && !showProjectPicker && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs gap-1"
                  onClick={() => setShowProjectPicker(true)}
                  disabled={loading}
                  title="Link a project"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Project
                </button>
              )}
              <span className="text-xs text-base-content/60">{content.length}/2000</span>
              {postType === 'profile' && (
                <select
                  className="select select-bordered select-xs border-thick"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  disabled={loading}
                >
                  <option value="public">Public</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Private</option>
                </select>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-sm border-thick"
              disabled={loading || !content.trim()}
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Post
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostComposer;
