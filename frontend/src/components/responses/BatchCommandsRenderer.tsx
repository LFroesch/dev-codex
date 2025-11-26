import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BatchResult {
  command: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  data?: any;
  metadata?: {
    projectId?: string;
    projectName?: string;
  };
}

interface BatchCommandsRendererProps {
  results: BatchResult[];
  executed: number;
  total: number;
  onProjectSelect?: (projectId: string) => void;
}

// Helper function to extract project name from command (e.g., "@scout" -> "scout")
const parseProjectFromCommand = (command: string): string | null => {
  const match = command.match(/@(\S+)/);
  return match ? match[1] : null;
};

// Helper function to extract resource type from command and map to route
const getPageRoute = (command: string): string | null => {
  const patterns = [
    { pattern: /\/(add|edit|view|delete)\s+(todo|todos)/, route: '/notes?section=todos' },
    { pattern: /\/(add|edit|view|delete)\s+(note|notes)/, route: '/notes' },
    { pattern: /\/(add|edit|view|delete)\s+(devlog|devlogs)/, route: '/notes?section=devlog' },
    { pattern: /\/(add|edit|view|delete)\s+(project|projects)/, route: '/projects' },
    { pattern: /\/(add|edit|view|delete)\s+(component|components)/, route: '/features' },
    { pattern: /\/(add|edit|view|delete)\s+(relationship|relationships)/, route: '/features' },
    { pattern: /\/(add|edit|view|delete|remove)\s+(stack)/, route: '/stack' },
    { pattern: /\/(add|edit|view|delete)\s+(idea|ideas)/, route: '/ideas' },
  ];

  for (const { pattern, route } of patterns) {
    if (pattern.test(command)) {
      return route;
    }
  }

  return null;
};

const BatchCommandsRenderer: React.FC<BatchCommandsRendererProps> = ({
  results,
  total,
  onProjectSelect
}) => {
  const navigate = useNavigate();
  const [copySuccess, setCopySuccess] = useState(false);

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

  // Calculate success and failure counts
  const successCount = results.filter(r => r.type === 'success').length;
  const errorCount = results.filter(r => r.type === 'error').length;

  // Copy batch output to clipboard
  const handleCopyToClipboard = async () => {
    const output = results
      .map(r => `${getIcon(r.type)} ${r.command}\n   ${r.message}`)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(output);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
    }
  };

  // Handle View button click - select project and navigate to page
  const handleViewClick = (result: BatchResult) => {
    const pageRoute = getPageRoute(result.command);

    if (!pageRoute) {
      return;
    }

    // Get project ID - could be in metadata (for todos/notes) or data.project.id (for projects)
    const projectId = result.metadata?.projectId || result.data?.project?.id;

    if (projectId && onProjectSelect) {
      onProjectSelect(projectId);
    }

    navigate(pageRoute);
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Summary header with stats and copy button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-base-content/60">📊</span>
          <span className="badge badge-sm border-thick">
            ✅ {successCount} succeeded
          </span>
          {errorCount > 0 && (
            <span className="badge badge-sm border-thick badge-error">
              ❌ {errorCount} failed
            </span>
          )}
          <span className="badge badge-sm border-thick badge-ghost">
            {total} total
          </span>
        </div>

        <button
          onClick={handleCopyToClipboard}
          className="btn btn-xs border-thick btn-ghost"
          title="Copy batch output to clipboard"
        >
          {copySuccess ? '✓ Copied!' : '📋 Copy'}
        </button>
      </div>

      {/* Command results */}
      <div className="space-y-2">
        {results.map((result, index) => {
          const projectName = result.metadata?.projectName || result.data?.project?.name || parseProjectFromCommand(result.command);
          const projectId = result.metadata?.projectId || result.data?.project?.id;
          const pageRoute = getPageRoute(result.command);
          const showViewButton = result.type === 'success' && pageRoute && projectId;

          return (
            <div
              key={index}
              className={`p-3 rounded-lg border-2 ${getBgClass(result.type)}`}
            >
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 text-sm">{getIcon(result.type)}</span>
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Command text */}
                  <div className="text-xs font-mono text-base-content/60 break-all">
                    {result.command}
                  </div>

                  {/* Result message */}
                  <div className="text-sm text-base-content/80 break-words">
                    {result.message}
                  </div>

                  {/* Project badge and View button */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {projectName && (
                      <span className="btn btn-xs h-6 border-thick btn-primary">
                        🏷️ {projectName}
                      </span>
                    )}

                    {showViewButton && (
                      <button
                        onClick={() => handleViewClick(result)}
                        className="btn btn-xs border-thick btn-primary"
                      >
                        👁️ View
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BatchCommandsRenderer;
