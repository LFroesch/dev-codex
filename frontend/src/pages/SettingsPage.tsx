import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Project, projectAPI } from '../api/client';
import ExportSection from '../components/ExportSection';

interface ContextType {
  selectedProject: Project | null;
  onProjectUpdate: (projectId: string, updatedData: any) => Promise<any>;
  onProjectArchive: (projectId: string, isArchived: boolean) => Promise<void>;
  onProjectDelete: (projectId: string) => Promise<void>;
  onProjectRefresh: () => Promise<void>;
}

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject, onProjectUpdate, onProjectArchive, onProjectDelete, onProjectRefresh } = useOutletContext<ContextType>();
  
  // Edit states
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  
  // Form data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stagingEnvironment, setStagingEnvironment] = useState<'development' | 'staging' | 'production'>('development');
  const [color, setColor] = useState('#3B82F6');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newLink, setNewLink] = useState({ title: '', url: '', type: 'other' as 'github' | 'demo' | 'docs' | 'other' });
  const [editLinkData, setEditLinkData] = useState({ title: '', url: '', type: 'other' as 'github' | 'demo' | 'docs' | 'other' });
  
  // Loading states
  const [savingBasic, setSavingBasic] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [updatingLink, setUpdatingLink] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedProject) {
      setName(selectedProject.name || '');
      setDescription(selectedProject.description || '');
      setStagingEnvironment(selectedProject.stagingEnvironment || 'development');
      setColor(selectedProject.color || '#3B82F6');
      setCategory(selectedProject.category || 'general');
      setTags(selectedProject.tags || []);
    }
  }, [selectedProject]);

  const handleSaveBasic = async () => {
    if (!selectedProject) return;

    setSavingBasic(true);
    setError('');

    try {
      await onProjectUpdate(selectedProject.id, {
        name: name.trim(),
        description: description.trim(),
      });
      setIsEditingBasic(false);
    } catch (err) {
      setError('Failed to save basic settings');
    } finally {
      setSavingBasic(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!selectedProject) return;

    setSavingMetadata(true);
    setError('');

    try {
      await onProjectUpdate(selectedProject.id, {
        stagingEnvironment,
        color,
        category,
        tags
      });
      setIsEditingMetadata(false);
    } catch (err) {
      setError('Failed to save metadata');
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddLink = async () => {
    if (!selectedProject || !newLink.title.trim() || !newLink.url.trim()) return;

    setAddingLink(true);
    setError('');

    try {
      await projectAPI.createLink(selectedProject.id, newLink);
      setNewLink({ title: '', url: '', type: 'other' });
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to add link');
    } finally {
      setAddingLink(false);
    }
  };

  const handleEditLink = (link: any) => {
    setEditingLinkId(link.id);
    setEditLinkData({
      title: link.title,
      url: link.url,
      type: link.type
    });
  };

  const handleUpdateLink = async () => {
    if (!selectedProject || !editingLinkId) return;

    setUpdatingLink(true);
    setError('');

    try {
      await projectAPI.updateLink(selectedProject.id, editingLinkId, editLinkData);
      setEditingLinkId(null);
      setEditLinkData({ title: '', url: '', type: 'other' });
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to update link');
    } finally {
      setUpdatingLink(false);
    }
  };

  const handleCancelEditLink = () => {
    setEditingLinkId(null);
    setEditLinkData({ title: '', url: '', type: 'other' });
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!selectedProject) return;

    try {
      await projectAPI.deleteLink(selectedProject.id, linkId);
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to delete link');
    }
  };

  const handleArchiveToggle = async () => {
    if (!selectedProject) return;

    setArchiveLoading(true);
    setError('');

    try {
      await onProjectArchive(selectedProject.id, !selectedProject.isArchived);
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to update project archive status');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;

    try {
      await onProjectDelete(selectedProject.id);
      navigate('/');
    } catch (err) {
      setError('Failed to delete project');
    }
  };

  const handleCancel = (section: string) => {
    if (section === 'basic') {
      setName(selectedProject?.name || '');
      setDescription(selectedProject?.description || '');
      setIsEditingBasic(false);
    } else if (section === 'metadata') {
      setStagingEnvironment(selectedProject?.stagingEnvironment || 'development');
      setColor(selectedProject?.color || '#3B82F6');
      setCategory(selectedProject?.category || 'general');
      setTags(selectedProject?.tags || []);
      setIsEditingMetadata(false);
    }
    setError('');
  };

  if (!selectedProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-2xl font-bold mb-2">Select a project</h2>
          <p className="text-base-content/60">Choose a project from the sidebar to view settings</p>
        </div>
      </div>
    );
  }

  const predefinedColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError('')} className="btn btn-ghost btn-sm">×</button>
        </div>
      )}

      {/* Project Information */}
      <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
        <input type="checkbox" defaultChecked />
        <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
          Project Information
        </div>
        <div className="collapse-content">
          <div className="flex justify-between items-center mb-4 pt-4">
            <h3 className="text-lg font-semibold">Basic Info</h3>
            <div className="flex space-x-2">
              {isEditingBasic ? (
                <>
                  <button
                    onClick={() => handleCancel('basic')}
                    className="btn btn-ghost btn-sm"
                    disabled={savingBasic}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBasic}
                    className="btn btn-primary btn-sm"
                    disabled={savingBasic}
                  >
                    {savingBasic ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingBasic(true)}
                  className="btn btn-outline btn-sm"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">
                <span className="label-text font-medium">Project Name</span>
              </label>
              {isEditingBasic ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Enter project name..."
                  required
                />
              ) : (
                <div className="p-3 bg-base-200 rounded-lg border border-base-300">
                  <p className="font-medium">{name}</p>
                </div>
              )}
            </div>

            <div>
              <label className="label">
                <span className="label-text font-medium">Description</span>
              </label>
              {isEditingBasic ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea textarea-bordered w-full h-24 resize-none"
                  placeholder="Enter project description..."
                  required
                />
              ) : (
                <div className="p-3 bg-base-200 rounded-lg border border-base-300">
                  <p>{description}</p>
                </div>
              )}
            </div>
          </div>

          <div className="divider">Metadata</div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Metadata</h3>
            <div className="flex space-x-2">
              {isEditingMetadata ? (
                <>
                  <button
                    onClick={() => handleCancel('metadata')}
                    className="btn btn-ghost btn-sm"
                    disabled={savingMetadata}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMetadata}
                    className="btn btn-primary btn-sm"
                    disabled={savingMetadata}
                  >
                    {savingMetadata ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingMetadata(true)}
                  className="btn btn-outline btn-sm"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text font-medium">Staging Environment</span>
              </label>
              {isEditingMetadata ? (
                <select
                  value={stagingEnvironment}
                  onChange={(e) => setStagingEnvironment(e.target.value as 'development' | 'staging' | 'production')}
                  className="select select-bordered w-full"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              ) : (
                <div className="p-3 bg-base-200 rounded-lg border border-base-300">
                  <span className={`badge ${
                    stagingEnvironment === 'production' ? 'badge-error' :
                    stagingEnvironment === 'staging' ? 'badge-warning' :
                    'badge-success'
                  }`}>
                    {stagingEnvironment.charAt(0).toUpperCase() + stagingEnvironment.slice(1)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="label">
                <span className="label-text font-medium">Category</span>
              </label>
              {isEditingMetadata ? (
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Enter category..."
                />
              ) : (
                <div className="p-3 bg-base-200 rounded-lg border border-base-300">
                  <p>{category}</p>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="label">
                <span className="label-text font-medium">Project Color</span>
              </label>
              {isEditingMetadata ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-12 h-12 border border-base-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="input input-bordered flex-1"
                      placeholder="#3B82F6"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {predefinedColors.map((presetColor) => (
                      <button
                        key={presetColor}
                        onClick={() => setColor(presetColor)}
                        className={`w-8 h-8 rounded-md border-2 ${
                          color === presetColor ? 'border-base-content' : 'border-base-300'
                        }`}
                        style={{ backgroundColor: presetColor }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-base-200 rounded-lg border border-base-300">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded-md border border-base-300"
                      style={{ backgroundColor: color }}
                    ></div>
                    <span className="font-mono">{color}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="label">
                <span className="label-text font-medium">Tags</span>
              </label>
              {isEditingMetadata ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="input input-bordered flex-1"
                      placeholder="Add a tag..."
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <button
                      onClick={handleAddTag}
                      className="btn btn-primary"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="badge badge-info gap-2"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-info-content hover:text-error"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-base-200 rounded-lg border border-base-300">
                  <div className="flex flex-wrap gap-2">
                    {tags.length === 0 ? (
                      <span className="text-base-content/60 italic">No tags</span>
                    ) : (
                      tags.map((tag) => (
                        <span
                          key={tag}
                          className="badge badge-info"
                        >
                          {tag}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Links - Updated with editing */}
      <div className="collapse collapse-arrow bg-base-100 shadow-md">
        <input type="checkbox" />
        <div className="collapse-title text-xl font-medium">
          🔗 Project Links ({selectedProject.links?.length || 0})
        </div>
        <div className="collapse-content">
          <div className="mb-4">
            <h4 className="font-medium mb-3">Add New Link</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                type="text"
                value={newLink.title}
                onChange={(e) => setNewLink({...newLink, title: e.target.value})}
                className="input input-bordered border-base-300"
                placeholder="Link title..."
              />
              <input
                type="url"
                value={newLink.url}
                onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                className="input input-bordered border-base-300"
                placeholder="https://..."
              />
              <select
                value={newLink.type}
                onChange={(e) => setNewLink({...newLink, type: e.target.value as any})}
                className="select select-bordered border-base-300"
              >
                <option value="other">Other</option>
                <option value="github">GitHub</option>
                <option value="demo">Demo</option>
                <option value="docs">Documentation</option>
              </select>
              <button
                onClick={handleAddLink}
                disabled={addingLink || !newLink.title.trim() || !newLink.url.trim()}
                className="btn btn-success"
              >
                {addingLink ? 'Adding...' : 'Add Link'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {selectedProject.links?.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔗</div>
                <p className="text-base-content/60">No links yet. Add one above!</p>
              </div>
            ) : (
              selectedProject.links?.map((link) => (
                <div
                  key={link.id}
                  className="p-3 bg-base-200 rounded-lg border border-base-300"
                >
                  {editingLinkId === link.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={editLinkData.title}
                          onChange={(e) => setEditLinkData({...editLinkData, title: e.target.value})}
                          className="input input-bordered input-sm"
                          placeholder="Link title..."
                        />
                        <input
                          type="url"
                          value={editLinkData.url}
                          onChange={(e) => setEditLinkData({...editLinkData, url: e.target.value})}
                          className="input input-bordered input-sm"
                          placeholder="https://..."
                        />
                        <select
                          value={editLinkData.type}
                          onChange={(e) => setEditLinkData({...editLinkData, type: e.target.value as any})}
                          className="select select-bordered select-sm"
                        >
                          <option value="other">Other</option>
                          <option value="github">GitHub</option>
                          <option value="demo">Demo</option>
                          <option value="docs">Documentation</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleCancelEditLink}
                          className="btn btn-ghost btn-sm"
                          disabled={updatingLink}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdateLink}
                          className="btn btn-primary btn-sm"
                          disabled={updatingLink || !editLinkData.title.trim() || !editLinkData.url.trim()}
                        >
                          {updatingLink ? 'Updating...' : 'Update'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {link.type === 'github' ? '💻' : 
                           link.type === 'demo' ? '🌐' : 
                           link.type === 'docs' ? '📚' : '🔗'}
                        </span>
                        <div className="flex-1">
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="link link-primary font-medium"
                          >
                            {link.title}
                          </a>
                          <div className="text-base-content/60 text-sm">
                            {link.url}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="badge badge-outline">
                          {link.type}
                        </span>
                        <button
                          onClick={() => handleEditLink(link)}
                          className="btn btn-ghost btn-outline btn-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          className="btn btn-error btn-outline btn-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Project Status */}
      <div className="collapse collapse-arrow bg-base-100 shadow-md">
        <input type="checkbox" />
        <div className="collapse-title text-xl font-medium">
          📊 Project Status
        </div>
        <div className="collapse-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Current Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Archive Status:</span>
                  <span className={`badge ${
                    selectedProject.isArchived 
                      ? 'badge-ghost' 
                      : 'badge-success'
                  }`}>
                    {selectedProject.isArchived ? 'Archived' : 'Active'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sharing Status:</span>
                  <span className={`badge ${
                    selectedProject.isShared
                      ? 'badge-info'
                      : 'badge-ghost'
                  }`}>
                    {selectedProject.isShared ? 'Shared' : 'Private'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Deployment Status:</span>
                  <span className="badge badge-ghost">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Timestamps</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Created:</span> {new Date(selectedProject.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Updated:</span> {new Date(selectedProject.updatedAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Project ID:</span> 
                  <span className="font-mono text-xs ml-2">{selectedProject.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Data */}
      <div className="collapse collapse-arrow bg-base-100 shadow-md">
        <input type="checkbox" />
        <div className="collapse-title text-xl font-medium">
          📤 Export Data
        </div>
        <div className="collapse-content">
          <ExportSection selectedProject={selectedProject} />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="collapse collapse-arrow bg-base-100 shadow-md">
        <input type="checkbox" />
        <div className="collapse-title text-xl font-medium text-error">
          ⚠️ Danger Zone
        </div>
        <div className="collapse-content">
          <div className="space-y-4">
            <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
              <h4 className="font-semibold text-warning mb-2">{selectedProject.isArchived ? 'Unarchive Project' : 'Archive Project'}</h4>
              <p className="text-warning/80 text-sm mb-4">
                {selectedProject.isArchived ? 'Make this project active again' : 'Move this project to archived section'}
              </p>
              <button
                onClick={handleArchiveToggle}
                className={`btn ${
                  selectedProject.isArchived 
                    ? 'btn-info' 
                    : 'btn-warning'
                }`}
                disabled={archiveLoading}
              >
                {archiveLoading ? 'Processing...' : selectedProject.isArchived ? 'Make Active' : 'Archive Project'}
              </button>
            </div>

            <div className="p-4 bg-error/10 rounded-lg border border-error/20">
              <h4 className="font-semibold text-error mb-2">Delete Project</h4>
              <p className="text-error/80 text-sm mb-4">
                This action cannot be undone. This will permanently delete the project and all of its data.
              </p>
              
              {deleteConfirm ? (
                <div className="space-y-3">
                  <p className="text-error font-medium">Are you sure you want to delete this project?</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleDelete}
                      className="btn btn-error"
                    >
                      Yes, Delete Project
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="btn btn-ghost"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="btn btn-error"
                >
                  Delete Project
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;