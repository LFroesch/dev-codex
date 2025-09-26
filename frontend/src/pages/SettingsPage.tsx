import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import type { Project } from '../api/types';
import ExportSection from '../components/ExportSection';
import ConfirmationModal from '../components/ConfirmationModal';
import { getContrastTextColor } from '../utils/contrastTextColor';

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
  
  // Form data and state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stagingEnvironment, setStagingEnvironment] = useState<'development' | 'staging' | 'production'>('development');
  const [color, setColor] = useState('#3B82F6');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'info' | 'export' | 'danger'>('info');

  useEffect(() => {
    if (selectedProject) {
      setName(selectedProject.name || '');
      setDescription(selectedProject.description || '');
      setStagingEnvironment(selectedProject.stagingEnvironment || 'development');
      setColor(selectedProject.color || '#3B82F6');
      setCategory(selectedProject.category || 'general');
      setTags(selectedProject.tags || []);
      setHasUnsavedChanges(false);
    }
  }, [selectedProject]);

  const handleSave = async () => {
    if (!selectedProject) return;

    setLoading(true);
    setError('');

    try {
      await onProjectUpdate(selectedProject.id, {
        name: name.trim(),
        description: description.trim(),
        stagingEnvironment,
        color,
        category,
        tags
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    switch (field) {
      case 'name':
        setName(value as string);
        break;
      case 'description':
        setDescription(value as string);
        break;
      case 'stagingEnvironment':
        setStagingEnvironment(value as 'development' | 'staging' | 'production');
        break;
      case 'color':
        setColor(value as string);
        break;
      case 'category':
        setCategory(value as string);
        break;
      case 'tags':
        setTags(value as string[]);
        break;
    }
    setHasUnsavedChanges(true);
  };

  const handleAddTag = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const trimmedTag = newTag.trim().toLowerCase();
    if (trimmedTag && !tags.map(t => t.toLowerCase()).includes(trimmedTag)) {
      const newTags = [...tags, newTag.trim()];
      updateField('tags', newTags);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    updateField('tags', newTags);
  };


  const handleArchiveToggle = async () => {
    if (!selectedProject) return;

    setArchiveLoading(true);
    setError('');

    try {
      await onProjectArchive(selectedProject.id, !selectedProject.isArchived);
      await onProjectRefresh();
    } catch (error) {
      console.error('Failed to update project archive status:', error);
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
    } catch (error) {
      console.error('Failed to delete project:', error);
      setError('Failed to delete project');
      setDeleteConfirm(false);
    }
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
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'info' ? 'tab-active' : ''}`}
            style={activeSection === 'info' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveSection('info')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Project Info
          </button>
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'export' ? 'tab-active' : ''}`}
            style={activeSection === 'export' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveSection('export')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export & Import
          </button>
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeSection === 'danger' ? 'tab-active' : ''}`}
            style={activeSection === 'danger' ? {color: getContrastTextColor()} : {}}
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


      {/* Project Info Section */}
      {activeSection === 'info' && (
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">⚙️</div>
              <span>Project Information</span>
              <button
                onClick={handleSave}
                disabled={loading || !hasUnsavedChanges}
                className={`btn btn-sm ml-auto ${hasUnsavedChanges ? 'btn-primary' : 'btn-ghost'} ${loading ? 'loading' : ''}`}
              >
                {loading ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </button>
            </div>
          </div>
          <div className="section-content">
          {/* Basic Info and Metadata Section */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="label py-1">
                  <span className="label-text font-medium text-sm">Project Name</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="input input-bordered input-sm w-full h-10"
                  placeholder="Enter project name..."
                  required
                />
              </div>

              <div>
                <label className="label py-1">
                  <span className="label-text font-medium text-sm">Project Color</span>
                </label>
                <div className="space-y-2">
                  <div className="flex items-center h-10 gap-1">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => updateField('color', e.target.value)}
                      className="w-10 h-10 border-2 border-base-content/20 rounded cursor-pointer flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => updateField('color', e.target.value)}
                      className="input input-bordered input-sm flex-1 font-mono text-xs h-10"
                      placeholder="#3B82F6"
                    />
                  </div>
                  {/* Color preset buttons */}
                  <div className="flex flex-wrap gap-1">
                    {predefinedColors.map((presetColor) => (
                      <button
                        key={presetColor}
                        onClick={() => updateField('color', presetColor)}
                        className={`w-6 h-6 rounded border-2 ${
                          color === presetColor ? 'border-base-content' : 'border-base-300'
                        } hover:scale-110 transition-transform`}
                        style={{ backgroundColor: presetColor }}
                        title={presetColor}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="label py-1">
                  <span className="label-text font-medium text-sm">Category</span>
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="input input-bordered input-sm w-full h-10"
                  placeholder="Enter category..."
                />
              </div>

              <div>
                <label className="label py-1">
                  <span className="label-text font-medium text-sm">Environment</span>
                </label>
                <select
                  value={stagingEnvironment}
                  onChange={(e) => updateField('stagingEnvironment', e.target.value as 'development' | 'staging' | 'production')}
                  className="select select-bordered select-sm w-full h-10"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>

              <div>
                <label className="label py-1">
                  <span className="label-text font-medium text-sm">Tags ({tags.length})</span>
                </label>
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="input input-bordered input-sm flex-1 h-10"
                      placeholder="Add tag..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddTag(e);
                        }
                      }}
                    />
                    <button
                      onClick={handleAddTag}
                      className="btn btn-primary btn-sm h-10 w-10"
                    >
                      +
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/70  border-2 border-base-content/20"
                          style={{ color: getContrastTextColor("primary") }}
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 text-info-content hover:text-error"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="divider my-4">Description</div>

          {/* Description Section */}
          <div>
            <label className="label py-1">
              <span className="label-text font-medium text-sm">Project Description</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => updateField('description', e.target.value)}
              className="textarea textarea-bordered w-full resize-none"
              placeholder="Enter project description..."
              rows={3}
            />
          </div>

          <div className="divider my-4">Status</div>

          {/* Project Status Section */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Archive Status:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border-2 border-base-content/20 ${
                      selectedProject.isArchived 
                        ? 'bg-warning/80 text-base-content/80' 
                        : 'bg-success/80 text-base-content/80'
                    }`}
                    style={{ color: getContrastTextColor() }}>
                      {selectedProject.isArchived ? 'Archived' : 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Sharing Status:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border-2 border-base-content/20 ${
                      selectedProject.isShared
                        ? 'bg-info/80 text-base-content/80'
                        : 'bg-warning/80 text-base-content/80'
                    }`}
                    style={{ color: getContrastTextColor(selectedProject.isShared ? "info" : "warning") }}>
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
                <h4 className="font-bold mb-2" style={{ color: getContrastTextColor(!selectedProject.isArchived ? "warning" : "info") }}>
                  {selectedProject.isArchived ? 'Unarchive Project' : 'Archive Project'}
                </h4>
                <p className="font-bold text-sm mb-4" style={{ color: getContrastTextColor(!selectedProject.isArchived ? "warning" : "info") }}>
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
                  style={{ color: getContrastTextColor(selectedProject.isArchived ? "info" : "warning") }}
                >
                  {archiveLoading ? 'Processing...' : selectedProject.isArchived ? 'Make Active' : 'Archive Project'}
                </button>
              </div>

              <div className="p-4 bg-error/40 rounded-lg border-thick">
                <h4 className="font-bold mb-2" style={{ color: getContrastTextColor("error") }}>Delete Project</h4>
                <p className="font-bold text-sm mb-4" style={{ color: getContrastTextColor("error") }}>
                  This action cannot be undone. This will permanently delete the project and all of its data.
                </p>
                
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="btn btn-error border-thick"
                  style={{ color: getContrastTextColor("error") }}
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