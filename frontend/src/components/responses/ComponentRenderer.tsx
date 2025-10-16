import React from 'react';
import { getContrastTextColor } from '../../utils/contrastTextColor';

interface Component {
  id: string;
  type: string;
  title: string;
  feature: string;
  createdAt: Date;
}

interface ComponentRendererProps {
  structure?: Record<string, Component[]>; // Components grouped by feature
  components?: Component[]; // Fallback: flat list of components
  projectId?: string;
  onNavigate: (path: string) => void;
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  structure,
  components,
  projectId,
  onNavigate
}) => {
  // Create an index map for component numbers across all features
  const allComponents = components || (structure ? Object.values(structure).flat() : []);
  const componentIndexMap = new Map(allComponents.map((comp, idx) => [comp.id, idx + 1]));

  return (
    <div className="mt-3 space-y-3">
      {/* Render components grouped by feature if structure is provided */}
      {structure && Object.keys(structure).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(structure).map(([feature, featureComponents]) => (
            <div key={feature} className="space-y-2">
              {/* Feature header */}
              <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded border border-primary/30">
                <span className="text-sm font-semibold text-primary">📦 {feature}</span>
                <span className="text-xs text-base-content/60">({featureComponents.length})</span>
              </div>

              {/* Components in this feature */}
              <div className="space-y-1 ml-2">
                {featureComponents.map((component) => (
                  <div
                    key={component.id}
                    className="flex items-center gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
                  >
                    <span className="text-xs font-mono font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/30 flex-shrink-0">
                      #{componentIndexMap.get(component.id)}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-primary/30 rounded border-2 border-primary/40 flex-shrink-0">
                      {component.type}
                    </span>
                    <div className="flex-1 min-w-0 text-sm font-medium text-base-content/80 break-words">
                      {component.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Fallback: render flat list if no structure */
        components && components.length > 0 && (
          <div className="space-y-1">
            {components.map((component, index) => (
              <div
                key={component.id || index}
                className="flex items-center gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
              >
                <span className="text-xs font-mono font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/30 flex-shrink-0">
                  #{index + 1}
                </span>
                <span className="text-xs px-2 py-0.5 bg-primary/30 rounded border-2 border-primary/40 flex-shrink-0">
                  {component.type}
                </span>
                <div className="flex-1 min-w-0 text-sm font-medium text-base-content/80 break-words">
                  {component.title}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <div className="text-xs text-base-content/60 mt-3 p-2 bg-base-200/50 rounded border-thick">
        💡 <strong>Tip:</strong> Use the <code className="bg-base-300 px-1 rounded">#ID</code> to reference components:
        <div className="mt-1 space-y-0.5 ml-4">
          <div>• <code className="bg-base-300 px-1 rounded">/edit component 1 new content</code></div>
          <div>• <code className="bg-base-300 px-1 rounded">/edit component "title" new content</code></div>
          <div>• <code className="bg-base-300 px-1 rounded">/delete component 1 --confirm</code></div>
        </div>
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
  );
};
