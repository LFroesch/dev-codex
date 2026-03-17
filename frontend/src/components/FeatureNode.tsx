import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Doc } from '../api';
import { getCategoryByValue } from '../config/featureCategories';

interface FeatureNodeData {
  feature: Doc;
  isRecent: boolean;
  isStale?: boolean;
  isIncomplete?: boolean;
  isOrphaned?: boolean;
  hasDuplicates?: boolean;
}

const FeatureNode: React.FC<NodeProps<FeatureNodeData>> = ({ data, selected }) => {
  const { feature, isRecent, isStale, isIncomplete, isOrphaned, hasDuplicates } = data;

  // Get category configuration
  const category = getCategoryByValue(feature.category);
  const typeInfo = category.types.find(t => t.value === feature.type);

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

  const selectedClass = selected ? 'ring-4 ring-primary !ring-offset-2 shadow-xl scale-105' : 'shadow-md';

  return (
    <div
      className={`rounded-lg border-2 transition-all duration-200 ${selectedClass}`}
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
              {feature.title}
            </div>
            <div className="text-xs text-base-content/60 truncate">
              {category.label} • {typeInfo?.label || feature.type}
            </div>
          </div>
        </div>

        {/* Group badge */}
        {feature.group && (
          <div className="mt-2">
            <span className="badge badge-sm badge-primary border-thick p-2">
              {feature.group}
            </span>
          </div>
        )}

        {/* Tags */}
        {feature.tags && feature.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {feature.tags.slice(0, 2).map((tag: string, i: number) => (
              <span key={i} className="badge badge-xs badge-ghost border-thick p-2">
                {tag}
              </span>
            ))}
            {feature.tags.length > 2 && (
              <span className="badge badge-xs badge-ghost border-thick p-2">
                +{feature.tags.length - 2}
              </span>
            )}
          </div>
        )}


        {/* Content preview */}
        <div className="mt-2 text-sm text-base-content/70 line-clamp-4">
          {feature.content}
        </div>

      </div>
    </div>
  );
};

export default memo(FeatureNode);
