import React, { useState } from 'react';

interface AIActionPreviewProps {
  icon: string;
  summary: string;
  command: string;
  checked: boolean;
  onToggle: () => void;
}

const AIActionPreview: React.FC<AIActionPreviewProps> = ({
  icon,
  summary,
  command,
  checked,
  onToggle,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border-thick transition-all ${
        checked
          ? 'border-primary/40 bg-primary/5'
          : 'border-base-content/10 bg-base-200/30 opacity-60'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="checkbox checkbox-sm checkbox-primary"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="text-lg flex-shrink-0">{icon}</span>
        <span className="text-sm text-base-content/90 flex-1 min-w-0">
          {summary}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="btn btn-ghost btn-xs text-base-content/50"
          title={expanded ? 'Hide command' : 'Show command'}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </button>

      {expanded && (
        <div className="px-3 pb-2.5 pt-0">
          <code className="text-xs font-mono bg-base-300/50 px-2 py-1 rounded block text-base-content/70 break-all">
            {command}
          </code>
        </div>
      )}
    </div>
  );
};

export default AIActionPreview;
