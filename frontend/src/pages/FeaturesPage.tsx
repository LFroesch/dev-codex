import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Project, Doc, projectAPI } from '../api';
import ConfirmationModal from '../components/ConfirmationModal';
import { getContrastTextColor } from '../utils/contrastTextColor';
import FeaturesGraph from '../components/FeaturesGraph';

interface ContextType {
  selectedProject: Project | null;
  onProjectRefresh: () => Promise<void>;
}

const FeaturesPage: React.FC = () => {
  const { selectedProject, onProjectRefresh } = useOutletContext<ContextType>();

  const [newComponent, setNewComponent] = useState({
    type: 'Core' as Doc['type'],
    title: '',
    content: '',
    feature: ''
  });
  const [addingComponent, setAddingComponent] = useState(false);
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    type: 'Core' as Doc['type'],
    title: '',
    content: '',
    feature: ''
  });
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('structure');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; componentId: string; componentTitle: string }>({
    isOpen: false,
    componentId: '',
    componentTitle: ''
  });

  const toggleComponentExpanded = (componentId: string) => {
    const newExpanded = new Set(expandedComponents);
    if (newExpanded.has(componentId)) {
      newExpanded.delete(componentId);
    } else {
      newExpanded.add(componentId);
    }
    setExpandedComponents(newExpanded);
  };

  const toggleFeatureExpanded = (feature: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(feature)) {
      newExpanded.delete(feature);
    } else {
      newExpanded.add(feature);
    }
    setExpandedFeatures(newExpanded);
  };

  const componentTypes: Array<{ value: Doc['type']; label: string; emoji: string; description: string }> = [
    { value: 'Core', label: 'Core', emoji: '🎯', description: 'Core functionality and business logic' },
    { value: 'API', label: 'API', emoji: '🔌', description: 'API endpoints and contracts' },
    { value: 'Data', label: 'Data', emoji: '🗃️', description: 'Data models and database schemas' },
    { value: 'UI', label: 'UI', emoji: '🎨', description: 'User interface components' },
    { value: 'Config', label: 'Config', emoji: '⚙️', description: 'Configuration and settings' },
    { value: 'Security', label: 'Security', emoji: '🔐', description: 'Authentication and authorization' },
    { value: 'Docs', label: 'Docs', emoji: '📚', description: 'Documentation and guides' },
    { value: 'Dependencies', label: 'Dependencies', emoji: '📦', description: 'External dependencies and integrations' }
  ];

  const handleAddComponent = async () => {
    if (!selectedProject || !newComponent.title.trim() || !newComponent.content.trim() || !newComponent.feature.trim()) return;

    setAddingComponent(true);
    setError('');

    try {
      await projectAPI.createComponent(selectedProject.id, newComponent);
      setNewComponent({ type: 'Core', title: '', content: '', feature: '' });
      setActiveTab('structure');
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to add component');
    } finally {
      setAddingComponent(false);
    }
  };

  const handleEditComponent = (component: Doc) => {
    setEditingComponent(component.id);
    setEditData({
      type: component.type,
      title: component.title,
      content: component.content,
      feature: component.feature || ''
    });
    if (!expandedComponents.has(component.id)) {
      toggleComponentExpanded(component.id);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedProject || !editingComponent) return;

    try {
      await projectAPI.updateComponent(selectedProject.id, editingComponent, editData);
      setEditingComponent(null);
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to update component');
    }
  };

  const handleDeleteComponent = async (componentId: string) => {
    if (!selectedProject) return;

    try {
      await projectAPI.deleteComponent(selectedProject.id, componentId);
      await onProjectRefresh();
      setDeleteConfirmation({ isOpen: false, componentId: '', componentTitle: '' });
    } catch (err) {
      setError('Failed to delete component');
    }
  };

  const confirmDeleteComponent = (componentId: string, componentTitle: string) => {
    setDeleteConfirmation({ isOpen: true, componentId, componentTitle });
  };

  const handleCancelEdit = () => {
    setEditingComponent(null);
    setEditData({ type: 'Core', title: '', content: '', feature: '' });
  };

  if (!selectedProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🧩</div>
          <h2 className="text-2xl font-bold mb-2">Select a project</h2>
          <p className="text-base-content/60">Choose a project from the sidebar to view features</p>
        </div>
      </div>
    );
  }

  // Group components by feature
  const componentsByFeature: Record<string, Doc[]> = {};
  selectedProject.components.forEach(component => {
    const featureKey = component.feature || 'Ungrouped';
    if (!componentsByFeature[featureKey]) {
      componentsByFeature[featureKey] = [];
    }
    componentsByFeature[featureKey].push(component);
  });

  // Separate featured and ungrouped components
  const featuredComponents = Object.entries(componentsByFeature).filter(([key]) => key !== 'Ungrouped');
  const ungroupedComponents = componentsByFeature['Ungrouped'] || [];

  // Check if there are any components at all
  const hasAnyComponents = selectedProject.components.length > 0;

  const renderComponentCard = (component: Doc) => {
    const isExpanded = expandedComponents.has(component.id);
    const isEditing = editingComponent === component.id;
    const componentType = componentTypes.find(t => t.value === component.type);

    return (
      <div key={component.id} className="card-interactive group p-3">
        {/* Header with title and controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => toggleComponentExpanded(component.id)}
            className="flex items-center gap-3 flex-1 text-left hover:bg-base-200 p-2 -m-2 rounded-lg transition-colors"
            disabled={isEditing}
          >
            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
              <svg className="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-base">{component.title}</h3>
                {componentType && (
                  <span className="px-2 py-1 rounded-md bg-base-300 text-xs font-medium">
                    {componentType.emoji} {componentType.label}
                  </span>
                )}
              </div>
              <div className="text-xs text-base-content/50">
                <div>Created: {new Date(component.createdAt).toLocaleDateString()}</div>
                {component.updatedAt !== component.createdAt && (
                  <div>Updated: {new Date(component.updatedAt).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          </button>

          <div className="flex gap-1 sm:gap-2 ml-2 sm:ml-4 shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="btn btn-sm btn-primary"
                  style={{ color: getContrastTextColor('primary') }}
                  disabled={!editData.title.trim() || !editData.content.trim() || !editData.feature.trim()}
                  title="Save changes"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="btn btn-sm btn-ghost"
                  title="Cancel editing"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditComponent(component);
                  }}
                  className="btn btn-sm btn-ghost"
                  title="Edit component"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDeleteComponent(component.id, component.title);
                  }}
                  className="btn btn-sm btn-error btn-outline"
                  title="Delete component"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Collapsible content */}
        {isExpanded && (
          <div className="mt-4 border-t border-base-content/20 pt-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Type</span>
                    </label>
                    <select
                      value={editData.type}
                      onChange={(e) => setEditData({...editData, type: e.target.value as Doc['type']})}
                      className="select select-bordered select-sm"
                    >
                      {componentTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.emoji} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text font-medium">Title</span>
                    </label>
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) => setEditData({...editData, title: e.target.value})}
                      className="input input-bordered input-sm"
                    />
                  </div>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Feature (required)</span>
                  </label>
                  <input
                    type="text"
                    value={editData.feature}
                    onChange={(e) => setEditData({...editData, feature: e.target.value})}
                    className="input input-bordered input-sm"
                    placeholder="e.g., Authentication, User Management"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Content</span>
                  </label>
                  <textarea
                    value={editData.content}
                    onChange={(e) => setEditData({...editData, content: e.target.value})}
                    className="textarea textarea-bordered h-[500px]"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-base-200/40 rounded-lg p-4 border-2 border-base-content/20">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                  {component.content}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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

      {/* Tab Navigation */}
      <div className="flex justify-center px-2">
        <div className="tabs-container overflow-x-auto">
          <button
            className={`tab-button ${activeTab === 'graph' ? 'tab-active' : ''}`}
            style={activeTab === 'graph' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveTab('graph')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            Dashboard ({selectedProject.components?.length || 0})
          </button>
          {hasAnyComponents && (
            <>
              <button
                className={`tab-button ${activeTab === 'structure' ? 'tab-active' : ''}`}
                style={activeTab === 'structure' ? {color: getContrastTextColor()} : {}}
                onClick={() => setActiveTab('structure')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Structure ({selectedProject.components?.length || 0})
              </button>
              <button
                className={`tab-button ${activeTab === 'all' ? 'tab-active' : ''}`}
                style={activeTab === 'all' ? {color: getContrastTextColor()} : {}}
                onClick={() => setActiveTab('all')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                All Components ({selectedProject.components?.length || 0})
              </button>
            </>
          )}
          <button
            className={`tab-button ${activeTab === 'create' ? 'tab-active' : ''}`}
            style={activeTab === 'create' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveTab('create')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'graph' ? (
        // Graph Dashboard Tab
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">🕸️</div>
              <span>Features Dashboard</span>
            </div>
          </div>
          <div className="section-content">
            <FeaturesGraph
              docs={selectedProject.components}
              projectId={selectedProject.id}
              onDocClick={(component) => {
                // Switch to All Components tab and expand the clicked component
                setActiveTab('all');
                if (!expandedComponents.has(component.id)) {
                  toggleComponentExpanded(component.id);
                }
              }}
              onDocEdit={(component) => {
                // Open edit mode for this component
                handleEditComponent(component);
                setActiveTab('all');
              }}
              onCreateDoc={async (componentData) => {
                setAddingComponent(true);
                setError('');

                try {
                  await projectAPI.createComponent(selectedProject.id, componentData);
                  await onProjectRefresh();
                } catch (err) {
                  setError('Failed to add component');
                } finally {
                  setAddingComponent(false);
                }
              }}
              creating={addingComponent}
            />
          </div>
        </div>
      ) : activeTab === 'structure' ? (
        // Structure View Tab
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">🏗️</div>
              <span>Project Features</span>
            </div>
          </div>
          <div className="section-content">
            {!hasAnyComponents ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🧩</span>
                </div>
                <h3 className="text-lg font-medium mb-2 text-base-content/80">No components yet</h3>
                <p className="text-sm text-base-content/60 mb-4">Create your first component using the "Create New" tab</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="btn btn-primary btn-sm"
                  style={{ color: getContrastTextColor('primary') }}
                >
                  Create Component
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Featured sections */}
                {featuredComponents.map(([feature, components]) => {
                  const isExpanded = expandedFeatures.has(feature);
                  return (
                    <div key={feature} className="card-interactive p-0 overflow-hidden">
                      <button
                        onClick={() => toggleFeatureExpanded(feature)}
                        className="w-full flex items-center justify-between p-4 hover:bg-base-200 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                            <svg className="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          <h2 className="text-lg font-bold">{feature}</h2>
                          <span className="badge badge-primary">{components.length}</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3">
                          {components.map(component => renderComponentCard(component))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Ungrouped components */}
                {ungroupedComponents.length > 0 && (
                  <div className="card-interactive p-0 overflow-hidden">
                    <button
                      onClick={() => toggleFeatureExpanded('Ungrouped')}
                      className="w-full flex items-center justify-between p-4 hover:bg-base-200 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`transform transition-transform duration-200 ${expandedFeatures.has('Ungrouped') ? 'rotate-90' : ''}`}>
                          <svg className="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <h2 className="text-lg font-bold">Ungrouped</h2>
                        <span className="badge badge-ghost">{ungroupedComponents.length}</span>
                      </div>
                    </button>
                    {expandedFeatures.has('Ungrouped') && (
                      <div className="px-4 pb-4 space-y-3">
                        {ungroupedComponents.map(component => renderComponentCard(component))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'all' ? (
        // All Components Tab
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">🧩</div>
              <span>All Components</span>
            </div>
          </div>
          <div className="section-content">
            <div className="space-y-3">
              {selectedProject.components.map(component => renderComponentCard(component))}
            </div>
          </div>
        </div>
      ) : (
        // Create New Tab
        <div className="section-container mb-4">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">📝</div>
              <span>Create New Component</span>
            </div>
          </div>
          <div className="section-content">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Component Type</span>
                  </label>
                  <select
                    value={newComponent.type}
                    onChange={(e) => setNewComponent({...newComponent, type: e.target.value as Doc['type']})}
                    className="select select-bordered"
                  >
                    {componentTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text font-medium">Title</span>
                  </label>
                  <input
                    type="text"
                    value={newComponent.title}
                    onChange={(e) => setNewComponent({...newComponent, title: e.target.value})}
                    className="input input-bordered text-sm"
                    placeholder="Enter component title..."
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Feature <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  value={newComponent.feature}
                  onChange={(e) => setNewComponent({...newComponent, feature: e.target.value})}
                  className="input input-bordered text-sm"
                  placeholder="e.g., Authentication, User Management, Payment System"
                />
                <label className="label">
                  <span className="label-text-alt">Feature name is required - components belong to features</span>
                </label>
              </div>

              <div className="form-control flex justify-end mb-2">
                <div className="label">
                  <span className="label-text font-medium">Content</span>
                </div>

                <textarea
                  value={newComponent.content}
                  onChange={(e) => setNewComponent({...newComponent, content: e.target.value})}
                  className="textarea textarea-bordered h-[300px]"
                  placeholder="Enter your component content..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleAddComponent}
                  disabled={addingComponent || !newComponent.title.trim() || !newComponent.content.trim() || !newComponent.feature.trim()}
                  className="btn btn-primary"
                  style={{ color: getContrastTextColor('primary') }}
                >
                  {addingComponent ? 'Adding...' : 'Add Component'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onConfirm={() => handleDeleteComponent(deleteConfirmation.componentId)}
        onCancel={() => setDeleteConfirmation({ isOpen: false, componentId: '', componentTitle: '' })}
        title="Delete Component"
        message={`Are you sure you want to delete "${deleteConfirmation.componentTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="error"
      />
    </div>
  );
};

export default FeaturesPage;
