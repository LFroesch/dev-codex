import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Project, Doc, projectAPI } from '../api';
import { ComponentCategory } from '../../../shared/types/project';
import ConfirmationModal from '../components/ConfirmationModal';
import { getContrastTextColor } from '../utils/contrastTextColor';
import FeaturesGraph from '../components/FeaturesGraph';
import { getAllCategories, getTypesForCategory } from '../config/componentCategories';
import { analyticsService } from '../services/analytics';

interface ContextType {
  selectedProject: Project | null;
  onProjectRefresh: () => Promise<void>;
}

const FeaturesPage: React.FC = () => {
  const { selectedProject, onProjectRefresh, activeFeaturesTab } = useOutletContext<any>();

  const [newComponent, setNewComponent] = useState({
    category: 'backend' as ComponentCategory,
    type: 'service',
    title: '',
    content: '',
    feature: '',
    tags: [] as string[]
  });
  const [addingComponent, setAddingComponent] = useState(false);
  const [editingComponent, setEditingComponent] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    category: 'backend' as ComponentCategory,
    type: 'service',
    title: '',
    content: '',
    feature: '',
    tags: [] as string[]
  });
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
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

  const categories = getAllCategories();

  const handleAddComponent = async () => {
    if (!selectedProject || !newComponent.title.trim() || !newComponent.content.trim() || !newComponent.feature.trim()) return;

    setAddingComponent(true);
    setError('');

    try {
      await projectAPI.createComponent(selectedProject.id, newComponent);

      analyticsService.trackFeatureUsage('component_create', {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        category: newComponent.category,
        type: newComponent.type,
        feature: newComponent.feature
      });

      setNewComponent({ category: 'backend', type: 'service', title: '', content: '', feature: '', tags: [] });
      // Tab managed by Layout.tsx now
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
      category: component.category,
      type: component.type,
      title: component.title,
      content: component.content,
      feature: component.feature || '',
      tags: component.tags || []
    });
    if (!expandedComponents.has(component.id)) {
      toggleComponentExpanded(component.id);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedProject || !editingComponent) return;

    try {
      await projectAPI.updateComponent(selectedProject.id, editingComponent, editData);

      analyticsService.trackFeatureUsage('component_update', {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        category: editData.category,
        type: editData.type
      });

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

      analyticsService.trackFeatureUsage('component_delete', {
        projectId: selectedProject.id,
        projectName: selectedProject.name
      });

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
    setEditData({ category: 'backend', type: 'service', title: '', content: '', feature: '', tags: [] });
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
  selectedProject.components.forEach((component: Doc) => {
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
    const category = categories.find(c => c.value === component.category);
    const typeInfo = category ? category.types.find(t => t.value === component.type) : null;

    return (
      <div key={component.id} className="card-interactive group p-3 max-w-full min-w-0">
        {/* Header with title and controls */}
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => toggleComponentExpanded(component.id)}
            className="flex items-start gap-2 flex-1 text-left hover:bg-base-200 p-2 -m-2 rounded-lg transition-colors min-w-0"
            disabled={isEditing}
          >
            <div className={`transform transition-transform duration-200 flex-shrink-0 mt-0.5 ${isExpanded ? 'rotate-90' : ''}`}>
              <svg className="w-4 h-4 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base mb-1 break-words">{component.title}</h3>
              {category && (
                <span
                  className="inline-block px-2 py-1 rounded-md text-xs font-medium mb-1"
                  style={{
                    backgroundColor: `${category.color}20`,
                    color: category.color,
                    borderColor: category.color,
                    border: '1px solid'
                  }}
                >
                  {category.emoji} {category.label} • {typeInfo?.emoji} {typeInfo?.label || component.type}
                </span>
              )}
              <div className="text-xs text-base-content/50">
                <div>Created: {new Date(component.createdAt).toLocaleDateString()}</div>
                {component.updatedAt !== component.createdAt && (
                  <div>Updated: {new Date(component.updatedAt).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          </button>

          <div className="flex gap-1 ml-2 shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="btn btn-sm btn-primary px-2"
                  style={{ color: getContrastTextColor('primary') }}
                  disabled={!editData.title.trim() || !editData.content.trim() || !editData.feature.trim()}
                  title="Save changes"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="btn btn-sm btn-ghost px-2"
                  title="Cancel editing"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditComponent(component);
                  }}
                  className="btn btn-sm btn-ghost px-2"
                  title="Edit component"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDeleteComponent(component.id, component.title);
                  }}
                  className="btn btn-sm btn-error btn-outline px-2"
                  title="Delete component"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Category</span>
                    </label>
                    <select
                      value={editData.category}
                      onChange={(e) => {
                        const newCategory = e.target.value as ComponentCategory;
                        const types = getTypesForCategory(newCategory);
                        setEditData({...editData, category: newCategory, type: types[0]?.value || ''});
                      }}
                      className="select select-bordered select-sm w-full"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.emoji} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Type</span>
                    </label>
                    <select
                      value={editData.type}
                      onChange={(e) => setEditData({...editData, type: e.target.value})}
                      className="select select-bordered select-sm w-full"
                    >
                      {getTypesForCategory(editData.category).map(type => (
                        <option key={type.value} value={type.value}>
                          {type.emoji} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control sm:col-span-2">
                    <label className="label">
                      <span className="label-text font-medium">Title</span>
                    </label>
                    <input
                      type="text"
                      value={editData.title}
                      onChange={(e) => setEditData({...editData, title: e.target.value})}
                      className="input input-bordered input-sm w-full"
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
              <div className="bg-base-200/40 rounded-lg p-4 border-2 border-base-content/20 overflow-x-auto max-w-full">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed break-words max-w-full overflow-hidden">
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
    <div className="space-y-4 max-w-full overflow-hidden">
      {error && (
        <div className="alert alert-error shadow-md">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Tab Content */}
      {activeFeaturesTab === 'graph' ? (
        // Graph Dashboard Tab
        <div className="section-container max-w-full">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">🕸️</div>
              <span>Features Dashboard</span>
            </div>
          </div>
          <div className="section-content p-2">
            <FeaturesGraph
              docs={selectedProject.components}
              projectId={selectedProject.id}
              onCreateDoc={async (componentData) => {
                setAddingComponent(true);
                setError('');

                try {
                  await projectAPI.createComponent(selectedProject.id, componentData);

                  analyticsService.trackFeatureUsage('component_create', {
                    projectId: selectedProject.id,
                    projectName: selectedProject.name,
                    category: componentData.category,
                    type: componentData.type,
                    feature: componentData.feature,
                    createdFrom: 'graph'
                  });

                  await onProjectRefresh();
                } catch (err) {
                  setError('Failed to add component');
                } finally {
                  setAddingComponent(false);
                }
              }}
              creating={addingComponent}
              onRefresh={onProjectRefresh}
            />
          </div>
        </div>
      ) : activeFeaturesTab === 'structure' ? (
        // Structure View Tab
        <div className="section-container mb-4 max-w-full">
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
                <p className="text-sm text-base-content/60">Use the "Create" tab above to add your first component</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-full">
                {/* Featured sections */}
                {featuredComponents.map(([feature, components]) => {
                  const isExpanded = expandedFeatures.has(feature);
                  return (
                    <div key={feature} className="card-interactive p-0 overflow-hidden max-w-full">
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
                          <span className="badge badge-primary font-bold">{components.length}</span>
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
                  <div className="card-interactive p-0 overflow-hidden max-w-full">
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
      ) : activeFeaturesTab === 'all' ? (
        // All Components Tab
        <div className="section-container mb-4 max-w-full">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">🧩</div>
              <span>All Components</span>
            </div>
          </div>
          <div className="section-content">
            <div className="space-y-3">
              {selectedProject.components.map((component: Doc) => renderComponentCard(component))}
            </div>
          </div>
        </div>
      ) : (
        // Create New Tab
        <div className="section-container mb-4 max-w-full">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">📝</div>
              <span>Create New Component</span>
            </div>
          </div>
          <div className="section-content">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Category</span>
                  </label>
                  <select
                    value={newComponent.category}
                    onChange={(e) => {
                      const newCategory = e.target.value as ComponentCategory;
                      const types = getTypesForCategory(newCategory);
                      setNewComponent({...newComponent, category: newCategory, type: types[0]?.value || ''});
                    }}
                    className="select select-bordered w-full"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.emoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Type</span>
                  </label>
                  <select
                    value={newComponent.type}
                    onChange={(e) => setNewComponent({...newComponent, type: e.target.value})}
                    className="select select-bordered w-full"
                  >
                    {getTypesForCategory(newComponent.category).map(type => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {type.label}
                      </option>
                    ))}
                  </select>
                  <label className="label">
                    <span className="label-text-alt break-words">{getTypesForCategory(newComponent.category).find(t => t.value === newComponent.type)?.description || ''}</span>
                  </label>
                </div>

                <div className="form-control sm:col-span-2">
                  <label className="label">
                    <span className="label-text font-medium">Title</span>
                  </label>
                  <input
                    type="text"
                    value={newComponent.title}
                    onChange={(e) => setNewComponent({...newComponent, title: e.target.value})}
                    className="input input-bordered text-sm w-full"
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
                  className="input input-bordered text-sm w-full"
                  placeholder="e.g., Authentication, User Management, Payment System"
                />
                <label className="label">
                  <span className="label-text-alt break-words">Feature name is required - components belong to features</span>
                </label>
              </div>

              <div className="form-control flex justify-end mb-2">
                <div className="label">
                  <span className="label-text font-medium">Content</span>
                </div>

                <textarea
                  value={newComponent.content}
                  onChange={(e) => setNewComponent({...newComponent, content: e.target.value})}
                  className="textarea textarea-bordered h-[300px] w-full"
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
