import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Doc } from '../api';
import { getCategoryByValue } from '../config/componentCategories';

interface ComponentNodeData {
  component: Doc;
  isRecent: boolean;
  isStale?: boolean;
  isIncomplete?: boolean;
  isOrphaned?: boolean;
  hasDuplicates?: boolean;
}

const ComponentNode: React.FC<NodeProps<ComponentNodeData>> = ({ data, selected }) => {
  const { component, isRecent, isStale, isIncomplete, isOrphaned, hasDuplicates } = data;

  // Get category configuration
  const category = getCategoryByValue(component.category);
  const typeInfo = category.types.find(t => t.value === component.type);

  // Fixed width for consistent layout
  const width = 400;

  // Convert hex color to Tailwind-compatible format
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgb = hexToRgb(category.color);
  const colorStyle = rgb ? {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.65)`,
    borderColor: category.color
  } : {};

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
      className={`rounded-lg border-2 transition-all duration-200 ${healthRing} ${selectedClass}`}
      style={{ width: `${width}px`, ...colorStyle }}
    >
      {/* Handles on all 4 sides for dynamic edge routing */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />

      {/* Source handles (same positions) */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />

      {/* Node content */}
      <div className="p-3">
        {/* Header with category emoji and type */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex flex-col items-center">
            <span className="text-2xl">{category.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-base-content truncate">
              {component.title}
            </div>
            <div className="text-xs text-base-content/60 truncate">
              {category.label} • {typeInfo?.label || component.type}
            </div>
          </div>
        </div>

        {/* Feature badge */}
        {component.feature && (
          <div className="mt-2">
            <span className="badge badge-sm badge-primary border-thick p-2">
              {component.feature}
            </span>
          </div>
        )}

        {/* Tags */}
        {component.tags && component.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {component.tags.slice(0, 2).map((tag: string, i: number) => (
              <span key={i} className="badge badge-xs badge-ghost border-thick p-2">
                {tag}
              </span>
            ))}
            {component.tags.length > 2 && (
              <span className="badge badge-xs badge-ghost border-thick p-2">
                +{component.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Metadata and Health Indicators */}
        <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {hasDuplicates && (
              <span className="badge badge-xs badge-warning border-thick p-2" title="Similar to another component">
                ⚠️ Dup
              </span>
            )}
            {isStale && (
              <span className="badge badge-xs badge-error border-thick p-2" title="Not updated in 90+ days">
                🕐 Stale
              </span>
            )}
            {isIncomplete && (
              <span className="badge badge-xs badge-warning border-thick p-2" title="Content < 100 chars">
                📝 Short
              </span>
            )}
            {isOrphaned && (
              <span className="badge badge-xs badge-ghost border-thick p-2" title="No feature assigned">
                🏝️ Lone
              </span>
            )}
            {isRecent && !isStale && (
              <span className="badge badge-xs badge-success border-thick p-2" title="Updated in last 24h">
                ✨ New
              </span>
            )}
          </div>
        </div>

        {/* Content preview */}
        <div className="mt-2 text-sm text-base-content/70 line-clamp-4">
          {component.content}
        </div>

      </div>
    </div>
  );
};

export default memo(ComponentNode);
