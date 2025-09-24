import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import type { Project } from '../api/types';
import ExportSection from '../components/ExportSection';
import ConfirmationModal from '../components/ConfirmationModal';

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
    <div className="space-y-4">
      {/* Navigation Tabs */}
      <div className="flex justify-center px-2">
        <div className="tabs tabs-boxed border-2 border-base-content/20 shadow-sm">
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'overview' ? 'tab-active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Overview
          </button>
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'info' ? 'tab-active' : ''}`}
            onClick={() => setActiveSection('info')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Project Info
          </button>
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'export' ? 'tab-active' : ''}`}
            onClick={() => setActiveSection('export')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export & Import
          </button>
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'danger' ? 'tab-active' : ''}`}
            onClick={() => setActiveSection('danger')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Danger Zone
          </button>
        </div>
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
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">⚙️</div>
              <span>Project Overview</span>
            </div>
          </div>
          <div className="section-content">
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
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 h-7 rounded-full text-sm font-medium text-base-content ${
                    selectedProject.isArchived 
                      ? 'bg-accent/50' 
                      : 'bg-success/70'
                  }`}>
                    {selectedProject.isArchived ? 'Archived' : 'Active'}
                  </span>
                  <span className={`px-3 py-1 h-7 rounded-full text-sm font-medium text-base-content ${
                    selectedProject.isShared
                      ? 'bg-info/50'
                      : 'bg-warning/50'
                  }`}>
                    {selectedProject.isShared ? 'Shared' : 'Private'}
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
                  <span className={`ml-2 px-2 py-1 rounded-lg text-xs font-semibold text-base-content ${
                    selectedProject.stagingEnvironment === 'production' ? 'bg-error' :
                    selectedProject.stagingEnvironment === 'staging' ? 'bg-warning' :
                    'bg-success'
                  }`}>
                    {selectedProject.stagingEnvironment?.charAt(0).toUpperCase() + selectedProject.stagingEnvironment?.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Tags:</span> 
                  <div className="flex flex-wrap gap-1">
                    {selectedProject.tags && selectedProject.tags.length > 0 ? (
                      selectedProject.tags.map((tag, index) => (
                        <span key={index} className="badge badge-info badge-sm font-semibold h-6">{tag}</span>
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
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">⚙️</div>
              <span>Project Information</span>
            </div>
          </div>
          <div className="section-content">
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
                    className="input input-bordered input-sm text-base-content/40 w-full h-10"
                    placeholder="Enter project name..."
                    required
                  />
                ) : (
                  <div className="input input-bordered p-2 border-thick rounded-lg h-10">
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
                    className="input input-bordered input-sm text-base-content/40 w-full h-10"
                    placeholder="Enter project description..."
                    required
                  />
                ) : (
                  <div className="input input-bordered h-10 p-2 rounded-lg border-thick">
                    <p className="font-medium text-sm">{description}</p>
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
                  <div className="flex items-center h-10 gap-1">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 border-2 border-base-content/20 rounded cursor-pointer flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="input input-bordered input-sm w-28 font-mono text-xs text-base-content/40 h-10"
                      placeholder="#3B82F6"
                    />
                  </div>
                ) : (
                  <div className="input input-bordered p-2 border-thick rounded-lg h-10 flex items-center">
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
                    className="input input-bordered input-sm text-base-content/40 w-full h-10"
                    placeholder="Enter category..."
                  />
                ) : (
                  <div className="input input-bordered p-2 border-thick rounded-lg h-10 flex items-center">
                    <p className="text-sm">{category}</p>
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
                    className="select select-bordered select-sm w-full h-10"
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                ) : (
                  <div className="input input-bordered p-2 border-thick rounded-lg h-10 flex items-center">
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
                        className="input input-bordered input-sm text-base-content/40 flex-1 h-10"
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
                  <div className="input input-bordered p-2 border-thick rounded-lg h-10 flex items-center">
                    <div className="flex flex-wrap gap-1">
                      {tags.length === 0 ? (
                        <span className="text-base-content/60 italic text-xs">No tags</span>
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
                        : 'bg-warning'
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
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">📤</div>
              <span>Export & Import</span>
            </div>
          </div>
          <div className="section-content">
            <ExportSection selectedProject={selectedProject} onProjectRefresh={onProjectRefresh} />
          </div>
        </div>
      )}

      {/* Danger Zone Section */}
      {activeSection === 'danger' && (
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">⚠️</div>
              <span>Danger Zone</span>
            </div>
          </div>
          <div className="section-content">
            <div className="space-y-4">
              <div className={`p-4 ${!selectedProject.isArchived ? 'bg-warning/20' : 'bg-info/10'} rounded-lg border-thick`}>
                <h4 className={`font-bold ${!selectedProject.isArchived ? 'text-warning' : 'text-info'} mb-2`}>{selectedProject.isArchived ? 'Unarchive Project' : 'Archive Project'}</h4>
                <p className={`${!selectedProject.isArchived ? 'text-warning' : 'text-info'} font-bold text-sm mb-4`}>
                  {selectedProject.isArchived ? 'Make this project active again.' : 'Move this project to archived section.'}
                </p>
                <button
                  onClick={handleArchiveToggle}
                  className={`btn ${
                    selectedProject.isArchived 
                      ? 'btn-info border-thick' 
                      : 'btn-warning border-thick'
                  }`}
                  disabled={archiveLoading}
                >
                  {archiveLoading ? 'Processing...' : selectedProject.isArchived ? 'Make Active' : 'Archive Project'}
                </button>
              </div>

              <div className="p-4 bg-error/10 rounded-lg border-thick">
                <h4 className="font-bold text-error mb-2">Delete Project</h4>
                <p className="text-error/80 font-bold text-sm mb-4">
                  This action cannot be undone. This will permanently delete the project and all of its data.
                </p>
                
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="btn btn-error border-thick"
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