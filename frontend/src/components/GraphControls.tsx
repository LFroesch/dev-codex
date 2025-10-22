import React from 'react';
import { Doc } from '../api';
import { ComponentCategory, CreateComponentData } from '../../../shared/types/project';
import { getContrastTextColor } from '../utils/contrastTextColor';
import { getAllCategories, getTypesForCategory } from '../config/componentCategories';

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
        <div className="border-b border-base-content/10 pb-4">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center justify-between w-full text-xs font-semibold text-base-content/60 mb-2 hover:text-base-content transition-colors"
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
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onAutoLayout}
          className="btn btn-sm h-14 btn-primary border-thick"
          style={{ color: getContrastTextColor('primary') }}
          title="Auto-arrange nodes"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="hidden sm:inline">Auto</span>
        </button>
        <button
          onClick={onResetView}
          className="btn btn-sm h-14 btn-ghost"
          title="Reset zoom and position"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m0 0v6m0-6h6m-6 0H4" />
          </svg>
          <span className="hidden sm:inline">Reset</span>
        </button>
        <button
          onClick={onResetLayout}
          className="btn btn-sm h-14 btn-ghost"
          title="Clear saved layout"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Category Filters */}
      <div>
        <div className="text-xs font-semibold text-base-content/60 mb-2 flex items-center justify-between">
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
            className="text-primary border-thick rounded-lg p-1 hover:underline"
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
                className={`badge badge-sm border-thick p-2 cursor-pointer transition-all`}
                style={isSelected ? {
                  backgroundColor: cat.color,
                  color: 'white',
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
          <div className="text-xs font-semibold text-base-content/60 mb-2 flex items-center justify-between">
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
              className="text-primary border-thick rounded-lg p-1 hover:underline"
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
                  className={`badge badge-sm cursor-pointer transition-all ${
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
