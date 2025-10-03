import React from 'react';
import { CommandResponse as CommandResponseType } from '../api/terminal';

interface CommandResponseProps {
  response: CommandResponseType;
  command: string;
  timestamp: Date;
  onProjectSelect?: (projectId: string) => void;
}

const CommandResponse: React.FC<CommandResponseProps> = ({
  response,
  command,
  timestamp,
  onProjectSelect
}) => {
  const getIcon = () => {
    switch (response.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'data':
        return '📊';
      case 'prompt':
        return '❓';
      default:
        return '•';
    }
  };

  const getAlertClass = () => {
    switch (response.type) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      case 'info':
        return 'alert-info';
      default:
        return '';
    }
  };

  const renderData = () => {
    if (!response.data) return null;

    // Render todos list
    if (response.data.todos && Array.isArray(response.data.todos)) {
      return (
        <div className="mt-3 space-y-1">
          {response.data.todos.map((todo: any, index: number) => (
            <div
              key={index}
              className="flex items-start gap-3 p-2 bg-base-200/50 rounded-lg hover:bg-base-200 transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">
                {todo.completed ? (
                  <span className="text-success">✓</span>
                ) : (
                  <span className="text-base-content/40">○</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${todo.completed ? 'line-through opacity-60' : ''}`}>
                  {todo.text}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {todo.priority && (
                    <span className={`badge badge-xs ${
                      todo.priority === 'high' ? 'badge-error' :
                      todo.priority === 'medium' ? 'badge-warning' :
                      'badge-info'
                    }`}>
                      {todo.priority}
                    </span>
                  )}
                  {todo.status && (
                    <span className="text-xs text-base-content/50">
                      {todo.status.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Render notes list
    if (response.data.notes && Array.isArray(response.data.notes)) {
      return (
        <div className="mt-3 space-y-2">
          {response.data.notes.map((note: any, index: number) => (
            <div
              key={index}
              className="p-3 bg-base-200/50 rounded-lg hover:bg-base-200 transition-colors"
            >
              <div className="font-medium text-sm mb-1">{note.title}</div>
              {note.preview && (
                <div className="text-xs text-base-content/60 line-clamp-2">
                  {note.preview}
                </div>
              )}
              <div className="text-xs text-base-content/40 mt-2">
                {new Date(note.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Render dev log entries
    if (response.data.entries && Array.isArray(response.data.entries)) {
      return (
        <div className="mt-3 space-y-2">
          {response.data.entries.map((entry: any, index: number) => (
            <div
              key={index}
              className="p-3 bg-base-200/50 rounded-lg hover:bg-base-200 transition-colors border-l-4 border-primary/30"
            >
              <div className="text-sm">{entry.entry}</div>
              <div className="text-xs text-base-content/40 mt-2">
                {new Date(entry.date).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Render docs list
    if (response.data.docs && Array.isArray(response.data.docs)) {
      return (
        <div className="mt-3 space-y-1">
          {response.data.docs.map((doc: any, index: number) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 bg-base-200/50 rounded-lg hover:bg-base-200 transition-colors"
            >
              <span className="text-xs px-2 py-0.5 bg-primary/20 rounded">{doc.type}</span>
              <div className="flex-1 text-sm font-medium">{doc.title}</div>
            </div>
          ))}
        </div>
      );
    }

    // Render project selection
    if (response.data.projects && Array.isArray(response.data.projects)) {
      return (
        <div className="mt-3 space-y-2">
          {response.data.projects.map((project: any, index: number) => (
            <button
              key={index}
              type="button"
              onClick={() => onProjectSelect?.(project.id)}
              className="w-full p-3 bg-base-200/50 rounded-lg hover:bg-primary/20 hover:border-primary/40 border-2 border-transparent transition-all text-left"
            >
              <div className="flex items-center gap-3">
                {project.color && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium text-sm">{project.name}</div>
                  {project.description && (
                    <div className="text-xs text-base-content/60 truncate">
                      {project.description}
                    </div>
                  )}
                </div>
                {project.category && (
                  <span className="badge badge-sm">{project.category}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      );
    }

    // Render help data
    if (response.data.grouped) {
      return (
        <div className="mt-3 space-y-4">
          {Object.entries(response.data.grouped).map(([category, cmds]: [string, any]) => (
            cmds.length > 0 && (
              <div key={category}>
                <div className="text-xs font-semibold text-primary mb-2">{category}</div>
                <div className="space-y-1">
                  {cmds.map((cmd: any, index: number) => (
                    <div key={index} className="p-2 bg-base-200/50 rounded-lg">
                      <code className="text-xs text-primary">{cmd.syntax}</code>
                      <div className="text-xs text-base-content/60 mt-1">
                        {cmd.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      );
    }

    // Render specific help
    if (response.data.syntax && response.data.examples) {
      return (
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-xs font-semibold text-base-content/60 mb-1">Syntax:</div>
            <code className="text-sm text-primary bg-base-200 px-2 py-1 rounded">
              {response.data.syntax}
            </code>
          </div>
          <div>
            <div className="text-xs font-semibold text-base-content/60 mb-1">Description:</div>
            <div className="text-sm">{response.data.description}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-base-content/60 mb-1">Examples:</div>
            <div className="space-y-1">
              {response.data.examples.map((example: string, index: number) => (
                <code key={index} className="block text-xs bg-base-200 px-2 py-1 rounded">
                  {example}
                </code>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Render export data
    if (response.data.exportUrl) {
      return (
        <div className="mt-3">
          <a
            href={response.data.exportUrl}
            download={`${response.data.projectName}.json`}
            className="btn btn-sm btn-primary"
          >
            📥 Download {response.data.projectName}
          </a>
        </div>
      );
    }

    // Render project switch data
    if (response.data.project) {
      const project = response.data.project;
      return (
        <div className="mt-3 p-3 bg-base-200/50 rounded-lg flex items-center gap-3">
          {project.color && (
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
          )}
          <div className="flex-1">
            <div className="font-medium">{project.name}</div>
            <div className="text-xs text-base-content/60">{project.description}</div>
          </div>
        </div>
      );
    }

    // Generic data rendering
    return (
      <div className="mt-3 p-3 bg-base-200/50 rounded-lg">
        <pre className="text-xs overflow-x-auto">
          {JSON.stringify(response.data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Command echo */}
      <div className="flex items-start gap-2 mb-2">
        <div className="text-xs text-base-content/40 font-mono">
          {timestamp.toLocaleTimeString()}
        </div>
        <div className="text-xs text-base-content/60 font-mono">$</div>
        <code className="text-xs font-mono text-primary flex-1">{command}</code>
      </div>

      {/* Response */}
      <div className={`alert ${getAlertClass()} border-2`}>
        <div className="w-full">
          <div className="flex items-start gap-2">
            <span className="text-xl flex-shrink-0">{getIcon()}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{response.message}</div>

              {/* Render data */}
              {renderData()}

              {/* Suggestions */}
              {response.suggestions && response.suggestions.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs font-semibold text-base-content/60">
                    Suggestions:
                  </div>
                  {response.suggestions.map((suggestion, index) => (
                    <code
                      key={index}
                      className="block text-xs bg-base-content/10 px-2 py-1 rounded hover:bg-base-content/20 cursor-pointer transition-colors"
                      onClick={() => navigator.clipboard.writeText(suggestion)}
                      title="Click to copy"
                    >
                      {suggestion}
                    </code>
                  ))}
                </div>
              )}

              {/* Metadata */}
              {response.metadata && (
                <div className="mt-2 text-xs text-base-content/40">
                  {response.metadata.projectName && (
                    <span>Project: {response.metadata.projectName}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandResponse;
