import React from 'react';
import { Doc } from '../api';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface GraphControlsProps {
  docs: Doc[];
  selectedTypes: Set<Doc['type']>;
  selectedFeatures: Set<string>;
  onTypeToggle: (type: Doc['type']) => void;
  onFeatureToggle: (feature: string) => void;
  onAutoLayout: () => void;
  onResetView: () => void;
  onResetLayout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateDoc?: (doc: { type: Doc['type']; title: string; content: string; feature?: string }) => Promise<void>;
  creating?: boolean;
}

const componentTypes: Array<{ value: Doc['type']; label: string; emoji: string; color: string }> = [
  { value: 'Core', label: 'Core', emoji: '🎯', color: 'bg-green-500' },
  { value: 'API', label: 'API', emoji: '🔌', color: 'bg-blue-500' },
  { value: 'Data', label: 'Data', emoji: '🗃️', color: 'bg-orange-500' },
  { value: 'UI', label: 'UI', emoji: '🎨', color: 'bg-purple-500' },
  { value: 'Config', label: 'Config', emoji: '⚙️', color: 'bg-yellow-500' },
  { value: 'Security', label: 'Security', emoji: '🔐', color: 'bg-red-500' },
  { value: 'Docs', label: 'Docs', emoji: '📚', color: 'bg-pink-500' },
  { value: 'Dependencies', label: 'Dependencies', emoji: '📦', color: 'bg-cyan-500' },
];

const GraphControls: React.FC<GraphControlsProps> = ({
  docs,
  selectedTypes,
  selectedFeatures,
  onTypeToggle,
  onFeatureToggle,
  onAutoLayout,
  onResetView,
  onResetLayout,
  searchQuery,
  onSearchChange,
  onCreateDoc,
  creating,
}) => {
  const [showCoverage, setShowCoverage] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newComponent, setNewComponent] = React.useState({
    type: 'Core' as Doc['type'],
    title: '',
    content: '',
    feature: ''
  });

  // Get unique features from components
  const features = Array.from(new Set(docs.map(d => d.feature).filter(Boolean))) as string[];

  // Calculate coverage per feature
  const coverage: Record<string, { has: Doc['type'][]; missing: Doc['type'][] }> = {};
  const allComponentTypes = componentTypes.map(t => t.value);

  // Group components by feature
  const componentsByFeature: Record<string, Doc[]> = {};
  docs.forEach(component => {
    const feature = component.feature || 'Ungrouped';
    if (!componentsByFeature[feature]) componentsByFeature[feature] = [];
    componentsByFeature[feature].push(component);
  });

  // Calculate coverage
  Object.entries(componentsByFeature).forEach(([feature, featureComponents]) => {
    const has = [...new Set(featureComponents.map(d => d.type))];
    const missing = allComponentTypes.filter(t => !has.includes(t));
    coverage[feature] = { has, missing };
  });

  const handleCreateComponent = async () => {
    if (!onCreateDoc || !newComponent.title.trim() || !newComponent.content.trim()) return;

    await onCreateDoc({
      type: newComponent.type,
      title: newComponent.title,
      content: newComponent.content,
      feature: newComponent.feature || undefined
    });

    setNewComponent({ type: 'Core', title: '', content: '', feature: '' });
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
                value={newComponent.type}
                onChange={(e) => setNewComponent({...newComponent, type: e.target.value as Doc['type']})}
                className="select select-bordered select-sm w-full"
              >
                {componentTypes.map(type => (
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
          className="btn btn-sm btn-primary"
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
          className="btn btn-sm btn-ghost"
          title="Reset zoom and position"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m0 0v6m0-6h6m-6 0H4" />
          </svg>
          <span className="hidden sm:inline">Reset</span>
        </button>
        <button
          onClick={onResetLayout}
          className="btn btn-sm btn-ghost"
          title="Clear saved layout"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Component Type Filters */}
      <div>
        <div className="text-xs font-semibold text-base-content/60 mb-2 flex items-center justify-between">
          <span>Component Types</span>
          <button
            onClick={() => {
              if (selectedTypes.size === componentTypes.length) {
                componentTypes.forEach(t => onTypeToggle(t.value));
              } else {
                componentTypes.forEach(t => {
                  if (!selectedTypes.has(t.value)) {
                    onTypeToggle(t.value);
                  }
                });
              }
            }}
            className="text-primary hover:underline"
          >
            {selectedTypes.size === componentTypes.length ? 'None' : 'All'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {componentTypes.map(type => {
            const isSelected = selectedTypes.has(type.value);
            return (
              <button
                key={type.value}
                onClick={() => onTypeToggle(type.value)}
                className={`badge badge-sm cursor-pointer transition-all ${
                  isSelected
                    ? `${type.color} text-white`
                    : 'badge-ghost opacity-40 hover:opacity-70'
                }`}
                title={type.label}
              >
                {type.emoji} {type.label}
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
              className="text-primary hover:underline"
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

      {/* Coverage Analysis */}
      {features.length > 0 && (
        <div className="border-t border-base-content/10 pt-4">
          <button
            onClick={() => setShowCoverage(!showCoverage)}
            className="flex items-center justify-between w-full text-xs font-semibold text-base-content/60 mb-2 hover:text-base-content transition-colors"
          >
            <span>Coverage Analysis</span>
            <svg
              className={`w-4 h-4 transition-transform ${showCoverage ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {showCoverage && (
            <div className="space-y-2">
              {Object.entries(coverage).map(([feature, { has, missing }]) => {
                const completeness = (has.length / allComponentTypes.length) * 100;
                return (
                  <div key={feature} className="bg-base-200 p-2 rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{feature}</span>
                      <span className="text-base-content/50">{has.length}/{allComponentTypes.length}</span>
                    </div>
                    <div className="w-full bg-base-300 rounded-full h-1.5 mb-2">
                      <div
                        className={`h-1.5 rounded-full ${
                          completeness === 100
                            ? 'bg-success'
                            : completeness >= 50
                            ? 'bg-warning'
                            : 'bg-error'
                        }`}
                        style={{ width: `${completeness}%` }}
                      ></div>
                    </div>
                    {missing.length > 0 && (
                      <div className="text-base-content/50">
                        Missing: {missing.map(t => componentTypes.find(dt => dt.value === t)?.emoji).join(' ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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
