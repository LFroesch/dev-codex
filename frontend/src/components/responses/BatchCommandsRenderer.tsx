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
  unexecuted?: string[];
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
  unexecuted = [],
  onProjectSelect
}) => {
  const navigate = useNavigate();
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyUnexecutedSuccess, setCopyUnexecutedSuccess] = useState(false);
  const [copyFailedSuccess, setCopyFailedSuccess] = useState(false);

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

  // Copy only the failed command
  const handleCopyFailedOnly = async () => {
    if (results.length > 0 && results[results.length - 1].type === 'error') {
      const commandToCopy = results[results.length - 1].command;

      try {
        await navigator.clipboard.writeText(commandToCopy);
        setCopyFailedSuccess(true);
        setTimeout(() => setCopyFailedSuccess(false), 2000);
      } catch (err) {
      }
    }
  };

  // Copy only unexecuted commands (without the failed one)
  const handleCopyUnexecutedOnly = async () => {
    const commandsToCopy = unexecuted.join('\n');

    try {
      await navigator.clipboard.writeText(commandsToCopy);
      setCopyUnexecutedSuccess(true);
      setTimeout(() => setCopyUnexecutedSuccess(false), 2000);
    } catch (err) {
    }
  };

  // Copy failed command + unexecuted commands
  const handleCopyFailedAndUnexecuted = async () => {
    const failedCommand = results.length > 0 && results[results.length - 1].type === 'error'
      ? [results[results.length - 1].command]
      : [];

    const commandsToCopy = [...failedCommand, ...unexecuted].join('\n');

    try {
      await navigator.clipboard.writeText(commandsToCopy);
      setCopyUnexecutedSuccess(true);
      setTimeout(() => setCopyUnexecutedSuccess(false), 2000);
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

      {/* Unexecuted commands section - show if there are any */}
      {unexecuted.length > 0 && (
        <div className="rounded-lg border-2 bg-error/5 border-error/30 overflow-hidden">
          {/* Failed command header - prominently displayed */}
          {results.length > 0 && results[results.length - 1].type === 'error' && (
            <div className="bg-error/20 border-b-2 border-error/30 p-3">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg">❌</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-error mb-1">
                    Command Failed
                  </div>
                  <div className="text-xs text-base-content/80 mb-2">
                    {results[results.length - 1].message}
                  </div>
                </div>
              </div>

              <div className="bg-base-100 rounded border-2 border-error/40 p-2">
                <code className="text-xs font-mono text-base-content/90 break-all block">
                  {results[results.length - 1].command}
                </code>
              </div>
            </div>
          )}

          {/* Unexecuted commands section */}
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">⏭️</span>
              <div className="text-sm font-semibold text-base-content/80">
                Skipped Commands ({unexecuted.length})
              </div>
            </div>

            <div className="bg-base-100 rounded border-2 border-base-content/20 p-2 max-h-48 overflow-y-auto space-y-1">
              {unexecuted.map((cmd, idx) => (
                <code key={idx} className="block text-xs font-mono text-base-content/70 py-0.5 break-all">
                  {cmd}
                </code>
              ))}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                onClick={handleCopyFailedOnly}
                className="btn btn-sm border-thick btn-error gap-1"
                title="Copy only the failed command to fix it"
              >
                <span className="text-xs">📋</span>
                <span className="text-xs">{copyFailedSuccess ? '✓ Copied!' : 'Failed'}</span>
              </button>
              <button
                onClick={handleCopyUnexecutedOnly}
                className="btn btn-sm border-thick btn-ghost gap-1"
                title="Copy only the skipped commands (fix the failed one first, then run these)"
              >
                <span className="text-xs">📋</span>
                <span className="text-xs">{copyUnexecutedSuccess ? '✓ Copied!' : 'Skipped'}</span>
              </button>
              <button
                onClick={handleCopyFailedAndUnexecuted}
                className="btn btn-sm border-thick btn-warning gap-1"
                title="Copy failed + skipped commands to fix and re-run all"
              >
                <span className="text-xs">📋</span>
                <span className="text-xs">{copyUnexecutedSuccess ? '✓ Copied!' : 'All'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
