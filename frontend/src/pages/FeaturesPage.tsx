import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Project, Doc, projectAPI } from '../api';
import { FeatureCategory } from '../../../shared/types/project';
import ConfirmationModal from '../components/ConfirmationModal';
import { getContrastTextColor } from '../utils/contrastTextColor';
import FeaturesGraph from '../components/FeaturesGraph';
import { getAllCategories, getTypesForCategory } from '../config/featureCategories';
import { analyticsService } from '../services/analytics';

interface ContextType {
  selectedProject: Project | null;
  onProjectRefresh: () => Promise<void>;
}

const FeaturesPage: React.FC = () => {
  const { selectedProject, onProjectRefresh, activeFeaturesTab } = useOutletContext<any>();

  const [newFeature, setNewFeature] = useState({
    category: 'backend' as FeatureCategory,
    type: 'service',
    title: '',
    content: '',
    group: '',
    tags: [] as string[]
  });
  const [addingFeature, setAddingFeature] = useState(false);
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    category: 'backend' as FeatureCategory,
    type: 'service',
    title: '',
    content: '',
    group: '',
    tags: [] as string[]
  });
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; featureId: string; featureTitle: string }>({
    isOpen: false,
    featureId: '',
    featureTitle: ''
  });

  const toggleItemExpanded = (featureId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId);
    } else {
      newExpanded.add(featureId);
    }
    setExpandedItems(newExpanded);
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

  const handleAddFeature = async () => {
    if (!selectedProject || !newFeature.title.trim() || !newFeature.content.trim() || !newFeature.group.trim()) return;

    setAddingFeature(true);
    setError('');

    try {
      await projectAPI.createFeature(selectedProject.id, newFeature);

      analyticsService.trackFeatureUsage('feature_create', {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        category: newFeature.category,
        type: newFeature.type,
        group: newFeature.group
      });

      setNewFeature({ category: 'backend', type: 'service', title: '', content: '', group: '', tags: [] });
      // Tab managed by Layout.tsx now
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to add feature');
    } finally {
      setAddingFeature(false);
    }
  };

  const handleEditFeature = (feat: Doc) => {
    setEditingFeatureId(feat.id);
    setEditData({
      category: feat.category,
      type: feat.type,
      title: feat.title,
      content: feat.content,
      group: feat.group || '',
      tags: feat.tags || []
    });
    if (!expandedItems.has(feat.id)) {
      toggleItemExpanded(feat.id);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedProject || !editingFeatureId) return;

    try {
      await projectAPI.updateFeature(selectedProject.id, editingFeatureId, editData);

      analyticsService.trackFeatureUsage('feature_update', {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        category: editData.category,
        type: editData.type
      });

      setEditingFeatureId(null);
      await onProjectRefresh();
    } catch (err) {
      setError('Failed to update feature');
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    if (!selectedProject) return;

    try {
      await projectAPI.deleteFeature(selectedProject.id, featureId);

      analyticsService.trackFeatureUsage('feature_delete', {
        projectId: selectedProject.id,
        projectName: selectedProject.name
      });

      await onProjectRefresh();
      setDeleteConfirmation({ isOpen: false, featureId: '', featureTitle: '' });
    } catch (err) {
      setError('Failed to delete feature');
    }
  };

  const confirmDeleteFeature = (featureId: string, featureTitle: string) => {
    setDeleteConfirmation({ isOpen: true, featureId, featureTitle });
  };

  const handleCancelEdit = () => {
    setEditingFeatureId(null);
    setEditData({ category: 'backend', type: 'service', title: '', content: '', group: '', tags: [] });
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

  // Group features by group name
  const featuresByGroup: Record<string, Doc[]> = {};
  selectedProject.features.forEach((feat: Doc) => {
    const groupKey = feat.group || 'Ungrouped';
    if (!featuresByGroup[groupKey]) {
      featuresByGroup[groupKey] = [];
    }
    featuresByGroup[groupKey].push(feat);
  });

  // Separate grouped and ungrouped features
  const groupedFeatures = Object.entries(featuresByGroup).filter(([key]) => key !== 'Ungrouped');
  const ungroupedFeatures = featuresByGroup['Ungrouped'] || [];

  // Check if there are any features at all
  const hasAnyFeatures = selectedProject.features.length > 0;

  const renderFeatureCard = (feat: Doc) => {
    const isExpanded = expandedItems.has(feat.id);
    const isEditing = editingFeatureId === feat.id;
    const category = categories.find(c => c.value === feat.category);
    const typeInfo = category ? category.types.find(t => t.value === feat.type) : null;

    return (
      <div key={feat.id} className="card-interactive group p-3 max-w-full min-w-0">
        {/* Header with title and controls */}
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => toggleItemExpanded(feat.id)}
            className="flex items-start gap-2 flex-1 text-left hover:bg-base-200 p-2 -m-2 rounded-lg transition-colors min-w-0"
            disabled={isEditing}
          >
            <div className={`transform transition-transform duration-200 flex-shrink-0 mt-0.5 ${isExpanded ? 'rotate-90' : ''}`}>
              <svg className="w-4 h-4 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base mb-1 break-words">{feat.title}</h3>
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
                  {category.emoji} {category.label} • {typeInfo?.emoji} {typeInfo?.label || feat.type}
                </span>
              )}
              <div className="text-xs text-base-content/50">
                <div>Created: {new Date(feat.createdAt).toLocaleDateString()}</div>
                {feat.updatedAt !== feat.createdAt && (
                  <div>Updated: {new Date(feat.updatedAt).toLocaleDateString()}</div>
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
                  disabled={!editData.title.trim() || !editData.content.trim() || !editData.group.trim()}
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
                    handleEditFeature(feat);
                  }}
                  className="btn btn-sm btn-ghost px-2"
                  title="Edit feature"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDeleteFeature(feat.id, feat.title);
                  }}
                  className="btn btn-sm btn-error btn-outline px-2"
                  title="Delete feature"
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
                        const newCategory = e.target.value as FeatureCategory;
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
                    value={editData.group}
                    onChange={(e) => setEditData({...editData, group: e.target.value})}
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
                  {feat.content}
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
              docs={selectedProject.features}
              projectId={selectedProject.id}
              onCreateDoc={async (featureData) => {
                setAddingFeature(true);
                setError('');

                try {
                  await projectAPI.createFeature(selectedProject.id, featureData);

                  analyticsService.trackFeatureUsage('feature_create', {
                    projectId: selectedProject.id,
                    projectName: selectedProject.name,
                    category: featureData.category,
                    type: featureData.type,
                    group: featureData.group,
                    createdFrom: 'graph'
                  });

                  await onProjectRefresh();
                } catch (err) {
                  setError('Failed to add feature');
                } finally {
                  setAddingFeature(false);
                }
              }}
              creating={addingFeature}
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
            {!hasAnyFeatures ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-base-200 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🧩</span>
                </div>
                <h3 className="text-lg font-medium mb-2 text-base-content/80">No features yet</h3>
                <p className="text-sm text-base-content/60 mb-4">Create your first feature using the "Create New" tab</p>
                <p className="text-sm text-base-content/60">Use the "Create" tab above to add your first feature</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-full">
                {/* Featured sections */}
                {groupedFeatures.map(([groupName, features]) => {
                  const isExpanded = expandedFeatures.has(groupName);
                  return (
                    <div key={groupName} className="card-interactive p-0 overflow-hidden max-w-full">
                      <button
                        onClick={() => toggleFeatureExpanded(groupName)}
                        className="w-full flex items-center justify-between p-4 hover:bg-base-200 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                            <svg className="w-5 h-5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                          <h2 className="text-lg font-bold">{groupName}</h2>
                          <span className="badge badge-primary font-bold">{features.length}</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3">
                          {features.map(feat => renderFeatureCard(feat))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Ungrouped features */}
                {ungroupedFeatures.length > 0 && (
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
                        <span className="badge badge-ghost">{ungroupedFeatures.length}</span>
                      </div>
                    </button>
                    {expandedFeatures.has('Ungrouped') && (
                      <div className="px-4 pb-4 space-y-3">
                        {ungroupedFeatures.map(feat => renderFeatureCard(feat))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : activeFeaturesTab === 'all' ? (
        // All Features Tab
        <div className="section-container mb-4 max-w-full">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">🧩</div>
              <span>All Features</span>
            </div>
          </div>
          <div className="section-content">
            <div className="space-y-3">
              {selectedProject.features.map((feat: Doc) => renderFeatureCard(feat))}
            </div>
          </div>
        </div>
      ) : (
        // Create New Tab
        <div className="section-container mb-4 max-w-full">
          <div className="section-header">
            <div className="flex items-center gap-3">
              <div className="section-icon">📝</div>
              <span>Create New Feature</span>
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
                    value={newFeature.category}
                    onChange={(e) => {
                      const newCategory = e.target.value as FeatureCategory;
                      const types = getTypesForCategory(newCategory);
                      setNewFeature({...newFeature, category: newCategory, type: types[0]?.value || ''});
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
                    value={newFeature.type}
                    onChange={(e) => setNewFeature({...newFeature, type: e.target.value})}
                    className="select select-bordered w-full"
                  >
                    {getTypesForCategory(newFeature.category).map(type => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {type.label}
                      </option>
                    ))}
                  </select>
                  <label className="label">
                    <span className="label-text-alt break-words">{getTypesForCategory(newFeature.category).find(t => t.value === newFeature.type)?.description || ''}</span>
                  </label>
                </div>

                <div className="form-control sm:col-span-2">
                  <label className="label">
                    <span className="label-text font-medium">Title</span>
                  </label>
                  <input
                    type="text"
                    value={newFeature.title}
                    onChange={(e) => setNewFeature({...newFeature, title: e.target.value})}
                    className="input input-bordered text-sm w-full"
                    placeholder="Enter feature title..."
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Feature <span className="text-error">*</span></span>
                </label>
                <input
                  type="text"
                  value={newFeature.group}
                  onChange={(e) => setNewFeature({...newFeature, group: e.target.value})}
                  className="input input-bordered text-sm w-full"
                  placeholder="e.g., Authentication, User Management, Payment System"
                />
                <label className="label">
                  <span className="label-text-alt break-words">Group name is required - features are organized by group</span>
                </label>
              </div>

              <div className="form-control flex justify-end mb-2">
                <div className="label">
                  <span className="label-text font-medium">Content</span>
                </div>

                <textarea
                  value={newFeature.content}
                  onChange={(e) => setNewFeature({...newFeature, content: e.target.value})}
                  className="textarea textarea-bordered h-[300px] w-full"
                  placeholder="Enter your feature content..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleAddFeature}
                  disabled={addingFeature || !newFeature.title.trim() || !newFeature.content.trim() || !newFeature.group.trim()}
                  className="btn btn-primary"
                  style={{ color: getContrastTextColor('primary') }}
                >
                  {addingFeature ? 'Adding...' : 'Add Feature'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onConfirm={() => handleDeleteFeature(deleteConfirmation.featureId)}
        onCancel={() => setDeleteConfirmation({ isOpen: false, featureId: '', featureTitle: '' })}
        title="Delete Feature"
        message={`Are you sure you want to delete "${deleteConfirmation.featureTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="error"
      />
    </div>
  );
};

export default FeaturesPage;
