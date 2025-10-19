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
      className={`rounded-xl border-4 border-dashed border-base-content/30 bg-base-300/40 backdrop-blur-sm transition-all duration-200 ${selectedClass}`}
      style={{
        width: '400px',
        height: '150px',
      }}
    >
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-base-content/20 border-2 border-base-100"
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

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-base-content/30 border-2 border-base-100"
      />
    </div>
  );
};

export default memo(AreaNode);
