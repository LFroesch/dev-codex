import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Doc } from '../api';

interface AreaNodeData {
  component: Doc;
}

const AreaNode: React.FC<NodeProps<AreaNodeData>> = ({ data, selected }) => {
  const { component } = data;

  const selectedClass = selected ? 'ring-4 ring-primary !ring-offset-2 shadow-2xl' : 'shadow-lg';

  return (
    <div
      className={`rounded-xl border-6 border-solid border-base-content/40 bg-base-300/65 backdrop-blur-sm transition-all duration-200 shadow-lg ${selectedClass}`}
      style={{
        width: '700px',
        height: '300px',
      }}
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
      <div className="p-4 h-full flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">📍</div>
          <h3 className="font-bold text-2xl text-base-content/80 mb-1">
            {component.title}
          </h3>
          {component.content && (
            <p className="text-sm text-base-content/60 line-clamp-2">
              {component.content}
            </p>
          )}
          {component.feature && (
            <div className="mt-2">
              <span className="badge badge-lg badge-ghost border-2 border-dashed">
                {component.feature}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(AreaNode);
