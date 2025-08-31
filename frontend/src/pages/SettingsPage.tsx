import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import type { BaseProject } from '../../../shared/types';
import ExportSection from '../components/ExportSection';
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
  
  // Form data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stagingEnvironment, setStagingEnvironment] = useState<'development' | 'staging' | 'production'>('development');
  const [color, setColor] = useState('#3B82F6');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Loading states
  const [savingBasic, setSavingBasic] = useState(false);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'overview' | 'info' | 'export' | 'danger'>('overview');

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
          <h2 className="text-lg font-semibold mb-2">Select a project</h2>
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
    <div className="p-6">
      {/* Navigation Tabs */}
      <div className="tabs tabs-boxed border-subtle shadow-sm opacity-90 mb-6">
        <button 
          className={`tab ${activeSection === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeSection === 'info' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('info')}
        >
          Project Info
        </button>
        <button 
          className={`tab ${activeSection === 'export' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('export')}
        >
          Export & Import
        </button>
        <button 
          className={`tab ${activeSection === 'danger' ? 'tab-active' : ''}`}
          onClick={() => setActiveSection('danger')}
        >
          Danger Zone
        </button>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="alert alert-error shadow-md mb-6">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError('')} className="btn btn-ghost btn-sm">×</button>
        </div>
      )}

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="space-y-4">
          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
            <h2 className="text-xl font-bold mb-0">⚙️ Project Overview</h2>
          </div>
          
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
            <div className="flex items-center gap-4 mb-4">
              <div 
                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: selectedProject.color }}
              >
                {selectedProject.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold">{selectedProject.name}</h3>
                <p className="text-base-content/70 mb-2">{selectedProject.description}</p>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedProject.isArchived 
                      ? 'bg-gray-200 text-gray-800' 
                      : 'bg-success/20 text-success'
                  }`}>
                    {selectedProject.isArchived ? '📦 Archived' : '✨ Active'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedProject.isShared
                      ? 'bg-info/20 text-info'
                      : 'bg-warning/20 text-warning'
                  }`}>
                    {selectedProject.isShared ? '👥 Shared' : '🔒 Private'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Created:</span> {new Date(selectedProject.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Updated:</span> {new Date(selectedProject.updatedAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {selectedProject.category}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Environment:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    selectedProject.stagingEnvironment === 'production' ? 'bg-error/20 text-error' :
                    selectedProject.stagingEnvironment === 'staging' ? 'bg-warning/20 text-warning' :
                    'bg-success/20 text-success'
                  }`}>
                    {selectedProject.stagingEnvironment?.charAt(0).toUpperCase() + selectedProject.stagingEnvironment?.slice(1)}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Tags:</span> 
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedProject.tags && selectedProject.tags.length > 0 ? (
                      selectedProject.tags.map((tag, index) => (
                        <span key={index} className="badge badge-info badge-sm">{tag}</span>
                      ))
                    ) : (
                      <span className="text-base-content/60 italic">No tags</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Project ID:</span> 
                  <span className="font-mono text-xs ml-2">{selectedProject.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Info Section */}
      {activeSection === 'info' && (
        <div className="space-y-4">
          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
            <h2 className="text-xl font-bold mb-0">⚙️ Project Information</h2>
          </div>
          
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
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

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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
                </div>
              </div>

              <div>
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
      )}

      {/* Export & Import Section */}
      {activeSection === 'export' && (
        <div className="space-y-4">
          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
            <h2 className="text-xl font-bold mb-0">📤 Export & Import</h2>
          </div>
          
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
            <ExportSection selectedProject={selectedProject} onProjectRefresh={onProjectRefresh} />
          </div>
        </div>
      )}

      {/* Danger Zone Section */}
      {activeSection === 'danger' && (
        <div className="space-y-4">
          <div className="px-2 py-1 rounded-md bg-base-300 inline-block w-fit">
            <h2 className="text-xl font-bold mb-0 text-error">⚠️ Danger Zone</h2>
          </div>
          
          <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200 p-4">
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
      )}

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