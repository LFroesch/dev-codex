import React from 'react';
import { Doc } from '../api';
import { ComponentCategory, CreateComponentData } from '../../../shared/types/project';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { getAllCategories, getTypesForCategory } from '../config/componentCategories';
import ConfirmationModal from './ConfirmationModal';

interface GraphControlsProps {
  docs: Doc[];
  selectedCategories: Set<ComponentCategory>;
  selectedFeatures: Set<string>;
  onCategoryToggle: (category: ComponentCategory) => void;
  onFeatureToggle: (feature: string) => void;
  onAutoLayout: () => void;
  onResetView: () => void;
  onResetLayout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateDoc?: (doc: CreateComponentData) => Promise<void>;
  creating?: boolean;
}

const GraphControls: React.FC<GraphControlsProps> = ({
  docs,
  selectedCategories,
  selectedFeatures,
  onCategoryToggle,
  onFeatureToggle,
  onAutoLayout,
  onResetView,
  onResetLayout,
  searchQuery,
  onSearchChange,
  onCreateDoc,
  creating,
}) => {
  const [showCreate, setShowCreate] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [newComponent, setNewComponent] = React.useState({
    category: 'backend' as ComponentCategory,
    type: 'service',
    title: '',
    content: '',
    feature: '',
    tags: [] as string[]
  });

  const categories = getAllCategories();

  // Get unique features from components
  const features = Array.from(new Set(docs.map(d => d.feature).filter(Boolean))) as string[];

  const handleCreateComponent = async () => {
    if (!onCreateDoc || !newComponent.title.trim() || !newComponent.content.trim() || !newComponent.feature.trim()) return;

    await onCreateDoc({
      category: newComponent.category,
      type: newComponent.type,
      title: newComponent.title,
      content: newComponent.content,
      feature: newComponent.feature,
      tags: newComponent.tags
    });

    setNewComponent({ category: 'backend', type: 'service', title: '', content: '', feature: '', tags: [] });
    setShowCreate(false);
  };

  return (
    <div className="bg-base-100 border-2 border-base-content/20 rounded-lg p-4 space-y-4">
      {/* Create New Component */}
      {onCreateDoc && (
        <div className="border-thick rounded-lg p-3">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center justify-between w-full text-sm font-semibold text-base-content/60 hover:text-base-content transition-colors"
          >
            <span>✨ Create New Component</span>
            <svg
              className={`w-4 h-4 transition-transform ${showCreate ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {showCreate && (
            <div className="space-y-2">
              <select
                value={newComponent.category}
                onChange={(e) => {
                  const newCategory = e.target.value as ComponentCategory;
                  const types = getTypesForCategory(newCategory);
                  setNewComponent({...newComponent, category: newCategory, type: types[0]?.value || ''});
                }}
                className="select select-bordered select-sm w-full"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>

              <select
                value={newComponent.type}
                onChange={(e) => setNewComponent({...newComponent, type: e.target.value})}
                className="select select-bordered select-sm w-full"
              >
                {getTypesForCategory(newComponent.category).map(type => (
                  <option key={type.value} value={type.value}>
                    {type.emoji} {type.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={newComponent.title}
                onChange={(e) => setNewComponent({...newComponent, title: e.target.value})}
                className="input input-bordered input-sm w-full"
                placeholder="Component title..."
              />

              <input
                type="text"
                value={newComponent.feature}
                onChange={(e) => setNewComponent({...newComponent, feature: e.target.value})}
                className="input input-bordered input-sm w-full"
                placeholder="Feature (required)"
              />

              <textarea
                value={newComponent.content}
                onChange={(e) => setNewComponent({...newComponent, content: e.target.value})}
                className="textarea textarea-bordered textarea-sm w-full h-24"
                placeholder="Component content..."
              />

              <button
                onClick={handleCreateComponent}
                disabled={creating || !newComponent.title.trim() || !newComponent.content.trim() || !newComponent.feature.trim()}
                className="btn btn-sm btn-primary w-full"
                style={{ color: getContrastTextColor('primary') }}
              >
                {creating ? 'Creating...' : 'Create Component'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="form-control">
        <div className="relative">
          <input
            type="text"
            placeholder="Search components..."
            className="input input-bordered input-sm w-full pr-10"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onResetView}
          className="btn btn-sm h-14 btn-primary bg-primary/20 border-thick border-primary"
          title="Reset zoom and position"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="hidden sm:inline">Reset Zoom</span>
        </button>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="btn btn-sm h-14 btn-error bg-error/20 border-thick border-error"
          title="Clear saved layout"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline" style={{color:getContrastTextColor("error")}}>Auto Layout</span>
        </button>
      </div>

      {/* Reset Layout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetConfirm}
        onConfirm={() => {
          onResetLayout();
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
        title="Auto Layout Graph?"
        message="This will reset all node positions to the default auto-layout. Your manually positioned nodes will be lost. This action cannot be undone."
        confirmText="Auto Layout"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Category Filters */}
      <div>
        <div className="text-sm font-semibold text-base-content/60 mb-2 flex items-center justify-between">
          <span>Categories</span>
          <button
            onClick={() => {
              if (selectedCategories.size === categories.length) {
                categories.forEach(c => onCategoryToggle(c.value));
              } else {
                categories.forEach(c => {
                  if (!selectedCategories.has(c.value)) {
                    onCategoryToggle(c.value);
                  }
                });
              }
            }}
            className="btn btn-sm btn-primary bg-primary/20 border-thick border-primary p-1"
          >
            {selectedCategories.size === categories.length ? 'None' : 'All'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => {
            const isSelected = selectedCategories.has(cat.value);
            return (
              <button
                key={cat.value}
                onClick={() => onCategoryToggle(cat.value)}
                className={`border-thick badge badge-sm p-2 h-6 text-sm font-semibold cursor-pointer transition-all`}
                style={isSelected ? {
                  backgroundColor: cat.color,
                  color: getContrastTextColor("primary"),
                  borderColor: cat.color
                } : {
                  opacity: 0.4
                }}
                title={cat.description}
              >
                {cat.emoji} {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feature Filters */}
      {features.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-base-content/60 mb-2 flex items-center justify-between">
            <span>Features</span>
            <button
              onClick={() => {
                if (selectedFeatures.size === features.length) {
                  features.forEach(f => onFeatureToggle(f));
                } else {
                  features.forEach(f => {
                    if (!selectedFeatures.has(f)) {
                      onFeatureToggle(f);
                    }
                  });
                }
              }}
              className="btn btn-sm btn-primary bg-primary/20 border-thick border-primary p-1"
            >
              {selectedFeatures.size === features.length ? 'None' : 'All'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {features.map(feature => {
              const isSelected = selectedFeatures.has(feature);
              return (
                <button
                  key={feature}
                  onClick={() => onFeatureToggle(feature)}
                  className={`border-thick badge badge-sm p-2 h-6 text-sm font-semibold cursor-pointer transition-all ${
                    isSelected
                      ? 'badge-primary'
                      : 'badge-ghost opacity-40 hover:opacity-70'
                  }`}
                >
                  {feature}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="text-xs text-base-content/50 pt-2 border-t border-base-content/10">
        Showing {docs.length} component{docs.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default GraphControls;
