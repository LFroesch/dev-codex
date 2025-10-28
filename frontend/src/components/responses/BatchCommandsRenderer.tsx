import React from 'react';

interface BatchResult {
  command: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface BatchCommandsRendererProps {
  results: BatchResult[];
  executed: number;
  total: number;
}

const BatchCommandsRenderer: React.FC<BatchCommandsRendererProps> = ({ results, executed, total }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '•';
    }
  };

  const getBgClass = (type: string) => {
    switch (type) {
      case 'success': return 'bg-success/10 border-success/30';
      case 'error': return 'bg-error/10 border-error/30';
      case 'warning': return 'bg-warning/10 border-warning/30';
      default: return 'bg-base-200 border-base-content/20';
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="text-xs text-base-content/60">
        Executed {executed || 0} of {total || 0} commands
      </div>
      <div className="space-y-2">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg border-2 ${getBgClass(result.type)}`}
          >
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 text-sm">{getIcon(result.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-base-content/60 mb-1 break-all">
                  {result.command}
                </div>
                <div className="text-sm text-base-content/80 break-words">
                  {result.message}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BatchCommandsRenderer;
