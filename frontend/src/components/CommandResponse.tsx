import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandResponse as CommandResponseType } from '../api/terminal';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface CommandResponseProps {
  response: CommandResponseType;
  command: string;
  timestamp: Date;
  onProjectSelect?: (projectId: string) => void;
  currentProjectId?: string;
  onCommandClick?: (command: string) => void;
}

const CommandResponse: React.FC<CommandResponseProps> = ({
  response,
  command,
  timestamp,
  onProjectSelect,
  currentProjectId,
  onCommandClick
}) => {
  const navigate = useNavigate();

  // Generate command template from syntax (same logic as autocomplete)
  const generateTemplate = (syntax: string): string => {
    // Extract command base and convert flags to empty placeholders
    // Example: "/set deployment --url=[url] --platform=[platform]" → "/set deployment --url= --platform= --status="

    // Special handling for different command patterns
    if (syntax.includes('--')) {
      // Has flags - extract them and create template
      const parts = syntax.split('--');
      const baseCommand = parts[0].trim();

      // Extract flag names from patterns like --url=[url] or --role=[editor/viewer]
      const flags = parts.slice(1).map(part => {
        const flagMatch = part.match(/^(\w+)/);
        return flagMatch ? `--${flagMatch[1]}=` : '';
      }).filter(Boolean);

      return `${baseCommand} ${flags.join(' ')}`;
    }

    // No flags - return base command with space
    const baseMatch = syntax.match(/^(\/[^\[]+)/);
    return baseMatch ? `${baseMatch[1].trim()} ` : `${syntax} `;
  };

  // Handle theme changes
  React.useEffect(() => {
    if (response.data?.theme) {
      document.documentElement.setAttribute('data-theme', response.data.theme);
      // refresh if theme changed to apply tailwind colors properly
      setTimeout(() => {
      });window.location.reload();
    }

  }, [response.data?.theme]);

  const handleNavigateToProject = async (path: string) => {
    // If the response has a project ID and it's different from current, switch first
    if (response.metadata?.projectId && response.metadata.projectId !== currentProjectId && onProjectSelect) {
      await onProjectSelect(response.metadata.projectId);
    }
    // Then navigate
    navigate(path);
  };

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
        <div className="mt-3 space-y-2">
          <div className="space-y-1">
            {response.data.todos.map((todo: any, index: number) => (
              <div
                key={index}
                className="flex items-start gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {todo.completed ? (
                    <span className="text-success">✓</span>
                  ) : (
                    <span className="text-base-content/50">○</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm text-base-content/80 break-words ${todo.completed ? 'line-through opacity-60' : ''}`}>
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
                      <span className="text-xs text-base-content/60">
                        {todo.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/notes?section=todos')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              View Todos
            </button>
          )}
        </div>
      );
    }

    // Render notes list
    if (response.data.notes && Array.isArray(response.data.notes)) {
      return (
        <div className="mt-3 space-y-2">
          <div className="space-y-2">
            {response.data.notes.map((note: any, index: number) => (
              <div
                key={index}
                className="p-3 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
              >
                <div className="font-medium text-sm mb-1 text-base-content/80 break-words">{note.title}</div>
                {note.preview && (
                  <div className="text-xs text-base-content/70 line-clamp-3 break-words">
                    {note.preview}
                  </div>
                )}
                <div className="text-xs text-base-content/60 mt-2">
                  {new Date(note.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/notes?section=notes')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Notes
            </button>
          )}
        </div>
      );
    }

    // Render dev log entries
    if (response.data.entries && Array.isArray(response.data.entries)) {
      return (
        <div className="mt-3 space-y-2">
          <div className="space-y-2">
            {response.data.entries.map((entry: any, index: number) => (
              <div
                key={index}
                className="p-3 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-l-4 border-primary/50"
              >
                <div className="text-sm text-base-content/80 break-words">{entry.entry}</div>
                <div className="text-xs text-base-content/60 mt-2">
                  {new Date(entry.date).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/notes?section=devlog')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              View Dev Log
            </button>
          )}
        </div>
      );
    }

    // Render docs list
    if (response.data.docs && Array.isArray(response.data.docs)) {
      return (
        <div className="mt-3 space-y-2">
          <div className="space-y-1">
            {response.data.docs.map((doc: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
              >
                <span className="text-xs px-2 py-0.5 bg-primary/30 rounded border-2 border-primary/40 flex-shrink-0">{doc.type}</span>
                <div className="flex-1 min-w-0 text-sm font-medium text-base-content/80 break-words">{doc.title}</div>
              </div>
            ))}
          </div>
          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/docs')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Docs
            </button>
          )}
        </div>
      );
    }

    // Render stack data
    if (response.data.stack) {
      const { technologies = [], packages = [] } = response.data.stack;
      const totalItems = technologies.length + packages.length;

      return (
        <div className="mt-3 space-y-3">
          {/* Technologies */}
          {technologies.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-primary mb-2">Technologies ({technologies.length})</div>
              <div className="space-y-1">
                {technologies.map((tech: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
                  >
                    <span className="text-xs px-2 py-0.5 bg-primary/30 rounded border-2 border-primary/40 flex-shrink-0">{tech.category}</span>
                    <div className="flex-1 min-w-0 text-sm font-medium text-base-content/80 break-words">{tech.name}</div>
                    {tech.version && (
                      <span className="text-xs text-base-content/60 flex-shrink-0">{tech.version}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Packages */}
          {packages.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-primary mb-2">Packages ({packages.length})</div>
              <div className="space-y-1">
                {packages.map((pkg: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
                  >
                    <span className="text-xs px-2 py-0.5 bg-secondary/30 rounded border-2 border-secondary/40 flex-shrink-0">{pkg.category}</span>
                    <div className="flex-1 min-w-0 text-sm font-medium text-base-content/80 break-words">{pkg.name}</div>
                    {pkg.version && (
                      <span className="text-xs text-base-content/60 flex-shrink-0">{pkg.version}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/stack')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              View Full Stack
            </button>
          )}
        </div>
      );
    }

    // Render deployment data
    if (response.data.deployment) {
      const dep = response.data.deployment;
      return (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Live URL</div>
              <div className="text-sm text-base-content/80 break-all">{dep.liveUrl}</div>
            </div>
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Platform</div>
              <div className="text-sm text-base-content/80">{dep.platform}</div>
            </div>
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Status</div>
              <div className="text-sm text-base-content/80 capitalize">{dep.status}</div>
            </div>
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Branch</div>
              <div className="text-sm text-base-content/80 break-all">{dep.branch}</div>
            </div>
          </div>
          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/deployment')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              View Deployment
            </button>
          )}
        </div>
      );
    }

    // Render public settings
    if (response.data.publicSettings) {
      const pub = response.data.publicSettings;
      return (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Visibility</div>
              <div className="text-sm text-base-content/80">{pub.isPublic ? '🌐 Public' : '🔒 Private'}</div>
            </div>
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Slug</div>
              <div className="text-sm text-base-content/80 break-all">{pub.slug}</div>
            </div>
          </div>
          {pub.url && pub.url !== 'Not available (project is private)' && (
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Public URL</div>
              <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all block">
                {pub.url}
              </a>
            </div>
          )}
          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/public')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Manage Public Settings
            </button>
          )}
        </div>
      );
    }

    // Render team members
    if (response.data.members && Array.isArray(response.data.members)) {
      return (
        <div className="mt-3 space-y-2">
          <div className="space-y-1">
            {response.data.members.map((member: any, index: number) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-base-content/80 break-words">{member.name}</div>
                  <div className="text-xs text-base-content/60 break-all">{member.email}</div>
                </div>
                <span className={`badge badge-sm ${member.isOwner ? 'badge-primary' : 'badge-secondary'}`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/sharing')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Manage Team
            </button>
          )}
        </div>
      );
    }

    // Render settings
    if (response.data.settings) {
      const settings = response.data.settings;
      return (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Name</div>
              <div className="text-sm text-base-content/80 break-words">{settings.name}</div>
            </div>
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60">Category</div>
              <div className="text-sm text-base-content/80 capitalize">{settings.category}</div>
            </div>
          </div>
          <div className="p-2 bg-base-200 rounded-lg border-thick">
            <div className="text-xs text-base-content/60">Description</div>
            <div className="text-sm text-base-content/80 break-words">{settings.description}</div>
          </div>
          {settings.tags && settings.tags.length > 0 && (
            <div className="p-2 bg-base-200 rounded-lg border-thick">
              <div className="text-xs text-base-content/60 mb-1">Tags</div>
              <div className="flex flex-wrap gap-1">
                {settings.tags.map((tag: string, index: number) => (
                  <span key={index} className="badge badge-sm badge-primary">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {response.metadata?.projectId && (
            <button
              onClick={() => handleNavigateToProject('/settings')}
              className="btn-primary-sm gap-2 border-thick"
              style={{ color: getContrastTextColor('primary') }}
            >
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              View Settings
            </button>
          )}
        </div>
      );
    }

    // Render news
    if (response.data.news && Array.isArray(response.data.news)) {
      return (
        <div className="mt-3 space-y-2">
          <div className="space-y-2">
            {response.data.news.map((newsItem: any, index: number) => (
              <div
                key={index}
                className="p-3 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick"
              >
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 bg-primary/30 rounded border-2 border-primary/40 capitalize flex-shrink-0">
                    {newsItem.type || 'update'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-base-content/80 break-words">{newsItem.title}</div>
                  </div>
                </div>
                {newsItem.summary && (
                  <div className="text-xs text-base-content/70 mt-2 break-words">
                    {newsItem.summary}
                  </div>
                )}
                <div className="text-xs text-base-content/60 mt-2">
                  {new Date(newsItem.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Render themes
    if (response.data.themes && Array.isArray(response.data.themes)) {
      const customThemes = response.data.customThemes || [];

      return (
        <div className="mt-3 space-y-4">
          {/* Preset Themes */}
          <div>
            <div className="text-xs font-semibold text-primary mb-2">Preset Themes ({response.data.themes.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {response.data.themes.map((theme: any, index: number) => (
                <div
                  key={index}
                  className="p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-thick cursor-pointer"
                  onClick={() => onCommandClick?.(`/set theme ${theme.name}`)}
                  title={`Click to use: /set theme ${theme.name}`}
                >
                  <div className="font-medium text-xs text-base-content/80 break-words">{theme.name}</div>
                  <div className="text-xs text-base-content/60 break-words line-clamp-2">
                    {theme.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Themes */}
          {customThemes.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-secondary mb-2">Custom Themes ({customThemes.length})</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {customThemes.map((theme: any, index: number) => (
                  <div
                    key={index}
                    className="p-2 bg-base-200 rounded-lg hover:bg-base-300/50 transition-colors border-2 border-secondary/30 cursor-pointer"
                    onClick={() => onCommandClick?.(`/set theme ${theme.name}`)}
                    title={`Click to use: /set theme ${theme.name}`}
                  >
                    <div className="font-medium text-xs text-base-content/80 flex items-center gap-1 break-words">
                      <span className="flex-shrink-0">🎨</span>
                      <span className="break-words">{theme.displayName}</span>
                    </div>
                    <div className="text-xs text-base-content/60 break-words line-clamp-2">
                      {theme.description}
                    </div>
                    {/* Color preview */}
                    <div className="flex gap-1 mt-1">
                      <div className="w-3 h-3 rounded-full border-thick" style={{ backgroundColor: theme.colors?.primary }} title="Primary" />
                      <div className="w-3 h-3 rounded-full border-thick" style={{ backgroundColor: theme.colors?.secondary }} title="Secondary" />
                      <div className="w-3 h-3 rounded-full border-thick" style={{ backgroundColor: theme.colors?.accent }} title="Accent" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-base-content/60">
            💡 Click any theme to populate terminal input
          </div>
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
              className="w-full p-3 bg-base-200 rounded-lg hover:bg-primary/20 hover:border-primary/50 border-thick transition-all text-left"
            >
              <div className="flex items-center gap-3">
                {project.color && (
                  <div
                    className="w-3 h-3 rounded-full border-thick"
                    style={{ backgroundColor: project.color }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-base-content/80 break-words">{project.name}</div>
                  {project.description && (
                    <div className="text-xs text-base-content/70 break-words">
                      {project.description}
                    </div>
                  )}
                </div>
                {project.category && (
                  <span className="badge badge-sm border-thick">{project.category}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      );
    }

    // Render help data
    if (response.data.grouped) {
      const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
        new Set()
      );

      const toggleSection = (category: string) => {
        setExpandedSections(prev => {
          const newSet = new Set(prev);
          if (newSet.has(category)) {
            newSet.delete(category);
          } else {
            newSet.add(category);
          }
          return newSet;
        });
      };

      return (
        <div className="mt-3 space-y-2">
          {Object.entries(response.data.grouped).map(([category, cmds]: [string, any]) => (
            cmds.length > 0 && (
              <div key={category} className="collapse collapse-arrow bg-base-200 border-thick rounded-lg">
                <input
                  type="checkbox"
                  checked={expandedSections.has(category)}
                  onChange={() => toggleSection(category)}
                />
                <div className="collapse-title font-semibold text-lg flex items-center gap-2 section-header">
                  {category}
                  <span className="badge badge-md badge-primary">{cmds.length}</span>
                </div>
                <div className="collapse-content">
                  <div className="overflow-x-auto">
                    <table className="table table-xs table-zebra">
                      <thead>
                        <tr>
                          <th className="w-1/3 text-xl">Command</th>
                          <th className='text-xl'>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cmds.map((cmd: any, index: number) => (
                          <tr key={index} className='hover'>
                            <td>
                              <button
                                type="button"
                                onClick={() => onCommandClick?.(generateTemplate(cmd.syntax))}
                                className="text-xs text-primary font-mono bg-base-100 px-1.5 py-0.5 rounded hover:bg-primary/20 hover:border-primary border-thick transition-colors cursor-pointer"
                                title="Click to use this command"
                              >
                                {cmd.syntax}
                              </button>
                            </td>
                            <td className="text-xs text-base-content/70">
                              {cmd.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
            <div className="text-xs font-semibold text-base-content/70 mb-1">Syntax:</div>
            <code className="text-sm text-primary bg-base-200 px-2 py-1 rounded border-thick">
              {response.data.syntax}
            </code>
          </div>
          <div>
            <div className="text-xs font-semibold text-base-content/70 mb-1">Description:</div>
            <div className="text-sm text-base-content/80">{response.data.description}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-base-content/70 mb-1">Examples:</div>
            <div className="space-y-1">
              {response.data.examples.map((example: string, index: number) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onCommandClick?.(example)}
                  className="block w-full text-left text-xs bg-base-200 px-2 py-1 rounded border-thick text-base-content/80 hover:bg-base-300/50 cursor-pointer transition-colors"
                  title="Click to use this example"
                >
                  {example}
                </button>
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
            className="btn-primary-sm border-thick"
            style={{ color: getContrastTextColor('primary') }}
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
        <div className="mt-3 space-y-2">
          <div className="p-3 bg-base-200 rounded-lg flex items-center gap-3 border-thick">
            {project.color && (
              <div
                className="w-4 h-4 rounded-full border-thick"
                style={{ backgroundColor: project.color }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-base-content/80 break-words">{project.name}</div>
              <div className="text-xs text-base-content/70 break-words">{project.description}</div>
            </div>
          </div>
          <button
            onClick={() => handleNavigateToProject('/notes')}
            className="btn-primary-sm gap-2 border-thick"
            style={{ color: getContrastTextColor('primary') }}
          >
            <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Open Project
          </button>
        </div>
      );
    }

    // Generic data rendering
    return (
      <div className="mt-3 p-3 bg-base-200 rounded-lg border-thick overflow-x-auto">
        <pre className="text-xs text-base-content/80 whitespace-pre-wrap break-words">
          {JSON.stringify(response.data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Command echo */}
      <div className="inline-flex items-start gap-2 mb-2 border-thick p-2 rounded-lg bg-base-200 ">
        <div className="text-xs text-base-content/80 font-mono flex-shrink-0">
          {timestamp.toLocaleTimeString()}
        </div>
        <div className="text-xs text-base-content/80 font-mono font-semibold flex-shrink-0">$</div>
        <code className="text-xs font-mono font-semibold text-primary flex-1 break-all">{command}</code>
      </div>

      {/* Response */}
      <div className="bg-base-100 p-4 rounded-lg border-thick">
        <div className="w-full">
          <div className="flex items-start gap-2">
            <span className="text-xl flex-shrink-0 bg-base-200 p-2 rounded-lg border-thick">{getIcon()}</span>
            <div className="flex-1 min-w-0">
              <div className="ml-1 text-lg font-semibold bg-base-200 p-2 rounded-lg border-thick break-words">{response.message}</div>

              {/* Render data */}
              {renderData()}

              {/* Success actions - add CTA for successful creations */}
              {response.type === 'success' && !response.data && response.metadata?.projectId && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {/* Show specific button based on command type */}
                  {command.toLowerCase().includes('add todo') || (command.toLowerCase().includes('todo') && !command.toLowerCase().includes('view')) ? (
                    <button
                      onClick={() => handleNavigateToProject('/notes?section=todos')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      View Todos
                    </button>
                  ) : command.toLowerCase().includes('add note') || command.toLowerCase().includes('note') ? (
                    <button
                      onClick={() => handleNavigateToProject('/notes?section=notes')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Notes
                    </button>
                  ) : command.toLowerCase().includes('add devlog') || command.toLowerCase().includes('devlog') ? (
                    <button
                      onClick={() => handleNavigateToProject('/notes?section=devlog')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      View Dev Log
                    </button>
                  ) : command.toLowerCase().includes('add doc') || (command.toLowerCase().includes('doc') && !command.toLowerCase().includes('view')) ? (
                    <button
                      onClick={() => handleNavigateToProject('/docs')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Docs
                    </button>
                  ) : command.toLowerCase().includes('add tech') || command.toLowerCase().includes('add package') ||
                     command.toLowerCase().includes('tech') || command.toLowerCase().includes('pkg') ||
                     command.toLowerCase().includes('remove tech') || command.toLowerCase().includes('remove package') ? (
                    <button
                      onClick={() => handleNavigateToProject('/stack')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      View Stack
                    </button>
                  ) : (
                    <button
                      onClick={() => handleNavigateToProject('/notes')}
                      className="btn-primary-sm gap-2 border-thick"
                      style={{ color: getContrastTextColor('primary') }}
                    >
                      <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Project
                    </button>
                  )}
                </div>
              )}

              {/* Suggestions */}
              {response.suggestions && response.suggestions.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs font-semibold text-base-content/70">
                    Suggestions:
                  </div>
                  {response.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onCommandClick?.(suggestion)}
                      className="block w-full text-left text-xs bg-base-200 px-2 py-1 rounded hover:bg-base-300/50 cursor-pointer transition-colors border-thick text-base-content/80"
                      title="Click to use this suggestion"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Metadata */}
              {response.metadata && (
                <div className="mt-2">
                  {response.metadata.projectName && (
                    <span className="inline-block text-xs bg-base-200 px-3 py-1.5 rounded-lg border-thick text-base-content/80">
                      <span className="font-semibold">Project:</span> {response.metadata.projectName}
                    </span>
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
