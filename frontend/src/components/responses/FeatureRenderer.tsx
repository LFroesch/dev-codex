import React from 'react';
import { getContrastTextColor } from '../../utils/contrastTextColor';

interface Feature {
  id: string;
  type: string;
  title: string;
  group: string;
  createdAt: Date;
}

interface FeatureRendererProps {
  structure?: Record<string, Feature[]>; // Features grouped by group
  features?: Feature[]; // Fallback: flat list of features
  projectId?: string;
  onNavigate: (path: string) => void;
  onCommandClick?: (command: string) => void;
}

export const FeatureRenderer: React.FC<FeatureRendererProps> = ({
  structure,
  features,
  projectId,
  onNavigate,
  onCommandClick
}) => {
  const allFeatures = features || (structure ? Object.values(structure).flat() : []);
  const featureIndexMap = new Map(allFeatures.map((f, idx) => [f.id, idx + 1]));

  const renderFeature = (feature: Feature, index: number) => (
    <button
      key={feature.id || index}
      onClick={() => onCommandClick?.(`/edit feature ${featureIndexMap.get(feature.id) || index + 1}`)}
      className="group w-full text-left flex items-center gap-3 px-4 py-3 bg-base-200/60 rounded-lg hover:bg-base-200 transition-colors border-thick cursor-pointer"
    >
      <div className="flex-shrink-0">
        <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/30">
          #{featureIndexMap.get(feature.id) || index + 1}
        </span>
      </div>
      <span className="text-xs px-2 py-0.5 bg-info/10 text-info border border-info/30 rounded flex-shrink-0">
        {feature.type}
      </span>
      <div className="flex-1 min-w-0 text-sm font-semibold text-base-content/90 break-words">
        {feature.title}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onCommandClick?.(`/delete feature ${featureIndexMap.get(feature.id) || index + 1} --confirm`); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-error/70 hover:text-error px-1.5 py-0.5 rounded hover:bg-error/10 flex-shrink-0"
        title="Delete feature"
      >
        ✕
      </button>
    </button>
  );

  return (
    <div className="mt-3 space-y-2">
      {/* Header card */}
      <div className="flex items-center justify-between px-4 py-3 bg-base-200/60 rounded-lg border-thick border-l-4 border-l-primary">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-base-content">Features</span>
          <span className="text-xs font-mono bg-primary/10 text-primary border border-primary/30 px-1.5 py-0.5 rounded">
            {allFeatures.length}
          </span>
        </div>
      </div>

      {structure && Object.keys(structure).length > 0 ? (
        <div className="space-y-3">
          {Object.entries(structure).map(([group, groupFeatures]) => (
            <div key={group} className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
                <span className="text-sm font-bold text-base-content">📦 {group}</span>
                <span className="text-xs text-primary/70">({groupFeatures.length} feature{groupFeatures.length !== 1 ? 's' : ''})</span>
              </div>
              <div className="space-y-1">
                {groupFeatures.map((feature) => renderFeature(feature, allFeatures.indexOf(feature)))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        features && features.length > 0 && (
          <div className="space-y-1">
            {features.map((feature, index) => renderFeature(feature, index))}
          </div>
        )
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-base-200/40 rounded-lg border-thick">
        <div className="text-xs text-base-content/50">
          💡 <code className="bg-base-300 px-1 rounded">/edit feature 1 ...</code> or <code className="bg-base-300 px-1 rounded">/delete feature 1 --confirm</code>
        </div>
        {projectId && (
          <button
            onClick={() => onNavigate('/features')}
            className="btn-primary-sm gap-2 border-thick"
            style={{ color: getContrastTextColor('primary') }}
          >
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
            </svg>
            View Features
          </button>
        )}
      </div>
    </div>
  );
};
