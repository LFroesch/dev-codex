import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { projectAPI } from '../api';
import type { BaseProject } from '../../../shared/types';
import ExportSection from '../components/ExportSection';
import TeamManagement from '../components/TeamManagement';
import ConfirmationModal from '../components/ConfirmationModal';

interface ContextType {
  selectedProject: BaseProject | null;
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

  const handleAddTag = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !tags.map(t => t.toLowerCase()).includes(trimmedTag)) {
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
      setDeleteConfirm(false);
    } catch (err) {
      setError('Failed to delete project');
      setDeleteConfirm(false);
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
        <div className="collapse-title text-xl font-semibold bg-base-200 border-b border-base-content/10">
        ⚙️ Project Information
        </div>
        <div className="collapse-content">
          {/* Basic Info Section */}
          <div className="pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold">Basic Info</h3>
              <div className="flex space-x-2">
                {isEditingBasic ? (
                  <>
                    <button
                      onClick={() => handleCancel('basic')}
                      className="btn btn-ghost btn-xs"
                      disabled={savingBasic}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveBasic}
                      className="btn btn-primary btn-xs"
                      disabled={savingBasic}
                    >
                      {savingBasic ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingBasic(true)}
                    className="btn btn-outline btn-xs"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="label py-1">
                  <span className="label-text font-medium text-sm">Project Name</span>
                </label>
                {isEditingBasic ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input input-bordered input-sm w-full"
                    placeholder="Enter project name..."
                    required
                  />
                ) : (
                  <div className="p-2 bg-base-200 rounded border border-base-300">
                    <p className="font-medium text-sm">{name}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="label py-1">
                  <span className="label-text font-medium text-sm">Description</span>
                </label>
                {isEditingBasic ? (
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input input-bordered input-sm w-full"
                    placeholder="Enter project description..."
                    required
                  />
                ) : (
                  <div className="p-2 bg-base-200 rounded border border-base-300">
                    <p className="text-sm">{description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="divider my-4">Metadata</div>

          {/* Metadata Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold">Metadata</h3>
              <div className="flex space-x-2">
                {isEditingMetadata ? (
                  <>
                    <button
                      onClick={() => handleCancel('metadata')}
                      className="btn btn-ghost btn-xs"
                      disabled={savingMetadata}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveMetadata}
                      className="btn btn-primary btn-xs"
                      disabled={savingMetadata}
                    >
                      {savingMetadata ? 'Saving...' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingMetadata(true)}
                    className="btn btn-outline btn-xs"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="label py-1">
                  <span className="label-text font-medium text-sm">Project Color</span>
                </label>
                {isEditingMetadata ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 border border-base-300 rounded cursor-pointer flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="input input-bordered input-sm flex-1 font-mono text-xs"
                      placeholder="#3B82F6"
                    />
                  </div>
                ) : (
                  <div className="p-2 bg-base-200 rounded border border-base-300">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded border border-base-300 flex-shrink-0"
                        style={{ backgroundColor: color }}
                      ></div>
                      <span className="font-mono text-xs">{color}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="label py-1">
                  <span className="label-text font-medium text-sm">Category</span>
                </label>
                {isEditingMetadata ? (
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input input-bordered input-sm w-full h-8"
                    placeholder="Enter category..."
                  />
                ) : (
                  <div className="p-2 bg-base-200 rounded border border-base-300">
                    <p className="text-sm translate-y-0.5 h-6">{category}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="label py-1">
                  <span className="label-text font-medium text-sm">Environment</span>
                </label>
                {isEditingMetadata ? (
                  <select
                    value={stagingEnvironment}
                    onChange={(e) => setStagingEnvironment(e.target.value as 'development' | 'staging' | 'production')}
                    className="select select-bordered select-sm w-full"
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                ) : (
                  <div className="p-2 bg-base-200 rounded border border-base-300">
                    <span className={`badge badge-sm h-6 ${
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
                <label className="label py-1">
                  <span className="label-text font-medium text-sm">Tags ({tags.length})</span>
                </label>
                {isEditingMetadata ? (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        className="input input-bordered input-sm flex-1"
                        placeholder="Add tag..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTag(e);
                          }
                        }}
                      />
                      <button
                        onClick={handleAddTag}
                        className="btn btn-primary btn-sm btn-square"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag, index) => (
                        <span
                          key={`tag-${index}-${tag}`}
                          className="badge badge-info badge-sm gap-1"
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
                  <div className="p-2 bg-base-200 rounded border border-base-300 min-h-[2rem]">
                    <div className="flex flex-wrap gap-1">
                      {tags.length === 0 ? (
                        <span className="text-base-content/60 italic text-xs translate-y-1 h-6">No tags</span>
                      ) : (
                        tags.map((tag, index) => (
                          <span
                            key={`display-tag-${index}-${tag}`}
                            className="badge badge-info badge-sm h-6"
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

            {/* Color preset buttons - only show when editing */}
            {isEditingMetadata && (
              <div className="mt-2">
                <div className="flex flex-wrap gap-1">
                  {predefinedColors.map((presetColor) => (
                    <button
                      key={presetColor}
                      onClick={() => setColor(presetColor)}
                      className={`w-6 h-6 rounded border-2 ${
                        color === presetColor ? 'border-base-content' : 'border-base-300'
                      } hover:scale-110 transition-transform`}
                      style={{ backgroundColor: presetColor }}
                      title={presetColor}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="divider my-4">Status</div>

          {/* Project Status Section */}
          <div>
            <h3 className="text-base font-semibold mb-3">Project Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Current Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Archive Status:</span>
                    <span className={`badge badge-sm ${
                      selectedProject.isArchived 
                        ? 'badge-ghost' 
                        : 'badge-success'
                    }`}>
                      {selectedProject.isArchived ? 'Archived' : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sharing Status:</span>
                    <span className={`badge badge-sm ${
                      selectedProject.isShared
                        ? 'badge-info'
                        : 'badge-ghost'
                    }`}>
                      {selectedProject.isShared ? 'Shared' : 'Private'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Deployment Status:</span>
                    <span className="badge badge-ghost badge-sm">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Timestamps</h4>
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
      </div>

      {/* Project Sharing */}
      {selectedProject && (
        <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
          <input type="checkbox" />
          <div className="collapse-title text-xl font-semibold bg-base-200 border-b border-base-content/10">
            👥 Project Sharing & Team Management
          </div>
          <div className="collapse-content">
            <div className="pt-4">
              {selectedProject.isShared ? (
                <div className="space-y-6">
                  {/* Sharing Status Card */}
                  <div className="card bg-success/5 border border-success/20">
                    <div className="card-body p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.196-2.121M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-semibold text-success">Sharing Enabled</h4>
                            <p className="text-sm text-base-content/70">This project is accessible to team members</p>
                          </div>
                        </div>
                        
                        {(selectedProject.canManageTeam !== false) && (
                          <div className="form-control">
                            <label className="label cursor-pointer gap-3">
                              <span className="label-text font-medium">Enable Sharing</span>
                              <input 
                                type="checkbox" 
                                className="toggle toggle-success" 
                                checked={true}
                                onChange={() => {
                                  onProjectUpdate(selectedProject.id, { isShared: false }).then(() => {
                                    onProjectRefresh();
                                  });
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <TeamManagement 
                    projectId={selectedProject.id} 
                    canManageTeam={selectedProject.canManageTeam ?? selectedProject.isOwner ?? false}
                    currentUserId={undefined} // TODO: Get current user ID from auth context
                  />
                </div>
              ) : (
                <div className="card bg-base-200/50 border border-base-content/10">
                  <div className="card-body p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-base-content/10 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-2">Private Project</h3>
                    <p className="text-base-content/70 mb-6 max-w-md mx-auto">
                      This project is currently private and only accessible to you. Enable sharing to collaborate with team members.
                    </p>
                    
                    {selectedProject.canManageTeam !== false && (
                      <div className="form-control w-fit mx-auto">
                        <label className="label cursor-pointer gap-4">
                          <span className="label-text font-medium">Enable Sharing</span>
                          <input 
                            type="checkbox" 
                            className="toggle toggle-primary toggle-lg" 
                            checked={false}
                            onChange={() => {
                              onProjectUpdate(selectedProject.id, { isShared: true }).then(() => {
                                onProjectRefresh();
                              });
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Links - Updated with editing */}
      <div className="collapse collapse-arrow bg-base-200 shadow-lg border border-base-content/10">
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

      {/* Export Data */}
      <div className="collapse collapse-arrow bg-base-200 shadow-lg border border-base-content/10">
        <input type="checkbox" />
        <div className="collapse-title text-xl font-medium">
          📤 Export Data
        </div>
        <div className="collapse-content">
          <ExportSection selectedProject={selectedProject} />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="collapse collapse-arrow bg-base-200 shadow-lg border border-base-content/10">
        <input type="checkbox" />
        <div className="collapse-title text-xl font-medium text-error">
          ⚠️ Danger Zone
        </div>
        <div className="collapse-content">
          <div className="space-y-4">
            <div className={`p-4 ${!selectedProject.isArchived ? 'bg-warning/10 border-warning/20' : 'bg-info/10 border-info/20'} rounded-lg border`}>
              <h4 className={`font-semibold ${!selectedProject.isArchived ? 'text-warning' : 'text-info'} mb-2`}>{selectedProject.isArchived ? 'Unarchive Project' : 'Archive Project'}</h4>
              <p className={`${!selectedProject.isArchived ? 'text-warning/80' : 'text-info/80'} text-sm mb-4`}>
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
              
              <button
                onClick={() => setDeleteConfirm(true)}
                className="btn btn-error"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={deleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
        title="Delete Project"
        message={`Are you sure you want to delete "<strong>${selectedProject?.name}</strong>"? This will permanently delete the project and all of its data. This action cannot be undone.`}
        confirmText="Delete Project"
        variant="error"
      />
    </div>
  );
};

export default SettingsPage;