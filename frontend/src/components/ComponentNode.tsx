import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Doc } from '../api';

interface ComponentNodeData {
  component: Doc;
  componentType: {
    value: Doc['type'];
    label: string;
    emoji: string;
    description: string;
  };
  isRecent: boolean;
  isStale?: boolean;
  isIncomplete?: boolean;
  isOrphaned?: boolean;
  hasDuplicates?: boolean;
}

const ComponentNode: React.FC<NodeProps<ComponentNodeData>> = ({ data, selected }) => {
  const { component, componentType, isRecent, isStale, isIncomplete, isOrphaned, hasDuplicates } = data;

  // Calculate node size based on content length
  const contentLength = component.content.length;
  const minWidth = 180;
  const maxWidth = 280;
  const width = Math.min(maxWidth, minWidth + Math.floor(contentLength / 100));

  // Color mapping for component types
  const typeColorMap: Record<Doc['type'], string> = {
    'Core': 'bg-green-500/20 border-green-500',
    'API': 'bg-blue-500/20 border-blue-500',
    'Data': 'bg-orange-500/20 border-orange-500',
    'UI': 'bg-purple-500/20 border-purple-500',
    'Config': 'bg-yellow-500/20 border-yellow-500',
    'Security': 'bg-red-500/20 border-red-500',
    'Docs': 'bg-pink-500/20 border-pink-500',
    'Dependencies': 'bg-cyan-500/20 border-cyan-500',
  };

  const colorClass = typeColorMap[component.type] || 'bg-base-300 border-base-content';

  // Health indicator classes
  let healthRing = '';
  if (hasDuplicates) {
    healthRing = 'ring-4 ring-yellow-500'; // Yellow for duplicates
  } else if (isStale) {
    healthRing = 'ring-4 ring-red-500/60'; // Red for stale
  } else if (isIncomplete) {
    healthRing = 'ring-2 ring-orange-500/60'; // Orange for incomplete
  } else if (isRecent) {
    healthRing = 'ring-2 ring-green-500'; // Green pulse for recent
  } else if (isOrphaned) {
    healthRing = 'ring-2 ring-gray-500/50'; // Gray for orphaned
  }

  const selectedClass = selected ? 'ring-4 ring-primary !ring-offset-2 shadow-xl scale-105' : 'shadow-md';

  return (
    <div
      className={`rounded-lg border-2 transition-all duration-200 ${colorClass} ${healthRing} ${selectedClass}`}
      style={{ width: `${width}px` }}
    >
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-base-content/30 border-2 border-base-100"
      />

      {/* Node content */}
      <div className="p-3">
        {/* Header with emoji and type */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{componentType.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-base-content truncate">
              {component.title}
            </div>
            <div className="text-xs text-base-content/60">
              {componentType.label}
            </div>
          </div>
        </div>

        {/* Feature badge */}
        {component.feature && (
          <div className="mt-2">
            <span className="badge badge-sm badge-primary">
              {component.feature}
            </span>
          </div>
        )}

        {/* Metadata and Health Indicators */}
        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {hasDuplicates && (
              <span className="badge badge-xs badge-warning" title="Similar to another component">
                ⚠️ Dup
              </span>
            )}
            {isStale && (
              <span className="badge badge-xs badge-error" title="Not updated in 90+ days">
                🕐 Stale
              </span>
            )}
            {isIncomplete && (
              <span className="badge badge-xs badge-warning" title="Content < 100 chars">
                📝 Short
              </span>
            )}
            {isOrphaned && (
              <span className="badge badge-xs badge-ghost" title="No feature assigned">
                🏝️ Lone
              </span>
            )}
            {isRecent && !isStale && (
              <span className="badge badge-xs badge-success" title="Updated in last 24h">
                ✨ New
              </span>
            )}
          </div>
        </div>
        
        {/* Content preview */}
        <div className="mt-2 text-xs text-base-content/50 line-clamp-2">
          {component.content}
        </div>

      </div>

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-base-content/30 border-2 border-base-100"
      />
    </div>
  );
};

export default memo(ComponentNode);
